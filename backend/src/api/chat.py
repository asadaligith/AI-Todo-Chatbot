"""Chat endpoint for the AI Todo Chatbot."""

import logging
from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.api import ChatRequest, ChatResponse, ToolCallResponse
from src.api.deps import CurrentUser
from src.db import async_session_factory
from src.db.session import get_session
from src.models import Conversation, Message, MessageRole
from src.agent.todo_agent import run_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


async def get_or_create_conversation(
    user_id: str, conversation_id: Optional[UUID]
) -> Conversation:
    """
    Get an existing conversation or create a new one.

    Args:
        user_id: The user ID string (UUID as string).
        conversation_id: Optional existing conversation ID.

    Returns:
        The conversation object.
    """
    async with async_session_factory() as session:
        if conversation_id:
            # Try to get existing conversation by ID and user_id
            statement = select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id
            )
            result = await session.execute(statement)
            conversation = result.scalar_one_or_none()

            if conversation:
                return conversation

            # If not found, create new (fail-safe behavior)
            logger.warning(
                f"Conversation {conversation_id} not found for user {user_id}, creating new"
            )

        # Create new conversation with user_id
        conversation = Conversation(user_id=user_id)
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)

        logger.info(f"Created conversation {conversation.id} for user {user_id}")
        return conversation


async def load_conversation_history(conversation_id: UUID) -> list[dict[str, str]]:
    """
    Load all messages for a conversation.

    Args:
        conversation_id: The conversation ID.

    Returns:
        List of messages formatted for the agent.
    """
    async with async_session_factory() as session:
        statement = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        result = await session.execute(statement)
        messages = result.scalars().all()

        return [{"role": msg.role.value, "content": msg.content} for msg in messages]


async def save_message(
    conversation_id: UUID,
    role: MessageRole,
    content: str,
    tool_calls: Optional[list[dict]] = None,
) -> Message:
    """
    Save a message to the database.

    Args:
        conversation_id: The conversation ID.
        role: The message role (user or assistant).
        content: The message content.
        tool_calls: Optional tool calls made by assistant.

    Returns:
        The saved message.
    """
    async with async_session_factory() as session:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
        )
        session.add(message)

        # Update conversation timestamp
        statement = select(Conversation).where(Conversation.id == conversation_id)
        result = await session.execute(statement)
        conversation = result.scalar_one_or_none()
        if conversation:
            conversation.touch()
            session.add(conversation)

        await session.commit()
        await session.refresh(message)

        return message


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: CurrentUser,
) -> ChatResponse:
    """
    Send a message to the AI chatbot and receive a response.

    Requires authentication. Uses the authenticated user's ID for all operations.

    Args:
        request: The chat request with message and optional conversation ID.
        current_user: The authenticated user from the JWT token.

    Returns:
        ChatResponse with the assistant's response and any tool calls.
    """
    # Use the authenticated user's ID
    user_id = str(current_user.id)

    # Validate input
    message = request.message.strip()
    if not message:
        raise HTTPException(
            status_code=400,
            detail="I didn't catch that. Could you tell me what you'd like to do with your tasks?",
        )

    try:
        # Get or create conversation
        conversation = await get_or_create_conversation(
            user_id, request.conversation_id
        )

        # Load conversation history
        history = await load_conversation_history(conversation.id)

        # Save user message
        await save_message(conversation.id, MessageRole.USER, message)

        # Run the agent
        logger.info(f"Running agent for user {user_id}, message: {message[:50]}...")
        agent_response = await run_agent(user_id, message, history)

        # Format tool calls for response
        tool_calls_response = [
            ToolCallResponse(
                tool_name=tc.tool_name,
                arguments=tc.arguments,
                result=tc.result,
            )
            for tc in agent_response.tool_calls
        ]

        # Save assistant message
        tool_calls_data = (
            [
                {"tool_name": tc.tool_name, "arguments": tc.arguments, "result": tc.result}
                for tc in agent_response.tool_calls
            ]
            if agent_response.tool_calls
            else None
        )

        await save_message(
            conversation.id,
            MessageRole.ASSISTANT,
            agent_response.content,
            tool_calls_data,
        )

        return ChatResponse(
            conversation_id=conversation.id,
            response=agent_response.content,
            tool_calls=tool_calls_response,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="I'm having trouble processing your request right now. Please try again.",
        )

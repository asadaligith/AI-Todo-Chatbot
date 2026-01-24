"""Tasks endpoint for fetching user tasks."""

import logging
from typing import List
from pydantic import BaseModel

from fastapi import APIRouter
from sqlmodel import select

from src.api.deps import CurrentUser
from src.db import async_session_factory
from src.models import Task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["tasks"])


class TaskResponse(BaseModel):
    """Response model for a task."""
    id: str
    title: str
    is_completed: bool
    created_at: str
    updated_at: str


class TasksListResponse(BaseModel):
    """Response model for listing tasks."""
    tasks: List[TaskResponse]
    total: int
    completed: int
    pending: int


@router.get("/tasks", response_model=TasksListResponse)
async def list_tasks(current_user: CurrentUser) -> TasksListResponse:
    """
    Get all tasks for the authenticated user.

    Requires authentication. Returns only tasks owned by the current user.

    Args:
        current_user: The authenticated user from the JWT token.

    Returns:
        TasksListResponse with all user tasks and counts.
    """
    user_id = str(current_user.id)

    async with async_session_factory() as session:
        # Query tasks by user_id
        statement = (
            select(Task)
            .where(Task.user_id == user_id)
            .order_by(Task.created_at.desc())
        )
        result = await session.execute(statement)
        tasks = result.scalars().all()

        task_responses = [
            TaskResponse(
                id=str(task.id),
                title=task.title,
                is_completed=task.is_completed,
                created_at=task.created_at.isoformat(),
                updated_at=task.updated_at.isoformat(),
            )
            for task in tasks
        ]

        completed_count = sum(1 for t in tasks if t.is_completed)
        total_count = len(tasks)

        return TasksListResponse(
            tasks=task_responses,
            total=total_count,
            completed=completed_count,
            pending=total_count - completed_count,
        )

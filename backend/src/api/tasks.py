"""Tasks endpoint for fetching user tasks."""

import logging
from typing import List
from uuid import UUID
from pydantic import BaseModel

from fastapi import APIRouter
from sqlmodel import select

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


@router.get("/{user_id}/tasks", response_model=TasksListResponse)
async def list_tasks(user_id: str) -> TasksListResponse:
    """
    Get all tasks for a user.

    Args:
        user_id: The user ID from the URL path.

    Returns:
        TasksListResponse with all user tasks and counts.
    """
    async with async_session_factory() as session:
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

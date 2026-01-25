"""Database configuration and session management."""

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

# Load environment variables
load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create async engine with connection pool settings for Neon PostgreSQL
# NullPool is recommended for serverless databases like Neon to avoid stale connections
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("ENVIRONMENT", "development") == "development",
    future=True,
    poolclass=NullPool,  # Disable connection pooling for serverless DB compatibility
)

# Async session factory
async_session_factory = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()

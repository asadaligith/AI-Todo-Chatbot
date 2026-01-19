"""FastAPI application entry point for the AI Todo Chatbot."""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from src.db import init_db, close_db
from src.mcp.server import mcp_server

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup and shutdown."""
    # Startup
    logger.info("Starting AI Todo Chatbot...")

    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    # Initialize MCP server
    try:
        await mcp_server.initialize()
        logger.info("MCP server initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize MCP server: {e}")
        raise

    logger.info("AI Todo Chatbot started successfully!")

    yield

    # Shutdown
    logger.info("Shutting down AI Todo Chatbot...")
    await close_db()
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="AI Todo Chatbot",
    description="AI-Powered Todo Chatbot using MCP and OpenAI Agents SDK",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global error handler for friendly error messages
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler that returns friendly error messages.

    Never exposes stack traces or technical details to users.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # Return a friendly error message
    return JSONResponse(
        status_code=500,
        content={
            "detail": "I'm having trouble processing your request right now. Please try again."
        },
    )


# Health check endpoint
@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "ai-todo-chatbot"}


# Import and register routers
from src.api.chat import router as chat_router
from src.api.tasks import router as tasks_router

app.include_router(chat_router)
app.include_router(tasks_router)

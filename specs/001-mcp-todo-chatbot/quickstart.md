# Quickstart Guide: AI-Powered Todo Chatbot

**Branch**: `001-mcp-todo-chatbot` | **Date**: 2026-01-17

## Prerequisites

- Python 3.11+
- Neon PostgreSQL account (free tier available at [neon.tech](https://neon.tech))
- OpenAI API key

## Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd AI-Powered-Todo-Chatbot

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql+asyncpg://username:password@host/database?ssl=require

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Environment
ENVIRONMENT=development
```

**Getting your Neon connection string**:
1. Log into [Neon Console](https://console.neon.tech)
2. Select your project
3. Click "Connection Details"
4. Copy the connection string and replace `postgresql://` with `postgresql+asyncpg://`

### 3. Initialize Database

```bash
# Run database migrations (creates tables)
python -m src.db.init
```

Or using Alembic (if configured):
```bash
alembic upgrade head
```

### 4. Start the Server

```bash
# Development mode with auto-reload
uvicorn src.main:app --reload --port 8000

# Production mode
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## Usage

### Basic Chat Flow

**Create a task**:
```bash
curl -X POST "http://localhost:8000/api/user123/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Add a task to buy groceries"}'
```

Response:
```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Got it! I've added 'buy groceries' to your tasks.",
  "tool_calls": [...]
}
```

**List tasks**:
```bash
curl -X POST "http://localhost:8000/api/user123/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "What are my tasks?"
  }'
```

**Complete a task**:
```bash
curl -X POST "http://localhost:8000/api/user123/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "I finished buying groceries"
  }'
```

### Interactive Demo

For a more interactive experience, use the built-in demo CLI:

```bash
python -m src.cli.demo --user demo-user
```

This opens an interactive chat session where you can type messages naturally.

## API Documentation

Once the server is running, access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test category
pytest tests/unit/
pytest tests/integration/
pytest tests/contract/
```

## Project Structure

```
AI-Powered-Todo-Chatbot/
├── src/
│   ├── main.py              # FastAPI application entry
│   ├── models/              # SQLModel database models
│   ├── mcp/                 # MCP server and tools
│   ├── agent/               # OpenAI Agent configuration
│   ├── api/                 # FastAPI endpoints
│   └── db/                  # Database utilities
├── tests/                   # Test suite
├── specs/                   # Specifications and plans
├── .env                     # Environment configuration
└── requirements.txt         # Python dependencies
```

## Troubleshooting

### Database Connection Issues

**Error**: `asyncpg.exceptions.InvalidPasswordError`
- Verify your `DATABASE_URL` in `.env`
- Ensure password is URL-encoded if it contains special characters

**Error**: `SSL SYSCALL error`
- Add `?ssl=require` to your connection string
- Ensure you're using `postgresql+asyncpg://` prefix

### OpenAI API Issues

**Error**: `openai.AuthenticationError`
- Verify `OPENAI_API_KEY` is set correctly
- Check if your API key has the required permissions

### Agent Not Responding

- Check server logs for errors
- Ensure conversation history isn't too long (may hit token limits)
- Verify MCP tools are registered correctly

## Next Steps

1. **ChatKit Integration**: Connect the frontend UI to the `/api/{user_id}/chat` endpoint
2. **Authentication**: Add Better Auth for user authentication
3. **Rate Limiting**: Implement rate limiting for production
4. **Monitoring**: Add logging and observability

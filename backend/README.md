# AI-Powered Todo Chatbot - Backend

A natural language todo list manager powered by OpenAI's function calling and MCP (Model Context Protocol).

## Features

- **Natural Language Interface**: Create, list, complete, update, and delete tasks through conversational messages
- **AI-Powered**: Uses OpenAI's GPT models with function calling for intelligent task management
- **MCP Tools**: Implements task operations as Model Context Protocol tools
- **Conversation History**: Maintains multi-turn conversation context
- **Stateless Architecture**: All state persisted to PostgreSQL (Neon compatible)

## Prerequisites

- Python 3.11+
- PostgreSQL database (Neon recommended)
- OpenAI API key

## Setup

### 1. Clone and Navigate

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database
OPENAI_API_KEY=sk-your-openai-api-key
```

### 5. Run the Application

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

## API Endpoints

### Chat Endpoint

```
POST /api/{user_id}/chat
```

**Request Body:**
```json
{
  "message": "Add a task to buy groceries",
  "conversation_id": null
}
```

**Response:**
```json
{
  "conversation_id": "uuid-here",
  "response": "I've added 'buy groceries' to your task list!",
  "tool_calls": [
    {
      "tool_name": "add_task",
      "arguments": {"title": "buy groceries"},
      "result": "Task 'buy groceries' created successfully"
    }
  ]
}
```

### Health Check

```
GET /health
```

## Example Conversations

### Create a Task
```
User: Add a task to buy groceries
Bot: I've added 'buy groceries' to your task list!
```

### List Tasks
```
User: Show my tasks
Bot: Here are your tasks (0 completed, 1 pending):
[ ] buy groceries
```

### Complete a Task
```
User: I finished buying groceries
Bot: Great job! Task 'buy groceries' has been marked as complete.
```

### Update a Task
```
User: Change "buy groceries" to "buy groceries and milk"
Bot: Done! I've updated 'buy groceries' to 'buy groceries and milk'.
```

### Delete a Task
```
User: Delete the groceries task
Bot: Done! I've removed 'buy groceries and milk' from your task list.
```

## Project Structure

```
backend/
├── src/
│   ├── agent/              # OpenAI agent configuration
│   │   ├── __init__.py     # System prompt
│   │   └── todo_agent.py   # Agent with function calling
│   ├── api/                # FastAPI endpoints
│   │   ├── __init__.py     # Request/Response models
│   │   └── chat.py         # Chat endpoint
│   ├── db/                 # Database configuration
│   │   ├── __init__.py     # Async engine setup
│   │   ├── init.py         # Table initialization
│   │   └── session.py      # Session factory
│   ├── mcp/                # MCP server and tools
│   │   ├── server.py       # Tool registration
│   │   └── tools/          # Individual MCP tools
│   │       ├── add_task.py
│   │       ├── list_tasks.py
│   │       ├── complete_task.py
│   │       ├── update_task.py
│   │       ├── delete_task.py
│   │       └── utils.py
│   ├── models/             # SQLModel definitions
│   │   ├── task.py
│   │   ├── conversation.py
│   │   └── message.py
│   └── main.py             # FastAPI application entry
├── .env.example
├── pyproject.toml
├── requirements.txt
└── README.md
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `add_task` | Create a new task with title |
| `list_tasks` | List all tasks with completion status |
| `complete_task` | Mark a task as complete |
| `update_task` | Update a task's title |
| `delete_task` | Remove a task |

## Database Models

### Task
- `id`: UUID primary key
- `user_id`: Owner of the task
- `title`: Task description
- `is_completed`: Completion status
- `created_at`, `updated_at`: Timestamps

### Conversation
- `id`: UUID primary key
- `user_id`: Owner
- `created_at`, `updated_at`: Timestamps

### Message
- `id`: UUID primary key
- `conversation_id`: Parent conversation
- `role`: user | assistant
- `content`: Message text
- `tool_calls`: JSON array of tool invocations
- `created_at`: Timestamp

## Development

### Run with Auto-Reload

```bash
uvicorn src.main:app --reload
```

### Check OpenAPI Docs

Visit `http://localhost:8000/docs` for interactive API documentation.

## License

MIT

# API Contract: AI-Powered Todo Chatbot

**Branch**: `001-mcp-todo-chatbot` | **Date**: 2026-01-17

## Overview

Single endpoint for chat interactions. All task operations happen through the AI agent using MCP tools internally.

---

## Chat Endpoint

### POST /api/{user_id}/chat

Send a message to the AI chatbot and receive a response.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_id | string | Yes | Unique identifier for the user |

#### Request Body

```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Add a task to buy groceries"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conversation_id | UUID (string) | No | Existing conversation ID. If omitted, creates new conversation |
| message | string | Yes | User's message text (1-2000 characters) |

#### Response Body

**Success (200 OK)**:
```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Got it! I've added 'buy groceries' to your tasks.",
  "tool_calls": [
    {
      "tool_name": "add_task",
      "arguments": {
        "title": "buy groceries"
      },
      "result": "Task created with id: 123e4567-e89b-12d3-a456-426614174000"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| conversation_id | UUID (string) | ID of the conversation (new or existing) |
| response | string | AI assistant's response message |
| tool_calls | array | List of MCP tools invoked (may be empty) |

#### Tool Call Object

```json
{
  "tool_name": "add_task",
  "arguments": { "title": "buy groceries" },
  "result": "Task created with id: ..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| tool_name | string | Name of the MCP tool invoked |
| arguments | object | Arguments passed to the tool |
| result | string | Result returned by the tool |

#### Error Responses

**400 Bad Request** - Invalid input:
```json
{
  "detail": "Message is required and must be between 1 and 2000 characters"
}
```

**422 Unprocessable Entity** - Validation error:
```json
{
  "detail": [
    {
      "loc": ["body", "message"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**500 Internal Server Error** - Server error:
```json
{
  "detail": "I'm having trouble processing your request right now. Please try again."
}
```

---

## MCP Tool Contracts

These tools are invoked internally by the AI agent. They are NOT directly exposed as API endpoints.

### add_task

Create a new task for the user.

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | string | Yes | User identifier (from request context) |
| title | string | Yes | Task title (1-500 characters) |

**Returns**: Confirmation message with task ID

**Example**:
```json
{
  "tool": "add_task",
  "arguments": {
    "user_id": "user123",
    "title": "Buy groceries"
  },
  "result": "Task 'Buy groceries' created successfully (ID: 123e4567-e89b-12d3-a456-426614174000)"
}
```

---

### list_tasks

List all tasks for the user.

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | string | Yes | User identifier (from request context) |

**Returns**: Formatted list of tasks with status

**Example**:
```json
{
  "tool": "list_tasks",
  "arguments": {
    "user_id": "user123"
  },
  "result": "You have 3 tasks:\n1. [ ] Buy groceries\n2. [x] Call mom\n3. [ ] Finish report"
}
```

---

### complete_task

Mark a task as completed.

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | string | Yes | User identifier (from request context) |
| task_identifier | string | Yes | Task title or partial match |

**Returns**: Confirmation message or error if not found

**Example (success)**:
```json
{
  "tool": "complete_task",
  "arguments": {
    "user_id": "user123",
    "task_identifier": "groceries"
  },
  "result": "Marked 'Buy groceries' as complete!"
}
```

**Example (not found)**:
```json
{
  "tool": "complete_task",
  "arguments": {
    "user_id": "user123",
    "task_identifier": "unknown task"
  },
  "result": "Could not find a task matching 'unknown task'. Your tasks are:\n1. [ ] Buy groceries\n2. [x] Call mom"
}
```

**Example (ambiguous)**:
```json
{
  "tool": "complete_task",
  "arguments": {
    "user_id": "user123",
    "task_identifier": "buy"
  },
  "result": "Found multiple tasks matching 'buy':\n1. Buy groceries\n2. Buy birthday gift\nWhich one did you mean?"
}
```

---

### update_task

Update an existing task's title.

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | string | Yes | User identifier (from request context) |
| task_identifier | string | Yes | Current task title or partial match |
| new_title | string | Yes | New title for the task (1-500 characters) |

**Returns**: Confirmation message with old and new title

**Example**:
```json
{
  "tool": "update_task",
  "arguments": {
    "user_id": "user123",
    "task_identifier": "groceries",
    "new_title": "Buy groceries and milk"
  },
  "result": "Updated 'Buy groceries' to 'Buy groceries and milk'"
}
```

---

### delete_task

Remove a task.

**Arguments**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | string | Yes | User identifier (from request context) |
| task_identifier | string | Yes | Task title or partial match |

**Returns**: Confirmation message or error if not found

**Example**:
```json
{
  "tool": "delete_task",
  "arguments": {
    "user_id": "user123",
    "task_identifier": "groceries"
  },
  "result": "Removed 'Buy groceries' from your tasks"
}
```

---

## Request/Response Models (Pydantic)

```python
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = Field(
        default=None,
        description="Existing conversation ID. If omitted, creates new conversation"
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's message text"
    )

class ToolCall(BaseModel):
    tool_name: str
    arguments: dict
    result: str

class ChatResponse(BaseModel):
    conversation_id: UUID
    response: str
    tool_calls: list[ToolCall] = Field(default_factory=list)
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/{user_id}/chat | 60 requests | per minute per user |

**Note**: Rate limiting is recommended for production but not required for MVP.

---

## CORS Configuration

For ChatKit UI integration:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
```

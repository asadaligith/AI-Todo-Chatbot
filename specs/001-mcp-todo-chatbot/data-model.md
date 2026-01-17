# Data Model: AI-Powered Todo Chatbot

**Branch**: `001-mcp-todo-chatbot` | **Date**: 2026-01-17

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER CONTEXT                               │
│                     (user_id from URL path)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ owns
                    ┌───────────────┼───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │       Task        │           │   Conversation    │
        ├───────────────────┤           ├───────────────────┤
        │ id: UUID (PK)     │           │ id: UUID (PK)     │
        │ user_id: str      │           │ user_id: str      │
        │ title: str        │           │ created_at: dt    │
        │ is_completed: bool│           │ updated_at: dt    │
        │ created_at: dt    │           └───────────────────┘
        │ updated_at: dt    │                     │
        └───────────────────┘                     │ contains
                                                  │
                                                  ▼
                                      ┌───────────────────┐
                                      │     Message       │
                                      ├───────────────────┤
                                      │ id: UUID (PK)     │
                                      │ conversation_id:  │
                                      │   UUID (FK)       │
                                      │ role: enum        │
                                      │ content: str      │
                                      │ tool_calls: json  │
                                      │ created_at: dt    │
                                      └───────────────────┘
```

## Entities

### Task

Represents a user's todo item.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | string | NOT NULL, indexed | Owner of the task |
| title | string | NOT NULL, max 500 chars | Task description |
| is_completed | boolean | NOT NULL, default FALSE | Completion status |
| created_at | datetime | NOT NULL, auto-set | Creation timestamp (UTC) |
| updated_at | datetime | NOT NULL, auto-update | Last modification timestamp (UTC) |

**Indexes**:
- `idx_task_user_id` on `user_id` - Fast lookup of user's tasks
- `idx_task_user_completed` on `(user_id, is_completed)` - Filter by status

**Validation Rules**:
- `title` must be non-empty after trimming whitespace
- `title` maximum length: 500 characters
- `user_id` must be non-empty string

---

### Conversation

Represents a chat session between user and assistant.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | string | NOT NULL, indexed | Owner of the conversation |
| created_at | datetime | NOT NULL, auto-set | Creation timestamp (UTC) |
| updated_at | datetime | NOT NULL, auto-update | Last activity timestamp (UTC) |

**Indexes**:
- `idx_conversation_user_id` on `user_id` - Fast lookup of user's conversations

**Validation Rules**:
- `user_id` must be non-empty string

---

### Message

Represents a single message in a conversation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| conversation_id | UUID | FK → Conversation.id, NOT NULL | Parent conversation |
| role | enum | NOT NULL, values: 'user', 'assistant' | Message author role |
| content | text | NOT NULL | Message text content |
| tool_calls | JSON | NULLABLE | Tool calls made (assistant only) |
| created_at | datetime | NOT NULL, auto-set | Creation timestamp (UTC) |

**Indexes**:
- `idx_message_conversation_id` on `conversation_id` - Fast lookup of conversation messages
- `idx_message_conversation_created` on `(conversation_id, created_at)` - Ordered retrieval

**Validation Rules**:
- `content` must be non-empty after trimming whitespace
- `role` must be one of: 'user', 'assistant'
- `tool_calls` is only set for 'assistant' messages

**Tool Calls JSON Schema**:
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "tool_name": { "type": "string" },
      "arguments": { "type": "object" },
      "result": { "type": "string" }
    }
  }
}
```

---

## State Transitions

### Task Status

```
┌─────────────┐                    ┌─────────────┐
│   Pending   │───complete_task───▶│  Completed  │
│is_completed │                    │is_completed │
│  = FALSE    │◀──(no reverse)────│  = TRUE     │
└─────────────┘                    └─────────────┘
```

**Note**: Tasks cannot be "uncompleted" in MVP. Delete and recreate if needed.

### Conversation Lifecycle

```
┌─────────────┐    user message    ┌─────────────┐
│   (none)    │──────────────────▶│   Active    │
└─────────────┘                    └─────────────┘
                                         │
                                         │ more messages
                                         ▼
                                   ┌─────────────┐
                                   │   Active    │
                                   │ (continues) │
                                   └─────────────┘
```

Conversations have no explicit "closed" state. They remain available indefinitely.

---

## Cascade Behavior

| Parent | Child | On Delete |
|--------|-------|-----------|
| Conversation | Message | CASCADE - Delete all messages |

**Note**: Tasks are independent entities with no foreign key relationships.

---

## Query Patterns

### Common Queries

1. **List tasks for user**:
   ```sql
   SELECT * FROM task
   WHERE user_id = :user_id
   ORDER BY created_at DESC
   ```

2. **Get or create conversation**:
   ```sql
   -- Get existing
   SELECT * FROM conversation WHERE id = :conversation_id AND user_id = :user_id

   -- Or create new
   INSERT INTO conversation (id, user_id, created_at, updated_at)
   VALUES (:id, :user_id, NOW(), NOW())
   ```

3. **Load conversation history**:
   ```sql
   SELECT * FROM message
   WHERE conversation_id = :conversation_id
   ORDER BY created_at ASC
   ```

4. **Find task by title (fuzzy)**:
   ```sql
   SELECT * FROM task
   WHERE user_id = :user_id
   AND LOWER(title) LIKE LOWER(:query)
   ```

---

## SQLModel Definitions (Reference)

```python
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

class Task(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: str = Field(index=True)
    title: str = Field(max_length=500)
    is_completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Conversation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Message(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", index=True)
    role: MessageRole
    content: str
    tool_calls: Optional[dict] = Field(default=None, sa_column_kwargs={"type_": JSON})
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

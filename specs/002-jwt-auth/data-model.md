# Data Model: JWT Authentication System

**Feature**: 002-jwt-auth
**Date**: 2026-01-20
**Status**: Complete

## Overview

This document defines the data model for JWT authentication, including new entities and modifications to existing entities.

---

## New Entities

### User

Represents a registered user in the system.

**Table Name**: `users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid4 | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | User's email address |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt-hashed password |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Account active status |

**Indexes**:
- `idx_users_email` on `email` (unique)

**Validation Rules**:
- `email`: Valid email format, max 255 chars, case-insensitive comparison
- `password_hash`: Stored as bcrypt hash, never exposed in API

**SQLModel Definition**:
```python
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(
        max_length=255,
        index=True,
        unique=True,
        nullable=False
    )
    password_hash: str = Field(max_length=255, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
```

---

### RefreshToken

Represents an active refresh token stored in the database.

**Table Name**: `refresh_tokens`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid4 | Token identifier (jti claim) |
| `user_id` | UUID | FOREIGN KEY (users.id), NOT NULL, INDEX | Owner user |
| `token_hash` | VARCHAR(255) | NOT NULL | Hashed token value |
| `expires_at` | TIMESTAMP | NOT NULL, INDEX | Token expiration time |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Token creation time |
| `revoked_at` | TIMESTAMP | NULL | When token was revoked (NULL if active) |
| `replaced_by` | UUID | NULL, FOREIGN KEY (refresh_tokens.id) | Token that replaced this one |

**Indexes**:
- `idx_refresh_tokens_user_id` on `user_id`
- `idx_refresh_tokens_expires_at` on `expires_at`
- `idx_refresh_tokens_token_hash` on `token_hash`

**Validation Rules**:
- `user_id`: Must reference existing user
- `expires_at`: Must be in future at creation time
- `revoked_at`: Set when token is explicitly revoked or rotated

**SQLModel Definition**:
```python
class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        foreign_key="users.id",
        index=True,
        nullable=False
    )
    token_hash: str = Field(max_length=255, nullable=False)
    expires_at: datetime = Field(nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    revoked_at: Optional[datetime] = Field(default=None, nullable=True)
    replaced_by: Optional[UUID] = Field(
        default=None,
        foreign_key="refresh_tokens.id",
        nullable=True
    )
```

---

## Modified Entities

### Task (Existing)

Add user ownership relationship.

**New Field**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `owner_id` | UUID | FOREIGN KEY (users.id), NULL, INDEX | User who owns this task |

**Migration Notes**:
- Field is nullable initially for backward compatibility
- Existing tasks with string `user_id` will need migration
- New tasks created after auth implementation will have `owner_id` set

**Updated SQLModel Definition**:
```python
class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: str = Field(index=True, nullable=False)  # Legacy field
    owner_id: Optional[UUID] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        nullable=True
    )
    title: str = Field(max_length=500, nullable=False)
    is_completed: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
```

---

### Conversation (Existing)

Add user ownership relationship.

**New Field**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `owner_id` | UUID | FOREIGN KEY (users.id), NULL, INDEX | User who owns this conversation |

**Updated SQLModel Definition**:
```python
class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: str = Field(index=True, nullable=False)  # Legacy field
    owner_id: Optional[UUID] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        nullable=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
```

---

## Entity Relationships

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │──────────┬──────────────────────────────────┐
│ email           │          │                                  │
│ password_hash   │          │                                  │
│ is_active       │          │ 1:N                              │ 1:N
│ created_at      │          │                                  │
│ updated_at      │          ▼                                  ▼
└─────────────────┘  ┌───────────────────┐           ┌─────────────────────┐
                     │   RefreshToken    │           │        Task         │
                     ├───────────────────┤           ├─────────────────────┤
                     │ id (PK, jti)      │           │ id (PK)             │
                     │ user_id (FK)      │           │ owner_id (FK, opt)  │
                     │ token_hash        │           │ user_id (legacy)    │
                     │ expires_at        │           │ title               │
                     │ revoked_at        │           │ is_completed        │
                     │ replaced_by (FK)  │──┐        │ created_at          │
                     │ created_at        │  │        │ updated_at          │
                     └───────────────────┘  │        └─────────────────────┘
                              ▲             │
                              │             │
                              └─────────────┘
                              (self-reference for token rotation)

                                    User
                                      │
                                      │ 1:N
                                      ▼
                            ┌─────────────────────┐
                            │    Conversation     │
                            ├─────────────────────┤
                            │ id (PK)             │
                            │ owner_id (FK, opt)  │
                            │ user_id (legacy)    │
                            │ created_at          │
                            │ updated_at          │
                            └─────────────────────┘
                                      │
                                      │ 1:N
                                      ▼
                            ┌─────────────────────┐
                            │      Message        │
                            ├─────────────────────┤
                            │ id (PK)             │
                            │ conversation_id (FK)│
                            │ role                │
                            │ content             │
                            │ tool_calls          │
                            │ created_at          │
                            └─────────────────────┘
```

---

## State Transitions

### User Account States

```
┌──────────────┐     register      ┌──────────────┐
│   (none)     │─────────────────▶ │    Active    │
└──────────────┘                   └──────────────┘
                                          │
                                          │ deactivate (future)
                                          ▼
                                   ┌──────────────┐
                                   │   Inactive   │
                                   └──────────────┘
```

### Refresh Token States

```
┌──────────────┐      create       ┌──────────────┐
│   (none)     │─────────────────▶ │    Active    │
└──────────────┘                   └──────────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          │               │               │
                          │ rotate        │ expire        │ logout
                          ▼               ▼               ▼
                   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                   │   Rotated    │ │   Expired    │ │   Revoked    │
                   │ (replaced_by)│ │ (time-based) │ │ (revoked_at) │
                   └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Database Migration Plan

### Migration 1: Create users table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### Migration 2: Create refresh_tokens table

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP NULL,
    replaced_by UUID NULL REFERENCES refresh_tokens(id)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

### Migration 3: Add owner_id to tasks

```sql
ALTER TABLE tasks ADD COLUMN owner_id UUID NULL REFERENCES users(id);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
```

### Migration 4: Add owner_id to conversations

```sql
ALTER TABLE conversations ADD COLUMN owner_id UUID NULL REFERENCES users(id);
CREATE INDEX idx_conversations_owner_id ON conversations(owner_id);
```

---

## Query Patterns

### Find user by email (login)
```python
select(User).where(User.email == email.lower())
```

### Get active refresh token
```python
select(RefreshToken).where(
    RefreshToken.id == token_id,
    RefreshToken.revoked_at.is_(None),
    RefreshToken.expires_at > datetime.utcnow()
)
```

### Get user's tasks (authenticated)
```python
select(Task).where(Task.owner_id == current_user.id)
```

### Revoke all user tokens (logout all sessions)
```python
update(RefreshToken).where(
    RefreshToken.user_id == user_id,
    RefreshToken.revoked_at.is_(None)
).values(revoked_at=datetime.utcnow())
```

---

## Data Integrity Constraints

1. **User email uniqueness**: Enforced at database level with unique constraint
2. **Refresh token user reference**: CASCADE delete ensures orphan cleanup
3. **Token rotation chain**: `replaced_by` creates audit trail
4. **Owner references**: ON DELETE behavior TBD (likely SET NULL for soft delete)

---

## Performance Considerations

1. **Index on `refresh_tokens.token_hash`**: Fast token lookup during validation
2. **Index on `refresh_tokens.expires_at`**: Efficient expired token cleanup jobs
3. **Index on `owner_id` fields**: Fast filtering for user-owned resources
4. **Email case-insensitive**: Store lowercase, query with `.lower()`

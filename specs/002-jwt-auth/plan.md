# Implementation Plan: JWT Authentication System

**Branch**: `002-jwt-auth` | **Date**: 2026-01-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-jwt-auth/spec.md`

---

## Summary

Implement stateless JWT authentication for the AI-Powered Todo Chatbot, enabling secure email/password registration, login, and token-based session management. The implementation adds User and RefreshToken models to the existing PostgreSQL database, integrates authentication middleware into the FastAPI backend, and updates the Next.js frontend to handle token-based auth flows.

---

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI 0.110+, SQLModel 0.0.16+, passlib[bcrypt], python-jose[cryptography], slowapi
**Storage**: PostgreSQL (Neon) via asyncpg - already connected
**Testing**: pytest with pytest-asyncio
**Target Platform**: Linux server (Render) + Vercel (frontend)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: 100 concurrent auth requests without degradation
**Constraints**: Stateless access tokens, database-stored refresh tokens, 15 min / 7 day expiry
**Scale/Scope**: Single deployment, user-owned data isolation

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | PASS | Following /sp.specify → /sp.plan → /sp.tasks flow |
| II. Stateless Architecture | PASS | Access tokens are stateless JWT; only refresh tokens stored in DB |
| III. AI-First via OpenAI Agents SDK | PASS | Auth is orthogonal to AI layer; agent continues to function |
| IV. MCP Tool Exclusivity | PASS | Auth middleware sits before MCP; tools receive authenticated user_id |
| V. Natural Language Interface | PASS | Chat interface unchanged; auth is transparent to conversation |
| VI. Graceful Error Handling | PASS | Auth errors return user-friendly messages per FR-028 |

**Gate Status**: PASSED - No violations detected.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-jwt-auth/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Implementation guide
├── contracts/
│   └── api.md           # API contract specification
└── tasks.md             # Phase 2 output (/sp.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.py                    # FastAPI application (modify: add auth router)
│   ├── core/
│   │   └── config.py              # NEW: Settings and config management
│   ├── models/
│   │   ├── __init__.py            # Update: export new models
│   │   ├── task.py                # Modify: add owner_id FK
│   │   ├── conversation.py        # Modify: add owner_id FK
│   │   ├── message.py             # Unchanged
│   │   └── user.py                # NEW: User and RefreshToken models
│   ├── services/
│   │   └── auth.py                # NEW: Password hashing, token generation
│   ├── api/
│   │   ├── __init__.py            # Unchanged
│   │   ├── chat.py                # Modify: add auth dependency
│   │   ├── tasks.py               # Modify: add auth dependency
│   │   ├── auth.py                # NEW: Auth endpoints
│   │   └── deps.py                # NEW: Auth dependencies
│   ├── db/
│   │   └── __init__.py            # Unchanged (already async)
│   ├── agent/
│   │   └── todo_agent.py          # Modify: use authenticated user_id
│   └── mcp/
│       └── tools/                 # Modify: tools receive owner_id
└── tests/
    ├── unit/
    │   └── test_auth_service.py   # NEW: Auth service unit tests
    └── integration/
        └── test_auth_endpoints.py # NEW: Auth endpoint integration tests

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Modify: wrap with AuthProvider
│   │   ├── page.tsx               # Modify: conditional render based on auth
│   │   ├── login/
│   │   │   └── page.tsx           # NEW: Login page
│   │   └── register/
│   │       └── page.tsx           # NEW: Registration page
│   ├── components/
│   │   ├── Chat.tsx               # Modify: use auth context for API calls
│   │   ├── Sidebar.tsx            # Modify: use auth context
│   │   ├── AuthForm.tsx           # NEW: Reusable auth form
│   │   └── ProtectedRoute.tsx     # NEW: Auth route wrapper
│   └── lib/
│       ├── api.ts                 # Modify: add auth headers
│       └── auth.tsx               # NEW: Auth context and hooks
└── tests/                         # Existing test structure
```

**Structure Decision**: Extends existing web application structure. New files added to backend services, models, and API layers. Frontend gains auth context and protected routes.

---

## Implementation Phases

### Phase 1: Backend Foundation (Database & Models)

**Goal**: Create database schema and models for authentication.

**Tasks**:
1. Create `backend/src/core/config.py` - Settings management with Pydantic
2. Create `backend/src/models/user.py` - User and RefreshToken SQLModel classes
3. Update `backend/src/models/__init__.py` - Export new models
4. Update `backend/src/models/task.py` - Add optional `owner_id` field
5. Update `backend/src/models/conversation.py` - Add optional `owner_id` field
6. Create database migrations for new tables

**Acceptance**:
- [ ] `users` table created with email uniqueness constraint
- [ ] `refresh_tokens` table created with FK to users
- [ ] Existing tables have `owner_id` column added
- [ ] All indexes created per data-model.md

---

### Phase 2: Backend Auth Service

**Goal**: Implement core authentication logic.

**Tasks**:
1. Create `backend/src/services/auth.py`:
   - `hash_password()` - bcrypt hashing
   - `verify_password()` - bcrypt verification
   - `create_access_token()` - JWT generation
   - `create_refresh_token()` - Refresh token generation and DB storage
   - `verify_access_token()` - JWT validation
   - `rotate_refresh_token()` - Token rotation logic
   - `revoke_refresh_token()` - Token revocation

**Acceptance**:
- [ ] Passwords hashed with bcrypt (not reversible)
- [ ] Access tokens contain correct claims (sub, email, exp, iat, type)
- [ ] Refresh tokens stored in database with hash
- [ ] Token rotation invalidates old token

---

### Phase 3: Backend Auth API

**Goal**: Implement authentication endpoints.

**Tasks**:
1. Create `backend/src/api/deps.py`:
   - `get_current_user()` dependency
   - `oauth2_scheme` for token extraction
2. Create `backend/src/api/auth.py`:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/auth/refresh`
   - `POST /api/auth/logout`
   - `GET /api/auth/me`
3. Register auth router in `main.py`
4. Add rate limiting with slowapi

**Acceptance**:
- [ ] Registration creates user, returns user info
- [ ] Login returns access token, sets refresh cookie
- [ ] Refresh rotates tokens, updates cookie
- [ ] Logout revokes refresh token, clears cookie
- [ ] /me returns current user info
- [ ] Rate limits enforced per contracts/api.md

---

### Phase 4: Backend Route Protection

**Goal**: Protect existing endpoints with authentication.

**Tasks**:
1. Update `backend/src/api/chat.py`:
   - Add `get_current_user` dependency
   - Remove `user_id` from path
   - Use `current_user.id` for operations
2. Update `backend/src/api/tasks.py`:
   - Add `get_current_user` dependency
   - Remove `user_id` from path
   - Filter tasks by `owner_id`
3. Update `backend/src/agent/todo_agent.py`:
   - Accept `user_id` from authenticated context
4. Update MCP tools to use `owner_id`:
   - `add_task.py`
   - `list_tasks.py`
   - `complete_task.py`
   - `update_task.py`
   - `delete_task.py`

**Acceptance**:
- [ ] Chat endpoint requires authentication
- [ ] Tasks endpoint requires authentication
- [ ] Users can only access their own data
- [ ] MCP tools operate on authenticated user's data

---

### Phase 5: Frontend Auth Context

**Goal**: Implement client-side authentication state management.

**Tasks**:
1. Create `frontend/src/lib/auth.tsx`:
   - `AuthProvider` context provider
   - `useAuth()` hook
   - Token state management
   - Auto-refresh on page load
2. Update `frontend/src/app/layout.tsx`:
   - Wrap app with `AuthProvider`
3. Create `frontend/src/components/ProtectedRoute.tsx`:
   - Redirect to login if not authenticated

**Acceptance**:
- [ ] Auth state persists across page navigation
- [ ] Auto-refresh attempts token refresh on mount
- [ ] `useAuth()` provides user, login, logout, register functions

---

### Phase 6: Frontend Auth Pages

**Goal**: Create login and registration UI.

**Tasks**:
1. Create `frontend/src/components/AuthForm.tsx`:
   - Reusable form for login/register
   - Email and password inputs
   - Error display
   - Loading state
2. Create `frontend/src/app/login/page.tsx`:
   - Login form with redirect on success
3. Create `frontend/src/app/register/page.tsx`:
   - Registration form with auto-login

**Acceptance**:
- [ ] Users can register with email/password
- [ ] Users can login with credentials
- [ ] Errors displayed clearly
- [ ] Redirect to chat after successful auth

---

### Phase 7: Frontend Integration

**Goal**: Update existing components to use authentication.

**Tasks**:
1. Update `frontend/src/lib/api.ts`:
   - Add `Authorization` header to requests
   - Handle 401 responses with refresh
   - Update API URLs (remove user_id from path)
2. Update `frontend/src/components/Chat.tsx`:
   - Remove client-side user_id generation
   - Use auth context for user info
   - Show login prompt if not authenticated
3. Update `frontend/src/components/Sidebar.tsx`:
   - Use auth context for API calls
4. Update `frontend/src/app/page.tsx`:
   - Conditional render based on auth state

**Acceptance**:
- [ ] API calls include auth token
- [ ] 401 responses trigger token refresh
- [ ] Unauthenticated users see login prompt
- [ ] Chat works with authenticated user

---

### Phase 8: Testing

**Goal**: Ensure auth system works correctly.

**Tasks**:
1. Create `backend/tests/unit/test_auth_service.py`:
   - Test password hashing
   - Test token generation
   - Test token validation
2. Create `backend/tests/integration/test_auth_endpoints.py`:
   - Test registration flow
   - Test login flow
   - Test refresh flow
   - Test logout flow
   - Test protected endpoints

**Acceptance**:
- [ ] Unit tests pass for auth service
- [ ] Integration tests pass for all endpoints
- [ ] Protected routes reject unauthenticated requests
- [ ] Data isolation verified (user A can't see user B's data)

---

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing data | High | Optional `owner_id` field, gradual migration |
| Token security breach | High | Short access token expiry, secure cookie settings |
| Rate limit bypass | Medium | Server-side enforcement with slowapi |

---

## Follow-ups

1. **Data Migration**: Create script to migrate existing string `user_id` to UUID `owner_id`
2. **Monitoring**: Add auth-specific metrics (login success/failure rates)
3. **Future**: Consider adding password reset flow (out of scope for v1)

---

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Research | `specs/002-jwt-auth/research.md` | Complete |
| Data Model | `specs/002-jwt-auth/data-model.md` | Complete |
| API Contract | `specs/002-jwt-auth/contracts/api.md` | Complete |
| Quickstart | `specs/002-jwt-auth/quickstart.md` | Complete |
| Plan | `specs/002-jwt-auth/plan.md` | Complete |

---

## Next Steps

Run `/sp.tasks` to generate detailed, dependency-ordered tasks for implementation.

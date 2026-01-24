# Tasks: JWT Authentication System

**Input**: Design documents from `/specs/002-jwt-auth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Test tasks are included as requested ("Each task must be independently testable").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and configuration

- [x] T001 Add auth dependencies to backend/requirements.txt (passlib[bcrypt], python-jose[cryptography], slowapi)
- [x] T002 [P] Create backend/src/core/ directory structure
- [x] T003 [P] Create backend/src/core/config.py with Settings class using Pydantic BaseSettings for JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
- [x] T004 [P] Update backend/.env.example with new JWT configuration variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Models

- [x] T005 [P] Create backend/src/models/user.py with User SQLModel class per data-model.md (id, email, password_hash, is_active, created_at, updated_at)
- [x] T006 [P] Create backend/src/models/user.py with RefreshToken SQLModel class per data-model.md (id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by)
- [x] T007 Update backend/src/models/__init__.py to export User and RefreshToken models
- [x] T008 [P] Update backend/src/models/task.py to add optional owner_id field (UUID, FK to users.id, nullable=True, indexed)
- [x] T009 [P] Update backend/src/models/conversation.py to add optional owner_id field (UUID, FK to users.id, nullable=True, indexed)

### Auth Service Core

- [x] T010 Create backend/src/services/auth.py with hash_password() function using passlib CryptContext with bcrypt
- [x] T011 Add verify_password() function to backend/src/services/auth.py
- [x] T012 Add create_access_token() function to backend/src/services/auth.py per contracts/api.md JWT claims (sub, email, type, iat, exp)
- [x] T013 Add verify_access_token() function to backend/src/services/auth.py returning decoded payload or raising exception
- [x] T014 Add create_refresh_token() async function to backend/src/services/auth.py that generates JWT, stores hash in DB, returns token string
- [x] T015 Add rotate_refresh_token() async function to backend/src/services/auth.py that invalidates old token (set replaced_by), creates new token
- [x] T016 Add revoke_refresh_token() async function to backend/src/services/auth.py that sets revoked_at timestamp

### Auth Dependencies

- [x] T017 Create backend/src/api/deps.py with OAuth2PasswordBearer scheme pointing to /api/auth/login
- [x] T018 Add get_current_user() async dependency to backend/src/api/deps.py that extracts token, validates, returns User or raises 401

### Error Handling

- [x] T019 Create backend/src/core/exceptions.py with AuthException base class and specific exceptions (InvalidCredentialsError, TokenExpiredError, TokenRevokedError, EmailExistsError)
- [x] T020 Add exception handlers to backend/src/main.py for auth exceptions returning consistent error format per contracts/api.md

### Rate Limiting

- [x] T021 Configure slowapi limiter in backend/src/main.py with key_func for IP-based limiting

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - User Registration (Priority: P1) 🎯 MVP

**Goal**: Allow new users to create accounts with email/password

**Independent Test**: Create a new account and verify user exists in database with hashed password

### Implementation for User Story 1

- [x] T022 [US1] Create backend/src/api/auth.py with APIRouter(prefix="/api/auth", tags=["Authentication"])
- [x] T023 [US1] Create Pydantic request model UserCreate in backend/src/api/auth.py with email (EmailStr, max 255), password (str, min 8, max 128)
- [x] T024 [US1] Create Pydantic response model UserResponse in backend/src/api/auth.py with id, email, created_at
- [x] T025 [US1] Implement POST /api/auth/register endpoint in backend/src/api/auth.py: validate email format, check email uniqueness, hash password, create user, return UserResponse (201)
- [x] T026 [US1] Add email exists check to register endpoint returning 400 with EMAIL_EXISTS code per contracts/api.md
- [x] T027 [US1] Add @limiter.limit("3/hour") rate limiting to register endpoint
- [x] T028 [US1] Register auth router in backend/src/main.py using app.include_router()
- [x] T029 [US1] Verify database creates users table on startup with email uniqueness constraint

### Frontend for User Story 1

- [x] T030 [P] [US1] Create frontend/src/app/register/page.tsx with registration form (email, password, confirm password fields)
- [x] T031 [US1] Add form validation in register page: email format, password min 8 chars, passwords match
- [x] T032 [US1] Add API call to POST /api/auth/register with error handling for EMAIL_EXISTS and VALIDATION_ERROR
- [x] T033 [US1] Add success redirect to login page after registration

**Checkpoint**: Users can register. Test by creating account via curl or frontend form.

---

## Phase 4: User Story 2 - User Login (Priority: P1)

**Goal**: Allow registered users to authenticate and receive tokens

**Independent Test**: Login with valid credentials and verify access_token and refresh_token cookie are returned

### Implementation for User Story 2

- [x] T034 [US2] Create Pydantic request model LoginRequest in backend/src/api/auth.py with email, password
- [x] T035 [US2] Create Pydantic response model TokenResponse in backend/src/api/auth.py with access_token, token_type, expires_in, user (UserResponse)
- [x] T036 [US2] Implement POST /api/auth/login endpoint in backend/src/api/auth.py: find user by email, verify password, create tokens
- [x] T037 [US2] Add Set-Cookie header for refresh_token in login response (HttpOnly, Secure, SameSite=Strict, Path=/api/auth, Max-Age=604800)
- [x] T038 [US2] Add consistent error response for invalid credentials (401, INVALID_CREDENTIALS) - same message for wrong email or password
- [x] T039 [US2] Add @limiter.limit("5/15minutes") rate limiting to login endpoint
- [x] T040 [US2] Implement GET /api/auth/me endpoint returning current user info using get_current_user dependency

### Frontend for User Story 2

- [x] T041 [P] [US2] Create frontend/src/lib/auth.tsx with AuthContext, AuthProvider, and useAuth() hook
- [x] T042 [US2] Implement login() function in auth context: call POST /api/auth/login with credentials: 'include', store access_token in state, store user info
- [x] T043 [US2] Implement fetchUser() function in auth context using GET /api/auth/me to restore session
- [x] T044 [US2] Update frontend/src/app/layout.tsx to wrap app with AuthProvider
- [x] T045 [P] [US2] Create frontend/src/app/login/page.tsx with login form (email, password fields)
- [x] T046 [US2] Add form validation and error display in login page
- [x] T047 [US2] Add success redirect to home page (/) after login
- [x] T048 [P] [US2] Create frontend/src/components/AuthForm.tsx as reusable form component for login/register

**Checkpoint**: Users can register AND login. Test full registration → login flow.

---

## Phase 5: User Story 3 - Token Refresh (Priority: P2)

**Goal**: Allow seamless session continuation via automatic token refresh

**Independent Test**: Wait for access token expiry, call refresh endpoint, verify new access_token returned and cookie updated

### Implementation for User Story 3

- [x] T049 [US3] Implement POST /api/auth/refresh endpoint in backend/src/api/auth.py: read refresh_token from cookie, validate, rotate token, return new access_token
- [x] T050 [US3] Add refresh token validation: check exists in DB, not expired, not revoked
- [x] T051 [US3] Add token rotation in refresh endpoint: invalidate old token (set replaced_by), create new token, update cookie
- [x] T052 [US3] Add error responses for TOKEN_EXPIRED, TOKEN_REVOKED, INVALID_TOKEN per contracts/api.md
- [x] T053 [US3] Add @limiter.limit("30/minute") rate limiting to refresh endpoint

### Frontend for User Story 3

- [x] T054 [US3] Implement refreshToken() function in auth context: call POST /api/auth/refresh with credentials: 'include', update access_token in state
- [x] T055 [US3] Add auto-refresh on page load in AuthProvider useEffect to restore session from refresh token cookie
- [x] T056 [US3] Update frontend/src/lib/api.ts to add fetchWithAuth() wrapper that retries with refresh on 401 response

**Checkpoint**: Sessions persist across page refreshes and token expiry. Test by refreshing page while logged in.

---

## Phase 6: User Story 4 - User Logout (Priority: P2)

**Goal**: Allow users to securely end their session

**Independent Test**: Logout and verify old tokens no longer work (refresh token revoked, access token rejected)

### Implementation for User Story 4

- [x] T057 [US4] Implement POST /api/auth/logout endpoint in backend/src/api/auth.py: require access token, revoke refresh token from cookie, clear cookie
- [x] T058 [US4] Add Set-Cookie header to clear refresh_token cookie (Max-Age=0) in logout response
- [x] T059 [US4] Return success message {"message": "Successfully logged out"} per contracts/api.md

### Frontend for User Story 4

- [x] T060 [US4] Implement logout() function in auth context: call POST /api/auth/logout with credentials: 'include', clear access_token and user from state
- [x] T061 [US4] Add logout button to frontend/src/components/Sidebar.tsx or header component
- [x] T062 [US4] Add redirect to login page after logout

**Checkpoint**: Users can logout and must re-authenticate. Test logout → try to access protected route → redirected to login.

---

## Phase 7: User Story 5 - Data Ownership Enforcement (Priority: P1)

**Goal**: Ensure users can only access their own todos and chat history

**Independent Test**: Create User A and User B, verify User A cannot access User B's tasks via API

### Implementation for User Story 5

- [x] T063 [US5] Update backend/src/api/chat.py: remove {user_id} from path, add get_current_user dependency, use current_user.id for all operations
- [x] T064 [US5] Update backend/src/api/tasks.py: remove {user_id} from path, add get_current_user dependency, filter tasks by owner_id matching current_user.id
- [x] T065 [US5] Update backend/src/agent/todo_agent.py: accept user_id parameter from authenticated context instead of path
- [x] T066 [P] [US5] Update backend/src/mcp/tools/add_task.py to use owner_id from authenticated user
- [x] T067 [P] [US5] Update backend/src/mcp/tools/list_tasks.py to filter by owner_id
- [x] T068 [P] [US5] Update backend/src/mcp/tools/complete_task.py to verify owner_id before completing
- [x] T069 [P] [US5] Update backend/src/mcp/tools/update_task.py to verify owner_id before updating
- [x] T070 [P] [US5] Update backend/src/mcp/tools/delete_task.py to verify owner_id before deleting

### Frontend for User Story 5

- [x] T071 [US5] Update frontend/src/lib/api.ts: remove user_id from API URLs, use fetchWithAuth() for all protected endpoints
- [x] T072 [US5] Update frontend/src/components/Chat.tsx: remove localStorage user_id generation, use auth context user
- [x] T073 [US5] Update frontend/src/components/Sidebar.tsx: use fetchWithAuth() for tasks API call
- [x] T074 [P] [US5] Create frontend/src/components/ProtectedRoute.tsx wrapper that redirects to /login if not authenticated
- [x] T075 [US5] Update frontend/src/app/page.tsx to conditionally render Chat or redirect to login based on auth state

**Checkpoint**: Data isolation enforced. Test by logging in as different users and verifying each only sees their own data.

---

## Phase 8: Testing & Verification

**Purpose**: Comprehensive testing to ensure production readiness

### Unit Tests

- [x] T076 [P] Create backend/tests/unit/test_auth_service.py with tests for hash_password(), verify_password()
- [x] T077 [P] Add tests to test_auth_service.py for create_access_token(), verify_access_token()
- [x] T078 [P] Add tests to test_auth_service.py for refresh token operations (create, rotate, revoke)

### Integration Tests

- [x] T079 [P] Create backend/tests/integration/test_auth_endpoints.py with test_register_success, test_register_duplicate_email
- [x] T080 [P] Add tests for login: test_login_success, test_login_invalid_credentials, test_login_rate_limited
- [x] T081 [P] Add tests for refresh: test_refresh_success, test_refresh_expired_token, test_refresh_revoked_token
- [x] T082 [P] Add tests for logout: test_logout_success, test_logout_revokes_refresh_token
- [x] T083 [P] Add tests for protected routes: test_protected_route_requires_auth, test_protected_route_with_valid_token
- [x] T084 Add data isolation test: create two users, verify user A cannot access user B's tasks

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [ ] T085 Run backend linting and fix any issues (ruff, black)
- [ ] T086 Run frontend linting and fix any issues (eslint, prettier)
- [x] T087 Verify all endpoints match contracts/api.md specification
- [ ] T088 Test complete flow: register → login → create task → refresh token → logout → verify session ended
- [x] T089 Update backend/README.md with auth endpoint documentation
- [ ] T090 Verify frontend works on Vercel deployment (HTTPS, cookie settings)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
    ├── Phase 3: US1 Registration ──→ MVP deliverable
    ├── Phase 4: US2 Login (depends on US1 for users to exist)
    ├── Phase 5: US3 Token Refresh (depends on US2 for tokens)
    ├── Phase 6: US4 Logout (depends on US2 for tokens)
    └── Phase 7: US5 Data Ownership (depends on US2 for auth)
    ↓
Phase 8: Testing (can start after any user story)
    ↓
Phase 9: Polish
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 Registration | Foundational | Phase 2 complete |
| US2 Login | US1 (users must exist) | US1 complete |
| US3 Token Refresh | US2 (tokens must exist) | US2 complete |
| US4 Logout | US2 (tokens must exist) | US2 complete |
| US5 Data Ownership | US2 (auth must work) | US2 complete |

### Within Each User Story

- Backend API before Frontend UI
- Models → Services → Endpoints → Integration
- Core implementation before error handling

### Parallel Opportunities

**Phase 1** (all parallel):
- T002, T003, T004 can run together

**Phase 2** (models parallel, then services sequential):
- T005, T006, T008, T009 can run together
- T010-T016 sequential (auth service functions build on each other)

**Phase 3-7** (within each story):
- Frontend tasks marked [P] can run parallel to backend completion
- MCP tool updates (T066-T070) can all run in parallel

**Phase 8** (all parallel):
- All test files can be written in parallel

---

## Parallel Example: Phase 2 Models

```bash
# Launch all model tasks together:
Task: "Create User model in backend/src/models/user.py"
Task: "Create RefreshToken model in backend/src/models/user.py"
Task: "Update Task model in backend/src/models/task.py"
Task: "Update Conversation model in backend/src/models/conversation.py"
```

## Parallel Example: US5 MCP Tools

```bash
# Launch all MCP tool updates together:
Task: "Update add_task.py to use owner_id"
Task: "Update list_tasks.py to filter by owner_id"
Task: "Update complete_task.py to verify owner_id"
Task: "Update update_task.py to verify owner_id"
Task: "Update delete_task.py to verify owner_id"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 Registration
4. Complete Phase 4: US2 Login
5. **STOP and VALIDATE**: Users can register and login
6. Deploy/demo as MVP

### Full Feature Delivery

1. Setup + Foundational → Foundation ready
2. US1 Registration → Users can create accounts
3. US2 Login → Users can authenticate
4. US3 Token Refresh → Sessions persist
5. US4 Logout → Users can end sessions
6. US5 Data Ownership → Multi-user data isolation
7. Testing + Polish → Production ready

---

## Summary

| Phase | Tasks | User Story | Priority |
|-------|-------|------------|----------|
| Setup | T001-T004 (4) | - | - |
| Foundational | T005-T021 (17) | - | - |
| US1 Registration | T022-T033 (12) | US1 | P1 |
| US2 Login | T034-T048 (15) | US2 | P1 |
| US3 Token Refresh | T049-T056 (8) | US3 | P2 |
| US4 Logout | T057-T062 (6) | US4 | P2 |
| US5 Data Ownership | T063-T075 (13) | US5 | P1 |
| Testing | T076-T084 (9) | - | - |
| Polish | T085-T090 (6) | - | - |
| **Total** | **90 tasks** | **5 stories** | - |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable once complete
- Commit after each task or logical group
- Stop at any checkpoint to validate progress
- MVP scope: US1 + US2 (registration and login)

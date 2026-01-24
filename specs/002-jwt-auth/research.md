# Research: JWT Authentication System

**Feature**: 002-jwt-auth
**Date**: 2026-01-20
**Status**: Complete

## Executive Summary

This document captures research findings for implementing JWT authentication in the AI-Powered Todo Chatbot. All unknowns from the Technical Context have been resolved through codebase analysis and best practices research.

---

## Research Findings

### 1. Existing Codebase Architecture

**Decision**: Extend existing architecture without restructuring

**Findings**:
- Backend uses FastAPI with async SQLModel ORM
- Database is PostgreSQL (Neon) via asyncpg
- Frontend is Next.js 14 with TypeScript
- Current user identification uses simple string `user_id` stored in localStorage
- No existing authentication - this is a greenfield addition

**Rationale**: The existing architecture is well-suited for authentication. SQLModel can easily accommodate new User and RefreshToken models. FastAPI's dependency injection is ideal for auth middleware.

**Alternatives Considered**:
- Full auth service microservice: Rejected - overengineering for this scope
- Third-party auth (Auth0, Clerk): Rejected - user specified custom JWT implementation

---

### 2. Existing Database Models

**Decision**: Add User and RefreshToken models alongside existing Task, Conversation, Message models

**Findings**:
Current models in `backend/src/models/`:
- `Task`: UUID id, string user_id, title, is_completed, timestamps
- `Conversation`: UUID id, string user_id, timestamps
- `Message`: UUID id, conversation_id FK, role enum, content, tool_calls JSON, timestamp

**Key Observation**: Existing models use `user_id: str` with no foreign key constraint. This allows migration flexibility.

**Migration Strategy**:
1. Create `users` table with UUID primary key
2. Create `refresh_tokens` table linked to users
3. Keep existing `user_id` fields as strings initially
4. Phase 2 (future): Migrate string user_ids to UUID foreign keys

**Rationale**: Minimizes disruption to existing data while enabling authentication.

---

### 3. Password Hashing Algorithm

**Decision**: Use bcrypt via `passlib[bcrypt]`

**Rationale**:
- bcrypt is battle-tested, widely adopted, and recommended by OWASP
- passlib provides a clean CryptContext API
- Automatic salt generation and configurable work factor
- Better ecosystem support than argon2 in Python

**Alternatives Considered**:
- argon2: Slightly better security properties but less ecosystem support in Python
- scrypt: Good but bcrypt is more widely adopted

**Implementation**:
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

---

### 4. JWT Library Selection

**Decision**: Use `python-jose[cryptography]` for JWT operations

**Rationale**:
- Mature library with strong cryptographic backing
- Supports HS256 (symmetric) and RS256 (asymmetric) algorithms
- Well-integrated with FastAPI ecosystem
- Handles claims validation (exp, iat, sub) automatically

**Alternatives Considered**:
- PyJWT: Simpler but less feature-rich
- authlib: More features than needed, heavier dependency

**Implementation**:
```python
from jose import jwt, JWTError
```

---

### 5. Token Configuration

**Decision**: Access token 15 minutes, Refresh token 7 days

**Access Token**:
- Expiry: 15 minutes (900 seconds)
- Algorithm: HS256 (symmetric, single secret)
- Claims: `sub` (user_id UUID as string), `email`, `exp`, `iat`, `type: "access"`
- Storage: Not persisted (stateless)

**Refresh Token**:
- Expiry: 7 days (604800 seconds)
- Format: Secure random UUID stored in database
- Claims in JWT: `sub` (user_id), `jti` (refresh token ID), `exp`, `iat`, `type: "refresh"`
- Storage: Database with revocation flag

**Rationale**:
- 15 min access token balances security (limited attack window) with UX (not too frequent refreshes)
- 7 day refresh token allows weekly active users to stay logged in
- Separate token types prevent misuse

---

### 6. Token Storage in Frontend

**Decision**: Store tokens in memory + HTTP-only cookies for refresh token

**Strategy**:
- Access token: Stored in memory (React state) - cleared on tab close
- Refresh token: HTTP-only, Secure, SameSite=Strict cookie
- On page load: Use refresh token to get new access token

**Rationale**:
- HTTP-only cookies prevent XSS theft of refresh tokens
- Memory storage for access tokens prevents localStorage XSS attacks
- Silent refresh on page load maintains UX

**Alternatives Considered**:
- localStorage: Vulnerable to XSS attacks
- sessionStorage: Better but still XSS vulnerable
- Both tokens as cookies: Access token in cookie adds unnecessary overhead per request

---

### 7. Rate Limiting Strategy

**Decision**: Use in-memory rate limiting with IP-based tracking

**Configuration**:
- Login endpoint: 5 attempts per 15 minutes per IP
- Registration endpoint: 3 attempts per hour per IP
- Refresh endpoint: 30 attempts per minute per IP

**Implementation**: Use `slowapi` library which provides Redis-optional rate limiting for FastAPI

**Rationale**:
- Prevents brute force without external dependencies
- Per-IP tracking stops distributed attacks
- Generous limits prevent blocking legitimate users with typos

**Alternatives Considered**:
- Redis-backed rate limiting: Overkill for single-instance deployment
- No rate limiting: Security risk

---

### 8. API Endpoint Design

**Decision**: Group under `/api/auth/` prefix

**Endpoints**:
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/register` | Create new user account | No |
| POST | `/api/auth/login` | Authenticate and get tokens | No |
| POST | `/api/auth/refresh` | Get new access token | Refresh token |
| POST | `/api/auth/logout` | Revoke refresh token | Access token |
| GET | `/api/auth/me` | Get current user info | Access token |

**Rationale**:
- Consistent `/api/auth/` prefix groups auth endpoints
- RESTful conventions where applicable
- POST for all state-changing operations

---

### 9. FastAPI Dependency for Auth

**Decision**: Create reusable `get_current_user` dependency

**Implementation Pattern**:
```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session)
) -> User:
    # Decode JWT, validate, return user
```

**Usage**:
```python
@router.get("/protected")
async def protected_route(user: User = Depends(get_current_user)):
    return {"user_id": user.id}
```

**Rationale**: FastAPI's dependency injection provides clean, reusable auth checking that integrates with OpenAPI docs.

---

### 10. Error Response Format

**Decision**: Consistent error response structure

**Format**:
```json
{
  "detail": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

**Error Codes**:
- `INVALID_CREDENTIALS`: Login failed (generic - no email enumeration)
- `EMAIL_EXISTS`: Registration with existing email
- `INVALID_TOKEN`: JWT validation failed
- `TOKEN_EXPIRED`: JWT expired
- `TOKEN_REVOKED`: Refresh token was revoked
- `RATE_LIMITED`: Too many requests
- `VALIDATION_ERROR`: Input validation failed

**Rationale**:
- Consistent structure for frontend error handling
- Codes enable programmatic error handling
- Messages provide user-friendly feedback

---

### 11. Data Ownership Migration

**Decision**: Add `user_id` FK to existing models without breaking changes

**Migration Strategy**:
1. Add optional `owner_id: UUID | None` to Task and Conversation models
2. Create migration to populate `owner_id` from string `user_id` (for existing data: create placeholder users)
3. Add auth middleware that filters queries by `owner_id`
4. Deprecate old string `user_id` field (keep for backward compatibility)

**Rationale**: Gradual migration prevents data loss and allows backward-compatible API.

---

### 12. Security Considerations

**Implemented**:
- bcrypt password hashing with auto-salt
- JWT with short expiry (15 min)
- Refresh token rotation on each use
- HTTP-only cookies for refresh tokens
- Rate limiting on auth endpoints
- Generic error messages (no email enumeration)
- HTTPS enforcement in production

**Not Implemented (Out of Scope)**:
- CSRF protection (not needed - token-based auth)
- Session fixation protection (stateless tokens)
- Password complexity beyond 8 chars (user requirement)

---

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Password Hashing | bcrypt (passlib) | Industry standard, good Python support |
| JWT Library | python-jose | Mature, FastAPI ecosystem |
| Access Token Expiry | 15 minutes | Security/UX balance |
| Refresh Token Expiry | 7 days | Weekly active user retention |
| Frontend Token Storage | Memory + HTTP-only cookie | XSS protection |
| Rate Limiting | slowapi | FastAPI-native, no Redis needed |
| User Model ID | UUID | Consistency with existing models |

---

## Dependencies to Add

**Backend** (`requirements.txt`):
```
passlib[bcrypt]>=1.7.4
python-jose[cryptography]>=3.3.0
slowapi>=0.1.9
```

**No frontend dependencies needed** - standard fetch API with credentials handling.

---

## Resolved Unknowns

| Original Unknown | Resolution |
|------------------|------------|
| Password hashing algorithm | bcrypt via passlib |
| JWT library | python-jose |
| Token expiry times | 15 min access, 7 days refresh |
| Frontend token storage | Memory + HTTP-only cookie |
| Rate limiting approach | slowapi in-memory |
| Data migration strategy | Gradual FK addition |

All NEEDS CLARIFICATION items from Technical Context have been resolved.

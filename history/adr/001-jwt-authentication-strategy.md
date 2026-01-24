# ADR-001: JWT Authentication Strategy

> **Scope**: This ADR documents the complete authentication architecture including token management, security libraries, storage strategy, and rate limiting approach.

- **Status:** Accepted
- **Date:** 2026-01-20
- **Feature:** 002-jwt-auth
- **Context:** The AI-Powered Todo Chatbot requires user authentication to support multi-user data isolation. Users must be able to register, login, and maintain sessions securely. The system is already deployed with FastAPI backend and Next.js frontend, requiring a solution that integrates with existing architecture without breaking changes.

## Decision

Implement stateless JWT authentication with the following integrated components:

### Token Architecture
- **Access Token**: Stateless JWT with 15-minute expiry
  - Claims: `sub` (user_id UUID), `email`, `exp`, `iat`, `type: "access"`
  - Algorithm: HS256 (symmetric signing)
  - Storage: Not persisted (validated via signature)

- **Refresh Token**: Database-stored with 7-day expiry
  - Claims: `sub` (user_id), `jti` (token ID), `exp`, `iat`, `type: "refresh"`
  - Storage: PostgreSQL with hash, revocation flag, rotation chain
  - Rotation: New token issued on each refresh, old token invalidated

### Security Libraries
- **Password Hashing**: bcrypt via `passlib[bcrypt]`
- **JWT Operations**: `python-jose[cryptography]`
- **Rate Limiting**: `slowapi` (in-memory, no Redis required)

### Frontend Token Storage
- **Access Token**: Memory (React state) - cleared on tab close
- **Refresh Token**: HTTP-only, Secure, SameSite=Strict cookie
- **Silent Refresh**: On page load, attempt token refresh from cookie

### Rate Limiting Configuration
- Login: 5 attempts per 15 minutes per IP
- Registration: 3 attempts per hour per IP
- Refresh: 30 attempts per minute per IP

## Consequences

### Positive

- **Stateless Verification**: Access tokens validate without database lookup, enabling horizontal scaling
- **XSS Protection**: HTTP-only cookies prevent JavaScript access to refresh tokens; memory storage prevents localStorage XSS
- **Industry Standards**: bcrypt and JWT are battle-tested, OWASP-recommended approaches
- **Session Continuity**: 7-day refresh tokens allow weekly active users to stay logged in
- **Minimal Dependencies**: No external auth services (Auth0), no Redis requirement
- **FastAPI Integration**: Dependency injection pattern integrates cleanly with existing routes
- **Gradual Migration**: Optional `owner_id` field allows backward-compatible data migration

### Negative

- **Token Rotation Complexity**: Database storage for refresh tokens adds write overhead
- **Memory Token Loss**: Access token in memory is lost on page refresh (requires silent refresh)
- **Single Secret**: HS256 requires secure secret management; rotation requires coordination
- **No Multi-Device Management**: Cannot revoke specific device sessions (out of scope)
- **Cookie Path Restriction**: Refresh cookie limited to `/api/auth` path

## Alternatives Considered

### Alternative A: Third-Party Auth (Auth0 / Clerk)
- **Pros**: Battle-tested, feature-rich (MFA, social login), no maintenance
- **Cons**: Vendor lock-in, cost at scale, latency for auth checks
- **Rejected Because**: User explicitly requested custom JWT implementation; overkill for current scope

### Alternative B: Session-Based Auth (Server-Side Sessions)
- **Pros**: Simpler token management, instant revocation
- **Cons**: Requires session store (Redis), horizontal scaling complexity, violates stateless principle
- **Rejected Because**: Constitution mandates stateless architecture (Principle II)

### Alternative C: localStorage for All Tokens
- **Pros**: Simpler implementation, persists across page refreshes
- **Cons**: XSS vulnerable - any injected script can steal tokens
- **Rejected Because**: Security risk outweighs convenience; OWASP discourages for sensitive tokens

### Alternative D: Argon2 Password Hashing
- **Pros**: Winner of Password Hashing Competition, better security properties
- **Cons**: Less Python ecosystem support, newer with fewer production examples
- **Rejected Because**: bcrypt is sufficient and has better library maturity in Python

### Alternative E: RS256 (Asymmetric JWT Signing)
- **Pros**: Public key verification, better for microservices
- **Cons**: Key management complexity, unnecessary for single-service architecture
- **Rejected Because**: Single backend doesn't benefit from asymmetric signing

## References

- Feature Spec: [specs/002-jwt-auth/spec.md](../../specs/002-jwt-auth/spec.md)
- Implementation Plan: [specs/002-jwt-auth/plan.md](../../specs/002-jwt-auth/plan.md)
- Research Document: [specs/002-jwt-auth/research.md](../../specs/002-jwt-auth/research.md)
- Related ADRs: None (first ADR)
- Evaluator Evidence: [history/prompts/002-jwt-auth/002-create-jwt-auth-plan.plan.prompt.md](../prompts/002-jwt-auth/002-create-jwt-auth-plan.plan.prompt.md)

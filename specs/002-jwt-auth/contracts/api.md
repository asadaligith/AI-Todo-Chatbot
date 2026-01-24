# API Contract: JWT Authentication System

**Feature**: 002-jwt-auth
**Date**: 2026-01-20
**Version**: 1.0.0

---

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.yourdomain.com`

---

## Authentication

### Token Types

| Type | Header Format | Expiry | Storage |
|------|---------------|--------|---------|
| Access Token | `Authorization: Bearer <token>` | 15 minutes | Memory (client) |
| Refresh Token | HTTP-only cookie `refresh_token` | 7 days | HTTP-only cookie |

### JWT Access Token Claims

```json
{
  "sub": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "type": "access",
  "iat": 1706745600,
  "exp": 1706746500
}
```

---

## Endpoints

### POST /api/auth/register

Create a new user account.

**Request**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Request Body Schema**:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email format, max 255 chars |
| `password` | string | Yes | Min 8 chars, max 128 chars |

**Success Response** (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "created_at": "2026-01-20T10:00:00Z"
}
```

**Error Responses**:

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | `EMAIL_EXISTS` | "Email is already registered" | Email already in use |
| 422 | `VALIDATION_ERROR` | "Invalid email format" | Email validation fails |
| 422 | `VALIDATION_ERROR` | "Password must be at least 8 characters" | Password too short |
| 429 | `RATE_LIMITED` | "Too many registration attempts. Try again in X minutes" | Rate limit exceeded |

---

### POST /api/auth/login

Authenticate user and receive tokens.

**Request**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Request Body Schema**:
| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com"
  }
}
```

**Response Headers**:
```http
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

**Error Responses**:

| Status | Code | Message | When |
|--------|------|---------|------|
| 401 | `INVALID_CREDENTIALS` | "Email or password is incorrect" | Wrong email or password |
| 429 | `RATE_LIMITED` | "Too many login attempts. Try again in X minutes" | Rate limit exceeded |

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request**:
```http
POST /api/auth/refresh
Cookie: refresh_token=<token>
```

No request body required. Refresh token is read from HTTP-only cookie.

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Response Headers** (Token Rotation):
```http
Set-Cookie: refresh_token=<new_token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

**Error Responses**:

| Status | Code | Message | When |
|--------|------|---------|------|
| 401 | `TOKEN_EXPIRED` | "Refresh token has expired. Please log in again" | Token past expiry |
| 401 | `TOKEN_REVOKED` | "Refresh token has been revoked. Please log in again" | Token was revoked |
| 401 | `INVALID_TOKEN` | "Invalid refresh token" | Token malformed or not found |

---

### POST /api/auth/logout

Revoke refresh token and clear cookie.

**Request**:
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Cookie: refresh_token=<token>
```

**Success Response** (200 OK):
```json
{
  "message": "Successfully logged out"
}
```

**Response Headers**:
```http
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0
```

**Error Responses**:

| Status | Code | Message | When |
|--------|------|---------|------|
| 401 | `INVALID_TOKEN` | "Invalid or expired access token" | Bad access token |

---

### GET /api/auth/me

Get current authenticated user information.

**Request**:
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Success Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "created_at": "2026-01-20T10:00:00Z"
}
```

**Error Responses**:

| Status | Code | Message | When |
|--------|------|---------|------|
| 401 | `INVALID_TOKEN` | "Invalid or expired access token" | Bad access token |
| 401 | `TOKEN_EXPIRED` | "Access token has expired" | Token past expiry |

---

## Modified Endpoints

### POST /api/{user_id}/chat → POST /api/chat

**Change**: Remove `user_id` from path, extract from token.

**Request**:
```http
POST /api/chat
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "message": "Add a task to buy groceries",
  "conversation_id": "optional-uuid"
}
```

**Note**: The `user_id` is now extracted from the JWT `sub` claim.

---

### GET /api/{user_id}/tasks → GET /api/tasks

**Change**: Remove `user_id` from path, extract from token.

**Request**:
```http
GET /api/tasks
Authorization: Bearer <access_token>
```

**Note**: Returns only tasks owned by the authenticated user.

---

## Error Response Format

All error responses follow this structure:

```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `EMAIL_EXISTS` | 400 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_TOKEN` | 401 | Token is malformed or invalid |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `TOKEN_REVOKED` | 401 | Token has been revoked |
| `RATE_LIMITED` | 429 | Too many requests |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access to resource denied |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/register` | 3 requests | 1 hour |
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/refresh` | 30 requests | 1 minute |
| Other endpoints | 100 requests | 1 minute |

**Rate Limit Response**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706746500

{
  "detail": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again in 60 seconds"
  }
}
```

---

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Todo Chatbot Auth API
  version: 1.0.0
  description: JWT Authentication API for AI-Powered Todo Chatbot

servers:
  - url: http://localhost:8000
    description: Development
  - url: https://api.yourdomain.com
    description: Production

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    UserCreate:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          maxLength: 255
        password:
          type: string
          minLength: 8
          maxLength: 128

    UserResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        created_at:
          type: string
          format: date-time

    LoginRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
        password:
          type: string

    TokenResponse:
      type: object
      properties:
        access_token:
          type: string
        token_type:
          type: string
          enum: [bearer]
        expires_in:
          type: integer
        user:
          $ref: '#/components/schemas/UserResponse'

    ErrorResponse:
      type: object
      properties:
        detail:
          type: object
          properties:
            code:
              type: string
            message:
              type: string

paths:
  /api/auth/register:
    post:
      tags: [Authentication]
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          description: Email already exists
        '422':
          description: Validation error

  /api/auth/login:
    post:
      tags: [Authentication]
      summary: Login user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenResponse'
          headers:
            Set-Cookie:
              schema:
                type: string
        '401':
          description: Invalid credentials

  /api/auth/refresh:
    post:
      tags: [Authentication]
      summary: Refresh access token
      responses:
        '200':
          description: Token refreshed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenResponse'
        '401':
          description: Invalid or expired refresh token

  /api/auth/logout:
    post:
      tags: [Authentication]
      summary: Logout user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Logged out successfully
        '401':
          description: Unauthorized

  /api/auth/me:
    get:
      tags: [Authentication]
      summary: Get current user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Current user info
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '401':
          description: Unauthorized
```

---

## Frontend Integration Notes

### Token Refresh Strategy

```typescript
// Pseudocode for automatic token refresh
async function fetchWithAuth(url: string, options: RequestInit) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include' // Include cookies
    });

    if (refreshResponse.ok) {
      const { access_token } = await refreshResponse.json();
      accessToken = access_token;

      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}
```

### Cookie Configuration

The refresh token cookie will be set with:
- `HttpOnly`: Cannot be accessed by JavaScript
- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: Only sent to same site
- `Path=/api/auth`: Only sent to auth endpoints
- `Max-Age=604800`: 7 days expiry

# Quickstart Guide: JWT Authentication Implementation

**Feature**: 002-jwt-auth
**Date**: 2026-01-20

---

## Overview

This guide provides step-by-step instructions for implementing JWT authentication in the AI-Powered Todo Chatbot.

---

## Prerequisites

Before starting implementation, ensure you have:

1. **Backend running**: FastAPI development server
2. **Database accessible**: PostgreSQL (Neon) connection working
3. **Python environment**: Python 3.11+ with pip
4. **Frontend running**: Next.js development server

---

## Step 1: Install Backend Dependencies

Add the following to `backend/requirements.txt`:

```txt
passlib[bcrypt]>=1.7.4
python-jose[cryptography]>=3.3.0
slowapi>=0.1.9
```

Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

---

## Step 2: Add Environment Variables

Add to `backend/.env`:

```env
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Important**: Generate a secure secret key for production:
```python
import secrets
print(secrets.token_urlsafe(32))
```

---

## Step 3: Create Database Models

Create new file `backend/src/models/user.py`:

```python
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(max_length=255, index=True, unique=True, nullable=False)
    password_hash: str = Field(max_length=255, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True, nullable=False)
    token_hash: str = Field(max_length=255, nullable=False)
    expires_at: datetime = Field(nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    revoked_at: Optional[datetime] = Field(default=None, nullable=True)
    replaced_by: Optional[UUID] = Field(
        default=None, foreign_key="refresh_tokens.id", nullable=True
    )
```

---

## Step 4: Create Auth Service

Create new file `backend/src/services/auth.py`:

```python
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.models.user import RefreshToken, User
from src.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user: User) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "iat": datetime.utcnow(),
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def create_refresh_token(db: AsyncSession, user: User) -> tuple[str, RefreshToken]:
    token_id = uuid4()
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    # Create JWT for refresh token
    to_encode = {
        "sub": str(user.id),
        "jti": str(token_id),
        "type": "refresh",
        "iat": datetime.utcnow(),
        "exp": expires_at,
    }
    token = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    # Store in database
    refresh_token = RefreshToken(
        id=token_id,
        user_id=user.id,
        token_hash=pwd_context.hash(token),
        expires_at=expires_at,
    )
    db.add(refresh_token)
    await db.commit()

    return token, refresh_token
```

---

## Step 5: Create Auth Dependencies

Create new file `backend/src/api/deps.py`:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db import get_session
from src.models.user import User
from src.core.config import settings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "INVALID_TOKEN", "message": "Invalid or expired access token"},
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user
```

---

## Step 6: Create Auth Router

Create new file `backend/src/api/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.api.deps import get_current_user
from src.db import get_session
from src.models.user import User
from src.services.auth import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    email: str,
    password: str,
    db: AsyncSession = Depends(get_session),
):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_EXISTS", "message": "Email is already registered"},
        )

    # Create user
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"id": user.id, "email": user.email, "created_at": user.created_at}


@router.post("/login")
async def login(
    response: Response,
    email: str,
    password: str,
    db: AsyncSession = Depends(get_session),
):
    # Find user
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect"},
        )

    # Generate tokens
    access_token = create_access_token(user)
    refresh_token, _ = await create_refresh_token(db, user)

    # Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/api/auth",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 900,
        "user": {"id": user.id, "email": user.email},
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }
```

---

## Step 7: Register Router in Main App

Update `backend/src/main.py`:

```python
from src.api.auth import router as auth_router

# In create_app() function, add:
app.include_router(auth_router)
```

---

## Step 8: Run Database Migrations

The SQLModel tables will be created automatically on startup. For production, use Alembic migrations.

---

## Step 9: Test the Implementation

### Register a user:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Get current user:
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## Step 10: Update Frontend

### Add auth context provider

Create `frontend/src/lib/auth.tsx`:

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize: try to refresh token on mount
  useEffect(() => {
    refreshToken();
  }, []);

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.access_token);
        // Fetch user info
        await fetchUser(data.access_token);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  };

  const fetchUser = async (token: string) => {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || 'Login failed');
    }
    const data = await response.json();
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    setUser(null);
    setAccessToken(null);
  };

  const register = async (email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || 'Registration failed');
    }
    // Auto-login after registration
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Verification Checklist

- [ ] User can register with email/password
- [ ] User can login and receive tokens
- [ ] Access token is included in API requests
- [ ] Token refresh works automatically
- [ ] User can logout
- [ ] Protected routes require authentication
- [ ] Rate limiting is active on auth endpoints
- [ ] Error messages are user-friendly

---

## Next Steps

After basic auth is working:

1. Run `/sp.tasks` to generate detailed implementation tasks
2. Add login/register UI components
3. Protect existing routes with auth middleware
4. Update MCP tools to use authenticated user ID
5. Migrate existing data to use owner_id

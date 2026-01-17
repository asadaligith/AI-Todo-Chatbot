# Implementation Plan: AI-Powered Todo Chatbot

**Branch**: `001-mcp-todo-chatbot` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-mcp-todo-chatbot/spec.md`

## Summary

Build a stateless AI chatbot that manages user todos through natural language using MCP tools. The system uses FastAPI for the chat endpoint, OpenAI Agents SDK for AI reasoning, MCP server for task operations, and Neon PostgreSQL for persistence. All task CRUD operations are exposed exclusively through MCP tools, ensuring the AI agent interacts with data only via the defined tool interface.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI, OpenAI Agents SDK, MCP SDK (official), SQLModel, Pydantic
**Storage**: Neon PostgreSQL (cloud-hosted, serverless)
**Testing**: pytest with pytest-asyncio for async tests
**Target Platform**: Linux server / Docker container
**Project Type**: Single project (API server with integrated MCP server)
**Performance Goals**: <5s response time for task operations, 100 concurrent users
**Constraints**: Stateless architecture, no in-memory state, all persistence via database
**Scale/Scope**: MVP for hackathon demonstration, single-region deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Spec-Driven Development | ✅ PASS | Spec complete at `spec.md`, plan in progress |
| II. Stateless Architecture | ✅ PASS | FR-008 requires stateless; all state to Neon PostgreSQL |
| III. AI-First via OpenAI Agents SDK | ✅ PASS | Agent uses OpenAI Agents SDK exclusively |
| IV. MCP Tool Exclusivity | ✅ PASS | FR-009 requires all task ops via MCP tools only |
| V. Natural Language Interface | ✅ PASS | FR-001, FR-010 require conversational I/O |
| VI. Graceful Error Handling | ✅ PASS | FR-011 requires user-friendly error messages |

**Gate Result**: ✅ ALL PRINCIPLES SATISFIED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-todo-chatbot/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contract definitions
└── tasks.md             # Phase 2 output (/sp.tasks command)
```

### Source Code (repository root)

```text
src/
├── models/              # SQLModel database models
│   ├── __init__.py
│   ├── task.py          # Task entity
│   ├── conversation.py  # Conversation entity
│   └── message.py       # Message entity
├── mcp/                 # MCP server implementation
│   ├── __init__.py
│   ├── server.py        # MCP server setup
│   └── tools/           # MCP tool definitions
│       ├── __init__.py
│       ├── add_task.py
│       ├── list_tasks.py
│       ├── complete_task.py
│       ├── update_task.py
│       └── delete_task.py
├── agent/               # OpenAI Agent configuration
│   ├── __init__.py
│   └── todo_agent.py    # Agent with MCP tool bindings
├── api/                 # FastAPI endpoints
│   ├── __init__.py
│   └── chat.py          # POST /api/{user_id}/chat
├── db/                  # Database utilities
│   ├── __init__.py
│   └── session.py       # SQLModel session management
└── main.py              # FastAPI application entry point

tests/
├── contract/            # Contract tests for MCP tools
│   └── test_mcp_tools.py
├── integration/         # Integration tests
│   └── test_chat_flow.py
└── unit/                # Unit tests
    ├── test_models.py
    └── test_agent.py
```

**Structure Decision**: Single project structure selected. The system is a unified API server where the MCP server runs in-process with FastAPI. This simplifies deployment and reduces operational complexity for hackathon MVP.

## Complexity Tracking

> No violations detected. Architecture follows constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────────────────────┐
│  ChatKit UI     │     │              FastAPI Server                       │
│  (Frontend)     │────▶│  ┌─────────────────────────────────────────────┐  │
└─────────────────┘     │  │  POST /api/{user_id}/chat                   │  │
                        │  │  1. Load conversation history from DB        │  │
                        │  │  2. Save user message to DB                  │  │
                        │  │  3. Invoke OpenAI Agent with history         │  │
                        │  │  4. Agent calls MCP tools as needed          │  │
                        │  │  5. Save assistant response to DB            │  │
                        │  │  6. Return response to client                │  │
                        │  └─────────────────────────────────────────────┘  │
                        │                      │                            │
                        │                      ▼                            │
                        │  ┌─────────────────────────────────────────────┐  │
                        │  │           OpenAI Agents SDK                  │  │
                        │  │  - Natural language understanding            │  │
                        │  │  - Intent detection (create/list/etc.)       │  │
                        │  │  - Tool selection and invocation             │  │
                        │  │  - Response generation                       │  │
                        │  └─────────────────────────────────────────────┘  │
                        │                      │                            │
                        │                      ▼                            │
                        │  ┌─────────────────────────────────────────────┐  │
                        │  │              MCP Server                      │  │
                        │  │  Tools: add_task, list_tasks, complete_task, │  │
                        │  │         update_task, delete_task            │  │
                        │  └─────────────────────────────────────────────┘  │
                        │                      │                            │
                        └──────────────────────│────────────────────────────┘
                                               │
                                               ▼
                        ┌─────────────────────────────────────────────────┐
                        │              Neon PostgreSQL                     │
                        │  Tables: tasks, conversations, messages          │
                        └─────────────────────────────────────────────────┘
```

## Request Flow

1. **User sends message** via ChatKit UI to `POST /api/{user_id}/chat`
2. **FastAPI endpoint**:
   - Retrieves or creates conversation from database
   - Loads conversation history (previous messages)
   - Saves incoming user message to database
3. **OpenAI Agent** receives message + conversation history:
   - Interprets user intent
   - Selects appropriate MCP tool(s)
   - Executes tool calls
4. **MCP Tools** execute against database:
   - Each tool is stateless
   - Database operations via SQLModel
   - Returns structured result to agent
5. **Agent generates response** in conversational language
6. **FastAPI endpoint**:
   - Saves assistant response + tool calls to database
   - Returns response to client

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MCP Server Location | In-process with FastAPI | Simplifies deployment, reduces latency |
| Agent-MCP Integration | Direct tool binding | OpenAI Agents SDK supports function calling |
| User Identification | URL path parameter | Simple, stateless, per-request |
| Conversation Storage | Full history retrieval | MVP simplicity, pagination later if needed |
| Task Matching | Fuzzy title matching | Better UX for natural language references |

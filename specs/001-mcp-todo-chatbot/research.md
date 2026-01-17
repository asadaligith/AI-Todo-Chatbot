# Research: AI-Powered Todo Chatbot

**Branch**: `001-mcp-todo-chatbot` | **Date**: 2026-01-17

## Technology Decisions

### 1. MCP SDK Implementation

**Decision**: Use official MCP Python SDK v1.x (`mcp` package from PyPI)

**Rationale**:
- Official SDK maintained at [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)
- Stable v1.x recommended for production (v2 anticipated Q1 2026)
- FastMCP server provides core interface to MCP protocol
- Built-in support for Tools, Resources, and Prompts
- ~21,000+ GitHub stars indicates strong community adoption

**Alternatives Considered**:
- Custom MCP implementation: Rejected - unnecessary complexity, official SDK is well-maintained
- Wait for v2: Rejected - v1.x is production-ready and will receive updates for 6+ months post-v2

**Version Pinning**: `mcp>=1.25,<2` (as recommended by maintainers)

**Key Integration Points**:
- MCP servers expose functionality through Tools
- Each tool is a stateless function that can be called by the agent
- Tools are registered with the FastMCP server

---

### 2. OpenAI Agents SDK Integration

**Decision**: Use OpenAI Agents SDK with `@function_tool` decorator for MCP tool binding

**Rationale**:
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) is production-ready upgrade of Swarm
- Built-in agent loop handles tool calling, result handling, and LLM looping
- Automatic schema generation from Python function signatures
- Pydantic-powered validation for tool parameters
- Supports Google, Sphinx, and NumPy docstring formats for tool descriptions

**Alternatives Considered**:
- LangChain: Rejected - heavier abstraction, more complexity than needed
- Raw OpenAI API: Rejected - would need to implement agent loop manually
- Swarm: Rejected - deprecated in favor of Agents SDK

**Tool Registration Pattern**:
```python
from agents import function_tool

@function_tool
def add_task(user_id: str, title: str) -> str:
    """Add a new task for the user.

    Args:
        user_id: The ID of the user
        title: The title of the task to create

    Returns:
        Confirmation message with task details
    """
    # Implementation calls MCP tool
```

**Tool Use Behavior**: Default "run_llm_again" - tools run and LLM receives results to formulate response

---

### 3. Database Connection (SQLModel + Neon PostgreSQL)

**Decision**: Use SQLModel with async support via asyncpg driver

**Rationale**:
- [SQLModel](https://sqlmodel.tiangolo.com/) combines SQLAlchemy + Pydantic
- Type-safe Python ORM as required by constitution
- [Neon PostgreSQL](https://neon.com/docs/guides/python) provides serverless PostgreSQL
- Async support enables non-blocking I/O for better concurrency

**Required Packages**:
- `sqlmodel` - ORM layer
- `asyncpg` - Async PostgreSQL driver
- `psycopg2-binary` - Sync driver (required by SQLModel for some operations)
- `greenlet` - SQLAlchemy async support dependency

**Connection String Format**:
```
postgresql+asyncpg://{USERNAME}:{PASSWORD}@{HOST}/{DATABASE}?ssl=require
```

**Session Management**:
- Use async session factory
- One session per request (stateless)
- Session closed after each request completes

---

### 4. FastAPI Integration

**Decision**: FastAPI with async endpoints for all operations

**Rationale**:
- Native async support aligns with asyncpg and OpenAI SDK
- Automatic OpenAPI documentation
- Pydantic integration for request/response validation
- Wide adoption and excellent performance

**Endpoint Design**:
```python
@app.post("/api/{user_id}/chat")
async def chat(user_id: str, request: ChatRequest) -> ChatResponse:
    # Stateless request handling
```

---

### 5. Agent-MCP Tool Binding Strategy

**Decision**: Direct function binding - MCP tools wrapped as OpenAI Agents SDK function tools

**Rationale**:
- OpenAI Agents SDK supports function calling natively
- MCP tools can be wrapped with `@function_tool` decorator
- Agent automatically selects appropriate tool based on user intent
- No additional middleware needed

**Integration Pattern**:
```
User Message → OpenAI Agent → Function Tool Selection → MCP Tool Execution → Database → Response
```

The OpenAI agent receives the user message and conversation history, determines intent, selects the appropriate MCP tool (add_task, list_tasks, etc.), executes it, and generates a conversational response.

---

### 6. Conversation History Management

**Decision**: Full history retrieval per request, stored in Message table

**Rationale**:
- MVP simplicity - no pagination complexity
- Typical conversations are short (< 100 messages)
- History passed to agent for context
- Supports multi-turn natural language interactions

**Message Storage**:
- Store user messages immediately on receipt
- Store assistant responses after agent completes
- Include tool_calls metadata in message record

---

### 7. Error Handling Strategy

**Decision**: Catch-all exception handler with friendly message translation

**Rationale**:
- Constitution requires no technical errors exposed to users
- All exceptions translated to conversational messages
- Logging captures full error details for debugging
- Recovery suggestions provided where possible

**Error Categories**:
| Error Type | User Message |
|------------|--------------|
| Database unreachable | "I'm having trouble accessing your tasks right now. Please try again in a moment." |
| Agent failure | "I'm having trouble understanding that right now. Could you try rephrasing?" |
| Task not found | "I couldn't find a task matching '[query]'. Here are your current tasks: [list]" |
| Invalid input | "I didn't catch that. Could you tell me what you'd like to do with your tasks?" |

---

## Dependency Summary

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | >=0.110 | Web framework |
| uvicorn | >=0.27 | ASGI server |
| openai-agents | >=0.1 | AI agent framework |
| mcp | >=1.25,<2 | MCP protocol SDK |
| sqlmodel | >=0.0.16 | ORM layer |
| asyncpg | >=0.29 | Async PostgreSQL driver |
| psycopg2-binary | >=2.9 | Sync PostgreSQL driver |
| pydantic | >=2.0 | Data validation |
| python-dotenv | >=1.0 | Environment config |

---

## Sources

- [MCP Python SDK - GitHub](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Python SDK - Documentation](https://modelcontextprotocol.github.io/python-sdk/)
- [OpenAI Agents SDK - Documentation](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents SDK - Tools](https://openai.github.io/openai-agents-python/tools/)
- [Neon PostgreSQL - Python Connection Guide](https://neon.com/docs/guides/python)
- [SQLModel - Documentation](https://sqlmodel.tiangolo.com/)
- [FastAPI with Async SQLModel](https://testdriven.io/blog/fastapi-sqlmodel/)

<!--
## Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: N/A (initial creation)
- Added sections:
  - Core Principles (6 principles)
  - Technology Stack
  - Development Workflow
  - Governance
- Removed sections: N/A (initial creation)
- Templates requiring updates:
  - `.specify/templates/plan-template.md` ✅ compatible (Constitution Check section aligns)
  - `.specify/templates/spec-template.md` ✅ compatible (Requirements section aligns)
  - `.specify/templates/tasks-template.md` ✅ compatible (Phase structure aligns)
- Follow-up TODOs: None
-->

# AI-Powered Todo Chatbot Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

All development MUST follow the Agentic Dev Stack strictly:

1. **Specification** → Define requirements and user stories first
2. **Planning** → Create architectural decisions and implementation plans
3. **Task Breakdown** → Generate actionable, dependency-ordered tasks
4. **Implementation** → Execute tasks only after spec and plan approval

Manual code writing is PROHIBITED unless explicitly instructed during the `/sp.implement` phase.

**Rationale**: Ensures deterministic, debuggable flows and maintains clear documentation suitable
for hackathon review. Prevents ad-hoc development that leads to inconsistent architecture.

### II. Stateless Architecture (NON-NEGOTIABLE)

The system MUST be stateless at the application layer:

- All state MUST persist in the database (Neon PostgreSQL via SQLModel)
- No in-memory state between requests
- Session data stored in database, not memory
- MCP tools MUST NOT maintain internal state between invocations

**Rationale**: Enables horizontal scaling, simplifies debugging, ensures data consistency across
restarts, and prevents state-related bugs in distributed environments.

### III. AI-First via OpenAI Agents SDK

All AI reasoning and natural language processing MUST happen through the OpenAI Agents SDK:

- No custom LLM integrations outside the SDK
- Agent definitions follow SDK patterns
- Tool calling uses SDK conventions
- Response handling follows SDK best practices

**Rationale**: Ensures consistent AI behavior, leverages battle-tested infrastructure, and maintains
a clean separation between AI reasoning and application logic.

### IV. MCP Tool Exclusivity

All task operations MUST be exposed ONLY through MCP (Model Context Protocol) tools:

- CRUD operations on todos: MCP tools only
- Task status changes: MCP tools only
- Task queries and filtering: MCP tools only
- No direct API endpoints for task operations outside MCP

MCP tools MUST be:
- Stateless (no internal state between calls)
- Idempotent where possible
- Data persistence via SQLModel + Neon PostgreSQL

**Rationale**: Provides a unified interface for AI agents to interact with the system, ensures
consistent tool behavior, and enables seamless integration with the OpenAI Agents SDK.

### V. Natural Language Interface

The chatbot MUST manage todos via natural language:

- User intent extraction from conversational input
- Conversational confirmation for every action
- Human-readable responses (no raw JSON to users)
- Graceful handling of ambiguous requests with clarification prompts

**Rationale**: Delivers an intuitive user experience where users interact naturally without
learning specific commands or syntax.

### VI. Graceful Error Handling

Error handling MUST be user-friendly and conversational:

- No stack traces or technical errors exposed to users
- All errors translated to friendly, actionable messages
- Every action MUST be confirmed in conversational language
- Recovery suggestions provided when possible

**Rationale**: Maintains trust and usability even when things go wrong, keeping the experience
consistent with the conversational interface.

## Technology Stack

### Required Technologies

| Layer | Technology | Constraint |
|-------|------------|------------|
| Database | Neon PostgreSQL | Cloud-hosted, serverless |
| ORM | SQLModel | Type-safe Python ORM |
| AI SDK | OpenAI Agents SDK | Primary AI interface |
| Protocol | MCP (Model Context Protocol) | Tool exposure standard |
| Language | Python 3.11+ | Type hints required |

### Prohibited Patterns

- In-memory state storage for persistence
- Direct database queries outside SQLModel
- Custom LLM clients outside OpenAI Agents SDK
- REST/GraphQL endpoints for task operations (MCP only)
- Hardcoded secrets or tokens (use `.env`)

## Development Workflow

### Quality Gates

1. **Specification Review**: All features MUST have approved spec before planning
2. **Plan Review**: Architecture decisions MUST be documented before task generation
3. **Task Review**: Task breakdown MUST be approved before implementation
4. **Implementation**: Code changes MUST reference approved tasks

### Code Quality Standards

- Type hints required for all function signatures
- Docstrings for public functions and classes
- No assumptions—ask for clarification if requirements unclear
- Smallest viable diff—no unrelated refactoring

### Testing Requirements

- Unit tests for business logic
- Integration tests for MCP tools
- Contract tests for AI agent interactions
- All tests MUST pass before merge

## Governance

### Amendment Procedure

1. Propose change with rationale in a PR
2. Document impact on existing specs/plans/tasks
3. Obtain approval from project maintainer
4. Update version following semantic versioning
5. Migrate affected artifacts if breaking change

### Versioning Policy

- **MAJOR**: Backward-incompatible principle changes or removals
- **MINOR**: New principles added or significant expansions
- **PATCH**: Clarifications, typo fixes, non-semantic refinements

### Compliance Review

- All PRs MUST verify compliance with constitution principles
- Complexity additions MUST be justified with rationale
- Constitution supersedes all other practices when in conflict

**Version**: 1.0.0 | **Ratified**: 2026-01-17 | **Last Amended**: 2026-01-17

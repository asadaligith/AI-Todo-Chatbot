# Tasks: AI-Powered Todo Chatbot

**Input**: Design documents from `/specs/001-mcp-todo-chatbot/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Tests are OPTIONAL for this feature (not explicitly requested in spec). Test tasks are not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure per plan.md in src/models/, src/mcp/, src/mcp/tools/, src/agent/, src/api/, src/db/
- [x] T002 Initialize Python project with pyproject.toml including FastAPI, SQLModel, openai-agents, mcp>=1.25<2, asyncpg, pydantic, python-dotenv, uvicorn
- [x] T003 [P] Create .env.example with DATABASE_URL and OPENAI_API_KEY placeholders
- [x] T004 [P] Create .gitignore for Python project (venv, __pycache__, .env, etc.)
- [x] T005 [P] Create requirements.txt from pyproject.toml dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create database session management with async SQLModel engine in src/db/__init__.py
- [x] T007 Create async session factory and get_session dependency in src/db/session.py
- [x] T008 [P] Create Task SQLModel in src/models/task.py with id, user_id, title, is_completed, created_at, updated_at fields per data-model.md
- [x] T009 [P] Create Conversation SQLModel in src/models/conversation.py with id, user_id, created_at, updated_at fields per data-model.md
- [x] T010 [P] Create Message SQLModel in src/models/message.py with id, conversation_id, role, content, tool_calls, created_at fields per data-model.md
- [x] T011 Create models package __init__.py exporting Task, Conversation, Message in src/models/__init__.py
- [x] T012 Create database initialization script to create all tables in src/db/init.py
- [x] T013 Create MCP server setup with FastMCP in src/mcp/server.py
- [x] T014 Create MCP tools package __init__.py in src/mcp/tools/__init__.py
- [x] T015 Create OpenAI Agent base configuration with system prompt in src/agent/__init__.py
- [x] T016 Create todo_agent with tool bindings placeholder in src/agent/todo_agent.py
- [x] T017 Create FastAPI application entry point with CORS middleware in src/main.py
- [x] T018 Create ChatRequest and ChatResponse Pydantic models in src/api/__init__.py per contracts/api.md
- [x] T019 Create global error handler for friendly error messages in src/main.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create a Task via Chat (Priority: P1) 🎯 MVP

**Goal**: Users can create tasks through natural language messages

**Independent Test**: Send "Add a task to buy groceries" and verify task is created with confirmation response

### Implementation for User Story 1

- [x] T020 [US1] Implement add_task MCP tool with user_id and title parameters in src/mcp/tools/add_task.py
- [x] T021 [US1] Register add_task tool with MCP server in src/mcp/server.py
- [x] T022 [US1] Bind add_task as function_tool to OpenAI agent in src/agent/todo_agent.py
- [x] T023 [US1] Create chat endpoint POST /api/{user_id}/chat in src/api/chat.py
- [x] T024 [US1] Implement conversation get-or-create logic in src/api/chat.py
- [x] T025 [US1] Implement save user message to database in src/api/chat.py
- [x] T026 [US1] Implement agent invocation with conversation history in src/api/chat.py
- [x] T027 [US1] Implement save assistant response and tool_calls to database in src/api/chat.py
- [x] T028 [US1] Return ChatResponse with conversation_id, response, tool_calls in src/api/chat.py
- [x] T029 [US1] Register chat router in FastAPI app in src/main.py

**Checkpoint**: User Story 1 complete - users can create tasks via chat

---

## Phase 4: User Story 2 - List Tasks via Chat (Priority: P1) 🎯 MVP

**Goal**: Users can view their tasks through natural language requests

**Independent Test**: Send "Show my tasks" and verify formatted task list is returned

### Implementation for User Story 2

- [x] T030 [US2] Implement list_tasks MCP tool with user_id parameter in src/mcp/tools/list_tasks.py
- [x] T031 [US2] Format task list with completion status ([ ] pending, [x] complete) in src/mcp/tools/list_tasks.py
- [x] T032 [US2] Handle empty task list with friendly message in src/mcp/tools/list_tasks.py
- [x] T033 [US2] Register list_tasks tool with MCP server in src/mcp/server.py
- [x] T034 [US2] Bind list_tasks as function_tool to OpenAI agent in src/agent/todo_agent.py

**Checkpoint**: User Stories 1 & 2 complete - MVP functional (create + list tasks)

---

## Phase 5: User Story 3 - Complete a Task via Chat (Priority: P2)

**Goal**: Users can mark tasks as complete through natural language

**Independent Test**: Say "I finished buying groceries" and verify task status changes to complete

### Implementation for User Story 3

- [x] T035 [US3] Implement complete_task MCP tool with user_id and task_identifier parameters in src/mcp/tools/complete_task.py
- [x] T036 [US3] Implement fuzzy task matching by title (case-insensitive LIKE query) in src/mcp/tools/complete_task.py
- [x] T037 [US3] Handle task not found with list of available tasks in src/mcp/tools/complete_task.py
- [x] T038 [US3] Handle ambiguous match (multiple results) with clarification prompt in src/mcp/tools/complete_task.py
- [x] T039 [US3] Register complete_task tool with MCP server in src/mcp/server.py
- [x] T040 [US3] Bind complete_task as function_tool to OpenAI agent in src/agent/todo_agent.py

**Checkpoint**: User Story 3 complete - users can mark tasks complete

---

## Phase 6: User Story 4 - Update a Task via Chat (Priority: P2)

**Goal**: Users can modify existing task titles through natural language

**Independent Test**: Say "Change 'buy groceries' to 'buy groceries and milk'" and verify title updates

### Implementation for User Story 4

- [x] T041 [US4] Implement update_task MCP tool with user_id, task_identifier, new_title parameters in src/mcp/tools/update_task.py
- [x] T042 [US4] Reuse fuzzy task matching logic from complete_task in src/mcp/tools/update_task.py
- [x] T043 [US4] Handle task not found and ambiguous matches in src/mcp/tools/update_task.py
- [x] T044 [US4] Register update_task tool with MCP server in src/mcp/server.py
- [x] T045 [US4] Bind update_task as function_tool to OpenAI agent in src/agent/todo_agent.py

**Checkpoint**: User Story 4 complete - users can update task titles

---

## Phase 7: User Story 5 - Delete a Task via Chat (Priority: P3)

**Goal**: Users can remove tasks through natural language

**Independent Test**: Say "Delete the groceries task" and verify task is removed

### Implementation for User Story 5

- [x] T046 [US5] Implement delete_task MCP tool with user_id and task_identifier parameters in src/mcp/tools/delete_task.py
- [x] T047 [US5] Reuse fuzzy task matching logic in src/mcp/tools/delete_task.py
- [x] T048 [US5] Handle task not found and ambiguous matches in src/mcp/tools/delete_task.py
- [x] T049 [US5] Register delete_task tool with MCP server in src/mcp/server.py
- [x] T050 [US5] Bind delete_task as function_tool to OpenAI agent in src/agent/todo_agent.py

**Checkpoint**: User Story 5 complete - users can delete tasks

---

## Phase 8: User Story 6 - Conversation Continuity (Priority: P3)

**Goal**: Multi-turn conversations maintain context across messages

**Independent Test**: Have a multi-turn conversation and verify assistant remembers earlier context

### Implementation for User Story 6

- [x] T051 [US6] Implement load conversation history (all messages ordered by created_at) in src/api/chat.py
- [x] T052 [US6] Format conversation history for OpenAI agent context in src/agent/todo_agent.py
- [x] T053 [US6] Handle missing conversation_id gracefully (create new) in src/api/chat.py
- [x] T054 [US6] Update conversation.updated_at on each new message in src/api/chat.py

**Checkpoint**: User Story 6 complete - full conversation continuity working

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T055 [P] Extract fuzzy task matching to shared utility in src/mcp/tools/utils.py
- [x] T056 [P] Add input validation for empty/whitespace messages in src/api/chat.py
- [x] T057 [P] Add logging throughout application using Python logging in src/main.py
- [x] T058 Refine agent system prompt for better intent detection in src/agent/todo_agent.py
- [x] T059 Add clarification prompts for ambiguous user messages in src/agent/todo_agent.py
- [x] T060 [P] Create README.md with setup and usage instructions at project root
- [x] T061 Run quickstart.md validation - verify all setup steps work

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
     │
     ▼
Phase 2 (Foundational) ─── BLOCKS ALL USER STORIES
     │
     ├──────────────────────────────────────────────┐
     │                                              │
     ▼                                              ▼
Phase 3 (US1: Create) ◄──────────────────► Phase 4 (US2: List)
     │                    [can parallel]            │
     └──────────────┬───────────────────────────────┘
                    │
     ┌──────────────┴──────────────┐
     │                             │
     ▼                             ▼
Phase 5 (US3: Complete) ◄──────► Phase 6 (US4: Update)
     │                             │
     └──────────────┬──────────────┘
                    │
                    ▼
           Phase 7 (US5: Delete)
                    │
                    ▼
           Phase 8 (US6: Continuity)
                    │
                    ▼
           Phase 9 (Polish)
```

### User Story Dependencies

- **US1 (Create Task)**: Requires Phase 2 complete - No dependencies on other stories
- **US2 (List Tasks)**: Requires Phase 2 complete - Can parallel with US1
- **US3 (Complete Task)**: Requires US2 (needs list for not-found response) - Can parallel with US4
- **US4 (Update Task)**: Requires US2 (needs list for not-found response) - Can parallel with US3
- **US5 (Delete Task)**: Requires US3/US4 (shared fuzzy matching utility)
- **US6 (Continuity)**: Can start after Phase 2 but best after US1+US2 for meaningful testing

### Within Each User Story

- MCP tool implementation first
- Register tool with MCP server
- Bind tool to OpenAI agent
- Integrate with chat endpoint (if needed)

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 can run in parallel
- **Phase 2**: T008, T009, T010 (models) can run in parallel
- **Phase 3+4**: US1 and US2 can be implemented in parallel after Phase 2
- **Phase 5+6**: US3 and US4 can be implemented in parallel
- **Phase 9**: T055, T056, T057, T060 can run in parallel

---

## Parallel Example: Phase 2 Models

```bash
# Launch all model creation tasks together:
Task T008: "Create Task SQLModel in src/models/task.py"
Task T009: "Create Conversation SQLModel in src/models/conversation.py"
Task T010: "Create Message SQLModel in src/models/message.py"
```

## Parallel Example: US1 + US2 (MVP)

```bash
# After Phase 2, launch US1 and US2 in parallel:
# Developer A: US1 tasks (T020-T029)
# Developer B: US2 tasks (T030-T034)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (5 tasks)
2. Complete Phase 2: Foundational (14 tasks)
3. Complete Phase 3: User Story 1 - Create Task (10 tasks)
4. Complete Phase 4: User Story 2 - List Tasks (5 tasks)
5. **STOP and VALIDATE**: Test create + list tasks independently
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Create) → Test → **MVP-1**
3. Add US2 (List) → Test → **MVP-2 (Full MVP)**
4. Add US3 (Complete) + US4 (Update) → Test → **v1.1**
5. Add US5 (Delete) → Test → **v1.2**
6. Add US6 (Continuity) → Test → **v1.3**
7. Polish → **v1.0 Release**

---

## Task Summary

| Phase | User Story | Task Count | Parallel Tasks |
|-------|------------|------------|----------------|
| 1 | Setup | 5 | 3 |
| 2 | Foundational | 14 | 3 |
| 3 | US1 (Create) | 10 | 0 |
| 4 | US2 (List) | 5 | 0 |
| 5 | US3 (Complete) | 6 | 0 |
| 6 | US4 (Update) | 5 | 0 |
| 7 | US5 (Delete) | 5 | 0 |
| 8 | US6 (Continuity) | 4 | 0 |
| 9 | Polish | 7 | 4 |
| **Total** | | **61** | **10** |

### MVP Scope (Recommended)

- **Minimum**: Phase 1-4 (US1 + US2) = 34 tasks
- **Full Feature**: All phases = 61 tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Fuzzy task matching logic should be extracted to shared utility after US3

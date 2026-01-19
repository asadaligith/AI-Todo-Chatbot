---
id: 006
title: Analyze UI Task Summary Bug
stage: misc
date: 2026-01-19
surface: agent
model: claude-opus-4-5-20251101
feature: 001-mcp-todo-chatbot
branch: 001-mcp-todo-chatbot
user: developer
command: /sp.analyze
labels: ["analysis", "bug-investigation", "ui", "frontend"]
links:
  spec: specs/001-mcp-todo-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/components/Sidebar.tsx (read)
  - frontend/src/components/Chat.tsx (read)
  - backend/src/api/tasks.py (read)
  - backend/src/main.py (read)
  - specs/001-mcp-todo-chatbot/spec.md (read)
  - specs/001-mcp-todo-chatbot/plan.md (read)
  - specs/001-mcp-todo-chatbot/tasks.md (read)
tests:
  - None (read-only analysis)
---

## Prompt

the Chatbot work fine and given answer and also adding task update complete , one issue in UI logic when task added summary not showing figure active or done , still showing 0 , updated it and enhance the logic

## Response snapshot

Performed cross-artifact analysis (spec.md, plan.md, tasks.md) and identified root cause of the UI bug:

**Key Findings:**
1. Sidebar.tsx uses hardcoded mock data instead of fetching real tasks from backend API
2. Backend has `GET /api/{user_id}/tasks` endpoint in tasks.py but it's NOT registered in main.py
3. Sidebar component doesn't receive userId prop needed to fetch user-specific tasks
4. This feature (live task summary in sidebar) was NOT in original spec scope

**Recommendations:**
1. Register tasks router in backend main.py
2. Add userId prop to Sidebar component
3. Pass userId from Chat.tsx to Sidebar
4. Replace mock setTimeout with actual API call

## Outcome

- ✅ Impact: Identified root cause of UI bug - data flow gap between frontend sidebar and backend tasks API
- 🧪 Tests: N/A (read-only analysis)
- 📁 Files: 7 files analyzed
- 🔁 Next prompts: Implement remediation edits if user approves
- 🧠 Reflection: Bug was outside original spec scope; frontend UI requirements were not specified

## Evaluation notes (flywheel)

- Failure modes observed: None - analysis completed successfully
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Consider adding FR-014 to spec for frontend task display requirements

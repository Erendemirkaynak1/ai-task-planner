# Daymark — AI Task Planner

Daymark is an AI-assisted productivity workspace. The repository contains a responsive React dashboard, a Node.js API, a Supabase/PostgreSQL schema with Row Level Security, and an approval-first AI planning endpoint.

## Implemented foundation

- Responsive productivity dashboard with light/dark appearance
- Task creation, editing, completion, deletion, project/category labels, due-date presets, search and priority views
- Local browser persistence for the unauthenticated demo experience
- Monthly calendar with task markers and month navigation
- Kanban board with To do and Completed columns
- Reusable task sorting, search and completion-rate utilities
- Authenticated Node.js task CRUD API backed by Supabase
- Zod validation for task input and AI planning requests
- AI goal-to-task proposal endpoint with structured response validation
- AI proposals are returned with `requires_approval: true`; the endpoint never mutates existing tasks
- PostgreSQL schema, indexes, timestamps and per-user RLS policies
- Docker deployment and GitHub Actions quality workflow
- Unit tests for task utilities

## Technology

- React 18, TypeScript, Vite
- Tailwind CSS 4, Lucide icons
- Node.js 22, Express
- Supabase Auth + PostgreSQL
- OpenAI API (server-side only)
- Zod, Vitest, Docker, GitHub Actions

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The Vite development server proxies `/api` requests to the Node API on port 3001. The dashboard demo works without credentials. To use authenticated API routes, configure the server-side Supabase values and create a Supabase project.

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL (reserved for client auth integration) |
| `VITE_SUPABASE_ANON_KEY` | Browser | Public anon key (RLS must protect all data) |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Public anon key used with the user's bearer token |
| `OPENAI_API_KEY` | Server only | Private AI provider key |
| `OPENAI_MODEL` | Server only | Model name; defaults to `gpt-4o-mini` |
| `PORT` | Server | API port; defaults to 3001 |

Never put a Supabase service-role key or AI provider key in a `VITE_*` variable or commit secrets.

## Database setup

Apply `supabase/schema.sql` to your Supabase project. The schema enables RLS and restricts profile/task access to the authenticated owner. The API verifies the Supabase access token and uses that token for database requests, so database policies remain the final access-control boundary.

## API

- `GET /api/health` — health check
- `GET /api/tasks` — list the signed-in user's tasks
- `POST /api/tasks` — create a validated task
- `PATCH /api/tasks/:id` — update task fields
- `DELETE /api/tasks/:id` — delete a task
- `POST /api/ai/plan` — create a structured task proposal (authenticated)

Protected routes require `Authorization: Bearer <supabase-access-token>`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Docker

```bash
docker compose up --build
```

The app and API are served together at `http://localhost:8080`. Supply server environment variables through your deployment environment; do not bake secrets into the image.

## Product roadmap

- [ ] Supabase sign-in/sign-up UI and browser session management
- [ ] Connect dashboard task state to authenticated API
- [x] Task editing, project/category labels and due-date presets
- [ ] Tags, precise due times and browser reminders
- [x] Calendar and Kanban views
- [ ] Recurring task scheduler
- [ ] AI proposal review UI with explicit per-task approval
- [ ] Daily/weekly plans, duration estimates and conflict detection
- [ ] Expanded integration and end-to-end test coverage

## Approval-first AI principle

AI-generated plans are suggestions, not actions. The AI endpoint returns validated proposal data and an explicit approval flag. It does not insert, update, reschedule or delete any task. A later approval UI must require a deliberate user action before applying any proposal.

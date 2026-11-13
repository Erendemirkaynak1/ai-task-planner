# Daymark — AI Task Planner

A practical, AI-assisted productivity workspace built with React, TypeScript, Vite, Tailwind CSS and Supabase.

## Current foundation

- Responsive dashboard with light/dark appearance
- Create, complete and delete tasks
- Priority levels and task views (Today, Upcoming, All tasks, Completed)
- Search tasks by title or project
- Local persistence while backend integration is being developed
- AI planning entry point designed for approval-first suggestions

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS 4
- Supabase Auth + PostgreSQL (integration in progress)
- Zod validation
- Vitest

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The dashboard can be explored without credentials using local browser storage. Supabase and AI credentials must be configured before enabling cloud sync or AI generation.

## Environment

See `.env.example`. Never commit service-role keys or private AI provider keys. Only the Supabase anon/publishable key belongs in a browser build; enforce access through Row Level Security.

## Roadmap

1. Supabase authentication, schema and RLS
2. Durable task CRUD, tags, categories and recurring schedules
3. Calendar and Kanban views
4. Secure server-side AI planning endpoint with structured output validation
5. Approval workflow for all AI-proposed task changes
6. Tests, Docker, CI and deployment documentation

## Safety principle

AI-generated plans are proposals. Existing tasks and schedules are never modified until the user explicitly reviews and approves the proposed changes.

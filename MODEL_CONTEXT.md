# EduManage — Model Context

This repository contains a small monorepo:

- `src/`: Node.js + TypeScript backend (Express) **and** a Telegram bot running in the same process.
- `prisma/`: PostgreSQL schema + migrations.
- `admin-panel/`: Vue 3 + Vite + Vuetify admin UI that talks to the backend REST API.

## What the system does

EduManage is a school data app focused on:

- Admin authentication (JWT)
- School structure: `StudyYear` → `Quarter`, plus `Grade`, `Subject`, `Student`
- Student results:
  - `Mark` (per student + subject + quarter)
  - `Monitoring` (per student + subject + month)
- A Telegram bot for parents/students to look up a student by ID and view quarter/monitoring results.

## Tech stack

- Backend: Node.js, TypeScript, Express 5, `express-jsdoc-swagger`
- Auth: `jsonwebtoken` (JWT), `bcryptjs`
- Database: PostgreSQL via Prisma (`@prisma/client` + `@prisma/adapter-pg` + `pg`)
- Bot: `node-telegram-bot-api` (polling)
- Admin UI: Vue 3, Vite, Vuetify, Pinia, Axios

## Repo layout (important paths)

- Backend entry: `src/main.ts`
- Express app: `src/server/app.ts`
- Routes: `src/server/routes/*.ts`
- Controllers: `src/server/controllers/*.ts`
- Auth middleware: `src/server/middleware/auth.middleare.ts`
- Prisma client init: `src/db/prisma.ts`
- Telegram bot init: `src/bot/bot.ts`
- Bot wiring: `src/bot/index.ts`, `src/bot/handlers/msgHandler.ts`
- Bot DB query: `src/bot/services/studentInfo.ts`
- Admin UI API helper: `admin-panel/src/utils/api.ts`
- Admin UI auth store: `admin-panel/src/utils/authStore.ts`

## Runtime model

`npm run dev` runs `ts-node src/main.ts`, which:

- creates a Telegram bot (polling) from `BOT_TOKEN`
- registers bot commands/handlers via `import "./bot"`
- starts the Express server on `PORT` (default `3000`)

Both the bot and the API use the same Prisma connection and database.

## Environment variables

Backend (`src/`):

- `DATABASE_URL` (required): Postgres connection string used by Prisma + `pg` pool.
- `BOT_TOKEN` (required for bot): Telegram bot token.
- `JWT_SECRET` (required): secret for signing/verifying admin JWTs.
- `JWT_EXPIRES` (optional): JWT expiry, default `"7d"`.
- `PORT` (optional): HTTP port, default `3000`.

Admin panel (`admin-panel/`):

- `VITE_API_BASE_URL` (optional): backend base URL, default `http://localhost:3000`.

## Database schema (Prisma models)

Core entities (see `prisma/schema.prisma`):

- `Admin`: admin users (username/email/password hash)
- `StudyYear` → `Quarter` (quarters belong to a study year)
- `Grade` (e.g. “7-A”) and `Student` (students belong to a study year; grade optional)
- `Subject`
- `Mark`: `(studentId, subjectId, quarterId)` is unique
- `Monitoring`: per `(studentId, subjectId, studyYearId, month)` is **unique** (upserts are used in the API)

Deletion behavior:

- `StudyYear` deletes associated `Quarter`, `Student`, and `Monitoring` via `onDelete: Cascade`.

## Backend API overview

Base path is `http://localhost:3000`.
Swagger UI is exposed at `GET /docs` in the backend (`src/server/app.ts`).

### Auth

- `POST /api/admin/register` (no auth): create admin
- `POST /api/admin/login` (no auth): returns `{ token, admin }`
- `GET /api/admin/profile` (auth): returns authenticated admin

Auth header: `Authorization: Bearer <token>`

### Public student endpoints (no auth)

- `GET /api/students/:id` (includes marks + monitorings)
- `GET /api/students/:id/marks` (returns a simplified snapshot)
- `GET /api/years` (study years + quarters)

### Admin-only endpoints (JWT required)

- `GET /api/students/options` (lightweight list for dropdowns)
- `GET/POST/PUT/DELETE /api/students`
- `POST /api/students/import` (parsed XLSX rows sent from client)
- `GET/POST/PUT/DELETE /api/subjects`
- `GET/POST/PUT/DELETE /api/grades`
- `GET/POST/PUT/DELETE /api/monitoring`
- `POST /api/monitoring/bulk` (upsert monitoring entries)
- `GET/POST/PUT/DELETE /api/marks`
- `POST /api/marks/bulk` (upsert based on student+subject+quarter unique constraint)
- `GET/POST/DELETE /api/quarters`
- `POST/PUT/DELETE /api/years`

## Telegram bot flow

Key files:

- `src/bot/handlers/msgHandler.ts`: conversation state + inline keyboard navigation
- `src/bot/services/studentInfo.ts`: loads student info directly from Prisma
- `src/bot/utils/formatStudentInfo.ts`: formats HTML messages for Telegram

High-level behavior:

- User presses “🔍 O'quvchi ID” → bot asks for the student ID.
- Bot fetches student data from DB and caches it per-chat for 15 minutes.
- User chooses:
  - “🏅 Chorak baholar” → select quarter → see marks by subject
  - “📊 Monitoring baholar” → select month → see monitoring scores by subject

## Admin panel behavior

The admin UI (`admin-panel/`) calls backend endpoints using Axios:

- `admin-panel/src/utils/api.ts` injects `Authorization: Bearer ...` from localStorage key `klsbot_token`.
- `admin-panel/src/utils/authStore.ts` manages login/profile/logout.
- Pages in `admin-panel/src/pages/*.vue` implement CRUD for years/quarters, subjects, grades, students, marks (incl bulk), monitoring.

## Local development (typical)

Backend:

- Install: `npm install`
- Run (ts-node): `npm run dev`
- Build: `npm run build`
- Run compiled: `npm start`

Database (Prisma):

- Generate client / migrate: use Prisma CLI (e.g. `npx prisma migrate dev`, `npx prisma generate`)

Admin panel:

- `cd admin-panel`
- Install: `npm install`
- Run: `npm run dev`
- Build: `npm run build`

## Notable implementation details / gotchas

- Swagger generation is configured with `filesPattern: "./routes/**/*.ts"`; if you run compiled JS from `dist/`, this may need adjustment to point at built route files.
- The bot and server share a single process and DB; heavy bot queries can affect API latency.
- Monitoring month values are normalized: `YYYY-MM` is preferred, `YYYY-MM-DD` is coerced to `YYYY-MM`, and legacy month labels are still accepted.
- Deleting a student that has marks/monitoring requires `?force=true`; otherwise the API returns 409 with counts to avoid accidental cascades.

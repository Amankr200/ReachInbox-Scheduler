# ReachInbox Email Job Scheduler

A full-stack email scheduling service built with Express + BullMQ + Redis + PostgreSQL + Elasticsearch + React + Tailwind.

---

## How to Run

### Prerequisites
- Node.js v18+
- Docker & Docker Compose (for Redis, PostgreSQL, Elasticsearch)

### 1. Start Infrastructure (Redis, DB, Elasticsearch)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **Elasticsearch** on `localhost:9200`

> If Docker is not available, the backend will auto-launch an in-memory Redis server on startup. SQLite is used as the default database so PostgreSQL is not strictly required for local testing.

### 2. Run Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

The Express server starts at `http://localhost:5000`.
BullMQ Dashboard is available at `http://localhost:5000/admin/queues`.

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The React dashboard starts at `http://localhost:5173`.

---

## Ethereal Email Setup

Ethereal Email is a fake SMTP service used for testing. **No manual setup is needed.** The backend automatically creates an Ethereal test account on startup using `nodemailer.createTestAccount()`.

When an email is sent, the backend logs a preview URL:
```
Ethereal Preview URL: https://ethereal.email/message/...
```
Open that URL to view the rendered email in Ethereal's web viewer.

---

## Environment Variables

Copy `.env.example` to `.env` in the project root:

```ini
# Server
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret

# Database
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/reachinbox

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback

# Worker Configuration
WORKER_CONCURRENCY=5          # Number of parallel BullMQ workers
MIN_EMAIL_DELAY_MS=2000       # Minimum 2 seconds between each email send
MAX_EMAILS_PER_HOUR=100       # Global hourly rate limit per sender
```

---

## Architecture Overview

```
┌──────────────┐
│  React UI    │
│  (Vite)      │
└──────┬───────┘
       │ HTTP
       ▼
┌──────────────┐
│  Express.js  │
│  Backend     │
└──┬───┬───┬───┘
   │   │   │
   ▼   ▼   ▼
  DB  Redis  ES
   │   │
   │   ▼
   │  BullMQ Queue
   │   │
   │   ▼
   │  Email Worker ──► Ethereal SMTP
   │       │
   └───────┘ (updates DB + indexes ES after send)
```

### How Scheduling Works

1. User clicks "Schedule" in the frontend Compose modal.
2. Frontend sends `POST /api/emails/schedule` with recipients, subject, body, startTime, delay, and hourlyLimit.
3. Backend creates one `Email` record in the database per recipient with `status: SCHEDULED`.
4. Backend enqueues one BullMQ delayed job per email. The delay is calculated as `(startTime - now) + (index * delayBetweenEmails)`. This staggers emails so they don't all fire at the exact same millisecond.
5. BullMQ stores jobs in Redis with their delay timers.
6. When a job's delay expires, the BullMQ Worker picks it up and processes it.
7. Worker sends the email via Ethereal SMTP using Nodemailer, then updates the database to `status: SENT` and indexes the result into Elasticsearch.

**No cron jobs are used anywhere.** All scheduling is done purely through BullMQ delayed jobs backed by Redis.

### How Persistence on Restart is Handled

BullMQ stores all job data (including delayed jobs) in Redis. When the backend server is stopped and restarted:

1. The BullMQ Worker reconnects to the same Redis instance.
2. Redis still has all pending/delayed jobs intact.
3. Jobs whose delay has already expired are immediately picked up by the worker.
4. Jobs still waiting continue to wait until their scheduled time.

Additionally, every email has a database record. Before sending, the worker checks `if (emailRecord.status === 'SENT') return;` — this is the **idempotency guard** that prevents duplicate sends if a job is somehow retried after a crash.

### How Rate Limiting & Concurrency are Implemented

**Worker Concurrency:**
- The BullMQ Worker is initialized with `concurrency: WORKER_CONCURRENCY` (default 5).
- This means up to 5 jobs run in parallel inside the worker process.
- The value is configurable via the `WORKER_CONCURRENCY` environment variable.

**Delay Between Emails:**
- Each worker job enforces a minimum delay of `MIN_EMAIL_DELAY_MS` (default 2000ms) before sending.
- This mimics real-world email provider throttling (e.g., "min 2 seconds between sends").

**Hourly Rate Limiting (Redis-backed, multi-worker safe):**
- Before sending, the worker calls `checkAndIncrementHourlyRateLimit()`.
- This uses an atomic Redis `INCR` on a key like `rate_limit:{senderId}:{2026-09-07-22}`.
- The key has a 2-hour TTL and auto-expires.
- If the count exceeds the hourly limit:
  - The job is **not dropped or failed** — it is rescheduled to the start of the next hour using `addEmailJob(jobData, delayUntilNextHour)`.
  - The email's database status is reverted to `SCHEDULED`.
  - A live Slack notification is sent to the user's connected Slack workspace (if connected).
- This approach is safe across multiple workers/instances because Redis `INCR` is atomic.

**Slack Notification on Rate Limit:**
- When the hourly limit is hit, `sendSlackRateLimitNotification()` is called.
- It checks if the user has a `SlackConnection` record in the database.
- If yes, it sends a real `chat.postMessage` API call to their Slack channel.
- If no Slack is connected, it silently does nothing (no crash).

---

## Features Implemented

### Backend

| Feature | File(s) | Details |
|---------|---------|---------|
| Email Scheduler | `email.queue.ts`, `email.routes.ts` | BullMQ delayed jobs, staggered per recipient |
| Persistence | BullMQ + Redis | Jobs survive server restarts |
| Idempotency | `email.worker.ts` | Checks DB status before sending, prevents duplicates |
| Rate Limiting | `rateLimiter.service.ts` | Atomic Redis counters per sender per hour |
| Rate Limit Rescheduling | `email.worker.ts` | Exceeded jobs delayed to next hour window |
| Concurrency | `email.worker.ts` | Configurable via `WORKER_CONCURRENCY` env var |
| Per-Email Delay | `email.worker.ts` | `MIN_EMAIL_DELAY_MS` enforced in worker |
| Ethereal SMTP | `ethereal.service.ts` | Auto-generated test accounts via Nodemailer |
| Multiple Senders | `sender.routes.ts`, `Sender` model | Each sender has own SMTP config and hourly limit |
| Elasticsearch | `elasticsearch.ts`, `email.routes.ts` | Emails indexed on send, searchable via `/api/emails/search` |
| BullMQ Dashboard | `server.ts` | BullBoard mounted at `/admin/queues` |
| Google OAuth | `auth.routes.ts` | Real OAuth 2.0 flow with JWT sessions |
| Slack OAuth | `slack.routes.ts` | Real OAuth flow, stores token per user |
| Slack Rate Limit Alert | `slack.service.ts` | Live `chat.postMessage` call when limit hit |
| Health Check | `server.ts` | `GET /health` endpoint |

### Frontend

| Feature | File(s) | Details |
|---------|---------|---------|
| Google Login | `Login.tsx` | Google OAuth button + dev login fallback |
| Dashboard Layout | `App.tsx`, `Sidebar.tsx` | Sidebar with user profile, Compose button, nav tabs |
| Scheduled Emails | `EmailList.tsx` | Table with recipient, subject, time, status badges |
| Sent Emails | `EmailList.tsx` | Table with sent/failed status |
| Compose Modal | `ComposeModal.tsx` | Subject, body, sender selector, CSV upload |
| CSV Upload | `ComposeModal.tsx` | PapaParse parsing, "X emails detected" badge |
| Send Later | `ComposeModal.tsx` | Clock icon popover with date picker + presets |
| Delay & Hourly Limit | `ComposeModal.tsx` | Inline inputs for delay (sec) and hourly limit |
| Search | `Header.tsx`, `api.ts` | Search bar querying Elasticsearch / DB fallback |
| Email Detail View | `EmailDetailModal.tsx` | Slide-in drawer with full email content |
| Loading States | `EmailList.tsx` | Skeleton animation while loading |
| Empty States | `EmailList.tsx` | "No scheduled/sent emails" message with icon |
| Connect Slack | `ComposeModal.tsx` | Slack connection badge + connect button |
| Logout | `Sidebar.tsx` | Clears JWT token and redirects to login |
| TypeScript Types | `types/index.ts` | `User`, `Email`, `Sender`, `SlackStatus` interfaces |

---

## Trade-offs & Assumptions

1. **Ethereal Email**: Emails are sent to Ethereal's fake SMTP, not real inboxes. This is required by the assignment.
2. **SQLite Default**: For zero-config local testing, SQLite is the default database. Switch to PostgreSQL by updating `DATABASE_URL` and the Prisma schema datasource.
3. **In-Memory Redis Fallback**: If Redis is not running externally, the backend auto-launches `redis-memory-server` for local development.
4. **Elasticsearch Optional**: If Elasticsearch is not running, search falls back to PostgreSQL `ILIKE` queries. No crash.
5. **Idempotency Limitation**: There is a small window between SMTP send and DB update where a crash could theoretically cause a duplicate. This is documented as an accepted trade-off since SMTP and DB are not transactional together.

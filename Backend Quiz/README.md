# Quiz System — Backend

Express.js REST API and WebSocket server for live quizzes, polls, and surveys. MySQL via Sequelize.

## Tech Stack

- **Express.js**, **Sequelize**, **MySQL**
- **JWT** + **bcryptjs** — auth
- **Multer** + **Sharp** — uploads / images
- **ws** — WebSocket
- **Helmet**, **cors**, **dotenv**
- **nodemailer**, **firebase-admin** (OTP / notifications as configured)
- **node-cron** — scheduled jobs

## Project Structure

```
Backend Quiz/src/
├── server.js / app.js
├── config/          # database, env, multer, user-rights, data-scope
├── models/          # Sequelize models (source of truth for fields)
├── routes/          # HTTP route modules
├── controllers/
├── services/        # Business logic + websocket.service.js
├── middlewares/     # auth, roles, rights, participant, rate limits
├── validators/
├── migrations/      # DB migrations (run locally with sequelize-cli)
└── utils/
```

Do not treat older field lists as authoritative — open `src/models` and `src/routes`.

## Roles

Configured in `src/config/user-rights.js`:

| Role | Typical use |
|------|-------------|
| `super_admin` | Platform |
| `sub_admin` | Platform helper |
| `client_admin` | Organisation |
| `dept_admin` | Department |
| `host` | Create and run sessions |
| `author` | Question bank / authoring |
| `auditor` | Review |
| `session_admin` | Read-only access to one assigned session (reports, live view) |

Data scope for `session_admin` is the session whose `session_admin_user_id` matches the user.

## Core domain (high level)

- **Org:** clients, departments, users, plans, teams / seat add-ons
- **Session:** code, status (`draft` / `live` / `paused` / `completed` / `archived`), join type, OTP / allowlist / customer match, quiz total time, navigation, themes, present settings, Session Admin link
- **Questions:** `mcq`, `poll`, `survey`, `word_cloud`, `rating`, `open_text`, `true_false`, `ranking`, `fill_blank`, `emoji_reaction`, `match` (+ options / match sides)
- **Participants & responses** — join identity, scores, timers
- **Q&A** — pending / approved / rejected / answered / pinned + upvotes
- **Question bank** — topics, packs, reviews, import
- **Analytics / reports** — session summary, participants, questions; department / client analytics
- **Embeds** — session embed tokens for display / controls / participant

## Route groups (`/api/v1`)

Registered from `src/routes/index.js` (names map to files under `src/routes/`):

| Area | Module |
|------|--------|
| Auth | `auth.routes.js` |
| Users / plans / payments | `user.routes.js`, `plan.routes.js`, `payment.routes.js` |
| Clients / departments | `client.routes.js`, `department.routes.js` |
| Sessions / questions / responses | `session.routes.js`, `question.routes.js`, `response.routes.js` |
| Participants | `participant.routes.js` |
| Q&A / media / AI | `qa.routes.js`, `media.routes.js`, `ai.routes.js` |
| Analytics | `analytics.routes.js` |
| Session Admin | `session-admin.routes.js` |
| Question bank | `question-bank.routes.js` |
| Present view | `present-view.routes.js` |
| Teams / roles / sub-admins | `team.routes.js`, `admin-team.routes.js`, `role.routes.js`, `sub-admin.routes.js` |
| Ops | `websocket-monitor.routes.js`, `audit-log.routes.js` |

Example session report paths (host or Session Admin with `reports` right):

- `GET /sessions/:sessionId/report/summary`
- `GET /sessions/:sessionId/report/participants`
- `GET /sessions/:sessionId/report/questions`

## Main flows

1. **Host auth** — email/password → JWT access + refresh; rights from role.
2. **Create session** — join rules, timers, themes, optional Session Admin user auto-created.
3. **Builder** — CRUD questions (including match pairs); bank import; AI generate where enabled.
4. **Join** — public join by code; identity / OTP / allowlist / customer match as configured.
5. **Live** — activate / close / reopen; WebSocket broadcasts; optional quiz total clock.
6. **Reports** — summary + participants + responses for Excel/PDF on the frontend.

## Authentication

- **Staff:** `Authorization: Bearer <access_token>`; refresh via auth routes.
- **Participants:** participant token after join (`participant-auth.middleware.js`).
- **Rights:** `authorizeRights` / `authorizeAnyRight` from role permissions.

## Media

- Uploads under `uploads/` (images / video / audio as configured).
- Sharp for image processing. Prefer current multer config over outdated size notes in old docs.

## Environment (common)

```
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=quiz_db
DB_USER=root
DB_PASSWORD=

DB_POOL_MAX=30
DB_POOL_MIN=5
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRY=7d

RATE_LIMIT_ENABLED=true
# SMS / mail / Firebase vars as needed for OTP and mail
```

See `src/config/env.js` for the full set.

## Commands

```bash
npm install
npm run dev    # nodemon
npm start
# Optional focused tests:
npm run test:tenant-question-bank
npm run test:join-identity-token
```

Apply DB migrations with your local Sequelize CLI setup before testing new features (e.g. Session Admin).

## WebSocket

- Endpoint: `/ws` with query params such as `session`, `token`, `role`
- Implementation: `src/services/websocket.service.js`
- Used for live responses, session/question updates, leaderboards, participant presence

## Related docs

- Product guide (plain language): `../Quiz-Platform-Guide.html`
- Quiz config playbook (settings recipes): `../Quiz-Config-Playbook.html`
- Product vs Vevox: `../Vevox-Feature-Extraction.md`, `../Vevox-Comparison.html`
- Frontend: `../Frontend Admin/README.md`

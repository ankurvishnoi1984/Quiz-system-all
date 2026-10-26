# Quiz System — Frontend Admin

React host and participant UI for live quizzes, polls, and surveys. Built with React 19, Vite, and Tailwind CSS.

## Tech Stack

- **React 19** + **Vite**
- **React Router 7** — routing
- **TanStack React Query** — server state
- **Zustand** — auth and participant client state
- **Tailwind CSS 4** — styling
- **Recharts** — charts
- **@dnd-kit** — drag and drop
- **ExcelJS** / **jsPDF** / **html2canvas** — exports
- **QRCode** — join QR codes
- **WebSocket** — live updates (`realtimeClient.js`)

## Project Structure (high level)

```
Frontend Admin/src/
├── App.jsx                 # Routes and role gates
├── main.jsx
├── pages/
│   ├── DashboardPage.jsx
│   ├── BuilderPage.jsx
│   ├── LivePage.jsx
│   ├── AnalyticsPage.jsx / ReportsPage.jsx
│   ├── SessionAdminPage.jsx
│   ├── QuestionBankPage.jsx / TrainingLibraryPage.jsx
│   ├── present-mode/ / preview-mode/ / quick-view/
│   ├── participant-session/   # Join + live participant UI
│   ├── embed/                 # Display / controls / participant embeds
│   └── Manage*.jsx            # Clients, depts, users, roles, plans, teams…
├── components/                # Dashboard, analytics, session, layout, UI
├── services/                  # API clients + realtimeClient
├── store/                     # authStore, participant store, etc.
├── context/                   # Shell, sessions list helpers
└── utils/                     # Exports, themes, session flags, timers
```

Authoritative routes: `src/App.jsx`.

## Main routes

### Public / join

| Path | Purpose |
|------|---------|
| `/login`, `/forgot-password`, `/change-password`, `/verify-email` | Auth |
| `/join`, `/join/:sessionId` | Participant join + session |
| `/embed/display`, `/embed/controls`, `/embed/participant/:sessionId` | Embed surfaces |
| `/present/view` | Read-only present view |

### Host workspace (auth + rights)

| Path | Purpose |
|------|---------|
| `/dashboard` | Sessions list, create/edit (tabbed Basics / Join / Quiz / Look), share |
| `/builder` | Question builder |
| `/live` | Host live controls |
| `/present` | Present Mode (big screen) |
| `/preview`, `/quick-view` | Preview / quick view |
| `/analytics`, `/reports` | Session analytics + downloads |
| `/department-analytics`, `/client-analytics` | Org analytics |
| `/question-bank`, `/training` | Bank + training library |
| `/team`, `/my-plan` | Team seats / plan |
| `/session-admin` | Session Admin workspace (role `session_admin` only) |
| `/manage/*` | Clients, departments, users, sub-admins, roles, plans, teams |
| `/monitor/websockets` | WebSocket monitor |

## Features (product)

- **Question types:** MCQ, Poll, Survey (subtypes), Word Cloud, Rating, Text, True/False, Ranking, Fill blank, Emoji reaction, Match
- **Session settings:** join requirements (anonymous / name / email / mobile), OTP, allowlist, customer match (email joins), quiz total time, navigation, themes, present settings, Session Admin credentials in Share
- **Live:** activate / close / reopen questions, reset responses, leaderboards, Q&A moderation
- **Reports:** combined Excel (email/mobile columns when collected) and PDF; Session Admin can download the same Excel
- **Roles:** host, author, auditor, session_admin, dept/client/sub/super admin (see backend `user-rights.js`)

## API & WebSocket

- REST: `VITE_API_BASE_URL` (default `http://localhost:5000/api/v1`)
- WebSocket: `VITE_WS_BASE_URL` (default `ws://localhost:5000/ws`)

Auth uses JWT access + refresh tokens in Zustand (persisted). Sessions and live data come from the API and WebSocket — not localStorage-only session storage.

### Realtime client sketch

```javascript
import { createRealtimeClient, RealtimeEvent } from './services/realtimeClient'

const client = createRealtimeClient('/', {
  session: 'ABC123',
  token: 'jwt_or_participant_token',
  role: 'host', // or participant
})

client.on(RealtimeEvent.CONNECTED, () => {})
client.connect()
```

Events include connection, responses, session/question updates, leaderboard, and participant join/leave (see `realtimeClient.js`).

## Environment

```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_WS_BASE_URL=ws://localhost:5000/ws
```

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build
npm run lint
npm run preview
```

## Related docs

- Product guide (plain language): `../Quiz-Platform-Guide.html`
- Quiz config playbook (settings recipes): `../Quiz-Config-Playbook.html`
- Product vs Vevox: `../Vevox-Feature-Extraction.md` and `../Vevox-Comparison.html`
- Backend API: `../Backend Quiz/README.md`

# Quiz System — Improvements & Feature Roadmap

**Document version:** 1.0  
**Date:** March 2026  
**Project:** Netcast Quiz System (Live Polling & Quiz Platform)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What Exists Today](#what-exists-today)
3. [Improvements — Fix & Polish](#improvements--fix--polish)
4. [New Features — Ranked by Value](#new-features--ranked-by-value)
5. [Suggested Roadmap](#suggested-roadmap)
6. [Quick Wins vs Medium vs Large Initiatives](#quick-wins-vs-medium-vs-large-initiatives)
7. [Product Positioning](#product-positioning)
8. [Top 5 Recommendations](#top-5-recommendations)
9. [Technical Reference](#technical-reference)

---

## Executive Summary

The Quiz System is a **feature-rich live polling and quiz platform** aimed at corporate hosts (training, town halls, internal events). It compares to products like **Mentimeter** and **Kahoot**, with stronger admin, multi-tenant structure, and presenter tooling.

**Strengths:** Host portal, question builder (8+ types), live controls, fullscreen Present mode, shareable view-only displays with host slide sync, analytics, reports, Q&A, leaderboards, realtime WebSocket layer.

**Gaps:** Automated tests, some security hardening, deployment automation, horizontal scaling for WebSocket/slide state, and several UI features that exist as schema or stubs but are not fully wired (session password, fill blank, templates, profanity filter, real report data).

**Best near-term ROI:** Security fixes, schema consistency, test coverage on core flows, and question/session templates.

---

## What Exists Today

### Host Portal

| Feature | Status | Key Areas |
|---------|--------|-----------|
| Login / logout / refresh | ✅ | `authStore.js`, `auth.routes.js` |
| Force password change | ✅ | `ForceChangePasswordPage.jsx` |
| Forgot password (email) | ✅ | `ForgotPasswordPage.jsx`, `email.service.js` |
| Dashboard (sessions CRUD, filters, stats) | ✅ | `DashboardPage.jsx` |
| Session lifecycle (draft → live → pause → end → archive) | ✅ | `session.routes.js` |
| Duplicate session | ✅ | `session.service.js` |
| Share panel (QR, join link, view display link) | ✅ | `ShareSessionPanel.jsx` |
| Question Builder (8 types + Survey) | ✅ | `BuilderPage.jsx` |
| Drag-and-drop question reorder | ✅ | @dnd-kit |
| Media on questions (image/gif/video/audio) | ✅ | `QuestionMediaUpload.jsx` |
| Session scheduling (date/time) | ✅ | `scheduled_date`, `scheduled_time` |
| Quiz total time mode | ✅ | `sessionFlags.js` |
| Participant navigation (self-pace multi-question) | ✅ | `participant_navigation_enabled` |
| Live Present Mode (host controls) | ✅ | `LivePage.jsx` |
| Fullscreen Present Mode (`/present`) | ✅ | `PresentModePage.jsx` |
| View-only display (`/present/view?token=`) | ✅ | `PresentViewPage.jsx` |
| Present slide sync (host ↔ view display) | ✅ | WebSocket `present_slide_changed` |
| Host question controls | ✅ | Activate, close, reveal, reattempt, leaderboard |
| Live Q&A moderation | ✅ | `LiveQaPanel.jsx` |
| Real-time charts | ✅ | Pie/bar/word cloud/ranking |
| Session / question leaderboards | ✅ | `leaderboard.js` |
| Session Analytics | ✅ | `AnalyticsPage.jsx` |
| Department / Client Analytics | ✅ | Admin analytics pages |
| Reports (CSV, PDF, Excel) | ✅ | `ReportsPage.jsx` |
| Manage Clients / Departments / Users | ✅ | Manage pages |
| Role-based navigation | ✅ | `Sidebar.jsx`, route guards |

### Participant Flow

| Feature | Status |
|---------|--------|
| Public join `/join` and `/join/:code` | ✅ |
| Join types: name, anonymous, name+email | ✅ |
| Device fingerprint / rejoin | ✅ |
| Participant JWT + refresh | ✅ |
| Pre-join realtime (wait for live) | ✅ |
| Timed questions + countdown | ✅ |
| All major question types in UI | ✅ (mostly) |
| Survey results for participants | ✅ |
| Q&A submit + upvote | ✅ |
| Progress persistence | ✅ |
| Late-join policy | ✅ |
| Overall + per-question leaderboard | ✅ |

### Question Types

**Database enum:** `mcq`, `poll`, `survey`, `word_cloud`, `rating`, `open_text`, `true_false`, `ranking`, `fill_blank`

**Builder UI:** MCQ, Poll, Survey, Word Cloud, Rating, Text, True/False, Ranking  
**Note:** Fill Blank is in DB but has no dedicated Builder/participant UI.

**Survey subtypes:** MCQ, Poll, Rating, Word Cloud, Text, Ranking

### Realtime (WebSocket)

Events include: `connected`, `response_received`, `session_updated`, `question_changed`, `answer_revealed`, `question_submissions_closed`, `leaderboard_update`, `participant_joined`, `session_progress`, `present_slide_changed`, and more.

### Auth & Roles

| Role | Scope |
|------|-------|
| `super_admin` | All clients, users, client analytics |
| `client_admin` | Own client, departments |
| `dept_admin` | Own department |
| `host` | Own sessions within department |
| `participant` | JWT scoped to session |
| `presenter_viewer` | Read-only token for view display |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7 |
| State | TanStack React Query, Zustand |
| Charts / export | Recharts, ExcelJS, jsPDF |
| Backend | Express 4, Sequelize 6, MySQL |
| Auth | JWT (access + refresh), bcrypt |
| Realtime | WebSocket (`ws`) on same HTTP server |
| Email | Nodemailer |

### Database Entities

User, Client, Department, Session, Participant, Question, QuestionOption, Response, QaQuestion, QaUpvote, MediaAsset, MailConfig

---

## Improvements — Fix & Polish

### Critical — Security & Trust

#### 1. Lock down public registration
- **Issue:** `POST /api/v1/auth/register` is publicly accessible (`auth.routes.js`).
- **Risk:** Unauthorized account creation, including elevated roles if not validated server-side.
- **Action:** Restrict to `super_admin` only, or disable public registration in production.

#### 2. Remove plaintext password storage in browser
- **Issue:** `userPasswordVault.js` stores admin-created passwords in browser local storage (`ManageUsersPage.jsx`).
- **Action:** Show one-time password on create with copy button, or email-only delivery. Never persist plaintext passwords client-side.

#### 3. Production secrets & CORS
- **Issue:** Default JWT secrets in `env.js`; open CORS (`cors()` with no origin restriction).
- **Action:**
  - Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` in production env
  - CORS allowlist from `FRONTEND_PUBLIC_URL`
  - Rate limiting on login, join, forgot-password (`express-rate-limit`)

#### 4. Persist present slide state
- **Issue:** Slide sync stored in in-memory `Map` (`present-view.service.js`) — lost on server restart; not safe for multiple API instances.
- **Action:** Store in Redis or database; broadcast via Redis pub/sub for multi-instance WebSocket.

---

### High Priority — Finish Half-Built Features

| Feature | Current State | Recommendation |
|---------|---------------|----------------|
| **Session password** | UI in Builder (`BuilderPage.jsx`); not saved or validated on join | Implement hash + join gate, or remove UI |
| **Join type** | `join_type` vs anonymous flags may be inconsistent | Align Builder → API → participant join flow |
| **Fill in the blank** | In DB enum; no Builder/participant UI | Build end-to-end or remove from schema |
| **Profanity filter** | Department toggle exists; no enforcement | Filter open text/Q&A responses, or remove toggle |
| **Reports sample data** | `ReportsPage.jsx` uses `sampleResponseFromApiQuestion` | Wire to real response APIs |
| **Question templates** | DB/migrations reference templates; no UI | High ROI — build template library |

---

### Medium Priority — Engineering Quality

#### 5. Automated tests
- **Current:** No test files in the project.
- **Start with:**
  - Auth + token refresh
  - Join session (all join types)
  - Submit response + scoring
  - Present view token + slide sync
  - Q&A moderation

#### 6. Split large page components
- `BuilderPage.jsx` (~2,400 lines)
- `LivePage.jsx` (~1,200 lines)
- `ParticipantSessionPage.jsx` (~2,000 lines)
- **Action:** Extract into feature modules (hooks, subcomponents, services).

#### 7. CI/CD pipeline
- Lint, build, migration check, deploy (e.g. GitHub Actions).

#### 8. Docker Compose for local dev
- MySQL + API + Frontend in one command.

#### 9. Clean dead / duplicate code
- Duplicate `SessionsProvider` in `App.jsx` and `HostLayout.jsx`
- Legacy `SessionsContext` mock data (unused by Dashboard/Builder)
- Stub `SectionPage.jsx` (not routed)

#### 10. Other technical debt
- Centralized Express error middleware (beyond 404 handler)
- Enforce `features_enabled` / `subscription_tier` on Client model
- Update README files (outdated vs current codebase)
- Add `npm run migrate` script for Sequelize migrations
- WS token in query string — consider short-lived WS ticket to reduce log/referrer leakage

---

## New Features — Ranked by Value

### Tier 1 — Core Product (Best for Sales & Daily Use)

| # | Feature | Why |
|---|---------|-----|
| 1 | **Question & session templates** | Reuse across events; DB already hints at `template_id` |
| 2 | **Instruction / content slides** | Title, agenda, break slides in Present mode (not only questions) |
| 3 | **Import/export session packs** | JSON/Excel bulk import for enterprise reuse |
| 4 | **Scheduled auto-start** | `scheduled_date/time` exists; add auto-launch at scheduled time |
| 5 | **Team mode + team leaderboard** | Common for workshops and Kahoot-style events |
| 6 | **SSO (Azure AD / Google Workspace)** | Required for larger B2B clients |

---

### Tier 2 — Engagement (Mentimeter / Kahoot Feel)

| # | Feature | Why |
|---|---------|-----|
| 7 | **Live reactions** | Emoji pulse on screen (hearts, applause) |
| 8 | **Streak / correct-answer animations** | More energy in quiz mode |
| 9 | **Presenter remote** | Phone/tablet to control live session while walking the room |
| 10 | **Embed mode (iframe / LMS)** | SCORM/LMS integration for training |
| 11 | **Bulk invite** | Email/SMS participant lists beyond QR/link |
| 12 | **Open-text moderation queue** | Review responses before showing on present screen |

---

### Tier 3 — Analytics & Enterprise

| # | Feature | Why |
|---|---------|-----|
| 13 | **Cross-session trends** | Compare sessions over time per department/client |
| 14 | **AI question generation** | From PDF, document, or topic — strong differentiator |
| 15 | **Audit log** | Track who launched, edited, exported, moderated |
| 16 | **White-label per client** | Logo, colors, custom domain (`Client` model is a start) |
| 17 | **Subscription limits** | Enforce `subscription_tier` / `features_enabled` (max participants, etc.) |

---

### Tier 4 — Nice to Have

| # | Feature |
|---|---------|
| 18 | PowerPoint / Google Slides add-in |
| 19 | Participant PWA (installable, offline-tolerant) |
| 20 | Badges / gamification |
| 21 | Multi-language UI |

---

## Suggested Roadmap

### Phase 1 — 1 to 2 Weeks (Stability & Trust)

- [ ] Secure `/auth/register` endpoint
- [ ] Remove or replace `userPasswordVault` plaintext storage
- [ ] Fix `join_type` consistency (Builder → API → join)
- [ ] Implement or remove session password UI
- [ ] Wire Reports page to real response data
- [ ] Add CORS allowlist and rate limiting
- [ ] Persist present slide index (Redis or DB)

---

### Phase 2 — 2 to 4 Weeks (Quality & Host Productivity)

- [ ] API integration test suite (auth, join, responses, scoring)
- [ ] Question & session template library UI
- [ ] Instruction slides in Present mode
- [ ] Refactor Builder / Live / Participant into smaller modules
- [ ] CI/CD pipeline (lint, build, deploy)
- [ ] Docker Compose dev environment
- [ ] Update project READMEs

---

### Phase 3 — 1 to 3 Months (Enterprise & Scale)

- [ ] SSO (Azure AD, Google, SAML)
- [ ] Team mode and team leaderboard
- [ ] LMS / iframe embed SDK
- [ ] Redis pub/sub for WebSocket (horizontal scaling)
- [ ] White-label client portals
- [ ] Subscription tier enforcement
- [ ] AI-assisted question authoring
- [ ] Audit log for admin actions

---

## Quick Wins vs Medium vs Large Initiatives

### Quick Wins (Days Each)

| Action | Impact |
|--------|--------|
| Protect `/auth/register` with admin-only access | Closes critical security hole |
| Remove `userPasswordVault` plaintext storage | Security |
| Fix Reports to use live response API | Reports become trustworthy |
| Add CORS origin from environment | Production hardening |
| Add `npm run migrate` script | Ops clarity |
| Remove or implement session password UI | Stops user confusion |
| Remove duplicate `SessionsProvider` | Less confusion |

---

### Medium Initiatives (1–3 Weeks Each)

| Initiative | Scope |
|------------|-------|
| Test suite (API integration tests) | Auth, sessions, responses, scoring |
| Present slide persistence (Redis/DB) | Production reliability |
| Rate limiting on auth/join | Abuse prevention |
| Refactor Builder into subcomponents | Maintainability |
| Question template CRUD | Reuse existing DB concept |
| Instruction slides in present mode | New slide type in present flow |

---

### Larger Initiatives (1–3 Months Each)

| Initiative | Scope |
|------------|-------|
| SSO + enterprise auth | Azure AD, SAML |
| Multi-instance realtime (Redis pub/sub) | Horizontal scale |
| Full white-label + client portals | Per-client subdomain |
| Mobile-optimized participant PWA | Offline, installable |
| LMS embed SDK | Distribution channel |
| AI-assisted question authoring | Competitive feature |

---

## Product Positioning

### Recommended positioning

> **Corporate live polling & quiz platform** — multi-department admin, presenter + view displays, analytics, Q&A, and controlled participant joins.

### Double down on

1. **Presenter experience** — Present mode + view display + slide sync (already differentiated)
2. **Enterprise admin** — Clients, departments, roles, reports
3. **Session reuse** — Templates, duplicate, import/export

### Compete less on (initially)

- Consumer Kahoot-style gamification at massive scale
- Focus instead on **training, town halls, and internal corporate events** where admin and analytics matter

---

## Top 5 Recommendations

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| 1 | **Security hardening** | Register endpoint, secrets, CORS, rate limits |
| 2 | **Finish or remove stub features** | Password, fill blank, profanity, reports samples |
| 3 | **Question/session templates** | Fastest feature win for hosts |
| 4 | **Automated tests** | Join → answer → leaderboard → present sync |
| 5 | **Instruction slides** | Better Present mode for corporate training |

---

## Technical Reference

### Key Frontend Paths

```
Frontend/src/
├── pages/
│   ├── DashboardPage.jsx
│   ├── BuilderPage.jsx
│   ├── LivePage.jsx
│   ├── AnalyticsPage.jsx
│   ├── ReportsPage.jsx
│   ├── present-mode/
│   │   ├── PresentModePage.jsx
│   │   └── PresentViewPage.jsx
│   └── participant-session/
├── components/
│   ├── dashboard/ShareSessionPanel.jsx
│   └── live/HostQuestionControls.jsx
├── services/
│   ├── liveApi.js
│   ├── presentViewApi.js
│   └── realtimeClient.js
└── hooks/
    └── useLiveSession.js
```

### Key Backend Paths

```
Backend/src/
├── routes/
│   ├── session.routes.js
│   ├── present-view.routes.js
│   └── auth.routes.js
├── services/
│   ├── session.service.js
│   ├── present-view.service.js
│   └── websocket.service.js
└── models/
    └── (User, Client, Department, Session, Question, Response, etc.)
```

### Production URLs (Reference)

- Frontend: `https://demoquiz.netcastservice.online`
- API: `https://demoquizapi.netcastservice.online/api/v1`

### Present / View Display URLs

- Host Present: `/present?session={id}&present=1`
- View display: `/present/view?session={id}&token={viewerToken}`
- Participant join: `/join/{sessionCode}`

---

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | March 2026 | Initial roadmap based on full project analysis |

---

*This document was generated from a codebase analysis of the Netcast Quiz System. Update as features are implemented or priorities change.*

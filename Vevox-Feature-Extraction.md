# Vevox Quiz Platform – Full Feature Extraction & Gap Analysis

**What is Vevox?** Vevox is an audience engagement platform — a host runs a live session and people in the room or on a call join from their phone or laptop (session code or QR, no app download needed) and answer questions in real time. Started in 2008 as Lumi Technologies, renamed Vevox in 2017. Same category as Slido, Mentimeter, Kahoot — and us.

**Purpose of this document:** List everything Vevox offers in simple language, with special focus on what is **not in our quiz app today**. This version merges the earlier internal research document (`vevox_feature_research.docx`) with fresh research from Vevox's website and help centre, and it **corrects statuses that were outdated** — several features marked "missing" in the older research have since been built by us.

Each feature is marked:

- ❌ **Missing** – Vevox has it, we don't.
- 🟡 **Partial** – We have something close, but Vevox does it better or fuller.
- ✅ **Have it** – Already built in our app. No work needed.

---

## 1. Status corrections — things we have built since the old research

The older research document marked all of these as missing. They are now **done**, so ignore them in any older gap list:

| Feature | Old status | Current status |
|---|---|---|
| Ranking poll type (drag options into order) | Missing | ✅ Have it |
| AI question generation (topic + difficulty + count → questions with correct answers) | Missing | ✅ Have it |
| Duplicate / reuse a previous session | Missing | ✅ Have it (`duplicate session` exists) |
| Question library / question bank | Missing | 🟡 Partial (we have a question bank and question sets; we don't ship **ready-made general-topic content** out of the box) |
| Embed participant app in another web page | Missing | ✅ Have it (session embed tokens + embed pages) |
| Q&A: mark as answered | Partial | ✅ Have it (Q&A statuses: pending / approved / rejected / answered) |
| Q&A: highlight the question being discussed | Missing | ✅ Have it (pinned status) |
| Word/profanity filter | Partial | ✅ Have it (department-level profanity filter) |
| Fill-in-the-blank and emoji reaction types | not listed | ✅ Have it (bonus: Vevox doesn't have these) |
| Team management (account-level teams, seats, verification) | not listed | ✅ Have it (just built — note this is *account* teams, not *quiz* team leaderboards, which are still missing, see Section 8) |

---

## 2. Features already extracted (your original list)

Kept here so everything is in one place:

1. Search and add image from an image library (premium feature)
2. Close question button — ✅ we have this
3. Ready-made general topic sessions and questions (templates; free plan gets only free question types)
4. Re-use a previous session — ✅ we have this now
5. Android app for participants
6. Question types unlocked according to plan subscription
7. Add correct-answer explanation, shown after timer ends / question closes
8. Participant live status – online, in the session room
9. Deactivated team members shown separately in a tab
10. "Send feedback" option in the sidebar
11. Change theme in participant page
12. "Exit session" for participant in the sidebar
13. Marketing tabs in the participant page sidebar
14. Zoom, Google Slides and PowerPoint integrations
15. Embed Vevox app inside another page — ✅ we have this
16. App customization – primary color, secondary color, heading size, etc.
17. Toggle "participant requires password" for a session — ✅ we have passcode protection

---

## 3. Question / poll types

Vevox offers 10+ poll types. We currently have: MCQ, poll, true/false, rating, open text, word cloud, ranking, fill-in-the-blank, emoji reaction. Still missing from ours:

| Poll type | What it does (simple) | Status |
|---|---|---|
| **Numeric poll** | Participant types a number between a min and max the host sets. Can show average; can auto-mark a correct number in quiz mode. Very common for estimates, guesses, budgets. | ❌ Missing |
| **Number cloud** | Like a word cloud but with numbers — bigger number = submitted more often. Shows mean, median and mode. | ❌ Missing |
| **XY plot (scatter)** | Tap a point on a two-axis grid (e.g. urgent vs important). Every answer becomes a dot. Used for risk maps and opinion grids. | ❌ Missing |
| **Pin on image** | Host uploads a picture (map, product design, anatomy diagram); participants tap the exact spot to answer. | ❌ Missing |
| **Image poll / multichoice on image** | An MCQ where the answer options are pictures instead of text. We already support media on the question itself, so this is a small step. | ❌ Missing |
| **Matching poll** | Match items on the left to items on the right (country → capital). | ❌ Missing |
| **Demographic poll** | A special poll that tags people into groups (team, department, year) so all later results can be filtered by group. Also powers team leaderboards (Section 8). | ❌ Missing |
| **Quick poll (ad-hoc)** | Host creates a poll on the spot, mid-session, without leaving the present screen. Big time-saver. Quick polls are auto-saved to the dashboard after use. | ❌ Missing |
| **Slider rating** | Slide a handle between two labelled ends instead of picking stars. | 🟡 Partial (we have star/number rating) |
| **Before/after comparison** | Ask the same question before and after teaching a topic; show both results side by side. | ❌ Missing |
| **LaTeX notation** | Proper mathematical formulas inside questions. Only matters for maths/science education. | ❌ Missing |

---

## 4. Question builder / setup features

| Feature | What it does (simple) | Status |
|---|---|---|
| **Correct answer explanation** | Host writes a short reason why the answer is correct; shown to participants after the poll closes or the timer runs out. Turns a quiz into a teaching tool. | ❌ Missing (our AI service deliberately skips explanations too — one field + one display change) |
| **Built-in stock image library** | Search and insert a licensed image directly in the builder. Paid plans only on Vevox. | ❌ Missing (we support uploads, not a searchable library) |
| **Ready-made content / templates** | Sample sessions and quiz questions on general topics so a new host can run a session in two minutes without writing anything. | 🟡 Partial (question bank + question sets exist, but they start empty — no pre-loaded content) |
| **Rich text in questions** | Bold, italic, underline, paragraph breaks inside question text. | ❌ Missing |
| **Chart type choice** | Host picks bar or pie chart per question (pie is a paid feature on Vevox). | 🟡 Partial |
| **Duplicate / reuse a poll** | Copy an existing question instead of retyping. | 🟡 Partial (we can duplicate whole sessions; per-question copy is limited) |
| **Import / export polls** | Bulk upload questions from a file, download them, or export polls into a survey. | ❌ Missing |
| **Delete responses only** | Wipe a poll's answers but keep the question, so it can be run fresh again. | ❌ Missing |
| **Test mode** | Host tests polls, surveys and Q&A before the real session. | 🟡 Partial (we have a preview mode) |
| **Unlimited options per MCQ** | No cap on choices. | ✅ Have it (practically) |
| **Reorder polls after creation** | Change question order any time. | ✅ Have it |

---

## 5. AI features

| Feature | What it does (simple) | Status |
|---|---|---|
| **AI question helper** | Type a topic, AI writes questions with a correct answer and plausible wrong options; difficulty selectable. Free on Vevox as a sign-up hook. | ✅ Have it (topic, count, type, difficulty) |
| **AI quiz generator with explanations** | Builds a full quiz including the **explanation text for each answer**. | 🟡 Partial (we generate questions; explanations are excluded — depends on the missing "answer explanation" field from Section 4) |
| **AI word cloud grouping and sentiment** | AI groups similar word-cloud answers into themes and shows whether the mood is positive or negative (new in 2026). | ❌ Missing |

---

## 6. Participant identity & anonymity

Vevox has a much more detailed system than our simple anonymous/nickname approach. They have **five modes**:

| Mode | What it means |
|---|---|
| **Anonymous** (their default) | Nobody can tell who is who — not even the host or admin. Names never appear, not even in the data report. |
| **Identified** | Participant must type first + last name when joining. All answers linked to that name in reports. |
| **Show Names** | Names visible to everyone on the Q&A board next to each message. |
| **Hide Names** | Names collected but hidden publicly — only the host sees them in the report. |
| **Participant's Choice** | Each participant decides per message whether to be visible or anonymous. |

**The clever part:** even in Identified mode, individual poll votes stay confidential on screen — results only ever show as group totals. Names appear only in the downloaded report. The host gets accountability without participants feeling watched. Splitting our anonymous flag into "anonymous on screen" vs "identified in the report" would be a small change with real usability gain.

| Feature | Status |
|---|---|
| Five identity modes | 🟡 Partial (we have nickname join; not the mode system) |
| Identity-change notification (all participants instantly told if the host changes the setting mid-session) | ❌ Missing |
| Passcode protection works alongside every mode | ✅ Have it (passcode) |
| SAML SSO login for participants (enterprise) | ❌ Missing |
| Anonymity setting cascades from LMS integration | ❌ Missing (needs LMS integration first) |

---

## 7. Running a live session (Present View)

Vevox's big-screen display is called Present View, driven by a control bar (open poll, close poll, next poll, show leaderboard, re-open poll). We have a Present Mode; gaps:

| Feature | What it does (simple) | Status |
|---|---|---|
| **Re-open a closed poll** | Host closed a poll too early? Re-open it and let people vote again. A genuinely common need, easy to add. | ❌ Missing |
| **Real-time vs on-close results** | Host chooses whether results appear live as people vote, or only once the poll closes (their default — avoids people being influenced by others). | 🟡 Partial |
| **Non-polling content slides** | Plain content slides between questions — text, images, video, links — so the whole event runs inside the tool without PowerPoint. | ❌ Missing |
| **Countdown timer with music** | 8 built-in sound clips or the host's own MP3 plays during the countdown. Game-show feel. | ❌ Missing (our timer is silent) |
| **Flexible timer controls** | Pause, cancel, or add time (+10s / +30s / +1min) while the timer runs; poll auto-closes at zero. | 🟡 Partial |
| **Standalone timer display** | A countdown separate from questions (e.g. "5-minute break") on the big screen. | ❌ Missing |
| **Welcome message** | A host message on the participant's home screen before anything starts. | 🟡 Partial (session description exists; no dedicated welcome screen) |
| **Adjustable font size in present view** | One click to resize text for the room screen. | ❌ Missing |
| **Share a read-only present view** | Give a second screen/person a view-only link of the live display. | 🟡 Partial (we have embeds, not a dedicated read-only present share) |
| **Multiple sessions at once** | Paid plans let one host run several live sessions simultaneously. | ❌ Missing |
| **Skip ahead / jump between questions** | Move freely, skip several questions, hide/show results at will. | 🟡 Partial |
| Close question | ✅ Have it |
| One poll at a time (deliberate limit) | ✅ Have it |
| Unlimited questions per session | ✅ Have it |
| Connected participants counter | ✅ Have it |
| Reuse / duplicate a session | ✅ Have it |
| 9-digit session ID + QR code joining (ours is 6 characters — fine) | ✅ Have it |

---

## 8. Quiz gamification: scoring, teams, fun extras

| Feature | What it does (simple) | Status |
|---|---|---|
| **Speed scoring (fastest finger)** | Faster correct answers earn more points. Creates game-show energy. | ❌ Missing (we give fixed points per question) |
| **Speed leaderboard** | A separate leaderboard ranked by answer speed — can be shown even if speed scoring was off during setup. | ❌ Missing |
| **Team quizzes & team leaderboard** | See details below — this is quiz teams, different from our new account-level team management. | ❌ Missing |
| **Leaderboard insights** | Leaderboard screen also shows average score, the hardest questions, and participant count. | 🟡 Partial |
| **Leaderboard as a slide** | Place the leaderboard at a fixed point in the session so it appears automatically. | ❌ Missing |
| **Show leaderboard any time** | Bring the leaderboard up at any moment, not just at the end. | 🟡 Partial |
| **Spin the Wheel** | Random-picker wheel with sound effects — pick prize winners or random students. | ❌ Missing |
| **Personal score screen + share button** | Every participant always sees their own score on their own device (even anonymous) and can share/screenshot it; host can ask to see it to verify a prize winner. | 🟡 Partial (scores shown; no share/verify flow) |
| **Weighted scoring** | Different questions worth different points. | ✅ Have it (points per question) |

### How Vevox team leaderboards work (worth copying carefully)

1. The host runs a **demographic poll**, e.g. "Which team are you on?" — this puts each person into a group.
2. The host marks that question as the "Team question" in the leaderboard panel.
3. A Team Leaderboard then appears alongside the individual one. The host can switch which question drives teams, or pick "No Teams".

**The scoring maths is clever:** team scores are the **average** of members' scores, not the sum — so a team of twenty doesn't automatically beat a team of five. If every member answers correctly the team gets 100 points for that question; half correct = 50; a third = 33. Points accumulate across questions.

**Their warning:** don't re-open the team question mid-quiz — it disturbs scores already calculated. If we build this, we need the same guard (block re-opening, or recalculate all team scores). Also: team leaderboard scores are left **out** of the downloaded data report, and only one demographic question can be the team question at a time.

---

## 9. Q&A board

Ours is close to theirs — we have anonymous questions, upvoting, moderation (pending/approved/rejected), mark-as-answered, and pinning/highlighting. Remaining gaps:

| Feature | What it does (simple) | Status |
|---|---|---|
| **Downvotes** | Optional setting letting people vote questions DOWN as well as up, so the host can skip low-value ones. | ❌ Missing |
| **Put Q&A on hold** | A middle state — not off, but paused, so no new questions come in. Small UI change, big control gain. | ❌ Missing |
| **Labels / categories** | Host creates labels ("Salary", "Policy", "Tech"); questions get tagged; participants can attach a label when submitting. Keeps big boards manageable. | ❌ Missing |
| **Name visibility options** | The three Q&A name modes from Section 6 (show / hide / participant's choice). | ❌ Missing |
| **Participant-side sorting & filtering** | Each participant sorts their own board by "most recent" / "most liked" and filters it when busy. | ❌ Missing |
| **Announcements** | Host pushes a short message to every participant's screen ("Lunch at 1pm"). | ❌ Missing |
| **Q&A board as default screen** | In present view, when no poll is open, the big screen automatically shows the Q&A board. | ❌ Missing |
| **Written reply to a question** | Host types a reply visible to participants. | ❌ Missing |
| Turn Q&A off entirely for a session | 🟡 Partial |
| Anonymous or identified questions | ✅ Have it |
| Upvoting | ✅ Have it |
| Moderation (preview before public) | ✅ Have it |
| Mark as answered / archive | ✅ Have it |
| Highlight current question | ✅ Have it (pinned) |
| Profanity filter on Q&A | ✅ Have it |

---

## 10. Surveys (self-paced / offline)

Vevox's line between polls and surveys is about **timing**: polls are answered live when the host opens them; surveys are answered at the participant's own pace — during the session **or after it ends**. Surveys are a paid feature on Vevox.

| Feature | What it does (simple) | Status |
|---|---|---|
| **Self-paced surveys during a session** | Participants move through questions at their own speed. | ✅ Have it (survey sessions with subtypes) |
| **Asynchronous surveys (after the session)** | Survey stays open for days after the event; invitation is just a link. This is the genuine gap — ours are tied to a live session. An "open for X days after the session" mode would close it. | ❌ Missing |
| **Multiple surveys per session code** | e.g. pre-training + post-training survey under one code. | ❌ Missing |
| **Export polls into a survey** | Reuse live poll questions in a survey without rewriting. | ❌ Missing |
| **Live trend watching** | Host watches survey results build in real time as people submit. | ✅ Have it |
| **Survey analytics with participation rates** | Completion rates and per-question breakdowns. | 🟡 Partial |

---

## 11. Attendance & reporting

| Feature | What it does (simple) | Status |
|---|---|---|
| **Attendance tracking** | Record who joined, when they joined, and when they left. Universities use it for attendance; companies for compliance-training proof. Requires identified mode. | ❌ Missing (we know who participated, not join/leave times as a report) |
| **The "attendance check" trick** | Vevox teaches hosts to fake attendance with a poll: display a word/number on the room screen and ask people to type it in — remote people can't fake being present. Worth building as a real one-click "Attendance Check" feature for training departments (our target user). | ❌ Missing |
| **Attendance/score sync to LMS gradebook** | Scores flow automatically into Moodle/Canvas/Blackboard/Brightspace. | ❌ Missing |
| **Shareable infographics** | Auto-generated visual summary image to share after a session (not just a spreadsheet). | ❌ Missing |
| **Report respects identity setting** | Anonymous sessions produce reports with no names; identified include names; SSO/LMS logins include emails. | 🟡 Partial |
| Downloadable data reports | ✅ Have it |
| **Where we are AHEAD** | Department-level reporting, client-level aggregated reporting, per-question downloads, six structured report types vs their single Excel export. Vevox has no department/client concept at all. | ✅ Our advantage |

---

## 12. Integrations

Vevox's approach (like Slido's): a side panel inside the meeting tool.

| Integration | What it does (simple) | Status |
|---|---|---|
| **PowerPoint add-in** | Polls embedded directly in slides; runs inside the slideshow, supports PowerPoint Presenter View. Their users call this their best feature. | ❌ Missing |
| **Google Slides add-on** | Same for Google Slides decks. | ❌ Missing |
| **Microsoft Teams** | Polls, quizzes, surveys, Q&A inside the Teams side panel. Free on all Vevox plans, works on mobile and in webinars. | ❌ Missing |
| **Zoom** | Side panel inside Zoom meetings/webinars (desktop app only). | ❌ Missing |
| **Webex** | Their most powerful integration per their own marketing. | ❌ Missing |
| **LMS / LTI (Moodle, Canvas, Blackboard, Brightspace)** | Students open the quiz from their university portal, auto-logged-in, grades flow back. Institution plans. | ❌ Missing |
| **SAML SSO** | Staff log in with their office account. Enterprise plans. | ❌ Missing |
| **SCIM deprovisioning** | Employee leaves the company → account auto-deactivated. Enterprise. | ❌ Missing |
| **Embed video inside sessions** | YouTube/Vimeo stream embedded so the audience watches and votes in one window. | 🟡 Partial (we support video embeds on questions) |
| Screen-share fallback (share Present View for platforms with no integration) | ✅ Have it |
| Embed participant app in another web page | ✅ Have it |

**Useful implementation detail:** Teams allows up to 10,000 attendees but only the first 1,000 get the full experience — everyone beyond is view-only and must open the participant app in a separate tab with the session ID. Any integration we build needs the same fallback path.

---

## 13. Branding, customization & the participant app

| Feature | What it does (simple) | Status |
|---|---|---|
| **Branding UI** | Primary/secondary colours, heading sizes, imagery/backgrounds, custom text throughout the participant app. | 🟡 Partial — **our schema already has** `primary_color`, `secondary_color`, `logo_url`, `custom_domain` on clients; the admin UI to use them is what's missing. Closer to done than most items here. |
| **Participant theme switch** | Participant switches their own view, e.g. light/dark. | ❌ Missing |
| **Exit session** | Clear way for a participant to leave, in the sidebar. | ❌ Missing |
| **Send feedback** | Feedback option in the participant sidebar going back to the platform. | ❌ Missing |
| **Marketing tabs** | Promotional/informational tabs in the participant sidebar. | ❌ Missing |
| **Welcome/home tab** | Home tab showing the host's welcome message before any poll opens. | ❌ Missing |
| **Q&A speech-bubble tab that disappears when Q&A is off** | | 🟡 Partial |
| **Individual score display** | Each participant sees their own score on their own device when revealed. | 🟡 Partial |
| **Android participant app** | Native app exists as an option, but their own FAQ says the browser is enough. Low return for the effort. | ❌ Missing (deliberately) |
| **Participant live status** | Who is online and currently in the session room; deactivated team members shown in a separate tab. **Our `participants` table already stores `socket_id` and `last_active_at` — this is mostly a UI job.** | ❌ Missing (UI) |

---

## 14. Plans, account & team administration

What Vevox gates by plan (tells us what customers pay for): surveys, the image library, pie charts, advanced poll types, concurrent sessions, SSO, LMS integration. Basic polls/Q&A/quizzes **and AI generation** are free — AI is their sign-up hook.

| Feature | What it does (simple) | Status |
|---|---|---|
| **Feature gating by plan tier** | Question types and features unlock by subscription. | 🟡 Partial (we gate participants, questions, team seats and expiry by plan; we don't gate question types or features yet — schema support exists) |
| **Roles & permissions for enterprise accounts** | Who can create, present, administer. | 🟡 Partial (we have five roles — arguably ahead) |
| **Company-wide defaults & libraries** | Org-level default surveys, quizzes, question libraries and branding pushed to every user. | 🟡 Partial |
| **Session collaboration (co-hosts)** | Several people on one session — one drives slides, another moderates Q&A. | ❌ Missing (one host per session) |
| **Account-level analytics** | Usage across all users: sessions run, participation trends, who uses the tool. | 🟡 Partial (client/department analytics exist) |
| **"Active user" fair pricing** | Institutions pay only for users who used the tool that year. Commercial idea. | — pricing idea |
| **Single-event plans** | One-time price for a 7-day event instead of an annual subscription ($195 / $675 on Vevox). | — pricing idea |
| **30-day money-back guarantee** on Pro | | — policy idea |
| Account-level team management (leads + members, seats, email verification) | | ✅ Have it (just built) |

---

## 15. Where we are already ahead of Vevox

Worth stating clearly, because the gap list above is long and can look worse than it is:

1. **Client and Department structure** — Vevox has no organisational hierarchy at all; every session belongs to one individual host.
2. **Department-level and client-level analytics** — nothing comparable on their side.
3. **Role-based permissions across five roles** — theirs is much flatter.
4. **Six structured report types** with separate downloads, vs their single Excel export.
5. **Question types they don't have** — fill-in-the-blank and emoji reaction.
6. **Team management with email verification and seat add-ons** — their multi-user support only starts at Enterprise.
7. **Multi-organisation schema from day one** — theirs was not designed for it.

---

## 16. Gap summary & priority

Everything still missing, sorted by value vs effort.

### Tier 1 — build first (high value, low effort)

| Feature | Why it matters | Effort |
|---|---|---|
| Correct answer explanation | Turns a quiz into a teaching tool. One text field + one display change; also unlocks AI-generated explanations. | Very low |
| Re-open a closed poll | Hosts close polls too early all the time. Small fix, immediate relief. | Very low |
| Q&A on hold + downvotes | Small UI states that make live sessions feel controlled. | Very low |
| Numeric poll type | Common, simple, everything needed already exists. | Low |
| Quick poll (ad-hoc) | Create a poll mid-session without leaving present mode. Very visible in demos. | Low |
| Participant live status panel | `socket_id` and `last_active_at` already stored — purely a UI build. | Low |
| Countdown timer sounds/music | Cheap game-show energy. | Low |
| Announcements to participants | One broadcast message, big live-event value. | Low |

### Tier 2 — build next (high value, medium effort)

| Feature | Why it matters | Effort |
|---|---|---|
| Speed scoring + speed leaderboard | Real competitive energy in quizzes. | Medium |
| Team quizzes & team leaderboard (average-based scoring) | Strong for corporate training — our target market; pairs with our new team management. | Medium |
| Five identity modes (anonymous on screen, identified in report) | A real accountability-without-surveillance need. | Medium |
| Attendance check mode | Turns their manual trick into a one-click feature for training teams. | Medium |
| Async survey mode ("open X days after session") | Our surveys are live-only today. | Medium |
| Image poll type (picture options) | We support media already; extends it to options. | Medium |
| Branding UI | Schema fields already exist; only the admin UI is missing. | Medium |
| Ready-made content / templates | Lets a new host run a session in two minutes. Content work more than code work. | Medium |
| Participant polish: theme, exit, feedback, welcome tab | Makes the participant app feel finished. | Low–Medium |
| Q&A labels + participant sorting + host replies | Keeps big boards manageable. | Medium |

### Tier 3 — build later (lower value or higher effort)

| Feature | Why lower priority | Effort |
|---|---|---|
| Teams / Zoom / Webex side panels | High value but blocked by each platform's app review process. | High |
| PowerPoint & Google Slides add-ins | Their most-loved feature, but a separate product surface to build and maintain. | High |
| Pin on image | Useful for training; needs coordinate capture + click-map UI. | High |
| Matching poll | Nice for education, less relevant for corporate. | Medium |
| Number cloud | Just a numeric poll with a different chart — do after numeric. | Medium |
| Non-polling content slides | Nice-to-have once present mode is richer. | Medium |
| Import / export polls | Power-user feature. | Medium |
| Concurrent sessions | Plan-gated capability, niche demand. | Medium |
| XY plot | Niche: risk and strategy workshops. | High |
| SSO (SAML) + SCIM | Needed only for big enterprise deals. | High |
| LMS / LTI integration + gradebook sync | Only if we enter the education market. | High |
| Shareable infographics | Nice marketing touch, not core. | Medium |
| LaTeX support | Maths/science education only. | Medium |
| Android participant app | Browser already works fine. Low return. | High |

---

*Sources: internal research document (`vevox_feature_research.docx`), vevox.com feature and pricing pages, help.vevox.com help articles, and third-party reviews (wooclap.com, rework.com), checked September 2026. All statuses verified against the current code of our quiz app (Backend Quiz + Frontend Admin + Frontend Website), including features added after the original research was written.*

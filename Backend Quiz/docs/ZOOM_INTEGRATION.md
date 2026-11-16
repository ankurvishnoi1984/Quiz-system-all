# Zoom Apps integration

## Develop without Zoom credentials

Most of the flow works in a browser using mock meeting context:

- Open host: `/zoom/app?mockMeetingUuid=dev-meeting-1&mockRole=host`
- Open participant: `/zoom/app?mockMeetingUuid=dev-meeting-1&mockRole=participant`

Host signs in, enters a session code, which binds that session to `dev-meeting-1`.
Participant opens the same mock meeting UUID and joins the bound session.

## Database

Run once:

```bash
mysql -u root -p quiz_db < Backend\ Quiz/scripts/create-zoom-tables.sql
```

## Environment variables (add when Zoom Developer app is ready)

Backend (`.env`):

```
ZOOM_APP_ENABLED=true
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_REDIRECT_URI=https://<api-host>/api/v1/integrations/zoom/oauth/callback
ZOOM_WEBHOOK_SECRET=
# SPA origin only — NOT the API host. Wrong value → after Connect, browser hits API /zoom/app → JSON "Route not found".
FRONTEND_PUBLIC_URL=https://<frontend-host>
```

Demo staging:

```
ZOOM_REDIRECT_URI=https://demoquizapi.netcastservice.online/api/v1/integrations/zoom/oauth/callback
FRONTEND_PUBLIC_URL=https://highq.netcastservice.online
```

`GET /integrations/zoom/status` returns `frontend_public_url` and `frontend_public_url_ok` so you can confirm the redirect target before Connect.

Frontend (`Frontend Admin/.env`):

```
VITE_ZOOM_APP_ENABLED=true
VITE_ZOOM_MOCK_CONTEXT=true
```

Set `VITE_ZOOM_MOCK_CONTEXT=false` when loading inside a real Zoom meeting.

## Zoom Marketplace app checklist

1. Create a **Zoom App** (Meeting App) at https://marketplace.zoom.us/
2. Set **Home URL** to the SPA (demo: `https://highq.netcastservice.online/zoom/app`) — never the API host
3. Allowlist your frontend + API domains
4. Add OAuth redirect URI matching `ZOOM_REDIRECT_URI` (API callback — that part stays on demoquizapi)
5. Subscribe to `meeting.ended` (optional) → webhook URL `https://<api-host>/api/v1/integrations/zoom/webhooks`
6. Paste Client ID / Secret into backend env; set `FRONTEND_PUBLIC_URL` to the SPA origin; restart API
7. After Connect, browser address bar must be `<frontend>/zoom/app?oauth=connected` (not API JSON)

If status shows the correct `FRONTEND_PUBLIC_URL` but Connect still lands on the API `/zoom/app` JSON page, IIS ARR is rewriting the OAuth `Location` header. The API oauth callback returns an HTML/JS handoff for this reason — redeploy that controller change. Optionally disable ARR “reverse rewrite host in response headers” for the API site.

## Windows: `chrome.webview=true` but `lastConfig=(none)`

SPA boot settles briefly on WebView2, then calls `config()` with only `getRunningContext`, retries once, then expands capabilities. The on-screen diagnostic includes `webviewMessages=N`.

If `webviewMessages=0`, Zoom sent no native replies — push Marketplace Surface domains `highq…` and `demoquizapi…` to **Allowed** (not “requires review”), finish Local Test, remove/re-add the app, then retest on Windows. Operator checklist: `docs/Zoom-Windows-DevTools-Checklist.html`.

## Linux Zoom Workplace

Apps SDK is unsupported. The SPA hard-fails with a clear message (no `dev-meeting-local` browser demo). Use Windows or macOS for the real in-meeting flow.

## API surface

| Method | Path | Auth |
|--------|------|------|
| GET | `/integrations/zoom/status` | public |
| GET | `/integrations/zoom/status/me` | staff |
| POST | `/integrations/zoom/oauth/start` | staff |
| GET | `/integrations/zoom/oauth/callback` | Zoom redirect |
| POST | `/integrations/zoom/oauth/disconnect` | staff |
| GET | `/integrations/zoom/meeting-session?meeting_uuid=` | public |
| PUT | `/integrations/zoom/meeting-session` | staff + sessions/present |
| DELETE | `/integrations/zoom/meeting-session` | staff |
| POST | `/integrations/zoom/meeting-session/join` | public |
| POST | `/integrations/zoom/webhooks` | Zoom signature |

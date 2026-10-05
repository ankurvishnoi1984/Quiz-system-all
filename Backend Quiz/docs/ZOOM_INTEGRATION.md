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
```

Frontend (`Frontend Admin/.env`):

```
VITE_ZOOM_APP_ENABLED=true
VITE_ZOOM_MOCK_CONTEXT=true
```

Set `VITE_ZOOM_MOCK_CONTEXT=false` when loading inside a real Zoom meeting.

## Zoom Marketplace app checklist

1. Create a **Zoom App** (Meeting App) at https://marketplace.zoom.us/
2. Set Home URL to `https://<frontend>/zoom/app`
3. Allowlist your frontend + API domains
4. Add OAuth redirect URI matching `ZOOM_REDIRECT_URI`
5. Subscribe to `meeting.ended` (optional) → webhook URL `https://<api-host>/api/v1/integrations/zoom/webhooks`
6. Paste Client ID / Secret into backend env

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

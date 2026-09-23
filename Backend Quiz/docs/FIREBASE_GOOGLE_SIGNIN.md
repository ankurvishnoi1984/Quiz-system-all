# Firebase Google Sign-In setup

Google sign-in uses **Firebase Authentication** on the client and **Firebase Admin** on the API.
Application sessions stay on our existing MySQL users + JWT. Do not enable Identity Platform MAU billing unless you intentionally upgrade.

## 1. Firebase Console

1. Create (or open) a Firebase project.
2. **Authentication → Sign-in method → Google → Enable**.
3. **Authentication → Settings → Authorized domains** add:
   - `localhost`
   - `highq.netcastservice.online` (Host Portal)
   - your marketing website production host
4. **Project settings → Your apps → Web** — copy the web config into frontend env vars below.
5. **Project settings → Service accounts → Generate new private key** — use on the **backend only** (never commit; never put in `VITE_*`).

## 2. Backend Quiz `.env`

**Do not leave the doc placeholders.** `google_auth_enabled` stays `false` until Firebase Admin can initialize with a real service account.

### Recommended: JSON file path

1. Firebase Console → Project settings → Service accounts → **Generate new private key**
2. Save the JSON somewhere outside git (e.g. `Backend Quiz/secrets/firebase-service-account.json` — already gitignored patterns apply)
3. In `.env`:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
FIREBASE_AUTH_ENABLED=true
```

You can omit `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` when using the file path.

### Alternative: env fields

```bash
FIREBASE_PROJECT_ID=your-real-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_REAL_PROJECT.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
FIREBASE_AUTH_ENABLED=true
```

Common mistakes that keep `google_auth_enabled: false`:

- Leaving `firebase-adminsdk-xxxxx@your-project...` from the docs
- Truncating `FIREBASE_PRIVATE_KEY` or omitting `BEGIN/END PRIVATE KEY`
- Frontend `VITE_FIREBASE_*` alone — the **API** needs Admin credentials for `/auth/features` → `google_auth_enabled`
- Not restarting the backend after editing `.env`

After fixing, restart the API and check `GET /api/v1/auth/features` — `google_auth_enabled` should be `true`. Watch the API log for `Firebase Admin init failed:` if it is still false.

Also run the migration:

```bash
npx sequelize-cli db:migrate
# or your usual migrate command for
# migrations/20260923120000-add-firebase-uid-nullable-password.js
```

Install: `npm install` (adds `firebase-admin`).

## 3. Frontend Admin + Frontend Website `.env`

Same Firebase web app values on both SPAs:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=https://demoquizapi.netcastservice.online/api/v1
```

Install: `npm install` (adds `firebase`).

## 4. Behaviour summary

| Surface | Behaviour |
|--------|-----------|
| Host Portal login | Firebase popup → `POST /auth/google` → app JWT. Unknown email → register on website first. |
| Website register | Google pre-fills name/email; mobile + plan + payment still required; signup sends `firebase_id_token`. |
| Existing password user | Same Google email links `firebase_uid` and signs in. |
| Password login OTP | Unchanged; Google login skips OTP. |

## 5. Security

- Never commit `*-firebase-adminsdk*.json` or put Admin private keys in Vite env.
- Only trust email/name/picture from verified Firebase ID tokens on the server.
- Protected APIs continue to use `Authorization: Bearer <app JWT>` only.

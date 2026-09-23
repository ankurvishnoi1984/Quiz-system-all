/**
 * Firebase Admin SDK — server-side only.
 *
 * Configure via Backend Quiz `.env` (never expose to Vite):
 *   FIREBASE_PROJECT_ID=
 *   FIREBASE_CLIENT_EMAIL=
 *   FIREBASE_PRIVATE_KEY=   (full PEM; use \n for newlines, keep surrounding quotes)
 * Or (recommended — easier than pasting the key):
 *   FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/or/relative/path/to/serviceAccount.json
 *
 * Optional: FIREBASE_AUTH_ENABLED=true|false (default: enabled when credentials exist)
 */
const fs = require("fs");
const path = require("path");
const { parseFlag } = require("./integrations");

let adminApp = null;
let initError = null;
let initialized = false;

function stripWrappingQuotes(value) {
  const text = String(value || "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function normalizePrivateKey(raw) {
  if (raw == null || raw === "") return "";
  let key = stripWrappingQuotes(raw);
  // dotenv usually keeps literal \n sequences from quoted values
  key = key.replace(/\\n/g, "\n");
  // Some editors paste the key with real newlines already — keep them
  return key.trim();
}

function looksLikePlaceholderEmail(email) {
  const value = String(email || "").toLowerCase();
  return (
    !value ||
    value.includes("xxxxx") ||
    value.includes("your-project") ||
    value.includes("example.com")
  );
}

function looksLikeValidPrivateKey(key) {
  return (
    Boolean(key) &&
    key.includes("BEGIN PRIVATE KEY") &&
    key.includes("END PRIVATE KEY") &&
    key.length > 200
  );
}

function loadServiceAccountFromEnv() {
  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId && !clientEmail && !privateKey) return null;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env incomplete: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or use FIREBASE_SERVICE_ACCOUNT_PATH)"
    );
  }

  if (looksLikePlaceholderEmail(clientEmail)) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL still looks like a placeholder. Paste the real client_email from your Firebase service account JSON."
    );
  }

  if (!looksLikeValidPrivateKey(privateKey)) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is invalid. Paste the full private_key from the service account JSON (including BEGIN/END PRIVATE KEY lines). Prefer FIREBASE_SERVICE_ACCOUNT_PATH instead."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey
  };
}

function loadServiceAccountFromFile() {
  const rawPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "").trim();
  if (!rawPath) return null;

  const resolved = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${resolved}`);
  }

  const json = JSON.parse(fs.readFileSync(resolved, "utf8"));
  const projectId = json.project_id;
  const clientEmail = json.client_email;
  const privateKey = normalizePrivateKey(json.private_key);

  if (!projectId || !clientEmail || !looksLikeValidPrivateKey(privateKey)) {
    throw new Error(
      `Firebase service account file is missing project_id, client_email, or private_key: ${resolved}`
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey
  };
}

function ensureInitialized() {
  if (initialized) return adminApp;
  initialized = true;

  try {
    const credentials = loadServiceAccountFromEnv() || loadServiceAccountFromFile();
    if (!credentials?.projectId || !credentials?.clientEmail || !credentials?.privateKey) {
      initError = new Error(
        "Firebase Admin credentials are not configured (set FIREBASE_* env vars or FIREBASE_SERVICE_ACCOUNT_PATH)"
      );
      console.warn(`[firebase-admin] ${initError.message}`);
      return null;
    }

    // Lazy require so the API boots even when firebase-admin is unused.
    const admin = require("firebase-admin");
    if (admin.apps.length) {
      adminApp = admin.app();
    } else {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: credentials.projectId,
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey
        })
      });
    }
    console.info(
      `[firebase-admin] initialized for project ${credentials.projectId}`
    );
    return adminApp;
  } catch (err) {
    initError = err;
    console.error("Firebase Admin init failed:", err.message);
    return null;
  }
}

function isFirebaseAuthConfigured() {
  const forced = process.env.FIREBASE_AUTH_ENABLED;
  if (forced !== undefined && forced !== "") {
    if (!parseFlag(forced, false)) return false;
  }
  return Boolean(ensureInitialized());
}

function getFirebaseAuth() {
  const app = ensureInitialized();
  if (!app) {
    const error = new Error(
      initError?.message || "Google sign-in is not configured on the server"
    );
    error.statusCode = 503;
    throw error;
  }
  return require("firebase-admin").auth(app);
}

/**
 * Verify a Firebase ID token and return a normalized identity.
 * Never trust client-supplied email/name/picture — only token claims.
 */
async function verifyFirebaseIdToken(idToken) {
  const token = String(idToken || "").trim();
  if (!token) {
    const error = new Error("idToken is required");
    error.statusCode = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = await getFirebaseAuth().verifyIdToken(token);
  } catch (err) {
    const error = new Error("Invalid or expired Google sign-in token");
    error.statusCode = 401;
    throw error;
  }

  const email = String(decoded.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    const error = new Error("Google account email is required");
    error.statusCode = 400;
    throw error;
  }

  if (decoded.email_verified !== true) {
    const error = new Error("Google account email is not verified");
    error.statusCode = 400;
    throw error;
  }

  return {
    uid: String(decoded.uid),
    email,
    name: String(decoded.name || "").trim() || null,
    picture: String(decoded.picture || "").trim() || null,
    email_verified: true
  };
}

module.exports = {
  isFirebaseAuthConfigured,
  getFirebaseAuth,
  verifyFirebaseIdToken
};

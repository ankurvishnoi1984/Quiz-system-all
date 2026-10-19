/**
 * Load-test dummy participants: join, optional WebSocket, then attempt questions.
 *
 * Dynamic knobs (CLI flags override env vars):
 *   --join-count / JOIN_COUNT                 how many join (default 100)
 *   --attempt-count / ATTEMPT_COUNT           how many of those submit (default = join)
 *   --join-concurrency / JOIN_CONCURRENCY     parallel joins (default 10; capped by join-ip-max)
 *   --attempt-concurrency / ATTEMPT_CONCURRENCY  parallel attempters (default 15)
 *   --questions-per-user / QUESTIONS_PER_USER max questions each submits; 0 = all (default 0)
 *   --session / SESSION_CODE                  required session code
 *   --api / API_BASE_URL                      …/api/v1 (default http://localhost:5000/api/v1)
 *   --ws / --no-ws / WS_ENABLED               participant WebSockets (default on)
 *   --delay-ms / DELAY_MS                     pause between a user's submits
 *   --ws-hold-sec / WS_HOLD_SEC               keep sockets open after run (default 30)
 *
 * Join IP rate pacing (optional — wait after every JOIN_IP_MAX joins):
 *   Default OFF (burst). Turn ON when the live API enforces join IP rate limits.
 *   --join-rate-pace / JOIN_RATE_PACE=true    enable wait after every N joins
 *   --no-join-rate-pace / JOIN_RATE_PACE=false  disable wait (default; for RATE_LIMIT_ENABLED=false)
 *   --join-ip-max / JOIN_IP_MAX               joins per window when pacing on (default 20)
 *   --join-ip-window-ms / JOIN_IP_WINDOW_MS   window length (default 300000 = 5 min)
 *   --join-gap-ms / JOIN_GAP_MS               pause between starting each join (default 0 when pacing off, 300 when on)
 *   --max-retries / MAX_RETRIES               retries on 429/5xx (default 5)
 *
 * Examples:
 *   # Burst join (rate limits off on server):
 *   node scripts/load-test-participants.mjs \
 *     --api https://demoquizapi.netcastservice.online/api/v1 \
 *     --session ABC123 \
 *     --join-count 200 \
 *     --attempt-count 150 \
 *     --join-concurrency 20
 *
 *   # Pace joins when server enforces 20 / 5 min:
 *   node scripts/load-test-participants.mjs --session ABC123 --join-count 200 --join-rate-pace
 *
 *   JOIN_COUNT=50 ATTEMPT_COUNT=30 SESSION_CODE=ABC123 node scripts/load-test-participants.mjs
 *
 * Tips for clean runs: session join_type "name" (or anonymous), OTP off, customer match off.
 * Submits only work for questions that are live (activated on Live/Present).
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function loadWebSocketImpl() {
  if (typeof globalThis.WebSocket !== 'undefined') {
    return globalThis.WebSocket
  }
  const candidates = [
    join(__dirname, '../Backend Quiz/node_modules/ws'),
    join(__dirname, '../Backend/node_modules/ws'),
  ]
  for (const path of candidates) {
    try {
      return require(path)
    } catch {
      // try next
    }
  }
  throw new Error(
    'WebSocket not available. Use Node 22+, or run npm install in "Backend Quiz" (needs the ws package).',
  )
}

const WebSocketImpl = loadWebSocketImpl()

function parseArgs(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--ws') {
      flags.ws = true
      continue
    }
    if (arg === '--no-ws') {
      flags.ws = false
      continue
    }
    if (!arg.startsWith('--')) continue
    const eq = arg.indexOf('=')
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1)
      continue
    }
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next != null && !next.startsWith('--')) {
      flags[key] = next
      i += 1
    } else {
      flags[key] = true
    }
  }
  return flags
}

function pickString(cliVal, envVal, fallback = '') {
  if (cliVal != null && cliVal !== true) return String(cliVal).trim()
  if (envVal != null && String(envVal).trim() !== '') return String(envVal).trim()
  return fallback
}

function pickNumber(cliVal, envVal, fallback) {
  const raw = cliVal != null && cliVal !== true ? cliVal : envVal
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function pickBool(cliVal, envVal, fallback) {
  if (typeof cliVal === 'boolean') return cliVal
  if (cliVal === 'true' || cliVal === '1') return true
  if (cliVal === 'false' || cliVal === '0') return false
  if (envVal == null || envVal === '') return fallback
  return String(envVal).toLowerCase() !== 'false' && String(envVal) !== '0'
}

const cli = parseArgs(process.argv.slice(2))

const API_BASE_URL = pickString(
  cli.api,
  process.env.API_BASE_URL,
  'http://localhost:5000/api/v1',
).replace(/\/$/, '')
const WS_BASE_URL = deriveWsBaseUrl()
const SESSION_CODE = pickString(cli.session, process.env.SESSION_CODE, '')
  .trim()
  .toUpperCase()
const JOIN_COUNT = Math.max(
  1,
  pickNumber(cli['join-count'], process.env.JOIN_COUNT ?? process.env.USER_COUNT, 100),
)
const ATTEMPT_COUNT = Math.max(
  0,
  Math.min(
    JOIN_COUNT,
    pickNumber(cli['attempt-count'], process.env.ATTEMPT_COUNT, JOIN_COUNT),
  ),
)
/** Optional pacing window (only used when JOIN_RATE_PACE is on). */
const JOIN_IP_MAX = Math.max(
  1,
  pickNumber(cli['join-ip-max'], process.env.JOIN_IP_MAX, 20),
)
const JOIN_IP_WINDOW_MS = Math.max(
  1000,
  pickNumber(cli['join-ip-window-ms'], process.env.JOIN_IP_WINDOW_MS, 5 * 60 * 1000),
)
/** Default off — no wait after 20 joins (server rate limits often disabled for load tests). */
const JOIN_RATE_PACE = (() => {
  if (cli['no-join-rate-pace'] === true || cli['no-join-rate-pace'] === 'true') return false
  if (cli['join-rate-pace'] === true || cli['join-rate-pace'] === 'true') return true
  return pickBool(cli['join-rate-pace'], process.env.JOIN_RATE_PACE, false)
})()
const JOIN_GAP_MS = Math.max(
  0,
  pickNumber(
    cli['join-gap-ms'],
    process.env.JOIN_GAP_MS,
    JOIN_RATE_PACE ? 300 : 0,
  ),
)
const MAX_RETRIES = Math.max(0, pickNumber(cli['max-retries'], process.env.MAX_RETRIES, 5))

const JOIN_CONCURRENCY_RAW = Math.max(
  1,
  pickNumber(
    cli['join-concurrency'],
    process.env.JOIN_CONCURRENCY ?? process.env.CONCURRENCY,
    10,
  ),
)
/** Keep parallel joins from overshooting the IP window when pacing is on. */
const JOIN_CONCURRENCY = JOIN_RATE_PACE
  ? Math.min(JOIN_CONCURRENCY_RAW, JOIN_IP_MAX)
  : JOIN_CONCURRENCY_RAW
const ATTEMPT_CONCURRENCY = Math.max(
  1,
  pickNumber(
    cli['attempt-concurrency'],
    process.env.ATTEMPT_CONCURRENCY ?? process.env.CONCURRENCY,
    15,
  ),
)
const QUESTIONS_PER_USER = Math.max(
  0,
  pickNumber(cli['questions-per-user'], process.env.QUESTIONS_PER_USER, 0),
)
const DELAY_MS = Math.max(0, pickNumber(cli['delay-ms'], process.env.DELAY_MS, 0))
const WS_ENABLED = pickBool(cli.ws, process.env.WS_ENABLED, true)
const WS_TIMEOUT_MS = Math.max(
  1000,
  pickNumber(cli['ws-timeout-ms'], process.env.WS_TIMEOUT_MS, 15000),
)
const WS_HOLD_SEC = Math.max(0, pickNumber(cli['ws-hold-sec'], process.env.WS_HOLD_SEC, 30))
const REAL_NAMES = pickBool(cli['real-names'], process.env.REAL_NAMES, true)

const FIRST_NAMES = [
  'Aanya', 'Aditya', 'Aisha', 'Arjun', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Neha', 'Karan',
  'Isha', 'Rahul', 'Sneha', 'Dev', 'Meera', 'Nikhil', 'Pooja', 'Sanjay', 'Kavya', 'Amit',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'James', 'Mia', 'Ethan', 'Ava', 'Lucas',
  'Charlotte', 'Mason', 'Amelia', 'Logan', 'Harper', 'Benjamin', 'Ella', 'Henry', 'Grace', 'Daniel',
]

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Joshi', 'Mehta',
  'Khan', 'Das', 'Rao', 'Verma', 'Malhotra', 'Chopra', 'Bose', 'Pillai', 'Desai', 'Kapoor',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor',
  'Anderson', 'Thomas', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
]

/** @type {Set<import('ws')>} */
const activeSockets = new Set()

if (!SESSION_CODE) {
  console.error('Missing session code. Example: --session ABC123  or  SESSION_CODE=ABC123')
  process.exit(1)
}

function deriveWsBaseUrl() {
  if (process.env.WS_BASE_URL || cli['ws-base']) {
    return pickString(cli['ws-base'], process.env.WS_BASE_URL, '').replace(/\/$/, '')
  }

  if (API_BASE_URL.startsWith('https://')) {
    return `${API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/^https:/, 'wss:')}/ws`
  }

  if (API_BASE_URL.startsWith('http://')) {
    return `${API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/^http:/, 'ws:')}/ws`
  }

  return 'ws://localhost:5000/ws'
}

function buildParticipantWsUrl(sessionCode, token) {
  const params = new URLSearchParams({
    session: sessionCode,
    token,
    role: 'participant',
  })
  return `${WS_BASE_URL}?${params.toString()}`
}

function parseRetryAfterMs(response, payload) {
  const header = response.headers?.get?.('retry-after')
  if (header) {
    const asNum = Number(header)
    if (Number.isFinite(asNum) && asNum >= 0) return Math.ceil(asNum * 1000)
    const asDate = Date.parse(header)
    if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now())
  }
  const fromBody = Number(payload?.data?.retry_after_seconds ?? payload?.retry_after_seconds)
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody * 1000)
  return null
}

async function request(path, { method = 'GET', token, body, retries = MAX_RETRIES } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let attempt = 0
  while (true) {
    const started = Date.now()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    const latencyMs = Date.now() - started

    if (response.ok) {
      return { data: payload?.data, latencyMs, status: response.status }
    }

    const retryable = response.status === 429 || response.status >= 500
    const retryAfterMs = parseRetryAfterMs(response, payload)
    if (retryable && attempt < retries) {
      attempt += 1
      const backoffMs =
        retryAfterMs != null
          ? retryAfterMs
          : Math.min(30_000, 1000 * 2 ** (attempt - 1))
      const waitMs = Math.max(250, backoffMs) + 50
      process.stdout.write(
        `\n  retry ${attempt}/${retries} after HTTP ${response.status} — waiting ${(waitMs / 1000).toFixed(1)}s…`,
      )
      await sleep(waitMs)
      continue
    }

    const details = Array.isArray(payload?.errors) ? payload.errors.join('; ') : null
    const message = details
      ? `${payload?.message || 'Request failed'}: ${details}`
      : payload?.message || `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.latencyMs = latencyMs
    error.retryAfterMs = retryAfterMs
    throw error
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Serializes join starts so we stay under JOIN_IP_MAX per JOIN_IP_WINDOW_MS
 * (same fixed-window shape as Backend Quiz createIpRateLimiter).
 */
function createJoinRateGate({ max, windowMs, gapMs }) {
  let windowStart = Date.now()
  let count = 0
  let chain = Promise.resolve()
  let pauses = 0

  return {
    get pauses() {
      return pauses
    },
    async acquire() {
      const run = async () => {
        const now = Date.now()
        if (now - windowStart >= windowMs) {
          windowStart = now
          count = 0
        }
        if (count >= max) {
          const waitMs = Math.max(0, windowStart + windowMs - Date.now()) + 100
          pauses += 1
          const secs = Math.ceil(waitMs / 1000)
          process.stdout.write(
            `\n  join rate pace: ${max} joins / ${Math.round(windowMs / 1000)}s window hit — waiting ${secs}s…`,
          )
          await sleep(waitMs)
          windowStart = Date.now()
          count = 0
        }
        count += 1
        if (gapMs > 0) await sleep(gapMs)
      }
      const next = chain.then(run, run)
      chain = next.catch(() => {})
      await next
    },
  }
}

function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1))
  return sortedAsc[idx]
}

function summarizeLatencies(samples) {
  if (!samples.length) return { count: 0, avg: 0, p95: 0 }
  const sorted = [...samples].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  return {
    count: sorted.length,
    avg: Math.round(sum / sorted.length),
    p95: percentile(sorted, 95),
  }
}

function buildParticipantIdentity(index) {
  if (!REAL_NAMES) {
    const n = String(index).padStart(3, '0')
    return {
      nickname: `LoadTest User ${n}`,
      email: `loadtest${n}@loadtest.invalid`,
    }
  }

  const first = FIRST_NAMES[(index * 7 + 3) % FIRST_NAMES.length]
  const last = LAST_NAMES[(index * 11 + 5) % LAST_NAMES.length]
  const comboSpace = FIRST_NAMES.length * LAST_NAMES.length
  const suffix = Math.floor((index - 1) / comboSpace)
  const nickname = suffix > 0 ? `${first} ${last} ${suffix + 1}` : `${first} ${last}`
  const emailLocal = `${first}.${last}${index}`.toLowerCase().replace(/[^a-z0-9.]/g, '')

  return {
    nickname,
    email: `${emailLocal}@example.test`,
  }
}

function buildJoinPayload(index, joinType) {
  const identity = buildParticipantIdentity(index)

  if (joinType === 'anonymous') {
    return { is_anonymous: true, email: null, force_new_participant: true }
  }

  if (joinType === 'name_email' || joinType === 'name_email_mobile') {
    return {
      nickname: identity.nickname,
      email: identity.email,
      force_new_participant: true,
    }
  }

  return {
    nickname: identity.nickname,
    email: null,
    force_new_participant: true,
  }
}

function buildSubmitPayload(question, index) {
  const type = question.question_type
  const options = question.question_options || []

  if ((type === 'mcq' || type === 'true_false' || type === 'poll') && options.length) {
    const pick = options[index % options.length]
    if (question.allow_multiple_select) {
      return { question_id: question.question_id, option_ids: [pick.option_id] }
    }
    return { question_id: question.question_id, option_id: pick.option_id }
  }

  if (type === 'rating') {
    const min = Number(question.rating_min ?? 1)
    const max = Number(question.rating_max ?? 5)
    const rating = min + (index % (max - min + 1))
    return { question_id: question.question_id, rating_value: rating }
  }

  if (type === 'ranking' && options.length >= 2) {
    const order = [...options]
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((opt) => opt.option_id)
    return { question_id: question.question_id, ranking_order: order }
  }

  if (type === 'word_cloud') {
    const words = ['alpha', 'beta', 'gamma', 'delta', 'echo']
    return { question_id: question.question_id, text_response: words[index % words.length] }
  }

  return {
    question_id: question.question_id,
    text_response: `Load test response ${index}`,
  }
}

function normalizeQuestionsList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.questions)) return payload.questions
  return []
}

function isNodeWsSocket(ws) {
  return typeof ws.on === 'function'
}

function connectParticipantWebSocket(sessionCode, token) {
  return new Promise((resolve, reject) => {
    const url = buildParticipantWsUrl(sessionCode, token)
    let settled = false
    let ws

    try {
      ws = new WebSocketImpl(url)
    } catch (err) {
      reject(err)
      return
    }

    activeSockets.add(ws)

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }

    const timer = setTimeout(() => {
      try {
        if (isNodeWsSocket(ws)) ws.terminate()
        else ws.close()
      } catch {
        // ignore
      }
      activeSockets.delete(ws)
      finish(reject, new Error('WebSocket handshake timeout'))
    }, WS_TIMEOUT_MS)

    const handleMessage = (raw) => {
      try {
        const text = typeof raw === 'string' ? raw : raw.toString()
        const msg = JSON.parse(text)
        if (msg.type === 'connected') {
          finish(resolve, { ws, authStatus: msg.auth_status || 'unknown' })
        }
      } catch {
        // ignore non-json frames
      }
    }

    const handleError = (err) => {
      activeSockets.delete(ws)
      finish(reject, err instanceof Error ? err : new Error(String(err)))
    }

    const handleClose = () => {
      activeSockets.delete(ws)
      if (!settled) {
        finish(reject, new Error('WebSocket closed before handshake completed'))
      }
    }

    if (isNodeWsSocket(ws)) {
      ws.on('message', handleMessage)
      ws.on('error', handleError)
      ws.on('close', handleClose)
    } else {
      ws.addEventListener('message', (event) => handleMessage(event.data))
      ws.addEventListener('error', handleError)
      ws.addEventListener('close', handleClose)
    }
  })
}

function closeAllSockets() {
  for (const ws of activeSockets) {
    try {
      ws.close()
    } catch {
      // ignore
    }
  }
  activeSockets.clear()
}

async function joinParticipant(index, sessionMeta, joinGate) {
  if (joinGate) await joinGate.acquire()

  const joinPayload = buildJoinPayload(index, sessionMeta.join_type)
  const { data: joined, latencyMs: joinLatencyMs } = await request(
    `/sessions/join/${SESSION_CODE}`,
    { method: 'POST', body: joinPayload },
  )

  const token = joined.participant_token
  const sessionId = joined.participant?.session_id
  if (!token || !sessionId) {
    throw new Error('Join succeeded but token or session_id missing')
  }

  let wsConnected = false
  let wsAuthStatus = null

  if (WS_ENABLED) {
    const wsResult = await connectParticipantWebSocket(SESSION_CODE, token)
    wsConnected = true
    wsAuthStatus = wsResult.authStatus
  }

  return {
    index,
    token,
    sessionId,
    joinLatencyMs,
    wsConnected,
    wsAuthStatus,
  }
}

async function attemptParticipant(joiner) {
  const { data: questionPayload, latencyMs: listLatencyMs } = await request(
    `/sessions/${joiner.sessionId}/participantQuestions`,
    { token: joiner.token },
  )
  let questions = normalizeQuestionsList(questionPayload)
  if (QUESTIONS_PER_USER > 0) {
    questions = questions.slice(0, QUESTIONS_PER_USER)
  }

  let submitted = 0
  const submitLatencies = []

  for (const question of questions) {
    try {
      const payload = buildSubmitPayload(question, joiner.index)
      const { latencyMs } = await request('/responses/submit', {
        method: 'POST',
        token: joiner.token,
        body: payload,
      })
      submitLatencies.push(latencyMs)
      submitted += 1
      if (DELAY_MS) await sleep(DELAY_MS)
    } catch (err) {
      if (err.status === 400 && /not active|closed|not accepting/i.test(err.message)) {
        break
      }
      throw err
    }
  }

  return { submitted, listLatencyMs, submitLatencies }
}

async function runPool(total, concurrency, worker, onProgress) {
  let next = 1
  const outcomes = []
  const results = {
    ok: 0,
    fail: 0,
    errors: [],
  }

  async function runner() {
    while (true) {
      const index = next
      next += 1
      if (index > total) return

      try {
        const outcome = await worker(index)
        results.ok += 1
        outcomes.push({ ok: true, index, outcome })
        onProgress?.(results, total)
      } catch (err) {
        results.fail += 1
        outcomes.push({ ok: false, index, error: err })
        if (results.errors.length < 10) {
          results.errors.push(`#${index}: ${err.message}`)
        }
        onProgress?.(results, total)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => runner()))
  return { results, outcomes }
}

function printProgress(label, results, total) {
  const done = results.ok + results.fail
  process.stdout.write(`\r${label}: ${done}/${total} (ok ${results.ok}, fail ${results.fail})   `)
}

async function main() {
  console.log('Load test — participants (join → attempt)')
  console.log(`API:                 ${API_BASE_URL}`)
  console.log(`WS:                  ${WS_ENABLED ? WS_BASE_URL : 'disabled'}`)
  console.log(`Session:             ${SESSION_CODE}`)
  console.log(`Join count:          ${JOIN_COUNT}`)
  console.log(`Attempt count:       ${ATTEMPT_COUNT}`)
  console.log(`Join concurrency:    ${JOIN_CONCURRENCY}` +
    (JOIN_RATE_PACE && JOIN_CONCURRENCY_RAW !== JOIN_CONCURRENCY
      ? ` (requested ${JOIN_CONCURRENCY_RAW}, capped to join-ip-max)`
      : ''))
  console.log(`Attempt concurrency: ${ATTEMPT_CONCURRENCY}`)
  console.log(`Questions per user:  ${QUESTIONS_PER_USER || 'all listed'}`)
  console.log(`Hold WS:             ${WS_ENABLED ? `${WS_HOLD_SEC}s after test` : 'n/a'}`)
  if (JOIN_RATE_PACE) {
    const windows = Math.ceil(JOIN_COUNT / JOIN_IP_MAX)
    const minPaceSec = Math.max(0, (windows - 1) * (JOIN_IP_WINDOW_MS / 1000))
    console.log(
      `Join rate pace:      ON — wait after every ${JOIN_IP_MAX} joins / ${Math.round(JOIN_IP_WINDOW_MS / 1000)}s` +
        ` (gap ${JOIN_GAP_MS}ms) · ~${windows} window(s), ≥${Math.round(minPaceSec / 60)} min join pacing`,
    )
  } else {
    console.log(
      `Join rate pace:      OFF (no wait after ${JOIN_IP_MAX} joins)` +
        (JOIN_GAP_MS > 0 ? ` · gap ${JOIN_GAP_MS}ms` : '') +
        ' — use --join-rate-pace if the API enforces IP limits',
    )
  }
  console.log(`HTTP retries:        ${MAX_RETRIES} (429 / 5xx)`)
  console.log('')

  const { data: lookup } = await request(`/sessions/join/${SESSION_CODE}`)
  const session = lookup?.session
  if (!session) {
    throw new Error('Session not found for that code')
  }

  if (session.join_blocked) {
    throw new Error(session.join_blocked_message || 'Join is blocked for this session')
  }

  console.log(`Title:    ${session.title}`)
  console.log(`Status:   ${session.status}`)
  console.log(`Join as:  ${session.join_type}`)
  if (session.join_otp_required) {
    console.warn('Warning: OTP is required — joins will likely fail. Use a session with OTP off.')
  }
  if (session.customer_match_enabled) {
    console.warn('Warning: customer match is on — joins need verified emails.')
  }
  if (session.status !== 'live' && session.status !== 'paused') {
    console.warn('Warning: session is not live. Join may work but submit will likely fail until live.')
  }
  console.log('')

  const onSignal = () => {
    console.log('\nStopping — closing WebSocket connections…')
    closeAllSockets()
    process.exit(130)
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  const started = Date.now()

  // --- Join phase ---
  console.log('Phase 1: join')
  const joinStarted = Date.now()
  const joinLatencies = []
  let wsOk = 0
  let wsFail = 0
  const joinGate = JOIN_RATE_PACE
    ? createJoinRateGate({
        max: JOIN_IP_MAX,
        windowMs: JOIN_IP_WINDOW_MS,
        gapMs: JOIN_GAP_MS,
      })
    : JOIN_GAP_MS > 0
      ? createJoinRateGate({
          max: Number.MAX_SAFE_INTEGER,
          windowMs: JOIN_IP_WINDOW_MS,
          gapMs: JOIN_GAP_MS,
        })
      : null

  const joinPool = await runPool(
    JOIN_COUNT,
    JOIN_CONCURRENCY,
    async (index) => {
      const outcome = await joinParticipant(index, session, joinGate)
      joinLatencies.push(outcome.joinLatencyMs)
      if (WS_ENABLED) {
        if (outcome.wsConnected) wsOk += 1
        else wsFail += 1
      }
      return outcome
    },
    (results, total) => printProgress('Join', results, total),
  )
  process.stdout.write('\n')

  const successfulJoiners = joinPool.outcomes
    .filter((o) => o.ok)
    .map((o) => o.outcome)
    .sort((a, b) => a.index - b.index)

  const joinElapsed = ((Date.now() - joinStarted) / 1000).toFixed(1)
  const joinLatency = summarizeLatencies(joinLatencies)
  console.log(
    `Join done in ${joinElapsed}s — ok ${joinPool.results.ok}, fail ${joinPool.results.fail}` +
      (WS_ENABLED ? `, ws ${wsOk}/${joinPool.results.ok + joinPool.results.fail}` : '') +
      (joinGate?.pauses ? `, rate pauses ${joinGate.pauses}` : ''),
  )
  if (joinLatency.count) {
    console.log(`Join latency: avg ${joinLatency.avg}ms, p95 ${joinLatency.p95}ms`)
  }
  console.log('')

  // --- Attempt phase ---
  const attempters = successfulJoiners.slice(0, ATTEMPT_COUNT)
  let attemptOk = 0
  let attemptFail = 0
  let submittedTotal = 0
  const attemptErrors = []
  const submitLatencies = []
  const listLatencies = []

  if (ATTEMPT_COUNT > 0 && attempters.length > 0) {
    console.log(`Phase 2: attempt (${attempters.length} users)`)
    const attemptStarted = Date.now()

    const attemptPool = await runPool(
      attempters.length,
      ATTEMPT_CONCURRENCY,
      async (i) => {
        const joiner = attempters[i - 1]
        const outcome = await attemptParticipant(joiner)
        listLatencies.push(outcome.listLatencyMs)
        submitLatencies.push(...outcome.submitLatencies)
        return outcome
      },
      (results, total) => printProgress('Attempt', results, total),
    )
    process.stdout.write('\n')

    attemptOk = attemptPool.results.ok
    attemptFail = attemptPool.results.fail
    for (const row of attemptPool.outcomes) {
      if (row.ok) submittedTotal += row.outcome.submitted || 0
    }
    attemptErrors.push(...attemptPool.results.errors)

    const attemptElapsed = ((Date.now() - attemptStarted) / 1000).toFixed(1)
    const submitLatency = summarizeLatencies(submitLatencies)
    console.log(
      `Attempt done in ${attemptElapsed}s — ok ${attemptOk}, fail ${attemptFail}, answers ${submittedTotal}`,
    )
    if (submitLatency.count) {
      console.log(`Submit latency: avg ${submitLatency.avg}ms, p95 ${submitLatency.p95}ms`)
    }
    console.log('')
  } else {
    console.log('Phase 2: attempt skipped (attempt-count is 0 or no successful joins)')
    console.log('')
  }

  if (WS_ENABLED && WS_HOLD_SEC > 0 && activeSockets.size > 0) {
    console.log(
      `Holding ${activeSockets.size} WebSocket connection(s) for ${WS_HOLD_SEC}s (Ctrl+C to stop early)…`,
    )
    await sleep(WS_HOLD_SEC * 1000)
  }

  closeAllSockets()
  process.off('SIGINT', onSignal)
  process.off('SIGTERM', onSignal)

  const elapsedSec = ((Date.now() - started) / 1000).toFixed(1)

  console.log('======== Summary ========')
  console.log(`Total time:     ${elapsedSec}s`)
  console.log(`Join success:   ${joinPool.results.ok}/${JOIN_COUNT}`)
  console.log(`Join failed:    ${joinPool.results.fail}`)
  if (WS_ENABLED) {
    console.log(`WS connected:   ${wsOk}`)
    console.log(`WS failed:      ${wsFail}`)
  }
  if (ATTEMPT_COUNT > 0) {
    console.log(`Attempt success:${attemptOk}/${attempters.length}`)
    console.log(`Attempt failed: ${attemptFail}`)
    console.log(`Answers sent:   ${submittedTotal}`)
  }
  if (joinLatency.count) {
    console.log(`Join latency:   avg ${joinLatency.avg}ms / p95 ${joinLatency.p95}ms`)
  }
  const submitSummary = summarizeLatencies(submitLatencies)
  if (submitSummary.count) {
    console.log(`Submit latency: avg ${submitSummary.avg}ms / p95 ${submitSummary.p95}ms`)
  }

  const allErrors = [...joinPool.results.errors, ...attemptErrors]
  if (allErrors.length) {
    console.log('')
    console.log('Sample errors:')
    for (const line of allErrors.slice(0, 12)) console.log(`  - ${line}`)
  }

  if (joinPool.results.fail > 0 || attemptFail > 0) process.exit(1)
}

main().catch((err) => {
  closeAllSockets()
  console.error('')
  console.error('Load test failed:', err.message)
  process.exit(1)
})

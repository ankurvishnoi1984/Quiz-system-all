/**
 * Simulate many dummy participants joining a live session, opening WebSocket
 * connections (like real browsers), and optionally submitting answers.
 *
 * Usage (PowerShell):
 *   $env:API_BASE_URL="https://demoquizapi.netcastservice.online/api/v1"
 *   $env:WS_BASE_URL="wss://demoquizapi.netcastservice.online/ws"
 *   $env:SESSION_CODE="ABC123"
 *   $env:USER_COUNT="200"
 *   $env:CONCURRENCY="20"
 *   node scripts/load-test-participants.mjs
 *
 * Usage (bash):
 *   API_BASE_URL=https://your-api.com/api/v1 SESSION_CODE=ABC123 USER_COUNT=200 node scripts/load-test-participants.mjs
 *
 * Env:
 *   WS_ENABLED=false     — skip WebSocket (HTTP join only)
 *   JOIN_ONLY=true       — join (+ WS) only, no answer submit
 *   SUBMIT_ANSWERS=false — same as JOIN_ONLY for submits
 *   WS_HOLD_SEC=30       — keep sockets open after test (default 30)
 *   WS_TIMEOUT_MS=15000  — per-socket handshake timeout
 *   REAL_NAMES=false     — use "LoadTest User 001" style names again
 *
 * Submit answers only works for questions that are **live** (activated on Live page).
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
  try {
    return require(join(__dirname, '../Backend/node_modules/ws'))
  } catch {
    throw new Error(
      'WebSocket not available. Use Node 22+, or run npm install in Backend (needs the ws package).',
    )
  }
}

const WebSocketImpl = loadWebSocketImpl()

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')
const WS_BASE_URL = deriveWsBaseUrl()
const SESSION_CODE = (process.env.SESSION_CODE || '').trim().toUpperCase()
const USER_COUNT = Math.max(1, Number(process.env.USER_COUNT || 100))
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 15))
const SUBMIT_ANSWERS = process.env.SUBMIT_ANSWERS !== 'false'
const JOIN_ONLY = process.env.JOIN_ONLY === 'true'
const DELAY_MS = Math.max(0, Number(process.env.DELAY_MS || 0))
const WS_ENABLED = process.env.WS_ENABLED !== 'false'
const WS_TIMEOUT_MS = Math.max(1000, Number(process.env.WS_TIMEOUT_MS || 15000))
const WS_HOLD_SEC = Math.max(0, Number(process.env.WS_HOLD_SEC || 30))
const REAL_NAMES = process.env.REAL_NAMES !== 'false'

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
  console.error('Missing SESSION_CODE. Example: SESSION_CODE=ABC123')
  process.exit(1)
}

function deriveWsBaseUrl() {
  if (process.env.WS_BASE_URL) {
    return String(process.env.WS_BASE_URL).trim().replace(/\/$/, '')
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

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

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

  if (!response.ok) {
    const details = Array.isArray(payload?.errors) ? payload.errors.join('; ') : null
    const message = details
      ? `${payload?.message || 'Request failed'}: ${details}`
      : payload?.message || `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return payload?.data
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

  if (joinType === 'name_email') {
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
      if (isNodeWsSocket(ws)) ws.close()
      else ws.close()
    } catch {
      // ignore
    }
  }
  activeSockets.clear()
}

async function simulateParticipant(index, sessionMeta) {
  const joinPayload = buildJoinPayload(index, sessionMeta.join_type)
  const joined = await request(`/sessions/join/${SESSION_CODE}`, {
    method: 'POST',
    body: joinPayload,
  })

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

  let submitted = 0
  if (SUBMIT_ANSWERS && !JOIN_ONLY) {
    const questionPayload = await request(`/sessions/${sessionId}/participantQuestions`, { token })
    const questions = normalizeQuestionsList(questionPayload)
    for (const question of questions) {
      try {
        const payload = buildSubmitPayload(question, index)
        await request('/responses/submit', { method: 'POST', token, body: payload })
        submitted += 1
        if (DELAY_MS) await sleep(DELAY_MS)
      } catch (err) {
        if (err.status === 400 && /not active|closed|not accepting/i.test(err.message)) {
          break
        }
        throw err
      }
    }
  }

  return { joined: true, submitted, wsConnected, wsAuthStatus }
}

async function runPool(total, concurrency, worker, onProgress) {
  let next = 1
  const results = {
    ok: 0,
    fail: 0,
    wsOk: 0,
    wsFail: 0,
    submittedTotal: 0,
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
        if (WS_ENABLED) {
          if (outcome.wsConnected) results.wsOk += 1
          else results.wsFail += 1
        }
        results.submittedTotal += outcome.submitted || 0
        onProgress?.(results, total)
      } catch (err) {
        results.fail += 1
        if (WS_ENABLED) results.wsFail += 1
        if (results.errors.length < 8) {
          results.errors.push(`User ${index}: ${err.message}`)
        }
        onProgress?.(results, total)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runner()))
  return results
}

function printProgress(results, total) {
  const done = results.ok + results.fail
  const wsPart = WS_ENABLED ? `, ws ${results.wsOk}/${done}` : ''
  process.stdout.write(`\rProgress: ${done}/${total} (ok ${results.ok}, fail ${results.fail}${wsPart})`)
}

async function main() {
  console.log('Load test — dummy participants (+ WebSocket)')
  console.log(`API:      ${API_BASE_URL}`)
  console.log(`WS:       ${WS_ENABLED ? WS_BASE_URL : 'disabled'}`)
  console.log(`Session:  ${SESSION_CODE}`)
  console.log(`Users:    ${USER_COUNT}`)
  console.log(`Parallel: ${CONCURRENCY}`)
  console.log(`Submit:   ${SUBMIT_ANSWERS && !JOIN_ONLY ? 'yes' : 'no'}`)
  console.log(`Hold WS:  ${WS_ENABLED ? `${WS_HOLD_SEC}s after test` : 'n/a'}`)
  console.log(`Names:    ${REAL_NAMES ? 'realistic' : 'LoadTest User NNN'}`)
  console.log('')

  const lookup = await request(`/sessions/join/${SESSION_CODE}`)
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
  console.log('')

  if (session.status !== 'live' && session.status !== 'paused') {
    console.warn('Warning: session is not live. Join may work but submit will likely fail until you go live.')
  }

  const onSignal = () => {
    console.log('\nStopping — closing WebSocket connections…')
    closeAllSockets()
    process.exit(130)
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  const started = Date.now()
  const results = await runPool(USER_COUNT, CONCURRENCY, (index) => simulateParticipant(index, session), printProgress)
  process.stdout.write('\n')

  if (WS_ENABLED && WS_HOLD_SEC > 0 && activeSockets.size > 0) {
    console.log(`Holding ${activeSockets.size} WebSocket connection(s) for ${WS_HOLD_SEC}s (Ctrl+C to stop early)…`)
    await sleep(WS_HOLD_SEC * 1000)
  }

  closeAllSockets()
  process.off('SIGINT', onSignal)
  process.off('SIGTERM', onSignal)

  const elapsedSec = ((Date.now() - started) / 1000).toFixed(1)

  console.log('')
  console.log(`Done in ${elapsedSec}s`)
  console.log(`Join success:  ${results.ok}`)
  console.log(`Join failed:   ${results.fail}`)
  if (WS_ENABLED) {
    console.log(`WS connected:  ${results.wsOk}`)
    console.log(`WS failed:     ${results.wsFail}`)
  }
  if (SUBMIT_ANSWERS && !JOIN_ONLY) {
    console.log(`Answers sent:  ${results.submittedTotal}`)
  }

  if (results.errors.length) {
    console.log('')
    console.log('Sample errors:')
    for (const line of results.errors) console.log(`  - ${line}`)
  }

  if (results.fail > 0) process.exit(1)
}

main().catch((err) => {
  closeAllSockets()
  console.error('')
  console.error('Load test failed:', err.message)
  process.exit(1)
})

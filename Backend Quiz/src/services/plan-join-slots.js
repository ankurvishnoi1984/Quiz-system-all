/**
 * In-process join-slot reservations for plan participant limits.
 *
 * Plan capacity is measured by live WebSocket connections. HTTP /join runs
 * before the socket connects, so without a reservation many concurrent joins
 * all see "used < limit" and overshoot. These slots close that window until
 * the participant connects (or the TTL expires).
 *
 * Safe for a single Node process. Multi-instance deployments need a shared
 * store (Redis / DB lock) for the same guarantee.
 */

const RESERVATION_TTL_MS = Math.max(
  15_000,
  Number(process.env.PLAN_JOIN_RESERVATION_TTL_MS || 90_000)
);

/** @type {Map<number, number>} */
const pendingByHost = new Map();

function normalizeHostId(hostId) {
  const id = Number(hostId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getPendingJoinSlots(hostId) {
  const id = normalizeHostId(hostId);
  if (!id) return 0;
  return pendingByHost.get(id) || 0;
}

function releaseJoinSlot(hostId) {
  const id = normalizeHostId(hostId);
  if (!id) return;
  const current = pendingByHost.get(id) || 0;
  if (current <= 1) {
    pendingByHost.delete(id);
    return;
  }
  pendingByHost.set(id, current - 1);
}

/**
 * Atomically reserve one join slot for a host (sync — race-free in one process).
 * @returns {{ ok: true, release: () => void } | { ok: false }}
 */
function tryAcquireJoinSlot(hostId, { liveUsed, limit }) {
  const id = normalizeHostId(hostId);
  if (!id) {
    return { ok: true, release() {} };
  }

  if (limit == null) {
    return { ok: true, release() {} };
  }

  const limitNum = Number(limit);
  if (!Number.isFinite(limitNum) || limitNum < 0) {
    return { ok: true, release() {} };
  }

  const live = Math.max(0, Number(liveUsed) || 0);
  const pending = pendingByHost.get(id) || 0;
  if (live + pending >= limitNum) {
    return { ok: false };
  }

  pendingByHost.set(id, pending + 1);

  let released = false;
  const timer = setTimeout(() => {
    if (!released) {
      released = true;
      releaseJoinSlot(id);
    }
  }, RESERVATION_TTL_MS);
  if (typeof timer.unref === "function") timer.unref();

  return {
    ok: true,
    release() {
      if (released) return;
      released = true;
      clearTimeout(timer);
      releaseJoinSlot(id);
    }
  };
}

/** Convert a pending HTTP join reservation into a live WS connection. */
function consumeJoinReservation(hostId) {
  releaseJoinSlot(hostId);
}

module.exports = {
  getPendingJoinSlots,
  tryAcquireJoinSlot,
  consumeJoinReservation,
  releaseJoinSlot,
  RESERVATION_TTL_MS
};

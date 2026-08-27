const { Op } = require("sequelize");
const { Plan, User, Session } = require("../models");
const {
  sendParticipantLimitExceededEmail,
  sendPlanExpiredEmail
} = require("./email.service");
const {
  countLiveParticipantConnectionsForSessionCodes,
  countLiveParticipantConnectionsBySessionCodeMap
} = require("./websocket.service");
const {
  getPendingJoinSlots,
  tryAcquireJoinSlot,
  consumeJoinReservation
} = require("./plan-join-slots");

const ACCOUNT_PLAN_LIMIT_MESSAGE =
  "Participant limit exceeded for this session. Please contact the session host.";
const PLAN_LIMIT_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FREE_DEMO_MAX_PARTICIPANTS = 10;

// Plan limits apply to live WebSocket connections (role=participant), not
// historical participant rows. Closing a tab frees capacity immediately.

function toDateOnlyString(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function todayDateOnlyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function isPlanExpired(planExpiresAt, { isFree = false } = {}) {
  if (isFree) return false;
  const expires = toDateOnlyString(planExpiresAt);
  if (!expires) return false;
  return expires < todayDateOnlyUtc();
}

function addDaysToDateOnly(days) {
  const n = Number(days);
  if (!Number.isInteger(n) || n <= 0) return null;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function formatPlanPriceLabel(amount, currency = "INR") {
  if (amount == null || amount === "") return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return null;
  const code = String(currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `${code} ${value}`;
  }
}

function toPlanPayload(plan) {
  if (!plan) return null;
  const duration =
    plan.default_duration_days == null || plan.default_duration_days === ""
      ? null
      : Number(plan.default_duration_days);
  const priceMonthly =
    plan.price_monthly == null || plan.price_monthly === ""
      ? null
      : Number(plan.price_monthly);
  const currency = String(plan.currency || "INR").toUpperCase();
  return {
    plan_id: plan.plan_id,
    name: plan.name,
    description: plan.description || null,
    max_participants: Number(plan.max_participants),
    max_questions_per_session: Number(plan.max_questions_per_session || 15),
    is_active: Boolean(plan.is_active),
    is_free: Boolean(plan.is_free),
    default_duration_days:
      Number.isInteger(duration) && duration > 0 ? duration : null,
    price_monthly: Number.isFinite(priceMonthly) ? priceMonthly : null,
    currency,
    price_label: formatPlanPriceLabel(priceMonthly, currency)
  };
}

async function listPlans() {
  const plans = await Plan.findAll({
    order: [
      ["is_free", "DESC"],
      ["max_participants", "ASC"],
      ["plan_id", "ASC"]
    ]
  });
  return plans.map(toPlanPayload);
}

async function listPublicPlans() {
  const plans = await Plan.findAll({
    where: { is_active: true, is_free: false },
    order: [
      ["max_participants", "ASC"],
      ["plan_id", "ASC"]
    ]
  });
  return plans.map(toPlanPayload);
}

async function getPlanOrThrow(planId) {
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    const error = new Error("Plan not found");
    error.statusCode = 404;
    throw error;
  }
  return plan;
}

async function getFreeDemoPlan() {
  let plan = await Plan.findOne({
    where: { is_free: true, is_active: true },
    order: [["plan_id", "ASC"]]
  });
  if (plan) return plan;

  plan = await Plan.findOne({ where: { name: "Free Demo" } });
  if (plan) {
    plan.is_free = true;
    plan.is_active = true;
    if (!plan.max_participants) plan.max_participants = FREE_DEMO_MAX_PARTICIPANTS;
    await plan.save();
    return plan;
  }

  return Plan.create({
    name: "Free Demo",
    description:
      "Fallback demo access after a paid plan expires. Up to 10 participants connected at once — enough for trials and small demos.",
    max_participants: FREE_DEMO_MAX_PARTICIPANTS,
    max_questions_per_session: 15,
    is_active: true,
    is_free: true,
    default_duration_days: null
  });
}

async function createPlan(input) {
  const name = String(input.name).trim();
  const existing = await Plan.findOne({ where: { name } });
  if (existing) {
    const error = new Error("A plan with this name already exists");
    error.statusCode = 409;
    throw error;
  }

  const isFree = Boolean(input.is_free);
  if (isFree) {
    const otherFree = await Plan.findOne({ where: { is_free: true } });
    if (otherFree) {
      const error = new Error("Only one Free Demo plan is allowed");
      error.statusCode = 409;
      throw error;
    }
  }

  let defaultDurationDays = null;
  if (input.default_duration_days != null && input.default_duration_days !== "") {
    defaultDurationDays = Number(input.default_duration_days);
  }

  let priceMonthly = null;
  if (input.price_monthly != null && input.price_monthly !== "") {
    priceMonthly = Number(input.price_monthly);
  }

  const plan = await Plan.create({
    name,
    description: input.description ? String(input.description).trim() : null,
    max_participants: Number(input.max_participants),
    max_questions_per_session: Number(input.max_questions_per_session),
    is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
    is_free: isFree,
    default_duration_days: isFree ? null : defaultDurationDays,
    price_monthly: isFree ? null : priceMonthly,
    currency: String(input.currency || "INR").trim().toUpperCase() || "INR"
  });

  return toPlanPayload(plan);
}

async function updatePlan({ planId, input }) {
  const plan = await getPlanOrThrow(planId);

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    const existing = await Plan.findOne({
      where: {
        name,
        plan_id: { [Op.ne]: plan.plan_id }
      }
    });
    if (existing) {
      const error = new Error("A plan with this name already exists");
      error.statusCode = 409;
      throw error;
    }
    plan.name = name;
  }

  if (input.description !== undefined) {
    plan.description = input.description ? String(input.description).trim() : null;
  }

  if (input.max_participants !== undefined) {
    plan.max_participants = Number(input.max_participants);
  }

  if (input.max_questions_per_session !== undefined) {
    plan.max_questions_per_session = Number(input.max_questions_per_session);
  }

  if (input.is_active !== undefined) {
    plan.is_active = Boolean(input.is_active);
  }

  if (input.is_free !== undefined) {
    const isFree = Boolean(input.is_free);
    if (isFree) {
      const otherFree = await Plan.findOne({
        where: {
          is_free: true,
          plan_id: { [Op.ne]: plan.plan_id }
        }
      });
      if (otherFree) {
        const error = new Error("Only one Free Demo plan is allowed");
        error.statusCode = 409;
        throw error;
      }
    }
    plan.is_free = isFree;
  }

  if (input.default_duration_days !== undefined) {
    if (input.default_duration_days == null || input.default_duration_days === "") {
      plan.default_duration_days = null;
    } else {
      plan.default_duration_days = Number(input.default_duration_days);
    }
  }

  if (input.price_monthly !== undefined) {
    if (input.price_monthly == null || input.price_monthly === "") {
      plan.price_monthly = null;
    } else {
      plan.price_monthly = Number(input.price_monthly);
    }
  }

  if (input.currency !== undefined) {
    plan.currency = String(input.currency || "INR").trim().toUpperCase() || "INR";
  }

  if (plan.is_free) {
    plan.default_duration_days = null;
    plan.price_monthly = null;
  }

  await plan.save();
  return toPlanPayload(plan);
}

async function countParticipantsForHost(hostId) {
  if (!hostId) return 0;

  const sessions = await Session.findAll({
    where: { host_id: hostId },
    attributes: ["session_code"],
    raw: true
  });

  return countLiveParticipantConnectionsForSessionCodes(
    sessions.map((session) => session.session_code)
  );
}

async function countParticipantsByHostIds(hostIds) {
  const ids = [...new Set((hostIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const usage = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return usage;

  const sessions = await Session.findAll({
    where: { host_id: { [Op.in]: ids } },
    attributes: ["session_code", "host_id"],
    raw: true
  });

  const sessionCodeToHostId = new Map(
    sessions.map((session) => [session.session_code, Number(session.host_id)])
  );
  const liveByHost = countLiveParticipantConnectionsBySessionCodeMap(sessionCodeToHostId);

  for (const id of ids) {
    usage.set(id, liveByHost.get(id) || 0);
  }

  return usage;
}

async function getHostPlanUsage(hostId) {
  const user = await User.findByPk(hostId, {
    attributes: [
      "user_id",
      "email",
      "full_name",
      "plan_id",
      "extra_participants",
      "extra_questions",
      "plan_limit_email_sent_at",
      "plan_expires_at",
      "plan_expiry_email_sent_at",
      "is_active"
    ],
    include: [{ model: Plan, as: "plan", required: false }]
  });

  if (!user) {
    return {
      host: null,
      plan: null,
      assigned_plan: null,
      effective_plan: null,
      used: 0,
      plan_limit: null,
      extra_participants: 0,
      extra_questions: 0,
      limit: null,
      remaining: null,
      exceeded: false,
      unrestricted: true,
      sessions_count: 0,
      max_questions_per_session: null,
      plan_question_limit: null,
      percent_used: 0,
      plan_expires_at: null,
      plan_expired: false,
      has_active_plan: true,
      on_free_demo: false
    };
  }

  const assignedPlan = user.plan ? toPlanPayload(user.plan) : null;
  const planExpiresAt = toDateOnlyString(user.plan_expires_at);
  const expired = isPlanExpired(planExpiresAt, { isFree: Boolean(assignedPlan?.is_free) });

  // Expired paid plans have no active entitlement (no Free Demo fallback).
  const hasActivePlan = Boolean(assignedPlan) && !expired && !assignedPlan.is_free;
  const unrestricted = !assignedPlan && !expired;

  let effectivePlan = hasActivePlan ? assignedPlan : null;
  let extraParticipants = hasActivePlan
    ? Math.max(0, Number(user.extra_participants || 0))
    : 0;
  let extraQuestions = hasActivePlan
    ? Math.max(0, Number(user.extra_questions || 0))
    : 0;

  const used = await countParticipantsForHost(hostId);
  const sessionsCount = await Session.count({ where: { host_id: hostId } });
  const planLimit = unrestricted || !effectivePlan ? null : Number(effectivePlan.max_participants);
  const limit = unrestricted ? null : expired || !hasActivePlan ? 0 : planLimit + extraParticipants;
  const remaining = limit == null ? null : Math.max(0, limit - used);
  const exceeded = limit != null && used >= limit;
  const percentUsed = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const planQuestionLimit =
    unrestricted || !effectivePlan
      ? null
      : Number(effectivePlan.max_questions_per_session || 15);
  const maxQuestionsPerSession =
    unrestricted || planQuestionLimit == null
      ? null
      : planQuestionLimit + extraQuestions;

  return {
    host: user,
    plan: effectivePlan,
    assigned_plan: assignedPlan,
    effective_plan: effectivePlan,
    used,
    plan_limit: planLimit,
    extra_participants: extraParticipants,
    extra_questions: extraQuestions,
    limit,
    remaining,
    exceeded,
    unrestricted,
    sessions_count: sessionsCount,
    plan_question_limit: planQuestionLimit,
    max_questions_per_session: maxQuestionsPerSession,
    percent_used: percentUsed,
    plan_expires_at: planExpiresAt,
    plan_expired: expired,
    has_active_plan: unrestricted || hasActivePlan,
    on_free_demo: false
  };
}

const PLAN_EXPIRED_JOIN_MESSAGE =
  "This host's plan is no longer active. New participants cannot join until the plan is renewed.";

async function getPlanJoinBlock(session) {
  if (!session?.host_id) {
    return { blocked: false, message: null, reason: null };
  }

  const usage = await getHostPlanUsage(session.host_id);
  if (usage.plan_expired || (usage.assigned_plan && !usage.has_active_plan)) {
    return {
      blocked: true,
      message: PLAN_EXPIRED_JOIN_MESSAGE,
      reason: "plan_expired",
      usage
    };
  }

  const pending = getPendingJoinSlots(session.host_id);
  const effectivelyFull =
    usage.limit != null && usage.used + pending >= usage.limit;

  if (!effectivelyFull) {
    return { blocked: false, message: null, reason: null, usage };
  }

  return {
    blocked: true,
    message: ACCOUNT_PLAN_LIMIT_MESSAGE,
    reason: "plan_limit",
    usage
  };
}

/**
 * Check plan join rules and reserve a slot until the participant's WebSocket
 * connects (or the reservation TTL expires / join fails).
 * @returns {Promise<() => void>} release callback
 */
async function reservePlanJoinSlot(session) {
  if (!session?.host_id) {
    return () => {};
  }

  const usage = await getHostPlanUsage(session.host_id);
  if (usage.plan_expired || (usage.assigned_plan && !usage.has_active_plan)) {
    const error = new Error(PLAN_EXPIRED_JOIN_MESSAGE);
    error.statusCode = 403;
    throw error;
  }

  if (usage.limit == null) {
    return () => {};
  }

  const slot = tryAcquireJoinSlot(session.host_id, {
    liveUsed: usage.used,
    limit: usage.limit
  });

  if (!slot.ok) {
    void notifyHostPlanLimitIfNeeded(usage);
    const error = new Error(ACCOUNT_PLAN_LIMIT_MESSAGE);
    error.statusCode = 403;
    throw error;
  }

  return slot.release;
}

/**
 * After a participant WebSocket is registered, drop the HTTP join reservation
 * and reject the socket if the host is over plan capacity.
 * @returns {Promise<{ allowed: boolean, message?: string }>}
 */
async function assertParticipantWsWithinPlanLimit(session) {
  if (!session?.host_id) {
    return { allowed: true };
  }

  consumeJoinReservation(session.host_id);

  const usage = await getHostPlanUsage(session.host_id);
  if (usage.plan_expired || (usage.assigned_plan && !usage.has_active_plan)) {
    return { allowed: false, message: PLAN_EXPIRED_JOIN_MESSAGE };
  }

  if (usage.limit != null && usage.used > usage.limit) {
    void notifyHostPlanLimitIfNeeded(usage);
    return { allowed: false, message: ACCOUNT_PLAN_LIMIT_MESSAGE };
  }

  return { allowed: true };
}

async function notifyHostPlanLimitIfNeeded(usage) {
  const host = usage?.host;
  const limit = usage?.limit;
  if (!host?.email || limit == null) return;

  const cutoff = new Date(Date.now() - PLAN_LIMIT_EMAIL_COOLDOWN_MS);
  const [updated] = await User.update(
    { plan_limit_email_sent_at: new Date() },
    {
      where: {
        user_id: host.user_id,
        [Op.or]: [
          { plan_limit_email_sent_at: null },
          { plan_limit_email_sent_at: { [Op.lt]: cutoff } }
        ]
      }
    }
  );

  if (!updated) return;

  try {
    await sendParticipantLimitExceededEmail({
      to: host.email,
      fullName: host.full_name,
      planName: usage.plan?.name || "your plan",
      used: usage.used,
      limit
    });
  } catch (err) {
    console.error("notifyHostPlanLimitIfNeeded email failed:", err);
  }
}

async function notifyHostPlanExpiredIfNeeded(usage) {
  const host = usage?.host;
  if (!host?.email || !usage?.plan_expired) return;

  const [updated] = await User.update(
    { plan_expiry_email_sent_at: new Date() },
    {
      where: {
        user_id: host.user_id,
        plan_expiry_email_sent_at: null
      }
    }
  );

  if (!updated) return;

  try {
    await sendPlanExpiredEmail({
      to: host.email,
      fullName: host.full_name,
      planName: usage.assigned_plan?.name || "your plan",
      expiredAt: usage.plan_expires_at
    });
  } catch (err) {
    console.error("notifyHostPlanExpiredIfNeeded email failed:", err);
  }
}

async function getCurrentUserPlanUsage(userId) {
  const usage = await getHostPlanUsage(userId);
  if (usage.plan_expired) {
    await notifyHostPlanExpiredIfNeeded(usage);
  }
  return {
    plan: usage.plan,
    assigned_plan: usage.assigned_plan,
    effective_plan: usage.effective_plan,
    used: usage.used,
    plan_limit: usage.plan_limit,
    extra_participants: Number(usage.extra_participants || 0),
    extra_questions: Number(usage.extra_questions || 0),
    limit: usage.limit,
    remaining: usage.remaining,
    exceeded: usage.exceeded,
    unrestricted: Boolean(usage.unrestricted),
    sessions_count: Number(usage.sessions_count || 0),
    plan_question_limit:
      usage.plan_question_limit == null ? null : Number(usage.plan_question_limit),
    max_questions_per_session:
      usage.max_questions_per_session == null
        ? null
        : Number(usage.max_questions_per_session),
    percent_used: Number(usage.percent_used || 0),
    plan_expires_at: usage.plan_expires_at,
    plan_expired: Boolean(usage.plan_expired),
    has_active_plan: Boolean(usage.has_active_plan),
    on_free_demo: false
  };
}

async function assertHostCanRunSessions(hostId) {
  const usage = await getHostPlanUsage(hostId);
  if (usage.has_active_plan) return usage;

  const planName = usage.assigned_plan?.name || "your plan";
  const expiredAt = usage.plan_expires_at;
  const error = new Error(
    usage.plan_expired
      ? `${planName} ended${expiredAt ? ` on ${expiredAt}` : ""}. Renew your plan to create or edit sessions, launch, share, or manage questions.`
      : "You do not have an active plan. Contact your administrator to assign one before creating or managing sessions."
  );
  error.statusCode = 403;
  error.code = usage.plan_expired ? "plan_expired" : "plan_inactive";
  error.usage = usage;
  throw error;
}

/**
 * Enforce plan max_questions_per_session for a session.
 * @param {{ hostId: number, sessionId: number, additionalCount?: number, absoluteCount?: number }} args
 * absoluteCount: when set (e.g. import replace / duplicate), compare this total to the limit instead of current+additional.
 */
async function assertSessionQuestionCapacity({
  hostId,
  sessionId = null,
  additionalCount = 0,
  absoluteCount = null
}) {
  const usage = await assertHostCanRunSessions(hostId);
  if (usage.unrestricted || usage.max_questions_per_session == null) {
    return usage;
  }

  const limit = Number(usage.max_questions_per_session);
  if (!Number.isInteger(limit) || limit <= 0) {
    return usage;
  }

  const { Question } = require("../models");
  const currentCount =
    sessionId == null
      ? 0
      : await Question.count({ where: { session_id: sessionId } });
  const nextCount =
    absoluteCount != null
      ? Number(absoluteCount)
      : currentCount + Math.max(0, Number(additionalCount) || 0);

  if (nextCount <= limit) {
    return { ...usage, current_question_count: currentCount, question_limit: limit };
  }

  const planName = usage.plan?.name || "Your plan";
  const remaining = Math.max(0, limit - currentCount);
  const planBase = usage.plan_question_limit;
  const extras = Number(usage.extra_questions || 0);
  const limitDetail =
    extras > 0 && planBase != null
      ? `${planBase} from plan + ${extras} extra`
      : String(limit);
  const error = new Error(
    absoluteCount != null
      ? `${planName} allows ${limitDetail} questions per session. This action needs ${nextCount}.`
      : `${planName} allows ${limitDetail} questions per session. You have ${currentCount} and can add ${remaining} more.`
  );
  error.statusCode = 403;
  error.code = "plan_question_limit";
  error.usage = usage;
  error.details = {
    current: currentCount,
    limit,
    remaining,
    requested: nextCount
  };
  throw error;
}

/**
 * Resolve plan_expires_at when assigning a plan.
 * Explicit date wins; otherwise use plan.default_duration_days; free plans never expire.
 */
async function resolvePlanExpiresAt({ planId, planExpiresAt }) {
  if (planId == null || planId === "") return null;

  const plan = await getPlanOrThrow(Number(planId));
  if (plan.is_free) return null;

  if (planExpiresAt !== undefined) {
    if (planExpiresAt == null || planExpiresAt === "") return null;
    const normalized = toDateOnlyString(planExpiresAt);
    if (!normalized) {
      const error = new Error("plan_expires_at must be a valid date (YYYY-MM-DD)");
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  }

  if (plan.default_duration_days) {
    return addDaysToDateOnly(plan.default_duration_days);
  }

  return null;
}

module.exports = {
  ACCOUNT_PLAN_LIMIT_MESSAGE,
  FREE_DEMO_MAX_PARTICIPANTS,
  toDateOnlyString,
  todayDateOnlyUtc,
  isPlanExpired,
  addDaysToDateOnly,
  formatPlanPriceLabel,
  toPlanPayload,
  listPlans,
  listPublicPlans,
  getPlanOrThrow,
  getFreeDemoPlan,
  createPlan,
  updatePlan,
  countParticipantsForHost,
  countParticipantsByHostIds,
  getHostPlanUsage,
  getPlanJoinBlock,
  reservePlanJoinSlot,
  assertParticipantWsWithinPlanLimit,
  notifyHostPlanLimitIfNeeded,
  notifyHostPlanExpiredIfNeeded,
  getCurrentUserPlanUsage,
  assertHostCanRunSessions,
  assertSessionQuestionCapacity,
  resolvePlanExpiresAt
};

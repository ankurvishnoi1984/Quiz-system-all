const { Op, fn, col } = require("sequelize");
const {
  User,
  Plan,
  Session,
  Participant,
  Question,
  Response,
  Payment,
  UserPlanHistory,
  UserParticipantAddon,
  UserQuestionAddon,
  QaQuestion
} = require("../models");
const {
  toDateOnlyString,
  todayDateOnlyUtc,
  isPlanExpired
} = require("./plan.service");
const { formatAmount } = require("../utils/formatAmount");

const PLAN_HISTORY_SOURCES = {
  SIGNUP: "signup",
  ADMIN_ASSIGN: "admin_assign",
  RENEWAL: "renewal",
  BACKFILL: "backfill"
};

function daysUntil(dateOnly) {
  const expires = toDateOnlyString(dateOnly);
  if (!expires) return null;
  const today = todayDateOnlyUtc();
  const start = Date.parse(`${today}T00:00:00.000Z`);
  const end = Date.parse(`${expires}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function toHistoryPayload(row, { current = false } = {}) {
  const expiresAt = toDateOnlyString(row.expires_at);
  const expired = isPlanExpired(expiresAt, { isFree: Boolean(row.is_free) });
  const ended = Boolean(row.ended_at);
  let status = "ended";
  if (!ended && current) status = expired ? "expired" : "current";
  else if (!ended) status = expired ? "expired" : "current";

  return {
    history_id: row.history_id,
    plan_id: row.plan_id,
    plan_name: row.plan_name,
    max_participants: row.max_participants == null ? null : Number(row.max_participants),
    max_questions_per_session:
      row.max_questions_per_session == null ? null : Number(row.max_questions_per_session),
    is_free: Boolean(row.is_free),
    started_at: row.started_at,
    ended_at: row.ended_at,
    expires_at: expiresAt,
    source: row.source,
    payment_id: row.payment_id || null,
    status,
    is_current: status === "current"
  };
}

async function closeOpenPlanHistory(userId, endedAt, { transaction } = {}) {
  await UserPlanHistory.update(
    { ended_at: endedAt },
    {
      where: {
        user_id: userId,
        ended_at: null
      },
      transaction
    }
  );
}

async function recordPlanAssignment({
  userId,
  planId,
  plan = null,
  expiresAt = null,
  source = PLAN_HISTORY_SOURCES.ADMIN_ASSIGN,
  paymentId = null,
  startedAt = null,
  transaction = null
} = {}) {
  const started = startedAt ? new Date(startedAt) : new Date();
  await closeOpenPlanHistory(userId, started, { transaction });

  const nextPlanId = planId == null || planId === "" ? null : Number(planId);
  if (!nextPlanId) return null;

  let snapshot = plan;
  if (!snapshot) {
    snapshot = await Plan.findByPk(nextPlanId, {
      attributes: [
        "plan_id",
        "name",
        "max_participants",
        "is_free",
        "default_duration_days"
      ],
      transaction
    });
    if (snapshot) {
      try {
        const withQuestions = await Plan.findByPk(nextPlanId, {
          attributes: ["plan_id", "max_questions_per_session"],
          transaction
        });
        snapshot.max_questions_per_session = withQuestions?.max_questions_per_session;
      } catch (err) {
        snapshot.max_questions_per_session = null;
      }
    }
  }
  if (!snapshot) return null;

  const maxParticipants = Number(snapshot.max_participants);
  const maxQuestions = Number(snapshot.max_questions_per_session);

  return UserPlanHistory.create(
    {
      user_id: userId,
      plan_id: snapshot.plan_id,
      plan_name: snapshot.name,
      max_participants: Number.isFinite(maxParticipants) ? maxParticipants : null,
      max_questions_per_session: Number.isFinite(maxQuestions) ? maxQuestions : null,
      is_free: Boolean(snapshot.is_free),
      started_at: started,
      ended_at: null,
      expires_at: toDateOnlyString(expiresAt),
      source,
      payment_id: paymentId || null
    },
    { transaction }
  );
}

function timestampMs(value) {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function inDateRange(value, startedAt, endedAt) {
  const ms = timestampMs(value);
  if (ms == null) return false;
  const startMs = timestampMs(startedAt);
  const endMs = timestampMs(endedAt);
  if (startMs != null && ms < startMs) return false;
  if (endMs != null && ms >= endMs) return false;
  return true;
}

function daysBetween(startValue, endValue) {
  const startMs = timestampMs(startValue);
  const endMs = timestampMs(endValue) ?? Date.now();
  if (startMs == null) return null;
  return Math.max(0, Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)));
}

async function countsBySessionId(Model, sessionIds) {
  const map = new Map();
  if (!sessionIds.length) return map;
  try {
    const rows = await Model.findAll({
      attributes: ["session_id", [fn("COUNT", col("session_id")), "total"]],
      where: { session_id: { [Op.in]: sessionIds } },
      group: ["session_id"],
      raw: true
    });
    for (const row of rows) {
      map.set(Number(row.session_id), Number(row.total || 0));
    }
  } catch (err) {
    console.error("countsBySessionId failed:", err.message);
  }
  return map;
}

function sumCounts(map, sessionIds) {
  return sessionIds.reduce((sum, id) => sum + (map.get(Number(id)) || 0), 0);
}

function filterSessionsForPeriod(sessions, startedAt, endedAt) {
  if (!startedAt && !endedAt) return sessions;
  return sessions.filter((row) => inDateRange(row.created_at || row.started_at, startedAt, endedAt));
}

function buildActivitySummary({
  sessions,
  participantMap,
  questionMap,
  responseMap,
  qaMap,
  payments,
  seatAddons,
  questionAddons,
  startedAt = null,
  endedAt = null,
  expiresAt = null,
  isFree = false,
  accountCreatedAt = null,
  scope = "all",
  planName = null,
  historyId = null,
  isCurrentPeriod = false
}) {
  const sessionIds = sessions.map((row) => row.session_id);
  const sessionsByStatus = {
    draft: 0,
    live: 0,
    paused: 0,
    completed: 0,
    archived: 0
  };
  let firstSessionAt = null;
  let lastSessionAt = null;

  for (const row of sessions) {
    const status = row.status && sessionsByStatus[row.status] != null ? row.status : "draft";
    sessionsByStatus[status] += 1;
    const created = row.created_at ? new Date(row.created_at) : null;
    const started = row.started_at ? new Date(row.started_at) : created;
    const ended = row.ended_at ? new Date(row.ended_at) : started;
    if (created && (!firstSessionAt || created < firstSessionAt)) firstSessionAt = created;
    const latest = ended || started || created;
    if (latest && (!lastSessionAt || latest > lastSessionAt)) lastSessionAt = latest;
  }

  const paidPayments = payments.filter((row) => String(row.status).toLowerCase() === "paid");
  const totalPaid = paidPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const extraSeatsTotal = seatAddons.reduce((sum, row) => sum + Number(row.seats || 0), 0);
  const extraQuestionsTotal = questionAddons.reduce((sum, row) => sum + Number(row.questions || 0), 0);
  const remainingDays = endedAt || isFree ? null : daysUntil(expiresAt);
  const periodEnd = endedAt || new Date();
  const daysOnPlan = daysBetween(startedAt || accountCreatedAt, periodEnd);

  return {
    scope,
    history_id: historyId,
    plan_name: planName,
    is_current_period: Boolean(isCurrentPeriod),
    sessions_total: sessions.length,
    sessions_draft: sessionsByStatus.draft,
    sessions_live: sessionsByStatus.live,
    sessions_paused: sessionsByStatus.paused,
    sessions_completed: sessionsByStatus.completed,
    sessions_archived: sessionsByStatus.archived,
    participants_joined: sumCounts(participantMap, sessionIds),
    questions_created: sumCounts(questionMap, sessionIds),
    responses_collected: sumCounts(responseMap, sessionIds),
    qa_questions: sumCounts(qaMap, sessionIds),
    extra_seats_purchased: extraSeatsTotal,
    extra_questions_purchased: extraQuestionsTotal,
    payments_count: paidPayments.length,
    total_paid: totalPaid,
    total_paid_display: formatAmount(totalPaid, paidPayments[0]?.currency || "INR"),
    first_session_at: firstSessionAt,
    last_session_at: lastSessionAt,
    account_created_at: accountCreatedAt,
    current_plan_started_at: startedAt,
    days_on_current_plan: daysOnPlan,
    days_remaining: remainingDays,
    plan_expires_at: toDateOnlyString(expiresAt),
    period_started_at: startedAt,
    period_ended_at: endedAt
  };
}

async function getPlanAccountOverview(userId) {
  const user = await User.findByPk(userId, {
    attributes: ["user_id", "created_at", "plan_id", "plan_expires_at"]
  });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const sessions = await Session.findAll({
    where: { host_id: userId },
    attributes: ["session_id", "status", "created_at", "started_at", "ended_at"],
    raw: true
  });
  const sessionIds = sessions.map((row) => row.session_id);

  const [participantMap, questionMap, responseMap, qaMap, historyRows, payments, seatAddons, questionAddons] =
    await Promise.all([
      countsBySessionId(Participant, sessionIds),
      countsBySessionId(Question, sessionIds),
      countsBySessionId(Response, sessionIds),
      countsBySessionId(QaQuestion, sessionIds),
      UserPlanHistory.findAll({
        where: { user_id: userId },
        order: [
          ["started_at", "DESC"],
          ["history_id", "DESC"]
        ]
      }),
      Payment.findAll({
        where: { user_id: userId },
        include: [{ model: Plan, as: "plan", attributes: ["plan_id", "name"], required: false }],
        order: [
          ["paid_at", "DESC"],
          ["payment_id", "DESC"]
        ]
      }),
      UserParticipantAddon.findAll({
        where: { user_id: userId },
        order: [["created_at", "DESC"]]
      }).catch((err) => {
        console.error("list participant addons for plan overview failed:", err.message);
        return [];
      }),
      UserQuestionAddon.findAll({
        where: { user_id: userId },
        order: [["created_at", "DESC"]]
      }).catch((err) => {
        console.error("list question addons for plan overview failed:", err.message);
        return [];
      })
    ]);

  const currentHistory = historyRows.find((row) => !row.ended_at) || null;
  const summary = buildActivitySummary({
    sessions,
    participantMap,
    questionMap,
    responseMap,
    qaMap,
    payments,
    seatAddons,
    questionAddons,
    startedAt: currentHistory?.started_at || user.created_at,
    endedAt: null,
    expiresAt: user.plan_expires_at,
    isFree: Boolean(currentHistory?.is_free),
    accountCreatedAt: user.created_at,
    scope: "all",
    isCurrentPeriod: Boolean(currentHistory)
  });

  const history = historyRows.map((row) => {
    const payload = toHistoryPayload(row, {
      current: currentHistory && row.history_id === currentHistory.history_id
    });
    const periodSessions = filterSessionsForPeriod(sessions, row.started_at, row.ended_at);
    const periodPayments = payments.filter((payment) => {
      if (row.payment_id && Number(payment.payment_id) === Number(row.payment_id)) return true;
      return inDateRange(payment.paid_at || payment.created_at, row.started_at, row.ended_at);
    });
    const periodSeats = seatAddons.filter((addon) => inDateRange(addon.created_at, row.started_at, row.ended_at));
    const periodQuestions = questionAddons.filter((addon) =>
      inDateRange(addon.created_at, row.started_at, row.ended_at)
    );
    payload.summary = buildActivitySummary({
      sessions: periodSessions,
      participantMap,
      questionMap,
      responseMap,
      qaMap,
      payments: periodPayments,
      seatAddons: periodSeats,
      questionAddons: periodQuestions,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      expiresAt: row.expires_at,
      isFree: Boolean(row.is_free),
      accountCreatedAt: user.created_at,
      scope: "period",
      planName: row.plan_name,
      historyId: row.history_id,
      isCurrentPeriod: payload.is_current
    });
    return payload;
  });

  return {
    summary,
    history,
    payments: payments.map((row) => ({
      payment_id: row.payment_id,
      payment_reference: row.payment_reference,
      purpose: row.purpose,
      plan_name: row.plan?.name || null,
      amount: Number(row.amount || 0),
      currency: row.currency,
      amount_display: formatAmount(row.amount, row.currency),
      status: row.status,
      payment_method: row.payment_method,
      paid_at: row.paid_at,
      created_at: row.created_at
    })),
    addons: [
      ...seatAddons.map((row) => ({
        kind: "seats",
        addon_id: row.addon_id,
        quantity: Number(row.seats || 0),
        note: row.note || null,
        created_at: row.created_at
      })),
      ...questionAddons.map((row) => ({
        kind: "questions",
        addon_id: row.addon_id,
        quantity: Number(row.questions || 0),
        note: row.note || null,
        created_at: row.created_at
      }))
    ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  };
}

module.exports = {
  PLAN_HISTORY_SOURCES,
  recordPlanAssignment,
  getPlanAccountOverview
};

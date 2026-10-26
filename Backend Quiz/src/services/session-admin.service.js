const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/database");
const {
  Session,
  User,
  Role,
  Department,
  Client,
  Participant,
  Question,
  Response
} = require("../models");
const { assertSessionWriteAccess } = require("../config/data-scope");
const { getFrontendPublicUrl } = require("../config/publicAppUrl");
const {
  countLiveUniqueParticipantsForSessionCode,
  getLiveUniqueParticipantIdsForSessionCode
} = require("./websocket.service");

const DEFAULT_SESSION_ADMIN_PASSWORD = "admin123";
const SESSION_ADMIN_ROLE = "session_admin";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugifySessionAdminUsername(title, sessionCode) {
  const slug =
    String(title || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "session";
  const code = String(sessionCode || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const base = code ? `${slug}-${code}` : slug;
  return base.slice(0, 80);
}

async function ensureUniqueUsername(baseUsername, { transaction } = {}) {
  let candidate = baseUsername;
  let attempt = 2;
  while (attempt < 50) {
    const existing = await User.findOne({
      where: { email: candidate },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined
    });
    if (!existing) return candidate;
    const suffix = `-${attempt}`;
    candidate = `${baseUsername.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
    attempt += 1;
  }
  throw createError("Unable to allocate a unique Session Admin username", 500);
}

function buildLoginUrl() {
  const base = String(getFrontendPublicUrl() || "").replace(/\/$/, "");
  return `${base}/login`;
}

function toSessionAdminCredentials(session, adminUser) {
  if (!adminUser) return null;
  const passwordIsDefault = Boolean(session.session_admin_password_is_default);
  return {
    user_id: adminUser.user_id,
    username: adminUser.email,
    full_name: adminUser.full_name,
    login_url: buildLoginUrl(),
    password_is_default: passwordIsDefault,
    password: passwordIsDefault ? DEFAULT_SESSION_ADMIN_PASSWORD : null
  };
}

async function loadSessionAdminUser(session, { transaction } = {}) {
  if (!session?.session_admin_user_id) return null;
  if (session.sessionAdmin) return session.sessionAdmin;
  return User.findByPk(session.session_admin_user_id, {
    attributes: ["user_id", "email", "full_name", "role", "is_active"],
    transaction
  });
}

async function attachSessionAdminCredentials(session) {
  if (!session) return session;
  const plain = typeof session.toJSON === "function" ? session.toJSON() : { ...session };
  const adminUser = await loadSessionAdminUser({
    ...plain,
    sessionAdmin: session.sessionAdmin
  });
  plain.session_admin = toSessionAdminCredentials(plain, adminUser);
  return plain;
}

async function provisionSessionAdminForSession({
  session,
  host,
  transaction: outerTransaction
} = {}) {
  if (!session?.session_id) {
    throw createError("Session is required to create a Session Admin", 400);
  }
  if (session.session_admin_user_id) {
    const existing = await loadSessionAdminUser(session, {
      transaction: outerTransaction
    });
    return { adminUser: existing, credentials: toSessionAdminCredentials(session, existing) };
  }

  const role = await Role.findOne({
    where: { slug: SESSION_ADMIN_ROLE, is_active: true },
    transaction: outerTransaction
  });
  if (!role) {
    throw createError("Session Admin role is not available", 500);
  }

  const run = async (transaction) => {
    const baseUsername = slugifySessionAdminUsername(session.title, session.session_code);
    const username = await ensureUniqueUsername(baseUsername, { transaction });
    const passwordHash = await bcrypt.hash(DEFAULT_SESSION_ADMIN_PASSWORD, 10);
    const ownerId = host?.parent_id || host?.user_id || session.host_id;

    const adminUser = await User.create(
      {
        full_name: `Session Admin · ${String(session.title || "Session").slice(0, 100)}`,
        email: username,
        password_hash: passwordHash,
        role: SESSION_ADMIN_ROLE,
        client_id: host?.client_id ?? null,
        dept_id: session.dept_id,
        parent_id: ownerId || null,
        plan_id: null,
        plan_expires_at: null,
        email_verified_at: new Date(),
        must_change_password: false,
        is_active: true
      },
      { transaction }
    );

    await Session.update(
      {
        session_admin_user_id: adminUser.user_id,
        session_admin_password_is_default: true
      },
      { where: { session_id: session.session_id }, transaction }
    );

    session.session_admin_user_id = adminUser.user_id;
    session.session_admin_password_is_default = true;

    return {
      adminUser,
      credentials: toSessionAdminCredentials(session, adminUser)
    };
  };

  if (outerTransaction) return run(outerTransaction);
  return sequelize.transaction(run);
}

async function getAssignedSessionForAdmin(user) {
  if (!user || user.role !== SESSION_ADMIN_ROLE) {
    throw createError("Forbidden", 403);
  }
  const session = await Session.findOne({
    where: { session_admin_user_id: user.user_id },
    include: [
      {
        model: Department,
        include: [{ model: Client, attributes: ["client_id", "name", "slug"] }]
      },
      {
        model: User,
        attributes: ["user_id", "full_name", "email", "role"]
      },
      {
        model: User,
        as: "sessionAdmin",
        attributes: ["user_id", "email", "full_name", "role", "is_active"],
        required: false
      }
    ]
  });
  if (!session) {
    throw createError("No session assigned to this Session Admin", 404);
  }
  return session;
}

function bucketJoinTimeline(participants) {
  const buckets = new Map();
  for (const row of participants) {
    const joinedAt = row.joined_at ? new Date(row.joined_at) : null;
    if (!joinedAt || Number.isNaN(joinedAt.getTime())) continue;
    const key = `${joinedAt.getFullYear()}-${String(joinedAt.getMonth() + 1).padStart(2, "0")}-${String(
      joinedAt.getDate()
    ).padStart(2, "0")} ${String(joinedAt.getHours()).padStart(2, "0")}:00`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const timeline = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, count]) => ({ bucket, count }));

  let cumulative = 0;
  return timeline.map((row) => {
    cumulative += row.count;
    return { ...row, cumulative };
  });
}

async function getSessionAdminDashboard({ user }) {
  const session = await getAssignedSessionForAdmin(user);
  const sessionId = session.session_id;

  const [participants, questions, responseRows, participantsCount] = await Promise.all([
    Participant.findAll({
      where: { session_id: sessionId },
      attributes: ["participant_id", "joined_at"],
      order: [["joined_at", "ASC"]],
      paranoid: true
    }),
    Question.findAll({
      where: { session_id: sessionId },
      attributes: [
        "question_id",
        "question_text",
        "question_type",
        "display_order",
        "is_live",
        "live_activated_at",
        "answer_revealed",
        "submissions_closed",
        "is_quiz_mode"
      ],
      order: [
        ["display_order", "ASC"],
        ["question_id", "ASC"]
      ]
    }),
    Response.findAll({
      where: { session_id: sessionId },
      attributes: ["question_id", "participant_id"],
      paranoid: true
    }),
    Participant.count({ where: { session_id: sessionId } })
  ]);

  const responsesByQuestion = new Map();
  for (const row of responseRows) {
    const qid = Number(row.question_id);
    responsesByQuestion.set(qid, (responsesByQuestion.get(qid) || 0) + 1);
  }

  const liveIds = getLiveUniqueParticipantIdsForSessionCode(session.session_code);
  const liveConnected =
    liveIds.length || countLiveUniqueParticipantsForSessionCode(session.session_code);

  const plain = typeof session.toJSON === "function" ? session.toJSON() : { ...session };
  plain.live_participant_ids = liveIds;
  plain.live_participants_count = liveConnected;
  plain.participants_count = participantsCount;
  plain.session_admin = toSessionAdminCredentials(plain, plain.sessionAdmin || null);

  return {
    session: plain,
    live: {
      connected_now: liveConnected,
      total_joined: participantsCount
    },
    join_timeline: bucketJoinTimeline(participants),
    questions: questions.map((question, index) => {
      const q = typeof question.toJSON === "function" ? question.toJSON() : question;
      const responseCount = responsesByQuestion.get(Number(q.question_id)) || 0;
      let state = "waiting";
      if (q.submissions_closed) state = "closed";
      else if (q.is_live) state = "live";
      else if (q.live_activated_at) state = "answered";
      return {
        question_id: q.question_id,
        order: index + 1,
        question_text: q.question_text,
        question_type: q.question_type,
        is_live: Boolean(q.is_live),
        live_activated_at: q.live_activated_at,
        answer_revealed: Boolean(q.answer_revealed),
        submissions_closed: Boolean(q.submissions_closed),
        is_quiz_mode: Boolean(q.is_quiz_mode),
        response_count: responseCount,
        state
      };
    })
  };
}

async function changeSessionAdminPassword({ sessionId, actor, newPassword }) {
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw createError("new_password must be at least 8 characters", 400);
  }

  const session = await Session.findByPk(sessionId);
  if (!session) throw createError("Session not found", 404);

  if (actor.role === SESSION_ADMIN_ROLE) {
    if (Number(session.session_admin_user_id) !== Number(actor.user_id)) {
      throw createError("Forbidden: session access denied", 403);
    }
  } else {
    const full = await Session.findByPk(sessionId, {
      include: [{ model: Department, include: [Client] }]
    });
    assertSessionWriteAccess(actor, full || session);
  }

  if (!session.session_admin_user_id) {
    throw createError("This session has no Session Admin login", 404);
  }

  const adminUser = await User.findByPk(session.session_admin_user_id);
  if (!adminUser || !adminUser.is_active || adminUser.role !== SESSION_ADMIN_ROLE) {
    throw createError("Session Admin account not found", 404);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await sequelize.transaction(async (transaction) => {
    await adminUser.update(
      {
        password_hash: passwordHash,
        must_change_password: false
      },
      { transaction }
    );
    await session.update({ session_admin_password_is_default: false }, { transaction });
  });

  return {
    session_admin: {
      user_id: adminUser.user_id,
      username: adminUser.email,
      full_name: adminUser.full_name,
      login_url: buildLoginUrl(),
      password_is_default: false,
      password: null
    }
  };
}

async function markSessionAdminPasswordChanged(userId) {
  if (!userId) return;
  await Session.update(
    { session_admin_password_is_default: false },
    { where: { session_admin_user_id: Number(userId) } }
  );
}

async function deactivateSessionAdminForSession(session, { transaction } = {}) {
  if (!session?.session_admin_user_id) return;
  await User.update(
    { is_active: false },
    {
      where: {
        user_id: session.session_admin_user_id,
        role: SESSION_ADMIN_ROLE
      },
      transaction
    }
  );
}

async function ensureSessionAdminOnSession(session, { host } = {}) {
  if (!session) return null;
  if (session.session_admin_user_id) {
    return attachSessionAdminCredentials(session);
  }
  let hostUser = host;
  if (!hostUser && session.host_id) {
    hostUser = await User.findByPk(session.host_id, {
      attributes: ["user_id", "parent_id", "client_id", "dept_id"]
    });
  }
  await provisionSessionAdminForSession({ session, host: hostUser });
  const refreshed = await Session.findByPk(session.session_id, {
    include: [
      {
        model: User,
        as: "sessionAdmin",
        attributes: ["user_id", "email", "full_name", "role", "is_active"],
        required: false
      }
    ]
  });
  return attachSessionAdminCredentials(refreshed || session);
}

module.exports = {
  DEFAULT_SESSION_ADMIN_PASSWORD,
  SESSION_ADMIN_ROLE,
  slugifySessionAdminUsername,
  toSessionAdminCredentials,
  attachSessionAdminCredentials,
  provisionSessionAdminForSession,
  getAssignedSessionForAdmin,
  getSessionAdminDashboard,
  changeSessionAdminPassword,
  markSessionAdminPasswordChanged,
  deactivateSessionAdminForSession,
  ensureSessionAdminOnSession
};

const bcrypt = require("bcryptjs");
const path = require("path");
const { User, Client, Department, Plan, UserParticipantAddon } = require("../models");
const { sendNewUserWelcomeEmail } = require("./email.service");
const {
  getPlanOrThrow,
  toPlanPayload,
  countParticipantsByHostIds,
  resolvePlanExpiresAt,
  isPlanExpired,
  toDateOnlyString
} = require("./plan.service");

const ROLE_LABELS = {
  client_admin: "Client admin",
  dept_admin: "Department admin",
  host: "Host"
};

function buildUserPayload(user, extras = {}) {
  const plan = extras.plan !== undefined ? extras.plan : user.plan ? toPlanPayload(user.plan) : null;
  const planExpiresAt = toDateOnlyString(user.plan_expires_at);
  return {
    user_id: user.user_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    client_id: user.client_id,
    dept_id: user.dept_id,
    plan_id: user.plan_id || null,
    plan,
    plan_expires_at: planExpiresAt,
    plan_expired: isPlanExpired(planExpiresAt, { isFree: Boolean(plan?.is_free) }),
    extra_participants: Math.max(0, Number(user.extra_participants || 0)),
    participants_used: extras.participants_used ?? 0,
    is_active: Boolean(user.is_active)
  };
}

async function resolveActivePlanId(planId) {
  if (planId == null || planId === "") return null;
  const plan = await getPlanOrThrow(Number(planId));
  if (!plan.is_active) {
    const error = new Error("Selected plan is not active");
    error.statusCode = 400;
    throw error;
  }
  return plan.plan_id;
}

async function listUsers() {
  const users = await User.findAll({
    attributes: [
      "user_id",
      "email",
      "full_name",
      "role",
      "client_id",
      "dept_id",
      "plan_id",
      "plan_expires_at",
      "extra_participants",
      "is_active",
      "last_login_at",
      "created_at"
    ],
    include: [{ model: Plan, as: "plan", required: false }],
    order: [["user_id", "DESC"]]
  });

  const usageByHost = await countParticipantsByHostIds(users.map((user) => user.user_id));

  return users.map((user) =>
    buildUserPayload(user, {
      plan: user.plan ? toPlanPayload(user.plan) : null,
      participants_used: usageByHost.get(Number(user.user_id)) || 0
    })
  );
}

async function createUserByAdmin(input, adminUser) {
  const normalizedEmail = String(input.email).trim().toLowerCase();
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });

  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const planId = await resolveActivePlanId(input.plan_id);
  const planExpiresAt = await resolvePlanExpiresAt({
    planId,
    planExpiresAt: input.plan_expires_at
  });
  const password_hash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    full_name: String(input.full_name).trim(),
    email: normalizedEmail,
    password_hash,
    role: input.role,
    client_id: input.client_id ? Number(input.client_id) : null,
    dept_id: input.dept_id ? Number(input.dept_id) : null,
    plan_id: planId,
    plan_expires_at: planExpiresAt,
    must_change_password: false
  });

  let clientName = null;
  let deptName = null;

  if (user.client_id) {
    const client = await Client.findByPk(user.client_id, { attributes: ["name"] });
    clientName = client?.name || null;
  }

  if (user.dept_id) {
    const department = await Department.findByPk(user.dept_id, { attributes: ["name"] });
    deptName = department?.name || null;
  }

  let emailSent = false;
  let emailError = null;

  try {
    await sendNewUserWelcomeEmail({
      to: user.email,
      cc: adminUser?.email || null,
      fullName: user.full_name,
      email: user.email,
      password: input.password,
      roleLabel: ROLE_LABELS[user.role] || user.role,
      clientName,
      deptName,
      createdByName: adminUser?.full_name || adminUser?.email || "Administrator"
    });
    emailSent = true;
  } catch (err) {
    emailError = err.message || "Failed to send welcome email";
    console.error("createUserByAdmin welcome email failed:", err);
  }

  const plan = planId ? await Plan.findByPk(planId) : null;

  return {
    user: buildUserPayload(user, {
      plan: plan ? toPlanPayload(plan) : null,
      participants_used: 0
    }),
    email_sent: emailSent,
    email_error: emailSent ? null : emailError
  };
}

async function reloadUserAccountPayload(user) {
  const plan = user.plan_id ? await Plan.findByPk(user.plan_id) : null;
  const usageByHost = await countParticipantsByHostIds([user.user_id]);
  return buildUserPayload(user, {
    plan: plan ? toPlanPayload(plan) : null,
    participants_used: usageByHost.get(Number(user.user_id)) || 0
  });
}

async function assignUserPlan({ userId, planId, planExpiresAt }) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const nextPlanId = planId == null || planId === "" ? null : await resolveActivePlanId(planId);
  const nextExpiresAt = await resolvePlanExpiresAt({
    planId: nextPlanId,
    planExpiresAt
  });

  user.plan_id = nextPlanId;
  user.plan_expires_at = nextExpiresAt;
  user.plan_limit_email_sent_at = null;
  user.plan_expiry_email_sent_at = null;
  await user.save();

  return reloadUserAccountPayload(user);
}

function toAddonPayload(row) {
  return {
    addon_id: row.addon_id,
    seats: Number(row.seats),
    note: row.note || null,
    attachment_url: row.attachment_url || null,
    attachment_filename: row.attachment_filename || null,
    created_at: row.created_at
  };
}

async function listUserParticipantAddons(userId) {
  const user = await User.findByPk(userId, { attributes: ["user_id"] });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const rows = await UserParticipantAddon.findAll({
    where: { user_id: userId },
    order: [
      ["created_at", "DESC"],
      ["addon_id", "DESC"]
    ],
    limit: 20
  });

  return rows.map(toAddonPayload);
}

async function adjustUserExtraParticipants({
  userId,
  add,
  set,
  note,
  attachmentUrl,
  attachmentFilename,
  adminUser
}) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const current = Math.max(0, Number(user.extra_participants || 0));
  let next = current;
  let seatsDelta = 0;

  if (set !== undefined) {
    next = Number(set);
    seatsDelta = next - current;
  } else {
    seatsDelta = Number(add);
    next = current + seatsDelta;
  }

  if (!Number.isInteger(next) || next < 0) {
    const error = new Error("extra participants cannot be negative");
    error.statusCode = 400;
    throw error;
  }

  if (seatsDelta === 0) {
    return reloadUserAccountPayload(user);
  }

  user.extra_participants = next;
  user.plan_limit_email_sent_at = null;
  await user.save();

  const trimmedNote = note ? String(note).trim().slice(0, 2000) : null;
  const trimmedUrl = attachmentUrl ? String(attachmentUrl).trim() : null;
  const trimmedFilename = attachmentFilename
    ? String(attachmentFilename).trim().slice(0, 255)
    : null;

  await UserParticipantAddon.create({
    user_id: user.user_id,
    seats: seatsDelta,
    note: trimmedNote,
    attachment_url: trimmedUrl || null,
    attachment_filename: trimmedFilename || null,
    created_by: adminUser?.user_id || null
  });

  return reloadUserAccountPayload(user);
}

async function saveExtraParticipantAttachment({ userId, file }) {
  const user = await User.findByPk(userId, { attributes: ["user_id"] });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (!file) {
    const error = new Error("file is required");
    error.statusCode = 400;
    throw error;
  }

  const filePath = `/${path.relative(process.cwd(), file.path).replaceAll(path.sep, "/")}`;
  return {
    file_path: filePath,
    original_filename: file.originalname || "attachment"
  };
}

async function setUserActiveStatus({ userId, isActive, adminUser }) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (Number(adminUser?.user_id) === Number(user.user_id)) {
    const error = new Error("You cannot change your own account status");
    error.statusCode = 400;
    throw error;
  }

  if (user.role === "super_admin") {
    const error = new Error("Super admin accounts cannot be deactivated");
    error.statusCode = 400;
    throw error;
  }

  user.is_active = Boolean(isActive);
  await user.save();
  return reloadUserAccountPayload(user);
}

module.exports = {
  listUsers,
  createUserByAdmin,
  assignUserPlan,
  listUserParticipantAddons,
  adjustUserExtraParticipants,
  saveExtraParticipantAttachment,
  setUserActiveStatus
};

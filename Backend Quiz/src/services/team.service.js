const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const { User, Role } = require("../models");
const { getHostPlanUsage } = require("./plan.service");
const { sendTeamMemberVerificationEmail } = require("./email.service");
const { signEmailVerificationToken } = require("../utils/jwt");
const { getFrontendPublicUrl } = require("../config/publicAppUrl");
const { buildSubAdminUserWhere } = require("../config/data-scope");

function createTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function buildVerificationUrl(user) {
  const token = signEmailVerificationToken({
    user_id: user.user_id,
    email: user.email
  });
  const origin = getFrontendPublicUrl();
  const path = `/verify-email?token=${encodeURIComponent(token)}`;
  return origin ? `${origin}${path}` : path;
}

function toTeamMemberPayload(member) {
  const roleNames = {
    host: "Host",
    author: "Question Author",
    auditor: "Question Auditor"
  };
  return {
    user_id: Number(member.user_id),
    parent_id: Number(member.parent_id),
    full_name: member.full_name,
    email: member.email,
    role: member.role,
    role_name: roleNames[member.role] || member.role,
    verification_status: member.email_verified_at ? "verified" : "pending",
    email_verified_at: member.email_verified_at || null,
    last_login_at: member.last_login_at || null,
    is_active: Boolean(member.is_active),
    created_at: member.created_at
  };
}

async function getTeamOwner(userId) {
  const owner = await User.findByPk(userId);
  if (!owner) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (owner.parent_id) {
    const error = new Error("Only a team lead can manage team members");
    error.statusCode = 403;
    error.code = "team_member_cannot_manage_team";
    throw error;
  }
  if (owner.role !== "host") {
    const error = new Error("Team management is available to host accounts");
    error.statusCode = 403;
    throw error;
  }
  return owner;
}

async function getTeamSummary(userId) {
  const owner = await getTeamOwner(userId);
  const usage = await getHostPlanUsage(owner.user_id);
  const members = await User.findAll({
    where: { parent_id: owner.user_id, is_active: true },
    attributes: [
      "user_id",
      "parent_id",
      "full_name",
      "email",
      "role",
      "email_verified_at",
      "last_login_at",
      "is_active",
      "created_at"
    ],
    order: [["created_at", "ASC"]]
  });

  const includedSeats = Math.max(0, Number(usage.plan?.included_team_members || 0));
  const extraSeats = Math.max(0, Number(owner.extra_team_members || 0));
  const totalSeats = includedSeats + extraSeats;
  const hostMembers = members.filter((member) => member.role === "host");
  const hasAuthor = members.some((member) => member.role === "author");
  const hasAuditor = members.some((member) => member.role === "auditor");

  return {
    team_lead: {
      user_id: Number(owner.user_id),
      full_name: owner.full_name,
      email: owner.email
    },
    plan: usage.plan,
    seats: {
      included: includedSeats,
      extra: extraSeats,
      total: totalSeats,
      used: hostMembers.length,
      remaining: Math.max(0, totalSeats - hostMembers.length)
    },
    content_roles: {
      author: { limit: 1, used: hasAuthor ? 1 : 0, remaining: hasAuthor ? 0 : 1 },
      auditor: { limit: 1, used: hasAuditor ? 1 : 0, remaining: hasAuditor ? 0 : 1 }
    },
    members: members.map(toTeamMemberPayload)
  };
}

async function sendVerificationForMember({ member, owner, password }) {
  const verificationUrl = buildVerificationUrl(member);
  await sendTeamMemberVerificationEmail({
    to: member.email,
    fullName: member.full_name,
    email: member.email,
    password,
    teamLeadName: owner.full_name || owner.email,
    verificationUrl
  });
}

async function addTeamMember({ ownerId, fullName, email, role = "host" }) {
  const owner = await getTeamOwner(ownerId);
  const normalizedRole = String(role || "host").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(fullName || "").trim();
  if (!normalizedName || !normalizedEmail) {
    const error = new Error("Full name and email are required");
    error.statusCode = 400;
    throw error;
  }
  if (!["host", "author", "auditor"].includes(normalizedRole)) {
    const error = new Error("Role must be Host, Question Author, or Question Auditor");
    error.statusCode = 400;
    throw error;
  }
  const assignedRole = await Role.findOne({
    where: { slug: normalizedRole, is_active: true }
  });
  if (!assignedRole) {
    const error = new Error("Selected role is not available");
    error.statusCode = 400;
    throw error;
  }

  const password = createTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const member = await sequelize.transaction(async (transaction) => {
    await User.findByPk(owner.user_id, { transaction, lock: transaction.LOCK.UPDATE });

    if (normalizedRole === "host") {
      const summary = await getTeamSummary(owner.user_id);
      if (!summary.plan || summary.plan.is_free) {
        const error = new Error("An active paid plan is required to add Host members");
        error.statusCode = 403;
        error.code = "team_plan_required";
        throw error;
      }
      const activeHosts = await User.count({
        where: { parent_id: owner.user_id, role: "host", is_active: true },
        transaction
      });
      if (activeHosts >= summary.seats.total) {
        const error = new Error("No Host team seats are available on this plan");
        error.statusCode = 403;
        error.code = "team_seat_limit";
        throw error;
      }
    } else {
      const existingRole = await User.findOne({
        where: {
          parent_id: owner.user_id,
          role: normalizedRole,
          is_active: true
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (existingRole) {
        const error = new Error(
          `This account already has an active Question ${normalizedRole === "author" ? "Author" : "Auditor"}`
        );
        error.statusCode = 409;
        error.code = `${normalizedRole}_limit_reached`;
        throw error;
      }
    }

    const existing = await User.findOne({
      where: { email: normalizedEmail },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (existing) {
      if (
        existing.is_active ||
        Number(existing.parent_id) !== Number(owner.user_id) ||
        existing.role !== normalizedRole
      ) {
        const error = new Error("Email already registered");
        error.statusCode = 409;
        throw error;
      }
      await existing.update(
        {
          full_name: normalizedName,
          password_hash: passwordHash,
          role: normalizedRole,
          client_id: owner.client_id || null,
          dept_id: owner.dept_id || null,
          plan_id: null,
          plan_expires_at: null,
          email_verified_at: null,
          must_change_password: true,
          is_active: true
        },
        { transaction }
      );
      return existing;
    }

    return User.create({
      full_name: normalizedName,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: normalizedRole,
      client_id: owner.client_id || null,
      dept_id: owner.dept_id || null,
      parent_id: owner.user_id,
      plan_id: null,
      plan_expires_at: null,
      email_verified_at: null,
      must_change_password: true,
      is_active: true
    }, { transaction });
  });

  let emailSent = false;
  let emailError = null;
  try {
    await sendVerificationForMember({ member, owner, password });
    emailSent = true;
  } catch (error) {
    emailError = error.message || "Verification email could not be sent";
    console.error("addTeamMember verification email failed:", error);
  }

  return {
    member: toTeamMemberPayload(member),
    email_sent: emailSent,
    email_error: emailError
  };
}

async function resendTeamMemberVerification({ ownerId, memberId }) {
  const owner = await getTeamOwner(ownerId);
  const member = await User.findOne({
    where: { user_id: memberId, parent_id: owner.user_id, is_active: true }
  });
  if (!member) {
    const error = new Error("Team member not found");
    error.statusCode = 404;
    throw error;
  }
  if (member.email_verified_at) {
    const error = new Error("This team member is already verified");
    error.statusCode = 400;
    throw error;
  }

  const password = createTemporaryPassword();
  member.password_hash = await bcrypt.hash(password, 10);
  member.must_change_password = true;
  await member.save();
  await sendVerificationForMember({ member, owner, password });
  return { member: toTeamMemberPayload(member), email_sent: true };
}

async function updatePendingTeamMember({
  ownerId,
  memberId,
  fullName,
  email,
  role
}) {
  const owner = await getTeamOwner(ownerId);
  const normalizedName = String(fullName || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (!normalizedName || !normalizedEmail) {
    const error = new Error("Full name and email are required");
    error.statusCode = 400;
    throw error;
  }
  if (!["host", "author", "auditor"].includes(normalizedRole)) {
    const error = new Error("Role must be Host, Question Author, or Question Auditor");
    error.statusCode = 400;
    throw error;
  }
  const assignedRole = await Role.findOne({
    where: { slug: normalizedRole, is_active: true }
  });
  if (!assignedRole) {
    const error = new Error("Selected role is not available");
    error.statusCode = 400;
    throw error;
  }

  const password = createTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const member = await sequelize.transaction(async (transaction) => {
    await User.findByPk(owner.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    const current = await User.findOne({
      where: {
        user_id: Number(memberId),
        parent_id: owner.user_id,
        is_active: true
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!current) {
      const error = new Error("Team member not found");
      error.statusCode = 404;
      throw error;
    }
    if (current.email_verified_at) {
      const error = new Error("Verified team members cannot be edited");
      error.statusCode = 400;
      throw error;
    }

    const duplicateEmail = await User.findOne({
      where: {
        email: normalizedEmail,
        user_id: { [Op.ne]: current.user_id }
      },
      transaction
    });
    if (duplicateEmail) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    if (normalizedRole === "host") {
      const summary = await getTeamSummary(owner.user_id);
      const activeHosts = await User.count({
        where: {
          parent_id: owner.user_id,
          role: "host",
          is_active: true,
          user_id: { [Op.ne]: current.user_id }
        },
        transaction
      });
      if (!summary.plan || summary.plan.is_free || activeHosts >= summary.seats.total) {
        const error = new Error("No Host team seats are available on this plan");
        error.statusCode = 403;
        throw error;
      }
    } else {
      const roleTaken = await User.findOne({
        where: {
          parent_id: owner.user_id,
          role: normalizedRole,
          is_active: true,
          user_id: { [Op.ne]: current.user_id }
        },
        transaction
      });
      if (roleTaken) {
        const error = new Error(
          `This account already has an active Question ${normalizedRole === "author" ? "Author" : "Auditor"}`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    await current.update(
      {
        full_name: normalizedName,
        email: normalizedEmail,
        role: normalizedRole,
        password_hash: passwordHash,
        client_id: owner.client_id || null,
        dept_id: owner.dept_id || null,
        must_change_password: true
      },
      { transaction }
    );
    return current;
  });

  await sendVerificationForMember({ member, owner, password });
  return { member: toTeamMemberPayload(member), email_sent: true };
}

async function resendOwnTeamVerification(userId) {
  const member = await User.findByPk(userId);
  if (!member || !member.is_active || !member.parent_id) {
    const error = new Error("Team member not found");
    error.statusCode = 404;
    throw error;
  }
  if (member.email_verified_at) {
    return { member: toTeamMemberPayload(member), email_sent: false, already_verified: true };
  }

  const owner = await User.findByPk(member.parent_id);
  if (!owner || !owner.is_active) {
    const error = new Error("Team lead is not available");
    error.statusCode = 400;
    throw error;
  }

  const password = createTemporaryPassword();
  member.password_hash = await bcrypt.hash(password, 10);
  member.must_change_password = true;
  await member.save();
  await sendVerificationForMember({ member, owner, password });
  return { member: toTeamMemberPayload(member), email_sent: true };
}

async function removeTeamMember({ ownerId, memberId }) {
  const owner = await getTeamOwner(ownerId);
  const member = await User.findOne({
    where: { user_id: memberId, parent_id: owner.user_id, is_active: true }
  });
  if (!member) {
    const error = new Error("Team member not found");
    error.statusCode = 404;
    throw error;
  }
  member.is_active = false;
  await member.save();
  return { user_id: Number(member.user_id), is_active: false };
}

async function listTeamsForAdmin(actor = null) {
  const ownerWhere = { role: "host", parent_id: null, is_active: true };
  const scopeWhere = buildSubAdminUserWhere(actor);
  if (scopeWhere) Object.assign(ownerWhere, scopeWhere);

  const owners = await User.findAll({
    where: ownerWhere,
    include: [
      {
        model: User,
        as: "teamMembers",
        required: true,
        where: { is_active: true },
        attributes: [
          "user_id",
          "parent_id",
          "full_name",
          "email",
          "role",
          "email_verified_at",
          "last_login_at",
          "is_active",
          "created_at"
        ]
      }
    ],
    order: [
      ["full_name", "ASC"],
      [{ model: User, as: "teamMembers" }, "full_name", "ASC"]
    ]
  });

  return Promise.all(
    owners.map(async (owner) => {
      const usage = await getHostPlanUsage(owner.user_id);
      const members = owner.teamMembers || [];
      const included = Math.max(0, Number(usage.plan?.included_team_members || 0));
      const extra = Math.max(0, Number(owner.extra_team_members || 0));
      const hostMembers = members.filter((member) => member.role === "host");
      const hasAuthor = members.some((member) => member.role === "author");
      const hasAuditor = members.some((member) => member.role === "auditor");
      return {
        team_lead: {
          user_id: Number(owner.user_id),
          full_name: owner.full_name,
          email: owner.email,
          plan_expires_at: usage.plan_expires_at
        },
        plan: usage.plan,
        seats: {
          included,
          extra,
          total: included + extra,
          used: hostMembers.length,
          remaining: Math.max(0, included + extra - hostMembers.length)
        },
        content_roles: {
          author: { limit: 1, used: hasAuthor ? 1 : 0, remaining: hasAuthor ? 0 : 1 },
          auditor: { limit: 1, used: hasAuditor ? 1 : 0, remaining: hasAuditor ? 0 : 1 }
        },
        members: members.map(toTeamMemberPayload)
      };
    })
  );
}

module.exports = {
  getTeamSummary,
  addTeamMember,
  updatePendingTeamMember,
  resendTeamMemberVerification,
  resendOwnTeamVerification,
  removeTeamMember,
  listTeamsForAdmin,
  toTeamMemberPayload
};

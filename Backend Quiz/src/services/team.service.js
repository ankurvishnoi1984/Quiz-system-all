const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { User } = require("../models");
const { getHostPlanUsage } = require("./plan.service");
const { sendTeamMemberVerificationEmail } = require("./email.service");
const { signEmailVerificationToken } = require("../utils/jwt");
const { getFrontendPublicUrl } = require("../config/publicAppUrl");

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
  return {
    user_id: Number(member.user_id),
    parent_id: Number(member.parent_id),
    full_name: member.full_name,
    email: member.email,
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
      used: members.length,
      remaining: Math.max(0, totalSeats - members.length)
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

async function addTeamMember({ ownerId, fullName, email }) {
  const owner = await getTeamOwner(ownerId);
  const summary = await getTeamSummary(owner.user_id);
  if (!summary.plan || summary.plan.is_free) {
    const error = new Error("An active paid plan is required to add team members");
    error.statusCode = 403;
    error.code = "team_plan_required";
    throw error;
  }
  if (summary.seats.remaining <= 0) {
    const error = new Error("No team seats are available on this plan");
    error.statusCode = 403;
    error.code = "team_seat_limit";
    throw error;
  }

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(fullName || "").trim();
  if (!normalizedName || !normalizedEmail) {
    const error = new Error("Full name and email are required");
    error.statusCode = 400;
    throw error;
  }
  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const password = createTemporaryPassword();
  const member = await User.create({
    full_name: normalizedName,
    email: normalizedEmail,
    password_hash: await bcrypt.hash(password, 10),
    role: "host",
    client_id: owner.client_id || null,
    dept_id: owner.dept_id || null,
    parent_id: owner.user_id,
    plan_id: null,
    plan_expires_at: null,
    email_verified_at: null,
    must_change_password: true,
    is_active: true
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

async function listTeamsForAdmin() {
  const owners = await User.findAll({
    where: { parent_id: null, is_active: true },
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
          used: members.length,
          remaining: Math.max(0, included + extra - members.length)
        },
        members: members.map(toTeamMemberPayload)
      };
    })
  );
}

module.exports = {
  getTeamSummary,
  addTeamMember,
  resendTeamMemberVerification,
  resendOwnTeamVerification,
  removeTeamMember,
  listTeamsForAdmin,
  toTeamMemberPayload
};

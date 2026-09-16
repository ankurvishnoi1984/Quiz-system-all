const { successResponse, errorResponse } = require("../utils/response");
const {
  getTeamSummary,
  addTeamMember,
  resendTeamMemberVerification,
  removeTeamMember,
  listTeamsForAdmin
} = require("../services/team.service");

async function getTeam(req, res) {
  try {
    const team = await getTeamSummary(req.user.user_id);
    return successResponse(res, { team }, "Team fetched", 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

async function addMember(req, res) {
  try {
    const result = await addTeamMember({
      ownerId: req.user.user_id,
      fullName: req.body?.full_name,
      email: req.body?.email
    });
    const message = result.email_sent
      ? "Team member added and verification email sent"
      : "Team member added, but verification email could not be sent";
    return successResponse(res, result, message, 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

async function resendVerification(req, res) {
  try {
    const result = await resendTeamMemberVerification({
      ownerId: req.user.user_id,
      memberId: Number(req.params.memberId)
    });
    return successResponse(res, result, "Verification email sent", 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

async function removeMember(req, res) {
  try {
    const result = await removeTeamMember({
      ownerId: req.user.user_id,
      memberId: Number(req.params.memberId)
    });
    return successResponse(res, result, "Team member removed", 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

async function listAdminTeams(req, res) {
  try {
    const teams = await listTeamsForAdmin();
    return successResponse(res, { teams }, "Teams fetched", 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  getTeam,
  addMember,
  resendVerification,
  removeMember,
  listAdminTeams
};

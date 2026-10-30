const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const sessionAdminController = require("../controllers/session-admin.controller");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/dashboard",
  authorizeRoles("session_admin"),
  sessionAdminController.dashboard
);

router.post(
  "/activate-all-questions",
  authorizeRoles("session_admin"),
  sessionAdminController.activateAllQuestions
);

router.post(
  "/sessions/:sessionId/password",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionAdminController.changePassword
);

// Session Admin may also change their own password via this path.
router.post(
  "/password",
  authorizeRoles("session_admin"),
  (req, res, next) => {
    // Resolve assigned session id then reuse changePassword handler.
    const {
      getAssignedSessionForAdmin
    } = require("../services/session-admin.service");
    getAssignedSessionForAdmin(req.user)
      .then((session) => {
        req.params.sessionId = String(session.session_id);
        return sessionAdminController.changePassword(req, res);
      })
      .catch((err) => {
        const { errorResponse } = require("../utils/response");
        return errorResponse(res, err.message, err.statusCode || 500);
      });
  }
);

module.exports = router;

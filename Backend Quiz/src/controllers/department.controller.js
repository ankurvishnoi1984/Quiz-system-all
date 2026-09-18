const { successResponse, errorResponse } = require("../utils/response");
const {
  createDepartment,
  getDepartments,
  getDepartmentById
} = require("../services/department.service");
const { getDepartmentReport } = require("../services/department-report.service");
const {
  validateCreateDepartmentPayload
} = require("../validators/department.validator");
const { canCreateDepartments } = require("../config/data-scope");
const { getDataScope, isSubAdmin, userHasRight } = require("../config/user-rights");

async function create(req, res) {
  try {
    if (!canCreateDepartments(req.user)) {
      return errorResponse(res, "Forbidden: insufficient permissions", 403);
    }
    if (isSubAdmin(req.user) && !userHasRight(req.user, "manage_departments")) {
      return errorResponse(res, "Forbidden: insufficient permissions", 403);
    }

    const errors = validateCreateDepartmentPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const department = await createDepartment({
      ...req.body,
      client_id: Number(req.body.client_id)
    });

    return successResponse(res, { department }, "Department created successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function list(req, res) {
  try {
    const user = req.user;
    let clientId = req.query.client_id ? Number(req.query.client_id) : null;
    const scope = getDataScope(user);

    if (scope === "client") {
      if (!user.client_id) {
        return errorResponse(res, "Client admin has no client assigned", 403);
      }
      clientId = Number(user.client_id);
    } else if ((scope === "department" || scope === "own_sessions") && user.dept_id) {
      const department = await getDepartmentById(user.dept_id);
      clientId = Number(department.client_id);
    }

    const departments = await getDepartments(
      {
        client_id: clientId
      },
      user
    );
    return successResponse(res, { departments }, "Departments fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function report(req, res) {
  try {
    const deptId = Number(req.params.departmentId);
    if (Number.isNaN(deptId)) return errorResponse(res, "departmentId must be a number", 400);

    const reportData = await getDepartmentReport({
      deptId,
      user: req.user,
      from: req.query.from,
      to: req.query.to
    });

    return successResponse(res, { report: reportData }, "Department report fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function detail(req, res) {
  try {
    const department = await getDepartmentById(req.params.departmentId);
    return successResponse(res, { department }, "Department fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  create,
  list,
  detail,
  report
};

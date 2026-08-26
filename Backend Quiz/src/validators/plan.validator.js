function parsePlanId(value) {
  if (value == null || value === "") return null;
  const planId = Number(value);
  if (!Number.isInteger(planId) || planId <= 0) return NaN;
  return planId;
}

function validateCreatePlanPayload(payload) {
  const errors = [];

  if (!payload?.name || typeof payload.name !== "string" || !payload.name.trim()) {
    errors.push("name is required");
  }

  const maxParticipants = Number(payload?.max_participants);
  if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
    errors.push("max_participants must be a positive whole number");
  }

  const maxQuestions = Number(payload?.max_questions_per_session);
  if (!Number.isInteger(maxQuestions) || maxQuestions <= 0) {
    errors.push("max_questions_per_session must be a positive whole number");
  }

  if (
    payload?.description != null &&
    payload.description !== "" &&
    typeof payload.description !== "string"
  ) {
    errors.push("description must be a string");
  }

  if (payload?.is_active !== undefined && typeof payload.is_active !== "boolean") {
    errors.push("is_active must be a boolean");
  }

  if (payload?.is_free !== undefined && typeof payload.is_free !== "boolean") {
    errors.push("is_free must be a boolean");
  }

  if (payload?.default_duration_days != null && payload.default_duration_days !== "") {
    const days = Number(payload.default_duration_days);
    if (!Number.isInteger(days) || days <= 0) {
      errors.push("default_duration_days must be a positive whole number or null");
    }
  }

  if (payload?.price_monthly != null && payload.price_monthly !== "") {
    const price = Number(payload.price_monthly);
    if (!Number.isInteger(price) || price < 0) {
      errors.push("price_monthly must be a non-negative whole number or null");
    }
  }

  if (payload?.currency !== undefined && payload.currency != null && payload.currency !== "") {
    if (typeof payload.currency !== "string" || !/^[A-Za-z]{3}$/.test(payload.currency.trim())) {
      errors.push("currency must be a 3-letter code (e.g. INR)");
    }
  }

  return errors;
}

function validateUpdatePlanPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["payload must be an object"];
  }

  const keys = Object.keys(payload);
  if (!keys.length) {
    errors.push("at least one field is required");
  }

  const allowed = [
    "name",
    "description",
    "max_participants",
    "max_questions_per_session",
    "is_active",
    "is_free",
    "default_duration_days",
    "price_monthly",
    "currency"
  ];
  const invalid = keys.filter((key) => !allowed.includes(key));
  if (invalid.length) {
    errors.push(`invalid fields: ${invalid.join(", ")}`);
  }

  if (payload.name !== undefined) {
    if (typeof payload.name !== "string" || !payload.name.trim()) {
      errors.push("name must be a non-empty string");
    }
  }

  if (payload.max_participants !== undefined) {
    const maxParticipants = Number(payload.max_participants);
    if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
      errors.push("max_participants must be a positive whole number");
    }
  }

  if (payload.max_questions_per_session !== undefined) {
    const maxQuestions = Number(payload.max_questions_per_session);
    if (!Number.isInteger(maxQuestions) || maxQuestions <= 0) {
      errors.push("max_questions_per_session must be a positive whole number");
    }
  }

  if (
    payload.description !== undefined &&
    payload.description !== null &&
    payload.description !== "" &&
    typeof payload.description !== "string"
  ) {
    errors.push("description must be a string or null");
  }

  if (payload.is_active !== undefined && typeof payload.is_active !== "boolean") {
    errors.push("is_active must be a boolean");
  }

  if (payload.is_free !== undefined && typeof payload.is_free !== "boolean") {
    errors.push("is_free must be a boolean");
  }

  if (payload.default_duration_days !== undefined) {
    if (payload.default_duration_days != null && payload.default_duration_days !== "") {
      const days = Number(payload.default_duration_days);
      if (!Number.isInteger(days) || days <= 0) {
        errors.push("default_duration_days must be a positive whole number or null");
      }
    }
  }

  if (payload.price_monthly !== undefined) {
    if (payload.price_monthly != null && payload.price_monthly !== "") {
      const price = Number(payload.price_monthly);
      if (!Number.isInteger(price) || price < 0) {
        errors.push("price_monthly must be a non-negative whole number or null");
      }
    }
  }

  if (payload.currency !== undefined && payload.currency != null && payload.currency !== "") {
    if (typeof payload.currency !== "string" || !/^[A-Za-z]{3}$/.test(payload.currency.trim())) {
      errors.push("currency must be a 3-letter code (e.g. INR)");
    }
  }

  return errors;
}

function validateAssignPlanPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return ["payload must be an object"];
  }

  if (payload.plan_id === undefined) {
    errors.push("plan_id is required");
    return errors;
  }

  if (payload.plan_id !== null && payload.plan_id !== "") {
    const planId = parsePlanId(payload.plan_id);
    if (Number.isNaN(planId)) {
      errors.push("plan_id must be a positive number or null");
    }
  }

  if (payload.plan_expires_at !== undefined && payload.plan_expires_at != null && payload.plan_expires_at !== "") {
    if (
      typeof payload.plan_expires_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(payload.plan_expires_at.trim())
    ) {
      errors.push("plan_expires_at must be a date (YYYY-MM-DD) or null");
    }
  }

  return errors;
}

module.exports = {
  parsePlanId,
  validateCreatePlanPayload,
  validateUpdatePlanPayload,
  validateAssignPlanPayload
};

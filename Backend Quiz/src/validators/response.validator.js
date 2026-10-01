function validateSubmitResponsePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return ["payload is required"];
  }
  if (Number.isNaN(Number(payload.question_id))) {
    errors.push("question_id must be a number");
  }
  if (payload.option_ids != null) {
    if (!Array.isArray(payload.option_ids) || payload.option_ids.length < 1) {
      errors.push("option_ids must be a non-empty array");
    } else {
      const ids = payload.option_ids.map(Number);
      if (ids.some((id) => Number.isNaN(id) || id <= 0)) {
        errors.push("option_ids must include only numeric option ids");
      }
      if (new Set(ids).size !== ids.length) {
        errors.push("option_ids cannot include duplicate option ids");
      }
    }
  }
  if (payload.ranking_order != null) {
    if (!Array.isArray(payload.ranking_order) || payload.ranking_order.length < 2) {
      errors.push("ranking_order must be an array with at least 2 option ids");
    } else {
      const ids = payload.ranking_order.map(Number);
      if (ids.some((id) => Number.isNaN(id) || id <= 0)) {
        errors.push("ranking_order must include only numeric option ids");
      }
      if (new Set(ids).size !== ids.length) {
        errors.push("ranking_order cannot include duplicate option ids");
      }
    }
  }
  if (payload.matching_pairs != null) {
    if (
      typeof payload.matching_pairs !== "object" ||
      Array.isArray(payload.matching_pairs) ||
      payload.matching_pairs === null
    ) {
      errors.push("matching_pairs must be an object of left_option_id to right_option_id");
    } else {
      const entries = Object.entries(payload.matching_pairs);
      if (entries.length < 3) {
        errors.push("matching_pairs must include at least 3 pairs");
      }
      const leftIds = entries.map(([left]) => Number(left));
      const rightIds = entries.map(([, right]) => Number(right));
      if (
        leftIds.some((id) => Number.isNaN(id) || id <= 0) ||
        rightIds.some((id) => Number.isNaN(id) || id <= 0)
      ) {
        errors.push("matching_pairs must use numeric option ids");
      }
      if (new Set(leftIds).size !== leftIds.length || new Set(rightIds).size !== rightIds.length) {
        errors.push("matching_pairs cannot reuse the same left or right option");
      }
    }
  }
  return errors;
}

module.exports = {
  validateSubmitResponsePayload
};

const { validateCreateQuestionPayload } = require("./question.validator");

const DIFFICULTIES = ["easy", "medium", "hard"];
const REVIEW_DECISIONS = ["approved", "changes_requested", "rejected"];

function validateBankQuestionPayload(payload) {
  const errors = validateCreateQuestionPayload(payload);
  const topicId = Number(payload?.topic_id);
  const topicName = String(payload?.topic_name || "").trim();
  if ((!Number.isInteger(topicId) || topicId <= 0) && !topicName) {
    errors.push("topic is required");
  }
  if (topicName.length > 120) {
    errors.push("topic must be 120 characters or less");
  }
  if (!DIFFICULTIES.includes(String(payload?.difficulty || "").toLowerCase())) {
    errors.push("difficulty must be easy, medium, or hard");
  }
  if (
    payload?.language != null &&
    (!String(payload.language).trim() || String(payload.language).trim().length > 20)
  ) {
    errors.push("language must be 20 characters or less");
  }
  if (payload?.media_type === "video_embed") {
    try {
      const mediaUrl = new URL(String(payload.media_url || ""));
      if (!["http:", "https:"].includes(mediaUrl.protocol)) {
        errors.push("embed media URL must use HTTP or HTTPS");
      }
    } catch {
      errors.push("embed media URL must be valid");
    }
  }
  return [...new Set(errors)];
}

function validateReviewPayload(payload) {
  const errors = [];
  const decision = String(payload?.decision || "").toLowerCase();
  const comments = String(payload?.comments || "").trim();
  if (!REVIEW_DECISIONS.includes(decision)) {
    errors.push("decision must be approved, changes_requested, or rejected");
  }
  if (decision !== "approved" && !comments) {
    errors.push("comments are required when requesting changes or rejecting");
  }
  if (comments.length > 5000) {
    errors.push("comments must be 5000 characters or less");
  }
  return errors;
}

function validateTopicPayload(payload, { partial = false } = {}) {
  const errors = [];
  if (!partial || payload?.name !== undefined) {
    const name = String(payload?.name || "").trim();
    if (!name) errors.push("name is required");
    if (name.length > 120) errors.push("name must be 120 characters or less");
  }
  if (
    payload?.description != null &&
    typeof payload.description !== "string"
  ) {
    errors.push("description must be a string");
  }
  return errors;
}

module.exports = {
  DIFFICULTIES,
  REVIEW_DECISIONS,
  validateBankQuestionPayload,
  validateReviewPayload,
  validateTopicPayload
};

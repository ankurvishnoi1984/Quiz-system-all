function validateCreateQuestionPayload(payload) {
  const errors = [];
  const allowedTypes = [
    "mcq",
    "poll",
    "survey",
    "word_cloud",
    "rating",
    "open_text",
    "true_false",
    "ranking",
    "emoji_reaction",
    "match"
  ];

  if (!payload?.question_type || typeof payload.question_type !== "string") {
    errors.push("question_type is required");
  } else if (!allowedTypes.includes(payload.question_type)) {
    errors.push("question_type is not supported");
  }

  if (
    !payload?.question_text ||
    typeof payload.question_text !== "string" ||
    !payload.question_text.trim()
  ) {
    errors.push("question_text is required");
  }

  if (Array.isArray(payload?.options)) {
    payload.options.forEach((option, index) => {
      if (
        !option ||
        typeof option.option_text !== "string" ||
        !option.option_text.trim()
      ) {
        errors.push(`option ${index + 1} must include option_text`);
      }
    });

    const optionTexts = payload.options
      .filter((option) => typeof option?.option_text === "string" && option.option_text.trim())
      .map((option) => option.option_text.trim().toLocaleLowerCase());
    if (new Set(optionTexts).size !== optionTexts.length) {
      errors.push("option text values must be unique");
    }
  }

  if (payload?.question_type === "mcq") {
    if (!Array.isArray(payload.options) || payload.options.length < 2) {
      errors.push("mcq options must include at least 2 entries");
    } else if (payload.is_quiz_mode) {
      const correctCount = payload.options.filter((option) => Boolean(option?.is_correct)).length;
      if (correctCount !== 1) {
        errors.push("mcq quiz questions must have exactly one correct option");
      }
    }
  }

  if (payload?.question_type === "poll") {
    if (!Array.isArray(payload.options) || payload.options.length < 2) {
      errors.push("poll options must include at least 2 entries");
    }
  }

  if (payload?.question_type === "emoji_reaction") {
    if (!Array.isArray(payload.options) || payload.options.length !== 5) {
      errors.push("emoji_reaction must include exactly 5 emoji options");
    }
    if (payload?.is_quiz_mode) {
      errors.push("emoji_reaction cannot be quiz mode");
    }
    if (payload?.allow_multiple_select) {
      errors.push("emoji_reaction does not support multiple selection");
    }
  }

  if (payload?.question_type === "survey") {
    const allowed = [
      "mcq",
      "poll",
      "rating",
      "open_text",
      "word_cloud",
      "ranking",
      "true_false",
      "emoji_reaction"
    ];
    if (!payload?.survey_subtype || !allowed.includes(payload.survey_subtype)) {
      errors.push("survey must include a valid survey_subtype");
    }
    if (payload.survey_subtype === "mcq" || payload.survey_subtype === "poll") {
      if (!Array.isArray(payload.options) || payload.options.length < 2) {
        errors.push("survey mcq/poll options must include at least 2 entries");
      }
    }
    if (payload.survey_subtype === "ranking") {
      if (!Array.isArray(payload.options) || payload.options.length < 2) {
        errors.push("survey ranking options must include at least 2 entries");
      } else if (payload.options.length > 10) {
        errors.push("survey ranking options cannot exceed 10 entries");
      }
    }
    if (payload.survey_subtype === "true_false") {
      if (!Array.isArray(payload.options) || payload.options.length !== 2) {
        errors.push("survey true_false must include exactly 2 options (True and False)");
      }
    }
    if (payload.survey_subtype === "emoji_reaction") {
      if (!Array.isArray(payload.options) || payload.options.length !== 5) {
        errors.push("survey emoji_reaction must include exactly 5 emoji options");
      }
      if (payload?.allow_multiple_select) {
        errors.push("survey emoji_reaction does not support multiple selection");
      }
    }
  }

  if (payload?.question_type === "true_false") {
    if (!Array.isArray(payload.options) || payload.options.length !== 2) {
      errors.push("true_false must include exactly 2 options (True and False)");
    } else if (payload.is_quiz_mode) {
      const correctCount = payload.options.filter((o) => o && o.is_correct).length;
      if (correctCount !== 1) {
        errors.push("true_false must have exactly one correct option");
      }
    }
  }

  if (payload?.question_type === "ranking") {
    if (!Array.isArray(payload.options) || payload.options.length < 2) {
      errors.push("ranking options must include at least 2 entries");
    } else if (payload.options.length > 10) {
      errors.push("ranking options cannot exceed 10 entries");
    }
  }

  if (payload?.question_type === "match") {
    if (!Array.isArray(payload.options) || payload.options.length < 6) {
      errors.push("match questions need at least 3 left and 3 right options");
    } else if (payload.options.length > 12) {
      errors.push("match questions cannot exceed 6 pairs (12 options)");
    } else if (payload.options.length % 2 !== 0) {
      errors.push("match questions must have an even number of options (equal left and right)");
    } else {
      const left = payload.options.filter((o) => o?.match_side === "left");
      const right = payload.options.filter((o) => o?.match_side === "right");
      if (left.length !== right.length || left.length < 3) {
        errors.push("match questions need 3–6 pairs with equal left and right sides");
      }
      const keys = payload.options
        .map((o) => String(o?.match_key || "").trim())
        .filter(Boolean);
      if (keys.length !== payload.options.length) {
        errors.push("each match option must include a match_key");
      } else {
        const byKey = new Map();
        for (const opt of payload.options) {
          const key = String(opt.match_key).trim();
          const side = opt.match_side;
          if (!byKey.has(key)) byKey.set(key, { left: 0, right: 0 });
          const bucket = byKey.get(key);
          if (side === "left") bucket.left += 1;
          if (side === "right") bucket.right += 1;
        }
        for (const [key, sides] of byKey) {
          if (sides.left !== 1 || sides.right !== 1) {
            errors.push(`match_key "${key}" must appear once on left and once on right`);
            break;
          }
        }
      }
      const leftTexts = left.map((o) => String(o.option_text || "").trim().toLocaleLowerCase());
      const rightTexts = right.map((o) => String(o.option_text || "").trim().toLocaleLowerCase());
      if (new Set(leftTexts).size !== leftTexts.length || new Set(rightTexts).size !== rightTexts.length) {
        errors.push("match left texts and right texts must each be unique");
      }
    }
    if (payload?.allow_multiple_select) {
      errors.push("match does not support multiple selection");
    }
  }

  if (payload?.question_type === "rating") {
    const min = Number(payload.rating_min ?? 1);
    const max = Number(payload.rating_max ?? 10);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      errors.push("rating_min must be less than rating_max");
    }
  }

  return [...new Set(errors)];
}

function validateUpdateQuestionPayload(payload) {
  if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
    return ["at least one field is required"];
  }
  return [];
}

function validateReorderPayload(payload) {
  const errors = [];
  if (!Array.isArray(payload?.orderedIds) || payload.orderedIds.length === 0) {
    errors.push("orderedIds must be a non-empty array");
  }
  return errors;
}

module.exports = {
  validateCreateQuestionPayload,
  validateUpdateQuestionPayload,
  validateReorderPayload
};

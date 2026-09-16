const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const {
  QuestionBankTopic,
  QuestionBankQuestion,
  QuestionBankOption,
  QuestionBankReview,
  Question,
  QuestionOption,
  Session,
  Department,
  Client,
  User
} = require("../models");
const {
  validateBankQuestionPayload
} = require("../validators/question-bank.validator");
const { assertSessionWriteAccess } = require("../config/data-scope");
const { userHasRight } = require("../config/user-rights");
const { assertSessionQuestionCapacity } = require("./plan.service");

const EDITABLE_STATUSES = ["draft", "changes_requested"];
const QUESTION_INCLUDE = [
  { model: QuestionBankTopic, as: "topic" },
  {
    model: QuestionBankOption,
    as: "options",
    separate: true,
    order: [["display_order", "ASC"]]
  },
  {
    model: User,
    as: "author",
    attributes: ["user_id", "full_name", "email"]
  },
  {
    model: User,
    as: "approver",
    attributes: ["user_id", "full_name", "email"],
    required: false
  },
  {
    model: QuestionBankReview,
    as: "reviews",
    separate: true,
    include: [
      {
        model: User,
        as: "auditor",
        attributes: ["user_id", "full_name", "email"]
      }
    ],
    order: [["reviewed_at", "DESC"]]
  }
];

function createError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
}

function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

function assertAuthor(user) {
  if (user?.role !== "author") {
    throw createError("Only Question Authors can perform this action", 403);
  }
}

function assertAuditor(user) {
  if (user?.role !== "auditor") {
    throw createError("Only Question Auditors can perform this action", 403);
  }
}

function assertTopicAdmin(user) {
  if (!isSuperAdmin(user)) {
    throw createError("Only Super Admin can manage question bank topics", 403);
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function normalizeQuestionInput(input) {
  const type = String(input.question_type || "").trim().toLowerCase();
  const nonScored = ["poll", "survey", "emoji_reaction"].includes(type);
  return {
    topic_id: Number(input.topic_id),
    question_type: type,
    question_text: String(input.question_text || "").trim(),
    difficulty: String(input.difficulty || "").trim().toLowerCase(),
    language: String(input.language || "en").trim().toLowerCase() || "en",
    media_url: input.media_url || null,
    media_type: input.media_type || null,
    media_thumbnail_url: input.media_thumbnail_url || null,
    is_quiz_mode: nonScored ? false : Boolean(input.is_quiz_mode),
    points_value: 0,
    time_limit_seconds: null,
    allow_multiple_select:
      type === "emoji_reaction" ? false : Boolean(input.allow_multiple_select),
    rating_min: Number(input.rating_min ?? 1),
    rating_max: Number(input.rating_max ?? 10),
    rating_min_label: input.rating_min_label || null,
    rating_max_label: input.rating_max_label || null,
    survey_subtype: type === "survey" ? input.survey_subtype || null : null
  };
}

function normalizeOptions(input) {
  const nonScored = ["poll", "survey", "emoji_reaction"].includes(
    String(input.question_type || "").toLowerCase()
  );
  return (Array.isArray(input.options) ? input.options : []).map((option, index) => ({
    option_text: String(option.option_text || "").trim(),
    media_url: option.media_url || null,
    is_correct: nonScored ? false : Boolean(option.is_correct),
    display_order: index + 1
  }));
}

async function assertActiveTopic(topicId, { transaction } = {}) {
  const topic = await QuestionBankTopic.findOne({
    where: { topic_id: Number(topicId), is_active: true },
    transaction
  });
  if (!topic) throw createError("Question bank topic not found or inactive", 400);
  return topic;
}

async function resolveQuestionTopic(input, user, { transaction } = {}) {
  const topicName = String(input.topic_name || "").trim();
  if (!topicName) {
    return assertActiveTopic(input.topic_id, { transaction });
  }

  let topic = await QuestionBankTopic.findOne({
    where: { name: topicName },
    transaction
  });
  if (topic) {
    if (!topic.is_active) {
      topic.is_active = true;
      await topic.save({ transaction });
    }
    return topic;
  }

  const base = slugify(topicName) || "topic";
  let slug = base;
  let suffix = 2;
  while (await QuestionBankTopic.findOne({ where: { slug }, transaction })) {
    slug = `${base}-${suffix}`.slice(0, 140);
    suffix += 1;
  }
  return QuestionBankTopic.create(
    {
      name: topicName,
      slug,
      description: null,
      is_active: true,
      display_order: 0,
      created_by: user.user_id
    },
    { transaction }
  );
}

async function getBankQuestionOrThrow(id, { transaction } = {}) {
  const question = await QuestionBankQuestion.findByPk(Number(id), {
    include: QUESTION_INCLUDE,
    transaction
  });
  if (!question) throw createError("Question bank question not found", 404);
  return question;
}

async function listTopics({ user, includeInactive = false }) {
  const where = {};
  if (!isSuperAdmin(user) || !includeInactive) where.is_active = true;
  const topics = await QuestionBankTopic.findAll({
    where,
    order: [
      ["display_order", "ASC"],
      ["name", "ASC"]
    ]
  });

  const counts = await QuestionBankQuestion.findAll({
    attributes: [
      "topic_id",
      [sequelize.fn("COUNT", sequelize.col("bank_question_id")), "question_count"]
    ],
    where: { status: "approved" },
    group: ["topic_id"],
    raw: true
  });
  const countByTopic = new Map(
    counts.map((row) => [Number(row.topic_id), Number(row.question_count || 0)])
  );
  return topics.map((topic) => ({
    ...topic.get({ plain: true }),
    approved_question_count: countByTopic.get(Number(topic.topic_id)) || 0
  }));
}

async function createTopic({ input, user }) {
  assertTopicAdmin(user);
  const name = String(input.name || "").trim();
  const base = slugify(name) || "topic";
  let slug = base;
  let suffix = 2;
  while (await QuestionBankTopic.findOne({ where: { slug } })) {
    slug = `${base}-${suffix}`.slice(0, 140);
    suffix += 1;
  }
  return QuestionBankTopic.create({
    name,
    slug,
    description: input.description ? String(input.description).trim() : null,
    is_active: input.is_active !== false,
    display_order: Number(input.display_order || 0),
    created_by: user.user_id
  });
}

async function updateTopic({ topicId, input, user }) {
  assertTopicAdmin(user);
  const topic = await QuestionBankTopic.findByPk(Number(topicId));
  if (!topic) throw createError("Question bank topic not found", 404);
  if (input.name !== undefined) topic.name = String(input.name).trim();
  if (input.description !== undefined) {
    topic.description = input.description ? String(input.description).trim() : null;
  }
  if (input.is_active !== undefined) topic.is_active = Boolean(input.is_active);
  if (input.display_order !== undefined) {
    topic.display_order = Number(input.display_order) || 0;
  }
  await topic.save();
  return topic;
}

function listScopeWhere(user, requestedStatus, { auditorQueueDefault = true } = {}) {
  if (user?.role === "author") {
    return {
      author_id: user.user_id,
      ...(requestedStatus ? { status: requestedStatus } : {})
    };
  }
  if (user?.role === "auditor") {
    return requestedStatus
      ? { status: requestedStatus }
      : auditorQueueDefault
        ? { status: "pending_review" }
        : {};
  }
  if (["super_admin", "client_admin", "dept_admin"].includes(user?.role)) {
    return requestedStatus ? { status: requestedStatus } : {};
  }
  if (!userHasRight(user, "builder")) {
    throw createError("Question bank access denied", 403);
  }
  return { status: "approved" };
}

async function listQuestions({ user, query = {} }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const requestedStatus = query.status ? String(query.status).toLowerCase() : null;
  const where = listScopeWhere(user, requestedStatus);

  if (query.topic_id) where.topic_id = Number(query.topic_id);
  if (query.difficulty && query.difficulty !== "mixed") {
    where.difficulty = String(query.difficulty).toLowerCase();
  }
  if (query.question_type) {
    where.question_type = String(query.question_type).toLowerCase();
  }
  if (query.search) {
    where.question_text = { [Op.like]: `%${String(query.search).trim()}%` };
  }

  const managementView = [
    "author",
    "auditor",
    "super_admin",
    "client_admin",
    "dept_admin"
  ].includes(user?.role);
  const include = managementView
    ? QUESTION_INCLUDE
    : [
        { model: QuestionBankTopic, as: "topic" },
        {
          model: QuestionBankOption,
          as: "options",
          separate: true,
          order: [["display_order", "ASC"]]
        }
      ];

  const { rows, count } = await QuestionBankQuestion.findAndCountAll({
    where,
    include,
    distinct: true,
    order: [["updated_at", "DESC"]],
    limit,
    offset: (page - 1) * limit
  });
  const statusRows = await QuestionBankQuestion.findAll({
    attributes: [
      "status",
      [sequelize.fn("COUNT", sequelize.col("bank_question_id")), "count"]
    ],
    where: listScopeWhere(user, null, { auditorQueueDefault: false }),
    group: ["status"],
    raw: true
  });
  const status_counts = statusRows.reduce((result, row) => {
    result[row.status] = Number(row.count || 0);
    return result;
  }, {});
  return {
    questions: rows,
    status_counts,
    pagination: {
      page,
      limit,
      total: Number(count),
      total_pages: Math.max(1, Math.ceil(Number(count) / limit))
    }
  };
}

async function createQuestion({ input, user }) {
  assertAuthor(user);
  const errors = validateBankQuestionPayload(input);
  if (errors.length) throw createError("Validation failed", 400, errors);

  return sequelize.transaction(async (transaction) => {
    const topic = await resolveQuestionTopic(input, user, { transaction });
    const question = await QuestionBankQuestion.create(
      {
        ...normalizeQuestionInput({ ...input, topic_id: topic.topic_id }),
        author_id: user.user_id,
        status: "draft",
        version: 1
      },
      { transaction }
    );
    const options = normalizeOptions(input).map((option) => ({
      ...option,
      bank_question_id: question.bank_question_id
    }));
    if (options.length) await QuestionBankOption.bulkCreate(options, { transaction });
    return getBankQuestionOrThrow(question.bank_question_id, { transaction });
  });
}

async function updateQuestion({ questionId, input, user }) {
  assertAuthor(user);
  const question = await getBankQuestionOrThrow(questionId);
  if (!isSuperAdmin(user) && Number(question.author_id) !== Number(user.user_id)) {
    throw createError("You can edit only your own questions", 403);
  }
  if (!EDITABLE_STATUSES.includes(question.status)) {
    throw createError(
      "Only draft or changes-requested questions can be edited",
      400
    );
  }

  const current = question.get({ plain: true });
  const merged = {
    ...current,
    ...input,
    options: input.options !== undefined ? input.options : current.options
  };
  const errors = validateBankQuestionPayload(merged);
  if (errors.length) throw createError("Validation failed", 400, errors);

  return sequelize.transaction(async (transaction) => {
    const topic = await resolveQuestionTopic(merged, user, { transaction });
    await question.update(
      normalizeQuestionInput({ ...merged, topic_id: topic.topic_id }),
      { transaction }
    );
    if (input.options !== undefined) {
      await QuestionBankOption.destroy({
        where: { bank_question_id: question.bank_question_id },
        transaction
      });
      const options = normalizeOptions(merged).map((option) => ({
        ...option,
        bank_question_id: question.bank_question_id
      }));
      if (options.length) await QuestionBankOption.bulkCreate(options, { transaction });
    }
    return getBankQuestionOrThrow(question.bank_question_id, { transaction });
  });
}

async function submitQuestion({ questionId, user }) {
  assertAuthor(user);
  const question = await getBankQuestionOrThrow(questionId);
  if (!isSuperAdmin(user) && Number(question.author_id) !== Number(user.user_id)) {
    throw createError("You can submit only your own questions", 403);
  }
  if (!EDITABLE_STATUSES.includes(question.status)) {
    throw createError("Only draft or changes-requested questions can be submitted", 400);
  }
  const plain = question.get({ plain: true });
  const errors = validateBankQuestionPayload(plain);
  if (errors.length) throw createError("Question is not ready for review", 400, errors);
  question.status = "pending_review";
  question.submitted_at = new Date();
  await question.save();
  return getBankQuestionOrThrow(question.bank_question_id);
}

async function reviewQuestion({ questionId, decision, comments, user }) {
  assertAuditor(user);
  const question = await getBankQuestionOrThrow(questionId);
  if (question.status !== "pending_review") {
    throw createError("Only pending questions can be reviewed", 400);
  }
  if (Number(question.author_id) === Number(user.user_id)) {
    throw createError("Authors cannot review or approve their own questions", 403);
  }

  return sequelize.transaction(async (transaction) => {
    await QuestionBankReview.create(
      {
        bank_question_id: question.bank_question_id,
        question_version: question.version,
        auditor_id: user.user_id,
        decision,
        comments: comments ? String(comments).trim() : null,
        reviewed_at: new Date()
      },
      { transaction }
    );
    question.status = decision;
    if (decision === "approved") {
      question.approved_by = user.user_id;
      question.approved_at = new Date();
      if (question.revision_of_id) {
        await QuestionBankQuestion.update(
          {
            status: "archived",
            archived_by: user.user_id,
            archived_at: new Date()
          },
          {
            where: {
              bank_question_id: question.revision_of_id,
              status: "approved"
            },
            transaction
          }
        );
      }
    } else {
      question.approved_by = null;
      question.approved_at = null;
    }
    await question.save({ transaction });
    return getBankQuestionOrThrow(question.bank_question_id, { transaction });
  });
}

async function archiveQuestion({ questionId, user }) {
  assertAuditor(user);
  const question = await getBankQuestionOrThrow(questionId);
  if (question.status !== "approved") {
    throw createError("Only approved questions can be archived", 400);
  }
  question.status = "archived";
  question.archived_by = user.user_id;
  question.archived_at = new Date();
  await question.save();
  return getBankQuestionOrThrow(question.bank_question_id);
}

async function createRevision({ questionId, user }) {
  assertAuthor(user);
  const source = await getBankQuestionOrThrow(questionId);
  if (!isSuperAdmin(user) && Number(source.author_id) !== Number(user.user_id)) {
    throw createError("You can revise only your own questions", 403);
  }
  if (source.status !== "approved") {
    throw createError("Only approved questions can create a revision", 400);
  }
  const plain = source.get({ plain: true });
  return sequelize.transaction(async (transaction) => {
    const revision = await QuestionBankQuestion.create(
      {
        ...normalizeQuestionInput(plain),
        revision_of_id: source.bank_question_id,
        version: Number(source.version || 1) + 1,
        author_id: user.user_id,
        status: "draft"
      },
      { transaction }
    );
    const options = normalizeOptions(plain).map((option) => ({
      ...option,
      bank_question_id: revision.bank_question_id
    }));
    if (options.length) await QuestionBankOption.bulkCreate(options, { transaction });
    return getBankQuestionOrThrow(revision.bank_question_id, { transaction });
  });
}

async function getSessionForBankCopy(sessionId) {
  const session = await Session.findByPk(Number(sessionId), {
    include: [
      {
        model: Department,
        include: [{ model: Client, attributes: ["client_id"] }]
      }
    ]
  });
  if (!session) throw createError("Session not found", 404);
  return session;
}

async function approvedQuestionsByIds(ids) {
  return QuestionBankQuestion.findAll({
    where: {
      bank_question_id: { [Op.in]: ids },
      status: "approved"
    },
    include: [
      {
        model: QuestionBankOption,
        as: "options",
        separate: true,
        order: [["display_order", "ASC"]]
      }
    ]
  });
}

async function copyBankQuestionsToSession({ sessionId, bankQuestionIds, user }) {
  const ids = [...new Set((bankQuestionIds || []).map(Number).filter(Number.isInteger))];
  if (!ids.length) throw createError("Select at least one approved question", 400);
  if (ids.length > 100) throw createError("At most 100 questions can be added at once", 400);

  const session = await getSessionForBankCopy(sessionId);
  assertSessionWriteAccess(user, session);
  if (!userHasRight(user, "builder")) throw createError("Question Builder access denied", 403);
  if (session.status !== "draft") {
    throw createError("Question bank items can be added only to draft sessions", 400);
  }

  const bankQuestions = await approvedQuestionsByIds(ids);
  const byId = new Map(bankQuestions.map((row) => [Number(row.bank_question_id), row]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  if (ordered.length !== ids.length) {
    throw createError("One or more selected questions are not approved or no longer available", 400);
  }

  const existing = await Question.findAll({
    where: { session_id: session.session_id },
    attributes: ["question_id", "question_type", "source_bank_question_id", "display_order"],
    order: [["display_order", "DESC"]]
  });
  const existingTypes = new Set(existing.map((row) => row.question_type));
  const selectedTypes = new Set(ordered.map((row) => row.question_type));
  if (selectedTypes.size !== 1 || (existingTypes.size && !existingTypes.has(ordered[0].question_type))) {
    throw createError("Selected questions must match the session question type", 400);
  }

  const usedSourceIds = new Set(
    existing.map((row) => Number(row.source_bank_question_id)).filter(Number.isInteger)
  );
  const duplicates = ids.filter((id) => usedSourceIds.has(id));
  if (duplicates.length) {
    throw createError("One or more selected questions are already in this session", 409, {
      duplicate_ids: duplicates
    });
  }

  await assertSessionQuestionCapacity({
    hostId: session.host_id,
    sessionId: session.session_id,
    additionalCount: ordered.length
  });

  return sequelize.transaction(async (transaction) => {
    let displayOrder = existing.length
      ? Math.max(...existing.map((row) => Number(row.display_order) || 0))
      : 0;
    const createdIds = [];

    for (const bankQuestion of ordered) {
      displayOrder += 1;
      const source = bankQuestion.get({ plain: true });
      const question = await Question.create(
        {
          session_id: session.session_id,
          dept_id: session.dept_id,
          question_type: source.question_type,
          question_text: source.question_text,
          media_url: source.media_url,
          media_type: source.media_type,
          media_thumbnail_url: source.media_thumbnail_url,
          is_quiz_mode: source.is_quiz_mode,
          points_value: source.is_quiz_mode ? null : 0,
          time_limit_seconds: null,
          allow_multiple_select: source.allow_multiple_select,
          rating_min: source.rating_min,
          rating_max: source.rating_max,
          rating_min_label: source.rating_min_label,
          rating_max_label: source.rating_max_label,
          survey_subtype: source.survey_subtype,
          is_live: false,
          answer_revealed: false,
          show_leaderboard: false,
          open_for_reattempt: false,
          submissions_closed: false,
          display_order: displayOrder,
          set_id: null,
          source_bank_question_id: source.bank_question_id
        },
        { transaction }
      );
      createdIds.push(question.question_id);
      const options = (source.options || []).map((option, index) => ({
        question_id: question.question_id,
        option_text: option.option_text,
        media_url: option.media_url || null,
        is_correct: Boolean(option.is_correct),
        display_order: Number(option.display_order) || index + 1
      }));
      if (options.length) await QuestionOption.bulkCreate(options, { transaction });
    }

    const questions = await Question.findAll({
      where: { session_id: session.session_id },
      include: [{ model: QuestionOption }],
      order: [
        ["display_order", "ASC"],
        [QuestionOption, "display_order", "ASC"]
      ],
      transaction
    });
    return { created_count: createdIds.length, created_ids: createdIds, questions };
  });
}

function shuffleUnique(rows) {
  const list = [...rows];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function addRandomQuestionsToSession({
  sessionId,
  topicId,
  difficulty,
  questionType,
  count,
  user
}) {
  const requested = Math.min(50, Math.max(1, Number(count) || 10));
  const where = {
    status: "approved",
    topic_id: Number(topicId),
    question_type: String(questionType || "").toLowerCase()
  };
  if (!Number.isInteger(where.topic_id) || where.topic_id <= 0) {
    throw createError("topic_id is required", 400);
  }
  if (!where.question_type) throw createError("question_type is required", 400);
  if (difficulty && difficulty !== "mixed") {
    where.difficulty = String(difficulty).toLowerCase();
  }

  const used = await Question.findAll({
    where: {
      session_id: Number(sessionId),
      source_bank_question_id: { [Op.ne]: null }
    },
    attributes: ["source_bank_question_id"],
    raw: true
  });
  const usedIds = used.map((row) => Number(row.source_bank_question_id)).filter(Number.isInteger);
  if (usedIds.length) where.bank_question_id = { [Op.notIn]: usedIds };

  const available = await QuestionBankQuestion.findAll({
    where,
    attributes: ["bank_question_id"],
    raw: true
  });
  if (available.length < requested) {
    throw createError(
      `Only ${available.length} matching approved question${available.length === 1 ? "" : "s"} are available`,
      400,
      { available_count: available.length, requested_count: requested }
    );
  }
  const selectedIds = shuffleUnique(available)
    .slice(0, requested)
    .map((row) => Number(row.bank_question_id));
  return copyBankQuestionsToSession({
    sessionId,
    bankQuestionIds: selectedIds,
    user
  });
}

module.exports = {
  listTopics,
  createTopic,
  updateTopic,
  listQuestions,
  createQuestion,
  updateQuestion,
  submitQuestion,
  reviewQuestion,
  archiveQuestion,
  createRevision,
  copyBankQuestionsToSession,
  addRandomQuestionsToSession
};

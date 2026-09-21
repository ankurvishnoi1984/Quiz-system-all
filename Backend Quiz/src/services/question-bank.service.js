const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const {
  QuestionBankTopic,
  QuestionBankQuestion,
  QuestionBankOption,
  QuestionBankReview,
  QuestionBankPack,
  QuestionBankPackItem,
  Question,
  QuestionOption,
  QuestionSet,
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
    model: User,
    as: "owner",
    attributes: ["user_id", "full_name", "email", "client_id", "dept_id"]
  },
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
    model: User,
    as: "archiver",
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

async function resolveSessionSetId(sessionId, setId) {
  if (setId === undefined || setId === null || setId === "") return null;
  const id = Number(setId);
  if (!Number.isFinite(id) || id <= 0) {
    throw createError("set_id must be a number", 400);
  }
  const row = await QuestionSet.findOne({
    where: { set_id: id, session_id: sessionId },
    attributes: ["set_id"]
  });
  if (!row) throw createError("Question set not found in this session", 400);
  return id;
}

function createError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
}

function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

function accountOwnerId(user) {
  return Number(user?.parent_id || user?.user_id);
}

async function adminOwnerIds(user) {
  if (isSuperAdmin(user)) return null;
  const where = { role: "host", parent_id: null, is_active: true };
  if (user?.role === "client_admin") where.client_id = Number(user.client_id);
  else if (user?.role === "dept_admin") where.dept_id = Number(user.dept_id);
  else return [accountOwnerId(user)];
  const owners = await User.findAll({ where, attributes: ["user_id"], raw: true });
  return owners.map((owner) => Number(owner.user_id));
}

async function resolveActionOwnerId(user, requestedOwnerId) {
  if (user?.role === "author" || user?.role === "auditor") {
    return accountOwnerId(user);
  }
  const ownerId = Number(requestedOwnerId);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw createError("Select a Host account", 400);
  }
  const allowedIds = await adminOwnerIds(user);
  if (allowedIds !== null && !allowedIds.includes(ownerId)) {
    throw createError("Host account is outside your access scope", 403);
  }
  const owner = await User.findOne({
    where: { user_id: ownerId, role: "host", parent_id: null, is_active: true }
  });
  if (!owner) throw createError("Host account not found or inactive", 404);
  return ownerId;
}

async function actionOwnerWhere(user) {
  if (isSuperAdmin(user)) return {};
  if (["client_admin", "dept_admin"].includes(user?.role)) {
    return { owner_id: { [Op.in]: await adminOwnerIds(user) } };
  }
  return { owner_id: accountOwnerId(user) };
}

async function listOwners({ user }) {
  if (!["super_admin", "client_admin", "dept_admin"].includes(user?.role)) {
    throw createError("Administrator access required", 403);
  }
  const ownerIds = await adminOwnerIds(user);
  return User.findAll({
    where: {
      role: "host",
      parent_id: null,
      is_active: true,
      ...(ownerIds === null ? {} : { user_id: { [Op.in]: ownerIds } })
    },
    attributes: ["user_id", "full_name", "email", "client_id", "dept_id"],
    order: [["full_name", "ASC"]]
  });
}

function assertAuthor(user) {
  if (!["author", "super_admin", "client_admin", "dept_admin"].includes(user?.role)) {
    throw createError("Only Question Authors and Administrators can perform this action", 403);
  }
}

function assertAuditor(user) {
  if (!["auditor", "super_admin", "client_admin", "dept_admin"].includes(user?.role)) {
    throw createError("Only Question Auditors and Administrators can perform this action", 403);
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

async function assertActiveTopic(topicId, ownerId, { transaction } = {}) {
  const topic = await QuestionBankTopic.findOne({
    where: {
      topic_id: Number(topicId),
      owner_id: Number(ownerId),
      is_active: true
    },
    transaction
  });
  if (!topic) throw createError("Question bank topic not found or inactive", 400);
  return topic;
}

async function resolveQuestionTopic(input, ownerId, user, { transaction } = {}) {
  const topicName = String(input.topic_name || "").trim();
  if (!topicName) {
    return assertActiveTopic(input.topic_id, ownerId, { transaction });
  }

  let topic = await QuestionBankTopic.findOne({
    where: { owner_id: ownerId, name: topicName },
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
  while (
    await QuestionBankTopic.findOne({
      where: { owner_id: ownerId, slug },
      transaction
    })
  ) {
    slug = `${base}-${suffix}`.slice(0, 140);
    suffix += 1;
  }
  return QuestionBankTopic.create(
    {
      owner_id: ownerId,
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

async function getBankQuestionOrThrow(id, { transaction, where = {} } = {}) {
  const question = await QuestionBankQuestion.findOne({
    where: { bank_question_id: Number(id), ...where },
    include: QUESTION_INCLUDE,
    transaction
  });
  if (!question) throw createError("Question bank question not found", 404);
  return question;
}

async function listTopics({ user, includeInactive = false }) {
  const ownerIds = await adminOwnerIds(user);
  const where = ownerIds === null ? {} : { owner_id: { [Op.in]: ownerIds } };
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
    where: {
      status: "approved",
      ...(ownerIds === null ? {} : { owner_id: { [Op.in]: ownerIds } })
    },
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
  const ownerId = Number(input.owner_id);
  const owner = await User.findOne({
    where: { user_id: ownerId, role: "host", parent_id: null, is_active: true }
  });
  if (!owner) throw createError("A valid Host account owner is required", 400);
  const name = String(input.name || "").trim();
  const base = slugify(name) || "topic";
  let slug = base;
  let suffix = 2;
  while (await QuestionBankTopic.findOne({ where: { owner_id: ownerId, slug } })) {
    slug = `${base}-${suffix}`.slice(0, 140);
    suffix += 1;
  }
  return QuestionBankTopic.create({
    owner_id: ownerId,
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

async function listScopeWhere(
  user,
  requestedStatus,
  { auditorQueueDefault = true } = {}
) {
  if (user?.role === "author") {
    return {
      owner_id: accountOwnerId(user),
      author_id: user.user_id,
      ...(requestedStatus ? { status: requestedStatus } : {})
    };
  }
  if (user?.role === "auditor") {
    const statusWhere = requestedStatus
      ? { status: requestedStatus }
      : auditorQueueDefault
        ? { status: "pending_review" }
        : {};
    return { owner_id: accountOwnerId(user), ...statusWhere };
  }
  if (isSuperAdmin(user)) {
    return requestedStatus ? { status: requestedStatus } : {};
  }
  if (["client_admin", "dept_admin"].includes(user?.role)) {
    const ownerIds = await adminOwnerIds(user);
    return {
      owner_id: { [Op.in]: ownerIds },
      ...(requestedStatus ? { status: requestedStatus } : {})
    };
  }
  if (!userHasRight(user, "builder")) {
    throw createError("Question bank access denied", 403);
  }
  return { owner_id: accountOwnerId(user), status: "approved" };
}

async function listQuestions({ user, query = {} }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const requestedStatus = query.status ? String(query.status).toLowerCase() : null;
  const forPack = query.for_pack === "true" || query.for_pack === true;
  const where = await listScopeWhere(user, forPack ? "approved" : requestedStatus, {
    auditorQueueDefault: !forPack
  });
  if (forPack && user?.role === "author") {
    delete where.author_id;
    where.owner_id = accountOwnerId(user);
    where.status = "approved";
  }
  let filteredOwnerId = null;
  if (query.owner_id) {
    filteredOwnerId = await resolveActionOwnerId(user, query.owner_id);
    where.owner_id = filteredOwnerId;
  }

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
  if (managementView && !requestedStatus && !where.status) {
    where.status = { [Op.ne]: "archived" };
  }
  if (managementView && requestedStatus !== "archived") {
    const revisionScope = await listScopeWhere(user, null, {
      auditorQueueDefault: false
    });
    if (filteredOwnerId) revisionScope.owner_id = filteredOwnerId;
    const activeRevisions = await QuestionBankQuestion.findAll({
      attributes: ["revision_of_id"],
      where: {
        ...revisionScope,
        revision_of_id: { [Op.ne]: null },
        status: {
          [Op.in]: ["draft", "pending_review", "changes_requested"]
        }
      },
      raw: true
    });
    const supersededIds = [
      ...new Set(
        activeRevisions
          .map((row) => Number(row.revision_of_id))
          .filter(Number.isInteger)
      )
    ];
    if (supersededIds.length) {
      where.bank_question_id = { [Op.notIn]: supersededIds };
    }
  }
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
  const statusWhere = await listScopeWhere(user, null, {
    auditorQueueDefault: false
  });
  if (filteredOwnerId) statusWhere.owner_id = filteredOwnerId;
  const statusRows = await QuestionBankQuestion.findAll({
    attributes: [
      "status",
      [sequelize.fn("COUNT", sequelize.col("bank_question_id")), "count"]
    ],
    where: statusWhere,
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
    const ownerId = await resolveActionOwnerId(user, input.owner_id);
    const topic = await resolveQuestionTopic(input, ownerId, user, { transaction });
    const question = await QuestionBankQuestion.create(
      {
        ...normalizeQuestionInput({ ...input, topic_id: topic.topic_id }),
        owner_id: ownerId,
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
  const ownerWhere = await actionOwnerWhere(user);
  const question = await getBankQuestionOrThrow(questionId, {
    where: { ...ownerWhere, author_id: user.user_id }
  });
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
    const topic = await resolveQuestionTopic(
      merged,
      question.owner_id,
      user,
      { transaction }
    );
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
  const ownerWhere = await actionOwnerWhere(user);
  const question = await getBankQuestionOrThrow(questionId, {
    where: { ...ownerWhere, author_id: user.user_id }
  });
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
  const ownerWhere = await actionOwnerWhere(user);
  const question = await getBankQuestionOrThrow(questionId, {
    where: ownerWhere
  });
  if (question.status !== "pending_review") {
    throw createError("Only pending questions can be reviewed", 400);
  }
  if (
    user.role === "auditor" &&
    Number(question.author_id) === Number(user.user_id)
  ) {
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
            archived_at: new Date(),
            archived_reason: `Superseded by approved version ${question.version}`
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

async function archiveQuestion({ questionId, reason, user }) {
  assertAuditor(user);
  const ownerWhere = await actionOwnerWhere(user);
  const question = await getBankQuestionOrThrow(questionId, {
    where: ownerWhere
  });
  if (question.status !== "approved") {
    throw createError("Only approved questions can be archived", 400);
  }
  const archivedReason = String(reason || "").trim();
  if (!archivedReason) {
    throw createError("Archive reason is required", 400);
  }
  if (archivedReason.length > 5000) {
    throw createError("Archive reason must be 5000 characters or less", 400);
  }
  question.status = "archived";
  question.archived_by = user.user_id;
  question.archived_at = new Date();
  question.archived_reason = archivedReason;
  await question.save();
  return getBankQuestionOrThrow(question.bank_question_id);
}

async function createRevision({ questionId, user }) {
  assertAuthor(user);
  const ownerWhere = await actionOwnerWhere(user);
  const source = await getBankQuestionOrThrow(questionId, {
    where: { ...ownerWhere, author_id: user.user_id }
  });
  if (source.status !== "approved") {
    throw createError("Only approved questions can create a revision", 400);
  }
  const activeRevision = await QuestionBankQuestion.findOne({
    where: {
      owner_id: source.owner_id,
      revision_of_id: source.bank_question_id,
      status: {
        [Op.in]: ["draft", "pending_review", "changes_requested"]
      }
    },
    order: [["version", "DESC"]]
  });
  if (activeRevision) {
    throw createError(
      `Version ${activeRevision.version} is already in progress`,
      409,
      {
        bank_question_id: activeRevision.bank_question_id,
        version: activeRevision.version,
        status: activeRevision.status
      }
    );
  }
  const highestChildVersion = await QuestionBankQuestion.max("version", {
    where: {
      owner_id: source.owner_id,
      revision_of_id: source.bank_question_id
    }
  });
  const nextVersion =
    Math.max(Number(source.version || 1), Number(highestChildVersion || 0)) + 1;
  const plain = source.get({ plain: true });
  return sequelize.transaction(async (transaction) => {
    const revision = await QuestionBankQuestion.create(
      {
        ...normalizeQuestionInput(plain),
        owner_id: source.owner_id,
        revision_of_id: source.bank_question_id,
        version: nextVersion,
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
      },
      {
        model: User,
        attributes: ["user_id", "parent_id"]
      }
    ]
  });
  if (!session) throw createError("Session not found", 404);
  return session;
}

async function approvedQuestionsByIds(ids, ownerId) {
  return QuestionBankQuestion.findAll({
    where: {
      bank_question_id: { [Op.in]: ids },
      owner_id: Number(ownerId),
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

async function copyBankQuestionsToSession({ sessionId, bankQuestionIds, setId, user }) {
  const ids = [...new Set((bankQuestionIds || []).map(Number).filter(Number.isInteger))];
  if (!ids.length) throw createError("Select at least one approved question", 400);
  if (ids.length > 100) throw createError("At most 100 questions can be added at once", 400);

  const session = await getSessionForBankCopy(sessionId);
  assertSessionWriteAccess(user, session);
  if (!userHasRight(user, "builder")) throw createError("Question Builder access denied", 403);
  if (session.status !== "draft") {
    throw createError("Question bank items can be added only to draft sessions", 400);
  }
  const targetSetId = await resolveSessionSetId(session.session_id, setId);
  const targetOwnerId = Number(session.user?.parent_id || session.host_id);

  const bankQuestions = await approvedQuestionsByIds(ids, targetOwnerId);
  const byId = new Map(bankQuestions.map((row) => [Number(row.bank_question_id), row]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  if (ordered.length !== ids.length) {
    throw createError("One or more selected questions are not approved or no longer available", 400);
  }

  const existing = await Question.findAll({
    where: { session_id: session.session_id },
    attributes: [
      "question_id",
      "question_type",
      "source_bank_question_id",
      "set_id",
      "display_order"
    ],
    order: [["display_order", "DESC"]]
  });
  const existingTypes = new Set(existing.map((row) => row.question_type));
  const selectedTypes = new Set(ordered.map((row) => row.question_type));
  if (selectedTypes.size !== 1 || (existingTypes.size && !existingTypes.has(ordered[0].question_type))) {
    throw createError("Selected questions must match the session question type", 400);
  }

  // Same bank question may be copied into different sets. Block only when it is
  // already present in the target set (or anywhere, when sets are not used).
  const usedInTarget = existing.filter((row) => {
    const sourceId = Number(row.source_bank_question_id);
    if (!Number.isInteger(sourceId)) return false;
    if (targetSetId == null) return true;
    return Number(row.set_id) === Number(targetSetId);
  });
  const usedSourceIds = new Set(
    usedInTarget.map((row) => Number(row.source_bank_question_id)).filter(Number.isInteger)
  );
  const duplicates = ids.filter((id) => usedSourceIds.has(id));
  if (duplicates.length) {
    throw createError(
      targetSetId == null
        ? "One or more selected questions are already in this session"
        : "One or more selected questions are already in this set",
      409,
      { duplicate_ids: duplicates }
    );
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
          points_value: source.is_quiz_mode
            ? Number(source.points_value) > 0
              ? Number(source.points_value)
              : 10
            : 0,
          time_limit_seconds:
            source.time_limit_seconds != null ? Number(source.time_limit_seconds) : null,
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
          set_id: targetSetId,
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
  difficultyCounts,
  questionType,
  count,
  setId,
  user
}) {
  const normalizedDifficulty = String(difficulty || "mixed").toLowerCase();
  const useDifficultyMix =
    normalizedDifficulty === "mixed" &&
    difficultyCounts &&
    typeof difficultyCounts === "object";
  const requestedByDifficulty = useDifficultyMix
    ? {
        easy: Math.max(0, Number(difficultyCounts.easy) || 0),
        medium: Math.max(0, Number(difficultyCounts.medium) || 0),
        hard: Math.max(0, Number(difficultyCounts.hard) || 0)
      }
    : null;
  if (
    requestedByDifficulty &&
    Object.values(requestedByDifficulty).some((value) => !Number.isInteger(value))
  ) {
    throw createError("Difficulty quantities must be whole numbers", 400);
  }
  const requested = requestedByDifficulty
    ? Object.values(requestedByDifficulty).reduce((sum, value) => sum + value, 0)
    : Math.min(50, Math.max(1, Number(count) || 10));
  if (requested < 1) {
    throw createError("Select at least one random question", 400);
  }
  if (requested > 50) {
    throw createError("At most 50 random questions can be added at once", 400);
  }
  const session = await getSessionForBankCopy(sessionId);
  assertSessionWriteAccess(user, session);
  if (!userHasRight(user, "builder")) {
    throw createError("Question Builder access denied", 403);
  }
  if (session.status !== "draft") {
    throw createError("Question bank items can be added only to draft sessions", 400);
  }
  const targetOwnerId = Number(session.user?.parent_id || session.host_id);
  const where = {
    owner_id: targetOwnerId,
    status: "approved",
    topic_id: Number(topicId),
    question_type: String(questionType || "").toLowerCase()
  };
  if (!Number.isInteger(where.topic_id) || where.topic_id <= 0) {
    throw createError("topic_id is required", 400);
  }
  if (!where.question_type) throw createError("question_type is required", 400);
  if (normalizedDifficulty !== "mixed") {
    where.difficulty = normalizedDifficulty;
  }

  const usedWhere = {
    session_id: Number(sessionId),
    source_bank_question_id: { [Op.ne]: null }
  };
  const targetSetId = await resolveSessionSetId(session.session_id, setId);
  if (targetSetId != null) {
    usedWhere.set_id = targetSetId;
  }
  const used = await Question.findAll({
    where: usedWhere,
    attributes: ["source_bank_question_id"],
    raw: true
  });
  const usedIds = used.map((row) => Number(row.source_bank_question_id)).filter(Number.isInteger);
  if (usedIds.length) where.bank_question_id = { [Op.notIn]: usedIds };

  const available = await QuestionBankQuestion.findAll({
    where,
    attributes: ["bank_question_id", "difficulty"],
    raw: true
  });
  if (requestedByDifficulty) {
    const selectedIds = [];
    for (const level of ["easy", "medium", "hard"]) {
      const levelAvailable = available.filter((row) => row.difficulty === level);
      const levelRequested = requestedByDifficulty[level];
      if (levelAvailable.length < levelRequested) {
        throw createError(
          `Only ${levelAvailable.length} ${level} question${levelAvailable.length === 1 ? "" : "s"} are available`,
          400,
          {
            difficulty: level,
            available_count: levelAvailable.length,
            requested_count: levelRequested
          }
        );
      }
      selectedIds.push(
        ...shuffleUnique(levelAvailable)
          .slice(0, levelRequested)
          .map((row) => Number(row.bank_question_id))
      );
    }
    return copyBankQuestionsToSession({
      sessionId,
      bankQuestionIds: shuffleUnique(selectedIds),
      setId,
      user
    });
  }
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
    setId,
    user
  });
}

const MAX_BANK_IMPORT_ROWS = 500;

function normalizeImportRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw createError("At least one question row is required", 400);
  }
  if (rows.length > MAX_BANK_IMPORT_ROWS) {
    throw createError(`A workbook can contain at most ${MAX_BANK_IMPORT_ROWS} questions`, 400);
  }
  return rows.map((row, index) => {
    const rowNumber = Number(row?.row || index + 2);
    const payload = row?.payload && typeof row.payload === "object" ? row.payload : row;
    const clientErrors = Array.isArray(row?.errors) ? row.errors.filter(Boolean) : [];
    return { row: rowNumber, payload, clientErrors };
  });
}

async function previewBankImport({ rows, owner_id, user }) {
  assertAuthor(user);
  const normalized = normalizeImportRows(rows);
  // Resolve owner once so admin imports fail early if Host is missing.
  await resolveActionOwnerId(user, owner_id);

  const resultRows = normalized.map(({ row, payload, clientErrors }) => {
    const errors = [
      ...clientErrors,
      ...validateBankQuestionPayload({
        ...payload,
        topic_name: payload.topic_name || payload.topic || null,
        difficulty: payload.difficulty || "medium",
        language: payload.language || "en"
      })
    ];
    const uniqueErrors = [...new Set(errors)];
    return {
      row,
      question_text: payload.question_text || "",
      question_type: payload.question_type || null,
      valid: uniqueErrors.length === 0,
      errors: uniqueErrors,
      payload
    };
  });

  return {
    total_rows: resultRows.length,
    valid_rows: resultRows.filter((row) => row.valid).length,
    invalid_rows: resultRows.filter((row) => !row.valid).length,
    rows: resultRows
  };
}

async function importBankQuestions({ questions, owner_id, user }) {
  assertAuthor(user);
  const normalized = normalizeImportRows(questions);
  const ownerId = await resolveActionOwnerId(user, owner_id);

  const prepared = [];
  const skipped = [];
  for (const item of normalized) {
    const payload = {
      ...item.payload,
      topic_name: item.payload.topic_name || item.payload.topic || null,
      difficulty: item.payload.difficulty || "medium",
      language: item.payload.language || "en",
      owner_id: ownerId
    };
    const errors = [
      ...item.clientErrors,
      ...validateBankQuestionPayload(payload)
    ];
    const uniqueErrors = [...new Set(errors)];
    if (uniqueErrors.length) {
      skipped.push({ row: item.row, errors: uniqueErrors, question_text: payload.question_text || "" });
      continue;
    }
    prepared.push({ row: item.row, payload });
  }

  if (!prepared.length) {
    throw createError(
      "No valid questions to import",
      400,
      skipped.map((item) => `Row ${item.row}: ${item.errors.join("; ")}`)
    );
  }

  const created = [];
  await sequelize.transaction(async (transaction) => {
    for (const item of prepared) {
      const topic = await resolveQuestionTopic(item.payload, ownerId, user, { transaction });
      const question = await QuestionBankQuestion.create(
        {
          ...normalizeQuestionInput({ ...item.payload, topic_id: topic.topic_id }),
          owner_id: ownerId,
          author_id: user.user_id,
          status: "draft",
          version: 1
        },
        { transaction }
      );
      const options = normalizeOptions(item.payload).map((option) => ({
        ...option,
        bank_question_id: question.bank_question_id
      }));
      if (options.length) await QuestionBankOption.bulkCreate(options, { transaction });
      created.push({
        row: item.row,
        bank_question_id: question.bank_question_id,
        question_text: item.payload.question_text
      });
    }
  });

  return {
    created_count: created.length,
    skipped_count: skipped.length,
    created,
    skipped
  };
}

const PACK_INCLUDE = [
  {
    model: User,
    as: "owner",
    attributes: ["user_id", "full_name", "email", "client_id", "dept_id"]
  },
  {
    model: User,
    as: "creator",
    attributes: ["user_id", "full_name", "email"]
  },
  {
    model: QuestionBankPackItem,
    as: "items",
    separate: true,
    order: [["display_order", "ASC"]],
    include: [
      {
        model: QuestionBankQuestion,
        as: "question",
        include: [
          { model: QuestionBankTopic, as: "topic" },
          {
            model: QuestionBankOption,
            as: "options",
            separate: true,
            order: [["display_order", "ASC"]]
          }
        ]
      }
    ]
  }
];

function assertPackManager(user) {
  if (
    !["author", "auditor", "super_admin", "client_admin", "dept_admin"].includes(user?.role)
  ) {
    throw createError("Pack management access denied", 403);
  }
}

async function packOwnerWhere(user) {
  if (isSuperAdmin(user)) return {};
  if (["client_admin", "dept_admin"].includes(user?.role)) {
    return { owner_id: { [Op.in]: await adminOwnerIds(user) } };
  }
  if (["author", "auditor"].includes(user?.role) || userHasRight(user, "builder")) {
    return { owner_id: accountOwnerId(user) };
  }
  throw createError("Question bank access denied", 403);
}

async function uniquePackSlug(ownerId, name, { excludePackId = null, transaction } = {}) {
  const base = slugify(name) || "pack";
  let slug = base;
  let suffix = 2;
  while (true) {
    const where = { owner_id: ownerId, slug };
    if (excludePackId) where.pack_id = { [Op.ne]: excludePackId };
    const existing = await QuestionBankPack.findOne({ where, transaction });
    if (!existing) return slug.slice(0, 140);
    slug = `${base}-${suffix}`.slice(0, 140);
    suffix += 1;
  }
}

async function validatePackQuestionIds(ownerId, bankQuestionIds) {
  const ids = [...new Set((bankQuestionIds || []).map(Number).filter(Number.isInteger))];
  if (!ids.length) throw createError("Select at least one approved question for this pack", 400);
  if (ids.length > 100) throw createError("A pack can contain at most 100 questions", 400);

  const rows = await QuestionBankQuestion.findAll({
    where: {
      owner_id: ownerId,
      bank_question_id: { [Op.in]: ids },
      status: "approved"
    },
    attributes: ["bank_question_id", "question_type", "question_text", "difficulty"]
  });
  if (rows.length !== ids.length) {
    throw createError(
      "Every pack question must be an approved question from this Host account",
      400
    );
  }
  const types = new Set(rows.map((row) => row.question_type));
  if (types.size !== 1) {
    throw createError("All questions in a pack must share the same question type", 400);
  }
  const byId = new Map(rows.map((row) => [Number(row.bank_question_id), row]));
  return {
    ids: ids.filter((id) => byId.has(id)),
    questionType: rows[0].question_type,
    rows: ids.map((id) => byId.get(id)).filter(Boolean)
  };
}

async function getPackOrThrow(packId, { where = {}, includeItems = true } = {}) {
  const pack = await QuestionBankPack.findOne({
    where: { pack_id: Number(packId), ...where },
    include: includeItems ? PACK_INCLUDE : [
      {
        model: User,
        as: "owner",
        attributes: ["user_id", "full_name", "email"]
      },
      {
        model: User,
        as: "creator",
        attributes: ["user_id", "full_name", "email"]
      }
    ]
  });
  if (!pack) throw createError("Question pack not found", 404);
  return pack;
}

function serializePack(pack) {
  const plain = typeof pack.toJSON === "function" ? pack.toJSON() : pack;
  const items = plain.items || [];
  return {
    ...plain,
    question_count: items.length,
    approved_question_count: items.filter((item) => item.question?.status === "approved").length
  };
}

async function listPacks({ user, query = {} }) {
  const where = await packOwnerWhere(user);
  if (query.owner_id) {
    where.owner_id = await resolveActionOwnerId(user, query.owner_id);
  }
  if (query.question_type) {
    where.question_type = String(query.question_type).toLowerCase();
  }
  if (query.is_active === "true" || query.is_active === true) where.is_active = true;
  if (query.is_active === "false" || query.is_active === false) where.is_active = false;
  if (
    userHasRight(user, "builder") &&
    !["author", "auditor", "super_admin", "client_admin", "dept_admin"].includes(user?.role)
  ) {
    where.is_active = true;
  }
  if (query.search) {
    const term = `%${String(query.search).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { description: { [Op.like]: term } }
    ];
  }

  const packs = await QuestionBankPack.findAll({
    where,
    include: PACK_INCLUDE,
    order: [
      ["updated_at", "DESC"],
      ["name", "ASC"]
    ]
  });
  return packs.map(serializePack);
}

async function getPack({ packId, user }) {
  const where = await packOwnerWhere(user);
  const pack = await getPackOrThrow(packId, { where });
  if (
    userHasRight(user, "builder") &&
    !["author", "auditor", "super_admin", "client_admin", "dept_admin"].includes(user?.role) &&
    !pack.is_active
  ) {
    throw createError("Question pack not found", 404);
  }
  return serializePack(pack);
}

async function createPack({ input, user }) {
  assertPackManager(user);
  const name = String(input?.name || "").trim();
  if (!name) throw createError("Pack name is required", 400);
  if (name.length > 120) throw createError("Pack name must be 120 characters or less", 400);
  const description = String(input?.description || "").trim() || null;
  const ownerId = await resolveActionOwnerId(
    user,
    input?.owner_id || (["author", "auditor"].includes(user.role) ? accountOwnerId(user) : null)
  );
  const validated = await validatePackQuestionIds(ownerId, input?.bank_question_ids);
  const slug = await uniquePackSlug(ownerId, name);

  const packId = await sequelize.transaction(async (transaction) => {
    const pack = await QuestionBankPack.create(
      {
        owner_id: ownerId,
        name,
        slug,
        description,
        question_type: validated.questionType,
        is_active: input?.is_active === false ? false : true,
        created_by: user.user_id
      },
      { transaction }
    );
    await QuestionBankPackItem.bulkCreate(
      validated.ids.map((bankQuestionId, index) => ({
        pack_id: pack.pack_id,
        bank_question_id: bankQuestionId,
        display_order: index + 1
      })),
      { transaction }
    );
    return pack.pack_id;
  });
  return getPack({ packId, user });
}

async function updatePack({ packId, input, user }) {
  assertPackManager(user);
  const where = await packOwnerWhere(user);
  const pack = await getPackOrThrow(packId, { where, includeItems: false });

  if (input?.name !== undefined) {
    const name = String(input.name || "").trim();
    if (!name) throw createError("Pack name is required", 400);
    if (name.length > 120) throw createError("Pack name must be 120 characters or less", 400);
    pack.name = name;
    pack.slug = await uniquePackSlug(pack.owner_id, name, { excludePackId: pack.pack_id });
  }
  if (input?.description !== undefined) {
    pack.description = String(input.description || "").trim() || null;
  }
  if (input?.is_active !== undefined) {
    pack.is_active = Boolean(input.is_active);
  }

  await sequelize.transaction(async (transaction) => {
    if (input?.bank_question_ids !== undefined) {
      const validated = await validatePackQuestionIds(pack.owner_id, input.bank_question_ids);
      pack.question_type = validated.questionType;
      await QuestionBankPackItem.destroy({ where: { pack_id: pack.pack_id }, transaction });
      await QuestionBankPackItem.bulkCreate(
        validated.ids.map((bankQuestionId, index) => ({
          pack_id: pack.pack_id,
          bank_question_id: bankQuestionId,
          display_order: index + 1
        })),
        { transaction }
      );
    }
    await pack.save({ transaction });
  });
  return getPack({ packId: pack.pack_id, user });
}

async function deletePack({ packId, user }) {
  assertPackManager(user);
  const where = await packOwnerWhere(user);
  const pack = await getPackOrThrow(packId, { where, includeItems: false });
  await sequelize.transaction(async (transaction) => {
    await QuestionBankPackItem.destroy({ where: { pack_id: pack.pack_id }, transaction });
    await pack.destroy({ transaction });
  });
  return { deleted: true, pack_id: Number(packId) };
}

async function addPackToSession({ sessionId, packId, setId, user }) {
  const where = await packOwnerWhere(user);
  const pack = await getPackOrThrow(packId, { where });
  if (!pack.is_active) throw createError("This question pack is inactive", 400);
  const ids = (pack.items || [])
    .filter((item) => item.question?.status === "approved")
    .map((item) => Number(item.bank_question_id));
  if (!ids.length) {
    throw createError("This pack has no approved questions available to add", 400);
  }
  return copyBankQuestionsToSession({
    sessionId,
    bankQuestionIds: ids,
    setId,
    user
  });
}

module.exports = {
  listOwners,
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
  addRandomQuestionsToSession,
  previewBankImport,
  importBankQuestions,
  listPacks,
  getPack,
  createPack,
  updatePack,
  deletePack,
  addPackToSession
};

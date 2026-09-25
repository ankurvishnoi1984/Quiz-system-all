const User = require("./user.model");
const Role = require("./role.model");
const Plan = require("./plan.model");
const UserParticipantAddon = require("./user-participant-addon.model");
const UserQuestionAddon = require("./user-question-addon.model");
const UserTeamAddon = require("./user-team-addon.model");
const Payment = require("./payment.model");
const Client = require("./client.model");
const Department = require("./department.model");
const Session = require("./session.model");
const SessionEmbedToken = require("./session-embed-token.model");
const Participant = require("./participant.model");
const Question = require("./question.model");
const QuestionSet = require("./question-set.model");
const QuestionOption = require("./question-option.model");
const QuestionBankTopic = require("./question-bank-topic.model");
const QuestionBankQuestion = require("./question-bank-question.model");
const QuestionBankOption = require("./question-bank-option.model");
const QuestionBankReview = require("./question-bank-review.model");
const QuestionBankPack = require("./question-bank-pack.model");
const QuestionBankPackItem = require("./question-bank-pack-item.model");
const Response = require("./response.model");
const QaQuestion = require("./qa-question.model");
const QaUpvote = require("./qa-upvote.model");
const MediaAsset = require("./media-asset.model");
const MailConfig = require("./mail-config.model");
const NotificationRecipient = require("./notification-recipient.model");
const JobRun = require("./job-run.model");
const EmailOtp = require("./email-otp.model");
const SmsOtp = require("./sms-otp.model");
const UserPlanHistory = require("./user-plan-history.model");
const BlockedIp = require("./blocked-ip.model");
const RateLimitEvent = require("./rate-limit-event.model");
const AuditLog = require("./audit-log.model");
const registerAuditHooks = require("./register-audit-hooks");

User.belongsTo(Role, { foreignKey: "role", targetKey: "slug", as: "assignedRole" });
Role.hasMany(User, { foreignKey: "role", sourceKey: "slug", as: "users" });
User.belongsTo(User, { foreignKey: "parent_id", as: "teamOwner" });
User.hasMany(User, { foreignKey: "parent_id", as: "teamMembers" });
Plan.hasMany(User, { foreignKey: "plan_id", as: "users" });
User.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });
Plan.hasMany(Payment, { foreignKey: "plan_id", as: "payments" });
Payment.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });
User.hasMany(Payment, { foreignKey: "user_id", as: "payments" });
Payment.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(UserParticipantAddon, { foreignKey: "user_id", as: "participant_addons" });
UserParticipantAddon.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(UserQuestionAddon, { foreignKey: "user_id", as: "question_addons" });
UserQuestionAddon.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(UserTeamAddon, { foreignKey: "user_id", as: "team_addons" });
UserTeamAddon.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(UserTeamAddon, { foreignKey: "created_by", as: "created_team_addons" });
UserTeamAddon.belongsTo(User, { foreignKey: "created_by", as: "creator" });
User.hasMany(UserPlanHistory, { foreignKey: "user_id", as: "plan_history" });
UserPlanHistory.belongsTo(User, { foreignKey: "user_id", as: "user" });
Plan.hasMany(UserPlanHistory, { foreignKey: "plan_id", as: "plan_history" });
UserPlanHistory.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });
Payment.hasMany(UserPlanHistory, { foreignKey: "payment_id", as: "plan_history" });
UserPlanHistory.belongsTo(Payment, { foreignKey: "payment_id", as: "payment" });
User.hasMany(BlockedIp, { foreignKey: "blocked_by", as: "blocked_ips" });
BlockedIp.belongsTo(User, { foreignKey: "blocked_by", as: "blocker" });

Client.hasMany(Department, { foreignKey: "client_id" });
Department.belongsTo(Client, { foreignKey: "client_id" });
Department.hasMany(Session, { foreignKey: "dept_id" });
Session.belongsTo(Department, { foreignKey: "dept_id" });
User.hasMany(Session, { foreignKey: "host_id" });
Session.belongsTo(User, { foreignKey: "host_id" });
Session.hasMany(SessionEmbedToken, { foreignKey: "session_id" });
SessionEmbedToken.belongsTo(Session, { foreignKey: "session_id" });
Session.hasMany(Participant, { foreignKey: "session_id" });
Participant.belongsTo(Session, { foreignKey: "session_id" });
Department.hasMany(Participant, { foreignKey: "dept_id" });
Participant.belongsTo(Department, { foreignKey: "dept_id" });
Session.hasMany(Question, { foreignKey: "session_id" });
Question.belongsTo(Session, { foreignKey: "session_id" });
Session.hasMany(QuestionSet, { foreignKey: "session_id" });
QuestionSet.belongsTo(Session, { foreignKey: "session_id" });
QuestionSet.hasMany(Question, { foreignKey: "set_id", as: "questions" });
Question.belongsTo(QuestionSet, { foreignKey: "set_id", as: "set" });
QuestionSet.hasMany(Participant, { foreignKey: "assigned_set_id", as: "assignedParticipants" });
Participant.belongsTo(QuestionSet, { foreignKey: "assigned_set_id", as: "assignedSet" });
Department.hasMany(Question, { foreignKey: "dept_id" });
Question.belongsTo(Department, { foreignKey: "dept_id" });
Question.hasMany(QuestionOption, { foreignKey: "question_id" });
QuestionOption.belongsTo(Question, { foreignKey: "question_id" });
User.hasMany(QuestionBankTopic, { foreignKey: "owner_id", as: "ownedBankTopics" });
QuestionBankTopic.belongsTo(User, { foreignKey: "owner_id", as: "owner" });
User.hasMany(QuestionBankQuestion, { foreignKey: "owner_id", as: "ownedBankQuestions" });
QuestionBankQuestion.belongsTo(User, { foreignKey: "owner_id", as: "owner" });
QuestionBankTopic.hasMany(QuestionBankQuestion, {
  foreignKey: "topic_id",
  as: "questions"
});
QuestionBankQuestion.belongsTo(QuestionBankTopic, {
  foreignKey: "topic_id",
  as: "topic"
});
QuestionBankQuestion.hasMany(QuestionBankOption, {
  foreignKey: "bank_question_id",
  as: "options"
});
QuestionBankOption.belongsTo(QuestionBankQuestion, {
  foreignKey: "bank_question_id",
  as: "question"
});
QuestionBankQuestion.hasMany(QuestionBankReview, {
  foreignKey: "bank_question_id",
  as: "reviews"
});
QuestionBankReview.belongsTo(QuestionBankQuestion, {
  foreignKey: "bank_question_id",
  as: "question"
});
QuestionBankQuestion.belongsTo(User, { foreignKey: "author_id", as: "author" });
QuestionBankQuestion.belongsTo(User, { foreignKey: "approved_by", as: "approver" });
QuestionBankQuestion.belongsTo(User, { foreignKey: "archived_by", as: "archiver" });
QuestionBankReview.belongsTo(User, { foreignKey: "auditor_id", as: "auditor" });
User.hasMany(QuestionBankPack, { foreignKey: "owner_id", as: "ownedBankPacks" });
QuestionBankPack.belongsTo(User, { foreignKey: "owner_id", as: "owner" });
QuestionBankPack.belongsTo(User, { foreignKey: "created_by", as: "creator" });
QuestionBankPack.hasMany(QuestionBankPackItem, {
  foreignKey: "pack_id",
  as: "items"
});
QuestionBankPackItem.belongsTo(QuestionBankPack, {
  foreignKey: "pack_id",
  as: "pack"
});
QuestionBankQuestion.hasMany(QuestionBankPackItem, {
  foreignKey: "bank_question_id",
  as: "packItems"
});
QuestionBankPackItem.belongsTo(QuestionBankQuestion, {
  foreignKey: "bank_question_id",
  as: "question"
});
Question.belongsTo(QuestionBankQuestion, {
  foreignKey: "source_bank_question_id",
  as: "sourceBankQuestion"
});
Session.hasMany(Response, { foreignKey: "session_id" });
Response.belongsTo(Session, { foreignKey: "session_id" });
Department.hasMany(Response, { foreignKey: "dept_id" });
Response.belongsTo(Department, { foreignKey: "dept_id" });
Question.hasMany(Response, { foreignKey: "question_id" });
Response.belongsTo(Question, { foreignKey: "question_id" });
Participant.hasMany(Response, { foreignKey: "participant_id" });
Response.belongsTo(Participant, { foreignKey: "participant_id" });
QuestionOption.hasMany(Response, { foreignKey: "option_id" });
Response.belongsTo(QuestionOption, { foreignKey: "option_id" });
Session.hasMany(QaQuestion, { foreignKey: "session_id" });
QaQuestion.belongsTo(Session, { foreignKey: "session_id" });
Department.hasMany(QaQuestion, { foreignKey: "dept_id" });
QaQuestion.belongsTo(Department, { foreignKey: "dept_id" });
Participant.hasMany(QaQuestion, { foreignKey: "participant_id" });
QaQuestion.belongsTo(Participant, { foreignKey: "participant_id" });
User.hasMany(QaQuestion, { foreignKey: "answered_by" });
QaQuestion.belongsTo(User, { foreignKey: "answered_by" });
QaQuestion.hasMany(QaUpvote, { foreignKey: "qa_id" });
QaUpvote.belongsTo(QaQuestion, { foreignKey: "qa_id" });
Participant.hasMany(QaUpvote, { foreignKey: "participant_id" });
QaUpvote.belongsTo(Participant, { foreignKey: "participant_id" });
Department.hasMany(MediaAsset, { foreignKey: "dept_id" });
MediaAsset.belongsTo(Department, { foreignKey: "dept_id" });
User.hasMany(MediaAsset, { foreignKey: "uploaded_by" });
MediaAsset.belongsTo(User, { foreignKey: "uploaded_by" });

const models = {
  User,
  Role,
  Plan,
  Payment,
  UserParticipantAddon,
  UserQuestionAddon,
  UserTeamAddon,
  Client,
  Department,
  Session,
  SessionEmbedToken,
  Participant,
  Question,
  QuestionSet,
  QuestionOption,
  QuestionBankTopic,
  QuestionBankQuestion,
  QuestionBankOption,
  QuestionBankReview,
  QuestionBankPack,
  QuestionBankPackItem,
  Response,
  QaQuestion,
  QaUpvote,
  MediaAsset,
  MailConfig,
  NotificationRecipient,
  JobRun,
  EmailOtp,
  SmsOtp,
  UserPlanHistory,
  BlockedIp,
  RateLimitEvent,
  AuditLog
};

registerAuditHooks(models);

module.exports = models;

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuestionBankQuestion = sequelize.define(
  "question_bank_questions",
  {
    bank_question_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    topic_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    revision_of_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    question_type: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: false
    },
    language: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "en"
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "pending_review",
        "changes_requested",
        "rejected",
        "approved",
        "archived"
      ),
      allowNull: false,
      defaultValue: "draft"
    },
    media_url: DataTypes.TEXT,
    media_type: DataTypes.STRING(30),
    media_thumbnail_url: DataTypes.TEXT,
    is_quiz_mode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    points_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    time_limit_seconds: DataTypes.INTEGER,
    allow_multiple_select: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    rating_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    rating_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10
    },
    rating_min_label: DataTypes.STRING(50),
    rating_max_label: DataTypes.STRING(50),
    survey_subtype: DataTypes.STRING(40),
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    submitted_at: DataTypes.DATE,
    approved_by: DataTypes.INTEGER,
    approved_at: DataTypes.DATE,
    archived_by: DataTypes.INTEGER,
    archived_at: DataTypes.DATE,
    archived_reason: DataTypes.TEXT
  },
  {
    tableName: "question_bank_questions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = QuestionBankQuestion;

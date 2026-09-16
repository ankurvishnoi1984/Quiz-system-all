const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuestionBankReview = sequelize.define(
  "question_bank_reviews",
  {
    review_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bank_question_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    question_version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    auditor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    decision: {
      type: DataTypes.ENUM("approved", "changes_requested", "rejected"),
      allowNull: false
    },
    comments: DataTypes.TEXT,
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: "question_bank_reviews",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = QuestionBankReview;

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuestionBankOption = sequelize.define(
  "question_bank_options",
  {
    bank_option_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bank_question_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    option_text: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    media_url: DataTypes.TEXT,
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "question_bank_options",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = QuestionBankOption;

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuestionOption = sequelize.define(
  "question_options",
  {
    option_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    option_text: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    media_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    match_side: {
      type: DataTypes.ENUM("left", "right"),
      allowNull: true
    },
    match_key: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "question_options",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = QuestionOption;

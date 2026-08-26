const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UserQuestionAddon = sequelize.define(
  "user_question_addons",
  {
    addon_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    questions: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachment_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachment_filename: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "user_question_addons",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  }
);

module.exports = UserQuestionAddon;

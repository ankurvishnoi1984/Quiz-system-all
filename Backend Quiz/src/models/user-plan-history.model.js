const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UserPlanHistory = sequelize.define(
  "user_plan_history",
  {
    history_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    plan_name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    max_participants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    max_questions_per_session: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    expires_at: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null
    },
    source: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "admin_assign"
    },
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    }
  },
  {
    tableName: "user_plan_history",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = UserPlanHistory;

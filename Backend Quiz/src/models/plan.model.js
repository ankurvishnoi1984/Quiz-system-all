const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Plan = sequelize.define(
  "plans",
  {
    plan_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    max_participants: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    default_duration_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    price_monthly: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "INR"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: "plans",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = Plan;

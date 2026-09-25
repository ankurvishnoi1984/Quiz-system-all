const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const RateLimitEvent = sequelize.define(
  "rate_limit_events",
  {
    event_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    session_code: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    identity: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    attempt_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    window_ms: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    limit_max: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: "rate_limit_events",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  }
);

module.exports = RateLimitEvent;

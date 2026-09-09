const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BlockedIp = sequelize.define(
  "blocked_ips",
  {
    blocked_ip_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    blocked_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    unblock_reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    unblocked_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    unblocked_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "blocked_ips",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = BlockedIp;

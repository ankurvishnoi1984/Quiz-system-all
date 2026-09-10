const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SmsOtp = sequelize.define(
  "sms_otps",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    purpose: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    code_hash: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  },
  {
    tableName: "sms_otps",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = SmsOtp;

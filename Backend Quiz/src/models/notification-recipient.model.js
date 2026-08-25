const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const WEBSITE_SIGNUP_PURPOSE = "website_signup";

const NotificationRecipient = sequelize.define(
  "notification_recipients",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    purpose: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: "notification_recipients",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

NotificationRecipient.WEBSITE_SIGNUP_PURPOSE = WEBSITE_SIGNUP_PURPOSE;

module.exports = NotificationRecipient;

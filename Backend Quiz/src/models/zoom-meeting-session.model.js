const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ZoomMeetingSession = sequelize.define(
  "zoom_meeting_sessions",
  {
    zoom_meeting_session_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    meeting_uuid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true
    },
    meeting_id: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bound_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("active", "paused", "ended"),
      allowNull: false,
      defaultValue: "active"
    },
    bound_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ended_at: {
      type: DataTypes.DATE,
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
    tableName: "zoom_meeting_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = ZoomMeetingSession;

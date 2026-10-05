const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ZoomParticipantMap = sequelize.define(
  "zoom_participant_maps",
  {
    zoom_participant_map_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    meeting_uuid: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    zoom_user_id: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    participant_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    display_name: {
      type: DataTypes.STRING(120),
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
    tableName: "zoom_participant_maps",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["meeting_uuid", "zoom_user_id"]
      }
    ]
  }
);

module.exports = ZoomParticipantMap;

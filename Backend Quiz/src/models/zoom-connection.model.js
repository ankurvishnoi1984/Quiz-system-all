const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ZoomConnection = sequelize.define(
  "zoom_connections",
  {
    zoom_connection_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    zoom_user_id: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    zoom_account_id: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    zoom_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scopes: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    connected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revoked_at: {
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
    tableName: "zoom_connections",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = ZoomConnection;

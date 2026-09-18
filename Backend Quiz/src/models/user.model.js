const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "users",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dept_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    extra_participants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    extra_questions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    extra_team_members: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    plan_limit_email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    plan_expires_at: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    plan_expiry_email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    must_change_password: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    hints_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    rights_overrides: {
      type: DataTypes.JSON,
      allowNull: true
    },
    sub_admin_access: {
      type: DataTypes.ENUM("all", "clients", "departments"),
      allowNull: true,
      defaultValue: null
    },
    allowed_client_ids: {
      type: DataTypes.JSON,
      allowNull: true
    },
    allowed_dept_ids: {
      type: DataTypes.JSON,
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
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = User;

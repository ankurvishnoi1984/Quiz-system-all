const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UserTeamAddon = sequelize.define(
  "user_team_addons",
  {
    addon_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seats_added: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_at_purchase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM("admin_assign", "purchase"),
      allowNull: false,
      defaultValue: "admin_assign"
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: "user_team_addons",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = UserTeamAddon;

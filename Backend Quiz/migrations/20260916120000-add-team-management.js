"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "parent_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "user_id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addColumn("users", "email_verified_at", {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Existing accounts predate team verification and remain fully accessible.
    await queryInterface.sequelize.query(
      "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE email_verified_at IS NULL"
    );

    await queryInterface.addColumn("users", "extra_team_members", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn("plans", "included_team_members", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn("plans", "price_per_extra_member", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.createTable("user_team_addons", {
      addon_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      seats_added: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price_at_purchase: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM("admin_assign", "purchase"),
        allowNull: false,
        defaultValue: "admin_assign"
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("users", ["parent_id"], {
      name: "users_parent_id_idx"
    });
    await queryInterface.addIndex("user_team_addons", ["user_id"], {
      name: "user_team_addons_user_id_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("user_team_addons", "user_team_addons_user_id_idx");
    await queryInterface.dropTable("user_team_addons");
    await queryInterface.removeColumn("plans", "price_per_extra_member");
    await queryInterface.removeColumn("plans", "included_team_members");
    await queryInterface.removeColumn("users", "extra_team_members");
    await queryInterface.removeColumn("users", "email_verified_at");
    await queryInterface.removeIndex("users", "users_parent_id_idx");
    await queryInterface.removeColumn("users", "parent_id");
  }
};

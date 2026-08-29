"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_plan_history", {
      history_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "plans", key: "plan_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      plan_name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      max_participants: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      max_questions_per_session: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      is_free: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      },
      expires_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null
      },
      source: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "admin_assign"
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: { model: "payments", key: "payment_id" },
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
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("user_plan_history", ["user_id"], {
      name: "user_plan_history_user_id_idx"
    });
    await queryInterface.addIndex("user_plan_history", ["user_id", "ended_at"], {
      name: "user_plan_history_user_open_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_plan_history");
  }
};

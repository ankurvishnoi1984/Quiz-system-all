"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rate_limit_events", {
      event_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(32),
        allowNull: false
      },
      session_code: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      identity: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      attempt_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      window_ms: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      limit_max: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("rate_limit_events", ["created_at"], {
      name: "rate_limit_events_created_at_idx"
    });
    await queryInterface.addIndex("rate_limit_events", ["ip_address"], {
      name: "rate_limit_events_ip_address_idx"
    });
    await queryInterface.addIndex("rate_limit_events", ["action"], {
      name: "rate_limit_events_action_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rate_limit_events");
  }
};

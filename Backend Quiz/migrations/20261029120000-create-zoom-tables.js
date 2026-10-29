"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("zoom_connections", {
      zoom_connection_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      zoom_user_id: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      zoom_account_id: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      zoom_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      scopes: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      connected_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.createTable("zoom_meeting_sessions", {
      zoom_meeting_session_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      meeting_uuid: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true
      },
      meeting_id: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "sessions", key: "session_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      bound_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      status: {
        type: Sequelize.ENUM("active", "paused", "ended"),
        allowNull: false,
        defaultValue: "active"
      },
      bound_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.createTable("zoom_participant_maps", {
      zoom_participant_map_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      meeting_uuid: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      zoom_user_id: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      participant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "participants", key: "participant_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "sessions", key: "session_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      display_name: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex("zoom_participant_maps", ["meeting_uuid", "zoom_user_id"], {
      unique: true,
      name: "zoom_participant_maps_meeting_uuid_zoom_user_id"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("zoom_participant_maps");
    await queryInterface.dropTable("zoom_meeting_sessions");
    await queryInterface.dropTable("zoom_connections");
  }
};

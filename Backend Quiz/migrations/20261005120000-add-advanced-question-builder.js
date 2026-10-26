"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sessions", "builder_mode", {
      type: Sequelize.ENUM("normal", "advanced"),
      allowNull: false,
      defaultValue: "normal"
    });
    await queryInterface.addColumn("sessions", "questions_per_participant", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("sessions", "advanced_selection_mode", {
      type: Sequelize.ENUM("random_all", "random_from_selected"),
      allowNull: false,
      defaultValue: "random_all"
    });
    await queryInterface.addColumn("sessions", "response_time_score_bands", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("questions", "pool_eligible", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.createTable("participant_question_assignments", {
      assignment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      participant_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
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

    await queryInterface.addIndex("participant_question_assignments", ["session_id"]);
    await queryInterface.addIndex("participant_question_assignments", ["participant_id"]);
    await queryInterface.addIndex(
      "participant_question_assignments",
      ["participant_id", "question_id"],
      { unique: true, name: "uq_pqa_participant_question" }
    );
    await queryInterface.addIndex("participant_question_assignments", [
      "participant_id",
      "display_order"
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("participant_question_assignments");
    await queryInterface.removeColumn("questions", "pool_eligible");
    await queryInterface.removeColumn("sessions", "response_time_score_bands");
    await queryInterface.removeColumn("sessions", "advanced_selection_mode");
    await queryInterface.removeColumn("sessions", "questions_per_participant");
    await queryInterface.removeColumn("sessions", "builder_mode");

    // MySQL ENUM cleanup — drop leftover types if the dialect supports it
    try {
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS `enum_sessions_builder_mode`;"
      );
    } catch (_) {
      /* ignore */
    }
    try {
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS `enum_sessions_advanced_selection_mode`;"
      );
    } catch (_) {
      /* ignore */
    }
  }
};

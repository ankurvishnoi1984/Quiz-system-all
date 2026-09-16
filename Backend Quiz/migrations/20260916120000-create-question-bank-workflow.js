"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      INSERT INTO roles (slug, name, data_scope, permissions, is_system, is_active)
      VALUES
        ('author', 'Question Author', 'own_sessions', JSON_ARRAY(), 1, 1),
        ('auditor', 'Question Auditor', 'own_sessions', JSON_ARRAY(), 1, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        permissions = VALUES(permissions),
        is_system = 1,
        is_active = 1
    `);

    await queryInterface.createTable("question_bank_topics", {
      topic_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(140),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
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

    await queryInterface.createTable("question_bank_questions", {
      bank_question_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      topic_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "question_bank_topics", key: "topic_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      revision_of_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "question_bank_questions", key: "bank_question_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      question_type: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM("easy", "medium", "hard"),
        allowNull: false
      },
      language: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "en"
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "pending_review",
          "changes_requested",
          "rejected",
          "approved",
          "archived"
        ),
        allowNull: false,
        defaultValue: "draft"
      },
      media_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      media_type: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      media_thumbnail_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_quiz_mode: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      points_value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      time_limit_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      allow_multiple_select: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      rating_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
      },
      rating_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 10
      },
      rating_min_label: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      rating_max_label: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      survey_subtype: {
        type: Sequelize.STRING(40),
        allowNull: true
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      archived_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      archived_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex(
      "question_bank_questions",
      ["topic_id", "status", "difficulty", "question_type"],
      { name: "question_bank_filter_idx" }
    );
    await queryInterface.addIndex(
      "question_bank_questions",
      ["author_id", "status", "updated_at"],
      { name: "question_bank_author_status_idx" }
    );

    await queryInterface.createTable("question_bank_options", {
      bank_option_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      bank_question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "question_bank_questions", key: "bank_question_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      option_text: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      media_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_correct: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false
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

    await queryInterface.createTable("question_bank_reviews", {
      review_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      bank_question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "question_bank_questions", key: "bank_question_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      question_version: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      auditor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      decision: {
        type: Sequelize.ENUM("approved", "changes_requested", "rejected"),
        allowNull: false
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
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

    const questions = await queryInterface.describeTable("questions");
    if (!questions.source_bank_question_id) {
      await queryInterface.addColumn("questions", "source_bank_question_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "question_bank_questions", key: "bank_question_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
      await queryInterface.addIndex(
        "questions",
        ["session_id", "source_bank_question_id"],
        { name: "questions_session_bank_source_idx" }
      );
    }
  },

  async down(queryInterface) {
    const questions = await queryInterface.describeTable("questions");
    if (questions.source_bank_question_id) {
      await queryInterface.removeColumn("questions", "source_bank_question_id");
    }
    await queryInterface.dropTable("question_bank_reviews");
    await queryInterface.dropTable("question_bank_options");
    await queryInterface.dropTable("question_bank_questions");
    await queryInterface.dropTable("question_bank_topics");
    await queryInterface.sequelize.query(
      "DELETE FROM roles WHERE slug IN ('author', 'auditor')"
    );
  }
};

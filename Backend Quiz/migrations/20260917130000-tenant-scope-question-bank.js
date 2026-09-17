"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Existing records were created before account ownership existed and cannot
    // be mapped safely. This project approved resetting this test data.
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    try {
      await queryInterface.sequelize.query("DELETE FROM question_bank_reviews");
      await queryInterface.sequelize.query("DELETE FROM question_bank_options");
      await queryInterface.sequelize.query("DELETE FROM question_bank_questions");
      await queryInterface.sequelize.query("DELETE FROM question_bank_topics");
      await queryInterface.sequelize.query(
        "DELETE FROM users WHERE role IN ('author', 'auditor') AND parent_id IS NULL"
      );
    } finally {
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    await queryInterface.addColumn("question_bank_topics", "owner_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      after: "topic_id"
    });
    await queryInterface.addColumn("question_bank_questions", "owner_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      after: "bank_question_id"
    });

    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM question_bank_topics WHERE Column_name = 'slug' AND Non_unique = 0"
    );
    for (const index of indexes) {
      if (index.Key_name !== "PRIMARY") {
        await queryInterface.removeIndex("question_bank_topics", index.Key_name);
      }
    }

    await queryInterface.addIndex(
      "question_bank_topics",
      ["owner_id", "slug"],
      { name: "question_bank_topic_owner_slug_uq", unique: true }
    );
    await queryInterface.addIndex(
      "question_bank_questions",
      ["owner_id", "status", "topic_id", "difficulty", "question_type"],
      { name: "question_bank_owner_filter_idx" }
    );
    await queryInterface.addIndex(
      "question_bank_questions",
      ["owner_id", "author_id", "status", "updated_at"],
      { name: "question_bank_owner_author_idx" }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "question_bank_questions",
      "question_bank_owner_author_idx"
    );
    await queryInterface.removeIndex(
      "question_bank_questions",
      "question_bank_owner_filter_idx"
    );
    await queryInterface.removeIndex(
      "question_bank_topics",
      "question_bank_topic_owner_slug_uq"
    );
    await queryInterface.removeColumn("question_bank_questions", "owner_id");
    await queryInterface.removeColumn("question_bank_topics", "owner_id");
    await queryInterface.addIndex("question_bank_topics", ["slug"], {
      name: "question_bank_topics_slug_unique",
      unique: true
    });
  }
};

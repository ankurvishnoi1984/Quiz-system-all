"use strict";

const PLAN_QUESTION_LIMITS = {
  Starter: 15,
  Standard: 40,
  Professional: 100,
  Enterprise: 250
};
const DEFAULT_MAX_QUESTIONS = 15;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plans", "max_questions_per_session", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: DEFAULT_MAX_QUESTIONS
    });

    for (const [name, limit] of Object.entries(PLAN_QUESTION_LIMITS)) {
      await queryInterface.sequelize.query(
        `UPDATE plans SET max_questions_per_session = :limit WHERE name = :name`,
        { replacements: { limit, name } }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plans", "max_questions_per_session");
  }
};

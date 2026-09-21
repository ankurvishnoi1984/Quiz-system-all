"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("question_bank_questions", "archived_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "archived_at"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("question_bank_questions", "archived_reason");
  }
};

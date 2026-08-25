'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sessions', 'show_participant_count', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'survey_results_enabled',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sessions', 'show_participant_count');
  },
};

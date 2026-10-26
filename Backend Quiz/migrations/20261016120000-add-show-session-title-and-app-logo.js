'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sessions', 'show_session_title', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'show_participant_count',
    });
    await queryInterface.addColumn('sessions', 'show_app_logo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'show_session_title',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sessions', 'show_app_logo');
    await queryInterface.removeColumn('sessions', 'show_session_title');
  },
};

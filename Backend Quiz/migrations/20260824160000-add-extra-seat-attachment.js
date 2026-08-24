"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("user_participant_addons", "note", {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("user_participant_addons", "attachment_url", {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("user_participant_addons", "attachment_filename", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("user_participant_addons", "attachment_filename");
    await queryInterface.removeColumn("user_participant_addons", "attachment_url");
    await queryInterface.changeColumn("user_participant_addons", "note", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  }
};

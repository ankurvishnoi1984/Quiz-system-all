"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await queryInterface.describeTable("users");
    if (!users.rights_overrides) {
      await queryInterface.addColumn("users", "rights_overrides", {
        type: Sequelize.JSON,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const users = await queryInterface.describeTable("users");
    if (users.rights_overrides) {
      await queryInterface.removeColumn("users", "rights_overrides");
    }
  }
};

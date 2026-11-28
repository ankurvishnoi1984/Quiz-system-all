"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("users");

    if (!table.terms_accepted_at) {
      await queryInterface.addColumn("users", "terms_accepted_at", {
        type: Sequelize.DATE,
        allowNull: true,
        after: "email_verified_at"
      });
    }

    if (!table.marketing_opt_in) {
      await queryInterface.addColumn("users", "marketing_opt_in", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: "terms_accepted_at"
      });
    }

    if (!table.marketing_opt_in_at) {
      await queryInterface.addColumn("users", "marketing_opt_in_at", {
        type: Sequelize.DATE,
        allowNull: true,
        after: "marketing_opt_in"
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("users");
    if (table.marketing_opt_in_at) {
      await queryInterface.removeColumn("users", "marketing_opt_in_at");
    }
    if (table.marketing_opt_in) {
      await queryInterface.removeColumn("users", "marketing_opt_in");
    }
    if (table.terms_accepted_at) {
      await queryInterface.removeColumn("users", "terms_accepted_at");
    }
  }
};

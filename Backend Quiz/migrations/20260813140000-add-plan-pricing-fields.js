"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plans", "price_monthly", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("plans", "currency", {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: "INR"
    });

    // Seed known catalog prices (matches former website static map).
    const priceByName = {
      Starter: 999,
      Standard: 2499,
      Professional: 5999,
      Enterprise: 14999
    };

    for (const [name, price] of Object.entries(priceByName)) {
      await queryInterface.sequelize.query(
        "UPDATE plans SET price_monthly = :price, currency = 'INR' WHERE name = :name",
        { replacements: { price, name } }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plans", "currency");
    await queryInterface.removeColumn("plans", "price_monthly");
  }
};

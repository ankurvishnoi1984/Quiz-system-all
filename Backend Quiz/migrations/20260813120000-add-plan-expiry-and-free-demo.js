"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plans", "is_free", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn("plans", "default_duration_days", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("users", "plan_expires_at", {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("users", "plan_expiry_email_sent_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    const [existingFree] = await queryInterface.sequelize.query(
      "SELECT plan_id FROM plans WHERE name = 'Free Demo' LIMIT 1"
    );
    if (!existingFree?.length) {
      const now = new Date();
      await queryInterface.bulkInsert("plans", [
        {
          name: "Free Demo",
          description:
            "Fallback demo access after a paid plan expires. Up to 10 participants connected at once — enough for trials and small demos.",
          max_participants: 10,
          is_active: true,
          is_free: true,
          default_duration_days: null,
          created_at: now,
          updated_at: now
        }
      ]);
    } else {
      await queryInterface.sequelize.query(
        "UPDATE plans SET is_free = 1, max_participants = 10 WHERE name = 'Free Demo'"
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "plan_expiry_email_sent_at");
    await queryInterface.removeColumn("users", "plan_expires_at");
    await queryInterface.removeColumn("plans", "default_duration_days");
    await queryInterface.removeColumn("plans", "is_free");
  }
};

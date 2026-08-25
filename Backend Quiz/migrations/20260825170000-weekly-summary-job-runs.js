"use strict";

const WEEKLY_SUMMARY_ADMINS = [
  "suraj.patil@netcastservice.com",
  "shailendra.kumar@netcastservice.com"
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("job_runs", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      job_name: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      run_key: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      ran_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("job_runs", ["job_name", "run_key"], {
      unique: true,
      name: "job_runs_job_name_run_key_unique"
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      "notification_recipients",
      WEEKLY_SUMMARY_ADMINS.map((email) => ({
        purpose: "weekly_summary",
        email,
        is_active: true,
        created_at: now,
        updated_at: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("notification_recipients", {
      purpose: "weekly_summary"
    });
    await queryInterface.dropTable("job_runs");
  }
};

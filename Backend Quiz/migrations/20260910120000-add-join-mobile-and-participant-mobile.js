"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE sessions
      MODIFY COLUMN join_type
      ENUM('name', 'anonymous', 'name_email', 'name_mobile', 'name_email_mobile')
      NOT NULL
      DEFAULT 'name'
    `);

    const participants = await queryInterface.describeTable("participants");
    if (!participants.mobile) {
      await queryInterface.addColumn("participants", "mobile", {
        type: require("sequelize").STRING(20),
        allowNull: true
      });
      await queryInterface.addIndex("participants", ["session_id", "mobile"], {
        name: "participants_session_mobile_idx"
      });
    }
  },

  async down(queryInterface) {
    const participants = await queryInterface.describeTable("participants");
    if (participants.mobile) {
      await queryInterface.removeIndex("participants", "participants_session_mobile_idx").catch(() => {});
      await queryInterface.removeColumn("participants", "mobile");
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE sessions
      MODIFY COLUMN join_type
      ENUM('name', 'anonymous', 'name_email')
      NOT NULL
      DEFAULT 'name'
    `);
  }
};

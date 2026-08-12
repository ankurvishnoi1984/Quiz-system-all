"use strict";

/**
 * Plan limits now apply to concurrent (live) participants across a host's
 * active sessions instead of the all-time participant history. This migration
 * only rewords the seeded plan descriptions to match the new behavior.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE plans
      SET description = REPLACE(description, 'participants across all sessions', 'live participants across active sessions')
      WHERE description LIKE '%participants across all sessions%'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE plans
      SET description = REPLACE(description, 'live participants across active sessions', 'participants across all sessions')
      WHERE description LIKE '%live participants across active sessions%'
    `);
  }
};

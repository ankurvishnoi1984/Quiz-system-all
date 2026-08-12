"use strict";

const {
  WEBSITE_SIGNUP_CLIENT,
  WEBSITE_SIGNUP_DEPARTMENT
} = require("../src/constants/websiteSignupOrg");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [clients] = await queryInterface.sequelize.query(
      `SELECT client_id FROM clients WHERE slug = :slug LIMIT 1`,
      {
        replacements: { slug: WEBSITE_SIGNUP_CLIENT.slug }
      }
    );

    let clientId = clients[0]?.client_id;

    if (!clientId) {
      await queryInterface.bulkInsert("clients", [
        {
          name: WEBSITE_SIGNUP_CLIENT.name,
          slug: WEBSITE_SIGNUP_CLIENT.slug,
          contact_email: WEBSITE_SIGNUP_CLIENT.contact_email,
          subscription_tier: WEBSITE_SIGNUP_CLIENT.subscription_tier,
          max_participants_per_session: 500,
          is_active: true,
          created_at: now,
          updated_at: now
        }
      ]);

      const [insertedClients] = await queryInterface.sequelize.query(
        `SELECT client_id FROM clients WHERE slug = :slug LIMIT 1`,
        {
          replacements: { slug: WEBSITE_SIGNUP_CLIENT.slug }
        }
      );
      clientId = insertedClients[0]?.client_id;
    }

    const [departments] = await queryInterface.sequelize.query(
      `SELECT dept_id FROM departments WHERE client_id = :clientId AND slug = :slug LIMIT 1`,
      {
        replacements: {
          clientId,
          slug: WEBSITE_SIGNUP_DEPARTMENT.slug
        }
      }
    );

    if (!departments[0]?.dept_id) {
      await queryInterface.bulkInsert("departments", [
        {
          client_id: clientId,
          name: WEBSITE_SIGNUP_DEPARTMENT.name,
          slug: WEBSITE_SIGNUP_DEPARTMENT.slug,
          description: WEBSITE_SIGNUP_DEPARTMENT.description,
          default_max_participants: 500,
          is_active: true,
          created_at: now,
          updated_at: now
        }
      ]);
    }
  },

  async down(queryInterface) {
    const [departments] = await queryInterface.sequelize.query(
      `SELECT d.dept_id
       FROM departments d
       INNER JOIN clients c ON c.client_id = d.client_id
       WHERE c.slug = :clientSlug AND d.slug = :deptSlug
       LIMIT 1`,
      {
        replacements: {
          clientSlug: WEBSITE_SIGNUP_CLIENT.slug,
          deptSlug: WEBSITE_SIGNUP_DEPARTMENT.slug
        }
      }
    );

    const deptId = departments[0]?.dept_id;
    if (deptId) {
      const [users] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS total FROM users WHERE dept_id = :deptId`,
        { replacements: { deptId } }
      );
      if (Number(users[0]?.total || 0) === 0) {
        await queryInterface.bulkDelete("departments", { dept_id: deptId });
      }
    }

    const [clients] = await queryInterface.sequelize.query(
      `SELECT client_id FROM clients WHERE slug = :slug LIMIT 1`,
      { replacements: { slug: WEBSITE_SIGNUP_CLIENT.slug } }
    );
    const clientId = clients[0]?.client_id;
    if (clientId) {
      const [departmentsLeft] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS total FROM departments WHERE client_id = :clientId`,
        { replacements: { clientId } }
      );
      if (Number(departmentsLeft[0]?.total || 0) === 0) {
        await queryInterface.bulkDelete("clients", { client_id: clientId });
      }
    }
  }
};

"use strict";

const CANONICAL_ZONES = ["East", "West", "North", "South"];

function canonicalizeZone(raw) {
  const zone = String(raw || "").trim();
  if (!zone) return null;
  const match = CANONICAL_ZONES.find((z) => z.toLowerCase() === zone.toLowerCase());
  return match || null;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.customer_match_zones) {
      await queryInterface.addColumn("sessions", "customer_match_zones", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        after: "customer_match_wc_code",
      });
    }

    if (table.customer_match_zone) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT session_id, customer_match_zone
         FROM sessions
         WHERE customer_match_zone IS NOT NULL
           AND TRIM(customer_match_zone) <> ''`
      );

      for (const row of rows) {
        const zone = canonicalizeZone(row.customer_match_zone);
        if (!zone) continue;
        await queryInterface.sequelize.query(
          `UPDATE sessions
           SET customer_match_zones = CAST(:zones AS JSON)
           WHERE session_id = :sessionId`,
          {
            replacements: {
              zones: JSON.stringify([zone]),
              sessionId: row.session_id,
            },
          }
        );
      }

      await queryInterface.removeColumn("sessions", "customer_match_zone");
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("sessions");

    if (!table.customer_match_zone) {
      await queryInterface.addColumn("sessions", "customer_match_zone", {
        type: Sequelize.STRING(16),
        allowNull: true,
        defaultValue: null,
        after: "customer_match_wc_code",
      });
    }

    if (table.customer_match_zones) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT session_id, customer_match_zones
         FROM sessions
         WHERE customer_match_zones IS NOT NULL`
      );

      for (const row of rows) {
        let zones = row.customer_match_zones;
        if (typeof zones === "string") {
          try {
            zones = JSON.parse(zones);
          } catch {
            zones = null;
          }
        }
        const first =
          Array.isArray(zones) && zones.length > 0
            ? canonicalizeZone(zones[0])
            : null;
        if (!first) continue;
        await queryInterface.sequelize.query(
          `UPDATE sessions
           SET customer_match_zone = :zone
           WHERE session_id = :sessionId`,
          {
            replacements: {
              zone: first,
              sessionId: row.session_id,
            },
          }
        );
      }

      await queryInterface.removeColumn("sessions", "customer_match_zones");
    }
  },
};

"use strict";

const WITH_MATCH =
  "ENUM('mcq','poll','survey','word_cloud','rating','open_text','true_false','ranking','fill_blank','emoji_reaction','match')";
const WITHOUT_MATCH =
  "ENUM('mcq','poll','survey','word_cloud','rating','open_text','true_false','ranking','fill_blank','emoji_reaction')";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TABLE questions MODIFY question_type ${WITH_MATCH} NOT NULL`
    );
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE question_templates MODIFY question_type ${WITH_MATCH} NOT NULL`
      );
    } catch (_error) {
      // Templates table may not exist.
    }

    const optionTable = await queryInterface.describeTable("question_options");
    if (!optionTable.match_side) {
      await queryInterface.addColumn("question_options", "match_side", {
        type: Sequelize.ENUM("left", "right"),
        allowNull: true
      });
    }
    if (!optionTable.match_key) {
      await queryInterface.addColumn("question_options", "match_key", {
        type: Sequelize.STRING(32),
        allowNull: true
      });
    }

    try {
      const bankOpts = await queryInterface.describeTable("question_bank_options");
      if (!bankOpts.match_side) {
        await queryInterface.addColumn("question_bank_options", "match_side", {
          type: Sequelize.ENUM("left", "right"),
          allowNull: true
        });
      }
      if (!bankOpts.match_key) {
        await queryInterface.addColumn("question_bank_options", "match_key", {
          type: Sequelize.STRING(32),
          allowNull: true
        });
      }
    } catch (_error) {
      // Bank table may not exist in every environment.
    }

    const responses = await queryInterface.describeTable("responses");
    if (!responses.matching_pairs) {
      await queryInterface.addColumn("responses", "matching_pairs", {
        type: Sequelize.JSON,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("responses", "matching_pairs");
    } catch (_error) {
      // ignore
    }
    try {
      await queryInterface.removeColumn("question_options", "match_key");
      await queryInterface.removeColumn("question_options", "match_side");
    } catch (_error) {
      // ignore
    }
    try {
      await queryInterface.removeColumn("question_bank_options", "match_key");
      await queryInterface.removeColumn("question_bank_options", "match_side");
    } catch (_error) {
      // ignore
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE questions MODIFY question_type ${WITHOUT_MATCH} NOT NULL`
    );
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE question_templates MODIFY question_type ${WITHOUT_MATCH} NOT NULL`
      );
    } catch (_error) {
      // ignore
    }
  }
};

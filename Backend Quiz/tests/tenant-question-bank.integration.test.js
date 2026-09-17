"use strict";

require("dotenv").config();
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { sequelize } = require("../src/config/database");
const {
  User,
  Department,
  Session,
  Question,
  QuestionBankQuestion,
  QuestionBankTopic
} = require("../src/models");

const emailService = require("../src/services/email.service");
emailService.sendTeamMemberVerificationEmail = async () => ({ accepted: true });

const teamService = require("../src/services/team.service");
const bankService = require("../src/services/question-bank.service");

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}@example.test`;
}

function bankInput(topicName, text) {
  return {
    topic_name: topicName,
    question_type: "mcq",
    question_text: text,
    difficulty: "easy",
    language: "en",
    is_quiz_mode: true,
    options: [
      { option_text: "Correct", is_correct: true },
      { option_text: "Incorrect", is_correct: false }
    ]
  };
}

test("isolates each Host account's content team and Question Bank", async () => {
  const department = await Department.findOne();
  assert.ok(department, "A department is required for this integration test");

  const createdUserIds = [];
  const createdSessionIds = [];
  let ownerOne;
  let ownerTwo;
  try {
    ownerOne = await User.create({
      full_name: "Tenant Test Owner One",
      email: uniqueEmail("tenant-owner-one"),
      password_hash: "integration-test",
      role: "host",
      client_id: department.client_id,
      dept_id: department.dept_id,
      is_active: true
    });
    ownerTwo = await User.create({
      full_name: "Tenant Test Owner Two",
      email: uniqueEmail("tenant-owner-two"),
      password_hash: "integration-test",
      role: "host",
      client_id: department.client_id,
      dept_id: department.dept_id,
      is_active: true
    });
    createdUserIds.push(ownerOne.user_id, ownerTwo.user_id);

    const authorOneEmail = uniqueEmail("tenant-author-one");
    let authorOneResult = await teamService.addTeamMember({
      ownerId: ownerOne.user_id,
      fullName: "Tenant Author One",
      email: authorOneEmail,
      role: "author"
    });
    const auditorOneResult = await teamService.addTeamMember({
      ownerId: ownerOne.user_id,
      fullName: "Tenant Auditor One",
      email: uniqueEmail("tenant-auditor-one"),
      role: "auditor"
    });
    const auditorTwoResult = await teamService.addTeamMember({
      ownerId: ownerTwo.user_id,
      fullName: "Tenant Auditor Two",
      email: uniqueEmail("tenant-auditor-two"),
      role: "auditor"
    });
    createdUserIds.push(
      authorOneResult.member.user_id,
      auditorOneResult.member.user_id,
      auditorTwoResult.member.user_id
    );
    const updatedAuditor = await teamService.updatePendingTeamMember({
      ownerId: ownerOne.user_id,
      memberId: auditorOneResult.member.user_id,
      fullName: "Tenant Auditor One Updated",
      email: auditorOneResult.member.email,
      role: "auditor"
    });
    assert.equal(updatedAuditor.member.full_name, "Tenant Auditor One Updated");

    await assert.rejects(
      () =>
        teamService.addTeamMember({
          ownerId: ownerOne.user_id,
          fullName: "Duplicate Author",
          email: uniqueEmail("duplicate-author"),
          role: "author"
        }),
      (error) => error.statusCode === 409 && error.code === "author_limit_reached"
    );
    await teamService.removeTeamMember({
      ownerId: ownerOne.user_id,
      memberId: authorOneResult.member.user_id
    });
    const afterRemoval = await teamService.getTeamSummary(ownerOne.user_id);
    assert.equal(afterRemoval.content_roles.author.remaining, 1);
    authorOneResult = await teamService.addTeamMember({
      ownerId: ownerOne.user_id,
      fullName: "Tenant Author One Reinvited",
      email: authorOneEmail,
      role: "author"
    });

    const summary = await teamService.getTeamSummary(ownerOne.user_id);
    assert.equal(summary.seats.used, 0);
    assert.equal(summary.content_roles.author.used, 1);
    assert.equal(summary.content_roles.auditor.used, 1);

    const authorOne = {
      user_id: authorOneResult.member.user_id,
      parent_id: ownerOne.user_id,
      role: "author"
    };
    const auditorOne = {
      user_id: auditorOneResult.member.user_id,
      parent_id: ownerOne.user_id,
      role: "auditor"
    };
    const auditorTwo = {
      user_id: auditorTwoResult.member.user_id,
      parent_id: ownerTwo.user_id,
      role: "auditor"
    };

    const created = await bankService.createQuestion({
      input: bankInput("Tenant Geography", "Which tenant owns this question?"),
      user: authorOne
    });
    assert.equal(Number(created.owner_id), Number(ownerOne.user_id));
    await bankService.submitQuestion({
      questionId: created.bank_question_id,
      user: authorOne
    });

    await assert.rejects(
      () =>
        bankService.reviewQuestion({
          questionId: created.bank_question_id,
          decision: "approved",
          comments: "",
          user: auditorTwo
        }),
      (error) => error.statusCode === 404
    );

    await bankService.reviewQuestion({
      questionId: created.bank_question_id,
      decision: "approved",
      comments: "",
      user: auditorOne
    });

    const ownerOneHostView = await bankService.listQuestions({
      user: {
        user_id: ownerOne.user_id,
        parent_id: null,
        role: "host",
        rights: ["builder"]
      }
    });
    const ownerTwoHostView = await bankService.listQuestions({
      user: {
        user_id: ownerTwo.user_id,
        parent_id: null,
        role: "host",
        rights: ["builder"]
      }
    });
    assert.equal(ownerOneHostView.questions.length, 1);
    assert.equal(ownerTwoHostView.questions.length, 0);

    for (const level of ["medium", "hard"]) {
      const mixedQuestion = await bankService.createQuestion({
        input: {
          ...bankInput(
            "Tenant Geography",
            `Tenant ${level} random question?`
          ),
          difficulty: level
        },
        user: authorOne
      });
      await bankService.submitQuestion({
        questionId: mixedQuestion.bank_question_id,
        user: authorOne
      });
      await bankService.reviewQuestion({
        questionId: mixedQuestion.bank_question_id,
        decision: "approved",
        comments: "",
        user: auditorOne
      });
    }
    const mixedSession = await Session.create({
      dept_id: department.dept_id,
      host_id: ownerOne.user_id,
      title: "Difficulty Mix Test",
      session_code: crypto.randomBytes(3).toString("hex").toUpperCase(),
      status: "draft"
    });
    createdSessionIds.push(mixedSession.session_id);
    const mixedResult = await bankService.addRandomQuestionsToSession({
      sessionId: mixedSession.session_id,
      topicId: created.topic_id,
      difficulty: "mixed",
      difficultyCounts: { easy: 1, medium: 1, hard: 1 },
      questionType: "mcq",
      user: {
        user_id: ownerOne.user_id,
        parent_id: null,
        role: "host",
        dept_id: department.dept_id,
        rights: ["builder"],
        data_scope: "own_sessions"
      }
    });
    assert.equal(mixedResult.created_count, 3);

    const versionOne = await bankService.createQuestion({
      input: bankInput("Tenant Geography", "Version workflow question?"),
      user: authorOne
    });
    await bankService.submitQuestion({
      questionId: versionOne.bank_question_id,
      user: authorOne
    });
    await bankService.reviewQuestion({
      questionId: versionOne.bank_question_id,
      decision: "approved",
      comments: "",
      user: auditorOne
    });
    const versionTwo = await bankService.createRevision({
      questionId: versionOne.bank_question_id,
      user: authorOne
    });
    assert.equal(versionTwo.version, 2);
    assert.equal(versionTwo.status, "draft");
    const authorRevisionView = await bankService.listQuestions({
      user: authorOne,
      query: { search: "Version workflow" }
    });
    assert.deepEqual(
      authorRevisionView.questions.map((question) =>
        Number(question.bank_question_id)
      ),
      [Number(versionTwo.bank_question_id)]
    );
    await assert.rejects(
      () =>
        bankService.createRevision({
          questionId: versionOne.bank_question_id,
          user: authorOne
        }),
      (error) => error.statusCode === 409
    );
    const hostBeforeRevisionApproval = await bankService.listQuestions({
      user: {
        user_id: ownerOne.user_id,
        parent_id: null,
        role: "host",
        rights: ["builder"]
      },
      query: { search: "Version workflow" }
    });
    assert.deepEqual(
      hostBeforeRevisionApproval.questions.map((question) =>
        Number(question.bank_question_id)
      ),
      [Number(versionOne.bank_question_id)]
    );
    await bankService.updateQuestion({
      questionId: versionTwo.bank_question_id,
      input: { question_text: "Version workflow question updated?" },
      user: authorOne
    });
    await bankService.submitQuestion({
      questionId: versionTwo.bank_question_id,
      user: authorOne
    });
    const hostWhileRevisionPending = await bankService.listQuestions({
      user: {
        user_id: ownerOne.user_id,
        parent_id: null,
        role: "host",
        rights: ["builder"]
      },
      query: { search: "Version workflow" }
    });
    assert.equal(
      Number(hostWhileRevisionPending.questions[0].bank_question_id),
      Number(versionOne.bank_question_id)
    );
    await bankService.reviewQuestion({
      questionId: versionTwo.bank_question_id,
      decision: "approved",
      comments: "",
      user: auditorOne
    });
    const hostAfterRevisionApproval = await bankService.listQuestions({
      user: {
        user_id: ownerOne.user_id,
        parent_id: null,
        role: "host",
        rights: ["builder"]
      },
      query: { search: "Version workflow" }
    });
    assert.equal(hostAfterRevisionApproval.questions.length, 1);
    assert.equal(hostAfterRevisionApproval.questions[0].version, 2);
    assert.equal(
      Number(hostAfterRevisionApproval.questions[0].bank_question_id),
      Number(versionTwo.bank_question_id)
    );
    const authorAfterRevisionApproval = await bankService.listQuestions({
      user: authorOne,
      query: { search: "Version workflow" }
    });
    assert.equal(authorAfterRevisionApproval.questions.length, 1);
    assert.equal(authorAfterRevisionApproval.questions[0].version, 2);
    const archivedVersions = await bankService.listQuestions({
      user: authorOne,
      query: { status: "archived", search: "Version workflow" }
    });
    assert.equal(archivedVersions.questions.length, 1);
    assert.equal(archivedVersions.questions[0].version, 1);

    const session = await Session.create({
      dept_id: department.dept_id,
      host_id: ownerTwo.user_id,
      title: "Tenant Isolation Test",
      session_code: crypto.randomBytes(3).toString("hex").toUpperCase(),
      status: "draft"
    });
    createdSessionIds.push(session.session_id);

    await assert.rejects(
      () =>
        bankService.copyBankQuestionsToSession({
          sessionId: session.session_id,
          bankQuestionIds: [created.bank_question_id],
          user: {
            user_id: ownerTwo.user_id,
            parent_id: null,
            role: "host",
            dept_id: department.dept_id,
            rights: ["builder"],
            data_scope: "own_sessions"
          }
        }),
      (error) => error.statusCode === 400
    );

    await assert.rejects(
      () =>
        bankService.addRandomQuestionsToSession({
          sessionId: session.session_id,
          topicId: created.topic_id,
          difficulty: "mixed",
          questionType: "mcq",
          count: 1,
          user: {
            user_id: ownerTwo.user_id,
            parent_id: null,
            role: "host",
            dept_id: department.dept_id,
            rights: ["builder"],
            data_scope: "own_sessions"
          }
        }),
      (error) =>
        error.statusCode === 400 &&
        error.details?.available_count === 0
    );

    const admin = await User.create({
      full_name: "Tenant Test Super Admin",
      email: uniqueEmail("tenant-super-admin"),
      password_hash: "integration-test",
      role: "super_admin",
      is_active: true
    });
    createdUserIds.push(admin.user_id);
    const adminUser = {
      user_id: admin.user_id,
      parent_id: null,
      role: "super_admin"
    };
    const adminQuestion = await bankService.createQuestion({
      input: {
        ...bankInput("Admin Topic", "Can an administrator self-approve?"),
        owner_id: ownerTwo.user_id
      },
      user: adminUser
    });
    await bankService.submitQuestion({
      questionId: adminQuestion.bank_question_id,
      user: adminUser
    });
    const approvedByAdmin = await bankService.reviewQuestion({
      questionId: adminQuestion.bank_question_id,
      decision: "approved",
      comments: "",
      user: adminUser
    });
    assert.equal(approvedByAdmin.status, "approved");
    assert.equal(Number(approvedByAdmin.owner_id), Number(ownerTwo.user_id));
    const ownerTwoAdminView = await bankService.listQuestions({
      user: adminUser,
      query: { owner_id: ownerTwo.user_id }
    });
    assert.equal(ownerTwoAdminView.questions.length, 1);
    assert.equal(
      Number(ownerTwoAdminView.questions[0].owner_id),
      Number(ownerTwo.user_id)
    );
  } finally {
    if (createdSessionIds.length) {
      await Question.destroy({ where: { session_id: createdSessionIds } });
      await Session.destroy({ where: { session_id: createdSessionIds } });
    }
    if (ownerOne || ownerTwo) {
      const ownerIds = [ownerOne?.user_id, ownerTwo?.user_id].filter(Boolean);
      await QuestionBankQuestion.destroy({ where: { owner_id: ownerIds } });
      await QuestionBankTopic.destroy({ where: { owner_id: ownerIds } });
    }
    if (createdUserIds.length) {
      await User.destroy({ where: { user_id: createdUserIds } });
    }
    await sequelize.close();
  }
});

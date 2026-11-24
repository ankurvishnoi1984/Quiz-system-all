const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { MailConfig, NotificationRecipient } = require("../models");
const {
  renderPasswordResetEmail,
  renderPasswordChangedEmail,
  renderEmailOtpEmail,
  renderNewUserWelcomeEmail,
  renderTeamMemberVerificationEmail,
  renderWebsiteSignupWelcomeEmail,
  renderWeeklySummaryEmail,
  renderParticipantLimitExceededEmail,
  renderPlanExpiredEmail,
  renderPlanExpiringSoonEmail,
  renderSessionEndedReportEmail,
  EMAIL_LOGO_CID
} = require("./email-templates");
const { logCaughtError } = require("./error-log.service");
const { Session, User } = require("../models");
const {
  getSessionSummaryReportForHost,
  buildParticipantsReportCsv
} = require("./session-report.service");

const EMAIL_LOGO_PATH = path.join(__dirname, "../../assets/email-logo.png");

function getEmailLogoAttachment() {
  if (!fs.existsSync(EMAIL_LOGO_PATH)) {
    return null;
  }

  return {
    filename: "email-logo.png",
    path: EMAIL_LOGO_PATH,
    cid: EMAIL_LOGO_CID
  };
}

async function getActiveMailConfig() {
  return MailConfig.findOne({
    where: { is_active: true },
    order: [
      ["priority", "ASC"],
      ["id", "ASC"]
    ]
  });
}

function createTransport(config) {
  const port = Number(config.smtp_port);
  // Port 465 uses implicit TLS; 587 uses STARTTLS (secure must be false).
  const secure = Boolean(config.secure) && port === 465;

  return nodemailer.createTransport({
    host: config.smtp_host,
    port,
    secure,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass
    }
  });
}

async function sendMailWithConfig(config, { to, cc, subject, text, html, attachments = [] }) {
  if (!config) {
    const error = new Error("No active mail configuration found");
    error.statusCode = 503;
    throw error;
  }

  if (config.sent_count >= config.daily_limit) {
    const error = new Error("Daily email limit reached for mail configuration");
    error.statusCode = 503;
    throw error;
  }

  const transport = createTransport(config);
  const fromName = config.sender_name || "Quiz Platform";
  const fromAddress = config.smtp_from || config.smtp_user;
  const ccList = Array.isArray(cc) ? cc.filter(Boolean) : cc ? [cc] : [];

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    cc: ccList.length ? ccList.join(", ") : undefined,
    subject,
    text,
    html,
    attachments
  });

  config.sent_count = Number(config.sent_count || 0) + 1;
  config.last_used_at = new Date();
  await config.save();
}

async function sendMail(payload) {
  const config = await getActiveMailConfig();
  await sendMailWithConfig(config, payload);
}

async function sendPasswordResetEmail({ to, fullName, temporaryPassword }) {
  const config = await getActiveMailConfig();
  const brandName = config?.sender_name || "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderPasswordResetEmail({
    fullName,
    temporaryPassword,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendPasswordChangedEmail({ to, fullName }) {
  const config = await getActiveMailConfig();
  const brandName = config?.sender_name || "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderPasswordChangedEmail({
    fullName,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });
  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendEmailOtpMail({ to, fullName, code, purpose, expiresInMinutes }) {
  const config = await getActiveMailConfig();
  const brandName = "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderEmailOtpEmail({
    fullName,
    code,
    purpose,
    expiresInMinutes,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendNewUserWelcomeEmail({
  to,
  cc,
  fullName,
  email,
  password,
  roleLabel,
  clientName,
  deptName,
  createdByName
}) {
  const config = await getActiveMailConfig();
  const brandName = config?.sender_name || "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderNewUserWelcomeEmail({
    fullName,
    email,
    password,
    roleLabel,
    clientName,
    deptName,
    createdByName,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    cc,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendTeamMemberVerificationEmail({
  to,
  fullName,
  email,
  password,
  teamLeadName,
  verificationUrl
}) {
  const config = await getActiveMailConfig();
  const brandName = config?.sender_name || "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderTeamMemberVerificationEmail({
    fullName,
    email,
    password,
    teamLeadName,
    verificationUrl,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendParticipantLimitExceededEmail({ to, fullName, planName, used, limit }) {
  const config = await getActiveMailConfig();
  const brandName = config?.sender_name || "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderParticipantLimitExceededEmail({
    fullName,
    planName,
    used,
    limit,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendPlanExpiredEmail({
  to,
  fullName,
  planName,
  expiredAt
}) {
  const config = await getActiveMailConfig();
  const brandName = "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderPlanExpiredEmail({
    fullName,
    planName,
    expiredAt,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function sendPlanExpiringSoonEmail({
  to,
  fullName,
  planName,
  expiresAt,
  daysLeft
}) {
  const config = await getActiveMailConfig();
  const brandName = "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderPlanExpiringSoonEmail({
    fullName,
    planName,
    expiresAt,
    daysLeft,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

async function listWebsiteSignupAdminEmails(excludeEmail) {
  try {
    const rows = await NotificationRecipient.findAll({
      where: {
        purpose: NotificationRecipient.WEBSITE_SIGNUP_PURPOSE,
        is_active: true
      },
      attributes: ["email"]
    });
    const exclude = String(excludeEmail || "").trim().toLowerCase();
    const seen = new Set();
    return rows
      .map((row) => String(row.email || "").trim().toLowerCase())
      .filter((address) => {
        if (!address || address === exclude || seen.has(address)) return false;
        seen.add(address);
        return true;
      });
  } catch (err) {
    console.error("listWebsiteSignupAdminEmails failed:", err);
    logCaughtError(err, {
      code: "list_website_signup_admin_emails",
      message: "listWebsiteSignupAdminEmails failed"
    });
    return [];
  }
}

async function sendWebsiteSignupWelcomeEmail({
  to,
  fullName,
  email,
  password,
  planName,
  planExpiresAt,
  companyName,
  omitCredentials = false
}) {
  const config = await getActiveMailConfig();
  const brandName = config?.sender_name || "Quiz Platform";
  const logoAttachment = getEmailLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : [];
  const templateInput = {
    fullName,
    email,
    password,
    planName,
    planExpiresAt,
    companyName,
    brandName,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null,
    omitCredentials: Boolean(omitCredentials)
  };
  const userMail = renderWebsiteSignupWelcomeEmail(templateInput);

  let userSendError = null;
  try {
    await sendMailWithConfig(config, {
      to,
      subject: userMail.subject,
      text: userMail.text,
      html: userMail.html,
      attachments
    });
  } catch (err) {
    userSendError = err;
  }

  const adminEmails = await listWebsiteSignupAdminEmails(to || email);
  if (adminEmails.length) {
    const adminMail = renderWebsiteSignupWelcomeEmail({
      ...templateInput,
      password: undefined,
      omitCredentials: true
    });
    try {
      await sendMailWithConfig(config, {
        to: adminEmails.join(", "),
        subject: adminMail.subject,
        text: adminMail.text,
        html: adminMail.html,
        attachments
      });
    } catch (err) {
      console.error("website signup admin notification failed:", err);
      logCaughtError(err, {
        code: "website_signup_admin_notify",
        message: "website signup admin notification failed"
      });
    }
  }

  if (userSendError) throw userSendError;
}

async function listWeeklySummaryEmails() {
  try {
    const rows = await NotificationRecipient.findAll({
      where: {
        purpose: NotificationRecipient.WEEKLY_SUMMARY_PURPOSE,
        is_active: true
      },
      attributes: ["email"]
    });
    const seen = new Set();
    return rows
      .map((row) => String(row.email || "").trim().toLowerCase())
      .filter((address) => {
        if (!address || seen.has(address)) return false;
        seen.add(address);
        return true;
      });
  } catch (err) {
    console.error("listWeeklySummaryEmails failed:", err);
    logCaughtError(err, {
      code: "list_weekly_summary_emails",
      message: "listWeeklySummaryEmails failed"
    });
    return [];
  }
}

async function sendWeeklySummaryEmail(summary) {
  const recipients = await listWeeklySummaryEmails();
  if (!recipients.length) {
    const error = new Error("No active weekly_summary notification recipients");
    error.statusCode = 503;
    throw error;
  }

  const config = await getActiveMailConfig();
  const logoAttachment = getEmailLogoAttachment();
  const { subject, text, html } = renderWeeklySummaryEmail({
    ...summary,
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
  });

  await sendMailWithConfig(config, {
    to: recipients.join(", "),
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : []
  });
}

/**
 * Fire-and-forget safe from session end paths. Idempotent via report_email_sent_at.
 */
async function sendSessionEndedReportEmail(sessionId) {
  const numericId = Number(sessionId);
  if (!Number.isFinite(numericId) || numericId <= 0) return { sent: false, reason: "invalid_id" };

  const session = await Session.findByPk(numericId, {
    attributes: [
      "session_id",
      "title",
      "host_id",
      "status",
      "auto_email_report_on_end",
      "report_email_sent_at"
    ]
  });
  if (!session) return { sent: false, reason: "not_found" };
  if (session.auto_email_report_on_end === false) {
    return { sent: false, reason: "disabled" };
  }
  if (session.report_email_sent_at) {
    return { sent: false, reason: "already_sent" };
  }
  if (!["completed", "archived"].includes(session.status)) {
    return { sent: false, reason: "not_ended" };
  }

  const [claimed] = await Session.update(
    { report_email_sent_at: new Date() },
    {
      where: {
        session_id: numericId,
        report_email_sent_at: null
      }
    }
  );
  if (!claimed) {
    return { sent: false, reason: "already_sent" };
  }

  try {
    const host = await User.findByPk(session.host_id, {
      attributes: ["user_id", "full_name", "email"]
    });
    const to = String(host?.email || "").trim();
    if (!to) {
      return { sent: false, reason: "no_host_email" };
    }

    const report = await getSessionSummaryReportForHost(numericId);
    const csv = buildParticipantsReportCsv(report.participant_summaries || []);
    const safeTitle = String(session.title || "session")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 40);
    const config = await getActiveMailConfig();
    const brandName = config?.sender_name || "Quiz Platform";
    const logoAttachment = getEmailLogoAttachment();
    const { subject, text, html } = renderSessionEndedReportEmail({
      fullName: host.full_name,
      sessionTitle: session.title,
      summary: report.summary,
      quizStats: report.quiz_stats,
      brandName,
      logoCid: logoAttachment ? EMAIL_LOGO_CID : null
    });

    const attachments = [
      {
        filename: `session-report-${safeTitle || numericId}.csv`,
        content: csv,
        contentType: "text/csv; charset=utf-8"
      }
    ];
    if (logoAttachment) attachments.push(logoAttachment);

    await sendMailWithConfig(config, {
      to,
      subject,
      text,
      html,
      attachments
    });

    return { sent: true, to };
  } catch (err) {
    await Session.update(
      { report_email_sent_at: null },
      { where: { session_id: numericId } }
    ).catch(() => {});
    throw err;
  }
}

module.exports = {
  getActiveMailConfig,
  sendMail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendEmailOtpMail,
  sendNewUserWelcomeEmail,
  sendTeamMemberVerificationEmail,
  sendWebsiteSignupWelcomeEmail,
  sendWeeklySummaryEmail,
  sendParticipantLimitExceededEmail,
  sendPlanExpiredEmail,
  sendPlanExpiringSoonEmail,
  sendSessionEndedReportEmail
};

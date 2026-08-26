const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { MailConfig, NotificationRecipient } = require("../models");
const {
  renderPasswordResetEmail,
  renderEmailOtpEmail,
  renderNewUserWelcomeEmail,
  renderWebsiteSignupWelcomeEmail,
  renderWeeklySummaryEmail,
  renderParticipantLimitExceededEmail,
  renderPlanExpiredEmail,
  EMAIL_LOGO_CID
} = require("./email-templates");

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
  const brandName = config?.sender_name || "Quiz Platform";
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
  companyName
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
    logoCid: logoAttachment ? EMAIL_LOGO_CID : null
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

module.exports = {
  getActiveMailConfig,
  sendMail,
  sendPasswordResetEmail,
  sendEmailOtpMail,
  sendNewUserWelcomeEmail,
  sendWebsiteSignupWelcomeEmail,
  sendWeeklySummaryEmail,
  sendParticipantLimitExceededEmail,
  sendPlanExpiredEmail
};

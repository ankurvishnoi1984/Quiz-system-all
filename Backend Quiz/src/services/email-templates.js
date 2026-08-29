const { getFrontendPublicUrl } = require("../config/publicAppUrl");

const EMAIL_LOGO_CID = "quiz-app-logo";

const BRAND = {
  navy: "#0f172a",
  navyMid: "#1e3a8a",
  blue: "#2563eb",
  amber: "#d97706",
  amberLight: "#fffbeb",
  amberBorder: "#fcd34d",
  slate: "#475569",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  surface: "#f8fafc",
  white: "#ffffff"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLoginUrl() {
  const origin = getFrontendPublicUrl();
  return origin ? `${origin}/login` : "/login";
}

function buildEmailLogoUrl() {
  const explicit = process.env.EMAIL_LOGO_URL || process.env.APP_LOGO_URL;
  if (explicit) {
    return String(explicit).trim();
  }

  const origin = getFrontendPublicUrl();
  const path = process.env.APP_LOGO_PATH || "/log5.png";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (origin) {
    return `${origin}${normalizedPath}`;
  }

  const apiOrigin =
    process.env.API_PUBLIC_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.BACKEND_PUBLIC_URL;
  if (apiOrigin) {
    return `${String(apiOrigin).replace(/\/+$/, "")}/branding/email-logo.png`;
  }

  return "";
}

function resolveEmailLogoSrc({ logoCid, logoUrl }) {
  if (logoCid) {
    return `cid:${logoCid}`;
  }

  const url = String(logoUrl || "").trim();
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    const origin = getFrontendPublicUrl();
    if (origin) {
      return `${origin}${url}`;
    }
  }

  return "";
}

function renderEmailHeaderBrand(brandName, { logoCid, logoUrl } = {}) {
  const safeBrand = escapeHtml(brandName || "Quiz Platform");
  const src = resolveEmailLogoSrc({ logoCid, logoUrl });

  if (src) {
    return `
                <tr>
                  <td style="padding-bottom:18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.96);border-radius:14px;padding:12px 18px;">
                          <img
                            class="email-brand-logo"
                            src="${escapeHtml(src)}"
                            alt="${safeBrand}"
                            width="180"
                            style="display:block;border:0;outline:none;text-decoration:none;width:180px;max-width:100%;height:auto;max-height:64px;object-fit:contain;"
                          />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:4px;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.white};letter-spacing:-0.01em;">${safeBrand}</p>
                    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.82);">Account notification</p>
                  </td>
                </tr>`;
  }

  return `
                <tr>
                  <td style="vertical-align:middle;padding-bottom:4px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:48px;height:48px;background-color:rgba(255,255,255,0.15);border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;font-weight:700;color:${BRAND.white};line-height:48px;">
                          Q
                        </td>
                        <td style="padding-left:14px;vertical-align:middle;">
                          <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.white};letter-spacing:-0.01em;">${safeBrand}</p>
                          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.82);">Account notification</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
}

/**
 * Shared responsive email shell (table layout for client compatibility).
 */
function renderEmailLayout({
  preheader,
  brandName,
  title,
  bodyHtml,
  footerNote,
  logoCid,
  logoUrl
}) {
  const safeBrand = escapeHtml(brandName || "Quiz Platform");
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const year = new Date().getFullYear();
  const brandHeaderHtml = renderEmailHeaderBrand(brandName, {
    logoCid,
    logoUrl: logoUrl ?? buildEmailLogoUrl()
  });

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-body-cell { padding: 28px 20px !important; }
      .email-header-cell { padding: 28px 20px !important; }
      .email-brand-logo { width: 150px !important; max-height: 54px !important; }
      .password-box { font-size: 22px !important; letter-spacing: 0.12em !important; }
      .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td class="email-header-cell" style="background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 55%,${BRAND.blue} 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${brandHeaderHtml}
                <tr>
                  <td style="padding-top:24px;">
                    <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:700;color:${BRAND.white};letter-spacing:-0.02em;">${safeTitle}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-body-cell" style="background-color:${BRAND.white};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:36px 40px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:${BRAND.white};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top:1px solid ${BRAND.border};padding-top:24px;">
                    <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${BRAND.slateLight};text-align:center;">
                      ${escapeHtml(footerNote || "This is an automated message. Please do not reply to this email.")}
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.slateLight};text-align:center;">
                      &copy; ${year} ${safeBrand}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderPasswordResetEmail({ fullName, temporaryPassword, brandName, logoCid, logoUrl }) {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const loginUrl = buildLoginUrl();
  const safePassword = escapeHtml(temporaryPassword);
  const safeGreeting = escapeHtml(greeting);

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      We received a request to reset the password for your account. Use the temporary password below to sign in&mdash;you&rsquo;ll be prompted to choose a new password right away.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            Temporary password
          </p>
          <p class="password-box" style="margin:0;font-family:'SF Mono',SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:0.18em;color:${BRAND.navy};word-break:break-all;">
            ${safePassword}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">What to do next</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:0 0 10px;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">1.</td>
              <td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${BRAND.slate};">Open the sign-in page using the button below.</td>
            </tr>
            <tr>
              <td style="padding:0 0 10px;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">2.</td>
              <td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${BRAND.slate};">Enter your email and the temporary password shown above.</td>
            </tr>
            <tr>
              <td style="padding:0;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">3.</td>
              <td style="padding:0;font-size:14px;line-height:1.55;color:${BRAND.slate};">Create a new password when prompted before continuing.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 100%);">
          <a class="cta-button" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:12px;">
            Sign in to your account
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.slateLight};text-align:center;">
      Or copy this link into your browser:<br />
      <a href="${escapeHtml(loginUrl)}" style="color:${BRAND.blue};word-break:break-all;">${escapeHtml(loginUrl)}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 18px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#991b1b;">
            <strong>Didn&rsquo;t request this?</strong> Someone may have entered your email by mistake. If you did not ask for a password reset, ignore this email or contact your administrator. Your existing password will stay unchanged until you sign in with the temporary password above.
          </p>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Your temporary password is ${temporaryPassword}. Sign in and choose a new password.`,
    brandName,
    title: "Password reset",
    bodyHtml,
    footerNote: "You received this email because a password reset was requested for your account.",
    logoCid,
    logoUrl
  });

  const text = `${greeting}

We received a request to reset the password for your account.

TEMPORARY PASSWORD
${temporaryPassword}

WHAT TO DO NEXT
1. Open the sign-in page: ${loginUrl}
2. Sign in with your email and the temporary password above.
3. Choose a new password when prompted.

If you did not request this reset, ignore this email or contact your administrator.

— ${brandName || "Quiz Platform"}`;

  return {
    subject: "Your password has been reset",
    text,
    html
  };
}

function renderAssignmentDetail(label, value) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:${BRAND.slateLight};width:120px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;font-size:14px;color:${BRAND.navy};font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;
}

function renderNewUserWelcomeEmail({
  fullName,
  email,
  password,
  roleLabel,
  clientName,
  deptName,
  createdByName,
  brandName,
  logoCid,
  logoUrl
}) {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const loginUrl = buildLoginUrl();
  const safePassword = escapeHtml(password);
  const safeGreeting = escapeHtml(greeting);
  const safeEmail = escapeHtml(email);
  const safeRole = escapeHtml(roleLabel || "User");
  const safeCreatedBy = escapeHtml(createdByName || "your administrator");

  const assignmentRows = [
    renderAssignmentDetail("Email", email),
    renderAssignmentDetail("Role", roleLabel),
    renderAssignmentDetail("Client", clientName),
    renderAssignmentDetail("Department", deptName)
  ]
    .filter(Boolean)
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      Admin has created an account for you on "Quiz Platform". Use the sign-in details below to access the host workspace.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">Account details</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${assignmentRows}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            Password
          </p>
          <p class="password-box" style="margin:0;font-family:'SF Mono',SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:0.18em;color:${BRAND.navy};word-break:break-all;">
            ${safePassword}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">Getting started</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:0 0 10px;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">1.</td>
              <td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${BRAND.slate};">Open the sign-in page using the button below.</td>
            </tr>
            <tr>
              <td style="padding:0 0 10px;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">2.</td>
              <td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${BRAND.slate};">Sign in with <strong>${safeEmail}</strong> and the password above.</td>
            </tr>
            <tr>
              <td style="padding:0;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">3.</td>
              <td style="padding:0;font-size:14px;line-height:1.55;color:${BRAND.slate};">Keep your credentials secure and contact your administrator if you need help.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 100%);">
          <a class="cta-button" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:12px;">
            Sign in to your account
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.slateLight};text-align:center;">
      Or copy this link into your browser:<br />
      <a href="${escapeHtml(loginUrl)}" style="color:${BRAND.blue};word-break:break-all;">${escapeHtml(loginUrl)}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#1e3a8a;">
            <strong>Your role:</strong> ${safeRole}. If any account details look incorrect, please contact your administrator.
          </p>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Your ${brandName || "Quiz Platform"} account is ready. Sign in with ${email}.`,
    brandName,
    title: "Welcome to the platform",
    bodyHtml,
    footerNote: "You received this email because an administrator created an account for you.",
    logoCid,
    logoUrl
  });

  const assignmentText = [
    clientName ? `Client: ${clientName}` : null,
    deptName ? `Department: ${deptName}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const text = `${greeting}

Admin has created an account for you on "Quiz Platform".

ACCOUNT DETAILS
Email: ${email}
Role: ${roleLabel || "User"}
${assignmentText}

PASSWORD
${password}

GETTING STARTED
1. Open the sign-in page: ${loginUrl}
2. Sign in with your email and the password above.
3. Keep your credentials secure and contact your administrator if you need help.

— ${brandName || "Quiz Platform"}`;

  return {
    subject: `Your ${brandName || "Quiz Platform"} account has been created`,
    text,
    html
  };
}

function renderParticipantLimitExceededEmail({
  fullName,
  planName,
  used,
  limit,
  brandName,
  logoCid,
  logoUrl
}) {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const loginUrl = buildLoginUrl();
  const safeGreeting = escapeHtml(greeting);
  const safePlan = escapeHtml(planName || "your plan");
  const usedLabel = Number(used) || 0;
  const limitLabel = Number(limit) || 0;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      Your connected participant limit has been reached. New people can no longer join any of your sessions until someone disconnects.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            Plan limit reached
          </p>
          <p style="margin:0;font-size:16px;line-height:1.6;color:${BRAND.navy};">
            <strong>${safePlan}</strong> allows <strong>${limitLabel}</strong> connected participants at the same time.
            Current usage is <strong>${usedLabel} / ${limitLabel}</strong>.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${BRAND.slate};">
      Capacity frees up when participants disconnect. Ask your administrator to upgrade your plan if you need more seats.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 100%);">
          <a class="cta-button" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:12px;">
            Open host dashboard
          </a>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Your ${planName || "plan"} participant limit (${limitLabel}) has been reached.`,
    brandName,
    title: "Participant limit reached",
    bodyHtml,
    footerNote: "You received this email because a participant tried to join after your plan limit was reached.",
    logoCid,
    logoUrl
  });

  const text = `${greeting}

Your connected participant limit has been reached. New people can no longer join any of your sessions until someone disconnects.

PLAN LIMIT REACHED
Plan: ${planName || "your plan"}
Connected: ${usedLabel} / ${limitLabel}

Capacity frees up when participants disconnect, or ask your administrator to upgrade your plan.

Open host dashboard: ${loginUrl}

— ${brandName || "Quiz Platform"}`;

  return {
    subject: `Participant limit reached on ${brandName || "Quiz Platform"}`,
    text,
    html
  };
}

function renderPlanExpiredEmail({
  fullName,
  planName,
  expiredAt,
  brandName,
  logoCid,
  logoUrl
}) {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const loginUrl = buildLoginUrl();
  const safeGreeting = escapeHtml(greeting);
  const safePlan = escapeHtml(planName || "your plan");
  const expiredLabel = expiredAt || "recently";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      Your <strong>${safePlan}</strong> access ended on <strong>${escapeHtml(String(expiredLabel))}</strong>.
      You no longer have an active plan, so launching sessions, editing questions, and resetting responses are paused until your plan is renewed.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            No active plan
          </p>
          <p style="margin:0;font-size:16px;line-height:1.6;color:${BRAND.navy};">
            Ask your administrator to renew or assign a plan so you can host live sessions again.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 100%);">
          <a class="cta-button" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:12px;">
            Open host dashboard
          </a>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Your ${planName || "plan"} has expired. You do not have an active plan.`,
    brandName,
    title: "No active plan",
    bodyHtml,
    footerNote: "You received this email because your plan end date has passed.",
    logoCid,
    logoUrl
  });

  const text = `${greeting}

Your ${planName || "plan"} access ended on ${expiredLabel}.
You no longer have an active plan. Launching sessions, editing questions, and resetting responses are paused until your administrator renews your plan.

Open host dashboard: ${loginUrl}

— ${brandName || "Quiz Platform"}`;

  return {
    subject: `Your ${planName || "plan"} has expired on ${brandName || "Quiz Platform"}`,
    text,
    html
  };
}

function renderPlanExpiringSoonEmail({
  fullName,
  planName,
  expiresAt,
  daysLeft,
  brandName,
  logoCid,
  logoUrl
}) {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const loginUrl = buildLoginUrl();
  const safeGreeting = escapeHtml(greeting);
  const safePlan = escapeHtml(planName || "your plan");
  const days = Math.max(0, Number(daysLeft) || 0);
  const daysLabel =
    days === 1 ? "1 day" : days === 0 ? "today" : `${days} days`;
  const urgency =
    days <= 1 ? "final reminder" : days <= 3 ? "urgent reminder" : "friendly reminder";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      This is a ${escapeHtml(urgency)}: your <strong>${safePlan}</strong> access
      ${days === 0 ? "expires <strong>today</strong>" : `expires in <strong>${escapeHtml(daysLabel)}</strong>`}
      ${expiresAt ? ` on <strong>${escapeHtml(String(expiresAt))}</strong>` : ""}.
      Renew soon so creating sessions, launching, and managing questions stay available without interruption.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            Plan expiring soon
          </p>
          <p style="margin:0;font-size:16px;line-height:1.6;color:${BRAND.navy};">
            ${safePlan} ends ${days === 0 ? "today" : `in ${escapeHtml(daysLabel)}`}
            ${expiresAt ? ` (${escapeHtml(String(expiresAt))})` : ""}.
            Contact your administrator to renew or upgrade before the end date.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 100%);">
          <a class="cta-button" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:12px;">
            Open host dashboard
          </a>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Your ${planName || "plan"} expires ${days === 0 ? "today" : `in ${daysLabel}`}.`,
    brandName,
    title: "Plan expiring soon",
    bodyHtml,
    footerNote: "You received this email because your plan end date is approaching.",
    logoCid,
    logoUrl
  });

  const text = `${greeting}

Your ${planName || "plan"} expires ${days === 0 ? "today" : `in ${daysLabel}`}${
    expiresAt ? ` (${expiresAt})` : ""
  }.

Renew soon so creating sessions, launching, and managing questions stay available without interruption.
Contact your administrator to renew or upgrade before the end date.

Open host dashboard: ${loginUrl}

— ${brandName || "Quiz Platform"}`;

  const subjectDays =
    days === 0
      ? "expires today"
      : days === 1
        ? "expires in 1 day"
        : `expires in ${days} days`;

  return {
    subject: `Reminder: your ${planName || "plan"} ${subjectDays}`,
    text,
    html
  };
}

function renderWebsiteSignupWelcomeEmail({
  fullName,
  email,
  password,
  planName,
  planExpiresAt,
  companyName,
  brandName,
  logoCid,
  logoUrl,
  omitCredentials = false
}) {
  const greeting = omitCredentials
    ? "Hello,"
    : fullName
      ? `Hello ${fullName},`
      : "Hello,";
  const loginUrl = buildLoginUrl();
  const supportEmail = process.env.SUPPORT_EMAIL || "techsupport@netcastservice.com";
  const safeGreeting = escapeHtml(greeting);
  const safeEmail = escapeHtml(email);
  const safePassword = omitCredentials ? "" : escapeHtml(password);
  const safePlan = escapeHtml(planName || "Paid plan");
  const safeExpiry = planExpiresAt ? escapeHtml(planExpiresAt) : "Does not expire";
  const introHtml = omitCredentials
    ? `A new host registered on "Quiz Platform". Account details are below. The host received their sign-in password separately.`
    : `Your host account on "Quiz Platform" is ready. Keep this email for your sign-in details and plan information.`;
  const signInStepHtml = omitCredentials
    ? `The host signs in with <strong>${safeEmail}</strong>. Their password was sent only to them.`
    : `Sign in with <strong>${safeEmail}</strong> and the password above.`;

  const assignmentRows = [
    renderAssignmentDetail("Name", omitCredentials ? fullName : null),
    renderAssignmentDetail("Email", email),
    renderAssignmentDetail("Role", "Host"),
    renderAssignmentDetail("Plan", planName || "Paid plan"),
    renderAssignmentDetail("Plan valid until", planExpiresAt || "Does not expire"),
    renderAssignmentDetail("Company", companyName)
  ]
    .filter(Boolean)
    .join("");

  const passwordHtml = omitCredentials
    ? ""
    : `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            Password
          </p>
          <p class="password-box" style="margin:0;font-family:'SF Mono',SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:0.18em;color:${BRAND.navy};word-break:break-all;">
            ${safePassword}
          </p>
        </td>
      </tr>
    </table>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      ${introHtml}
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">Account details</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${assignmentRows}
          </table>
        </td>
      </tr>
    </table>
    ${passwordHtml}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">Getting started</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:0 0 10px;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">1.</td>
              <td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${BRAND.slate};">Open the host portal with the button below.</td>
            </tr>
            <tr>
              <td style="padding:0 0 10px;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">2.</td>
              <td style="padding:0 0 10px;font-size:14px;line-height:1.55;color:${BRAND.slate};">${signInStepHtml}</td>
            </tr>
            <tr>
              <td style="padding:0;vertical-align:top;width:28px;font-size:14px;font-weight:700;color:${BRAND.blue};">3.</td>
              <td style="padding:0;font-size:14px;line-height:1.55;color:${BRAND.slate};">Create a session, add questions, and go live. Need help? ${escapeHtml(supportEmail)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="border-radius:12px;background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 100%);">
          <a class="cta-button" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:12px;">
            Sign in to the host portal
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.slateLight};text-align:center;">
      Or copy this link into your browser:<br />
      <a href="${escapeHtml(loginUrl)}" style="color:${BRAND.blue};word-break:break-all;">${escapeHtml(loginUrl)}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#1e3a8a;">
            <strong>Plan:</strong> ${safePlan}${planExpiresAt ? ` · valid until ${safeExpiry}` : ""}. Keep this email in a safe place.
          </p>
        </td>
      </tr>
    </table>`;

  const platformName = "Quiz Platform";

  const html = renderEmailLayout({
    preheader: omitCredentials
      ? `A new host registered: ${email}.`
      : `Your ${platformName} host account is ready. Sign in with ${email}.`,
    brandName: platformName,
    title: omitCredentials ? "New host registration" : "Your host account is ready",
    bodyHtml,
    footerNote: omitCredentials
      ? "You received this email because you are listed as a website signup recipient."
      : "You received this email because you created a host account on our website.",
    logoCid,
    logoUrl
  });

  const passwordText = omitCredentials
    ? ""
    : `
PASSWORD
${password}
`;
  const introText = omitCredentials
    ? `A new host registered on "${platformName}". Account details are below. The host received their sign-in password separately.`
    : `Your host account on "${platformName}" is ready.`;
  const signInStepText = omitCredentials
    ? `The host signs in with ${email}. Their password was sent only to them.`
    : "Sign in with your email and the password above.";

  const text = `${greeting}

${introText}

ACCOUNT DETAILS
${fullName && omitCredentials ? `Name: ${fullName}\n` : ""}Email: ${email}
Role: Host
Plan: ${planName || "Paid plan"}
Plan valid until: ${planExpiresAt || "Does not expire"}
${companyName ? `Company: ${companyName}\n` : ""}${passwordText}
GETTING STARTED
1. Open the host portal: ${loginUrl}
2. ${signInStepText}
3. Create a session, add questions, and go live. Need help? ${supportEmail}

— ${platformName}`;

  return {
    subject: omitCredentials
      ? `New host registration on ${platformName}`
      : `Your ${platformName} host account is ready`,
    text,
    html
  };
}

function renderMetricRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;font-size:14px;color:${BRAND.slateLight};border-bottom:1px solid ${BRAND.border};">${escapeHtml(label)}</td>
      <td style="padding:10px 0;font-size:14px;font-weight:700;color:${BRAND.navy};text-align:right;border-bottom:1px solid ${BRAND.border};">${escapeHtml(String(value))}</td>
    </tr>`;
}

function renderWeeklySummaryEmail(summary) {
  const platformName = "Quiz Platform";
  const periodLabel = `${summary.weekStartLabel} to ${summary.weekEndLabel}`;
  const netLabel =
    summary.netPaidChange > 0
      ? `+${summary.netPaidChange}`
      : String(summary.netPaidChange);

  const planRowsHtml =
    summary.purchasesByPlan.length === 0
      ? `<tr><td colspan="3" style="padding:10px 0;font-size:14px;color:${BRAND.slateLight};">No paid purchases this week.</td></tr>`
      : summary.purchasesByPlan
          .map(
            (row) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:${BRAND.navy};border-bottom:1px solid ${BRAND.border};">${escapeHtml(row.planName)}</td>
      <td style="padding:8px 0;font-size:14px;color:${BRAND.slate};text-align:right;border-bottom:1px solid ${BRAND.border};">${row.count}</td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.navy};text-align:right;border-bottom:1px solid ${BRAND.border};">${escapeHtml(row.revenueLabel)}</td>
    </tr>`
          )
          .join("");

  const newHosts = Array.isArray(summary.newHostSignupHosts)
    ? summary.newHostSignupHosts
    : [];
  const newHostsRowsHtml =
    newHosts.length === 0
      ? `<tr><td style="padding:10px 0;font-size:14px;color:${BRAND.slateLight};">No new host signups this week.</td></tr>`
      : newHosts
          .map((host) => {
            const detail = [host.email, host.planName].filter(Boolean).join(" · ");
            return `
    <tr>
      <td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.navy};border-bottom:1px solid ${BRAND.border};">${escapeHtml(host.fullName || "Unnamed host")}</td>
      <td style="padding:8px 0;font-size:13px;color:${BRAND.slate};text-align:right;border-bottom:1px solid ${BRAND.border};">${escapeHtml(detail || "—")}</td>
    </tr>`;
          })
          .join("");

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">Hello,</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      Here is the weekly Quiz Platform summary for <strong>${escapeHtml(periodLabel)}</strong> (Asia/Kolkata).
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">This week</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${renderMetricRow("Paid purchases", summary.purchasesCount)}
            ${renderMetricRow("Revenue", summary.revenueLabel)}
            ${renderMetricRow("New host signups", summary.newHostSignups)}
            ${renderMetricRow("Failed payments", summary.failedPaymentsCount)}
            ${renderMetricRow("Paid but not signed up", summary.paidNotSignedUp)}
            ${renderMetricRow("Sessions created", summary.sessionsCreated)}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">New host signups</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${newHostsRowsHtml}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">Purchases by plan</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.slateLight};">Plan</td>
              <td style="padding:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.slateLight};text-align:right;">Count</td>
              <td style="padding:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.slateLight};text-align:right;">Revenue</td>
            </tr>
            ${planRowsHtml}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;">
      <tr>
        <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND.navy};">Users &amp; growth</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${renderMetricRow("Total active users", summary.totalActiveUsers)}
            ${renderMetricRow("Total paid users (now)", summary.totalPaidUsers)}
            ${renderMetricRow("New paid users this week", summary.newPaidUsers)}
            ${renderMetricRow("Plans expired this week", summary.expiredPaidUsers)}
            ${renderMetricRow("Net paid change", netLabel)}
            ${renderMetricRow("Plans expiring in next 7 days", summary.plansExpiringSoon)}
          </table>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Weekly summary ${periodLabel}: ${summary.purchasesCount} purchases, ${summary.revenueLabel} revenue.`,
    brandName: platformName,
    title: "Weekly platform summary",
    bodyHtml,
    footerNote: "You received this email because you are listed as a weekly summary recipient.",
    logoCid: summary.logoCid,
    logoUrl: summary.logoUrl
  });

  const planText =
    summary.purchasesByPlan.length === 0
      ? "No paid purchases this week."
      : summary.purchasesByPlan
          .map((row) => `- ${row.planName}: ${row.count} (${row.revenueLabel})`)
          .join("\n");

  const newHostsText =
    newHosts.length === 0
      ? "No new host signups this week."
      : newHosts
          .map((host) => {
            const detail = [host.email, host.planName].filter(Boolean).join(" · ");
            return `- ${host.fullName || "Unnamed host"}${detail ? ` (${detail})` : ""}`;
          })
          .join("\n");

  const text = `Hello,

Weekly Quiz Platform summary for ${periodLabel} (Asia/Kolkata).

THIS WEEK
Paid purchases: ${summary.purchasesCount}
Revenue: ${summary.revenueLabel}
New host signups: ${summary.newHostSignups}
Failed payments: ${summary.failedPaymentsCount}
Paid but not signed up: ${summary.paidNotSignedUp}
Sessions created: ${summary.sessionsCreated}

NEW HOST SIGNUPS
${newHostsText}

PURCHASES BY PLAN
${planText}

USERS & GROWTH
Total active users: ${summary.totalActiveUsers}
Total paid users (now): ${summary.totalPaidUsers}
New paid users this week: ${summary.newPaidUsers}
Plans expired this week: ${summary.expiredPaidUsers}
Net paid change: ${netLabel}
Plans expiring in next 7 days: ${summary.plansExpiringSoon}

— ${platformName}`;

  return {
    subject: `Weekly Quiz Platform summary (${periodLabel})`,
    text,
    html
  };
}

function renderEmailOtpEmail({ fullName, code, purpose, expiresInMinutes, brandName, logoCid, logoUrl }) {
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const safeGreeting = escapeHtml(greeting);
  const safeCode = escapeHtml(code);
  const minutes = Math.max(1, Number(expiresInMinutes) || 10);
  const purposeLabel =
    purpose === "login" ? "sign-in verification" : purpose === "payment" ? "payment verification" : "verification";
  const title = purpose === "login" ? "Your login code" : purpose === "payment" ? "Your payment verification code" : "Your verification code";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${BRAND.slate};">${safeGreeting}</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${BRAND.slate};">
      Use the one-time code below to complete ${escapeHtml(purposeLabel)}. This code expires in ${minutes} minutes.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:${BRAND.amberLight};border:1px solid ${BRAND.amberBorder};border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.amber};">
            One-time code
          </p>
          <p class="password-box" style="margin:0;font-family:'SF Mono',SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:${BRAND.navy};word-break:break-all;">
            ${safeCode}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;">
      <tr>
        <td style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 18px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#991b1b;">
            <strong>Didn&rsquo;t request this?</strong> Ignore this email. Do not share this code with anyone.
          </p>
        </td>
      </tr>
    </table>`;

  const html = renderEmailLayout({
    preheader: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
    brandName,
    title,
    bodyHtml,
    footerNote: "You received this email because a verification code was requested.",
    logoCid,
    logoUrl
  });

  const text = `${greeting}

Use this one-time code to complete ${purposeLabel}:

${code}

This code expires in ${minutes} minutes.

If you did not request this, ignore this email.

— ${brandName || "Quiz Platform"}
`;

  return {
    subject: `${title} — Quiz Platform`,
    text,
    html
  };
}

module.exports = {
  escapeHtml,
  renderEmailLayout,
  renderPasswordResetEmail,
  renderEmailOtpEmail,
  renderNewUserWelcomeEmail,
  renderWebsiteSignupWelcomeEmail,
  renderWeeklySummaryEmail,
  renderParticipantLimitExceededEmail,
  renderPlanExpiredEmail,
  renderPlanExpiringSoonEmail,
  buildLoginUrl,
  buildEmailLogoUrl,
  EMAIL_LOGO_CID
};

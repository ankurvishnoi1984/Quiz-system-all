const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { Session, Participant } = require("../models");
const {
  normalizeCertificateNameLayout
} = require("../utils/certificateLayout");

function createError(message, statusCode, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveUploadsAbsolutePath(fileUrlOrPath) {
  const raw = String(fileUrlOrPath || "").trim();
  if (!raw) return null;
  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      pathname = new URL(raw).pathname;
    }
  } catch {
    // keep raw
  }
  const normalized = pathname.replace(/\\/g, "/");
  const marker = "/uploads/";
  const idx = normalized.indexOf(marker);
  const relative =
    idx >= 0
      ? normalized.slice(idx + 1)
      : normalized.startsWith("uploads/")
        ? normalized
        : normalized.startsWith("/uploads/")
          ? normalized.slice(1)
          : null;
  if (!relative) return null;
  const absolute = path.resolve(process.cwd(), relative);
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  if (!absolute.startsWith(uploadsRoot)) return null;
  return absolute;
}

function fontMimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".woff2") return "font/woff2";
  if (ext === ".woff") return "font/woff";
  if (ext === ".otf") return "font/otf";
  return "font/ttf";
}

async function buildFontFaceCss(customFontUrl, familyName) {
  if (!customFontUrl) return "";
  const absolute = resolveUploadsAbsolutePath(customFontUrl);
  if (!absolute || !fs.existsSync(absolute)) return "";
  const buf = await fsp.readFile(absolute);
  const b64 = buf.toString("base64");
  const mime = fontMimeFromPath(absolute);
  const safeFamily = escapeXml(familyName || "CertificateCustom");
  return `@font-face{font-family:'${safeFamily}';src:url(data:${mime};base64,${b64}) format('${
    mime.includes("woff2")
      ? "woff2"
      : mime.includes("woff")
        ? "woff"
        : mime.includes("otf")
          ? "opentype"
          : "truetype"
  }');font-weight:normal;font-style:normal;}`;
}

function participantDisplayName(participant) {
  const nickname = String(participant?.nickname || "").trim();
  if (nickname) return nickname;
  const email = String(participant?.email || "").trim();
  if (email) return email;
  return `Participant ${participant?.participant_id || ""}`.trim();
}

async function renderCertificatePng({ session, participantName }) {
  const templatePath = resolveUploadsAbsolutePath(session.certificate_template_url);
  if (!templatePath || !fs.existsSync(templatePath)) {
    throw createError("Certificate template file not found", 404);
  }

  const layout = normalizeCertificateNameLayout(session.certificate_name_layout);
  const image = sharp(templatePath);
  const meta = await image.metadata();
  const width = meta.width || 1200;
  const height = meta.height || 900;

  const x = (layout.x_percent / 100) * width;
  const y = (layout.y_percent / 100) * height;
  const anchor =
    layout.text_align === "left"
      ? "start"
      : layout.text_align === "right"
        ? "end"
        : "middle";
  const family = session.certificate_custom_font_url
    ? "CertificateCustom"
    : layout.font_family;
  const fontFace = await buildFontFaceCss(
    session.certificate_custom_font_url,
    "CertificateCustom"
  );
  const safeName = escapeXml(participantName);
  const weight = layout.font_weight === "bold" ? "700" : layout.font_weight;

  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        ${fontFace}
        .name {
          font-family: '${escapeXml(family)}', Georgia, serif;
          font-size: ${layout.font_size}px;
          font-weight: ${escapeXml(weight)};
          fill: ${escapeXml(layout.color)};
        }
      </style>
      <text
        class="name"
        x="${x}"
        y="${y}"
        text-anchor="${anchor}"
        dominant-baseline="middle"
      >${safeName}</text>
    </svg>`
  );

  return image
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

async function generateParticipantCertificate({ sessionId, participant }) {
  const session = await Session.findByPk(Number(sessionId));
  if (!session) throw createError("Session not found", 404);
  if (Number(participant.session_id) !== Number(session.session_id)) {
    throw createError("Participant does not belong to this session", 403);
  }
  if (!session.certificate_enabled || !session.certificate_template_url) {
    throw createError("Certificate is not configured for this session", 400);
  }
  if (!session.certificate_download_enabled) {
    throw createError("Certificate download is not enabled yet", 403, "certificate_disabled");
  }

  const row = await Participant.findByPk(participant.participant_id);
  if (!row) throw createError("Participant not found", 404);

  const name = participantDisplayName(row);
  const buffer = await renderCertificatePng({ session, participantName: name });
  const safeFile = name
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return {
    buffer,
    filename: `certificate-${safeFile || row.participant_id}.png`,
    contentType: "image/png"
  };
}

module.exports = {
  generateParticipantCertificate,
  renderCertificatePng,
  participantDisplayName,
  resolveUploadsAbsolutePath
};

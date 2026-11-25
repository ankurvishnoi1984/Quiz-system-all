const DEFAULT_LAYOUT = {
  x_percent: 50,
  y_percent: 55,
  font_family: "Georgia",
  font_size: 48,
  font_weight: "700",
  color: "#1e293b",
  text_align: "center"
};

const ALLOWED_WEIGHTS = new Set(["400", "500", "600", "700", "800", "bold", "normal"]);

function clampPercent(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

function normalizeCertificateNameLayout(raw) {
  if (raw == null || typeof raw !== "object") {
    return { ...DEFAULT_LAYOUT };
  }
  const fontSize = Number(raw.font_size);
  const weight = String(raw.font_weight || DEFAULT_LAYOUT.font_weight).trim();
  const align = String(raw.text_align || DEFAULT_LAYOUT.text_align).trim().toLowerCase();
  const color = String(raw.color || DEFAULT_LAYOUT.color).trim();
  const family = String(raw.font_family || DEFAULT_LAYOUT.font_family).trim();

  return {
    x_percent: clampPercent(raw.x_percent, DEFAULT_LAYOUT.x_percent),
    y_percent: clampPercent(raw.y_percent, DEFAULT_LAYOUT.y_percent),
    font_family: family || DEFAULT_LAYOUT.font_family,
    font_size:
      Number.isFinite(fontSize) && fontSize >= 1 && fontSize <= 100
        ? Math.round(fontSize)
        : DEFAULT_LAYOUT.font_size,
    font_weight: ALLOWED_WEIGHTS.has(weight) ? weight : DEFAULT_LAYOUT.font_weight,
    color: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)
      ? color
      : DEFAULT_LAYOUT.color,
    text_align: ["left", "center", "right"].includes(align)
      ? align
      : DEFAULT_LAYOUT.text_align
  };
}

function trimUrlOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function resolveCertificateFields(input, { forUpdate = false, existing = null } = {}) {
  const enabled =
    input.certificate_enabled !== undefined
      ? Boolean(input.certificate_enabled)
      : forUpdate
        ? Boolean(existing?.certificate_enabled)
        : Boolean(input.certificate_enabled);

  if (!enabled) {
    return {
      certificate_enabled: false,
      certificate_template_url: null,
      certificate_custom_font_url: null,
      certificate_name_layout: null,
      certificate_download_enabled: forUpdate
        ? input.certificate_download_enabled !== undefined
          ? Boolean(input.certificate_download_enabled)
          : Boolean(existing?.certificate_download_enabled)
        : false
    };
  }

  const templateUrl =
    input.certificate_template_url !== undefined
      ? trimUrlOrNull(input.certificate_template_url)
      : forUpdate
        ? existing?.certificate_template_url || null
        : trimUrlOrNull(input.certificate_template_url);

  const fontUrl =
    input.certificate_custom_font_url !== undefined
      ? trimUrlOrNull(input.certificate_custom_font_url)
      : forUpdate
        ? existing?.certificate_custom_font_url || null
        : trimUrlOrNull(input.certificate_custom_font_url);

  const layoutSource =
    input.certificate_name_layout !== undefined
      ? input.certificate_name_layout
      : forUpdate
        ? existing?.certificate_name_layout
        : input.certificate_name_layout;

  return {
    certificate_enabled: true,
    certificate_template_url: templateUrl,
    certificate_custom_font_url: fontUrl,
    certificate_name_layout: normalizeCertificateNameLayout(layoutSource),
    certificate_download_enabled:
      input.certificate_download_enabled !== undefined
        ? Boolean(input.certificate_download_enabled)
        : forUpdate
          ? Boolean(existing?.certificate_download_enabled)
          : false
  };
}

module.exports = {
  DEFAULT_LAYOUT,
  normalizeCertificateNameLayout,
  resolveCertificateFields,
  trimUrlOrNull
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base, findExisting) {
  const normalized = slugify(base) || "org";
  let slug = normalized;
  let attempt = 0;

  while (await findExisting(slug)) {
    attempt += 1;
    slug = `${normalized}-${attempt}`;
  }

  return slug;
}

module.exports = {
  slugify,
  uniqueSlug
};

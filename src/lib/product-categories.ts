export const normalizeText = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const UPGRADE_HINTS = ["nang cap", "goi", "upgrade", "gia han", "plus", "pro", "team", "business", "premium"];

const ACCOUNT_HINTS = ["tai khoan", "account", "acc", "sharing", "dung chung", "ung dung", "tool", "ai"];

export const ACCOUNT_CATEGORY = "T\u00e0i kho\u1ea3n s\u1ed1";
export const UPGRADE_CATEGORY = "N\u00e2ng c\u1ea5p g\u00f3i";

const splitCategories = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeCategoryList = (value?: string | string[]) => {
  const source = Array.isArray(value) ? value : splitCategories(value ?? "");
  const uniqueCategories = new Map<string, string>();

  source.forEach((category) => {
    const trimmed = category.trim();

    if (!trimmed) {
      return;
    }

    const normalized = normalizeText(trimmed);

    if (!uniqueCategories.has(normalized)) {
      uniqueCategories.set(normalized, trimmed);
    }
  });

  return Array.from(uniqueCategories.values());
};

const inferSingleCategory = (input: {
  category?: string;
  name?: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
}) => {
  const normalizedCategory = normalizeText(input.category);

  if (normalizedCategory === normalizeText(ACCOUNT_CATEGORY)) {
    return ACCOUNT_CATEGORY;
  }

  if (normalizedCategory === normalizeText(UPGRADE_CATEGORY)) {
    return UPGRADE_CATEGORY;
  }

  if (
    normalizedCategory.includes("license") ||
    normalizedCategory.includes("ban quyen") ||
    normalizedCategory.includes("phan mem") ||
    normalizedCategory.includes("software")
  ) {
    return ACCOUNT_CATEGORY;
  }

  const haystack = normalizeText(
    [input.category, input.name, input.slug, input.shortDescription, input.fullDescription].filter(Boolean).join(" ")
  );

  if (UPGRADE_HINTS.some((hint) => haystack.includes(hint))) {
    return UPGRADE_CATEGORY;
  }

  if (ACCOUNT_HINTS.some((hint) => haystack.includes(hint))) {
    return ACCOUNT_CATEGORY;
  }

  return input.category?.trim() ? input.category.trim() : ACCOUNT_CATEGORY;
};

export const normalizeProductCategories = (input: {
  category?: string;
  categories?: string[];
  name?: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
}) => {
  const explicitCategories = normalizeCategoryList(input.categories?.length ? input.categories : input.category);

  if (explicitCategories.length > 0) {
    return explicitCategories;
  }

  return [inferSingleCategory(input)];
};

export const normalizeProductCategory = (input: {
  category?: string;
  categories?: string[];
  name?: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
}) => normalizeProductCategories(input)[0] ?? ACCOUNT_CATEGORY;

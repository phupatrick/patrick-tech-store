const DEFAULT_SITE_URL = "https://patrick-tech-store.vercel.app";

const normalizeSiteUrl = (value?: string | null) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
};

export const getSiteUrl = () =>
  normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.VERCEL_URL
  );

export const SITE_NAME = "Patrick Tech Store";
export const SITE_TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
export const SITE_DESCRIPTION =
  "Cửa hàng tài khoản số, nâng cấp gói, giao nhanh, bảo hành rõ ràng và hỗ trợ trực tiếp qua Zalo, Telegram hoặc điện thoại.";
export const OFFICIAL_COMPANY_INFO_URL = "https://patricktechmedia.vercel.app/vi/";
export const SITE_KEYWORDS = [
  "Patrick Tech Store",
  "tài khoản số",
  "nâng cấp gói",
  "Grok",
  "AI tools",
  "Canva",
  "YouTube Premium",
  "tra cứu bảo hành"
];

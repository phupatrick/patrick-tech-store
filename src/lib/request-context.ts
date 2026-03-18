import { Language, detectLanguageFromHeaders } from "@/lib/i18n";

type HeaderSource = Pick<Headers, "get">;

type ClientRequestContext = {
  clientIp?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  addressLabel?: string;
  languageHint: Language;
};

const getHeaderValue = (headers: HeaderSource, names: string[]) => {
  for (const name of names) {
    const value = headers.get(name)?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
};

const getFirstIp = (value?: string) => value?.split(",")[0]?.trim() || undefined;

const normalizeCountryCode = (value?: string) => {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || normalized === "XX" || normalized === "UNKNOWN") {
    return undefined;
  }

  return normalized;
};

const buildAddressLabel = ({
  city,
  region,
  countryCode
}: {
  city?: string;
  region?: string;
  countryCode?: string;
}) => {
  const parts = [city, region, countryCode].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : undefined;
};

export const getClientRequestContext = (headers: HeaderSource): ClientRequestContext => {
  const clientIp =
    getFirstIp(getHeaderValue(headers, ["x-forwarded-for", "x-real-ip"])) ||
    getHeaderValue(headers, ["cf-connecting-ip"]);
  const countryCode = normalizeCountryCode(
    getHeaderValue(headers, ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"])
  );
  const region = getHeaderValue(headers, [
    "x-vercel-ip-country-region",
    "cf-region-code",
    "x-region-code"
  ]);
  const city = getHeaderValue(headers, ["x-vercel-ip-city", "cf-ipcity", "x-city"]);
  const acceptLanguage = headers.get("accept-language");

  return {
    clientIp,
    countryCode,
    region,
    city,
    addressLabel: buildAddressLabel({ city, region, countryCode }),
    languageHint: detectLanguageFromHeaders(countryCode, acceptLanguage)
  };
};

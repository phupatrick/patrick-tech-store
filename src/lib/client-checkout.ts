import { Language } from "@/lib/i18n";

const inferCountryCode = () => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone.toUpperCase();

  if (locale.includes("-VN") || timeZone.includes("HO_CHI_MINH") || timeZone.includes("SAIGON")) {
    return "VN";
  }

  return "INTL";
};

export const openCheckoutWindow = async ({
  productId,
  language,
  voucherId,
  contactMethod,
  fallbackError
}: {
  productId: string;
  language: Language;
  voucherId?: string;
  contactMethod?: "zalo" | "telegram" | "whatsapp";
  fallbackError: string;
}) => {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      voucherId,
      contactMethod,
      countryCode: inferCountryCode(),
      language
    })
  });

  const payload = (await response.json().catch(() => ({}))) as {
    redirectUrl?: string;
    error?: string;
  };

  if (!response.ok || !payload.redirectUrl) {
    return {
      ok: false as const,
      error: payload.error || fallbackError
    };
  }

  window.open(payload.redirectUrl, "_blank", "noopener,noreferrer");

  return {
    ok: true as const
  };
};

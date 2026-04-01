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

  const copyPrefilledMessage = async () => {
    try {
      if (!payload.redirectUrl || !navigator?.clipboard?.writeText) {
        return;
      }

      const redirect = new URL(payload.redirectUrl);
      const text = redirect.searchParams.get("text");

      if (!text) {
        return;
      }

      await navigator.clipboard.writeText(text);
    } catch {
      // Best-effort only. If clipboard access is blocked, continue redirect flow.
    }
  };

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  await copyPrefilledMessage();

  if (isMobile) {
    window.location.assign(payload.redirectUrl);
  } else {
    const popup = window.open(payload.redirectUrl, "_blank", "noopener,noreferrer");

    if (!popup) {
      window.location.assign(payload.redirectUrl);
    }
  }

  return {
    ok: true as const
  };
};

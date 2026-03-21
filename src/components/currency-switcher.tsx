"use client";

import { useCurrency } from "@/components/currency-provider";
import { useI18n } from "@/components/i18n-provider";
import { CURRENCIES } from "@/lib/currency";
import { CurrencyCode } from "@/lib/types";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useI18n();
  const label = t("currency.label");

  return (
    <label className="field language-switcher currency-switcher">
      <span className="sr-only">{label}</span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        className="select"
        aria-label={label}
      >
        {CURRENCIES.map((option) => (
          <option key={option} value={option}>
            {option === "USD" ? t("currency.usd") : t("currency.vnd")}
          </option>
        ))}
      </select>
    </label>
  );
}

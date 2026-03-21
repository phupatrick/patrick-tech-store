"use client";

import { applyLanguagePreset } from "@/lib/client-language-preset";
import { useI18n } from "@/components/i18n-provider";
import { LANGUAGES, Language } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { language, t } = useI18n();
  const label = t("language.label");

  return (
    <label className="field language-switcher">
      <span className="sr-only">{label}</span>
      <select
        value={language}
        onChange={(event) => applyLanguagePreset(event.target.value as Language)}
        className="select"
        aria-label={label}
      >
        {LANGUAGES.map((option) => (
          <option key={option} value={option}>
            {option === "en" ? t("language.english") : t("language.vietnamese")}
          </option>
        ))}
      </select>
    </label>
  );
}

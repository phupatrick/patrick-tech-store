import { createTranslator } from "@/lib/i18n";

const ZALO_GROUP_URL = "https://zalo.me/g/kmpeiw236";
const TELEGRAM_GROUP_URL = "https://t.me/PatrichTechMenu";

export function CommunityBubbles({ language }: { language: "vi" | "en" }) {
  const { t } = createTranslator(language);

  return (
    <div className="community-bubbles" aria-label={t("home.community.title")}>
      <a
        href={ZALO_GROUP_URL}
        target="_blank"
        rel="noreferrer"
        className="community-bubble"
        aria-label={t("home.community.floatingZalo")}
        title={t("home.community.floatingZalo")}
      >
        <span className="community-bubble-icon">Z</span>
        <span className="community-bubble-text">{t("home.community.floatingZalo")}</span>
      </a>
      <a
        href={TELEGRAM_GROUP_URL}
        target="_blank"
        rel="noreferrer"
        className="community-bubble"
        aria-label={t("home.community.floatingTelegram")}
        title={t("home.community.floatingTelegram")}
      >
        <span className="community-bubble-icon">T</span>
        <span className="community-bubble-text">{t("home.community.floatingTelegram")}</span>
      </a>
    </div>
  );
}

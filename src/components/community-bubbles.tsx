"use client";

import { useEffect, useState } from "react";

import { createTranslator } from "@/lib/i18n";
import { ContactChannelIcon } from "@/components/contact-channel-icon";

const ZALO_GROUP_URL = "https://zalo.me/g/kmpeiw236";
const TELEGRAM_GROUP_URL = "https://t.me/PatrichTechMenu";

export function CommunityBubbles({ language }: { language: "vi" | "en" }) {
  const { t } = createTranslator(language);
  const [isVisible, setIsVisible] = useState(false);
  const showZalo = language === "vi";

  useEffect(() => {
    const updateVisibility = () => {
      const shouldShow = window.innerWidth >= 768 || window.scrollY > 320;
      setIsVisible(shouldShow);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <div
      className={`community-bubbles${isVisible ? " community-bubbles-visible" : " community-bubbles-hidden"}`}
      aria-label={t("home.community.title")}
    >
      {showZalo ? (
        <a
          href={ZALO_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          className="community-bubble community-bubble-zalo"
          aria-label={t("home.community.floatingZalo")}
          title={t("home.community.floatingZalo")}
        >
          <ContactChannelIcon channel="zalo" />
          <span className="community-bubble-copy">
            <span className="community-bubble-label">Zalo</span>
            <span className="community-bubble-text">{t("home.community.floatingZalo")}</span>
          </span>
        </a>
      ) : null}
      <a
        href={TELEGRAM_GROUP_URL}
        target="_blank"
        rel="noreferrer"
        className="community-bubble community-bubble-telegram"
        aria-label={t("home.community.floatingTelegram")}
        title={t("home.community.floatingTelegram")}
      >
        <ContactChannelIcon channel="telegram" />
        <span className="community-bubble-copy">
          <span className="community-bubble-label">Telegram</span>
          <span className="community-bubble-text">{t("home.community.floatingTelegram")}</span>
        </span>
      </a>
    </div>
  );
}

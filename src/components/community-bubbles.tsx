"use client";

import { useEffect, useState } from "react";

import { ContactChannelIcon } from "@/components/contact-channel-icon";
import {
  DIRECT_PHONE_TEL_URL,
  TELEGRAM_DIRECT_URL,
  WHATSAPP_DIRECT_URL,
  ZALO_DIRECT_URL
} from "@/lib/contact-links";
import { createTranslator } from "@/lib/i18n";

export function CommunityBubbles({ language }: { language: "vi" | "en" }) {
  const { t } = createTranslator(language);
  const [isVisible, setIsVisible] = useState(false);
  const showZalo = language === "vi";
  const showPhone = language === "vi";
  const showWhatsapp = language === "en";
  const zaloTitle = language === "vi" ? "Nhắn Zalo" : "Message on Zalo";
  const telegramTitle = language === "vi" ? "Nhắn Telegram" : "Message on Telegram";
  const phoneTitle = language === "vi" ? "Gọi trực tiếp" : "Call now";
  const whatsappTitle = language === "vi" ? "Nhắn WhatsApp" : "Message on WhatsApp";

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
          href={ZALO_DIRECT_URL}
          target="_blank"
          rel="noreferrer"
          className="community-bubble community-bubble-zalo"
          aria-label={zaloTitle}
          title={zaloTitle}
        >
          <ContactChannelIcon channel="zalo" />
          <span className="community-bubble-copy">
            <span className="community-bubble-label">Zalo</span>
            <span className="community-bubble-text">{zaloTitle}</span>
          </span>
        </a>
      ) : null}
      {showPhone ? (
        <a
          href={DIRECT_PHONE_TEL_URL}
          className="community-bubble community-bubble-phone"
          aria-label={phoneTitle}
          title={phoneTitle}
        >
          <ContactChannelIcon channel="phone" />
          <span className="community-bubble-copy">
            <span className="community-bubble-label">{t("home.contact.call")}</span>
            <span className="community-bubble-text">{phoneTitle}</span>
          </span>
        </a>
      ) : null}
      {!showZalo ? (
        <a
          href={TELEGRAM_DIRECT_URL}
          target="_blank"
          rel="noreferrer"
          className="community-bubble community-bubble-telegram"
          aria-label={telegramTitle}
          title={telegramTitle}
        >
          <ContactChannelIcon channel="telegram" />
          <span className="community-bubble-copy">
            <span className="community-bubble-label">Telegram</span>
            <span className="community-bubble-text">{telegramTitle}</span>
          </span>
        </a>
      ) : null}
      {showWhatsapp ? (
        <a
          href={WHATSAPP_DIRECT_URL}
          target="_blank"
          rel="noreferrer"
          className="community-bubble community-bubble-whatsapp"
          aria-label={whatsappTitle}
          title={whatsappTitle}
        >
          <ContactChannelIcon channel="whatsapp" />
          <span className="community-bubble-copy">
            <span className="community-bubble-label">{t("home.contact.whatsapp")}</span>
            <span className="community-bubble-text">{whatsappTitle}</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}

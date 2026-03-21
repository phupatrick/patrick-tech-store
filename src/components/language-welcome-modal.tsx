"use client";

import { useEffect, useState } from "react";

import { ContactChannelIcon } from "@/components/contact-channel-icon";
import { applyLanguagePreset, hasStoredLanguagePreference } from "@/lib/client-language-preset";

const WELCOME_KICKER = "Welcome / Ch\u00e0o m\u1eebng";
const WELCOME_TITLE = "Ch\u1ecdn ng\u00f4n ng\u1eef / Choose your language";
const WELCOME_DESCRIPTION =
  "Ti\u1ebfng Vi\u1ec7t s\u1ebd d\u00f9ng VND v\u00e0 hi\u1ec7n Zalo + G\u1ecdi tr\u1ef1c ti\u1ebfp. English will use USD and show Telegram + WhatsApp.";
const VIETNAMESE_LABEL = "Ti\u1ebfng Vi\u1ec7t";
const VIETNAMESE_COPY = "VND + Zalo + G\u1ecdi tr\u1ef1c ti\u1ebfp";
const ENGLISH_COPY = "USD + Telegram + WhatsApp";

export function LanguageWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const forceOpen = searchParams.get("welcome") === "1";
    setIsOpen(forceOpen || !hasStoredLanguagePreference());
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="welcome-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-language-title">
      <div className="welcome-modal-card">
        <p className="eyebrow">{WELCOME_KICKER}</p>
        <h2 id="welcome-language-title" className="section-title">
          {WELCOME_TITLE}
        </h2>
        <p className="muted welcome-modal-description">{WELCOME_DESCRIPTION}</p>

        <div className="welcome-modal-actions">
          <button type="button" className="welcome-choice-card" onClick={() => applyLanguagePreset("vi")}>
            <span className="welcome-choice-title">{VIETNAMESE_LABEL}</span>
            <span className="welcome-choice-copy">{VIETNAMESE_COPY}</span>
            <span className="welcome-choice-tags" aria-hidden="true">
              <span className="welcome-choice-tag">
                <ContactChannelIcon channel="zalo" className="contact-icon-inline" />
                Zalo
              </span>
              <span className="welcome-choice-tag">
                <ContactChannelIcon channel="phone" className="contact-icon-inline" />
                Call
              </span>
            </span>
          </button>

          <button
            type="button"
            className="welcome-choice-card welcome-choice-card-english"
            onClick={() => applyLanguagePreset("en")}
          >
            <span className="welcome-choice-title">English</span>
            <span className="welcome-choice-copy">{ENGLISH_COPY}</span>
            <span className="welcome-choice-tags" aria-hidden="true">
              <span className="welcome-choice-tag">
                <ContactChannelIcon channel="telegram" className="contact-icon-inline" />
                Telegram
              </span>
              <span className="welcome-choice-tag">
                <ContactChannelIcon channel="whatsapp" className="contact-icon-inline" />
                WhatsApp
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

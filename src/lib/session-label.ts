import { TranslationKey } from "@/lib/i18n";
import { AuthSession } from "@/lib/types";

type Translate = (key: TranslationKey) => string;

export const getLocalizedSessionLabel = (session: AuthSession, translate: Translate) => {
  if (session.fixed) {
    return translate("admin.fixedAccountLabel");
  }

  if (session.role === "customer" || session.role === "reseller") {
    const codeSuffix = session.label.match(/([A-Z0-9-]+)$/i)?.[1];

    if (codeSuffix) {
      return `${translate(`admin.accessCodes.role.${session.role}` as TranslationKey)} ${codeSuffix}`;
    }
  }

  return session.label;
};

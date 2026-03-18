import { cookies } from "next/headers";

import { CURRENCY_COOKIE_NAME, resolveCurrencyCode } from "@/lib/currency";
import { Language } from "@/lib/i18n";
import { CurrencyCode } from "@/lib/types";

export const getRequestCurrency = async (language: Language): Promise<CurrencyCode> => {
  const cookieStore = await cookies();
  return resolveCurrencyCode(language, cookieStore.get(CURRENCY_COOKIE_NAME)?.value);
};

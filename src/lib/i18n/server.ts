import { cookies, headers } from "next/headers";

import { isLanguage, LANGUAGE_COOKIE_NAME, Language } from "@/lib/i18n";
import { getClientRequestContext } from "@/lib/request-context";

export const getRequestLanguage = async (): Promise<Language> => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;

  if (isLanguage(cookieValue)) {
    return cookieValue;
  }

  const headerStore = await headers();
  return getClientRequestContext(headerStore).languageHint;
};

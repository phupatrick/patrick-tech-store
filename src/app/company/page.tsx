import { redirect } from "next/navigation";

import { OFFICIAL_COMPANY_INFO_URL } from "@/lib/site";

export default function CompanyPage() {
  redirect(OFFICIAL_COMPANY_INFO_URL);
}

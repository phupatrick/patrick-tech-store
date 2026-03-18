import { AccessRole, ResellerTier } from "@/lib/types";

export type AccessCodeFormValues = {
  code: string;
  label: string;
  role: AccessRole;
  tier: ResellerTier;
  points: string;
  active: boolean;
};

export type AccessCodeFormState = {
  error?: string;
  values: AccessCodeFormValues;
};

export const emptyAccessCodeFormValues: AccessCodeFormValues = {
  code: "",
  label: "",
  role: "customer",
  tier: "regular",
  points: "0",
  active: true
};

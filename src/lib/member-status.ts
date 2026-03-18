import { TranslationKey } from "@/lib/i18n";
import { AccessRole, AuthSession } from "@/lib/types";

export const VIP_POINTS_THRESHOLD = 10000;

type SessionLike = Pick<AuthSession, "role" | "points" | "vip"> | undefined;
type MemberTierLike = Pick<AuthSession, "tier" | "vip"> | undefined;

export const isVipEligibleRole = (role?: AccessRole) => role === "customer" || role === "reseller";

export const isVipMember = (session?: SessionLike) =>
  Boolean(session && isVipEligibleRole(session.role) && session.vip);

export const getPointsToVip = (points: number) => Math.max(0, VIP_POINTS_THRESHOLD - points);

export const canRedeemVipUpgrade = (session?: SessionLike) =>
  Boolean(session && isVipEligibleRole(session.role) && !session.vip && session.points >= VIP_POINTS_THRESHOLD);

export const getMemberRoleKey = (session?: SessionLike): TranslationKey => {
  if (!session) {
    return "role.user.guest";
  }

  if (session.role === "customer") {
    return isVipMember(session) ? "member.customerVip" : "member.customerRegular";
  }

  if (session.role === "reseller") {
    return isVipMember(session) ? "member.resellerVip" : "member.resellerRegular";
  }

  return `admin.accessCodes.role.${session.role}` as TranslationKey;
};

export const getMemberTierKey = (session?: MemberTierLike): TranslationKey => {
  if (!session) {
    return "tier.guest";
  }

  return session.vip ? "tier.vip" : (`tier.${session.tier}` as TranslationKey);
};

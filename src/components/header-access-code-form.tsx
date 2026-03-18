"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { LoginFormState } from "@/app/admin/login/actions";
import { useI18n } from "@/components/i18n-provider";
import { VIP_POINTS_THRESHOLD, getMemberRoleKey, getMemberTierKey, getPointsToVip, isVipMember } from "@/lib/member-status";
import { getLocalizedSessionLabel } from "@/lib/session-label";
import type { AuthSession } from "@/lib/types";

type HeaderAccessCodeFormProps = {
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  session?: AuthSession;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="button button-primary header-login-button" disabled={pending}>
      {pending ? t("admin.login.pending") : t("admin.login.submit")}
    </button>
  );
}

export function HeaderAccessCodeForm({ action, session }: HeaderAccessCodeFormProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, { code: "" });
  const shouldShowTier = Boolean(session && (session.role === "reseller" || session.role === "customer"));
  const roleLabel = session ? t(getMemberRoleKey(session)) : "";
  const sessionLabel = session ? getLocalizedSessionLabel(session, t) : "";
  const pointsToVip = session ? getPointsToVip(session.points) : VIP_POINTS_THRESHOLD;
  const hasVipStatus = session ? isVipMember(session) : false;
  const tierLabel = session ? t(getMemberTierKey(session)) : "";

  if (session) {
    return (
      <div className="header-admin-state">
        <div className="header-user-meta">
          <span className="pill header-admin-pill">{sessionLabel}</span>
          <span className="header-role-text">
            {t("admin.accessCodes.form.role")}: <span className={hasVipStatus ? "vip-text" : undefined}>{roleLabel}</span>
          </span>
          {shouldShowTier ? (
            <>
              <span className="header-role-text">
                {t("reseller.account.tier")}:{" "}
                <span className={hasVipStatus ? "vip-text" : undefined}>{tierLabel}</span> /{" "}
                {t("admin.userControls.points")}: {session.points}
              </span>
              <span className="header-role-text">
                {hasVipStatus ? <span className="vip-text">{t("member.vipUnlocked")}</span> : t("member.pointsToVip", { points: pointsToVip })}
              </span>
            </>
          ) : null}
        </div>
        {shouldShowTier ? (
          <Link href="/vouchers" className="button">
            {t("voucher.nav")}
          </Link>
        ) : null}
        <form action="/admin/logout" method="post">
          <input type="hidden" name="next" value={pathname || "/"} />
          <button type="submit" className="button header-logout-button">
            {t("admin.session.signOut")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="header-access-form">
      <input type="hidden" name="next" value={pathname || "/"} />
      <label className="sr-only" htmlFor="header-access-code">
        {t("admin.login.field.code")}
      </label>
      <input
        id="header-access-code"
        name="code"
        type="text"
        defaultValue={state.code}
        className="input header-access-input"
        placeholder={t("admin.accessCodes.form.placeholderCode")}
        autoComplete="one-time-code"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <SubmitButton />
      {state.error ? <p className="header-login-error">{state.error}</p> : null}
    </form>
  );
}

import { redirect } from "next/navigation";

import { redeemVoucherAction } from "@/app/vouchers/actions";
import { getAuthSession } from "@/lib/auth";
import { formatCurrency, getCurrencySettings } from "@/lib/currency";
import { createTranslator } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n/server";
import { getMemberRoleKey, getMemberTierKey, isVipMember } from "@/lib/member-status";
import { getLocalizedSessionLabel } from "@/lib/session-label";
import { VoucherDefinitionId } from "@/lib/types";
import { listVoucherDefinitions } from "@/lib/vouchers";
import { getVoucherWalletForSession } from "@/lib/voucher-wallet";

type VoucherPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

const DISCOUNT_VOUCHER_IDS: VoucherDefinitionId[] = ["discount_10000", "discount_20000", "discount_50000"];

const getNoticeKey = (notice?: string) => {
  switch (notice) {
    case "vip-redeemed":
      return "voucher.notice.vipRedeemed";
    case "voucher-redeemed":
      return "voucher.notice.discountRedeemed";
    case "not-enough-points":
      return "voucher.notice.notEnoughPoints";
    case "vip-unavailable":
      return "voucher.notice.vipUnavailable";
    case "forbidden":
      return "voucher.notice.forbidden";
    default:
      return undefined;
  }
};

export default async function VoucherPage({ searchParams }: VoucherPageProps) {
  const language = await getRequestLanguage();
  const currencySettings = await getCurrencySettings(language);
  const { t } = createTranslator(language);
  const session = await getAuthSession();

  if (!session || !["customer", "reseller"].includes(session.role)) {
    redirect("/");
  }

  const wallet = getVoucherWalletForSession(session);

  if (!wallet) {
    redirect("/");
  }

  const { notice } = await searchParams;
  const noticeKey = getNoticeKey(notice);
  const sessionLabel = getLocalizedSessionLabel(session, t);
  const voucherDefinitions = listVoucherDefinitions();
  const vipActive = isVipMember(session);

  return (
    <main className="page-stack">
      <section className="hero hero-copy">
        <p className="eyebrow">{t("voucher.hero.eyebrow")}</p>
        <h1 className="page-title">{t("voucher.hero.title")}</h1>
        <p className="lead">{t("voucher.hero.description")}</p>
      </section>

      <section className="surface voucher-summary">
        <div>
          <p className="eyebrow">{t("voucher.summary.account")}</p>
          <p className="card-title">{sessionLabel}</p>
          <p className="muted">
            <span className={vipActive ? "vip-text" : undefined}>{t(getMemberRoleKey(session))}</span> /{" "}
            <span className={vipActive ? "vip-text" : undefined}>{t(getMemberTierKey(session))}</span>
          </p>
        </div>
        <div className="voucher-summary-stats">
          <div className="detail-card">
            <p className="eyebrow">{t("voucher.summary.points")}</p>
            <p className="price">{wallet.record.points}</p>
          </div>
          <div className="detail-card">
            <p className="eyebrow">{t("voucher.summary.vip")}</p>
            <p className={`card-title${wallet.record.vip ? " vip-text" : ""}`}>
              {wallet.record.vip ? t("voucher.vip.active") : t("voucher.vip.inactive")}
            </p>
          </div>
          <div className="detail-card">
            <p className="eyebrow">{t("voucher.summary.available")}</p>
            <p className="price">{wallet.activeDiscountVouchers.filter((voucher) => !voucher.usedAt).length}</p>
          </div>
        </div>
      </section>

      {noticeKey ? <div className="notice">{t(noticeKey as never)}</div> : null}

      <section className="surface page-stack">
        <div className="section-head">
          <div>
            <h2 className="section-title">{t("voucher.redeem.title")}</h2>
            <p className="muted">{t("voucher.redeem.description")}</p>
          </div>
        </div>

        <div className="voucher-grid">
          {wallet.canRedeemVip ? (
            <form action={redeemVoucherAction.bind(null, "vip_upgrade")} className="voucher-card">
              <p className="card-title vip-text">{t("voucher.def.vip_upgrade.name")}</p>
              <p className="muted">{t("voucher.def.vip_upgrade.description")}</p>
              <p className="voucher-meta">{t("voucher.cost.points", { points: 10000 })}</p>
              <button type="submit" className="button button-primary">
                {t("voucher.redeem.action")}
              </button>
            </form>
          ) : (
            <div className="voucher-card voucher-card-muted">
              <p className="card-title vip-text">{t("voucher.def.vip_upgrade.name")}</p>
              <p className="muted">{t("voucher.def.vip_upgrade.description")}</p>
              <p className="voucher-meta">{t("voucher.cost.points", { points: 10000 })}</p>
              <p className="muted">
                {wallet.record.vip ? <span className="vip-text">{t("voucher.vip.active")}</span> : t("voucher.vip.requirements", { points: wallet.record.points })}
              </p>
            </div>
          )}

          {DISCOUNT_VOUCHER_IDS.map((definitionId) => {
            const definition = voucherDefinitions.find((item) => item.id === definitionId);

            if (!definition?.discountAmount || !definition.minOrderAmount) {
              return null;
            }

            const canRedeem = wallet.record.points >= definition.pointCost;

            return canRedeem ? (
              <form key={definitionId} action={redeemVoucherAction.bind(null, definitionId)} className="voucher-card">
                <p className="card-title">{t(`voucher.def.${definitionId}.name` as never)}</p>
                <p className="muted">{t(`voucher.def.${definitionId}.description` as never)}</p>
                <p className="voucher-meta">{t("voucher.cost.points", { points: definition.pointCost })}</p>
                <p className="voucher-meta">
                  {t("voucher.minimumOrder", { amount: formatCurrency(definition.minOrderAmount, currencySettings) })}
                </p>
                <button type="submit" className="button button-primary">
                  {t("voucher.redeem.action")}
                </button>
              </form>
            ) : (
              <div key={definitionId} className="voucher-card voucher-card-muted">
                <p className="card-title">{t(`voucher.def.${definitionId}.name` as never)}</p>
                <p className="muted">{t(`voucher.def.${definitionId}.description` as never)}</p>
                <p className="voucher-meta">{t("voucher.cost.points", { points: definition.pointCost })}</p>
                <p className="voucher-meta">
                  {t("voucher.minimumOrder", { amount: formatCurrency(definition.minOrderAmount, currencySettings) })}
                </p>
                <p className="muted">{t("voucher.redeem.notEnoughPoints")}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface page-stack">
        <div className="section-head">
          <div>
            <h2 className="section-title">{t("voucher.wallet.title")}</h2>
            <p className="muted">{t("voucher.wallet.description")}</p>
          </div>
        </div>

        {wallet.ownedVouchers.length > 0 ? (
          <div className="voucher-grid">
            {wallet.ownedVouchers.map((voucher) => (
              <div key={voucher.id} className="voucher-card">
                <p className="card-title">{t(`voucher.def.${voucher.definitionId}.name` as never)}</p>
                <p className="muted">{t(`voucher.def.${voucher.definitionId}.description` as never)}</p>
                <p className="voucher-meta">
                  {voucher.usedAt
                    ? t("voucher.status.used")
                    : voucher.reservedUntil
                      ? t("voucher.status.reservedUntil", {
                          date: new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short"
                          }).format(new Date(voucher.reservedUntil))
                        })
                      : t("voucher.status.active")}
                </p>
                {!voucher.usedAt ? (
                  <p className="muted">
                    {t("voucher.wallet.readyToUse")}
                  </p>
                ) : null}
                <p className="voucher-code">{voucher.id.slice(0, 8).toUpperCase()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="notice">{t("voucher.wallet.empty")}</div>
        )}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type SiteHeaderProps = {
  brandKicker: string;
  brandTitle: string;
  storeLabel: string;
  warrantyLabel: string;
  resellerLabel: string;
  adminLabel: string;
  showAdminLink: boolean;
  children: ReactNode;
};

export function SiteHeader({
  brandKicker,
  brandTitle,
  storeLabel,
  warrantyLabel,
  resellerLabel,
  adminLabel,
  showAdminLink,
  children
}: SiteHeaderProps) {
  const pathname = usePathname();
  const showReseller = pathname.startsWith("/reseller");
  const showAdmin = pathname.startsWith("/admin") || showAdminLink;

  return (
    <header className="site-header">
      <div className="brand-block">
        <Link className="brand-link" href="/">
          <p className="brand-kicker">{brandKicker}</p>
          <p className="brand-title">{brandTitle}</p>
        </Link>
      </div>
      <div className="header-actions">
        <nav className="nav-links">
          <Link className={`nav-link${pathname === "/" ? " active" : ""}`} href="/">
            {storeLabel}
          </Link>
          <Link className={`nav-link${pathname === "/warranty" ? " active" : ""}`} href="/warranty">
            {warrantyLabel}
          </Link>
          {showReseller ? (
            <Link className="nav-link active" href="/reseller">
              {resellerLabel}
            </Link>
          ) : null}
          {showAdmin ? (
            <Link className={`nav-link${pathname.startsWith("/admin") ? " active" : ""}`} href="/admin">
              {adminLabel}
            </Link>
          ) : null}
        </nav>
        <div className="header-tools">{children}</div>
      </div>
    </header>
  );
}

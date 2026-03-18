"use client";

import { FormEvent, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { OrderStatus } from "@/lib/types";

type WarrantyResult = {
  id: string;
  name: string;
  content: string;
  phone?: string;
  warrantyCode?: string;
  purchaseDate: string;
  warrantyUntil: string;
  status: OrderStatus;
};

export function WarrantySearch() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WarrantyResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/warranty?query=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as { results: WarrantyResult[] };
      setResults(payload.results);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <form onSubmit={onSubmit} className="search-form">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("warranty.search.placeholder")}
          className="input"
        />
        <button type="submit" disabled={!query || loading} className="button">
          {loading ? t("warranty.search.loading") : t("warranty.search.submit")}
        </button>
      </form>

      {searched && (
        <div className="result-list">
          {results.length > 0 ? (
            results.map((result) => (
              <article key={result.id} className="result-card">
                <div className="row">
                  <div>
                    <h3 className="card-title">{result.name}</h3>
                    <p className="muted">
                      {t("warranty.result.order", { id: result.id })}
                      {result.warrantyCode ? ` / ${t("warranty.result.code", { code: result.warrantyCode })}` : ""}
                    </p>
                  </div>
                  <span className="pill">{t(`warranty.status.${result.status}` as const)}</span>
                </div>
                <div className="lookup-grid">
                  {result.phone ? <p>{t("warranty.result.phone", { phone: result.phone })}</p> : null}
                  <p>{t("warranty.result.purchased", { date: result.purchaseDate })}</p>
                  <p>{t("warranty.result.validUntil", { date: result.warrantyUntil })}</p>
                </div>
                <div className="detail-copy-block">
                  <p className="detail-copy-label">{t("warranty.result.content")}</p>
                  <div className="detail-description">{result.content}</div>
                </div>
              </article>
            ))
          ) : (
            <div className="notice">{t("warranty.result.empty")}</div>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";

import { createTranslator, Language } from "@/lib/i18n";

type CatalogControlsProps = {
  language: Language;
  categories: string[];
  initialQuery: string;
  initialCategory: string;
  initialSort: string;
};

const buildCatalogHref = ({
  query,
  category,
  sort
}: {
  query?: string;
  category?: string;
  sort?: string;
}) => {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (category) {
    params.set("category", category);
  }

  if (sort && sort !== "relevant") {
    params.set("sort", sort);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
};

export function CatalogControls({
  language,
  categories,
  initialQuery,
  initialCategory,
  initialSort
}: CatalogControlsProps) {
  const { t } = createTranslator(language);

  return (
    <div className="catalog-controls">
      <form action="/" method="get" className="catalog-search-form">
        <label className="field catalog-search">
          <span className="field-label">{t("home.catalog.search")}</span>
          <input
            name="q"
            defaultValue={initialQuery}
            className="input"
            placeholder={t("home.catalog.searchPlaceholder")}
          />
        </label>

        <div className="catalog-form-actions">
          <label className="field catalog-sort">
            <span className="field-label">{t("home.catalog.sort")}</span>
            <select name="sort" defaultValue={initialSort} className="select">
              <option value="relevant">{t("home.catalog.sort.relevant")}</option>
              <option value="price-asc">{t("home.catalog.sort.lowToHigh")}</option>
              <option value="price-desc">{t("home.catalog.sort.highToLow")}</option>
              <option value="newest">{t("home.catalog.sort.newest")}</option>
            </select>
          </label>
          {initialCategory ? <input type="hidden" name="category" value={initialCategory} /> : null}
          <button type="submit" className="button button-primary catalog-submit">
            {t("home.catalog.apply")}
          </button>
          {initialQuery || initialCategory || initialSort !== "relevant" ? (
            <Link href="/" className="button">
              {t("home.catalog.clear")}
            </Link>
          ) : null}
        </div>
      </form>

      <div className="catalog-categories">
        <span className="field-label">{t("home.catalog.category")}</span>
        <div className="filter-chip-row">
          <Link
            href={buildCatalogHref({ query: initialQuery, sort: initialSort })}
            className={`filter-chip${!initialCategory ? " active" : ""}`}
            aria-current={!initialCategory ? "page" : undefined}
          >
            {t("home.catalog.all")}
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={buildCatalogHref({ query: initialQuery, category, sort: initialSort })}
              className={`filter-chip${initialCategory === category ? " active" : ""}`}
              aria-current={initialCategory === category ? "page" : undefined}
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

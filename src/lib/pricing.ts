import { users } from "@/lib/data";
import { Language, translate } from "@/lib/i18n";
import { getMemberTierKey } from "@/lib/member-status";
import { normalizeText } from "@/lib/product-categories";
import { getLocalizedProductCopy, getLocalizedUsageDuration } from "@/lib/product-localization";
import { getProductById, listProducts } from "@/lib/product-store";
import { AuthSession, Product, ProductView, ResellerTier, User } from "@/lib/types";

type PublicPricingSession = Pick<AuthSession, "role" | "tier" | "points" | "vip">;
type StorefrontSnapshotOptions = {
  language: Language;
  query?: string;
  category?: string;
  sort?: string;
  session?: PublicPricingSession;
};
type PreparedPublicProduct = {
  view: ProductView;
  searchPayload: ReturnType<typeof getProductSearchPayload>;
  categories: string[];
};

export const getUserById = (userId?: string | null): User | undefined =>
  users.find((user) => user.id === userId);

export const computeVisiblePrice = (product: Product, tier: ResellerTier, user?: User) => {
  const override = (user && user.overridePriceMap[product.id]) || (user && product.overridePrices[user.id]);

  if (override) {
    return { price: override, label: "Special reseller price" };
  }

  if (tier === "guest") {
    return { price: product.retailPrice, label: "Retail price" };
  }

  return {
    price: product.tierPrices.regular,
    label: "Regular reseller"
  };
};

const computePublicVisiblePrice = (product: Product, session?: PublicPricingSession) => {
  if (!session || session.role === "admin" || session.role === "deputy_admin" || session.role === "staff") {
    return { price: product.retailPrice, label: "Retail price" };
  }

  if (session.role === "customer") {
    if (session.tier === "guest") {
      return { price: product.retailPrice, label: "Retail price" };
    }

    return {
      price: session.vip ? product.customerTierPrices.vip : product.customerTierPrices.regular,
      label: session.vip ? "VIP customer" : "Regular customer"
    };
  }

  if (session.role === "reseller") {
    if (session.tier === "guest") {
      return { price: product.retailPrice, label: "Retail price" };
    }

    return {
      price: session.vip ? product.tierPrices.vip : product.tierPrices.regular,
      label: session.vip ? "VIP reseller" : "Regular reseller"
    };
  }

  return { price: product.retailPrice, label: "Retail price" };
};

const getPricingLabel = (language: Language, product: Product, tier: ResellerTier, user?: User) => {
  const override = (user && user.overridePriceMap[product.id]) || (user && product.overridePrices[user.id]);

  if (override) {
    return translate(language, "pricing.label.special");
  }

  if (tier === "guest") {
    return translate(language, "pricing.label.retail");
  }

  return translate(language, "pricing.label.tier", {
    tier: translate(language, getMemberTierKey({ tier, vip: false }))
  });
};

const getProductSearchPayload = (product: Product) => {
  const localizedCopies = Object.values(product.translations ?? {});
  const categoryAliases = [
    product.category,
    ...(product.categories ?? []),
    ...localizedCopies.flatMap((copy) => [copy?.category, ...(copy?.categories ?? [])])
  ].filter(Boolean);

  const textAliases = [
    product.name,
    product.shortDescription,
    product.fullDescription,
    ...localizedCopies.flatMap((copy) => [copy?.name, copy?.shortDescription, copy?.fullDescription])
  ].filter(Boolean);

  return {
    categoryAliases,
    normalizedCategoryAliases: categoryAliases.map((item) => normalizeText(item)),
    searchHaystack: normalizeText([...textAliases, ...categoryAliases].join(" "))
  };
};

export const buildProductView = (
  product: Product,
  tier: ResellerTier,
  language: Language,
  user?: User
): ProductView => {
  const visible = computeVisiblePrice(product, tier, user);
  const localized = getLocalizedProductCopy(product, language);

  return {
    id: product.id,
    slug: product.slug,
    name: localized.name,
    shortDescription: localized.shortDescription,
    fullDescription: localized.fullDescription,
    usageDuration: getLocalizedUsageDuration(product.usageDuration, language),
    image: product.image,
    retailPrice: product.retailPrice,
    customerRegularPrice: product.customerTierPrices.regular,
    visiblePrice: visible.price,
    label: tier === "guest" ? undefined : getPricingLabel(language, product, tier, user),
    stock: product.stock,
    warrantyMonths: product.warrantyMonths,
    points: product.points,
    category: localized.category,
    categories: localized.categories,
    featured: product.featured,
    isFlashSale: product.isFlashSale,
    flashSaleLabel: localized.flashSaleLabel,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};

const buildPublicProductView = (product: Product, language: Language, session?: PublicPricingSession): ProductView => {
  const visible = computePublicVisiblePrice(product, session);
  const localized = getLocalizedProductCopy(product, language);

  return {
    id: product.id,
    slug: product.slug,
    name: localized.name,
    shortDescription: localized.shortDescription,
    fullDescription: localized.fullDescription,
    usageDuration: getLocalizedUsageDuration(product.usageDuration, language),
    image: product.image,
    retailPrice: product.retailPrice,
    customerRegularPrice: product.customerTierPrices.regular,
    visiblePrice: visible.price,
    label: undefined,
    stock: product.stock,
    warrantyMonths: product.warrantyMonths,
    points: product.points,
    category: localized.category,
    categories: localized.categories,
    featured: product.featured,
    isFlashSale: product.isFlashSale,
    flashSaleLabel: localized.flashSaleLabel,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
};

const getViewCategories = (product: Pick<ProductView, "category" | "categories">) =>
  product.categories ?? (product.category ? [product.category] : []);

const sortPublicProducts = (products: ProductView[], sort: string | undefined, language: Language) => {
  const sortedProducts = [...products];

  switch (sort) {
    case "price-asc":
      sortedProducts.sort((left, right) => left.visiblePrice - right.visiblePrice);
      break;
    case "price-desc":
      sortedProducts.sort((left, right) => right.visiblePrice - left.visiblePrice);
      break;
    case "newest":
      sortedProducts.sort((left, right) => {
        const rightDate = Date.parse(right.updatedAt ?? right.createdAt ?? "");
        const leftDate = Date.parse(left.updatedAt ?? left.createdAt ?? "");
        return rightDate - leftDate;
      });
      break;
    default:
      sortedProducts.sort((left, right) => {
        if (left.featured !== right.featured) {
          return Number(right.featured) - Number(left.featured);
        }

        if (left.isFlashSale !== right.isFlashSale) {
          return Number(right.isFlashSale) - Number(left.isFlashSale);
        }

        return left.name.localeCompare(right.name, language === "en" ? "en" : "vi");
      });
  }

  return sortedProducts;
};

const getPreparedPublicProducts = (language: Language, session?: PublicPricingSession): PreparedPublicProduct[] =>
  listProducts()
    .filter((product) => product.published)
    .map((product) => {
      const view = buildPublicProductView(product, language, session);
      return {
        view,
        searchPayload: getProductSearchPayload(product),
        categories: getViewCategories(view).map((category) => category.trim()).filter(Boolean)
      };
    });

export const getPublicProductView = (product: Product, language: Language, session?: PublicPricingSession) =>
  buildPublicProductView(product, language, session);

export const getVisibleProducts = (userId?: string | null, forcedTier?: ResellerTier, language: Language = "en") => {
  const user = getUserById(userId);
  const tier = forcedTier || user?.tier || "guest";
  const products = listProducts().filter((product) => (tier === "guest" ? product.published : true));

  return products.map((product) => buildProductView(product, tier, language, user));
};

export const getAdminSnapshot = () => ({
  products: listProducts(),
  users,
  pricingPreview: listProducts().map((product) => ({
    id: product.id,
    name: product.name,
    retailPrice: product.retailPrice,
    customerVip: product.customerTierPrices.vip,
    resellerRegular: product.tierPrices.regular,
    resellerVip: product.tierPrices.vip,
    overrides: product.overridePrices
  }))
});

export const getProductNameById = (productId: string) => getProductById(productId)?.name ?? "Archived product";

export const getStorefrontSnapshot = ({ language, query, category, sort, session }: StorefrontSnapshotOptions) => {
  const normalizedQuery = normalizeText(query);
  const normalizedCategory = normalizeText(category);
  const preparedProducts = getPreparedPublicProducts(language, session);
  const categorySet = new Set<string>();
  const filteredProducts: PreparedPublicProduct[] = [];
  const featuredSource: PreparedPublicProduct[] = [];
  const flashSaleSource: PreparedPublicProduct[] = [];

  preparedProducts.forEach((product) => {
    product.categories.forEach((item) => categorySet.add(item));

    if (product.view.featured) {
      featuredSource.push(product);
    }

    if (product.view.isFlashSale) {
      flashSaleSource.push(product);
    }

    const matchesQuery = normalizedQuery ? product.searchPayload.searchHaystack.includes(normalizedQuery) : true;
    const matchesCategory = normalizedCategory
      ? product.searchPayload.normalizedCategoryAliases.includes(normalizedCategory)
      : true;

    if (matchesQuery && matchesCategory) {
      filteredProducts.push(product);
    }
  });

  const categories = Array.from(categorySet).sort((left, right) =>
    left.localeCompare(right, language === "en" ? "en" : "vi")
  );
  const featuredProducts = (featuredSource.length > 0 ? featuredSource : preparedProducts)
    .slice(0, 4)
    .map((product) => product.view);
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const flashSaleProducts = flashSaleSource
    .filter((product) => !featuredIds.has(product.view.id))
    .slice(0, 4)
    .map((product) => product.view);
  const catalogProducts = sortPublicProducts(
    filteredProducts.map((product) => product.view),
    sort,
    language
  );

  return {
    categories,
    featuredProducts,
    flashSaleProducts,
    catalogProducts
  };
};

export const getPublicCategories = (language: Language, session?: PublicPricingSession) =>
  getStorefrontSnapshot({ language, session }).categories;

export const getFeaturedProducts = (language: Language, session?: PublicPricingSession) =>
  getStorefrontSnapshot({ language, session }).featuredProducts;

export const getFlashSaleProducts = (language: Language, session?: PublicPricingSession) =>
  getStorefrontSnapshot({ language, session }).flashSaleProducts;

export const getFilteredPublicProducts = ({
  language,
  query,
  category,
  sort,
  session
}: StorefrontSnapshotOptions) =>
  getStorefrontSnapshot({ language, query, category, sort, session }).catalogProducts;

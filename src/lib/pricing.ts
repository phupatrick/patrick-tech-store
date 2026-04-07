import { users } from "@/lib/data";
import {
  CurrencySettings,
  convertDisplayAmountToVnd,
  convertVndToDisplayAmount,
  getCurrencySettings,
  roundCurrencyAmount
} from "@/lib/currency";
import { getForeignPricingOverride } from "@/lib/foreign-pricing";
import { Language, translate } from "@/lib/i18n";
import { getMemberTierKey } from "@/lib/member-status";
import { normalizeText } from "@/lib/product-categories";
import { getLocalizedProductCopy, getLocalizedUsageDuration, getLocalizedWarrantyDuration } from "@/lib/product-localization";
import { getDisplayPriceSet, getStoredPriceSetForCurrency } from "@/lib/product-pricing";
import { getProductById, listProducts } from "@/lib/product-store";
import { AuthSession, CurrencyCode, Product, ProductPriceSet, ProductView, ResellerTier, User } from "@/lib/types";

type PublicPricingSession = Pick<AuthSession, "subject" | "role" | "tier" | "points" | "vip">;
type StorefrontSnapshotOptions = {
  language: Language;
  currency?: CurrencyCode;
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
const FOREIGN_CUSTOMER_MIN_PREMIUM_PERCENT = 5;

const PUBLIC_HIDDEN_PRODUCT_KEYWORDS = ["chatgpt"];
const GROK_CATEGORY_KEYWORD = normalizeText("Grok");

const PRIORITY_PRODUCT_KEYWORDS = ["gemini", "grok", "capcut"] as const;

export const getUserById = (userId?: string | null): User | undefined =>
  users.find((user) => user.id === userId);

const computeVisiblePriceFromSet = (priceSet: ProductPriceSet, tier: ResellerTier) => {
  if (tier === "guest") {
    return priceSet.retailPrice;
  }

  return priceSet.tierPrices.regular;
};

const computeRegularDisplayVisiblePrice = (
  displayPriceSet: ReturnType<typeof getDisplayPriceSet>,
  tier: ResellerTier,
  hasOverride: boolean,
  overridePrice: number | undefined,
  currencySettings: CurrencySettings
) => {
  if (hasOverride && overridePrice !== undefined) {
    return roundCurrencyAmount(convertVndToDisplayAmount(overridePrice, currencySettings), currencySettings.currency);
  }

  if (tier === "guest") {
    return displayPriceSet.retailPrice;
  }

  return displayPriceSet.tierPrices.regular;
};

const computePublicVisiblePriceFromSet = (priceSet: ProductPriceSet, session?: PublicPricingSession) => {
  if (!session || session.role === "admin" || session.role === "deputy_admin" || session.role === "staff") {
    return { price: priceSet.retailPrice, label: "Retail price" };
  }

  if (session.role === "customer") {
    if (session.tier === "guest") {
      return { price: priceSet.retailPrice, label: "Retail price" };
    }

    return {
      price: session.vip ? priceSet.customerTierPrices.vip : priceSet.customerTierPrices.regular,
      label: session.vip ? "VIP customer" : "Regular customer"
    };
  }

  if (session.role === "reseller") {
    if (session.tier === "guest") {
      return { price: priceSet.retailPrice, label: "Retail price" };
    }

    return {
      price: session.vip ? priceSet.tierPrices.vip : priceSet.tierPrices.regular,
      label: session.vip ? "VIP reseller" : "Regular reseller"
    };
  }

  return { price: priceSet.retailPrice, label: "Retail price" };
};

const computePublicVisibleDisplayPrice = (
  displayPriceSet: ReturnType<typeof getDisplayPriceSet>,
  session?: PublicPricingSession
) => {
  if (!session || session.role === "admin" || session.role === "deputy_admin" || session.role === "staff") {
    return displayPriceSet.retailPrice;
  }

  if (session.role === "customer") {
    if (session.tier === "guest") {
      return displayPriceSet.retailPrice;
    }

    return session.vip ? displayPriceSet.customerTierPrices.vip : displayPriceSet.customerTierPrices.regular;
  }

  if (session.role === "reseller") {
    if (session.tier === "guest") {
      return displayPriceSet.retailPrice;
    }

    return session.vip ? displayPriceSet.tierPrices.vip : displayPriceSet.tierPrices.regular;
  }

  return displayPriceSet.retailPrice;
};

const getPublicPriceSelection = (
  product: Product,
  currencySettings: CurrencySettings,
  storedPriceSet: ProductPriceSet,
  displayPriceSet: ProductPriceSet,
  session?: PublicPricingSession,
  foreignPricing?: Awaited<ReturnType<typeof getForeignPricingOverride>>
) => {
  if (foreignPricing?.context === "foreign_reseller") {
    return {
      storedPriceSet: foreignPricing.storedPriceSet,
      displayPriceSet: foreignPricing.displayPriceSet,
      visiblePrice: foreignPricing.storedPriceSet.tierPrices.regular,
      displayVisiblePrice: foreignPricing.displayPriceSet.tierPrices.regular
    };
  }

  if (foreignPricing?.context === "foreign_customer") {
    return {
      storedPriceSet: foreignPricing.storedPriceSet,
      displayPriceSet: foreignPricing.displayPriceSet,
      visiblePrice: foreignPricing.storedPriceSet.customerTierPrices.regular,
      displayVisiblePrice: foreignPricing.displayPriceSet.customerTierPrices.regular
    };
  }

  const visible = computePublicVisiblePriceFromSet(storedPriceSet, session);
  const fallbackDisplayVisiblePrice = computePublicVisibleDisplayPrice(displayPriceSet, session);
  const isForeignCustomerContext = currencySettings.currency === "USD" && (!session || session.role === "customer");

  if (isForeignCustomerContext) {
    const vnCustomerDisplayPrice = roundCurrencyAmount(
      convertVndToDisplayAmount(product.customerTierPrices.regular, currencySettings),
      currencySettings.currency
    );
    const minForeignCustomerDisplayPrice = roundCurrencyAmount(
      vnCustomerDisplayPrice * (1 + FOREIGN_CUSTOMER_MIN_PREMIUM_PERCENT / 100),
      currencySettings.currency
    );
    const adjustedDisplayVisiblePrice =
      fallbackDisplayVisiblePrice > minForeignCustomerDisplayPrice
        ? fallbackDisplayVisiblePrice
        : minForeignCustomerDisplayPrice + 0.01;
    const adjustedStoredVisiblePrice = roundCurrencyAmount(
      convertDisplayAmountToVnd(adjustedDisplayVisiblePrice, currencySettings),
      "VND"
    );

    return {
      storedPriceSet,
      displayPriceSet,
      visiblePrice: adjustedStoredVisiblePrice,
      displayVisiblePrice: adjustedDisplayVisiblePrice
    };
  }

  return {
    storedPriceSet,
    displayPriceSet,
    visiblePrice: visible.price,
    displayVisiblePrice: fallbackDisplayVisiblePrice
  };
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

const isHiddenOnPublicWeb = (product: Product) => {
  const localizedCopies = Object.values(product.translations ?? {});
  const haystack = normalizeText(
    [
      product.name,
      product.slug,
      product.category,
      ...(product.categories ?? []),
      ...localizedCopies.flatMap((copy) => [copy?.name, copy?.category, ...(copy?.categories ?? [])])
    ]
      .filter(Boolean)
      .join(" ")
  );

  return PUBLIC_HIDDEN_PRODUCT_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

export const buildProductView = async (
  product: Product,
  tier: ResellerTier,
  language: Language,
  user?: User,
  preferredCurrency?: CurrencyCode
): Promise<ProductView> => {
  const localized = getLocalizedProductCopy(product, language);
  const currencySettings = await getCurrencySettings(language, preferredCurrency);
  const displayPriceSet = getDisplayPriceSet(product, currencySettings);
  const storedPriceSet = getStoredPriceSetForCurrency(product, currencySettings);
  const overridePrice = (user && user.overridePriceMap[product.id]) || (user && product.overridePrices[user.id]) || undefined;
  const displayVisiblePrice = computeRegularDisplayVisiblePrice(
    displayPriceSet,
    tier,
    overridePrice !== undefined,
    overridePrice,
    currencySettings
  );

  return {
    id: product.id,
    slug: product.slug,
    name: localized.name,
    shortDescription: localized.shortDescription,
    fullDescription: localized.fullDescription,
    usageDuration: getLocalizedUsageDuration(product.usageDuration, language),
    warrantyDuration: getLocalizedWarrantyDuration(product.warrantyDuration ?? product.warrantyMonths, language),
    image: product.image,
    retailPrice: storedPriceSet.retailPrice,
    customerRegularPrice: storedPriceSet.customerTierPrices.regular,
    visiblePrice: overridePrice ?? computeVisiblePriceFromSet(storedPriceSet, tier),
    displayCurrency: currencySettings.currency,
    displayRetailPrice: displayPriceSet.retailPrice,
    displayCustomerRegularPrice: displayPriceSet.customerTierPrices.regular,
    displayVisiblePrice,
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

const buildPublicProductView = async (
  product: Product,
  language: Language,
  currencySettings: CurrencySettings,
  session?: PublicPricingSession
): Promise<ProductView> => {
  const localized = getLocalizedProductCopy(product, language);
  const defaultDisplayPriceSet = getDisplayPriceSet(product, currencySettings);
  const defaultStoredPriceSet = getStoredPriceSetForCurrency(product, currencySettings);
  const foreignPricing = await getForeignPricingOverride(product, currencySettings, session);
  const selectedPricing = getPublicPriceSelection(
    product,
    currencySettings,
    defaultStoredPriceSet,
    defaultDisplayPriceSet,
    session,
    foreignPricing
  );

  return {
    id: product.id,
    slug: product.slug,
    name: localized.name,
    shortDescription: localized.shortDescription,
    fullDescription: localized.fullDescription,
    usageDuration: getLocalizedUsageDuration(product.usageDuration, language),
    warrantyDuration: getLocalizedWarrantyDuration(product.warrantyDuration ?? product.warrantyMonths, language),
    image: product.image,
    retailPrice: selectedPricing.storedPriceSet.retailPrice,
    customerRegularPrice: selectedPricing.storedPriceSet.customerTierPrices.regular,
    visiblePrice: selectedPricing.visiblePrice,
    displayCurrency: currencySettings.currency,
    displayRetailPrice: selectedPricing.displayPriceSet.retailPrice,
    displayCustomerRegularPrice: selectedPricing.displayPriceSet.customerTierPrices.regular,
    displayVisiblePrice: selectedPricing.displayVisiblePrice,
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

const getPriorityRankFromHaystack = (haystack: string) => {
  const matchedPriorityIndex = PRIORITY_PRODUCT_KEYWORDS.findIndex((keyword) => haystack.includes(keyword));

  if (matchedPriorityIndex >= 0) {
    return matchedPriorityIndex;
  }

  const isClaudePro365 =
    haystack.includes("claude pro 365") ||
    (haystack.includes("claude") && haystack.includes("pro")) ||
    haystack.includes("microsoft 365") ||
    haystack.includes("365 premium");

  return isClaudePro365 ? PRIORITY_PRODUCT_KEYWORDS.length : Number.POSITIVE_INFINITY;
};

const getProductViewPriorityRank = (product: Pick<ProductView, "name" | "slug" | "category" | "categories">) =>
  getPriorityRankFromHaystack(
    normalizeText([product.name, product.slug, product.category, ...(product.categories ?? [])].filter(Boolean).join(" "))
  );

const getPreparedProductPriorityRank = (product: PreparedPublicProduct) =>
  getPriorityRankFromHaystack(
    normalizeText(
      [
        product.view.name,
        product.view.slug,
        product.view.category,
        ...(product.view.categories ?? []),
        ...product.searchPayload.categoryAliases
      ]
        .filter(Boolean)
        .join(" ")
    )
  );

const sortPublicProducts = (products: ProductView[], sort: string | undefined, language: Language) => {
  const sortedProducts = [...products];

  switch (sort) {
    case "price-asc":
      sortedProducts.sort((left, right) => left.displayVisiblePrice - right.displayVisiblePrice);
      break;
    case "price-desc":
      sortedProducts.sort((left, right) => right.displayVisiblePrice - left.displayVisiblePrice);
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
        const priorityRank = getProductViewPriorityRank(left) - getProductViewPriorityRank(right);

        if (priorityRank !== 0) {
          return priorityRank;
        }

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

const getPreparedPublicProducts = async (
  language: Language,
  currency: CurrencyCode | undefined,
  session?: PublicPricingSession
): Promise<PreparedPublicProduct[]> => {
  const currencySettings = await getCurrencySettings(language, currency);
  const visibleProducts = listProducts().filter((product) => product.published && !isHiddenOnPublicWeb(product));

  return Promise.all(
    visibleProducts.map(async (product) => {
      const view = await buildPublicProductView(product, language, currencySettings, session);
      return {
        view,
        searchPayload: getProductSearchPayload(product),
        categories: getViewCategories(view).map((category) => category.trim()).filter(Boolean)
      };
    })
  );
};

const isGrokPreparedProduct = (product: PreparedPublicProduct) =>
  product.searchPayload.normalizedCategoryAliases.includes(GROK_CATEGORY_KEYWORD) ||
  normalizeText(product.view.name).includes("grok");

const sortPromotionCandidates = (products: PreparedPublicProduct[], language: Language) =>
  [...products].sort((left, right) => {
    const priorityRank = getPreparedProductPriorityRank(left) - getPreparedProductPriorityRank(right);

    if (priorityRank !== 0) {
      return priorityRank;
    }

    const grokPriority = Number(isGrokPreparedProduct(right)) - Number(isGrokPreparedProduct(left));

    if (grokPriority !== 0) {
      return grokPriority;
    }

    if (left.view.isFlashSale !== right.view.isFlashSale) {
      return Number(right.view.isFlashSale) - Number(left.view.isFlashSale);
    }

    const rightDate = Date.parse(right.view.updatedAt ?? right.view.createdAt ?? "");
    const leftDate = Date.parse(left.view.updatedAt ?? left.view.createdAt ?? "");

    if (rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    return left.view.name.localeCompare(right.view.name, language === "en" ? "en" : "vi");
  });

export const getPublicProductView = async (
  product: Product,
  language: Language,
  session?: PublicPricingSession,
  currency?: CurrencyCode
) => {
  const currencySettings = await getCurrencySettings(language, currency);
  return await buildPublicProductView(product, language, currencySettings, session);
};

export const getVisibleProducts = async (
  userId?: string | null,
  forcedTier?: ResellerTier,
  language: Language = "en",
  currency?: CurrencyCode
) => {
  const user = getUserById(userId);
  const tier = forcedTier || user?.tier || "guest";
  const products = listProducts().filter((product) => (tier === "guest" ? product.published : true));

  return Promise.all(products.map((product) => buildProductView(product, tier, language, user, currency)));
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

export const getStorefrontSnapshot = async ({ language, currency, query, category, sort, session }: StorefrontSnapshotOptions) => {
  const normalizedQuery = normalizeText(query);
  const normalizedCategory = normalizeText(category);
  const preparedProducts = await getPreparedPublicProducts(language, currency, session);
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
  const featuredProducts = sortPromotionCandidates(featuredSource.length > 0 ? featuredSource : preparedProducts, language)
    .slice(0, 4)
    .map((product) => product.view);
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const flashSaleProducts = sortPromotionCandidates(flashSaleSource, language)
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

export const getPublicCategories = async (language: Language, currency?: CurrencyCode, session?: PublicPricingSession) =>
  (await getStorefrontSnapshot({ language, currency, session })).categories;

export const getFeaturedProducts = async (language: Language, currency?: CurrencyCode, session?: PublicPricingSession) =>
  (await getStorefrontSnapshot({ language, currency, session })).featuredProducts;

export const getFlashSaleProducts = async (language: Language, currency?: CurrencyCode, session?: PublicPricingSession) =>
  (await getStorefrontSnapshot({ language, currency, session })).flashSaleProducts;

export const getFilteredPublicProducts = async ({
  language,
  currency,
  query,
  category,
  sort,
  session
}: StorefrontSnapshotOptions) =>
  (await getStorefrontSnapshot({ language, currency, query, category, sort, session })).catalogProducts;

import {
  convertDisplayAmountToVnd,
  convertVndToDisplayAmount,
  CurrencySettings,
  DEFAULT_USD_PER_VND,
  roundCurrencyAmount
} from "@/lib/currency";
import { CurrencyCode, MemberPriceTier, Product, ProductPriceOverride, ProductPriceSet } from "@/lib/types";

const MEMBER_PRICE_TIERS: MemberPriceTier[] = ["regular", "vip"];

const toFiniteAmount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

const roundPriceSet = (priceSet: ProductPriceSet, currency: CurrencyCode): ProductPriceSet => ({
  retailPrice: roundCurrencyAmount(priceSet.retailPrice, currency),
  customerTierPrices: {
    regular: roundCurrencyAmount(priceSet.customerTierPrices.regular, currency),
    vip: roundCurrencyAmount(priceSet.customerTierPrices.vip, currency)
  },
  tierPrices: {
    regular: roundCurrencyAmount(priceSet.tierPrices.regular, currency),
    vip: roundCurrencyAmount(priceSet.tierPrices.vip, currency)
  }
});

const normalizeTierOverride = (
  value: unknown,
  fallback: Record<MemberPriceTier, number>,
  currency: CurrencyCode
): Record<MemberPriceTier, number> => {
  const source = value && typeof value === "object" ? (value as Partial<Record<MemberPriceTier, unknown>>) : {};

  return MEMBER_PRICE_TIERS.reduce(
    (accumulator, tier) => {
      accumulator[tier] = roundCurrencyAmount(toFiniteAmount(source[tier]) ?? fallback[tier], currency);
      return accumulator;
    },
    { ...fallback }
  );
};

const getFallbackSettings = (currency: CurrencyCode): CurrencySettings => ({
  language: currency === "USD" ? "en" : "vi",
  currency,
  locale: currency === "USD" ? "en-US" : "vi-VN",
  usdPerVnd: DEFAULT_USD_PER_VND,
  sourceUrl: "fallback"
});

export const getBaseProductPriceSet = (
  product: Pick<Product, "retailPrice" | "customerTierPrices" | "tierPrices">
): ProductPriceSet => ({
  retailPrice: product.retailPrice,
  customerTierPrices: {
    regular: product.customerTierPrices.regular,
    vip: product.customerTierPrices.vip
  },
  tierPrices: {
    regular: product.tierPrices.regular,
    vip: product.tierPrices.vip
  }
});

export const convertPriceSetToDisplay = (priceSet: ProductPriceSet, settings: CurrencySettings): ProductPriceSet =>
  roundPriceSet(
    {
      retailPrice: convertVndToDisplayAmount(priceSet.retailPrice, settings),
      customerTierPrices: {
        regular: convertVndToDisplayAmount(priceSet.customerTierPrices.regular, settings),
        vip: convertVndToDisplayAmount(priceSet.customerTierPrices.vip, settings)
      },
      tierPrices: {
        regular: convertVndToDisplayAmount(priceSet.tierPrices.regular, settings),
        vip: convertVndToDisplayAmount(priceSet.tierPrices.vip, settings)
      }
    },
    settings.currency
  );

export const convertDisplayPriceSetToStored = (priceSet: ProductPriceSet, settings: CurrencySettings): ProductPriceSet =>
  roundPriceSet(
    {
      retailPrice: convertDisplayAmountToVnd(priceSet.retailPrice, settings),
      customerTierPrices: {
        regular: convertDisplayAmountToVnd(priceSet.customerTierPrices.regular, settings),
        vip: convertDisplayAmountToVnd(priceSet.customerTierPrices.vip, settings)
      },
      tierPrices: {
        regular: convertDisplayAmountToVnd(priceSet.tierPrices.regular, settings),
        vip: convertDisplayAmountToVnd(priceSet.tierPrices.vip, settings)
      }
    },
    "VND"
  );

const normalizeCurrencyPriceOverride = (
  override: ProductPriceOverride | undefined,
  fallback: ProductPriceSet,
  currency: CurrencyCode
): ProductPriceOverride | undefined => {
  if (!override) {
    return undefined;
  }

  const retailPrice = toFiniteAmount(override.retailPrice);
  const customerTierPrices = override.customerTierPrices
    ? normalizeTierOverride(override.customerTierPrices, fallback.customerTierPrices, currency)
    : undefined;
  const tierPrices = override.tierPrices
    ? normalizeTierOverride(override.tierPrices, fallback.tierPrices, currency)
    : undefined;

  if (retailPrice === undefined && !customerTierPrices && !tierPrices) {
    return undefined;
  }

  return {
    retailPrice: retailPrice !== undefined ? roundCurrencyAmount(retailPrice, currency) : undefined,
    customerTierPrices,
    tierPrices
  };
};

export const normalizeProductCurrencyPrices = (
  currencyPrices: Product["currencyPrices"],
  basePriceSet: ProductPriceSet
): Product["currencyPrices"] => {
  if (!currencyPrices) {
    return undefined;
  }

  const normalizedEntries = (Object.entries(currencyPrices) as [CurrencyCode, ProductPriceOverride | undefined][])
    .map(([currency, override]) => {
      const fallback =
        currency === "VND" ? basePriceSet : convertPriceSetToDisplay(basePriceSet, getFallbackSettings(currency));
      const normalizedOverride = normalizeCurrencyPriceOverride(override, fallback, currency);
      return normalizedOverride ? ([currency, normalizedOverride] as const) : undefined;
    })
    .filter(Boolean) as [CurrencyCode, ProductPriceOverride][];

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries);
};

export const getDisplayPriceSet = (
  product: Pick<Product, "retailPrice" | "customerTierPrices" | "tierPrices" | "currencyPrices">,
  settings: CurrencySettings
): ProductPriceSet => {
  const basePriceSet = getBaseProductPriceSet(product);

  if (settings.currency === "VND") {
    return roundPriceSet(basePriceSet, "VND");
  }

  const fallbackPriceSet = convertPriceSetToDisplay(basePriceSet, settings);
  const override = product.currencyPrices?.[settings.currency];

  return {
    retailPrice: roundCurrencyAmount(toFiniteAmount(override?.retailPrice) ?? fallbackPriceSet.retailPrice, settings.currency),
    customerTierPrices: normalizeTierOverride(override?.customerTierPrices, fallbackPriceSet.customerTierPrices, settings.currency),
    tierPrices: normalizeTierOverride(override?.tierPrices, fallbackPriceSet.tierPrices, settings.currency)
  };
};

export const getStoredPriceSetForCurrency = (
  product: Pick<Product, "retailPrice" | "customerTierPrices" | "tierPrices" | "currencyPrices">,
  settings: CurrencySettings
) => {
  const displayPriceSet = getDisplayPriceSet(product, settings);

  if (settings.currency === "VND") {
    return getBaseProductPriceSet(product);
  }

  return convertDisplayPriceSetToStored(displayPriceSet, settings);
};

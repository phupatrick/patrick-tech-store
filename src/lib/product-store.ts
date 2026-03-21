import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ACCOUNT_CATEGORY,
  UPGRADE_CATEGORY,
  normalizeCategoryList,
  normalizeProductCategories,
  normalizeProductCategory,
  normalizeText
} from "@/lib/product-categories";
import { formatDuration, getApproximateMonths } from "@/lib/duration";
import { Language } from "@/lib/i18n";
import { createJsonFileStore } from "@/lib/json-file-store";
import { getBaseProductPriceSet, normalizeProductCurrencyPrices } from "@/lib/product-pricing";
import { MemberPriceTier, Product, ProductAccountType } from "@/lib/types";

const buildSvg = (hue: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#070b17" />
          <stop offset="100%" stop-color="${hue}" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="28" fill="url(#bg)" />
      <circle cx="540" cy="90" r="70" fill="rgba(255,255,255,0.10)" />
      <circle cx="120" cy="320" r="110" fill="rgba(74,222,128,0.10)" />
      <text x="44" y="106" fill="#dbeafe" font-family="Segoe UI, sans-serif" font-size="26">Patrick Tech Store</text>
      <text x="44" y="210" fill="#ffffff" font-family="Segoe UI, sans-serif" font-weight="700" font-size="44">Tai khoan so</text>
      <text x="44" y="258" fill="#93c5fd" font-family="Segoe UI, sans-serif" font-size="22">Ban giao nhanh</text>
      <rect x="44" y="300" width="170" height="48" rx="24" fill="rgba(10,15,30,0.55)" stroke="rgba(147,197,253,0.45)" />
      <text x="74" y="331" fill="#86efac" font-family="Segoe UI, sans-serif" font-size="20">Bao hanh ro rang</text>
    </svg>
  `)}`;

const createMemberPrices = (regularPrice: number, vipPrice = regularPrice): Record<MemberPriceTier, number> => ({
  regular: regularPrice,
  vip: vipPrice
});

const getLegacyPriceMap = (value: unknown) =>
  (value && typeof value === "object" ? (value as Partial<Record<string, unknown>>) : {}) as Partial<
    Record<string, number>
  >;

const resolveRegularPrice = (value: unknown, fallback: number) => {
  const legacy = getLegacyPriceMap(value);
  return legacy.regular ?? legacy.bronze ?? legacy.silver ?? legacy.gold ?? fallback;
};

const resolveVipPrice = (value: unknown, fallback: number) => {
  const legacy = getLegacyPriceMap(value);
  return legacy.vip ?? legacy.gold ?? legacy.silver ?? legacy.bronze ?? fallback;
};

const inferAccountType = (product: Partial<Product>): ProductAccountType => {
  if (product.accountType) {
    return product.accountType;
  }

  const haystack = normalizeText(
    [product.name, product.shortDescription, product.fullDescription, product.category, ...(product.categories ?? [])]
      .filter(Boolean)
      .join(" ")
  );

  if (haystack.includes("shared") || haystack.includes("dung chung") || haystack.includes("thue") || haystack.includes("rental")) {
    return "rental";
  }

  if (haystack.includes("upgrade") || haystack.includes("nang cap") || haystack.includes("invitation")) {
    return "dedicated";
  }

  return "primary";
};

const seedProducts: Product[] = [
  {
    id: "chatgpt-team-business",
    name: "ChatGPT Team Business",
    slug: "chatgpt-team-business",
    shortDescription: "Goi nang cap theo thang cho nhu cau lam viec va ban giao nhanh.",
    fullDescription: "Dang tai khoan hoac nang cap goi theo thang cho nhu cau lam viec chat luong cao.",
    usageDuration: "30 ngay",
    warrantyDuration: "1 month",
    costPrice: 199000,
    retailPrice: 249000,
    customerTierPrices: { regular: 249000, vip: 219000 },
    category: UPGRADE_CATEGORY,
    categories: [UPGRADE_CATEGORY, "AI"],
    accountType: "primary",
    featured: true,
    isFlashSale: false,
    published: true,
    tierPrices: { regular: 239000, vip: 219000 },
    overridePrices: {},
    image: buildSvg("#0f766e"),
    warrantyMonths: 1,
    stock: 12,
    points: 0,
    createdAt: "2026-03-10T09:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z"
  },
  {
    id: "chatgpt-plus-shared",
    name: "ChatGPT Plus Shared",
    slug: "chatgpt-plus-shared",
    shortDescription: "Tai khoan dung chung tiet kiem chi phi va ban giao nhanh.",
    fullDescription: "Tai khoan so da kich hoat san, phu hop cho hoc tap va su dung co ban.",
    usageDuration: "30 ngay",
    warrantyDuration: "1 month",
    costPrice: 89000,
    retailPrice: 119000,
    customerTierPrices: { regular: 119000, vip: 105000 },
    category: ACCOUNT_CATEGORY,
    categories: [ACCOUNT_CATEGORY, "ChatGPT"],
    accountType: "rental",
    featured: true,
    isFlashSale: true,
    flashSaleLabel: "Tai khoan pho bien",
    published: true,
    tierPrices: { regular: 109000, vip: 95000 },
    overridePrices: {},
    image: buildSvg("#1d4ed8"),
    warrantyMonths: 1,
    stock: 18,
    points: 0,
    createdAt: "2026-03-08T09:00:00.000Z",
    updatedAt: "2026-03-11T09:00:00.000Z"
  },
  {
    id: "canva-pro-upgrade",
    name: "Canva Pro Upgrade",
    slug: "canva-pro-upgrade",
    shortDescription: "Nang cap goi Canva Pro theo ky cho hoc tap, lam viec va san xuat noi dung.",
    fullDescription: "Goi nang cap mo khoa tinh nang Pro va lien ket vao tai khoan hien co cua khach hang.",
    usageDuration: "30 ngay",
    warrantyDuration: "1 month",
    costPrice: 69000,
    retailPrice: 89000,
    customerTierPrices: { regular: 89000, vip: 79000 },
    category: UPGRADE_CATEGORY,
    categories: [UPGRADE_CATEGORY, "Thiet ke"],
    accountType: "dedicated",
    featured: false,
    isFlashSale: true,
    flashSaleLabel: "Nang cap nhanh",
    published: true,
    tierPrices: { regular: 79000, vip: 72000 },
    overridePrices: {},
    image: buildSvg("#7c3aed"),
    warrantyMonths: 1,
    stock: 24,
    points: 0,
    createdAt: "2026-03-07T09:00:00.000Z",
    updatedAt: "2026-03-12T09:00:00.000Z"
  },
  {
    id: "capcut-pro-account",
    name: "CapCut Pro Account",
    slug: "capcut-pro-account",
    shortDescription: "Tai khoan so san dung voi tinh nang Pro cho chinh sua video ngan.",
    fullDescription: "Tai khoan so da kich hoat san, giao thong tin dang nhap nhanh va co huong dan su dung.",
    usageDuration: "30 ngay",
    warrantyDuration: "1 month",
    costPrice: 119000,
    retailPrice: 159000,
    customerTierPrices: { regular: 159000, vip: 139000 },
    category: ACCOUNT_CATEGORY,
    categories: [ACCOUNT_CATEGORY, "Video"],
    accountType: "rental",
    featured: false,
    isFlashSale: false,
    published: true,
    tierPrices: { regular: 145000, vip: 129000 },
    overridePrices: {},
    image: buildSvg("#ea580c"),
    warrantyMonths: 1,
    stock: 9,
    points: 0,
    createdAt: "2026-03-05T09:00:00.000Z",
    updatedAt: "2026-03-09T09:00:00.000Z"
  }
];

const dataDirectory = path.join(process.cwd(), "src", "data");
const productFile = path.join(dataDirectory, "products.json");

const ensureStore = () => {
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }

  if (!existsSync(productFile)) {
    writeFileSync(productFile, JSON.stringify(seedProducts, null, 2), "utf8");
  }
};

const normalizeProduct = (product: Product, index: number): Product => {
  const retailPrice = Number.isFinite(product.retailPrice)
    ? product.retailPrice
    : resolveRegularPrice(product.customerTierPrices, 0);
  const customerTierPrices = {
    regular: resolveRegularPrice(product.customerTierPrices, retailPrice),
    vip: resolveVipPrice(product.customerTierPrices, retailPrice)
  };
  const tierPrices = {
    regular: resolveRegularPrice(product.tierPrices, retailPrice),
    vip: resolveVipPrice(product.tierPrices, resolveRegularPrice(product.tierPrices, retailPrice))
  };
  const basePriceSet = getBaseProductPriceSet({
    retailPrice,
    customerTierPrices,
    tierPrices
  });

  const warrantyDuration = product.warrantyDuration?.trim() || formatDuration(product.warrantyMonths || 1, "month");
  const warrantyMonths = Number.isFinite(product.warrantyMonths) && product.warrantyMonths > 0
    ? Math.trunc(product.warrantyMonths)
    : getApproximateMonths(warrantyDuration);

  return {
    ...product,
    shortDescription: product.shortDescription.trim(),
    fullDescription: product.fullDescription.trim(),
    usageDuration: product.usageDuration?.trim() || "30 ngay",
    warrantyDuration,
    costPrice: Number.isFinite(product.costPrice) ? product.costPrice : retailPrice,
    retailPrice,
    customerTierPrices,
    tierPrices,
    currencyPrices: normalizeProductCurrencyPrices(product.currencyPrices, basePriceSet),
    categories: normalizeProductCategories(product),
    category: normalizeProductCategory(product),
    accountType: inferAccountType(product),
    warrantyMonths,
    isFlashSale: product.isFlashSale ?? false,
    flashSaleLabel: product.flashSaleLabel?.trim() || undefined,
    createdAt: product.createdAt ?? new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
    updatedAt: product.updatedAt ?? product.createdAt ?? new Date(Date.UTC(2026, 0, 1 + index)).toISOString()
  };
};

const getLocalizedFields = (input: ProductInput) => ({
  name: input.name.trim(),
  shortDescription: input.shortDescription.trim(),
  fullDescription: input.fullDescription.trim(),
  category: input.category?.trim() || undefined,
  categories: normalizeCategoryList(input.categories ?? input.category),
  flashSaleLabel: input.flashSaleLabel?.trim() || undefined
});

const sortProducts = (products: Product[]) =>
  [...products].sort((left, right) => {
    if (left.featured !== right.featured) {
      return Number(right.featured) - Number(left.featured);
    }

    if (left.published !== right.published) {
      return Number(right.published) - Number(left.published);
    }

    return left.name.localeCompare(right.name);
  });

const normalizeProducts = (products: Product[]) => sortProducts(products.map(normalizeProduct));

const productStore = createJsonFileStore<Product[]>({
  ensureFile: ensureStore,
  filePath: productFile,
  parse: (content) => normalizeProducts(JSON.parse(content) as Product[]),
  serialize: (products) => JSON.stringify(sortProducts(products), null, 2)
});

export const listProducts = () => {
  return productStore.read();
};

export const saveProducts = (products: Product[]) => {
  productStore.write(normalizeProducts(products));
};

export const getProductById = (productId: string) => listProducts().find((product) => product.id === productId);

export const getProductBySlug = (slug: string) => listProducts().find((product) => product.slug === slug);

type ProductInput = Pick<
  Product,
  | "name"
  | "slug"
  | "shortDescription"
  | "fullDescription"
  | "usageDuration"
  | "warrantyDuration"
  | "costPrice"
  | "image"
  | "retailPrice"
  | "customerTierPrices"
  | "category"
  | "categories"
  | "accountType"
  | "featured"
  | "isFlashSale"
  | "flashSaleLabel"
  | "published"
  | "tierPrices"
  | "warrantyMonths"
  | "currencyPrices"
>;

export const createProductRecord = (input: ProductInput, language: Language = "vi") => {
  const products = listProducts();
  const now = new Date().toISOString();
  const localizedFields = getLocalizedFields(input);
  const product: Product = {
    id: randomUUID(),
    ...input,
    ...localizedFields,
    usageDuration: input.usageDuration.trim(),
    warrantyDuration: input.warrantyDuration?.trim() || formatDuration(input.warrantyMonths || 1, "month"),
    categories: normalizeProductCategories(input),
    category: normalizeProductCategory(input),
    accountType: inferAccountType(input),
    customerTierPrices: input.customerTierPrices ?? createMemberPrices(input.retailPrice),
    tierPrices: input.tierPrices ?? createMemberPrices(input.retailPrice),
    currencyPrices: input.currencyPrices,
    overridePrices: {},
    stock: 0,
    points: 0,
    translations: {
      [language]: localizedFields
    },
    createdAt: now,
    updatedAt: now
  };

  saveProducts([...products, product]);
  return product;
};

export const updateProductRecord = (productId: string, input: ProductInput, language: Language = "vi") => {
  const products = listProducts();
  const existing = products.find((product) => product.id === productId);

  if (!existing) {
    return undefined;
  }

  const localizedFields = getLocalizedFields(input);
  const shouldUpdateBaseCopy = language === "vi" || !existing.translations?.vi;
  const nextBaseFields = shouldUpdateBaseCopy
    ? localizedFields
    : {
        name: existing.name,
        shortDescription: existing.shortDescription,
        fullDescription: existing.fullDescription,
        category: existing.category,
        categories: existing.categories,
        flashSaleLabel: existing.flashSaleLabel
      };

  const updated: Product = {
    ...existing,
    ...input,
    ...nextBaseFields,
    usageDuration: input.usageDuration.trim(),
    warrantyDuration: input.warrantyDuration?.trim() || existing.warrantyDuration || formatDuration(input.warrantyMonths || 1, "month"),
    categories: nextBaseFields.categories ?? normalizeProductCategories(input),
    category: nextBaseFields.category ?? normalizeProductCategory(input),
    accountType: inferAccountType(input),
    customerTierPrices: input.customerTierPrices ?? createMemberPrices(input.retailPrice),
    tierPrices: input.tierPrices ?? createMemberPrices(input.retailPrice),
    currencyPrices: input.currencyPrices ?? existing.currencyPrices,
    translations: {
      ...existing.translations,
      [language]: localizedFields
    },
    updatedAt: new Date().toISOString()
  };

  saveProducts(products.map((product) => (product.id === productId ? updated : product)));
  return updated;
};

export const deleteProductRecord = (productId: string) => {
  const products = listProducts();
  const nextProducts = products.filter((product) => product.id !== productId);

  if (nextProducts.length === products.length) {
    return false;
  }

  saveProducts(nextProducts);
  return true;
};

export const isSlugTaken = (slug: string, excludeProductId?: string) =>
  listProducts().some((product) => product.slug === slug && product.id !== excludeProductId);

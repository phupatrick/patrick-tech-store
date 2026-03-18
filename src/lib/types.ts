export type ResellerTier = "guest" | "regular";
export type MemberPriceTier = "regular" | "vip";
export type CurrencyCode = "VND" | "USD";
export type OrderStatus = "active" | "expired";
export type OrderSource = "manual" | "checkout";
export type AccessRole = "admin" | "deputy_admin" | "reseller" | "staff" | "customer";
export type ProductAccountType = "dedicated" | "primary" | "rental";
export type VoucherDefinitionId = "vip_upgrade" | "discount_10000" | "discount_20000" | "discount_50000";
export type VoucherKind = "vip_upgrade" | "discount";

export type ProductPriceSet = {
  retailPrice: number;
  customerTierPrices: Record<MemberPriceTier, number>;
  tierPrices: Record<MemberPriceTier, number>;
};

export type ProductPriceOverride = {
  retailPrice?: number;
  customerTierPrices?: Partial<Record<MemberPriceTier, number>>;
  tierPrices?: Partial<Record<MemberPriceTier, number>>;
};

export type ProductTranslation = {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
  category?: string;
  categories?: string[];
  flashSaleLabel?: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  usageDuration: string;
  costPrice: number;
  retailPrice: number;
  customerTierPrices: Record<MemberPriceTier, number>;
  category?: string;
  categories?: string[];
  accountType: ProductAccountType;
  featured: boolean;
  isFlashSale: boolean;
  flashSaleLabel?: string;
  published: boolean;
  tierPrices: Record<MemberPriceTier, number>;
  currencyPrices?: Partial<Record<CurrencyCode, ProductPriceOverride>>;
  overridePrices: Partial<Record<string, number>>;
  image: string;
  warrantyMonths: number;
  stock: number;
  points: number;
  createdAt?: string;
  updatedAt?: string;
  translations?: Partial<Record<"vi" | "en", ProductTranslation>>;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  role: "admin" | "reseller" | "guest";
  tier: ResellerTier;
  overridePriceMap: Partial<Record<string, number>>;
  points: number;
  countryCode: string;
};

export type Order = {
  id: string;
  name: string;
  content: string;
  phone?: string;
  productId?: string;
  warrantyCode?: string;
  source?: OrderSource;
  customerRole?: AccessRole;
  customerVip?: boolean;
  customerLabel?: string;
  customerIp?: string;
  customerAddress?: string;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  costPrice?: number;
  profit?: number;
  purchaseDate: string;
  warrantyUntil: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  usageDuration: string;
  image: string;
  retailPrice: number;
  customerRegularPrice: number;
  visiblePrice: number;
  displayCurrency: CurrencyCode;
  displayRetailPrice: number;
  displayCustomerRegularPrice: number;
  displayVisiblePrice: number;
  label?: string;
  stock: number;
  warrantyMonths: number;
  points: number;
  category?: string;
  categories?: string[];
  featured: boolean;
  isFlashSale: boolean;
  flashSaleLabel?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OwnedVoucher = {
  id: string;
  definitionId: VoucherDefinitionId;
  createdAt: string;
  usedAt?: string;
};

export type AccessCodeRecord = {
  id: string;
  codeHash: string;
  codeSalt: string;
  label: string;
  role: AccessRole;
  tier: ResellerTier;
  points: number;
  vip?: boolean;
  vouchers?: OwnedVoucher[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  subject: string;
  role: AccessRole;
  label: string;
  tier: ResellerTier;
  points: number;
  vip?: boolean;
  fixed?: boolean;
};

export type VoucherDefinition = {
  id: VoucherDefinitionId;
  kind: VoucherKind;
  pointCost: number;
  discountAmount?: number;
  minOrderAmount?: number;
};

export type VoucherView = {
  id: string;
  definitionId: VoucherDefinitionId;
  kind: VoucherKind;
  pointCost: number;
  discountAmount?: number;
  minOrderAmount?: number;
  createdAt: string;
  usedAt?: string;
  reservedUntil?: string;
  reservedByCheckoutId?: string;
};

export type PendingCheckout = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  language: "vi" | "en";
  countryCode: string;
  accessCodeId: string;
  customerLabel: string;
  customerRole: AccessRole;
  customerTier: ResellerTier;
  customerVip: boolean;
  productId: string;
  productName: string;
  orderName: string;
  orderContent: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  currencyCode: "VND" | "USD";
  displayPrice: string;
  contactUrl: string;
  messageText: string;
  customerIp?: string;
  customerAddress?: string;
  voucherId?: string;
  voucherDefinitionId?: VoucherDefinitionId;
};

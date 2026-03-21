import { normalizeText } from "@/lib/product-categories";

export type DurationUnit = "day" | "month" | "year";

type ParsedDuration = {
  value: number;
  unit: DurationUnit;
  isLifetime: boolean;
};

const LIFETIME_TOKENS = ["vinh vien", "lifetime", "permanent", "forever"];

export const formatDuration = (value: string | number, unit: DurationUnit) => `${String(value).trim()} ${unit}`;

export const parseDuration = (
  input: string | number | undefined,
  defaults: { value?: number; unit?: DurationUnit } = {}
): ParsedDuration => {
  const defaultValue = defaults.value ?? 1;
  const defaultUnit = defaults.unit ?? "month";

  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return {
      value: Math.trunc(input),
      unit: defaultUnit,
      isLifetime: false
    };
  }

  const rawValue = String(input ?? "").trim();

  if (!rawValue) {
    return {
      value: defaultValue,
      unit: defaultUnit,
      isLifetime: false
    };
  }

  const normalized = normalizeText(rawValue);

  if (LIFETIME_TOKENS.some((token) => normalized.includes(token))) {
    return {
      value: 0,
      unit: defaultUnit,
      isLifetime: true
    };
  }

  const numericValue = Number.parseInt(normalized.match(/\d+/)?.[0] ?? "", 10);
  const hasDayUnit = /\b(day|days|ngay)\b/i.test(normalized);
  const hasMonthUnit = /\b(month|months|thang)\b/i.test(normalized);
  const hasYearUnit = /\b(year|years|nam)\b/i.test(normalized);

  return {
    value: Number.isFinite(numericValue) && numericValue > 0 ? numericValue : defaultValue,
    unit: hasYearUnit ? "year" : hasMonthUnit ? "month" : hasDayUnit ? "day" : defaultUnit,
    isLifetime: false
  };
};

export const getApproximateMonths = (input: string | number | undefined) => {
  const parsed = parseDuration(input, { value: 1, unit: "month" });

  if (parsed.isLifetime) {
    return 0;
  }

  if (parsed.unit === "year") {
    return parsed.value * 12;
  }

  if (parsed.unit === "day") {
    return Math.max(1, Math.ceil(parsed.value / 30));
  }

  return parsed.value;
};

export const addDurationToDate = (date: Date, input: string | number | undefined) => {
  const parsed = parseDuration(input, { value: 1, unit: "month" });
  const nextDate = new Date(date);

  if (parsed.isLifetime) {
    nextDate.setFullYear(nextDate.getFullYear() + 99);
    return nextDate;
  }

  if (parsed.unit === "day") {
    nextDate.setDate(nextDate.getDate() + parsed.value);
    return nextDate;
  }

  if (parsed.unit === "year") {
    nextDate.setFullYear(nextDate.getFullYear() + parsed.value);
    return nextDate;
  }

  nextDate.setMonth(nextDate.getMonth() + parsed.value);
  return nextDate;
};

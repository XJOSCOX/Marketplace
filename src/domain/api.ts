import { AppError } from "./errors.ts";
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireUuid(value: string) {
  if (!UUID.test(value))
    throw new AppError(400, "INVALID_ID", "A valid UUID is required.");
  return value;
}
export function pagination(search: URLSearchParams) {
  function integer(name: string, fallback: number, max: number) {
    const value = search.get(name);
    if (value === null) return fallback;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new AppError(
        400,
        "INVALID_PAGINATION",
        `${name} is outside its allowed range.`,
      );
    return Number(value);
  }
  const page = integer("page", 1, 10000);
  const pageSize = integer("pageSize", 20, 100);
  const q = (search.get("q") || "").trim();
  const category = search.get("category") || undefined;
  if (q.length > 100 || (category && !/^[a-z0-9-]{1,80}$/.test(category)))
    throw new AppError(400, "INVALID_FILTER", "Invalid catalog filter.");
  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
    q,
    category,
  };
}
export function safeNext(value: string | null | undefined) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\r\n]/.test(value) &&
    !value.includes("%") &&
    !value.startsWith("/auth")
    ? value
    : "/m/goxavni";
}
export function amountString(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    BigInt(value) > 9007199254740991n
  )
    throw new AppError(
      400,
      "INVALID_AMOUNT",
      "Use a nonnegative integer minor-unit amount as a decimal string.",
    );
  return value;
}
export function formatAmount(amount: string, currency: string) {
  const minor = BigInt(amount);
  const sign = minor < 0n ? "-" : "";
  const abs = minor < 0n ? -minor : minor;
  const digits =
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10n ** BigInt(digits);
  return `${currency} ${sign}${(abs / divisor).toLocaleString("en-US")}${digits ? "." + (abs % divisor).toString().padStart(digits, "0") : ""}`;
}

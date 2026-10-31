import type { Field } from "@/lib/modules";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(n: number | null | undefined, cents = false): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return (cents ? usdCents : usd).format(Number(n));
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function label(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Plain-text rendering of a stored value for tables. */
export function displayValue(field: Field, value: unknown, refNames?: Map<string, string>): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (field.type) {
    case "money":
      return money(value as number);
    case "percent":
      return `${value}%`;
    case "rating":
      return "★".repeat(Number(value));
    case "date":
      return shortDate(String(value));
    case "boolean":
      return value ? "Yes" : "No";
    case "tags":
      return (value as string[]).join(", ") || "—";
    case "select":
      return field.options?.find((o) => o.value === String(value))?.label ?? label(String(value));
    case "ref":
      return refNames?.get(String(value)) ?? "—";
    default:
      return String(value);
  }
}

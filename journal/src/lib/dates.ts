import { timeZone } from "@/lib/env";

/** YYYY-MM-DD for "now" in the configured JOURNAL_TIMEZONE. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone() }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing isoDate. */
export function weekStart(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(isoDate, -offset);
}

export function monthStart(isoDate: string): string {
  return isoDate.slice(0, 7) + "-01";
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z")) / 86_400_000);
}

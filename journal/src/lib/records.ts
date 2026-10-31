import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModule, type Field, type Module } from "@/lib/modules";

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Coerce one raw input into the column value, or throw ValidationError. */
export function coerce(field: Field, raw: unknown): unknown {
  if (field.type === "boolean") {
    return raw === true || raw === "true" || raw === "on" || raw === "1";
  }
  if (field.type === "tags") {
    const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(",");
    return [...new Set(list.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
  }
  const s = raw === null || raw === undefined ? "" : String(raw).trim();
  if (s === "") {
    if (field.required) throw new ValidationError(`${field.label} is required.`);
    return null;
  }
  switch (field.type) {
    case "text":
    case "email":
      if (s.length > 500) throw new ValidationError(`${field.label} is too long.`);
      if (field.type === "email" && !/^[^\s@]+@[^\s@]+$/.test(s)) throw new ValidationError(`${field.label} is not an email.`);
      return s;
    case "textarea":
      if (s.length > 50_000) throw new ValidationError(`${field.label} is too long.`);
      return s;
    case "url": {
      let u: URL;
      try {
        u = new URL(s);
      } catch {
        throw new ValidationError(`${field.label} must be a full URL (https://…).`);
      }
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new ValidationError(`${field.label} must be http(s).`);
      return u.toString();
    }
    case "number":
    case "money":
    case "percent":
    case "rating": {
      const n = Number(s.replace(/[$,\s]/g, ""));
      if (!Number.isFinite(n)) throw new ValidationError(`${field.label} must be a number.`);
      if (field.type === "percent" && (n < 0 || n > 100)) throw new ValidationError(`${field.label} must be 0–100.`);
      if (field.type === "rating" && (n < 1 || n > 5)) throw new ValidationError(`${field.label} must be 1–5.`);
      if (Math.abs(n) >= 1e12) throw new ValidationError(`${field.label} is out of range.`);
      return field.type === "percent" || field.type === "rating" ? Math.round(n) : n;
    }
    case "date":
      if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) throw new ValidationError(`${field.label} must be a date.`);
      return s;
    case "select":
      if (!field.options?.some((o) => o.value === s)) throw new ValidationError(`${field.label} has an invalid value.`);
      return s;
    case "ref":
      if (!UUID_RE.test(s)) throw new ValidationError(`${field.label} is invalid.`);
      return s;
  }
}

/** Build a row from form input using ONLY the module's declared fields. */
export function rowFromForm(mod: Module, form: FormData): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of mod.fields) {
    row[field.name] = coerce(field, form.get(field.name));
  }
  return row;
}

/** Same, for imported JSON rows (keeps id so re-importing is idempotent). */
export function rowFromImport(mod: Module, input: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of mod.fields) {
    if (field.name in input) row[field.name] = coerce(field, input[field.name]);
  }
  if (typeof input.id === "string" && UUID_RE.test(input.id)) row.id = input.id;
  return row;
}

export function requireModule(key: string): Module {
  const mod = getModule(key);
  if (!mod) throw new ValidationError("Unknown module.");
  return mod;
}

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** id -> display name for every module referenced by `mod`'s ref fields. */
export async function loadRefOptions(supabase: SupabaseClient, mod: Module) {
  const result = new Map<string, { value: string; label: string }[]>();
  for (const field of mod.fields) {
    if (field.type !== "ref" || !field.ref || result.has(field.ref)) continue;
    const target = getModule(field.ref);
    if (!target) continue;
    const { data } = await supabase
      .from(target.table)
      .select(`id, ${target.titleField}`)
      .order(target.titleField, { ascending: true })
      .limit(500);
    result.set(
      field.ref,
      ((data ?? []) as unknown as Record<string, string>[]).map((r) => ({ value: r.id, label: String(r[target.titleField] ?? r.id) })),
    );
  }
  return result;
}

export async function logActivity(
  supabase: SupabaseClient,
  entry: { action: string; module?: string; record_id?: string | null; summary?: string; status?: "ok" | "error" },
) {
  // Logging must never break the user's action.
  await supabase.from("activity_log").insert({ status: "ok", ...entry }).then(
    () => undefined,
    () => undefined,
  );
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    );
  }
  return { url, key };
}

export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Empty allowlist means "any authenticated user" — fine locally, not in production. */
export function isAllowedEmail(email: string | undefined | null): boolean {
  const raw = process.env.JOURNAL_ALLOWED_EMAILS ?? "";
  const allowed = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return true;
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

export function timeZone(): string {
  return process.env.JOURNAL_TIMEZONE || "UTC";
}

export function limitMb(name: "JOURNAL_DB_LIMIT_MB" | "JOURNAL_STORAGE_LIMIT_MB", fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

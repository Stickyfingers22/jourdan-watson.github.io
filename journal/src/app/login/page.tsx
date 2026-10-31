import { LoginForm } from "./LoginForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Personal Intelligence &amp; Operations</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">JOURNAL</h1>
      <p className="mt-1 text-sm text-muted">Think. Build. Execute. Compound.</p>
      <LoginForm notice={error === "not_allowed" ? "This account is not allowed to use JOURNAL." : undefined} />
      <p className="mt-4 text-xs text-muted">Single-user system. Accounts are created in the Supabase dashboard; public sign-up is disabled.</p>
    </main>
  );
}

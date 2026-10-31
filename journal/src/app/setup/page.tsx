export default function Setup() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="h1">JOURNAL isn&apos;t configured yet</h1>
      <p className="mt-3 text-muted">
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
        <code>.env.local</code> (local) or in your host&apos;s environment variables, then restart. See{" "}
        <code>journal/README.md</code> for the full setup checklist.
      </p>
    </main>
  );
}

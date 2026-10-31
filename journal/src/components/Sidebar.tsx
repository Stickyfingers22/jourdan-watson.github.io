import Link from "next/link";
import { AREAS, modulesForArea } from "@/lib/modules";
import { signOut } from "@/lib/actions";

export function Sidebar({ email }: { email?: string }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="px-5 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">JOURNAL</Link>
        <p className="text-[11px] text-muted">Think. Build. Execute. Compound.</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 text-sm">
        <div className="mb-3 space-y-0.5">
          <NavLink href="/">Command center</NavLink>
          <NavLink href="/briefing">Weekly briefing</NavLink>
          <NavLink href="/assistant">AI prompt builder</NavLink>
        </div>
        {AREAS.map((area) => (
          <div key={area.key} className="mb-3">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{area.short}</p>
            {modulesForArea(area.key)
              .filter((m) => m.key !== "habit-logs")
              .map((m) => (
                <NavLink key={m.key} href={`/m/${m.key}`}>{m.label}</NavLink>
              ))}
          </div>
        ))}
        <div className="mt-4 space-y-0.5 border-t border-line pt-3">
          <NavLink href="/settings">Settings, backup &amp; usage</NavLink>
        </div>
      </nav>
      <form action={signOut} className="border-t border-line px-5 py-3 text-xs text-muted">
        <p className="truncate">{email}</p>
        <button className="mt-1 underline hover:text-ink">Sign out</button>
      </form>
    </aside>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-ink">
      {children}
    </Link>
  );
}

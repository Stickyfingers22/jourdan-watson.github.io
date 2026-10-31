"use client";

import { useActionState } from "react";
import { importBackup } from "@/lib/settings-actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importBackup, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.ok}</p>}
      <input type="file" name="file" accept="application/json,.json" className="block text-sm" required />
      <button className="btn-ghost" disabled={pending}>{pending ? "Restoring…" : "Restore from backup"}</button>
    </form>
  );
}

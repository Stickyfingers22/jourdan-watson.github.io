"use client";

import { useActionState } from "react";
import type { Field, Option } from "@/lib/modules";
import type { FormState } from "@/lib/actions";

type Props = {
  fields: Field[];
  values?: Record<string, unknown>;
  refOptions: Record<string, Option[]>;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
};

export function RecordForm({ fields, values, refOptions, action, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : undefined}>
            <FieldInput field={f} value={values ? values[f.name] : f.defaultValue} options={f.ref ? refOptions[f.ref] : f.options} />
          </div>
        ))}
      </div>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}

function FieldInput({ field, value, options }: { field: Field; value: unknown; options?: Option[] }) {
  const id = `f-${field.name}`;
  const str = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(", ") : String(value);
  const common = { id, name: field.name, required: field.required, placeholder: field.placeholder };

  if (field.type === "boolean") {
    const checked = value === true || value === "true";
    return (
      <label className="flex items-center gap-2 pt-6 text-sm">
        <input type="checkbox" name={field.name} defaultChecked={checked} className="h-4 w-4" />
        {field.label}
      </label>
    );
  }

  let input: React.ReactNode;
  switch (field.type) {
    case "textarea":
      input = <textarea {...common} className="input min-h-28" defaultValue={str} />;
      break;
    case "select":
    case "ref":
      input = (
        <select {...common} className="input" defaultValue={str}>
          {!field.required || field.type === "ref" ? <option value="">—</option> : null}
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    case "date":
      input = <input {...common} type="date" className="input" defaultValue={str.slice(0, 10)} />;
      break;
    case "number":
    case "money":
      input = <input {...common} type="number" step="any" inputMode="decimal" className="input" defaultValue={str} />;
      break;
    case "percent":
      input = <input {...common} type="number" min={0} max={100} className="input" defaultValue={str} />;
      break;
    case "rating":
      input = <input {...common} type="number" min={1} max={5} className="input" defaultValue={str} />;
      break;
    case "url":
      input = <input {...common} type="url" className="input" defaultValue={str} placeholder={field.placeholder ?? "https://"} />;
      break;
    case "email":
      input = <input {...common} type="email" className="input" defaultValue={str} />;
      break;
    default:
      input = <input {...common} type="text" className="input" defaultValue={str} />;
  }
  return (
    <>
      <label className="label" htmlFor={id}>
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {input}
      {field.help && <p className="mt-1 text-xs text-muted">{field.help}</p>}
    </>
  );
}

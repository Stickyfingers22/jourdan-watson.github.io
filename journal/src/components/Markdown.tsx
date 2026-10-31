// Minimal, safe markdown renderer for JOURNAL's own generated reports
// (headings, lists, bold). Text is rendered as React children — never HTML.
export function Markdown({ source }: { source: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {source.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h2 key={i} className="pt-2 text-xl font-semibold">{inline(line.slice(2))}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="pt-3 text-sm font-semibold uppercase tracking-wide text-muted">{inline(line.slice(3))}</h3>;
        const li = line.match(/^(\s*)(-|\d+\.)\s+(.*)$/);
        if (li) return <p key={i} style={{ paddingLeft: `${li[1].length * 0.75 + 0.5}rem` }}>{li[2] === "-" ? "•" : li[2]} {inline(li[3])}</p>;
        if (!line.trim()) return null;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

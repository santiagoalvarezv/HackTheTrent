import { Lightbulb, Siren, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const ICONS = { beacon: TriangleAlert, interior: Lightbulb, alarm: Siren };

/** Side-panel card for a real-world application: explanation, calculations and a lab-vs-real table. */
export function RealWorldPanel({ id, title, text, interaction, children, calc, compare }: {
  id: keyof typeof ICONS; title: string; text: string; interaction: string; children?: ReactNode;
  calc: string[]; compare: [string, string, string][];
}) {
  const Icon = ICONS[id];
  return (
    <section className="card-soft p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4" /></span>
        <div><p className="label-caps">Real-world application</p><h2 className="font-semibold">{title}</h2></div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <p className="mt-4 text-sm">{interaction}</p>
      {children}
      <div className="mt-4 rounded-xl bg-secondary p-4 font-mono text-xs leading-relaxed text-secondary-foreground">
        {calc.map((l, i) => <div key={i} className={i === calc.length - 1 ? "font-semibold" : undefined}>{l}</div>)}
      </div>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="border-b text-left"><th className="label-caps py-2 font-normal"></th><th className="label-caps font-normal">Lab circuit</th><th className="label-caps font-normal">{title}</th></tr></thead>
        <tbody>
          {compare.map(([k, a, b]) => (
            <tr key={k} className="border-b last:border-0"><td className="py-2 pr-2 text-muted-foreground">{k}</td><td className="font-mono text-xs">{a}</td><td className="font-mono text-xs">{b}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

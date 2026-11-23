import type { ScopeChannel } from "@/lessons/models";

/** Oscilloscope trace for any number of channels, same look as the P-02 scope. */
export function PlotScope({ span, channels }: { span: number; channels: ScopeChannel[] }) {
  const W = 320, rowH = 140 / Math.max(1, channels.length), pad = 4;
  const x = (t: number) => pad + (t / span) * (W - 2 * pad);
  const fmt = (s: number) => (s >= 0.1 ? `${s.toFixed(2)} s` : s >= 1e-3 ? `${(s * 1e3).toFixed(2)} ms` : `${(s * 1e6).toFixed(0)} µs`);
  return (
    <div className="rounded-md border bg-foreground p-2 text-background">
      <div className="flex justify-between gap-2 px-1 pb-1 font-mono text-[10px] opacity-80">
        {channels.map((c, i) => <span key={c.label}>CH{i + 1} {c.label}</span>)}
        <span>{fmt(span / 10)}/div</span>
      </div>
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label="Oscilloscope trace">
        <g className="stroke-background" strokeOpacity={0.12} strokeWidth={1}>
          {Array.from({ length: 11 }, (_, i) => <line key={i} x1={x((i / 10) * span)} x2={x((i / 10) * span)} y1={0} y2={150} />)}
        </g>
        {channels.map((c, k) => {
          const top = 5 + k * rowH, bottom = top + rowH - 10;
          const y = (v: number) => bottom - (Math.max(0, Math.min(c.vmax, v)) / c.vmax) * (bottom - top);
          const pts = Array.from({ length: 401 }, (_, i) => { const t = (i / 400) * span; return `${x(t).toFixed(1)},${y(c.v(t)).toFixed(1)}`; });
          return (
            <g key={c.label}>
              <line x1={0} x2={W} y1={bottom} y2={bottom} className="stroke-background" strokeOpacity={0.2} />
              <polyline points={pts.join(" ")} fill="none" className={c.tone === "warning" ? "stroke-warning" : "stroke-success"} strokeWidth={1.8} />
              <text x={W - 4} y={top + 9} fontSize={9} textAnchor="end" className={`font-mono ${c.tone === "warning" ? "fill-warning" : "fill-success"}`}>{c.vmax} V</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

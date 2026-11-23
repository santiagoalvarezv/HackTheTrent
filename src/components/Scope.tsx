interface Props {
  tHigh: number;
  tLow: number;
  vcc: number;
  voh: number;
}

/** Two-channel trace: V_C1 between 1/3 and 2/3 VCC, and V_OUT. Three periods. */
export function Scope({ tHigh, tLow, vcc, voh }: Props) {
  const W = 320, H = 150, pad = 4;
  const T = tHigh + tLow;
  const span = 3 * T;
  const tauC = tHigh / Math.LN2, tauD = tLow / Math.LN2;
  const lo = vcc / 3, hi = (2 * vcc) / 3;
  const x = (t: number) => pad + (t / span) * (W - 2 * pad);
  const ch1Y = (v: number) => 70 - (v / vcc) * 60; // top half
  const ch2Y = (v: number) => 142 - (v / vcc) * 60; // bottom half
  const c1: string[] = [], out: string[] = [];
  for (let i = 0; i <= 300; i++) {
    const t = (i / 300) * span;
    const ph = t % T;
    const v = ph < tHigh ? vcc - (vcc - lo) * Math.exp(-ph / tauC) : hi * Math.exp(-(ph - tHigh) / tauD);
    c1.push(`${x(t).toFixed(1)},${ch1Y(v).toFixed(1)}`);
  }
  for (let k = 0; k < 3; k++) {
    const t0 = k * T;
    out.push(`${x(t0)},${ch2Y(voh)}`, `${x(t0 + tHigh)},${ch2Y(voh)}`, `${x(t0 + tHigh)},${ch2Y(0)}`, `${x(t0 + T)},${ch2Y(0)}`, `${x(t0 + T)},${ch2Y(voh)}`);
  }
  return (
    <div className="rounded-xl bg-hero p-3 text-hero-foreground shadow-soft">
      <div className="flex justify-between px-1 pb-1 font-mono text-[10px] opacity-80">
        <span>CH1 V_C1 1 V/div</span>
        <span>{(span / 10).toFixed(2)} s/div</span>
        <span>CH2 V_OUT</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Oscilloscope trace of C1 voltage and output">
        <g className="stroke-hero-foreground" strokeOpacity={0.12} strokeWidth={1}>
          {Array.from({ length: 11 }, (_, i) => <line key={`v${i}`} x1={x((i / 10) * span)} x2={x((i / 10) * span)} y1={0} y2={H} />)}
          {[0, 1, 2, 3].map((v) => <line key={`a${v}`} x1={0} x2={W} y1={ch1Y(v)} y2={ch1Y(v)} />)}
          {[0, 3].map((v) => <line key={`b${v}`} x1={0} x2={W} y1={ch2Y(v)} y2={ch2Y(v)} />)}
        </g>
        <g strokeDasharray="3 3" className="stroke-warning" strokeOpacity={0.6}>
          <line x1={0} x2={W} y1={ch1Y(hi)} y2={ch1Y(hi)} />
          <line x1={0} x2={W} y1={ch1Y(lo)} y2={ch1Y(lo)} />
        </g>
        <polyline points={c1.join(" ")} fill="none" className="stroke-warning" strokeWidth={1.8} />
        <polyline points={out.join(" ")} fill="none" className="stroke-success" strokeWidth={1.8} />
        <text x={W - 40} y={ch1Y(hi) - 3} fontSize={9} className="fill-warning font-mono">2.0 V</text>
        <text x={W - 40} y={ch1Y(lo) + 10} fontSize={9} className="fill-warning font-mono">1.0 V</text>
        <line y1={0} y2={H} className="stroke-hero-foreground" strokeOpacity={0.5}>
          <animate attributeName="x1" from={pad} to={W - pad} dur={`${span}s`} repeatCount="indefinite" />
          <animate attributeName="x2" from={pad} to={W - pad} dur={`${span}s`} repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

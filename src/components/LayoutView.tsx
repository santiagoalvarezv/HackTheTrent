import { netOf, RAIL_HOLES, type RailId } from "@/lessons/board";
import { colLetter, parseStrip } from "@/lessons/stripboard";
import type { Lesson, LessonComponent } from "@/lessons/types";
import { cn } from "@/lib/utils";

const S = 16; // px per pitch
const OFFBOARD = new Set(["battery", "battery9v", "usb5v", "motor", "speaker"]);

/** Hole id → [x, y] in layout px. */
type Grid = { at: (pin: string) => [number, number] | null; w: number; h: number };

function stripGrid(cols: number, rows: number): Grid {
  const ox = 30, oy = 26;
  return {
    w: ox + cols * S + 70, h: oy + rows * S + 10,
    at: (pin) => { const p = parseStrip(pin); return p ? [ox + p.col * S + S / 2, oy + (p.row - 1) * S + S / 2] : null; },
  };
}

const BB_ROW_Y: Record<string, number> = { "top-": 0, "top+": 1, a: 3, b: 4, c: 5, d: 6, e: 7, f: 9.5, g: 10.5, h: 11.5, i: 12.5, j: 13.5, "bot-": 15.5, "bot+": 16.5 };
function breadGrid(): Grid {
  const ox = 24, oy = 22;
  return {
    w: ox + 30 * S + 40, h: oy + 17.5 * S + 6,
    at: (pin) => {
      const r = /^(top\+|top-|bot\+|bot-):(\d+)$/.exec(pin);
      if (r) { const i = Number(r[2]); const x = 0.5 + i + Math.floor(i / 5) + 0.5; return [ox + x * S, oy + BB_ROW_Y[r[1]!]! * S + S / 2]; }
      const h = /^([a-j])(\d+)$/.exec(pin);
      if (h) return [ox + (Number(h[2]) - 1) * S + S / 2, oy + BB_ROW_Y[h[1]!]! * S + S / 2];
      return null;
    },
  };
}

/** Classic top-view planning diagram: veroboard (strips, cuts, links) or breadboard. */
export function LayoutView({ lesson, placed, focus, cutsVisible }: { lesson: Lesson; placed: string[]; focus: string[]; cutsVisible: boolean }) {
  const sb = lesson.stripboard;
  const g = sb ? stripGrid(sb.cols, sb.rows) : breadGrid();
  const focusPins = new Set(lesson.components.filter((c) => focus.includes(c.ref)).flatMap((c) => Object.values(c.pins)));
  const focusNets = new Set([...focusPins].filter((p) => !p.startsWith("S:")).map(netOf));
  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} className="w-full font-mono" role="img" aria-label="Board layout">
      {sb ? <StripBase cols={sb.cols} rows={sb.rows} cuts={cutsVisible ? sb.cuts : []} focusPins={focusPins} g={g} /> : <BreadBase g={g} focusNets={focusNets} />}
      {lesson.components.map((c) => (
        <PartOutline key={c.ref} c={c} g={g} placed={placed.includes(c.ref)} focus={focus.includes(c.ref)} />
      ))}
    </svg>
  );
}

function StripBase({ cols, rows, cuts, focusPins, g }: { cols: number; rows: number; cuts: string[]; focusPins: Set<string>; g: Grid }) {
  const segHi = new Set<string>();
  for (const p of focusPins) {
    const s = parseStrip(p);
    if (!s) continue;
    const cs = cuts.map(parseStrip).filter((c) => c && c.row === s.row).map((c) => c!.col);
    const lo = Math.max(-1, ...cs.filter((c) => c < s.col)) + 1, hi = Math.min(cols, ...cs.filter((c) => c > s.col)) - 1;
    for (let c = lo; c <= hi; c++) segHi.add(`${c}:${s.row}`);
  }
  return (
    <g>
      {Array.from({ length: rows }, (_, r) => {
        const [x0, y] = g.at(`S:A${r + 1}`)!;
        return <rect key={r} x={x0 - S / 2 + 1} y={y - S * 0.36} width={cols * S - 2} height={S * 0.72} rx={2} className="fill-warning/25" />;
      })}
      {[...segHi].map((k) => {
        const [c, r] = k.split(":").map(Number);
        const [x, y] = g.at(`S:${colLetter(c!)}${r}`)!;
        return <rect key={k} x={x - S / 2} y={y - S * 0.36} width={S} height={S * 0.72} className="fill-primary/30" />;
      })}
      {Array.from({ length: cols }, (_, c) => {
        const [x] = g.at(`S:${colLetter(c)}1`)!;
        return <text key={c} x={x} y={14} fontSize={9} textAnchor="middle" className="fill-muted-foreground">{colLetter(c)}</text>;
      })}
      {Array.from({ length: rows }, (_, r) => {
        const [, y] = g.at(`S:A${r + 1}`)!;
        return <text key={r} x={18} y={y + 3} fontSize={9} textAnchor="end" className="fill-muted-foreground">{r + 1}</text>;
      })}
      {Array.from({ length: cols * rows }, (_, i) => {
        const [x, y] = g.at(`S:${colLetter(i % cols)}${Math.floor(i / cols) + 1}`)!;
        return <circle key={i} cx={x} cy={y} r={1.6} className="fill-muted-foreground/60" />;
      })}
      {cuts.map((cut) => {
        const [x, y] = g.at(cut)!;
        return <path key={cut} d={`M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}`} strokeWidth={2} className="stroke-destructive" />;
      })}
    </g>
  );
}

function BreadBase({ g, focusNets }: { g: Grid; focusNets: Set<string> }) {
  const rails: RailId[] = ["top-", "top+", "bot-", "bot+"];
  return (
    <g>
      {Array.from({ length: 30 }, (_, i) => (["a", "f"] as const).map((r0) => {
        const [x, y] = g.at(`${r0}${i + 1}`)!;
        const hi = focusNets.has(netOf(`${r0}${i + 1}`));
        return <rect key={`${i}${r0}`} x={x - S * 0.32} y={y - S * 0.4} width={S * 0.64} height={S * 4.8} rx={2} className={hi ? "fill-primary/30" : "fill-muted"} />;
      }))}
      {rails.map((id) => {
        const [x0, y] = g.at(`${id}:0`)!;
        const [x1] = g.at(`${id}:${RAIL_HOLES - 1}`)!;
        const hi = focusNets.has(netOf(`${id}:0`));
        return <rect key={id} x={x0 - S * 0.45} y={y - S * 0.32} width={x1 - x0 + S * 0.9} height={S * 0.64} rx={2}
          className={hi ? "fill-primary/30" : id.endsWith("+") ? "fill-destructive/15" : "fill-primary/10"} />;
      })}
      {Array.from({ length: 30 }, (_, i) => {
        const [x] = g.at(`a${i + 1}`)!;
        return (i + 1) % 5 === 0 || i === 0 ? <text key={i} x={x} y={12} fontSize={9} textAnchor="middle" className="fill-muted-foreground">{i + 1}</text> : null;
      })}
      {"abcdefghij".split("").map((r) => {
        const [, y] = g.at(`${r}1`)!;
        return <text key={r} x={10} y={y + 3} fontSize={9} textAnchor="middle" className="fill-muted-foreground">{r}</text>;
      })}
      {rails.map((id) => {
        const [, y] = g.at(`${id}:0`)!;
        return <text key={id} x={10} y={y + 3} fontSize={9} textAnchor="middle" className={id.endsWith("+") ? "fill-destructive" : "fill-primary"}>{id.endsWith("+") ? "+" : "−"}</text>;
      })}
    </g>
  );
}

function PartOutline({ c, g, placed, focus }: { c: LessonComponent; g: Grid; placed: boolean; focus: boolean }) {
  const pins = Object.entries(c.pins).map(([n, p]) => [n, g.at(p)] as const).filter((e): e is [string, [number, number]] => !!e[1]);
  if (!pins.length) return null;
  const cls = cn(focus ? "stroke-primary" : "stroke-foreground", !placed && "opacity-25");
  const xs = pins.map(([, p]) => p[0]), ys = pins.map(([, p]) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const label = <text x={Math.max(...xs) + 6} y={Math.min(...ys) - 4} fontSize={9} className={cn(focus ? "fill-primary" : "fill-foreground", !placed && "opacity-25")}>{c.ref}</text>;
  const dots = pins.map(([n, [x, y]]) => <circle key={n} cx={x} cy={y} r={2.6} className={cn(focus ? "fill-primary" : "fill-foreground", !placed && "opacity-25")} />);
  if (c.kind === "wire") {
    const [a, b] = pins.map(([, p]) => p);
    return <g className={cn(!placed && "opacity-25")}><line x1={a![0]} y1={a![1]} x2={b![0]} y2={b![1]} stroke={c.color} strokeWidth={focus ? 4 : 3} strokeLinecap="round" />{dots}</g>;
  }
  if (OFFBOARD.has(c.kind)) {
    return (
      <g>
        {pins.map(([n, [x, y]]) => (
          <g key={n}>
            <line x1={x} y1={y} x2={x + 9} y2={y - 5} strokeWidth={2} className={cn(n === "pos" ? "stroke-destructive" : "stroke-foreground", !placed && "opacity-25")} />
            <text x={x + 10} y={y - 4} fontSize={8} className={cn(focus ? "fill-primary" : "fill-foreground", !placed && "opacity-25")}>{c.ref}{n === "pos" ? "+" : "−"}</text>
          </g>
        ))}
        {dots}
      </g>
    );
  }
  const pad = S * 0.45;
  return (
    <g>
      <rect x={Math.min(...xs) - pad} y={Math.min(...ys) - pad} width={Math.max(...xs) - Math.min(...xs) + 2 * pad} height={Math.max(...ys) - Math.min(...ys) + 2 * pad}
        rx={c.kind.startsWith("ic") ? 2 : 6} fill="none" strokeWidth={focus ? 2 : 1.3} className={cls} />
      {(c.kind === "led" || c.kind === "capacitor_electrolytic" || c.kind === "buzzer") && (() => {
        const p = g.at(c.pins[c.kind === "led" ? "anode" : "pos"]!)!;
        return <text x={p[0] - 3} y={p[1] - 5} fontSize={8} className={cn("fill-destructive", !placed && "opacity-25")}>+</text>;
      })()}
      {c.kind.startsWith("ic") && (() => {
        const p = g.at(c.pins["1"]!)!;
        return <circle cx={p[0] + (cx > p[0] ? 5 : -5)} cy={p[1] + (cy > p[1] ? 5 : -5)} r={1.6} className="fill-foreground" />;
      })()}
      {dots}
      {label}
    </g>
  );
}

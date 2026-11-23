import type { SchematicLayout, SchematicSymbol } from "@/lessons/types";
import { cn } from "@/lib/utils";

interface Props {
  layout: SchematicLayout;
  placed: string[];
  focus: string[];
  pressed?: string[];
  reversed?: string[];
  readout: string;
  readoutTone?: "normal" | "error";
  flowing?: boolean;
}

/** Schematic drawn from lesson data with standard (IEC) symbols. */
export function Schematic({ layout, placed, focus, pressed = [], reversed = [], readout, readoutTone = "normal", flowing }: Props) {
  const stroke = (ref?: string) =>
    cn(
      "transition-colors",
      ref && focus.includes(ref) ? "stroke-primary" : "stroke-foreground",
      ref && !placed.includes(ref) && "opacity-30 [stroke-dasharray:4_3]",
    );
  return (
    <svg viewBox={`0 0 ${layout.w} ${layout.h}`} className="w-full font-mono" role="img" aria-label="Circuit schematic">
      <defs>
        <marker id="sch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" className="fill-primary" />
        </marker>
      </defs>
      <g fill="none" strokeWidth={2} strokeLinecap="square">
        {layout.wires.map((w, i) => (
          <polyline key={i} points={w.pts.map((p) => p.join(",")).join(" ")} className={stroke(w.ref)} />
        ))}
        {layout.symbols.map((s) => (
          <g key={s.ref} className={stroke(s.ref)}>
            <SymbolShape s={s} pressed={pressed.includes(s.ref)} reversed={reversed.includes(s.ref)} />
          </g>
        ))}
      </g>
      <g fontSize={11}>
        {layout.symbols.map((s) =>
          s.text.map((t, i) => (
            <text key={`${s.ref}-${i}`} x={s.label[0]} y={s.label[1] + i * 13}
              className={i === 0 ? (focus.includes(s.ref) ? "fill-primary" : "fill-foreground") : "fill-muted-foreground"}>
              {t}
            </text>
          )),
        )}
      </g>
      <text x={layout.readout[0]} y={layout.readout[1]} fontSize={12} className={readoutTone === "error" ? "fill-destructive" : "fill-foreground"}>
        {readout}
      </text>
      {flowing && (
        <path d={`M${layout.readout[0] + 100} ${layout.readout[1] - 4} h80`} className="stroke-primary" strokeWidth={1.5} markerEnd="url(#sch-arrow)" />
      )}
    </svg>
  );
}

function SymbolShape({ s, pressed, reversed }: { s: SchematicSymbol; pressed: boolean; reversed: boolean }) {
  const rot = (s.rot ?? 0) + (reversed ? 180 : 0);
  const t = `translate(${s.x} ${s.y}) rotate(${rot})`;
  switch (s.kind) {
    case "battery":
    case "battery9v":
    case "usb5v":
      return (
        <g transform={t}>
          <path d="M-20 0 H-4 M4 0 H20" />
          <path d="M-4 -14 V14" strokeWidth={2.5} />
          <path d="M4 -7 V7" strokeWidth={4.5} />
          <path d="M-12 -14 v-6 M-15 -17 h6" strokeWidth={1.2} />
        </g>
      );
    case "resistor":
      return (
        <g transform={t}>
          <path d="M-20 0 H-12 M12 0 H20" />
          <rect x={-12} y={-5} width={24} height={10} />
        </g>
      );
    case "led":
      return (
        <g transform={t}>
          <path d="M-20 0 H-8 M8 0 H20" />
          <path d="M-8 -10 L-8 10 L8 0 Z" />
          <path d="M8 -10 V10" />
          <path d="M0 -12 L8 -22 M6 -10 L14 -20" strokeWidth={1.4} />
          <path d="M8 -22 l-5 1 M8 -22 l-1 5 M14 -20 l-5 1 M14 -20 l-1 5" strokeWidth={1.4} />
        </g>
      );
    case "capacitor_electrolytic":
      return (
        <g transform={t}>
          <path d="M-20 0 H-3 M5 0 H20" />
          <path d="M-3 -11 V11" />
          <path d="M7 -11 Q3 0 7 11" />
          <path d="M-12 -14 v-6 M-15 -17 h6" strokeWidth={1.2} />
        </g>
      );
    case "capacitor_ceramic":
      return (
        <g transform={t}>
          <path d="M-20 0 H-3 M3 0 H20" />
          <path d="M-3 -11 V11 M3 -11 V11" />
        </g>
      );
    case "pushbutton":
      return (
        <g transform={t}>
          <path d="M-20 0 H-10 M10 0 H20" />
          <circle cx={-10} cy={0} r={2} />
          <circle cx={10} cy={0} r={2} />
          <g transform={pressed ? "translate(0 6)" : undefined} className="transition-transform">
            <path d="M-12 -8 H12 M0 -8 V-16 M-5 -16 H5" />
          </g>
        </g>
      );
    case "buzzer":
      return (
        <g transform={t}>
          <path d="M-20 0 H-10 M10 0 H20" />
          <path d="M-10 -6 V6 M10 -6 V6 M-10 6 H10" />
          <path d="M-10 -6 A10 10 0 0 1 10 -6" />
          <path d="M-16 -9 v-6 M-19 -12 h6" strokeWidth={1.2} />
        </g>
      );
    case "ic555": {
      const pins: [string, number, number, number, number, string][] = [
        ["8", -15, -50, -15, -65, "VCC"], ["4", 15, -50, 15, -65, "RST"],
        ["7", -40, -25, -55, -25, "DIS"], ["6", -40, 0, -55, 0, "THR"], ["2", -40, 25, -55, 25, "TRG"],
        ["3", 40, 0, 55, 0, "OUT"], ["1", -15, 50, -15, 65, "GND"], ["5", 15, 50, 15, 65, "CV"],
      ];
      return (
        <g transform={`translate(${s.x} ${s.y})`}>
          <rect x={-40} y={-50} width={80} height={100} />
          {pins.map(([n, x1, y1, x2, y2, name]) => (
            <g key={n}>
              <path d={`M${x1} ${y1} L${x2} ${y2}`} />
              <text x={x1 + (x1 === -40 ? 4 : x1 === 40 ? -24 : -9)} y={y1 + (y1 === -50 ? 12 : y1 === 50 ? -5 : 4)}
                fontSize={8} stroke="none" className="fill-muted-foreground">{name}</text>
              <text x={x2 + (x2 < -40 ? 2 : x2 > 40 ? -8 : 3)} y={y2 + (y2 < -50 ? 8 : y2 > 50 ? -3 : -3)}
                fontSize={8} stroke="none" className="fill-foreground">{n}</text>
            </g>
          ))}
        </g>
      );
    }
    case "ldr":
      return (
        <g transform={t}>
          <path d="M-20 0 H-12 M12 0 H20" />
          <rect x={-12} y={-5} width={24} height={10} />
          <path d="M-10 -20 L-3 -9 M0 -22 L7 -11" strokeWidth={1.4} />
          <path d="M-3 -9 l-1 -5 M-3 -9 l-5 -1 M7 -11 l-1 -5 M7 -11 l-5 -1" strokeWidth={1.4} />
        </g>
      );
    case "diode":
      return (
        <g transform={t}>
          <path d="M-20 0 H-8 M8 0 H20" />
          <path d="M-8 -9 L-8 9 L8 0 Z" />
          <path d="M8 -9 V9" />
        </g>
      );
    case "pot":
      return (
        <g transform={t}>
          <path d="M-20 0 H-12 M12 0 H20" />
          <rect x={-12} y={-5} width={24} height={10} />
          <path d="M0 18 V7" />
          <path d="M0 7 l-3 5 M0 7 l3 5" strokeWidth={1.4} />
        </g>
      );
    case "npn":
      return (
        <g transform={t}>
          <circle cx={4} cy={0} r={15} />
          <path d="M-20 0 H-3 M-3 -10 V10" />
          <path d="M-3 -5 L10 -14 V-20 M-3 5 L10 14 V20" />
          <path d="M10 14 l-6 -1 M10 14 l-2 -5" strokeWidth={1.6} />
        </g>
      );
    case "mosfet":
      return (
        <g transform={t}>
          <path d="M-20 0 H-6 M-6 -10 V10" />
          <path d="M-2 -12 V-6 M-2 -3 V3 M-2 6 V12" strokeWidth={2.4} />
          <path d="M-2 -9 H10 V-20 M-2 9 H10 V20 M-2 0 H10 V9" />
          <path d="M-2 0 l5 -3 M-2 0 l5 3" strokeWidth={1.4} />
        </g>
      );
    case "motor":
      return (
        <g transform={t}>
          <path d="M-20 0 H-12 M12 0 H20" />
          <circle cx={0} cy={0} r={12} />
          <text x={-5} y={5} fontSize={13} stroke="none" className="fill-current" transform={`rotate(${-rot} 0 0)`}>M</text>
        </g>
      );
    case "speaker":
      return (
        <g transform={t}>
          <path d="M-20 0 H-8 M8 0 H20" />
          <rect x={-8} y={-4} width={16} height={8} />
          <path d="M-8 -4 L-14 -14 H14 L8 -4" />
        </g>
      );
    case "header":
      return (
        <g transform={t}>
          <circle cx={0} cy={-20} r={3} />
          <circle cx={0} cy={20} r={3} />
          <path d="M0 -17 V-10 M0 17 V10" />
        </g>
      );
    case "opamp":
      return (
        <g transform={`translate(${s.x} ${s.y})`}>
          <path d="M-20 -26 L-20 26 L25 0 Z" />
          <path d="M-35 -12 H-20 M-35 12 H-20 M25 0 H35 M0 -14 V-30 M0 14 V30" />
          <text x={-17} y={-8} fontSize={11} stroke="none" className="fill-current">+</text>
          <text x={-17} y={16} fontSize={11} stroke="none" className="fill-current">−</text>
          <text x={-33} y={-15} fontSize={8} stroke="none" className="fill-foreground">3</text>
          <text x={-33} y={23} fontSize={8} stroke="none" className="fill-foreground">2</text>
          <text x={28} y={-3} fontSize={8} stroke="none" className="fill-foreground">1</text>
          <text x={3} y={-24} fontSize={8} stroke="none" className="fill-foreground">8</text>
          <text x={3} y={28} fontSize={8} stroke="none" className="fill-foreground">4</text>
        </g>
      );
    case "ic": {
      const ic = s.ic;
      if (!ic) return null;
      const hw = ic.w / 2, hh = ic.h / 2;
      return (
        <g transform={`translate(${s.x} ${s.y})`}>
          <rect x={-hw} y={-hh} width={ic.w} height={ic.h} />
          {ic.pins.map(([n, name, side, off]) => {
            const [x1, y1, x2, y2] =
              side === "l" ? [-hw, off, -hw - 15, off] : side === "r" ? [hw, off, hw + 15, off] : side === "t" ? [off, -hh, off, -hh - 15] : [off, hh, off, hh + 15];
            const lx = side === "l" ? x1 + 3 : side === "r" ? x1 - 3 : x1;
            const ly = side === "t" ? y1 + 10 : side === "b" ? y1 - 4 : y1 + 3;
            const anchor = side === "l" ? "start" : side === "r" ? "end" : "middle";
            return (
              <g key={n + name}>
                <path d={`M${x1} ${y1} L${x2} ${y2}`} />
                <text x={lx} y={ly} fontSize={8} textAnchor={anchor} stroke="none" className="fill-muted-foreground">{name}</text>
                <text x={x2 + (side === "l" ? 1 : side === "r" ? -7 : 3)} y={y2 + (side === "t" ? 9 : side === "b" ? -3 : -3)} fontSize={8} stroke="none" className="fill-foreground">{n}</text>
              </g>
            );
          })}
        </g>
      );
    }
    default:
      return null;
  }
}

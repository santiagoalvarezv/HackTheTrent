import { Car } from "lucide-react";
import { LED_MAX_MA } from "@/lessons/circuit";

interface Props {
  title: string;
  text: string;
  interaction: string;
  ohms: number;
  currentMa: number;
  level: number;
  onOhms: (r: number) => void;
}

/** Real-world application for P-01: LED current sets headlight brightness. */
export function RealWorldHeadlight({ title, text, interaction, ohms, currentMa, level, onOhms }: Props) {
  return (
    <section className="card-soft p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Car className="size-4" /></span>
        <div>
          <p className="label-caps">Real-world application</p>
          <h2 className="font-semibold">{title}</h2>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <p className="mt-4 text-sm">{interaction}</p>
      <label className="mt-2 block text-sm">
        <span className="flex justify-between"><span>R1</span><span className="font-mono">{ohms} Ω</span></span>
        <input type="range" min={100} max={1000} step={10} value={ohms} onChange={(e) => onOhms(Number(e.target.value))} className="mt-1 w-full accent-primary" />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="rounded-lg bg-muted p-3"><div className="text-muted-foreground">LED current</div><div className="mt-1 text-base text-foreground">{currentMa.toFixed(1)} mA</div></div>
        <div className="rounded-lg bg-muted p-3"><div className="text-muted-foreground">Of {LED_MAX_MA} mA rating</div><div className="mt-1 text-base text-foreground">{Math.round(level * 100)} %</div></div>
      </div>
      <div className="mt-4 rounded-xl bg-secondary p-4 font-mono text-xs leading-relaxed text-secondary-foreground">
        <div>I = (V_supply − V_f) / (R1 + R_int)</div>
        <div>I = (3.0 V − 2.0 V) / ({ohms} Ω + 2 Ω)</div>
        <div className="font-semibold">I ≈ {currentMa.toFixed(1)} mA</div>
        <div className="mt-2">P_LED = V_f · I ≈ {(2 * currentMa).toFixed(1)} mW</div>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="border-b text-left"><th className="label-caps py-2 font-normal"></th><th className="label-caps font-normal">Lab circuit</th><th className="label-caps font-normal">Car headlight</th></tr></thead>
        <tbody>
          <tr className="border-b"><td className="py-2 pr-2 text-muted-foreground">Supply</td><td className="font-mono text-xs">2×AA, 3.0 V</td><td className="font-mono text-xs">Battery, 12 V</td></tr>
          <tr className="border-b"><td className="py-2 pr-2 text-muted-foreground">Current limit</td><td className="font-mono text-xs">R1 resistor</td><td className="font-mono text-xs">LED driver</td></tr>
          <tr><td className="py-2 pr-2 text-muted-foreground">LED current</td><td className="font-mono text-xs">{currentMa.toFixed(1)} mA</td><td className="font-mono text-xs">≈ 350–1000 mA</td></tr>
        </tbody>
      </table>
    </section>
  );
}

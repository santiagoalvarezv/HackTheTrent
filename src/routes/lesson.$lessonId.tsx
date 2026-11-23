import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Gauge, Hash, Layers, Package, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Schematic } from "@/components/Schematic";
import { LayoutView } from "@/components/LayoutView";
import { Scope } from "@/components/Scope";
import { Button } from "@/components/ui/button";
import { Workbench, type LedDrive } from "@/components/workbench/Workbench";
import { useBuzzer } from "@/hooks/use-buzzer";
import { PlotScope } from "@/components/PlotScope";
import { RealWorldHeadlight } from "@/components/RealWorldHeadlight";
import { CarScene } from "@/components/workbench/CarScene";
import { AlarmScene, BeaconScene, InteriorScene } from "@/components/workbench/AppScenes";
import { RealWorldPanel } from "@/components/RealWorldPanel";
import { fmtOhm, netOptions, simulate, type Sim } from "@/lessons/models";
import {
  BUZZER_HZ, LED_MAX_MA, SUPPLY_V, TLC555_VOH,
  evaluateAstable, evaluateCircuit, ledCurrentMa, statusMessage, type CircuitResult,
} from "@/lessons/circuit";
import { getLesson } from "@/lessons/data";
import { ICON_STROKE, lessonLook, lessonNumber, stepIcon } from "@/lessons/look";
import { saveStep } from "@/lessons/progress";
import { fetchStep, saveCloud } from "@/lessons/cloud-progress";
import { useAuth } from "@/hooks/use-auth";
import { guestStep, saveGuestStep, useGuest } from "@/lessons/guest";
import {
  EMPTY_BUILD, FREE_KEYS, FULL_BUILD, PLACEMENT_OPTIONS, allComponents, placedRefs, toComponents,
  type BuildState, type FreeKey,
} from "@/lessons/layout";
import type { Lesson, LessonComponent } from "@/lessons/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lesson/$lessonId")({
  ssr: false,
  loader: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    if (!lesson || !lesson.playable) throw notFound();
    return { lesson };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.lesson.title ?? "Lesson"} — Hack the Trent` },
      { name: "description", content: loaderData?.lesson.tagline ?? "A step-by-step 3D breadboard lesson." },
      { property: "og:title", content: `${loaderData?.lesson.title ?? "Lesson"} — Hack the Trent` },
      { property: "og:description", content: loaderData?.lesson.tagline ?? "A step-by-step 3D breadboard lesson." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { lesson } = Route.useLoaderData();
  const { user, ready } = useAuth();
  const guest = useGuest();
  const gateNav = useNavigate();
  const blocked = ready && !user && !guest;
  useEffect(() => {
    // Not signed in and not a guest yet: show the sign-in screen first, then come back here.
    if (blocked) gateNav({ to: "/auth", search: { redirect: `/lesson/${lesson.id}` }, replace: true });
  }, [blocked, gateNav, lesson.id]);
  const [mode, setMode] = useState<"guided" | "free">("guided");
  const { accent } = lessonLook(lesson.id);
  const top = (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
      <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft /> Back to lessons</Link></Button>
      {lesson.freeBuild && (
        <div className="flex items-center gap-1">
          {(["guided", "free"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", mode === m ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>
              {m === "guided" ? "Step by step" : "Try it yourself"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  if (!ready || blocked) return <div className="h-dvh w-screen bg-background" aria-busy />;
  return (
    <PanelTop.Provider value={top}>
      <div className={cn("h-dvh w-screen overflow-hidden bg-background", accent)}>
        {mode === "guided" || !lesson.freeBuild ? <Guided key={lesson.id} lesson={lesson} /> : <Free lesson={lesson} />}
      </div>
    </PanelTop.Provider>
  );
}

const PanelTop = createContext<ReactNode>(null);

/** Desktop: sidebar left, simulator fills the rest. Below 1024px: simulator on top (60vh), content below. */
function Layout({ scene, panel, xray, onXray }: { scene: ReactNode; panel: ReactNode; xray?: boolean; onXray?: () => void }) {
  const top = useContext(PanelTop);
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="relative h-[60vh] w-full shrink-0 bg-scene lg:order-2 lg:h-full lg:min-w-0 lg:flex-1">
        {scene}
        {onXray && (
          <Button variant={xray ? "default" : "outline"} size="sm" className="absolute right-4 top-4 rounded-full shadow-soft" aria-pressed={!!xray} onClick={onXray}>
            <Layers /> X-ray
          </Button>
        )}
        <p className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-card/90 px-3 py-1.5 shadow-soft font-mono text-xs text-muted-foreground">
          drag: rotate · scroll/pinch: zoom
        </p>
      </div>
      <aside className="flex w-full shrink-0 flex-col bg-card shadow-lift lg:order-1 lg:h-full lg:w-[max(380px,30%)] lg:overflow-y-auto">
        {top}
        {panel}
      </aside>
    </div>
  );
}

const TONE = {
  neutral: "border-border bg-muted",
  ok: "border-success bg-success/10",
  warn: "border-warning bg-warning/15",
  error: "border-destructive bg-destructive/10",
};

function StatusBox({ title, text, tone }: { title: string; text: string; tone: keyof typeof TONE }) {
  return (
    <div className={cn("rounded-xl border-l-4 p-4 shadow-soft", TONE[tone])} role="status">
      <p className="flex items-center gap-2 font-semibold">
        {tone === "ok" ? <Check className="size-4 text-success" /> : tone !== "neutral" ? <AlertTriangle className="size-4" /> : null}
        {title}
      </p>
      <p className="mt-1 font-mono text-xs leading-relaxed">{text}</p>
    </div>
  );
}

function Bom({ components }: { components: LessonComponent[] }) {
  const wires = components.filter((c) => c.kind === "wire");
  const rows: { ref: string; name: string; value: string; qty: number }[] = components
    .filter((c) => c.kind !== "wire" || wires.length <= 2)
    .map((c) => ({ ref: c.ref, name: c.name, value: c.value, qty: 1 }));
  if (wires.length > 2) rows.push({ ref: `${wires[0]!.ref}–${wires[wires.length - 1]!.ref}`, name: "Jumper wires, pre-cut, assorted", value: "22 AWG", qty: wires.length });
  return (
    <div className="overflow-x-auto rounded-2xl border shadow-soft"><table className="w-full min-w-[420px] text-sm">
      <thead>
        <tr className="bg-primary text-left text-primary-foreground">
          {([["Ref", Hash], ["Part", Package], ["Value", Gauge], ["Qty", Layers]] as const).map(([h, Icon]) => (
            <th key={h} className={cn("px-4 py-3 font-mono text-[0.72rem] font-semibold uppercase tracking-wider", h === "Qty" && "text-right")}>
              <span className={cn("inline-flex items-center gap-1.5", h === "Qty" && "flex-row-reverse")}><Icon className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden />{h}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.ref} className="align-top odd:bg-card even:bg-secondary/70">
            <td className="whitespace-nowrap px-4 py-2.5 font-mono font-medium">{p.ref}</td>
            <td className="px-4 py-2.5">{p.name}</td>
            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs leading-5">{p.value}</td>
            <td className="px-4 py-2.5 text-right font-mono">{p.qty}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

function SchematicCard({ lesson, placed, focus, pressed, reversed, readout, error, flowing, cutsVisible }: {
  lesson: Lesson; placed: string[]; focus: string[]; pressed?: string[]; reversed?: string[]; readout: string; error?: boolean; flowing?: boolean; cutsVisible?: boolean;
}) {
  const [tab, setTab] = useState<"schematic" | "layout">("schematic");
  return (
    <div className="card-soft p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex gap-3" role="tablist">
          {(["schematic", "layout"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cn("label-caps", tab === t ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground")}>
              {t === "schematic" ? "Schematic" : "Layout"}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground">{readout}</span>
      </div>
      {tab === "schematic" ? (
        <Schematic layout={lesson.schematic} placed={placed} focus={focus} pressed={pressed ?? []} reversed={reversed ?? []}
          readout={readout} readoutTone={error ? "error" : "normal"} flowing={!!flowing} />
      ) : (
        <LayoutView lesson={lesson} placed={placed} focus={focus} cutsVisible={!!cutsVisible} />
      )}
    </div>
  );
}

const fmtI = (r: CircuitResult) => (r.status === "overcurrent" ? `I > ${LED_MAX_MA} mA` : `I = ${r.currentMa.toFixed(1)} mA`);

/** Hold-to-press state for SW1: pointer on the 3D cap or panel button, or the Space key. */
function usePress(enabled: boolean) {
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!enabled) { setDown(false); return; }
    const up = () => setDown(false);
    const kd = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setDown(true); } };
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") setDown(false); };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [enabled]);
  return [down, setDown] as const;
}

function Guided({ lesson }: { lesson: Lesson }) {
  const [i, setI] = useState(0);
  const { user } = useAuth();
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    if (!user) { const g = guestStep(lesson.id); if (g > 0) setI(Math.min(g, lesson.steps.length - 1)); return; }
    fetchStep(lesson.id).then((s) => { if (s > 0) setI(Math.min(s, lesson.steps.length - 1)); }).finally(() => setResumed(true));
  }, [user, lesson.id, lesson.steps.length]);
  useEffect(() => {
    if (!user) { saveGuestStep(lesson.id, i); return; }
    saveStep(lesson.id, i);
    if (resumed) void saveCloud(user.id, lesson.id, i);
  }, [lesson.id, i, user, resumed]);
  const [r2, setR2] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [appOhms, setAppOhms] = useState(220);
  const [alarm, setAlarm] = useState(false);
  const [control, setControl] = useState(lesson.control?.initial ?? 0);
  const [releasedAt, setReleasedAt] = useState<number | null>(null);
  const navigate = useNavigate();
  const LessonIcon = lessonLook(lesson.id).icon;
  const step = lesson.steps[i]!;
  const n = lesson.steps.length;
  const last = i === n - 1;
  const live = !!step.live;
  const button = lesson.components.find((c) => c.kind === "pushbutton");
  const appId = step.scene === "application" ? lesson.application?.id : undefined;
  const [down, setDown] = usePress(live && !!button && appId !== "alarm");
  const pressed = button && (down || (appId === "alarm" && alarm)) ? [button.ref] : [];
  const wasDown = useRef(false);
  useEffect(() => {
    if (wasDown.current && !down) setReleasedAt(performance.now() / 1000);
    if (down) setReleasedAt(null);
    wasDown.current = down;
  }, [down]);
  const placedComps = lesson.components.filter((c) => step.placed.includes(c.ref));
  const [xray, setXray] = useState(false);
  // Leads are cut short from the first step that trims them.
  const trimAt = lesson.steps.findIndex((s) => /\btrim(?!mer)/i.test(`${s.title} ${s.text} ${s.detail}`));
  const trimmed = trimAt >= 0 && i >= trimAt;

  const leds: Record<string, LedDrive> = {};
  let status: ReactNode = null;
  let readout = "I = 0.0 mA";
  let error = false;
  let flowing = false;
  let buzzing = false;
  let scope: ReactNode = null;
  let sim: Sim | null = null;
  let application: ReactNode = null;

  if (lesson.model === "series") {
    const res = live ? evaluateCircuit(placedComps, pressed, netOptions(lesson)) : { status: "incomplete" as const, currentMa: 0 };
    for (const c of placedComps) if (c.kind === "led") leds[c.ref] = { mode: res.status === "lit" ? "on" : res.status === "overcurrent" ? "burned" : "off" };
    flowing = res.status === "lit" || res.status === "buzzing";
    buzzing = res.status === "buzzing";
    readout = fmtI(res);
    error = res.status === "overcurrent";
    if (live && res.status === "lit" && step.scene === "application" && lesson.application?.id === "headlight") {
      const ma = ledCurrentMa(appOhms);
      const level = Math.min(1, ma / LED_MAX_MA);
      for (const c of placedComps) if (c.kind === "led") leds[c.ref] = { mode: "on", level: 0.25 + 0.75 * (level / (ledCurrentMa(100) / LED_MAX_MA)) };
      readout = `I = ${ma.toFixed(1)} mA`;
      application = <RealWorldHeadlight {...lesson.application} ohms={appOhms} currentMa={ma} level={level} onOhms={setAppOhms} />;
    }
    const app = lesson.application;
    if (live && app && appId === "interior") {
      application = (
        <RealWorldPanel id="interior" title={app.title} text={app.text} interaction={app.interaction}
          calc={["I = (V_supply − V_f) / R1", "I = (3.0 V − 2.0 V) / 220 Ω", down ? `I ≈ ${res.currentMa.toFixed(1)} mA, interior light on` : "Button released: I = 0 mA"]}
          compare={[["Supply", "2×AA, 3.0 V", "Car battery, 12 V"], ["Switch", "SW1 tactile", "Roof / door switch"], ["Load", "D1 LED", "Interior LED lamp"]]} />
      );
    }
    if (live && app && appId === "alarm") {
      buzzing = alarm; flowing = alarm;
      readout = alarm ? "I ≈ 15 mA" : "I = 0.0 mA";
      application = (
        <RealWorldPanel id="alarm" title={app.title} text={app.text} interaction={app.interaction}
          calc={["P = V · I", "P = 3.0 V · 15 mA", alarm ? "P ≈ 45 mW, siren on" : "Alarm reset: I = 0 mA"]}
          compare={[["Supply", "2×AA, 3.0 V", "Panel, 12 V + backup"], ["Trigger", "SW1 pressed", "Door sensor"], ["Keeps sounding", "Only while held", "Latched until reset"]]}>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="xl" className="flex-1" disabled={alarm} onClick={() => setAlarm(true)}>Activate alarm</Button>
            <Button size="xl" variant="outline" className="flex-1" disabled={!alarm} onClick={() => setAlarm(false)}><RotateCcw /> Reset</Button>
            <Button size="xl" variant="outline" aria-label={muted ? "Unmute buzzer" : "Mute buzzer"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button>
          </div>
        </RealWorldPanel>
      );
      status = <StatusBox tone={alarm ? "ok" : "neutral"} title={alarm ? "Alarm active" : "Alarm armed"} text={alarm ? "BZ1 on, ≈ 15 mA at 3.0 V, tone ≈ 2.3 kHz. Press Reset to silence it." : "An intruder is heading for the door. Press Activate alarm to close SW1 and sound BZ1."} />;
    } else if (application && appId === "headlight") {
      status = <StatusBox tone="ok" title="Circuit closed" text={`I = (3.0 V − 2.0 V) / ${appOhms} Ω ≈ ${ledCurrentMa(appOhms).toFixed(1)} mA, within the ${LED_MAX_MA} mA LED rating.`} />;
    } else if (live) {
      const m = statusMessage(res);
      status = res.status === "open" && button && !down
        ? <StatusBox title={`${button.ref} open`} text={`${button.ref} is released, so the loop is open. I = 0 mA. Hold the button cap or the Space key.`} tone="neutral" />
        : <StatusBox {...m} />;
    }
  } else if (lesson.model !== "astable555") {
    sim = live ? simulate(lesson, placedComps, { control, pressed: down, releasedAt }) : null;
    if (sim) {
      Object.assign(leds, sim.leds);
      readout = sim.readout;
      buzzing = !!sim.buzzer;
      error = sim.tone === "error" && !sim.ok;
      status = <StatusBox tone={sim.tone} title={sim.title} text={sim.text} />;
      if (sim.scope) scope = <PlotScope span={sim.scope.span} channels={sim.scope.channels} />;
    }
  } else {
    const res = live ? evaluateAstable(placedComps, r2 ? { r2 } : {}) : null;
    if (res?.ok) {
      leds["D1"] = { mode: "blink", tHigh: res.tHigh, tLow: res.tLow };
      readout = `f = ${res.f.toFixed(2)} Hz`;
      status = (
        <StatusBox tone="ok" title="Oscillating"
          text={`f = 1 / (0.693·(R1 + 2·R2)·C1) = ${res.f.toFixed(2)} Hz · duty ${(res.duty * 100).toFixed(0)} % · t_high ${res.tHigh.toFixed(2)} s · t_low ${res.tLow.toFixed(2)} s · I_LED ≈ ${res.ledMa.toFixed(1)} mA`} />
      );
      const app = lesson.application;
      scope = appId === "beacon" && app ? (
        <RealWorldPanel id="beacon" title={app.title} text={app.text} interaction={app.interaction}
          calc={["f = 1.44 / ((R1 + 2·R2) · C1)", `f = 1.44 / ((10 kΩ + 2·${(res.r2 / 1000).toFixed(0)} kΩ) · 10 µF)`, `f ≈ ${res.f.toFixed(2)} Hz ≈ ${Math.round(res.f * 60)} flashes/min`]}
          compare={[["Supply", "2×AA, 3.0 V", "12 V battery"], ["Timer", "TLC555", "555 / microcontroller"], ["Flash rate", `${res.f.toFixed(2)} Hz`, "≈ 1–2 Hz"]]}>
          <label className="mt-2 block text-sm">
            <span className="flex justify-between"><span>R2</span><span className="font-mono">{(res.r2 / 1000).toFixed(0)} kΩ</span></span>
            <input type="range" min={10} max={220} step={1} value={res.r2 / 1000} onChange={(e) => setR2(Number(e.target.value) * 1000)} className="mt-1 w-full accent-primary" />
          </label>
        </RealWorldPanel>
      ) : (
        <>
          <Scope tHigh={res.tHigh} tLow={res.tLow} vcc={SUPPLY_V} voh={TLC555_VOH} />
          <label className="block text-sm">
            <span className="flex justify-between"><span>R2</span><span className="font-mono">{(res.r2 / 1000).toFixed(0)} kΩ</span></span>
            <input type="range" min={10} max={220} step={1} value={res.r2 / 1000} onChange={(e) => setR2(Number(e.target.value) * 1000)} className="mt-1 w-full accent-primary" />
            <span className="font-mono text-xs text-muted-foreground">Try values from 10 kΩ to 220 kΩ. The lesson uses 68 kΩ.</span>
          </label>
        </>
      );
    } else if (res) {
      status = <StatusBox tone="warn" title="Not oscillating" text={res.fault ?? ""} />;
    }
  }

  useBuzzer(buzzing, muted, BUZZER_HZ);
  useBuzzer(!!sim?.audio && (sim.audio.gain ?? 0) > 0, muted, sim?.audio?.hz ?? 440, 0.04 * (sim?.audio?.gain ?? 0), "sine");
  const hasSound = lesson.components.some((c) => c.kind === "buzzer" || c.kind === "speaker");

  return (
    <Layout
      scene={step.scene === "application" ? (
        <div key="app" className="h-full animate-in fade-in duration-700">
          {appId === "beacon" ? <BeaconScene {...(() => { const d = leds["D1"]; return d?.mode === "blink" ? { tHigh: d.tHigh, tLow: d.tLow } : { tHigh: 0.54, tLow: 0.47 }; })()} />
            : appId === "interior" ? <InteriorScene on={down} />
            : appId === "alarm" ? <AlarmScene on={alarm} />
            : <CarScene level={Math.min(1, ledCurrentMa(appOhms) / ledCurrentMa(100))} />}
        </div>
      ) : (
        <Workbench components={lesson.components} placed={step.placed} focus={step.focus} leds={leds}
          pressed={pressed} onPress={live && button ? (_r, d) => setDown(d) : undefined}
          flow={flowing ? lesson.flow ?? null : null}
          stripboard={lesson.stripboard} cutsVisible={!!step.cuts} soldered={step.soldered ?? []} solderPins={step.solder ?? []}
          flipped={!!step.flip} tools={!!step.tools} meter={step.meter ?? null} motor={sim?.motor ?? 0} speaker={sim?.audio?.gain ?? 0}
          trimmed={trimmed} xray={xray} />
      )}
      xray={xray} onXray={() => setXray(!xray)}
      panel={
        <div className="flex flex-1 flex-col">
          <div className="relative border-b px-6 pb-6 pt-8 text-center sm:px-8">
            <span aria-hidden className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <LessonIcon className="size-7" strokeWidth={ICON_STROKE} />
            </span>
            <p className="label-caps">Lesson {lessonNumber(lesson.id)}</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{lesson.title}</h2>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={i + 1} aria-label="Lesson progress">
              <div className="progress-gradient h-full rounded-full" style={{ width: `${((i + 1) / n) * 100}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {lesson.steps.map((s, k) => {
                const StepIcon = stepIcon(s.id);
                return (
                <button key={s.id} title={`Step ${k + 1}: ${s.title}`} aria-label={`Go to step ${k + 1}: ${s.title}`} aria-current={k === i ? "step" : undefined} onClick={() => setI(k)}
                  className={cn("grid size-9 place-items-center rounded-full font-mono text-xs font-semibold transition-all duration-300",
                    k === i ? "bg-primary text-primary-foreground scale-110" : k < i ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground hover:bg-accent")}>
                  {k < i ? <Check className="size-4" strokeWidth={ICON_STROKE} /> : <StepIcon className="size-4" strokeWidth={ICON_STROKE} />}
                </button>
                );
              })}
            </div>
          </div>
          <div key={i} className="animate-step-in flex flex-1 flex-col gap-7 px-6 py-8 sm:px-8">
          {i > 0 && (
            <p role="status" className={cn("animate-pop-in self-start rounded-2xl px-4 py-2 text-sm font-bold shadow-soft", CHEER_TONES[i % 2])}>
              {last ? "Final step. Let's power it up." : CHEERS[Math.min(i, CHEERS.length - 2)]}
            </p>
          )}
          <div>
            <span className="label-caps">Step {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">{step.title}</h1>
            <p className="mt-2 text-base leading-relaxed">{step.text}</p>
            <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-secondary-foreground font-mono text-[0.8rem] leading-relaxed">{step.detail}</p>
            {step.term && (
              <p className="mt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">{step.term.word}:</span> {step.term.meaning}</p>
            )}
          </div>
          {step.checklist && (
            <ul className="-mt-2 space-y-1.5 text-sm">
              {step.checklist.map((c) => (
                <li key={c} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{c}</span></li>
              ))}
            </ul>
          )}
          {step.meter && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 font-mono text-sm">
              <span className="text-muted-foreground">Multimeter · red {step.meter.red.replace("S:", "")} · black {step.meter.black.replace("S:", "")}</span>
              <span className="font-semibold">{step.meter.display}{/^[\d.]+$/.test(step.meter.display) ? " V" : ""}</span>
            </div>
          )}
          {live && lesson.control && (
            <label className="block text-sm">
              <span className="flex justify-between"><span>{lesson.control.label}</span>
                <span className="font-mono">{lesson.control.unit === "Ω" ? fmtOhm(control) : `${control} ${lesson.control.unit}`}</span></span>
              <input type="range" className="mt-1 w-full accent-primary"
                min={lesson.control.log ? Math.log10(lesson.control.min) : lesson.control.min}
                max={lesson.control.log ? Math.log10(lesson.control.max) : lesson.control.max}
                step={lesson.control.log ? 0.01 : lesson.control.step}
                value={lesson.control.log ? Math.log10(control) : control}
                onChange={(e) => { const v = Number(e.target.value); setControl(lesson.control!.log ? Math.round(10 ** v) : v); }} />
              <span className="font-mono text-xs text-muted-foreground">{lesson.control.help}</span>
            </label>
          )}
          {live && !button && hasSound && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX /> : <Volume2 />} {muted ? "Sound off" : "Sound on"}
            </Button>
          )}
          {live && button && appId !== "alarm" && (
            <div className="flex gap-2">
              <Button size="xl" variant={down ? "default" : "outline"} className="flex-1 select-none"
                onPointerDown={(e) => { e.preventDefault(); setDown(true); }}>
                {down ? `${button.ref} pressed` : `Hold to press ${button.ref}`}
              </Button>
              {hasSound && (
                <Button size="xl" variant="outline" aria-label={muted ? "Unmute buzzer" : "Mute buzzer"} onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeX /> : <Volume2 />}
                </Button>
              )}
            </div>
          )}
          {status}
          {step.scene === "application" && appId !== "alarm" ? null : i === 0 ? (
            <Bom components={lesson.components} />
          ) : (
            <SchematicCard lesson={lesson} placed={step.placed} focus={step.focus} pressed={pressed} readout={readout} error={error} flowing={flowing} cutsVisible={!!step.cuts} />
          )}
          {scope}
          {application}
          </div>
          <div className="relative z-10 flex gap-3 border-t bg-card px-6 py-5 sticky bottom-0 sm:px-8">
            <Button type="button" variant="outline" size="xl" className="h-14 flex-1 text-base"
              onClick={() => (i === 0 ? navigate({ to: "/" }) : setI((prev) => Math.max(0, prev - 1)))}><ArrowLeft strokeWidth={ICON_STROKE} /> Back</Button>
            <Button size="xl" type="button" className="h-14 flex-[2] text-base" onClick={() => (last ? navigate({ to: "/complete/$lessonId", params: { lessonId: lesson.id } }) : setI((prev) => Math.min(n - 1, prev + 1)))}>
              {last ? <>Finish <Check /></> : <>Next <ArrowRight strokeWidth={ICON_STROKE} /></>}
            </Button>
          </div>
        </div>
      }
    />
  );
}

const CHEERS = [
  "Nice start. Let's meet the board.",
  "Good progress. Keep going.",
  "You're getting the hang of this.",
  "Great work. Halfway there.",
  "Looking sharp. Almost wired up.",
  "So close now.",
  "Final check. Let's power it up.",
];
const CHEER_TONES = ["bg-secondary text-secondary-foreground", "bg-accent text-accent-foreground"];

const KEYS = Object.keys(FREE_KEYS) as FreeKey[];

function Free({ lesson }: { lesson: Lesson }) {
  const [build, setBuild] = useState<BuildState>(EMPTY_BUILD);
  const [picked, setPicked] = useState<FreeKey | null>(null);
  const [flip, setFlip] = useState(false);
  const navigate = useNavigate();
  const result = evaluateCircuit(toComponents(build));
  const msg = statusMessage(result);
  const keyOf = (ref: string) => KEYS.find((k) => FREE_KEYS[k] === ref);
  const remove = (k: FreeKey) => setBuild((b) => ({ ...b, [k]: EMPTY_BUILD[k] }));
  const place = (option: string) => {
    if (!picked) return;
    setBuild((b) => {
      if (picked === "led") return { ...b, led: flip ? "rev" : "fwd" };
      if (picked === "wireBlack") return { ...b, wireBlack: option === "a13" ? "a13" : "a20" };
      return { ...b, [picked]: true };
    });
    setPicked(null);
  };
  const targets = picked
    ? PLACEMENT_OPTIONS[picked].map((o) => ({ option: o.option, pins: picked === "led" && flip ? [...o.pins].reverse() : o.pins }))
    : [];
  const placed = placedRefs(build);
  return (
    <Layout
      scene={
        <Workbench components={allComponents(build)} placed={placed}
          leds={{ D1: { mode: result.status === "lit" ? "on" : result.status === "overcurrent" ? "burned" : "off" } }}
          flow={result.status === "lit" ? lesson.flow ?? null : null}
          targets={targets} onTargetClick={place}
          onPartClick={(ref) => { const k = keyOf(ref); if (k) { if (build[k]) remove(k); else setPicked(k); } }} />
      }
      panel={
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Try it yourself</h1>
            <p className="mt-1 text-sm text-muted-foreground">Select a part, then click a highlighted hole on the board. Click a placed part to remove it.</p>
          </div>
          <div className="card-soft overflow-hidden px-4 py-1"><table className="w-full text-sm">
            <tbody>
              {KEYS.map((k) => {
                const info = lesson.components.find((c) => c.ref === FREE_KEYS[k])!;
                const on = !!build[k];
                const opts = PLACEMENT_OPTIONS[k];
                return (
                  <tr key={k} className={cn("border-b last:border-0", picked === k && "bg-accent/60")}>
                    <td className="w-10 py-2 pl-1 font-mono">{info.ref}</td>
                    <td className="py-2">
                      <div>{info.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {picked === k ? opts.map((o) => o.label).join(" | ") : on ? "placed" : info.value}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant={on ? "outline" : picked === k ? "default" : "secondary"}
                        onClick={() => (on ? remove(k) : setPicked(picked === k ? null : k))}>
                        {on ? "Remove" : picked === k ? "Cancel" : "Select"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={flip} onChange={(e) => setFlip(e.target.checked)} />
            Insert LED reversed (anode in e13)
          </label>
          <StatusBox {...msg} />
          <SchematicCard lesson={lesson} placed={placed} focus={picked ? [FREE_KEYS[picked]] : []}
            reversed={build.led === "rev" ? ["D1"] : []} readout={fmtI(result)} error={result.status === "overcurrent"} flowing={result.status === "lit"} />
          <div className="mt-auto flex gap-2">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => { setBuild(EMPTY_BUILD); setPicked(null); }}><RotateCcw /> Reset</Button>
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setBuild(FULL_BUILD)}>Fill in</Button>
            <Button size="xl" className="flex-1" disabled={result.status !== "lit"}
              onClick={() => navigate({ to: "/complete/$lessonId", params: { lessonId: lesson.id } })}>Finish</Button>
          </div>
        </div>
      }
    />
  );
}

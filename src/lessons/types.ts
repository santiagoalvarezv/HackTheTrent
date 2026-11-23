export type ComponentKind =
  | "battery"
  | "wire"
  | "resistor"
  | "led"
  | "capacitor_electrolytic"
  | "capacitor_ceramic"
  | "ic_dip8"
  | "pushbutton"
  | "buzzer"
  | "ldr"
  | "npn"
  | "diode"
  | "pot"
  | "regulator"
  | "mosfet"
  | "motor"
  | "battery9v"
  | "usb5v"
  | "ic_dip16"
  | "speaker"
  | "temp_sensor"
  | "header";

/**
 * A part on the board. Pin names per kind:
 * battery {pos,neg} · wire {a,b} · resistor {a,b} · led {anode,cathode} ·
 * capacitor_electrolytic {pos,neg} · capacitor_ceramic {a,b} · ic_dip8 {"1".."8"} ·
 * pushbutton {a1,a2,b1,b2} (a1–a2 and b1–b2 joined inside; pressing joins a to b) · buzzer {pos,neg} ·
 * ldr {a,b} · npn {e,b,c} · diode {anode,cathode} · pot {a,w,b} · regulator {in,gnd,out} · mosfet {g,d,s} ·
 * motor/speaker/battery9v/usb5v {pos,neg} · ic_dip16 {"1".."16"} · temp_sensor {vs,out,gnd} · header {sig,gnd}.
 * Pin values use board.ts syntax: "e10" or "top+:8".
 */
export interface LessonComponent {
  ref: string;
  kind: ComponentKind;
  name: string;
  value: string;
  pins: Record<string, string>;
  ohms?: number;
  farads?: number;
  /** Jumper colour. */
  color?: string;
  /** Jumper height above the board, in pitch (default 0.32). */
  height?: number;
  /** Jumper waypoints [x, z] between its two ends. */
  via?: [number, number][];
  /** Text printed on an IC, transistor or regulator. */
  marking?: string;
  /** Body diameter in mm (LEDs 3/5, electrolytics). */
  size?: number;
  /** Body height in mm (electrolytics). */
  bodyH?: number;
  /** Raise the body this many pitch above the default (staggered LEDs). */
  lift?: number;
  /** Off-board body position [x, z] (motor, speaker, battery, USB module). */
  at?: [number, number];
  /** Diode variant. */
  variant?: "1N4148" | "1N4007";
}

export type SchematicKind = ComponentKind | "ic555" | "ic" | "opamp";

export interface SchematicSymbol {
  ref: string;
  kind: SchematicKind;
  x: number;
  y: number;
  /** Degrees. Unrotated symbols run left (pin 1 / + / anode) to right. */
  rot?: number;
  /** Label anchor and lines, e.g. ["R1", "10k"]. */
  label: [number, number];
  text: string[];
  /** Generic IC box: size and pins [number, name, side, offset]. */
  ic?: { w: number; h: number; pins: [string, string, "l" | "r" | "t" | "b", number][] };
}

export interface SchematicWire {
  pts: [number, number][];
  /** Jumper ref this wire stands for; highlighted/dashed with it. */
  ref?: string;
}

export interface SchematicLayout {
  w: number;
  h: number;
  symbols: SchematicSymbol[];
  wires: SchematicWire[];
  /** Where the current readout goes. */
  readout: [number, number];
}

export interface LessonStep {
  id: string;
  title: string;
  /** One plain-language sentence. */
  text: string;
  /** One technical line: holes, values. */
  detail: string;
  term?: { word: string; meaning: string };
  /** Component refs on the board at this step. */
  placed: string[];
  /** Component refs highlighted at this step. */
  focus: string[];
  /** The circuit is powered and its behaviour runs. */
  live?: boolean;
  /** Replace the breadboard with the real-world application scene. */
  scene?: "application";
  /** Show the soldering bench tools. */
  tools?: boolean;
  /** Turn the stripboard over to show the copper side. */
  flip?: boolean;
  /** Track cuts are drilled at this step. */
  cuts?: boolean;
  /** Joints the iron and solder visit in this step (animated). */
  solder?: string[];
  /** Refs whose joints are soldered (shiny cones on the copper side). */
  soldered?: string[];
  /** Bullet list shown under the explanation (safety precautions). */
  checklist?: string[];
  /** Multimeter probes and the reading on its display. */
  meter?: { red: string; black: string; display: string };
}

export type BehaviourModel = "series" | "astable555" | "nightlight" | "rcfade" | "regulator" | "pwm555" | "lm386" | "chaser" | "tempalarm";

export type Level = "beginner" | "intermediate" | "advanced";
export type BoardType = "breadboard" | "stripboard";

/** One intended net: "REF.pin" members. `open` marks a deliberately unconnected pin. */
export interface NetSpec {
  name: string;
  pins: string[];
  open?: boolean;
}

export interface LessonControl {
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  unit: string;
  /** Logarithmic slider. */
  log?: boolean;
  help: string;
}

export interface Lesson {
  id: string;
  code: string;
  title: string;
  tagline: string;
  minutes: number;
  playable: boolean;
  model: BehaviourModel;
  components: LessonComponent[];
  steps: LessonStep[];
  schematic: SchematicLayout;
  /** Conventional current path for the flow animation ("B+"/"B-" = battery leads, "^" = above the board). */
  flow?: string[];
  freeBuild?: boolean;
  /** Real-world application shown on the live step. */
  application?: { id: "headlight" | "beacon" | "interior" | "alarm"; title: string; text: string; interaction: string };
  summary: [string, string][];
  level: Level;
  board: BoardType;
  stripboard?: { cols: number; rows: number; cuts: string[] };
  /** Intended netlist, verified by the solver in tests and at run time. */
  nets?: NetSpec[];
  control?: LessonControl;
  nextLessonId?: string;
}

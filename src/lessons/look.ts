/** Presentation only: lesson id -> accent utility and icon. No lesson data or logic here. */
import {
  Activity, BatteryFull, BellRing, Cable, CircleDot, CircuitBoard, Cpu, Lightbulb, MousePointerClick,
  Package, Rows3, Timer, Zap, type LucideIcon,
} from "lucide-react";

import { lessons } from "./data";

/** Display number (1, 2, 3...) by course position; ids and codes stay unchanged. */
export const lessonNumber = (id: string) => lessons.findIndex((l) => l.id === id) + 1;

export const ACCENTS = ["accent-indigo", "accent-teal", "accent-amber", "accent-rose", "accent-violet"] as const;

const LOOK: Record<string, { accent: (typeof ACCENTS)[number]; icon: LucideIcon }> = {
  "first-led": { accent: "accent-indigo", icon: Lightbulb },
  "blinking-led": { accent: "accent-teal", icon: Timer },
  "push-button": { accent: "accent-amber", icon: MousePointerClick },
  "buzzer-alarm": { accent: "accent-rose", icon: BellRing },
};

/** Lessons without an explicit entry cycle through the palette by position. */
export function lessonLook(id: string, index = Math.max(0, lessonNumber(id) - 1)) {
  return LOOK[id] ?? { accent: ACCENTS[index % ACCENTS.length]!, icon: CircuitBoard };
}

const STEP_ICONS: Record<string, LucideIcon> = {
  parts: Package, rails: Rows3, led: Lightbulb, resistor: Activity, wires: Cable, jumpers: Cable,
  chip: Cpu, passives: CircuitBoard, button: MousePointerClick, buzzer: BellRing,
  battery: BatteryFull, lit: Zap, test: Zap,
};
export const stepIcon = (stepId: string): LucideIcon => STEP_ICONS[stepId] ?? CircleDot;

/** One icon style everywhere: same stroke width; sizes from this small scale. */
export const ICON_STROKE = 2;

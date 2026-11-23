/**
 * The course map: edit this one list to change a lesson's level or its position.
 * `order` runs across the whole course (1 = first lesson). Recommendations follow this order.
 */
export type Level = "beginner" | "intermediate" | "advanced";

export const CURRICULUM: { id: string; level: Level; order: number }[] = [
  { id: "first-led", level: "beginner", order: 1 },
  { id: "blinking-led", level: "beginner", order: 2 },
  { id: "push-button", level: "beginner", order: 3 },
  { id: "buzzer-alarm", level: "beginner", order: 4 },
  { id: "night-light", level: "intermediate", order: 5 },
  { id: "rc-fade", level: "intermediate", order: 6 },
  { id: "first-solder", level: "intermediate", order: 7 },
  { id: "regulated-5v", level: "intermediate", order: 8 },
  { id: "pwm-motor", level: "advanced", order: 9 },
  { id: "lm386-amp", level: "advanced", order: 10 },
  { id: "led-chaser", level: "advanced", order: 11 },
  { id: "temp-alarm", level: "advanced", order: 12 },
];

export const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };
export const LEVEL_TITLE: Record<Level, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
export const isLevel = (v: unknown): v is Level => v === "beginner" || v === "intermediate" || v === "advanced";

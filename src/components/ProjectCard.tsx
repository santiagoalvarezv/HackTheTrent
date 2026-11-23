import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLessonProgress } from "@/hooks/use-lesson-progress";
import { ICON_STROKE, lessonLook, lessonNumber } from "@/lessons/look";
import type { Lesson } from "@/lessons/types";

const CARD =
  "group relative flex flex-col overflow-hidden rounded-2xl p-7 text-left shadow-lift " +
  "ring-1 ring-on-vivid/10 lift-glow";

const SHEEN =
  "pointer-events-none absolute inset-0 project-sheen opacity-70 transition-opacity duration-300 group-hover:opacity-100";

const WATERMARK =
  "pointer-events-none absolute -right-10 -top-14 text-on-vivid/10 transition duration-500 " +
  "group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none";

const PILL = "rounded-full bg-on-vivid/15 px-3 py-1 text-xs font-medium text-on-vivid ring-1 ring-on-vivid/20";

export function ProjectCard({ lesson }: { lesson: Lesson }) {
  const { accent: theme, icon: Icon } = lessonLook(lesson.id);
  const total = lesson.steps.length;
  const p = useLessonProgress(lesson.id, total);
  const label = p.done ? "Complete" : p.started ? `Step ${p.step} of ${total}` : "Not started";

  if (!lesson.playable) {
    return (
      <div className="flex flex-col rounded-2xl border border-dashed border-border bg-card/95 p-7 shadow-soft" aria-disabled>
        <div className="flex items-center justify-between gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-muted font-display text-base font-semibold text-muted-foreground">{lessonNumber(lesson.id)}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Coming soon</span>
        </div>
        <span aria-hidden className="mt-6 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-8" strokeWidth={ICON_STROKE} />
        </span>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-muted-foreground">{lesson.title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{lesson.tagline}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{lesson.minutes} min</p>
        <span className="mt-6 inline-flex h-12 items-center rounded-full border border-dashed border-border px-7 text-sm font-medium text-muted-foreground">
          Coming soon
        </span>
      </div>
    );
  }

  return (
    <Link
      to="/lesson/$lessonId"
      params={{ lessonId: lesson.id }}
      className={`${CARD} ${theme} project-surface`}
    >
      <span aria-hidden className={SHEEN} />
      <span aria-hidden className={WATERMARK}>
        <Icon className="size-48" strokeWidth={ICON_STROKE} />
      </span>

      <span className="relative flex items-start justify-between gap-3">
        <span aria-label={`Lesson ${lessonNumber(lesson.id)}`} className="grid size-9 place-items-center rounded-full bg-card font-display text-base font-semibold text-primary shadow-soft">{lessonNumber(lesson.id)}</span>
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          <span className={PILL}>{lesson.board === "stripboard" ? "Stripboard · soldering" : "Breadboard"}</span>
        </span>
      </span>

      <span
        aria-hidden
        className="relative mt-6 flex size-16 items-center justify-center rounded-2xl bg-on-vivid/15 text-on-vivid ring-1 ring-on-vivid/25 transition duration-300 group-hover:scale-105 group-hover:bg-on-vivid/25 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
        <Icon className="size-8" strokeWidth={ICON_STROKE} />
      </span>

      <h3 className="relative mt-5 text-2xl font-semibold tracking-tight text-on-vivid">{lesson.title}</h3>
      <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-on-vivid-muted">{lesson.tagline}</p>
      <p className="relative mt-4 font-mono text-xs text-on-vivid-muted">
        {lesson.minutes} min · {lesson.steps.length} steps · {lesson.components.length} parts
      </p>

      <span className="relative mt-auto block pt-6">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-on-vivid-muted">{label}</span>
          <span className="font-mono text-xs text-on-vivid">{p.pct}%</span>
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-on-vivid/20">
          <span
            className="block h-full rounded-full bg-on-vivid transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${p.pct}%` }}
          />
        </span>
        <span className="project-start mt-6 transition duration-300 group-hover:scale-105 group-hover:shadow-[0_18px_34px_-12px_var(--card-glow)] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          {p.done ? "Again" : p.started ? "Continue" : "Start"}
          <ArrowRight strokeWidth={ICON_STROKE} className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
        </span>
      </span>
    </Link>
  );
}

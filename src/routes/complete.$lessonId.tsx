import { lessonNumber } from "@/lessons/look";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { saveGuestStep } from "@/lessons/guest";
import { AppHeader } from "@/components/AppHeader";
import { Confetti } from "@/components/Confetti";
import { Button } from "@/components/ui/button";
import { getLesson, lessons } from "@/lessons/data";
import { markComplete } from "@/lessons/progress";
import { saveCloud } from "@/lessons/cloud-progress";

export const Route = createFileRoute("/complete/$lessonId")({
  loader: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    if (!lesson) throw notFound();
    return { lesson };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Completed: ${loaderData?.lesson.title ?? "Project"} — Hack the Trent` },
      { name: "description", content: "Project complete. Review the circuit values and continue with the next project." },
      { property: "og:title", content: "Project complete — Hack the Trent" },
      { property: "og:description", content: "Review the circuit values and continue with the next project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Complete,
});

function Complete() {
  const { lesson } = Route.useLoaderData();
  const { user, ready } = useAuth();
  const next = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1];
  const saved = useRef(false);
  useEffect(() => {
    if (!ready || saved.current) return;
    saved.current = true;
    if (!user) { saveGuestStep(lesson.id, lesson.steps.length - 1); return; }
    markComplete(lesson.id, lesson.steps.length);
    void saveCloud(user.id, lesson.id, lesson.steps.length - 1, true);
  }, [ready, user, lesson.id, lesson.steps.length]);
  const rows = lesson.summary;
  return (
    <div className="min-h-screen">
      <AppHeader />
      <Confetti />
      <main className="mx-auto max-w-2xl px-6 py-16"><div className="animate-pop-in relative overflow-hidden rounded-2xl border bg-card p-8 shadow-lift sm:p-12">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-success/15 shadow-soft">
          <svg viewBox="0 0 48 48" className="size-12 text-success" aria-hidden>
            <path d="M12 25 L21 33 L36 15" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="animate-draw" />
          </svg>
        </div>
        <p className="mt-8 font-bold text-primary">Lesson {lessonNumber(lesson.id)} · You did it</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{lesson.title}</h1>
        <p className="mt-2 text-muted-foreground">{lesson.tagline}</p>
        <table className="mt-8 w-full overflow-hidden rounded-2xl bg-muted text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-background last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{k}</td>
                <td className="px-4 py-3 text-right font-mono">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {!next && (
            <Button asChild size="xl" className="flex-1"><Link to="/">All projects <ArrowRight /></Link></Button>
          )}
          {next && (
            <Button asChild size="xl" className="flex-1">
              {next.playable ? (
                <Link to="/lesson/$lessonId" params={{ lessonId: next.id }}>Next project <ArrowRight /></Link>
              ) : (
                <Link to="/">Next project: {next.title} (coming soon) <ArrowRight /></Link>
              )}
            </Button>
          )}
          <Button asChild variant="outline" size="xl">
            <Link to="/lesson/$lessonId" params={{ lessonId: lesson.id }}><RotateCcw /> Repeat</Link>
          </Button>
        </div>
      </div></main>
    </div>
  );
}

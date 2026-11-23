import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { takeRedirect, useGuest } from "@/lessons/guest";
import { ArrowDown, UserRound, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { SyncBanner } from "@/components/SyncBanner";
import { lessons } from "@/lessons/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hack the Trent — Build your first circuit in 5 minutes" },
      { name: "description", content: "Step-by-step 3D breadboard lessons for complete beginners. Real parts, real holes, real values." },
      { property: "og:title", content: "Hack the Trent — Build your first circuit" },
      { property: "og:description", content: "Learn electronics on an accurate 3D breadboard, one step at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});


function Home() {
  const { user, ready } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();
  const [hideBanner, setHideBanner] = useState(false);
  useEffect(() => {
    // Back from Google/Apple/Microsoft sign-in: continue to the lesson that was clicked.
    if (!ready || !user) return;
    const to = takeRedirect();
    if (to) navigate({ href: to, replace: true });
  }, [ready, user, navigate]);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>
        <section className="mx-auto max-w-3xl px-6 pb-12 pt-20 text-center sm:pt-24">
          <h1 className="text-4xl font-semibold text-on-bg sm:text-5xl">Build your first circuit</h1>
          <p className="mt-4 text-lg text-on-bg-muted">Step-by-step electronics on a 3D breadboard, from zero.</p>
          <Button size="xl" className="mt-8" onClick={() => document.getElementById("lessons")?.scrollIntoView({ behavior: "smooth" })}>
            Start <ArrowDown />
          </Button>
        </section>
        <div id="lessons" className="mx-auto max-w-5xl scroll-mt-6 px-6 pb-20">
          <SyncBanner />
          {ready && !user && guest && !hideBanner && (
            <div role="status" className="mx-auto mb-8 flex max-w-4xl flex-col items-start gap-3 rounded-2xl bg-card p-5 shadow-lift sm:flex-row sm:items-center">
              <UserRound className="size-6 shrink-0 text-primary" />
              <p className="flex-1 text-sm">You're browsing as a guest. Your progress won't be saved. Sign up to keep it.</p>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" className="h-9"><Link to="/auth" search={{ tab: "signup" }}>Sign up</Link></Button>
                <Button variant="ghost" size="icon" className="size-9" aria-label="Dismiss" onClick={() => setHideBanner(true)}><X /></Button>
              </div>
            </div>
          )}
          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
            {lessons.map((l) => <ProjectCard key={l.id} lesson={l} />)}
          </div>
        </div>
      </main>
    </div>
  );
}

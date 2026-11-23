import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchStep } from "@/lessons/cloud-progress";
import { progressOf, type Progress } from "@/lessons/progress";
import { guestStep, useGuest } from "@/lessons/guest";

/**
 * How far the learner got: from the account when signed in, otherwise (guest) from memory for this page only.
 * Only available on the client, so the first render reports "not started".
 */
export function useLessonProgress(lessonId: string, totalSteps: number): Progress {
  const { user, ready } = useAuth();
  const guest = useGuest();
  const [step, setStep] = useState(-1);
  useEffect(() => {
    if (!ready) return;
    if (!user) { setStep(guestStep(lessonId)); return; }
    let live = true;
    fetchStep(lessonId).then((s) => live && setStep(s)).catch(() => {});
    return () => { live = false; };
  }, [lessonId, totalSteps, user, ready, guest]);
  return progressOf(step, totalSteps);
}

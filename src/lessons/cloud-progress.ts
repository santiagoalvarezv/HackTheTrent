/** Signed-in progress, stored per user in the `progress` table (RLS: own rows only). */
import { supabase } from "@/integrations/supabase/client";
import { lessons } from "./data";
import { localStore, readStep } from "./progress";

export interface CloudRow { lesson_id: string; current_step: number; completed: boolean }

export async function fetchAll(): Promise<CloudRow[]> {
  const { data, error } = await supabase.from("progress").select("lesson_id,current_step,completed");
  if (error) throw error;
  return data ?? [];
}

export async function fetchStep(lessonId: string): Promise<number> {
  const { data } = await supabase.from("progress").select("current_step").eq("lesson_id", lessonId).maybeSingle();
  return data?.current_step ?? -1;
}

/** Saves the furthest step reached; never lowers it, and keeps `completed` once set. */
export async function saveCloud(userId: string, lessonId: string, step: number, completed = false) {
  const { data } = await supabase.from("progress").select("current_step,completed").eq("lesson_id", lessonId).maybeSingle();
  const best = Math.max(step, data?.current_step ?? -1);
  await supabase.from("progress").upsert({
    user_id: userId, lesson_id: lessonId, current_step: best, completed: completed || !!data?.completed,
  });
}

/** Lessons with progress in this browser that is ahead of the account. */
export function unsyncedLocal(rows: CloudRow[]) {
  const store = localStore();
  return lessons
    .map((l) => ({ id: l.id, step: readStep(l.id, store), total: l.steps.length }))
    .filter((l) => l.step >= 0 && l.step > (rows.find((r) => r.lesson_id === l.id)?.current_step ?? -1));
}

export async function syncLocal(userId: string, rows: CloudRow[]) {
  for (const l of unsyncedLocal(rows)) await saveCloud(userId, l.id, l.step, l.step >= l.total - 1);
}

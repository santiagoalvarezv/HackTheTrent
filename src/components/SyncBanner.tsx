import { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchAll, syncLocal, unsyncedLocal, type CloudRow } from "@/lessons/cloud-progress";

/** After signing in, offers to copy progress made in this browser into the account. */
export function SyncBanner() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CloudRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (user) fetchAll().then(setRows).catch(() => setRows(null)); }, [user]);
  if (!user || !rows || dismissed) return null;
  const pending = unsyncedLocal(rows);
  if (!pending.length) return null;
  return (
    <div role="status" className="mx-auto mb-8 flex max-w-4xl flex-col items-start gap-3 rounded-2xl bg-card p-5 shadow-lift sm:flex-row sm:items-center">
      <CloudUpload className="size-6 shrink-0 text-primary" />
      <p className="flex-1 text-sm">You have progress in {pending.length} lesson{pending.length > 1 ? "s" : ""} saved in this browser. Add it to your account?</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-9" onClick={() => setDismissed(true)}>Not now</Button>
        <Button size="sm" className="h-9" disabled={busy} onClick={async () => {
          setBusy(true); await syncLocal(user.id, rows); location.reload();
        }}>{busy ? "Syncing..." : "Sync progress"}</Button>
      </div>
    </div>
  );
}

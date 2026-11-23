<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Lessons live as local data in `src/lessons/data.ts`: components (ref, kind, value, pins), steps referencing refs, schematic layout, flow path, behaviour model. Add projects there; the Workbench, Schematic and BOM render any lesson generically.
- Behaviour models: `series`/`astable555` in `src/lessons/circuit.ts`, all others in `src/lessons/models.ts` (`simulate`), on top of one net solver (`solveNets`) that handles breadboard strips, stripboard copper with track cuts, wires, switches and unsoldered joints. Add new models there, not in components.
- Each lesson lists its intended netlist (`nets`); `layout-checks.test.ts` verifies every lesson against the solver (no shared holes, no part under a wire link, no floating pins, no shorted nets), so new lessons get checked automatically.
- Lessons are split by level into `data.ts` (beginner), `data-intermediate.ts`, `data-advanced.ts`; shared part constructors live in `helpers.ts`.
- 3D scene: `Workbench.tsx` (scene, flip, breadboard parts), `parts2.tsx` (newer parts), `stripboard.tsx`, `tools.tsx` (bench tools, iron animation, multimeter), `common.tsx` (shared lead/frame helpers).
- Board geometry is pure TS: breadboard in `src/lessons/board.ts` (hole/rail/pinPos/tip/netOf), stripboard in `src/lessons/stripboard.ts` (stripHole/copperPoint/cutPos/stripTip/stripNetOf, pins "S:C5"). Solder joints are never authored: `generateJoints()` makes one per soldered pin at its copper point; the 3D scene places every lead only through these helpers so geometry and the electrical model never disagree.
- The 3D workbench (`src/components/workbench`) is rendered only from `ssr: false` routes, because R3F needs the browser.
- "Circuit to Reality" experiences are data-driven: config per lesson in `src/lessons/applications.ts`, generic stages in `src/components/application`, route `/real-world/$lessonId`; enable a lesson by adding config (plus a device illustration if new), never by copying stage code.
- Project-card visuals are presentation-only: gradient themes, glows and button colours are tokens and `@utility` classes in `src/styles.css`, mapped by lesson id in `src/components/ProjectCard.tsx`; no colour literals in components.
- Colours come only from theme tokens in `src/styles.css`. Per-lesson accents are `accent-*` utilities that re-point --primary/--secondary/--accent/--ring inside their subtree; lesson id -> accent and icon lives in `src/lessons/look.ts`, so components never carry their own colour.

- Unplaced parts render outside the flipping board group (parts tray on the bench); placed parts follow the flip through shared state, and off-board leads end via `offboardEnd()` so they always finish in their hole.
- The lesson panel has Schematic and Layout tabs (`LayoutView.tsx`, drawn from the same pin data) and an X-ray toggle on the 3D view.
- Learner progress: signed-out learners keep the furthest step per lesson in this browser (`src/lessons/progress.ts`); signed-in, verified learners use the `progress` table (`src/lessons/cloud-progress.ts`, RLS own rows) and the home page offers to sync browser progress into the account. Why: progress follows the account across devices without forcing sign-in.
- Auth lives at `/auth` (email + password with 6-digit signup code, managed Google/Apple/Microsoft sign-in) and `/reset-password`; password rules are one list in `src/lib/password.ts` shared by the form checklist and the schema. Why: one source for the rules the UI shows and enforces.
- Lesson level and course order live only in `src/lessons/curriculum.ts`; `data.ts` applies them. Lock rules are the pure `lessonStates()` in `src/lessons/unlock.ts`, fed by `useLearner()` (profile best level + completed rows). Why: one editable course map and testable unlock rules.
- Placement quiz questions and score bands live in `src/lessons/quiz.ts`; results go to `profiles` (own row only), whose `best_level` only rises so a retake never re-locks lessons. Why: retakes must not take access away.

- Lesson access: signed-out visitors see /auth?redirect=... before a lesson unless they chose guest mode (`src/lessons/guest.ts`); guest progress is memory-only. Why: progress is either in the account or not kept at all.

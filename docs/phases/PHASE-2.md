# Phase 2: Milestones, timeline and task board

| | |
|---|---|
| **Status** | Done. Tested locally and live on https://herblocx-tracker.vercel.app |
| **Date** | 2026-10-16 |
| **Commit** | `d051818` "Phase 2: milestones, timeline and kanban board" |
| **Database** | `herblocx-dev` (development & testing). No database changes in this phase. |
| **Next** | Phase 3: comments on tasks and the activity log screen |

Part 1 is for everyone who uses the app. Part 2 is for whoever maintains the code later.

---

# Part 1: For users

## What's new

| Where | What it does |
|---|---|
| **Top menu** | New **Board** and **Milestones** links. |
| **Milestones** page | A **timeline** at the top (one bar per milestone) and a **table** below with owner, start and end dates, and progress. |
| **A milestone's page** | Its tasks, its progress, an edit form (for people allowed to edit) and a delete button (Admin and Director only). |
| **Board** page | Four columns: **To Do → In Progress → Review → Done**. Drag a card to change its status. Includes filters and a **New task** button. |
| **A task's page** | Edit form for people allowed to edit; a read-only view for everyone else. Delete button for people allowed to delete. |
| **New task** page | Opened from **New task** or from **+ Add task** under a column (which preselects that column's status). |

## How to…

**Create a milestone** (Admin, Director, Head of Finance)
1. Click **Milestones**, then **New milestone**.
2. Fill in the title, an optional description, start date, end date and owner.
3. Click **Create milestone**. The end date can't be before the start date.

**Create a task** (everyone)
1. Click **Board**, then **New task**, or **+ Add task** under a column.
2. Fill in the title, status, priority, assignee, role/department, due date and milestone.
   - The **due date** is required.
   - **Assignee** and **milestone** can be left empty ("Unassigned" / "No milestone").
3. Click **Create task**. You're taken back to the Board.

**Move a task to another column**
- **Mouse:** press on the card, drag it to the column and let go.
- **Phone or tablet:** press and hold the card for a moment, then drag.
- **Keyboard:** press Tab until the card is highlighted, press **Space** to pick it up, use the **arrow keys** to move, and press **Space** again to drop.
- You can also open the task and change **Status** in the form.

If you aren't allowed to move a card, it can't be picked up. If the database refuses a move (for example because your permission changed a moment ago), the card jumps back and a red message explains why.

**Filter the board**
- **Assignee:** Everyone, Unassigned, or one person.
- **Role / department:** one of the 6 job roles.
- **Milestone:** all, "No milestone", or one milestone.
- **Overdue only:** tasks past their due date that aren't Done.

The board reloads as soon as you change a filter. The filter is saved in the web address, so you can **bookmark** or **share** a filtered board. **Clear filters** resets everything.

**Read the timeline**
- Each bar runs from the milestone's start date to its end date.
- The dark part of the bar is its progress.
- The **red vertical line** is today (Jakarta time).
- A **red border** means the end date has passed and the milestone isn't 100% done.
- Hover over a bar to see its dates; click it to open the milestone.

## How things are calculated

| Item | Rule |
|---|---|
| **Milestone progress** | Tasks in **Done** ÷ all tasks in that milestone. A milestone with no tasks shows 0%. Calculated by the database, so it's always up to date. |
| **Overdue** | Due date is before **today in Jakarta** and the task isn't Done. |
| **Card order in a column** | Priority first (**Urgent → High → Medium → Low**), then earliest due date. Dragging changes a card's column, not its position inside the column. |
| **Dates** | Shown as **YYYY/MM/DD**, times as **YYYY/MM/DD HH:mm** (Jakarta). The calendar pickers in forms follow your computer's own date format, because the browser controls them. |

## Who can do what in this phase

From the approved permission matrix (PLAN.md section 4). "Own task" = a task you **created** or are **assigned to**.

| Action | Admin | Director | Head of Finance | Finance / Marketing / Software Dev / Legal |
|---|---|---|---|---|
| See milestones and tasks | ✅ | ✅ | ✅ | ✅ |
| Create a milestone | ✅ | ✅ | ✅ | ❌ |
| Edit a milestone | ✅ | ✅ | ✅ | Only milestones they **own** |
| Delete a milestone (its tasks stay, without a milestone) | ✅ | ✅ | ❌ | ❌ |
| Create a task | ✅ | ✅ | ✅ | ✅ |
| Edit / move / reassign a task | ✅ any | ✅ any | Finance-department tasks + own tasks | Own tasks |
| Delete a task | ✅ any | ✅ any | Finance-department tasks | ❌ |

**Important:** hiding a button is only for convenience. The **database itself** refuses anything not allowed above, even if someone bypasses the screens.

Deactivated people can't be picked as a new owner or assignee. Their names stay on old work, marked "(inactive)".

## How it was tested (2026-10-16)

Tested in a real browser against the development database, logged in as the test accounts:

| # | Test | Result |
|---|---|---|
| 1 | Admin creates a milestone (Oct 1 – Nov 30, owner: Test Marketing) | ✅ Created; dates show as 2026/10/01 – 2026/11/30 |
| 2 | Admin creates 3 tasks (Finance/High/overdue, Marketing/Urgent, Legal/Low/unassigned in Review) | ✅ All appear in the right columns |
| 3 | Admin drags "Prepare Q4 budget" To Do → In Progress | ✅ Moved and saved; activity log recorded "status changed … by admin" |
| 4 | "Overdue only" filter | ✅ Only the overdue task shown |
| 5 | Timeline | ✅ Bar, progress and today-line shown |
| 6 | Marketing user tries to drag the Finance task | ✅ Refused: card stays put |
| 7 | Marketing user drags their own task to Review | ✅ Moved, and sorted above the Low-priority card |
| 8 | Marketing user on Milestones | ✅ No "New milestone" button; can edit the milestone they own; no Delete |
| 9 | Marketing user opens the Finance task | ✅ Read-only view, explaining who can edit |
| 10 | Phone-sized screen (375 px) | ✅ Usable; columns scroll sideways |
| 11 | Browser console and server logs | ✅ No errors |
| 12 | Type check, lint, production build | ✅ Zero errors, zero warnings |

The test milestone "Phase 1 launch prep" and its 3 tasks are still in the development database for you to try things with.

## Known limitations (by design, for v1)

- **No live updates:** if someone else moves a card, refresh the page to see it.
- **No manual ordering within a column:** cards are always sorted by priority, then due date.
- **Date pickers** in forms use your computer's date format; everything displayed uses YYYY/MM/DD.
- **Milestones, the board and the timeline only.** Comments and the activity log screen come in Phase 3. The dashboard and attachments come in Phase 4.

---

# Part 2: For developers

## Routes added

| Route | File | Notes |
|---|---|---|
| `/board` | `app/(app)/board/page.tsx` | Reads the `task_board` view (tasks + `is_overdue`). Filters are validated, then applied in the query. |
| `/milestones` | `app/(app)/milestones/page.tsx` | `milestones` + `milestone_progress` view + timeline. |
| `/milestones/new` | `app/(app)/milestones/new/page.tsx` | Sends people who can't create milestones back to `/milestones`. |
| `/milestones/[id]` | `app/(app)/milestones/[id]/page.tsx` | Details, the milestone's tasks, edit form and delete. |
| `/tasks/new` | `app/(app)/tasks/new/page.tsx` | `?status=` and `?milestone=` preselect fields. |
| `/tasks/[id]` | `app/(app)/tasks/[id]/page.tsx` | Edit form or read-only view, plus delete. |

## Main pieces

| File | Purpose |
|---|---|
| `app/(app)/board/board.tsx` | Client component. Drag and drop with `@dnd-kit/core`: Pointer sensor (6 px activation distance, so clicks still open cards), Touch sensor (200 ms hold) and Keyboard sensor. The move is shown immediately, then confirmed by the server; if the server refuses, the card goes back and an error shows. `DndContext` gets a stable `id` (`useId`) to avoid hydration mismatches. |
| `app/(app)/board/filters.tsx` | Uses `next/form` (GET) so filters live in the address bar. Any change submits the form. |
| `app/(app)/board/page.tsx` | `<Board key={JSON.stringify(filters)}>` remounts the board when filters change, so the client state never mixes old and new results. |
| `app/(app)/tasks/actions.ts` | Server actions `createTask`, `updateTask`, `moveTask`, `deleteTask`. Input is checked with zod. Every write uses the **logged-in user's** Supabase client, so RLS applies. `.select().single()` turns "0 rows changed" (refused by RLS) into a clear error. |
| `app/(app)/milestones/actions.ts` | `createMilestone`, `updateMilestone`, `deleteMilestone`, same pattern. |
| `app/(app)/milestones/timeline.tsx` | Server component with pure CSS positioning. Calendar dates are converted to whole days (UTC-based) so there are no time-zone shifts. The range is widened to whole months. |
| `lib/permissions.ts` | Mirrors the RLS rules **only to decide which buttons to show**. If RLS changes, update this file too. |
| `lib/people.ts` | Loads profiles once per request. `nameOf()` adds "(inactive)"; `choicesWith(id)` returns the active people plus the current owner/assignee, even if that person was deactivated since. |
| `lib/db-errors.ts` | Maps Postgres/PostgREST errors (`42501`, `PGRST116`, `P0001` from our own triggers, `23514`, network failures) to plain-English messages. |
| `lib/format.ts` | Added `jakartaToday()` (YYYY-MM-DD in Asia/Jakarta). |
| `lib/constants.ts` | Added task statuses and priorities with labels. |
| `components/delete-button.tsx`, `components/progress-bar.tsx`, `components/ui/textarea.tsx` | Small shared UI pieces (the textarea comes from shadcn). |

## Decisions worth knowing

- **Sorting** uses `order("priority", { ascending: false })`. Postgres sorts enums in declaration order (`low < medium < high < urgent`), so descending puts Urgent first.
- **Overdue** is calculated in the database (`task_board.is_overdue`, using `jakarta_today()`) for filtering, and in the browser from `due_date` + Jakarta today for display after a drag.
- **Deleting a milestone** leaves its tasks (`on delete set null`). The task-update trigger logs that change as "task updated, milestone removed".
- **Two small additions to the brief's filters:** "Unassigned" and "No milestone" options.

## Dependencies added (approved in Phase 0)

| Package | Version | Why |
|---|---|---|
| `@dnd-kit/core` | 6.3.1 | Drag and drop (mouse, touch, keyboard) |
| `@dnd-kit/utilities` | 3.2.2 | CSS transform helper for dragged cards |

## Deployment notes

- The code is on GitHub: `AgakSedikitGatal/herblocx-tracker` (public, by the owner's choice on 2026-10-16).
- The Vercel project `herblocx-tracker` is **not auto-linked** to the repository. After each push, deploy with the Vercel connector: `create_deployment` with `gitSource: { type: "github", org: "AgakSedikitGatal", repo: "herblocx-tracker", ref: "main" }`, target `production`.
- Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: plain.
  - `SUPABASE_SECRET_KEY`: sensitive, **Production only**. Add it to Preview too if preview deployments are ever used.

## Open items carried forward

- **Phase 4:** when a task with uploaded files is deleted, its files must be removed from storage as well. The database already allows this for files no attachment points to.
- **Phase 5:**
  - Automated permission tests per role.
  - Move the helper functions flagged by the Supabase security advisor out of the public API.
  - Create the live (`herblocx-prod`) database.

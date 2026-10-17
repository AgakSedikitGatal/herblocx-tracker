# Addition 2: Readable activity and a colour refresh

| | |
|---|---|
| **Status** | Done. Tested locally and live on https://herblocx-tracker.vercel.app |
| **Date** | 2026-10-17 |
| **Requested by** | Team feedback notes: "Bagian activity kurang readable" and "UI terlalu blend". Owner chose **Herbal green** from a mock-up with three options. |
| **Database** | No changes |
| **New packages** | None |

## The feedback notes, and what's decided for later

The same notes raised four more points. They are **not built yet**; the owner's answers are recorded for when they are:

| Note | Owner's answer (2026-10-17) |
|---|---|
| Division boards: each division runs its own board without interference | Other divisions **view and comment only**; members manage their whole division's board; Director/Admin everything |
| Evidence for non-IT divisions | **Proof required before Done**, for all divisions: a photo/file, link, or linked commit. Director/Admin can close without proof. |
| IT evidence from the code repository | **GitHub**: task codes like `HX-42` in commit messages, attached automatically by webhook |
| Mini drive for important links | Proposed **Resources** page; not chosen yet |

---

# Part 1: For users

## What looks different

| Where | Change |
|---|---|
| **Everywhere** | **Herbal green** brand colour on main buttons, links and the active menu item; a green "H" logo mark; a soft grey-green page background with white cards, so sections stand apart |
| **Top menu** | The page you're on is highlighted (green pill). Task pages highlight **Board**. |
| **Task statuses** | Each status has its own colour, the same everywhere: **To Do** grey · **In Progress** blue · **Review** amber · **Done** green |
| **Board** | Each column has a coloured top edge and a coloured status label; cards are white on a tinted column |
| **Dashboard** | The status tiles have a coloured top edge matching the board; **Overdue** is red when above 0 |
| **Task and milestone pages** | Statuses shown as coloured labels |

## The new Activity

**Grouped by day.** Headings read **Today**, **Yesterday**, then e.g. **Mon, 2026/10/12**.

**One line per event, with the time on the right:**

> ⇄ **Admin** moved **Prepare Q4 budget** `To Do` → `In Progress` · 15:16

**What the icons mean:**

| Icon | Event |
|---|---|
| ＋ | Created |
| ⇄ | Status change |
| 👤 | Assignment |
| ✎ | Edit |
| 💬 | Comment |
| 📎 | File or link |
| 🗑 | Deleted |

**Edits list every change on one line,** e.g. "updated **Prepare Q4 budget** · due date 2026/10/10 → 2026/10/20 · priority High → Urgent".

**Task names are green links.** A task that was deleted since shows "(deleted)".

**New filters on the Activity page:**
- **Person**
- **Division** (of the person who did it)
- **What happened**: status changes, assignments, task edits, created/deleted, comments, files and links

Filters stay in the address bar, and paging (Newer / Older) keeps them.

The **Dashboard's "Recent activity"** and each task's **History** use the same layout. In History, "the task" stands in for the name.

## How it was tested (2026-10-17)

| # | Test | Result |
|---|---|---|
| 1 | Mock-up with three brand colours shown to the owner | ✅ Herbal green chosen |
| 2 | Activity page | ✅ Grouped Today / Yesterday, one line per event, coloured status chips, time on the right |
| 3 | Filter "What happened = Task edits" | ✅ Only edits; changes listed with "·" separators |
| 4 | Filter "Division = Marketing" | ✅ Only actions by Marketing people |
| 5 | Dashboard | ✅ Coloured tiles (top edge only); recent activity readable in the narrow column (status changes never split across lines) |
| 6 | Board | ✅ Colour-coded columns; active menu item highlighted |
| 7 | Task History | ✅ Same grouped layout |
| 8 | Server logs | ✅ No errors |
| 9 | Type check, lint, production build | ✅ Zero errors, zero warnings |

---

# Part 2: For developers

| File | Purpose |
|---|---|
| `app/globals.css` | Brand tokens (`--primary` #0f6e56, tinted `--background`, `--accent`, `--ring`) and status tokens `--status-{todo,progress,review,done}{,-foreground,-border}`, exposed to Tailwind as `bg-status-*`, `text-status-*-foreground`, `border-t-status-*-border` |
| `components/status-badge.tsx` | `StatusBadge` + `STATUS_STYLES`, the single source of status colours |
| `app/(app)/nav-links.tsx` | Client menu using `usePathname()` for the active item |
| `app/(app)/layout.tsx` | Logo mark, white header, `NavLinks` |
| `lib/activity.ts` | `describeActivity()` now returns `{ kind, segments }`; a segment is text, an emphasised value, a status chip, or the task. `ACTIVITY_FILTERS` maps filter names to log actions. |
| `lib/activity-rows.ts` | Rows carry `kind`, `segments`, `day` and `time` (Jakarta) |
| `components/activity-list.tsx` | Groups rows by day (`dayLabel`); one `<li>` per event with icon, sentence and time; keeps `[status] → [status]` together |
| `lib/format.ts` | `formatTimeOfTimestamp`, `dayLabel` |
| `app/(app)/activity/page.tsx`, `filters.tsx` | Filters: person = `actor_id`; division = `actor_id` in that job role's people; kind = `action in (...)` |
| Board, Dashboard, task and milestone pages | Use `StatusBadge` / `STATUS_STYLES` |

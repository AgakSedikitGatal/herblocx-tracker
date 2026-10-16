# Addition 1: Milestones calendar (month view)

| | |
|---|---|
| **Status** | Done. Tested locally and live on https://herblocx-tracker.vercel.app |
| **Date** | 2026-10-16 |
| **Requested by** | Owner, after Phase 5: "a calendar like Google Calendar in a month view; all task deadlines written in automatically" |
| **Update** | Same day, by the owner: no separate tabs. The calendar sits **above** the milestones on one page. |
| **Database** | No changes. The calendar only **reads** existing tasks and milestones. |
| **New packages** | None. Plain HTML/CSS grid. |

---

# Part 1: For users

## Where to find it

Click **Milestones** in the top menu. The page shows, from top to bottom:
1. **the month calendar**
2. **Timeline and progress**: the milestone bars and the milestone table

There are no tabs to switch.

## What it shows

A month grid, **Monday → Sunday**, like Google Calendar's month view. It fills itself in:

| On the calendar | Comes from | Looks like |
|---|---|---|
| **Task deadlines** | Each task's **due date** | A small label with the task title |
| **Milestone deadlines** | Each milestone's **end date** | A dark label starting with ◆ |
| **Today** (Jakarta time) | | A dark circle around the date |

Nothing is typed into the calendar by hand:
- Create a task or change its due date, and it moves on the calendar automatically.
- Delete a task, and it disappears.

**Colours and marks**

| Mark | Meaning |
|---|---|
| Red label | **Overdue**: past its due date and not Done |
| ~~Struck through~~ | **Done** |
| Red dot ● | **Urgent** priority |
| Amber dot ● | **High** priority |
| ◆ dark label | A milestone ends that day |
| Grey day | Belongs to the previous or next month |

## How to use it

- **Change month:** click **‹** or **›** next to the month name. **Today** jumps back to the current month.
- **Open something:** click a task to open the task, or a ◆ milestone to open the milestone.
- **See details without opening:** hover over a task to see its status, priority, assignee and whether it's overdue.
- **Busy days:** a day shows up to **3** items. Click **"+N more"** to see the rest.
- **Monthly summary:** top right shows how many task deadlines fall in the month, and how many are overdue.
- **Shareable link:** the address bar keeps the month (e.g. `…/milestones?month=2026-11`), so you can bookmark or share a month.
- **On a phone:** the calendar scrolls sideways.

**Who can see it:** everyone with an active account, the same as the board. The calendar changes nothing, so there are no new permissions.

## How it was tested (2026-10-16)

| # | Test | Result |
|---|---|---|
| 1 | October 2026 view | ✅ Starts Mon 28 Sep, ends Sun 1 Nov; today (16th) highlighted |
| 2 | Task deadlines placed on their due dates | ✅ e.g. "Prepare Q4 budget" on the 20th with the Urgent dot; finished "Review vendor contract" struck through on the 30th |
| 3 | Milestone end date | ✅ "◆ Konten visit supplier kopi" on the 17th |
| 4 | Next-month button | ✅ November 2026 shown, with ◆ "Phase 1 launch prep" on the 30th; address bar `/milestones?month=2026-11`; timeline and table still below |
| 5 | A month starting on Monday (February 2027) | ✅ Exactly 4 weeks, no extra rows |
| 6 | "+N more" on a busy day (tested by temporarily showing 1 item per day) | ✅ Opens and shows the hidden task; limit put back to 3 |
| 6b | One page: calendar on top, "Timeline and progress" below, no tabs | ✅ |
| 6c | Old address `/milestones/calendar` | ✅ Redirects to `/milestones` |
| 7 | Server logs | ✅ No errors |
| 8 | Type check, lint, production build | ✅ Zero errors, zero warnings |

## Not included (ask if you want any of these)

- Week or day views, or dragging tasks to a new date on the calendar. Change the due date in the task instead.
- Filters on the calendar (by person, role or milestone). The Board has these.
- Showing milestones as bars across several days. The **Timeline** tab does that.

---

# Part 2: For developers

| File | Purpose |
|---|---|
| `app/(app)/milestones/month-calendar.tsx` | `MonthCalendar({ monthParam })`, an async server component rendered at the top of `/milestones`. Reads `task_board` (`due_date` between the first and last visible day, Urgent first) and `milestones` (`end_date` in range), groups them by date and renders a 7-column grid. "+N more" uses a native `<details>`, so no client JavaScript is needed. Validates `?month=YYYY-MM`; anything else falls back to the current Jakarta month. |
| `lib/calendar.ts` | `parseMonth`, `monthKey`, `shiftMonth`, `monthTitle`, `monthGrid` (Monday-first weeks covering the whole month) and `isSameMonth`. Pure calendar-date maths in UTC, so there are no time-zone shifts. |
| `app/(app)/milestones/page.tsx` | Reads `?month=`, renders `<MonthCalendar>` and then the "Timeline and progress" section (timeline + table) |
| `next.config.ts` | Temporary redirect `/milestones/calendar` → `/milestones`. The calendar briefly had its own page and tabs before the owner asked for one page. |

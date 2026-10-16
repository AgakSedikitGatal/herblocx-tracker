# Phase 3: Comments and activity log

| | |
|---|---|
| **Status** | Done. Tested locally and live on https://herblocx-tracker.vercel.app |
| **Date** | 2026-10-16 |
| **Database** | `herblocx-dev`. No database changes: the activity-log triggers and the append-only guard were built and tested in Phase 1. This phase adds the screens. |
| **Next** | Phase 4: dashboard and attachments (links + file uploads) |

Part 1 is for everyone who uses the app. Part 2 is for whoever maintains the code later.

---

# Part 1: For users

## What's new

| Where | What it does |
|---|---|
| **A task's page → Comments** | A conversation thread under every task. Everyone can read and post. |
| **A task's page → History** | Everything that ever happened to that task, newest first. |
| **Activity** (top menu) | Everything that happened to **all** tasks, newest first, 50 per page (**Newer** / **Older** buttons). |

## How to…

**Post a comment:** open a task, type in the box under **Comments**, then click **Post comment**.

**Edit your comment:** click **Edit** under it, change the text, then click **Save** (or **Cancel**). The comment then shows **(edited)**.

**Delete a comment:** click **Delete** under it and confirm.

**See what happened to a task:** open the task and scroll to **History**.

**See what happened across the project:** click **Activity** in the top menu. Click a task name to open it. A task that was deleted since shows **(deleted)** and has no link, but its history is kept.

## Who can do what with comments

From the approved permission matrix (PLAN.md section 4):

| Action | Admin | Everyone else (all 6 roles) |
|---|---|---|
| Read comments | ✅ | ✅ |
| Post a comment on any task | ✅ | ✅ |
| Edit a comment | Own comments only | Own comments only |
| Delete a comment | **Any** comment | Own comments only |

Nobody, Admin included, can change someone else's words. Admin can only remove a comment, for example one with wrong or sensitive content.

## What the activity log records

Every entry shows **who**, **what** and **when** (Jakarta time):

| Event | Example sentence |
|---|---|
| Task created | *Admin* created the task |
| Status changed (drag or form) | *Admin* moved it from To Do to In Progress |
| Reassigned | *Admin* assigned it to Test Legal · reassigned it from A to B · unassigned it (was A) |
| Other fields edited | *Admin* changed due date from 2026/10/10 to 2026/10/20; priority from High to Urgent |
| Description edited | *Admin* changed the description (the text itself isn't copied, because it can be long) |
| Task deleted | *Admin* deleted the task |
| Comment posted / edited / deleted | *Test Marketing* commented · edited a comment · *Admin* deleted a comment by Test Marketing |
| Attachment added / removed | *X* added the link "Budget sheet" · removed the file "invoice.pdf" (from Phase 4) |

**Why you can trust it:**
- **The database writes these entries itself**, at the moment a change is saved. No screen, button or bug can skip one.
- **Nobody can edit or delete an entry**: not users, not Admin, not even the secret key. The database refuses it.
- **Comment text is never copied into the log**, so a comment that was removed for containing sensitive information doesn't live on there.
- **"System"** as the person means the change was made outside the app, for example directly in the Supabase dashboard.

## How it was tested (2026-10-16)

Tested in a real browser against the development database:

| # | Test | Result |
|---|---|---|
| 1 | Checked the live database has all log triggers and only a "read" rule on the log | ✅ 6 tables' triggers present; log has no insert/edit/delete rule |
| 2 | Marketing posts a comment on someone else's task | ✅ Posted; box cleared; history shows "Test Marketing commented" |
| 3 | Marketing edits their comment | ✅ Text updated with "(edited)"; history shows "edited a comment" |
| 4 | Admin views Marketing's comment | ✅ **Delete** shown, **Edit** not shown |
| 5 | Admin changes priority and due date | ✅ History: "changed due date from 2026/10/10 to 2026/10/20; priority from High to Urgent" |
| 6 | Admin deletes Marketing's comment | ✅ Removed; history: "Admin deleted a comment by Test Marketing" |
| 7 | Activity page | ✅ All entries newest first, with task links |
| 8 | A task deleted earlier (during the owner's own testing) | ✅ Still in Activity, marked "(deleted)", no link |
| 9 | Server logs | ✅ No errors |
| 10 | Type check, lint, production build | ✅ Zero errors, zero warnings |

Log entries can't be deleted, so the test entries above stay in the development database permanently. The live database (Phase 5) starts with an empty log.

## Known limitations (by design, for v1)

- **No notifications:** nobody is emailed or alerted about new comments. Not in scope.
- **No live updates:** refresh to see new comments from others.
- **Plain text comments only:** no formatting, @mentions or attachments inside comments. Attachments belong to the task (Phase 4).
- **Task history only:** milestone changes and user-account changes aren't in the activity log. The brief lists task events only.

---

# Part 2: For developers

## Files added or changed

| File | Purpose |
|---|---|
| `lib/activity.ts` | `describeActivity(entry, lookups)` turns a log row's `action` + `details` JSON into a sentence. `actorName()` returns "System" when `actor_id` is null. Status/priority/department labels come from `lib/constants.ts`; milestone ids are resolved to titles ("a deleted milestone" if gone). |
| `components/activity-list.tsx` | Shared list used by the task History and the Activity page (`showTask` adds the task title/link line). |
| `app/(app)/tasks/[id]/comment-actions.ts` | Server actions `addComment`, `editComment`, `deleteComment`. Input is checked with zod (1–5000 characters, trimmed). Writes use the logged-in user's client, so RLS decides. "0 rows" becomes "You can only edit/delete your own comments." |
| `app/(app)/tasks/[id]/comments.tsx` | Client component: thread, new-comment form, edit-in-place and delete with confirmation. The Edit/Delete buttons follow the rules above; the database enforces them. |
| `app/(app)/tasks/[id]/page.tsx` | Loads the comments (oldest first) and up to 200 history entries (newest first); adds the Comments and History cards. |
| `app/(app)/activity/page.tsx` | Paged log (50 per page, `?page=N`, with an exact count). Checks which mentioned tasks still exist, to decide whether to link them. |
| `app/(app)/tasks/actions.ts` | Also refreshes `/activity` after task changes. |
| `app/(app)/layout.tsx` | **Activity** link in the menu. |

## How the log is written (from Phase 1, unchanged)

- Migration `supabase/migrations/20261015041843_activity_log.sql`.
- `SECURITY DEFINER` trigger functions on `tasks` (insert/update/delete), `task_comments` (insert/update/delete) and `task_attachments` (insert/delete) insert into `activity_log` with `actor_id = auth.uid()`.
- Child entries are skipped when the whole task is being deleted, because `task_deleted` covers them.
- `activity_log` has RLS with a single **select** policy, no insert/update/delete grants, and `BEFORE UPDATE/DELETE` and `BEFORE TRUNCATE` triggers that raise an exception. Even the service role and the SQL editor are blocked; only removing the trigger as the database owner could bypass it.

## Dependencies added

None.

## Open items carried forward

- **Phase 4:** dashboard "recent activity" will reuse `describeActivity` and `ActivityList`. The attachment log sentences are already in place.
- **Phase 5:** automated tests will try to insert, update and delete log entries as every role, and must be refused.

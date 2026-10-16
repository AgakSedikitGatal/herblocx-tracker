# Phase 4: Dashboard and attachments

| | |
|---|---|
| **Status** | Done. Tested locally and live on https://herblocx-tracker.vercel.app |
| **Date** | 2026-10-16 |
| **Database** | `herblocx-dev`. No database changes: the views, the private `task-files` storage bucket and its rules were built in Phase 1. This phase adds the screens. |
| **Next** | Phase 5: hardening (automated permission tests per role), live database, Vercel deploy guide, README |

Part 1 is for everyone who uses the app. Part 2 is for whoever maintains the code later.

---

# Part 1: For users

## What's new

| Where | What it does |
|---|---|
| **Dashboard** (the home page; first item in the top menu) | Five number tiles (**To Do, In Progress, Review, Done, Overdue**), **Overdue tasks**, **Progress per milestone**, **Workload per person** and the latest **20 activity entries**. |
| **A task's page → Attachments** | Add **links** (e.g. Google Drive) and **upload files** (max 10 MB). Open, or remove if allowed. |

## The dashboard, piece by piece

| Section | What it shows | Click it to… |
|---|---|---|
| **Status tiles** | How many tasks are in each column right now | Open the Board |
| **Overdue tile** | Tasks past their due date and not Done. It turns red with a ⚠ sign when the count is above 0. | Open the Board filtered to overdue tasks |
| **Overdue tasks** | The 10 most overdue tasks: who has them, when they were due, and how many days late | Open a task, or "See all…" for the rest |
| **Progress per milestone** | % done (tasks in Done ÷ all tasks), done/total, and the end date | Open the milestone |
| **Workload per person** | Each active person's **open tasks** (assigned and not Done), with a bar, and how many are overdue | Open the Board filtered to that person |
| **Recent activity** | The latest 20 log entries | Open a task, or "All activity" |

All numbers are calculated by the database when the page loads. Refresh to update them.

## Attachments: how to…

**Add a link**
1. Open a task and scroll to **Attachments**.
2. Under **Add a link**, paste the full link (it must start with `https://` or `http://`).
3. Optionally give it a name, e.g. "Budget sheet". Without a name, the website's address is used.
4. Click **Add link**.

**Upload a file**
1. Under **Upload a file**, click **Choose File** and pick a file.
   - Allowed: **PDF, JPG, PNG, Word, Excel, PowerPoint, CSV, ZIP**.
   - Maximum **10 MB**.
2. Click **Upload**. You'll see "uploaded" when it's done.

**Open an attachment:** click its name. It opens in a new tab.
- Links go straight to their website.
- PDFs and images open in the browser; Word, Excel, PowerPoint, CSV and ZIP files download with their original name.

**Remove an attachment:** click **Remove** next to it and confirm. For an uploaded file, the file itself is deleted from storage too.

**Deleting a task** also deletes all files uploaded to it.

## Who can do what with attachments

From the approved permission matrix (PLAN.md section 4):

| Action | Admin | Director | Everyone else |
|---|---|---|---|
| See and open attachments | ✅ | ✅ | ✅ |
| Add links / upload files (any task) | ✅ | ✅ | ✅ |
| Edit an attachment | ❌ (remove it and add it again) | ❌ | ❌ |
| Remove an attachment | ✅ any | ✅ any | Only ones **they added** |

## How files are kept private

- **Private storage:** files live in a **private** storage area. There is no public web address for any file.
- **Short-lived links:** clicking a file asks the app for a link that **expires after 60 seconds**. The app only gives one to a **logged-in, active** team member.
- **Logged-out visitors:** anyone not logged in who opens a file link is sent to the login page.
- **Deactivated people:** they can't open files either. The database hides everything from them.
- **Limits enforced twice:** the 10 MB limit and the allowed file types are checked in the browser (for a clear message) **and** enforced by the storage itself.
- **Space:** the free Supabase plan includes **1 GB** of file storage in total.

## How it was tested (2026-10-16)

Tested in a real browser against the development database:

| # | Test | Result |
|---|---|---|
| 1 | Dashboard as Admin | ✅ Tiles, overdue list, milestone progress, workload and recent activity all shown |
| 2 | Add a Google Drive link with a name | ✅ Listed as "Budget sheet · drive.google.com" |
| 3 | Upload a PDF | ✅ "uploaded"; listed as a file |
| 4 | Open the PDF while logged in | ✅ Opened through a 60-second signed link (PDF, 200 OK) |
| 5 | Open the same file link while **logged out** | ✅ Sent to the login page |
| 6 | Try the storage's public address | ✅ Refused (the bucket is private) |
| 7 | Upload an 11 MB file | ✅ Refused: "That file is larger than 10 MB." |
| 8 | Upload an `.exe` file | ✅ Refused: allowed types listed |
| 9 | Storage settings checked in the database | ✅ Private, 10 MB limit, 12 allowed types |
| 10 | Remove the uploaded PDF | ✅ Record **and** stored file removed (0 files left); log shows "added the file" and "removed the file" |
| 11 | Delete a task that has an uploaded CSV | ✅ Task deleted and its file removed from storage (1 → 0) |
| 12 | Legal user on Admin's link | ✅ Can see and open it, can add their own; **no Remove button** on Admin's link |
| 13 | Server logs | ✅ No errors |
| 14 | Type check, lint, production build | ✅ Zero errors, zero warnings |

The test link "Budget sheet" is still on the "Prepare Q4 budget" task. The test task "TEMP delete test" was created and deleted; its history stays in the activity log.

## Known limitations (by design, for v1)

- **No file previews** inside the app: files open in a new tab or download.
- **One file per upload:** pick and upload files one at a time.
- **No upload progress bar:** wait for the "uploaded" message (a few seconds for 10 MB).
- **Dashboard isn't live:** refresh the page for the latest numbers.

---

# Part 2: For developers

## Files added or changed

| File | Purpose |
|---|---|
| `app/(app)/page.tsx` | **Dashboard**. Reads `task_status_counts`, `task_board` (overdue, with an exact count), `milestones` + `milestone_progress`, `person_workload` and the latest 20 `activity_log` rows. Stat tiles and bar lists are plain HTML/Tailwind: one hue for magnitude, red plus an icon and label only for overdue. |
| `app/(app)/layout.tsx` | Menu item "Home" renamed **Dashboard**. |
| `lib/activity-rows.ts` | `toActivityRows()`, shared by the Dashboard and the Activity page. Turns log rows into display rows and links only tasks that still exist. |
| `app/(app)/activity/page.tsx` | Uses `toActivityRows()`. |
| `lib/attachments.ts` | Bucket name, 10 MB limit, extension → file-type map (used when the browser reports no type), `safeFileName()`, `formatBytes()`, `opensInBrowser()`. Mirrors the bucket settings in the storage migration. |
| `lib/supabase/client.ts` | Browser Supabase client (publishable key + the user's session). Used **only** to upload directly to storage, so files don't pass through Vercel and its request-size limit. |
| `app/(app)/tasks/[id]/attachments.tsx` | Client UI: list, add-link form, upload form. Checks size and type first; uploads to `<taskId>/<uuid>-<safe name>` with `upsert: false`; then calls `recordUpload`. |
| `app/(app)/tasks/[id]/attachment-actions.ts` | `addLink` (zod: http(s) only, ≤ 2000 characters); `recordUpload` (checks path, size and type, inserts the row, and deletes the uploaded object if the insert fails); `deleteAttachment` (deletes the row under RLS, then the object, which storage now allows because no row points to it). |
| `app/attachments/[id]/route.ts` | `GET /attachments/:id`: loads the row as the user (RLS), redirects links to their URL, and redirects files to a **60-second signed URL** (`download` set to the original name for non-PDF/image types). |
| `app/(app)/tasks/actions.ts` | `deleteTask` collects the task's file paths first, deletes the task (attachment rows cascade), then removes the orphaned objects. Also refreshes `/`. |
| `lib/permissions.ts` | `canDeleteAttachment` (Admin, Director or whoever added it), for showing the button. |

## Storage rules (from Phase 1, unchanged)

Migration `supabase/migrations/20261015041855_storage.sql`:
- Bucket `task-files`: `public = false`, `file_size_limit = 10485760`, 12 allowed MIME types.
- **Read:** active users.
- **Upload:** active users, only into a folder named after an existing task id.
- **Delete:** active users, only objects that **no attachment row points to**. So permission to remove a file is really decided by the `task_attachments` delete policy.

## Dependencies added

None. `createBrowserClient` comes from `@supabase/ssr`, already installed.

## Open items carried forward to Phase 5

- Automated tests per role, covering:
  - attachment insert and delete
  - storage upload outside a task folder
  - deleting a referenced file
  - opening files while logged out or deactivated
- Move the 6 helper functions flagged by the Supabase security advisor out of the public API.
- Create the live (`herblocx-prod`) database, deploy guide and README (including backing up storage files).

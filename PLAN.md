# Project Tracker — Plan (Phase 0)

Status: **DRAFT, waiting for owner approval.** Nothing gets built until the permission matrix (section 4) and open questions (section 6) are answered.

Working name: **HerblocX Tracker** (taken from the folder name. See question Q1.)

---

## 1. What we are building

An internal web app that tracks **one** project. About 10–12 people, every account created by an Admin, no public sign-up ever. All dates and times shown in **Asia/Jakarta (WIB, UTC+7)**.

v1 features (and nothing else): accounts and roles, milestones and a timeline, a kanban task board, comments and an activity log, a dashboard, and task attachments.

**Not in v1** unless you approve them later: dark mode, notifications, emails, real-time live updates (you refresh the page to see others' changes), "forgot password" emails, social login, multiple projects, mobile app, chat, file previews, data export.

---

## 2. Pinned stack versions

Checked on npm on 2026-10-15. Only stable releases. Every version is pinned exactly (no `^` or `~`). I check again for security patches at the start of Phase 1.

### Approved stack (from your brief)

| Package | Version | Notes |
|---|---|---|
| Node.js (runtime) | 22.x LTS | You have 22.23.1. Vercel will be set to 22.x. |
| next | 16.4.1 | Latest stable. 16.5 is still "canary", so we skip it. |
| react / react-dom | 19.3.1 | Latest stable. |
| typescript | **6.0.3** | Not 7.0.2. TypeScript 7 is the new rewrite, and the lint tooling Next.js uses (`typescript-eslint`) officially supports only up to 6.0.x. Strict mode on. |
| @supabase/supabase-js | 2.117.3 | |
| @supabase/ssr | 0.12.7 | Official helper that handles Supabase logins in Next.js. Still numbered 0.x, but it is Supabase's documented, recommended package. |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | |
| shadcn (CLI) | 4.21.5 | Copies UI components into our code. It also installs its normal helpers: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (icons), `tw-animate-css`. I count these as part of "shadcn/ui". Say so if you disagree. |
| eslint | **9.39.5** | Not 10.x. Several plugins inside `eslint-config-next` don't officially support ESLint 10 yet. |
| eslint-config-next | 16.4.1 | Matches Next.js. |
| @types/node | 22.20.5 | Matches Node 22. |
| @types/react / @types/react-dom | 19.3.0 | |

### Extra packages: these need your approval (see Q2)

| Package | Version | Why | What happens without it |
|---|---|---|---|
| `@dnd-kit/core` + `@dnd-kit/utilities` | 6.3.1 / 3.2.2 | Drag and drop on the kanban board. Most widely used React drag library. Works with mouse, touch and keyboard. Stable since Dec 2024. | I use the browser's built-in drag and drop. It works with a mouse but **not on phones/tablets**, and is weaker for keyboard users. |
| `zod` | 4.6.7 | Checks form input on the server (for example "title is required, max 200 characters"). | I write those checks by hand. This works, but means more code to maintain. |
| `supabase` (CLI, dev-only) | 2.121.0 | Applies our SQL migration files to the database in a fixed order and generates TypeScript types. Runs only on your computer, never on the website. | You copy and paste each SQL file into the Supabase SQL Editor by hand, in the right order. |
| `vitest` (dev-only) | 4.1.11 | Runs the automated permission tests in Phase 5. Not 5.x, which is only 6 weeks old. | No automated tests. That would break your "verified by tests" requirement. |

**Not added on purpose:** no chart library (the dashboard uses simple bars built with Tailwind), no date library (the browser's built-in `Intl` handles Asia/Jakarta), no Gantt library (the timeline is drawn with plain CSS), and no `tsx` (the seed script is plain JavaScript).

---

## 3. Data model

All tables live in Supabase Postgres. **Row Level Security (RLS) is ON for every table.**

| Table | What it stores | Key columns |
|---|---|---|
| `profiles` | One row per person, linked 1-to-1 to the Supabase login account | `id` (= login user id), `full_name`, `email`, `job_role` (Director / Head of Finance / Finance / Marketing / Software Dev / Legal), `is_admin` (yes/no, separate from job role), `is_active` (yes/no), `created_at`, `updated_at` |
| `milestones` | Project milestones | `id`, `title`, `description`, `start_date`, `end_date`, `owner_id` → profiles, `created_by`, `created_at`, `updated_at` |
| `tasks` | Kanban cards | `id`, `title`, `description`, `status` (To Do / In Progress / Review / Done), `assignee_id` → profiles (can be empty), `department` (one of the 6 job roles), `priority` (Low / Medium / High / Urgent), `due_date`, `milestone_id` → milestones (can be empty), `created_by`, `created_at`, `updated_at` |
| `task_comments` | Comment thread per task | `id`, `task_id`, `author_id`, `body`, `created_at`, `edited_at` |
| `task_attachments` | Links (and files, if you approve uploads) | `id`, `task_id`, `kind` (link / file), `url` (for links), `storage_path` + `file_name` + `size_bytes` (for files), `added_by`, `created_at` |
| `activity_log` | Append-only history | `id`, `task_id`, `actor_id`, `action` (task_created, task_updated, status_changed, reassigned, task_deleted, commented, attachment_added, attachment_removed), `details` (what changed: old value → new value), `created_at` |

**Computed, not stored** (database views, so the numbers can never get out of sync):
- `milestone_progress`: for each milestone, Done tasks ÷ all tasks, as a percentage. A milestone with no tasks shows 0%.
- Dashboard numbers: tasks per status, overdue tasks, open tasks per person.

**Dates and time zone**
- Due, start and end dates are plain calendar dates with no clock time. 15 Oct is 15 Oct for everyone.
- "Happened at" times (created, commented, logged) are saved in universal time and **always displayed in Asia/Jakarta**.
- **Overdue** means the due date is before *today in Jakarta* and the task is not Done.

**Kanban ordering:** cards inside a column are sorted automatically by priority, then due date. Dragging a card changes its **column** only, not its position inside the column. This keeps v1 simple. Say so if you want manual ordering inside a column.

**How the activity log stays tamper-proof**
- Entries are written **only by database triggers**. The app itself never writes log entries, so no screen or bug can skip one.
- RLS lets every logged-in user *read* the log. There is **no** rule that allows insert, update or delete from the app, for anyone, Admin included.
- An extra database guard rejects any update or delete on the log, even with the master (service role) key.
- When a task is deleted, its log entries stay. The log keeps a snapshot of the task title.
- Honest limit: someone with owner access to the Supabase dashboard could remove the guard with raw SQL. No app user, Admin included, can do that through the app.

**How "deactivate" works**
- Admin switches the account off. The person's login is blocked in Supabase Auth, *and* every RLS rule checks `is_active`. A browser that is still logged in also loses access immediately.
- Their name stays on old tasks, comments and log entries, shown as "(inactive)". They can't be picked as an assignee for new work.
- There is no delete button for accounts anywhere.

**Security setup**
- **Sign-ups are switched off in Supabase Auth settings.** The database itself refuses new self-registrations, not only the UI.
- The browser gets only the public "publishable" key. The **secret (service role) key** is used only in server-side Admin actions, which first check that the caller is an active Admin.
- Nobody can make themselves Admin, change their own job role or reactivate themselves. Only an active Admin can, and an Admin can't remove their own Admin rights or deactivate themselves, so you can't lock yourself out.
- `created_by` and `author_id` are filled in by the database from the logged-in user and can't be faked.

---

## 4. PERMISSION MATRIX (needs your approval)

How to read it:
- **Admin** = anyone with the Admin permission, whatever their job role. A Software Dev who is also Admin gets the Admin column.
- ✅ = yes, on any record ❌ = no
- **Own** = only records they **created** or are **assigned to** (for tasks), or that they **wrote/added** (for comments and attachments)
- **Owner** = only milestones where they are the milestone owner
- **Dept** = tasks whose department is Finance or Head of Finance
- Deactivated users can do **nothing**.
- Every rule is enforced in the database with RLS. Hiding a button is only for convenience.

### Milestones

| Action | Admin | Director | Head of Finance | Finance | Marketing | Software Dev | Legal |
|---|---|---|---|---|---|---|---|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit | ✅ | ✅ | ✅ | Owner | Owner | Owner | Owner |
| Delete ¹ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ Deleting a milestone does not delete its tasks. They become "No milestone".

### Tasks

| Action | Admin | Director | Head of Finance | Finance | Marketing | Software Dev | Legal |
|---|---|---|---|---|---|---|---|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit (incl. drag to another column, reassign) | ✅ | ✅ | Dept + Own | Own | Own | Own | Own |
| Delete | ✅ | ✅ | Dept | ❌ | ❌ | ❌ | ❌ |

### Comments

| Action | Admin | Director | Head of Finance | Finance | Marketing | Software Dev | Legal |
|---|---|---|---|---|---|---|---|
| View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create (on any task) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit ² | Own | Own | Own | Own | Own | Own | Own |
| Delete | ✅ | Own | Own | Own | Own | Own | Own |

² Edited comments show an "(edited)" label. Nobody, Admin included, can edit someone else's words. Admin can only remove a comment, for example one with wrong or sensitive content.

### Attachments

| Action | Admin | Director | Head of Finance | Finance | Marketing | Software Dev | Legal |
|---|---|---|---|---|---|---|---|
| View / open | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add (on any task) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | Own | Own | Own | Own | Own |

(Attachments are never edited. You delete one and add it again.)

### Users / accounts

| Action | Admin | Director | Head of Finance | Finance | Marketing | Software Dev | Legal |
|---|---|---|---|---|---|---|---|
| View team list (name, job role, email, active) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create account | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit name / email / job role / Admin flag | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Set a new password for someone ³ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deactivate / reactivate | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete account | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change **own** password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

³ Replaces "forgot password", because the app sends no emails.

### Activity log and dashboard

| Action | Admin | Director | Head of Finance | Finance | Marketing | Software Dev | Legal |
|---|---|---|---|---|---|---|---|
| View activity log | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create log entry | automatic only (database triggers) | | | | | | |
| Edit / delete log entry | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Phases (summary)

Every phase ends with: what was done, plain-language browser test steps, a git commit, then **STOP until you say "lanjut"**.

| Phase | Delivers |
|---|---|
| 0 | This plan (no code) |
| 1 | Project setup; your step-by-step Supabase setup guide; schema + RLS as SQL migration files; login/logout/change password; Admin user page; seed script (1 Admin + 1 account per job role) |
| 2 | Milestones, timeline view, kanban board with drag and drop and filters (assignee, role, milestone, overdue) |
| 3 | Comments + activity log written by database triggers |
| 4 | Dashboard + attachments |
| 5 | Automated "forbidden action" tests per role; build/lint/typecheck at zero errors; Vercel deploy guide; README (add users, backups, run locally) |

---

## 6. Open questions (please answer before Phase 1)

**Q1. Project name.** Should the app be called "HerblocX" (from the folder name), or something else?

**Q2. UI language.** Bahasa Indonesia or English? (All screens use one language. No language switcher.)

**Q3. Extra packages.** Do you approve `@dnd-kit/core` + `@dnd-kit/utilities`, `zod`, `supabase` CLI and `vitest` (section 2)? *My recommendation: approve all four.*

**Q4. File uploads.** Should attachments allow **file uploads** to Supabase Storage as well as links?
*My default if yes:* private storage (only logged-in users can open files, through short-lived links), **max 10 MB per file**, allowed types PDF, images (JPG/PNG), Word, Excel, PowerPoint, CSV, ZIP. For scale, the Supabase free plan has 1 GB of storage in total.

**Q5. Permission matrix.** Do you approve section 4 as written? The choices I'm least sure about:
- a) Can **Head of Finance** create/edit **all milestones**, or only milestones they own?
- b) Should Head of Finance's extra task powers cover **only Finance-department tasks** (my default), or all tasks like the Director?
- c) Should regular roles be able to **delete their own tasks** (for example a duplicate created by mistake)? My default is no: they ask the Director/Admin.
- d) Is it OK that **anyone can comment on and attach links to any task**?

**Q6. First accounts.** The seed script creates 7 test accounts: 1 Admin + 1 per job role.
- What email domain should they use (for example `admin@yourcompany.co.id`, or obviously fake ones like `admin@herblocx.test`)?
- Passwords are generated at random and saved to one local file on your computer that is **never committed**. OK?
- Should these test accounts be **deactivated** before real users start, so they can't be used on the live site?

**Q7. Hosting plans (cost).**
- **Supabase Free** pauses a project after **7 days without activity** (you must click "restore") and has **no automatic backups**. **Pro (~US$25/month)** removes the pause and adds daily backups. Free during building, Pro before launch?
- **Vercel Hobby (free)** officially allows **non-commercial use only**. An internal company tool counts as commercial, so Vercel's terms require **Pro (~US$20/month per member)**. Which plan will you use?

**Q8. Testing database.** The Phase 5 tests log in as each role and try forbidden actions, so they create and change data. My recommendation: a **second, free Supabase project called "test"**, used only by the tests. That keeps your real data clean and doesn't require installing Docker. OK?

**Q9. Small defaults.** Please confirm or change:
- Priorities: **Low / Medium / High / Urgent**
- A task can have **no assignee** and **no milestone**
- Date format: **15 Oct 2026** (or `15/10/2026`?)
- "Workload per person" = number of **not-Done** tasks assigned to each active person
- "Recent activity" on the dashboard = the latest **20** log entries
- The app is built for laptop/desktop screens first, and still usable on a phone

---

*After you approve this, I update this file with your answers and start Phase 1.*

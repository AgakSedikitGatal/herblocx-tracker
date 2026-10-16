# Phase 0: Plan

| | |
|---|---|
| **Status** | Done and approved by the owner |
| **Date** | 2026-10-15 |
| **Commits** | `ec769e9` (plan draft) · `2ef35c9` (owner decisions recorded) |
| **Main document** | [PLAN.md](../../PLAN.md): the single source of truth for scope, data model and permissions |
| **Next** | Phase 1: foundation |

No code was written in this phase. It settled **what** to build, **with which tools**, and **who may do what**, before anything was built.

---

## What was decided

### 1. Scope (v1 only)
One internal project tracker for **one project**, about 10–12 people, all on accounts the Admin creates. **No public sign-up, ever.** Everything is shown in **Asia/Jakarta** time.

v1 features:
- accounts & roles
- milestones + timeline
- kanban board
- comments + activity log
- dashboard
- attachments

**Out of scope unless approved later:** dark mode, notifications, emails, live updates, "forgot password" emails, social login, multiple projects, mobile app, data export.

### 2. Tools (stack)
Only stable releases, every version pinned exactly. See PLAN.md section 2 for the full table.

| Part | Choice | Note |
|---|---|---|
| Website framework | Next.js 16.4.1 + React 19.3.1 | Latest stable. Canary/beta versions avoided. |
| Language | TypeScript **6.0.3**, strict | Not 7.x: the code-checking tools don't support it yet. |
| Database, logins, files | Supabase (Postgres, Auth, Storage, Row Level Security) | |
| Styling | Tailwind CSS 4.3.3 + shadcn/ui | |
| Hosting | Vercel | |
| Code checker | ESLint **9.39.5** | Not 10.x: some Next.js plugins don't support it yet. |

**Extra packages approved by the owner:**
- `@dnd-kit/core` + `@dnd-kit/utilities` (drag and drop)
- `zod` (form checking)
- `supabase` CLI (dev-only)
- `vitest` (tests, dev-only)

### 3. Data model
Six tables:
- `profiles`
- `milestones`
- `tasks`
- `task_comments`
- `task_attachments`
- `activity_log` (append-only)

Progress, overdue and workload numbers are **calculated by the database** (views), never typed in. See PLAN.md section 3.

### 4. Permission matrix
Who can view, create, edit and delete milestones, tasks, comments, attachments and users, for Admin and each of the 6 job roles: Director, Head of Finance, Finance, Marketing, Software Dev, Legal.

**Approved as proposed.** See PLAN.md section 4. The key principles:
- **Admin is a permission, separate from job role.** Anyone can be given it.
- **Everyone can view everything.** It's one shared project.
- **Editing tasks:**
  - Admin and Director: any task.
  - Head of Finance: Finance-department tasks.
  - Everyone else: only tasks they created or are assigned to.
- **Accounts are deactivated, never deleted**, so history stays intact.
- **Nobody can edit the activity log**, Admin included.
- **The rules live in the database** (Row Level Security). Hidden buttons are only a convenience.

---

## Owner decisions (2026-10-15)

| # | Question | Decision |
|---|---|---|
| Q1 | App name | **HerblocX Tracker** |
| Q2 | Language | **English** |
| Q3 | Extra packages | Approved (dnd-kit, zod, Supabase CLI, vitest) |
| Q4 | File uploads | **Yes**, links **and** uploads, **10 MB per file**, private (logged-in accounts only) |
| Q5 | Permission matrix | Approved as written, including: Head of Finance can manage all milestones and edit Finance tasks; regular staff can't delete tasks; anyone can comment on and attach to any task |
| Q6 | Accounts | Internal to the website only, not real Gmail or company mailboxes. Login names look like `name@herblocx.internal`; no email is ever sent. |
| Q7 | Hosting cost | **Stay on free tiers**: Supabase Free + Vercel Hobby |
| Q8 | Environments | Two steps: **development & testing** first, then a separate **live** database created when the site is ready |
| Q9 | Small defaults | Priorities Low/Medium/High/Urgent; tasks may have no assignee or milestone; dates shown **YYYY/MM/DD**; workload = open tasks per person; recent activity = latest 20 |

## Free-tier notes the owner accepted

- **Supabase Free:**
  - 500 MB database and 1 GB file storage.
  - The project **pauses after 7 days without activity** (click "Restore" in the dashboard to wake it).
  - **No automatic backups.** Phase 5 adds a manual weekly backup routine.
- **Vercel Hobby:** free. Vercel's terms describe it as for non-commercial use. The owner chose it knowingly; upgrading later is only a plan change.

## How the work is run (rules agreed for every phase)

- **Build only what's listed.** Ask before:
  - adding any package
  - changing the approved database design
  - running destructive database commands
  - deploying
  - deleting or renaming files that weren't created in the current session
- **Secrets stay private:**
  - Never commit `.env` files.
  - Never expose the secret key to the browser.
- **If something fails twice in a row,** stop and explain in plain language.
- **At the end of each phase:**
  1. List what was done.
  2. Give browser test steps.
  3. Write a phase document.
  4. Commit.
  5. **Stop until the owner says "lanjut".**

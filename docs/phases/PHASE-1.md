# Phase 1: Foundation (and going online)

| | |
|---|---|
| **Status** | Done. Live on https://herblocx-tracker.vercel.app |
| **Dates** | 2026-10-15 (build) · 2026-10-16 (online setup and fixes) |
| **Commits** | `89a8c0b` (foundation) · `c9acc1e` (database + first deploy) · `653cd8e` (seed script fix) |
| **Database** | Supabase project `herblocx-dev` (development & testing), Singapore region |
| **Next** | Phase 2: milestones, timeline and board |

Part 1 is for the owner and Admins. Part 2 is for whoever maintains the code later.

---

# Part 1: For the owner and Admins

## What was built

| Piece | What it does |
|---|---|
| **The whole database** | All 6 tables, the permission rules, the activity-log triggers and the private file storage were built **now**, so later phases only add screens. |
| **Login / logout** | Log in with a **username** (e.g. `budi`) or the full login name (`budi@herblocx.internal`). There is no sign-up page. |
| **Change password** | Every user can change their own password (top menu → **Change password**). It asks for the current password first. |
| **Users page (Admin only)** | Add people, edit their name, username, job role and Admin permission, set a new password, and deactivate or reactivate. There is **no delete**. |
| **Seed script** | Creates the starting accounts with random passwords, saved to a private file that is never committed. |

## Accounts that exist now (development database)

| Username | Job role | Admin |
|---|---|---|
| `admin` | Director | ✅ |
| `director` | Director | |
| `head.finance` | Head of Finance | |
| `finance` | Finance | |
| `marketing` | Marketing | |
| `dev` | Software Dev | |
| `legal` | Legal | |

Passwords are in **`seed-credentials.local.md`** on the owner's computer. That file is private and never committed to git.

## How to… (Admin)

**Add a person**
1. Go to **Users** → **Add user**.
2. Fill in the full name, a username (lowercase letters, numbers, dot, dash or underscore), the job role, Admin permission (tick only if needed) and a first password of at least 8 characters.
3. Click **Create account**.
4. Share the username and password with the person **privately**. They can change the password after logging in.

**Someone forgot their password**
Go to **Users** → **Edit** next to the person → **Password** section → type a new one → **Set new password**. Share it privately.

**Someone leaves the team**
Go to **Users** → **Edit** → **Deactivate account** → confirm.
- They're logged out and blocked immediately, even in a browser that's already open.
- Their tasks, comments and history stay, shown as "(inactive)".
- You can **Reactivate** them later.

**Safety rules you'll notice**
- You can't remove your own Admin permission or deactivate yourself, so you can never lock yourself out.
- Accounts can't be created in the Supabase dashboard ("Add user" there fails on purpose). Use the **Users** page.

## Security, in plain words

- **No public sign-up:** switched off in Supabase. Even if it were switched on by mistake, a self-made account would start **switched off** with no access.
- **Permissions live in the database:** hiding a button is only a convenience. The database refuses anything the permission matrix doesn't allow.
- **The secret key** (full database access) is used only on the server, only for Admin actions, and only after checking the person is an active Admin. It's never sent to a browser.
- **Deactivated accounts** see nothing, because every database rule requires an active account.

## How it was tested

| Test | Result |
|---|---|
| **Database dry-run:** all 4 database files run on a temporary Postgres engine (PGlite, used only for checking and not part of the app), then **75 permission checks** across every role | ✅ 75 passed, 0 failed. Includes: anonymous visitors see nothing; inactive accounts see nothing; nobody makes themselves Admin; only allowed roles create, edit or delete; the log refuses edits and deletes even with the secret key; files over 10 MB and unsafe links are refused |
| Supabase security advisor on the real database | ⚠️ 1 warning: the 6 helper functions behind the permission rules can be called directly by logged-in users. Harmless (they only report the caller's own permissions); to be tidied in Phase 5. |
| Login page: wrong password, unreachable server, logged-out visitor sent to login | ✅ Clear messages; redirect works |
| Live site login and Users page | ✅ Owner confirmed (then continued to Phase 2) |
| Type check, lint, production build | ✅ Zero errors |

## Going online: what happened (2026-10-15/16)

| Step | Outcome |
|---|---|
| Supabase project `herblocx-dev` created through the Supabase connector (free, $0/month, Singapore) | ✅ The owner's older paused project was left untouched |
| 4 database files applied; security advisor run | ✅ (see the warning above) |
| Vercel project `herblocx-tracker` created; public settings added | ✅ |
| First deploy by direct file upload | ✅ Login page live |
| Owner chose to put the code on GitHub (public repo `AgakSedikitGatal/herblocx-tracker`) | ✅ The site is now built from GitHub |
| **Problem 1:** seed failed with "Invalid API key" | The secret key had been copied from the **other** Supabase project. Fixed by copying it from `herblocx-dev` using a direct link. |
| **Problem 2:** seed failed with "fetch failed" | The internet connection was dropping (Google and GitHub failed too). The seed script now **retries automatically** and **finishes half-created accounts**. All 7 accounts were then created. |
| Public sign-ups switched off on `herblocx-dev` | ✅ Confirmed through Supabase's public settings |
| Secret key added to Vercel (Production) and site rebuilt | ✅ |

**Lesson for the live database (Phase 5):** always open Supabase through the **direct project link**, and check the project name at the top of the page before copying keys or changing settings.

---

# Part 2: For developers

## Project layout (main parts)

| Path | Purpose |
|---|---|
| `app/login/` | Login page, login/logout server actions |
| `app/(app)/layout.tsx` | Signed-in shell: header and menu. Sends logged-out or deactivated users to `/login`. |
| `app/(app)/account/` | Change own password. Checks the current password with a throw-away client, then `auth.updateUser`. |
| `app/(app)/admin/users/` | Users list, create and edit. Server actions in `actions.ts`. |
| `lib/supabase/server.ts` | Server client as the logged-in user (RLS applies) |
| `lib/supabase/admin.ts` | Secret-key client; `import "server-only"`; used only inside Admin actions after `getAdminForAction()` |
| `lib/supabase/proxy.ts`, `proxy.ts` | Next.js 16 "proxy" (formerly middleware): refreshes the session, redirects logged-out visitors |
| `lib/auth.ts` | `getAuthState`, `requireProfile`, `requireAdminPage`, `getAdminForAction` |
| `lib/database.types.ts` | Database types (same shape as `supabase gen types`; regenerate with `npm run db:types`) |
| `scripts/seed.mjs` | `npm run seed` (dev: Admin + 6 roles) · `npm run seed:live` (Admin only). Retries on network errors; finishes accounts whose profile was never switched on. |
| `supabase/migrations/` | `…041803_schema.sql`, `…041821_rls.sql`, `…041843_activity_log.sql`, `…041855_storage.sql`. The file names match the versions recorded in Supabase. |
| `docs/SUPABASE_SETUP.md` | Step-by-step Supabase setup (the recipe for the live project) |

## Database design highlights

- **Profiles** are created by a trigger on `auth.users`. They start `is_active = false`, `is_admin = false`; the Admin page or the seed script switches them on. `on delete restrict` stops logins from being deleted.
- **Helper functions** (`is_active_user`, `is_admin`, `current_job_role`, `can_manage_milestones`, `can_edit_task`, `can_delete_task`) are `SECURITY DEFINER` with an empty `search_path`, and are used by every policy.
- **Column-level grants:** the app can only write specific columns. `created_by`, `author_id` and `added_by` default to `auth.uid()` and can't be changed. `anon` has no grants at all.
- **Guards:** an Admin can't change their own `is_admin` or `is_active`; new owners and assignees must be active.
- **Email sync:** changing a login name through the auth admin API updates `profiles.email` via a trigger.
- **Views** use `security_invoker = true`: `task_board` (with `is_overdue`), `milestone_progress`, `task_status_counts`, `person_workload`.
- **Storage:**
  - Private bucket `task-files`, 10 MB limit, allowed types: PDF, JPG/PNG, Office documents, CSV, ZIP.
  - Paths look like `<task id>/<random id>-<name>`.
  - A file can only be removed once no attachment row points to it.

## Environment variables

| Name | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Vercel | Public (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | `.env.local`, Vercel (sensitive, Production) | **Secret** (`sb_secret_…`). Server only. |

`.env.local`, `seed-credentials.local.md`, `.next/` and `node_modules/` are git-ignored.

## Deployment

- GitHub: `AgakSedikitGatal/herblocx-tracker` (public).
- The Vercel project is not auto-linked. After pushing, deploy with the Vercel connector `create_deployment` and `gitSource: { type: "github", org: "AgakSedikitGatal", repo: "herblocx-tracker", ref: "main" }`, target `production`.
- Node 22.x (from `package.json` `engines`).

## Known notes

- `npm audit` reports 5 "high" findings inside the ESLint toolchain (`eslint-config-next` → `fast-glob` → `micromatch` → `braces`). They're dev-only and never part of the website. npm's suggested "fix" would downgrade Next.js tooling, so it was not applied.
- ESLint 9 is marked "no longer supported" by npm. It was kept until the Next.js lint plugins support ESLint 10. Dev-only.

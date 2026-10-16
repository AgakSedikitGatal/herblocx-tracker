# HerblocX Tracker

Internal project tracker for the HerblocX project, for about 10–12 people on accounts the Admin creates. There is no public sign-up. All dates and times are shown in **Asia/Jakarta** time.

**Website:** https://herblocx-tracker.vercel.app

| Feature | Where |
|---|---|
| Dashboard: tasks by status, overdue tasks, milestone progress, workload per person, recent activity | **Dashboard** (home page) |
| Kanban board (To Do → In Progress → Review → Done) with drag and drop and filters | **Board** |
| A **month calendar** of all deadlines, then milestones with a timeline and automatic progress | **Milestones** |
| Comments, task history and file/link attachments on every task | Open any task |
| Append-only activity log | **Activity** |
| Account management (Admin only) | **Users** |

**Who can do what:** see the approved permission matrix in [PLAN.md](PLAN.md) (section 4). It is enforced by the database itself, and checked by 122 automated tests.

---

## For the Admin: everyday tasks

**Add a person**
1. Go to **Users** → **Add user**.
2. Fill in:
   - full name
   - username: lowercase letters, numbers, `.`, `-` or `_`; they log in with it, e.g. `budi`
   - job role
   - Admin permission: tick **only** if they should manage accounts
   - first password: at least 8 characters
3. Click **Create account**, then share the username and password with them **privately**. They can change the password via **Change password**.

**Someone forgot their password:** go to **Users** → **Edit** next to them → **Password** → type a new one → **Set new password**. Share it privately.

**Someone leaves:** go to **Users** → **Edit** → **Deactivate account**.
- They're blocked immediately.
- Their work and history stay, shown as "(inactive)".
- You can **Reactivate** them later.
- Accounts are never deleted.

**Things that are blocked on purpose:**
- You can't remove your own Admin permission or deactivate yourself, so you can't lock yourself out.
- "Add user" in the Supabase dashboard doesn't work. Always use the **Users** page.

---

## Backups (do this weekly)

The free Supabase plan makes **no automatic backups**, so make your own:

1. Open the Terminal in this project folder and run:

   ```bash
   npm run backup:live
   ```

   (`npm run backup` backs up the test database instead.)
2. It creates a folder like `backups/wsodkxhhwmmdeitnxmzi-2026-10-23-09-00/` containing:
   - one file per table (users, milestones, tasks, comments, attachments, activity log)
   - a `files/` folder with every uploaded file
3. **Copy that folder somewhere safe**, such as an external drive or a private cloud folder. It contains all project data, so keep it private. The `backups/` folder is never uploaded to GitHub.

What isn't included: login passwords (Supabase only stores scrambled versions). After a restore, the Admin gives everyone new passwords.

**Restoring** is a developer job (about an hour). The backup has everything needed:
1. Create a fresh Supabase project and apply `supabase/migrations/` in order.
2. Recreate the accounts.
3. Import the tables in this order: milestones → tasks → comments → attachments → activity log.
4. Upload `files/` back into the `task-files` storage bucket at the same paths.

---

## Run it on your own computer

**You need:** Node.js 22 (`node -v` should show v22.x) and git.

1. Get the code and install everything:

   ```bash
   git clone https://github.com/AgakSedikitGatal/herblocx-tracker.git
   ```

   ```bash
   cd herblocx-tracker
   ```

   ```bash
   npm install
   ```

2. Create your settings file from the template, then fill in the three values from the **herblocx-dev** Supabase project (see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)):

   ```bash
   cp .env.example .env.local
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000. Press **Ctrl + C** in the Terminal to stop it.

### All commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the app on your computer (http://localhost:3000) |
| `npm test` | Run the 122 automated permission tests (only against `herblocx-dev`; takes about 30 s) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Code checks; all must pass with zero errors before a release |
| `npm run seed` | Create the starting accounts on the **test** database |
| `npm run seed:live` | Create the Admin account on the **live** database (uses `.env.production.local`) |
| `npm run backup` / `npm run backup:live` | Back up the test / live database to `backups/` |

### Settings files (never committed to git)

| File | Database | Used by |
|---|---|---|
| `.env.local` | `herblocx-dev` (test) | `npm run dev`, `npm test`, `npm run seed`, `npm run backup` |
| `.env.production.local` | `herblocx-prod` (live) | `npm run seed:live`, `npm run backup:live` |
| `seed-credentials.local.md` | both | Passwords created by the seed scripts. Keep private. |

The website's own settings live in Vercel. See [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

---

## Documentation

| Document | What's in it |
|---|---|
| [PLAN.md](PLAN.md) | Scope, data model, **permission matrix**, owner decisions |
| [docs/phases/README.md](docs/phases/README.md) | One document per development phase (user guide, tests, developer notes) |
| [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) | Deploying, settings, switching to the live database, rollback |
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | Setting up a Supabase project step by step |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript 6 (strict) · Supabase (Postgres + Row Level Security, Auth, Storage) · Tailwind CSS 4 + shadcn/ui · @dnd-kit · zod · hosted on Vercel. Exact versions are in `package.json`.

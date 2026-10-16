# Phase 5: Hardening, live database and handover

| | |
|---|---|
| **Status** | Done. The website still uses `herblocx-dev` by the owner's choice; the live database `herblocx-prod` is ready to switch to. |
| **Date** | 2026-10-16 |
| **Databases** | `herblocx-dev` (test) · **`herblocx-prod` (live, new)** |
| **Next** | Owner: the 3 one-time live set-up steps, then switch the website when ready ([DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md)) |

Part 1 is for the owner. Part 2 is for whoever maintains the code later.

---

# Part 1: For the owner

## What was done

| # | Item | Result |
|---|---|---|
| 1 | **Automated permission tests**: log in as every role and try every forbidden action | ✅ **122 tests, all passing.** Every forbidden action is refused by the database. |
| 2 | **Security tidy-up**: the Supabase advisor warning from Phase 1 | ✅ Fixed. The 6 permission helper functions are no longer reachable through the API. |
| 3 | **Live database `herblocx-prod`** created (free, Singapore) | ✅ Identical rules to the tested dev database (verified by fingerprint: 182 rules, triggers, functions and grants match). Security advisor: no issues. |
| 4 | **Backup tool**: `npm run backup:live` | ✅ Saves all tables and uploaded files to your computer |
| 5 | **Vercel deploy guide** | ✅ [docs/DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md) |
| 6 | **README**: adding users, backups, running locally | ✅ [README.md](../../README.md) |
| 7 | Type check, lint, production build | ✅ Zero errors, zero warnings |

## What the 122 tests check

The tests use their own accounts: `autotest.admin`, `autotest.director`, … one per role, plus a **deactivated** one. Every run also checks a **logged-out visitor**. For each forbidden action they expect the database to say **no**. A few allowed actions are checked too, so the tests can't pass just because everything is blocked.

| Area | Examples of what must be refused |
|---|---|
| Logged-out visitor | Seeing any data · creating tasks · **signing up** · downloading files |
| Deactivated account (still logged in) | Seeing anything · creating tasks, comments or links · downloading files |
| Accounts | Non-Admins editing other accounts · anyone making themselves Admin · changing their own job role · creating or deleting accounts · changing login emails directly · Admin removing their own Admin permission or deactivating themselves |
| Milestones | Finance, Marketing, Software Dev and Legal creating milestones · non-owners editing · anyone except Admin/Director deleting · faking "created by" |
| Tasks | Editing, moving or reassigning tasks you didn't create and aren't assigned to (Head of Finance: only Finance tasks) · deleting (only Admin, Director, Head of Finance for Finance tasks) · faking "created by" · assigning to deactivated people |
| Comments | Anyone, **even Admin**, editing someone else's comment · non-authors deleting (except Admin) · posting as someone else |
| Attachments & files | Editing attachments · removing someone else's (except Director/Admin) · `javascript:` links · files over 10 MB · `.exe` files · uploading outside a task's folder · removing a file still attached to a task |
| Activity log | **Every role, and even the secret key**, adding, editing or deleting log entries |
| Database internals | Calling the permission helper functions through the API |

**How to run them:**

```bash
npm test
```

It takes about 30 seconds and runs only against the **test** database. If a run says "network problem", re-run it; network drops are never counted as a pass. After each run, the test data is removed and the test accounts are switched off, so they never appear as people you can assign work to. They do appear as **inactive** in **Users** on the test site.

## Changes from the plan (owner decisions on 2026-10-16)

- **Test tool:** `vitest` could not be installed. npm itself crashed three times on a bug in its dependency handling.
  - The owner chose **Node.js's built-in test runner** instead.
  - This means **no new packages**, and the tests run the same way with `npm test`.
- **Old Supabase project paused:** the free plan allows only 2 active projects, and the older "AgakSedikitGatal's Project" was active again. The owner chose to **pause** it. Nothing was deleted, and it can be restored from the Supabase dashboard.
- **Website stays on `herblocx-dev` for now** (owner's choice). Switching is a 5-minute job, described in DEPLOY_VERCEL.md.
- **Security advisor note "Leaked password protection disabled"** (checking passwords against a list of known-leaked ones): this is a **paid-plan** Supabase feature, so it stays off on the free plan. Passwords still need at least 8 characters.

## Your one-time steps for the live database

These need your Supabase login or the secret key, so only you can do them. Full instructions: [DEPLOY_VERCEL.md → "Switch the website to the live database"](../DEPLOY_VERCEL.md#switch-the-website-to-the-live-database-herblocx-prod).

1. **Switch off sign-ups** in `herblocx-prod`. It's currently ON, as in every new project. Even so, a self-made account would start switched off with no access.
2. **Copy the live secret key** into `.env.production.local`. Claude already created this file with the public values filled in.
3. **Run `npm run seed:live`** to create your live **admin** account.

Then, whenever you're ready: **switch Vercel's 3 settings** to the live values and redeploy.

## Done-when checklist (from the brief)

| Requirement | Status |
|---|---|
| Every role can do exactly what the approved matrix allows, and nothing more, **verified by tests** | ✅ 122/122 tests pass |
| The build passes with no errors | ✅ Build, lint and type check: zero errors |
| You can log in on the deployed Vercel URL with a seeded account | ✅ Seeded **admin** on https://herblocx-tracker.vercel.app (test database). After switching: the **live** admin from `seed:live`. |

---

# Part 2: For developers

## Files added or changed

| File | Purpose |
|---|---|
| `supabase/migrations/20261016070803_private_helpers.sql` | Moves `is_active_user`, `is_admin`, `current_job_role`, `can_manage_milestones`, `can_edit_task` and `can_delete_task` to schema `private` (not exposed by PostgREST). Policies reference functions by OID, so they keep working. The three helpers that call others are re-created with `private.` names. Execute rights: `authenticated`, `service_role` only. |
| `lib/database.types.ts` | Only `jakarta_today` remains under `Functions`. |
| `tests/helpers.mjs` | Loads `.env.local`. **Refuses to run against any project except `herblocx-dev`.** Retrying `fetch`. Creates or resets the `autotest.*` accounts with fresh random passwords on every run. Assertion helpers: `assertRefused` accepts only refusal codes (`42501`, `PGRST116`, `P0001`, `23514`, `PGRST202`, `PGRST204`) or "0 rows", and **fails on network errors**; `assertAllowed`; `assertStorageRefused`. |
| `tests/permissions.test.mjs` | The 122 tests (`node:test`, run one at a time). The `before` hook creates fixtures as the test Admin; the `after` hook removes `AUTOTEST%` tasks, milestones and files with the secret key and switches the accounts off. |
| `package.json` | `test`, `seed:live` (now uses `--env .env.production.local`), `backup`, `backup:live` |
| `scripts/seed.mjs` | New `--env <file>` option |
| `scripts/backup.mjs` | Exports the 6 tables (1000 rows per page) and downloads every attached file to `backups/<ref>-<timestamp>/`, with a summary in `README.txt` |
| `.gitignore` | `backups/` |
| `README.md`, `docs/DEPLOY_VERCEL.md` | Handover documentation |

## Environments

| | `herblocx-dev` | `herblocx-prod` |
|---|---|---|
| Ref | `ieieeklmyircdgjduvkx` | `wsodkxhhwmmdeitnxmzi` |
| Migrations | The 5 files in `supabase/migrations/` (versions match the file names) | The same 5 files, applied through the Supabase connector (Supabase recorded its own version timestamps) |
| Local settings file | `.env.local` | `.env.production.local` |
| Used by | Website (for now), `npm run dev`, `npm test` | Website after the switch |

**Applying future migrations:** test on dev first (`npm test`), then apply the identical SQL to prod. Compare the two with the fingerprint query used on 2026-10-16: an md5 over policies, triggers, function bodies and table/column grants.

## Known notes

- `npm audit`: 5 "high" findings inside the ESLint toolchain only (dev-only, not part of the website). See PHASE-1.md.
- The activity log on dev permanently contains test-run entries (by design, they can't be deleted). Prod starts empty.

# HerblocX Tracker: development documentation

One document per development phase. Each has a plain-language part for users and Admins, and a technical part for whoever maintains the code later.

| Phase | Topic | Status | Document |
|---|---|---|---|
| 0 | Plan: scope, tools, data model, permission matrix, owner decisions | ✅ Done (2026-10-15) | [PHASE-0.md](PHASE-0.md) |
| 1 | Foundation: database + permission rules, login, Users page, seed accounts, going online | ✅ Done (2026-10-15/16) | [PHASE-1.md](PHASE-1.md) |
| 2 | Milestones, timeline, task board with drag and drop and filters | ✅ Done (2026-10-16) | [PHASE-2.md](PHASE-2.md) |
| 3 | Comments and activity log | ✅ Done (2026-10-16) | [PHASE-3.md](PHASE-3.md) |
| 4 | Dashboard and attachments (links + 10 MB private uploads) | ✅ Done (2026-10-16) | [PHASE-4.md](PHASE-4.md) |
| 5 | Hardening: 122 automated permission tests, security tidy-up, live database, backups, deploy guide, README | ✅ Done (2026-10-16) | [PHASE-5.md](PHASE-5.md) |

## Additions after Phase 5

| # | Topic | Status | Document |
|---|---|---|---|
| 1 | Milestones **calendar** (top of the Milestones page): Google-Calendar-style month view, filled in automatically from task due dates and milestone end dates | ✅ Done (2026-10-16) | [ADDITION-1-CALENDAR.md](ADDITION-1-CALENDAR.md) |
| 2 | Readable **Activity** (grouped by day, one line per event, filters) and a **colour refresh** (herbal green brand, colour-coded statuses) | ✅ Done (2026-10-17) | [ADDITION-2-ACTIVITY-AND-COLOURS.md](ADDITION-2-ACTIVITY-AND-COLOURS.md) |

## Where things are

| What | Where |
|---|---|
| Live website (currently on the test database) | https://herblocx-tracker.vercel.app |
| Deploy guide, switching to the live database | [docs/DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md) |
| Admin tasks, backups, running locally | [README.md](../../README.md) |
| Scope, data model, **permission matrix**, owner decisions | [PLAN.md](../../PLAN.md) |
| Supabase setup recipe | [docs/SUPABASE_SETUP.md](../SUPABASE_SETUP.md) |
| Database structure and rules | `supabase/migrations/` |
| Code | GitHub `AgakSedikitGatal/herblocx-tracker` |
| Test-account passwords | `seed-credentials.local.md` on the owner's computer (private, never committed) |

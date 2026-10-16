# HerblocX Tracker: development documentation

One document per development phase. Each has a plain-language part for users and Admins, and a technical part for whoever maintains the code later.

| Phase | Topic | Status | Document |
|---|---|---|---|
| 0 | Plan: scope, tools, data model, permission matrix, owner decisions | ✅ Done (2026-10-15) | [PHASE-0.md](PHASE-0.md) |
| 1 | Foundation: database + permission rules, login, Users page, seed accounts, going online | ✅ Done (2026-10-15/16) | [PHASE-1.md](PHASE-1.md) |
| 2 | Milestones, timeline, task board with drag and drop and filters | ✅ Done (2026-10-16) | [PHASE-2.md](PHASE-2.md) |
| 3 | Comments and activity log | ✅ Done (2026-10-16) | [PHASE-3.md](PHASE-3.md) |
| 4 | Dashboard and attachments (links + 10 MB private uploads) | ✅ Done (2026-10-16) | [PHASE-4.md](PHASE-4.md) |
| 5 | Hardening: automated permission tests, live database, deploy guide, README | ⏳ Next | |

## Where things are

| What | Where |
|---|---|
| Live website (development database) | https://herblocx-tracker.vercel.app |
| Scope, data model, **permission matrix**, owner decisions | [PLAN.md](../../PLAN.md) |
| Supabase setup recipe | [docs/SUPABASE_SETUP.md](../SUPABASE_SETUP.md) |
| Database structure and rules | `supabase/migrations/` |
| Code | GitHub `AgakSedikitGatal/herblocx-tracker` |
| Test-account passwords | `seed-credentials.local.md` on the owner's computer (private, never committed) |

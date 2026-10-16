# Deploying HerblocX Tracker on Vercel: plain-language guide

**Website:** https://herblocx-tracker.vercel.app · **Vercel project:** `herblocx-tracker` · **Code:** GitHub `AgakSedikitGatal/herblocx-tracker`

## How it fits together

```
Your computer ──git push──▶ GitHub (the code) ──build──▶ Vercel (the website) ──▶ Supabase (data, logins, files)
```

- **GitHub** keeps the code.
- **Vercel** turns the code into the website. A new version of the website is called a **deployment**.
- **Supabase** holds the data. There are two Supabase projects:

| Supabase project | Used for | Website points to it? |
|---|---|---|
| `herblocx-dev` | Testing, automated tests, running the app on your computer | ✅ **Yes, today** (2026-10-16) |
| `herblocx-prod` | Real work: the live database | Not yet. See "Switch the website to the live database" below. |

## The website's settings (environment variables)

In Vercel: **herblocx-tracker → Settings → Environment Variables**

| Name | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The Supabase project's URL, `https://<ref>.supabase.co` | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The project's **publishable** key (`sb_publishable_…`) | No |
| `SUPABASE_SECRET_KEY` | The project's **secret** key (`sb_secret_…`). Mark it **Sensitive**. | **Yes. Never share it.** |

All three must come from the **same** Supabase project. After changing any of them, **redeploy** (below), or the website keeps the old values.

## Redeploy (publish the latest code or new settings)

1. Go to https://vercel.com and open **herblocx-tracker**.
2. Click **Deployments**.
3. On the newest one, click **⋯** → **Redeploy** → **Redeploy**.
4. Wait about 1–2 minutes until it shows **Ready**, then open the website.

## Optional, but recommended: automatic deploys from GitHub

Right now a new deployment has to be started (by Claude, or by you with "Redeploy"). To make **every push to GitHub publish automatically**:

1. Vercel → **herblocx-tracker** → **Settings** → **Git**.
2. Click **Connect Git Repository** → **GitHub** → choose **AgakSedikitGatal/herblocx-tracker**.
3. If asked, allow Vercel access to that repository.
4. Keep **Production Branch** = `main`.

## Switch the website to the live database (`herblocx-prod`)

Do this when you're ready for real use. Test data stays behind in `herblocx-dev`.

**Before you start** (one-time set-up of the live project):
1. **Switch off sign-ups:** open https://supabase.com/dashboard/project/wsodkxhhwmmdeitnxmzi/auth/providers and check that the page says **herblocx-prod**. Turn **OFF** "Allow new users to sign up" and click **Save**. Then click **Email**, set **Minimum password length** to `8` and click **Save**.
2. **Copy the live secret key:** open https://supabase.com/dashboard/project/wsodkxhhwmmdeitnxmzi/settings/api-keys (it should say **herblocx-prod**), reveal the **secret key** and copy it.
3. **Put it in your live settings file.** In the Terminal, run:

   ```bash
   open -e .env.production.local
   ```

   Paste the key after `SUPABASE_SECRET_KEY=`, then save and close.
4. **Create your live Admin account:**

   ```bash
   npm run seed:live
   ```

   The password is added to `seed-credentials.local.md`.

**Switch:**

5. In Vercel → **Settings → Environment Variables**, **edit** (⋯ → Edit) each of the three settings and replace its value with the **herblocx-prod** value:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://wsodkxhhwmmdeitnxmzi.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_n89OB6T643ktHsxEbwN1KA_8XZMBB8Y`
   - `SUPABASE_SECRET_KEY` = the live secret key from step 2
6. **Redeploy** (see above).
7. Open the website and log in as **admin** with the **live** password. The Dashboard should be empty: no test tasks.
8. Go to **Users** and add your real team.

To switch back to the test database, put the `herblocx-dev` values back and redeploy.

## Undo a bad release (instant rollback)

Vercel → **herblocx-tracker → Deployments** → find the last version that worked → **⋯** → **Promote to Production** (or **Instant Rollback**). This takes seconds and doesn't touch any data.

## Free-plan facts to know

- **Vercel Hobby** is free. Vercel describes it as for non-commercial use; moving to Pro later is only a plan change.
- **Supabase Free:**
  - A project **pauses after 7 days with no activity**. Daily use prevents this. If it happens, open the project in Supabase and click **Restore**.
  - **No automatic backups.** Run `npm run backup:live` weekly (see README.md).
  - Free accounts can have **2 active projects**: `herblocx-dev` and `herblocx-prod`. Your older "AgakSedikitGatal's Project" was **paused** on 2026-10-16 to make room. Nothing was deleted; you can restore it from the Supabase dashboard if you pause another one.

## Troubleshooting

| What you see | What to do |
|---|---|
| Login page says **"Cannot reach the login server"** | Check `NEXT_PUBLIC_SUPABASE_URL` in Vercel, and that the Supabase project isn't paused. Then redeploy. |
| **Users → Add user** shows **"Invalid API key"** or **"SUPABASE_SECRET_KEY is missing"** | The secret key in Vercel is wrong, missing, or from the other project. Copy it again from the right project and redeploy. |
| Everyone suddenly sees an empty site | The three settings point to different projects, or to the empty live project without accounts. Check all three, then redeploy. |
| Deployment shows **Error** | Open it in Vercel → **Build Logs**, copy the red lines and send them to your developer. Use **Instant Rollback** meanwhile. |

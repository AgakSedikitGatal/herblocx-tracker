# Supabase setup: step by step

> **Status of `herblocx-dev` (2026-10-15):** Claude already created the project, applied the 4 database files and
> deployed the app to https://herblocx-tracker.vercel.app using the Supabase and Vercel connectors.
> Project ref: `ieieeklmyircdgjduvkx`. `.env.local` already holds the URL and publishable key.
> **Still to do by you:** Part B (sign-ups off), paste the secret key (Part C step 3) into `.env.local`
> and into Vercel, then Part F (seed). The full guide below stays as the recipe for the live project in Phase 5.

This sets up the **development & testing** project, `herblocx-dev`. You'll repeat the same steps for the live project (`herblocx-prod`) in Phase 5.

Time needed: about 20 minutes. Supabase sometimes renames buttons slightly. If something looks different, look for the closest match, or stop and ask.

You'll need **three windows**:
- your browser
- the **Terminal** (the commands below are typed there, in the project folder)
- a place to keep secrets safely, such as a password manager

---

## Part A: Create the project

1. Go to **https://supabase.com/dashboard** and sign in. (If you don't have an account yet, create a free one.)
2. Click **New project**.
3. Fill in:
   - **Name:** `herblocx-dev`
   - **Database Password:** click **Generate a password**, then **copy it and save it in your password manager** right away. You need it in Part E.
   - **Region:** **Southeast Asia (Singapore)**
   - **Plan:** Free
4. Leave every other option as it is. Click **Create new project**.
5. Wait 1–2 minutes until the project dashboard opens.

## Part B: Lock down sign-ups (important security step)

1. In the left sidebar, click **Authentication**.
2. Open **Sign In / Providers** (it may be under a "Configuration" heading).
3. Turn **OFF** "**Allow new users to sign up**". Click **Save**.
   This stops anyone in the world from creating an account. Only the Admin page can.
4. On the same page, click the **Email** provider:
   - Keep the **Email** provider **enabled** (that is how people log in).
   - Set **Minimum password length** to **8**.
   - Make sure **Secure password change** is **OFF**. The app checks the current password itself.
   - Click **Save**.

## Part C: Copy your keys

1. Click the **gear icon (Project Settings)** at the bottom of the left sidebar, then **API Keys**.
   - If you see a button like **Create new API keys**, click it.
2. Copy the **Publishable key**. It starts with `sb_publishable_`.
3. Under **Secret keys**, click the eye/reveal icon and copy the key. It starts with `sb_secret_`.
   **Treat it like a bank password.** It gives full access to the database. Never paste it into chat, email or Slack.
4. Find the **Project URL**: click the **Connect** button at the top of the dashboard (or Project Settings → **Data API**). It looks like `https://abcdefghijklmnop.supabase.co`.
   The part between `https://` and `.supabase.co` (here `abcdefghijklmnop`) is your **project ref**. You need it in Part E.

## Part D: Put the keys into the app (on your computer only)

In the Terminal, inside the project folder, run:

```bash
cp .env.example .env.local
```

```bash
open -e .env.local
```

TextEdit opens. Paste each value right after its `=` sign, with no spaces and no quotes:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Save (⌘S) and close TextEdit. Git is set to ignore this file, so it can never be committed.

## Part E: Create the database tables and permission rules

1. Connect the Supabase tool to your account. A browser tab opens; click **Authorize**:

   ```bash
   npx supabase login
   ```

2. Connect this project folder to `herblocx-dev`. Replace `YOUR_PROJECT_REF` with the ref from Part C step 4:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   When it asks for the **database password**, paste the one you saved in Part A and press Enter. Nothing shows while you paste; that is normal.

3. Send the database files to Supabase:

   ```bash
   npm run db:push
   ```

   It lists 4 files (`..._schema.sql`, `..._rls.sql`, `..._activity_log.sql`, `..._storage.sql`) and asks to confirm. Type `Y` and press Enter.

4. **Check it worked:** in the Supabase dashboard, open **Table Editor**. You should see 6 tables:
   - `profiles`, `milestones`, `tasks`, `task_comments`, `task_attachments`, `activity_log`
   - None of them should show a red "RLS disabled" / "Unrestricted" warning.

   Then open **Storage**. You should see a private bucket called `task-files`.

## Part F: Create the starting accounts

```bash
npm run seed
```

You should see 7 lines starting with `created`: admin, director, head.finance, finance, marketing, dev, legal.
The passwords are saved in the file `seed-credentials.local.md`. Open it with:

```bash
open -e seed-credentials.local.md
```

Keep this file private. Git ignores it. Once everything works, you can move the passwords into your password manager and delete the file.

## Part G: Run the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. Log in with username **admin** and the admin password from `seed-credentials.local.md`.
To stop the app later, click the Terminal and press **Ctrl + C**.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| `npm run seed` says **Missing NEXT_PUBLIC_SUPABASE_URL...** | `.env.local` is missing or a value is empty. Redo Part D. |
| `supabase link` says the **password is wrong** | Project Settings → **Database** → **Reset database password**, save the new one, and run the link command again. |
| `db:push` or `link` mentions **IPv6**, **timeout** or **could not connect** | Copy the full error message and send it to me. |
| `npm run seed` says **email address invalid** | Send me the message. Supabase may be rejecting the `herblocx.internal` login names, and I'll switch to another format. |
| Login page says **Cannot reach the login server** | Check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`, then stop the app (Ctrl + C) and run `npm run dev` again. |
| Supabase dashboard **"Add user"** fails with "Database error" | Expected. Accounts must be created from the app's **Users** page. |

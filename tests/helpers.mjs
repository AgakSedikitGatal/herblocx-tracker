// Shared setup for the permission tests (run with `npm test`).
// They talk to the DEVELOPMENT database named in .env.local, never the live one.

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env.local");
export const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !PUBLISHABLE_KEY || !SECRET_KEY) {
  throw new Error("Tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local");
}
// Safety net: refuse to run against anything but the development project.
if (process.env.TEST_ALLOW_PROJECT !== new URL(URL_).host && !URL_.includes("ieieeklmyircdgjduvkx")) {
  throw new Error(`Refusing to run tests against ${URL_}: tests only run on the development database.`);
}

export const BUCKET = "task-files";
export const DOMAIN = "herblocx.internal";
export const ROLES = ["admin", "director", "head_of_finance", "finance", "marketing", "software_dev", "legal"];

// Test accounts: "admin" has the Admin permission with job role Legal, to prove that Admin
// power comes from the permission, not the job role.
const ACCOUNTS = {
  admin: { jobRole: "legal", isAdmin: true },
  director: { jobRole: "director" },
  head_of_finance: { jobRole: "head_of_finance" },
  finance: { jobRole: "finance" },
  marketing: { jobRole: "marketing" },
  software_dev: { jobRole: "software_dev" },
  legal: { jobRole: "legal" },
  inactive: { jobRole: "finance" },
};
const emailOf = (key) => `autotest.${key.replaceAll("_", "-")}@${DOMAIN}`;

// The internet connection may drop now and then: retry network failures (not refusals).
async function retryingFetch(input, init) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= 6) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
}

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: retryingFetch },
};

export const service = createClient(URL_, SECRET_KEY, options);
export const anonymous = () => createClient(URL_, PUBLISHABLE_KEY, options);

// Creates (or resets) every test account, logs each one in, and returns
// { users: { role: { id, client } }, inactive: { id, client } }.
export async function setUpAccounts() {
  const users = {};
  for (const [key, spec] of Object.entries(ACCOUNTS)) {
    const email = emailOf(key);
    const password = randomBytes(18).toString("base64url");
    let id;

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Autotest ${key.replaceAll("_", " ")}`, job_role: spec.jobRole },
    });
    if (created.error) {
      if (created.error.code !== "email_exists") throw created.error;
      const { data: profile, error } = await service.from("profiles").select("id").eq("email", email).single();
      if (error) throw error;
      id = profile.id;
      const reset = await service.auth.admin.updateUserById(id, { password, ban_duration: "none" });
      if (reset.error) throw reset.error;
    } else {
      id = created.data.user.id;
    }

    const activated = await service
      .from("profiles")
      .update({ is_active: true, is_admin: Boolean(spec.isAdmin), job_role: spec.jobRole })
      .eq("id", id);
    if (activated.error) throw activated.error;

    const client = anonymous();
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw new Error(`Could not log in as ${email}: ${signedIn.error.message}`);
    users[key] = { id, client, email };
  }

  // The "inactive" account keeps its live session but is switched off, like someone
  // deactivated while their browser is still open.
  const off = await service.from("profiles").update({ is_active: false }).eq("id", users.inactive.id);
  if (off.error) throw off.error;

  const { inactive, ...roles } = users;
  return { users: roles, inactive };
}

// After the run: switch the test accounts off so they don't appear as assignee choices.
export async function switchOffAccounts(users) {
  const ids = Object.values(users).map((u) => u.id);
  await service.from("profiles").update({ is_active: false, is_admin: false }).in("id", ids);
}

const REFUSAL_CODES = new Set([
  "42501", // permission denied / row-level security
  "PGRST116", // .single() found 0 rows (the rules hid the row)
  "P0001", // our own database rule raised an error
  "23514", // a check rule refused the values
  "PGRST202", // function not found in the API
  "PGRST204", // column not available to write
]);

function assertNotNetwork(error, label) {
  assert.doesNotMatch(
    `${error?.message ?? ""} ${error?.name ?? ""}`,
    /fetch failed|network|timed? ?out|ECONN|AuthRetryableFetchError/i,
    `${label}: network problem, not a real answer. Re-run the tests.`,
  );
}

// The database refused: either an error that means "not allowed", or nothing was changed/returned.
export function assertRefused(result, label) {
  if (result.error) {
    assertNotNetwork(result.error, label);
    assert.ok(
      REFUSAL_CODES.has(result.error.code),
      `${label}: unexpected error ${result.error.code}: ${result.error.message}`,
    );
    return;
  }
  const rows = Array.isArray(result.data) ? result.data : result.data == null ? [] : [result.data];
  assert.equal(rows.length, 0, `${label}: was ALLOWED but should be refused`);
}

export function assertAllowed(result, label) {
  if (result.error) assertNotNetwork(result.error, label);
  assert.equal(result.error, null, `${label}: refused (${result.error?.code}: ${result.error?.message})`);
  const rows = Array.isArray(result.data) ? result.data : [result.data];
  assert.ok(rows.length > 0 && rows[0] != null, `${label}: nothing happened`);
}

// Storage answers in its own format.
export function assertStorageRefused(result, label) {
  assert.ok(result.error, `${label}: was ALLOWED but should be refused`);
  assertNotNetwork(result.error, label);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

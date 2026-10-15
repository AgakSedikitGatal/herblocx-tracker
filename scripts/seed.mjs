// Creates the starting accounts in the Supabase project named in .env.local.
//
//   npm run seed        -> development project: 1 Admin + 1 test account per job role
//   npm run seed:live   -> live project: only the Admin account
//
// Passwords are generated at random and written to seed-credentials.local.md
// (never committed to git). Running it again skips accounts that already exist.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const DOMAIN = "herblocx.internal";
const CREDENTIALS_FILE = "seed-credentials.local.md";

loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const adminOnly = process.argv.includes("--admin-only");
const accounts = [
  { username: "admin", fullName: "Admin", jobRole: "director", isAdmin: true },
  ...(adminOnly
    ? []
    : [
        { username: "director", fullName: "Test Director", jobRole: "director" },
        { username: "head.finance", fullName: "Test Head of Finance", jobRole: "head_of_finance" },
        { username: "finance", fullName: "Test Finance", jobRole: "finance" },
        { username: "marketing", fullName: "Test Marketing", jobRole: "marketing" },
        { username: "dev", fullName: "Test Software Dev", jobRole: "software_dev" },
        { username: "legal", fullName: "Test Legal", jobRole: "legal" },
      ]),
];

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Seeding ${new URL(url).host} (${adminOnly ? "Admin only" : "Admin + test accounts"})\n`);

const created = [];
let failed = false;
for (const account of accounts) {
  const email = `${account.username}@${DOMAIN}`;
  const password = randomBytes(12).toString("base64url");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName, job_role: account.jobRole },
  });
  if (error) {
    if (error.code === "email_exists") {
      console.log(`  skip    ${account.username} (already exists, password unchanged)`);
      continue;
    }
    console.error(`  FAILED  ${account.username}: ${error.message}`);
    failed = true;
    continue;
  }

  // New accounts start switched off (database safety rule). Switch this one on.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_active: true, is_admin: Boolean(account.isAdmin) })
    .eq("id", data.user.id);
  if (profileError) {
    console.error(`  FAILED  ${account.username}: account created but not activated: ${profileError.message}`);
    failed = true;
    continue;
  }

  console.log(`  created ${account.username}${account.isAdmin ? " (Admin)" : ""}`);
  created.push({ ...account, password });
}

if (created.length > 0) {
  const lines = [
    `## ${new Date().toISOString()} - ${new URL(url).host}`,
    "",
    "| Username | Password | Job role | Admin |",
    "|---|---|---|---|",
    ...created.map(
      (a) => `| ${a.username} | ${a.password} | ${a.jobRole} | ${a.isAdmin ? "yes" : ""} |`,
    ),
    "",
    "",
  ];
  if (!existsSync(CREDENTIALS_FILE)) {
    lines.unshift("# Seeded accounts (KEEP PRIVATE, never commit or share this file)", "");
  }
  appendFileSync(CREDENTIALS_FILE, lines.join("\n"));
  console.log(`\nPasswords saved to ${CREDENTIALS_FILE}`);
}
process.exit(failed ? 1 : 0);

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

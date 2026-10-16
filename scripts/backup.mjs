// Saves a full copy of the data to this computer (the free Supabase plan has no automatic backups).
//
//   npm run backup        -> development project (.env.local)
//   npm run backup:live   -> live project (.env.production.local)
//
// Creates backups/<project>-<date>/ with one JSON file per table and a files/ folder with
// every uploaded file. The backups/ folder is never committed to git. Keep copies somewhere safe
// (e.g. an external drive or a private cloud folder): it contains all your project data.
// Login passwords are not included (Supabase stores only scrambled versions); after a restore,
// people get new passwords from the Admin.

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const TABLES = ["profiles", "milestones", "tasks", "task_comments", "task_attachments", "activity_log"];
const BUCKET = "task-files";
const PAGE = 1000;

const envFlag = process.argv.indexOf("--env");
const envFile = envFlag > -1 ? process.argv[envFlag + 1] : ".env.local";
if (!existsSync(envFile)) {
  console.error(`Settings file ${envFile} not found.`);
  process.exit(1);
}
loadEnvFile(envFile);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in ${envFile}.`);
  process.exit(1);
}

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

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: retryingFetch },
});

const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const folder = join("backups", `${new URL(url).host.split(".")[0]}-${stamp}`);
mkdirSync(join(folder, "files"), { recursive: true });
console.log(`Backing up ${new URL(url).host} to ${folder}\n`);

let failed = false;
const summary = {};
for (const table of TABLES) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").order("created_at").range(from, from + PAGE - 1);
    if (error) {
      console.error(`  FAILED  ${table}: ${error.message}`);
      failed = true;
      break;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  writeFileSync(join(folder, `${table}.json`), JSON.stringify(rows, null, 2));
  summary[table] = rows.length;
  console.log(`  saved   ${table}: ${rows.length} rows`);
}

const { data: attachments } = await supabase.from("task_attachments").select("storage_path").eq("kind", "file");
let fileCount = 0;
for (const { storage_path: path } of attachments ?? []) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) {
    console.error(`  FAILED  file ${path}: ${error.message}`);
    failed = true;
    continue;
  }
  const target = join(folder, "files", path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(await data.arrayBuffer()));
  fileCount++;
}
console.log(`  saved   files: ${fileCount}`);

writeFileSync(
  join(folder, "README.txt"),
  [
    `HerblocX Tracker backup of ${new URL(url).host}, made ${new Date().toISOString()}`,
    "",
    "One JSON file per table, plus files/ with every uploaded file (folder = task id).",
    "Rows: " + Object.entries(summary).map(([t, n]) => `${t} ${n}`).join(", ") + `; files ${fileCount}.`,
    "Passwords are not included. See README.md (Backups) for how to restore.",
    "",
  ].join("\n"),
);

console.log(failed ? "\nBackup finished WITH ERRORS (see above). Run it again." : `\nBackup complete: ${folder}`);
process.exit(failed ? 1 : 0);

function loadEnvFile(path) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

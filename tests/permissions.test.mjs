// Permission tests: log in as every role and try what the approved permission matrix
// (PLAN.md section 4) forbids. Every forbidden action must be refused BY THE DATABASE.
// A few allowed actions are checked too, so a test can't pass just because everything is blocked.
//
// Run: npm test   (uses the development database in .env.local; takes a few minutes)

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import {
  BUCKET,
  DOMAIN,
  ROLES,
  anonymous,
  assertAllowed,
  assertRefused,
  assertStorageRefused,
  service,
  setUpAccounts,
  switchOffAccounts,
} from "./helpers.mjs";

const TAG = `AUTOTEST ${new Date().toISOString().slice(0, 16)}`;
const PDF = new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" });

let users; // role -> { id, client }
let inactive;
let milestone; // owned by Marketing
let devTask; // created by Admin, assigned to Software Dev, department Software Dev
let financeTask; // created by Admin, unassigned, department Finance
let comment; // written by Legal on devTask
let link; // link added by Legal on devTask
let filePath; // file uploaded by Legal on devTask

const as = (role) => users[role].client;
const others = (...except) => ROLES.filter((r) => !except.includes(r));

before(async () => {
  ({ users, inactive } = await setUpAccounts());
  const admin = as("admin");

  milestone = (
    await admin
      .from("milestones")
      .insert({ title: `${TAG} milestone`, start_date: "2026-10-01", end_date: "2026-12-31", owner_id: users.marketing.id })
      .select()
      .single()
  ).data;
  devTask = (
    await admin
      .from("tasks")
      .insert({ title: `${TAG} dev task`, department: "software_dev", due_date: "2026-12-01", assignee_id: users.software_dev.id, milestone_id: milestone.id })
      .select()
      .single()
  ).data;
  financeTask = (
    await admin
      .from("tasks")
      .insert({ title: `${TAG} finance task`, department: "finance", due_date: "2026-12-01" })
      .select()
      .single()
  ).data;
  comment = (await as("legal").from("task_comments").insert({ task_id: devTask.id, body: "Legal's comment" }).select().single()).data;
  link = (
    await as("legal")
      .from("task_attachments")
      .insert({ task_id: devTask.id, kind: "link", name: "Legal's link", url: "https://example.com/doc" })
      .select()
      .single()
  ).data;
  filePath = `${devTask.id}/${randomUUID()}-autotest.pdf`;
  const upload = await as("legal").storage.from(BUCKET).upload(filePath, PDF, { contentType: "application/pdf" });
  assert.equal(upload.error, null, `setup upload failed: ${upload.error?.message}`);
  const fileRow = await as("legal")
    .from("task_attachments")
    .insert({ task_id: devTask.id, kind: "file", name: "autotest.pdf", storage_path: filePath, size_bytes: PDF.size, mime_type: "application/pdf" })
    .select();
  assertAllowed(fileRow, "setup: Legal records the uploaded file");

  for (const [name, value] of Object.entries({ milestone, devTask, financeTask, comment, link })) {
    assert.ok(value?.id, `setup failed: could not create the test ${name}`);
  }
});

after(async () => {
  // Remove this run's test data (the activity log keeps its entries, by design).
  const { data: tasks } = await service.from("tasks").select("id").like("title", "AUTOTEST%");
  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: files } = taskIds.length
    ? await service.from("task_attachments").select("storage_path").in("task_id", taskIds).eq("kind", "file")
    : { data: [] };
  if (taskIds.length) await service.from("tasks").delete().in("id", taskIds);
  const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length) await service.storage.from(BUCKET).remove(paths);
  await service.from("milestones").delete().like("title", "AUTOTEST%");
  if (users) await switchOffAccounts({ ...users, inactive });
});

// ---------------------------------------------------------------------------
describe("Logged-out visitor", () => {
  test("sees no data at all", async () => {
    const visitor = anonymous();
    for (const table of ["profiles", "milestones", "tasks", "task_comments", "task_attachments", "activity_log", "task_board"]) {
      assertRefused(await visitor.from(table).select("*").limit(1), `visitor reads ${table}`);
    }
  });

  test("cannot create a task", async () => {
    assertRefused(
      await anonymous().from("tasks").insert({ title: `${TAG} visitor`, department: "legal", due_date: "2026-12-01" }).select(),
      "visitor creates task",
    );
  });

  test("cannot sign up (public sign-up is switched off)", async () => {
    const { data, error } = await anonymous().auth.signUp({
      email: `autotest.signup.${randomUUID().slice(0, 8)}@${DOMAIN}`,
      password: randomUUID(),
    });
    assert.ok(error, `sign-up was ALLOWED (user ${data?.user?.id}); switch off "Allow new users to sign up" in Supabase`);
  });

  test("cannot download files", async () => {
    assertStorageRefused(await anonymous().storage.from(BUCKET).download(filePath), "visitor downloads file");
  });
});

// ---------------------------------------------------------------------------
describe("Deactivated account (still logged in)", () => {
  test("sees nothing", async () => {
    for (const table of ["profiles", "tasks", "milestones", "activity_log"]) {
      assertRefused(await inactive.client.from(table).select("*").limit(1), `deactivated reads ${table}`);
    }
  });

  test("cannot create tasks, comments or attachments", async () => {
    assertRefused(
      await inactive.client.from("tasks").insert({ title: `${TAG} inactive`, department: "finance", due_date: "2026-12-01" }).select(),
      "deactivated creates task",
    );
    assertRefused(await inactive.client.from("task_comments").insert({ task_id: devTask.id, body: "x" }).select(), "deactivated comments");
    assertRefused(
      await inactive.client.from("task_attachments").insert({ task_id: devTask.id, kind: "link", name: "x", url: "https://example.com" }).select(),
      "deactivated adds link",
    );
  });

  test("cannot download files", async () => {
    assertStorageRefused(await inactive.client.storage.from(BUCKET).download(filePath), "deactivated downloads file");
  });
});

// ---------------------------------------------------------------------------
describe("Users / accounts", () => {
  for (const role of others("admin")) {
    test(`${role} cannot edit someone else's account`, async () => {
      assertRefused(
        await as(role).from("profiles").update({ full_name: "Hacked" }).eq("id", users.legal.id === users[role].id ? users.finance.id : users.legal.id).select(),
        `${role} edits another account`,
      );
    });
    test(`${role} cannot make themselves Admin or change their own job role`, async () => {
      assertRefused(await as(role).from("profiles").update({ is_admin: true }).eq("id", users[role].id).select(), `${role} self-admin`);
      assertRefused(await as(role).from("profiles").update({ job_role: "director" }).eq("id", users[role].id).select(), `${role} own job role`);
    });
  }

  for (const role of ROLES) {
    test(`${role} cannot create or delete accounts, or change login emails`, async () => {
      assertRefused(
        await as(role).from("profiles").insert({ id: randomUUID(), full_name: "x", email: `x@${DOMAIN}`, job_role: "legal" }).select(),
        `${role} inserts profile`,
      );
      assertRefused(await as(role).from("profiles").delete().eq("id", users.finance.id).select(), `${role} deletes account`);
      assertRefused(await as(role).from("profiles").update({ email: `hacked@${DOMAIN}` }).eq("id", users.finance.id).select(), `${role} changes email`);
    });
  }

  test("Admin cannot remove their own Admin permission or deactivate themselves", async () => {
    assertRefused(await as("admin").from("profiles").update({ is_admin: false }).eq("id", users.admin.id).select(), "admin un-admins self");
    assertRefused(await as("admin").from("profiles").update({ is_active: false }).eq("id", users.admin.id).select(), "admin deactivates self");
  });

  test("ALLOWED: Admin edits another person's account", async () => {
    assertAllowed(
      await as("admin").from("profiles").update({ full_name: "Autotest legal" }).eq("id", users.legal.id).select(),
      "admin edits legal's name",
    );
  });
});

// ---------------------------------------------------------------------------
describe("Milestones", () => {
  for (const role of ["finance", "marketing", "software_dev", "legal"]) {
    test(`${role} cannot create a milestone`, async () => {
      assertRefused(
        await as(role).from("milestones").insert({ title: `${TAG} ${role}`, start_date: "2026-10-01", end_date: "2026-10-31", owner_id: users[role].id }).select(),
        `${role} creates milestone`,
      );
    });
  }
  for (const role of ["admin", "director", "head_of_finance"]) {
    test(`ALLOWED: ${role} creates a milestone`, async () => {
      assertAllowed(
        await as(role).from("milestones").insert({ title: `${TAG} by ${role}`, start_date: "2026-10-01", end_date: "2026-10-31", owner_id: users[role].id }).select(),
        `${role} creates milestone`,
      );
    });
  }

  for (const role of ["finance", "software_dev", "legal"]) {
    test(`${role} cannot edit a milestone they don't own`, async () => {
      assertRefused(await as(role).from("milestones").update({ description: "hacked" }).eq("id", milestone.id).select(), `${role} edits milestone`);
    });
  }
  for (const role of ["marketing", "director", "head_of_finance", "admin"]) {
    test(`ALLOWED: ${role === "marketing" ? "the owner (marketing)" : role} edits the milestone`, async () => {
      assertAllowed(await as(role).from("milestones").update({ description: `edited by ${role}` }).eq("id", milestone.id).select(), `${role} edits milestone`);
    });
  }

  for (const role of ["head_of_finance", "finance", "marketing", "software_dev", "legal"]) {
    test(`${role} cannot delete a milestone`, async () => {
      assertRefused(await as(role).from("milestones").delete().eq("id", milestone.id).select(), `${role} deletes milestone`);
    });
  }
  test("ALLOWED: Director deletes a milestone", async () => {
    const { data } = await as("director")
      .from("milestones")
      .insert({ title: `${TAG} to delete`, start_date: "2026-10-01", end_date: "2026-10-02", owner_id: users.director.id })
      .select()
      .single();
    assertAllowed(await as("director").from("milestones").delete().eq("id", data.id).select(), "director deletes milestone");
  });

  test("nobody can fake who created a milestone", async () => {
    assertRefused(
      await as("director").from("milestones").insert({ title: `${TAG} fake`, start_date: "2026-10-01", end_date: "2026-10-02", owner_id: users.director.id, created_by: users.legal.id }).select(),
      "fake created_by",
    );
  });
});

// ---------------------------------------------------------------------------
describe("Tasks", () => {
  for (const role of ROLES) {
    test(`ALLOWED: ${role} creates a task`, async () => {
      assertAllowed(
        await as(role).from("tasks").insert({ title: `${TAG} by ${role}`, department: "legal", due_date: "2026-12-01" }).select(),
        `${role} creates task`,
      );
    });
  }

  for (const role of ["head_of_finance", "finance", "marketing", "legal"]) {
    test(`${role} cannot edit or move a Software Dev task they didn't create and aren't assigned to`, async () => {
      assertRefused(await as(role).from("tasks").update({ status: "done" }).eq("id", devTask.id).select(), `${role} moves dev task`);
      assertRefused(await as(role).from("tasks").update({ assignee_id: users[role].id }).eq("id", devTask.id).select(), `${role} reassigns dev task`);
    });
  }
  for (const role of ["software_dev", "director", "admin"]) {
    test(`ALLOWED: ${role === "software_dev" ? "the assignee (software_dev)" : role} moves the Software Dev task`, async () => {
      assertAllowed(await as(role).from("tasks").update({ status: "in_progress" }).eq("id", devTask.id).select(), `${role} moves dev task`);
    });
  }

  for (const role of ["finance", "marketing", "software_dev", "legal"]) {
    test(`${role} cannot edit a Finance task they didn't create and aren't assigned to`, async () => {
      assertRefused(await as(role).from("tasks").update({ priority: "urgent" }).eq("id", financeTask.id).select(), `${role} edits finance task`);
    });
  }
  test("ALLOWED: Head of Finance edits a Finance-department task", async () => {
    assertAllowed(await as("head_of_finance").from("tasks").update({ priority: "high" }).eq("id", financeTask.id).select(), "HoF edits finance task");
  });

  for (const role of ["head_of_finance", "finance", "marketing", "software_dev", "legal"]) {
    test(`${role} cannot delete the Software Dev task${role === "software_dev" ? " (even as its assignee)" : ""}`, async () => {
      assertRefused(await as(role).from("tasks").delete().eq("id", devTask.id).select(), `${role} deletes dev task`);
    });
  }
  test("Finance cannot delete a Finance task", async () => {
    assertRefused(await as("finance").from("tasks").delete().eq("id", financeTask.id).select(), "finance deletes finance task");
  });
  for (const role of ["head_of_finance", "director", "admin"]) {
    test(`ALLOWED: ${role} deletes a Finance task`, async () => {
      const { data } = await as("admin").from("tasks").insert({ title: `${TAG} delete by ${role}`, department: "finance", due_date: "2026-12-01" }).select().single();
      assertAllowed(await as(role).from("tasks").delete().eq("id", data.id).select(), `${role} deletes finance task`);
    });
  }

  test("nobody can fake or change who created a task", async () => {
    assertRefused(
      await as("legal").from("tasks").insert({ title: `${TAG} fake`, department: "legal", due_date: "2026-12-01", created_by: users.admin.id }).select(),
      "fake created_by on insert",
    );
    assertRefused(await as("admin").from("tasks").update({ created_by: users.legal.id }).eq("id", devTask.id).select(), "change created_by");
  });

  test("tasks cannot be assigned to a deactivated person", async () => {
    assertRefused(await as("admin").from("tasks").update({ assignee_id: inactive.id }).eq("id", financeTask.id).select(), "assign to deactivated");
  });
});

// ---------------------------------------------------------------------------
describe("Comments", () => {
  for (const role of others("legal")) {
    test(`${role} cannot edit Legal's comment${role === "admin" ? " (not even Admin)" : ""}`, async () => {
      assertRefused(await as(role).from("task_comments").update({ body: "hacked" }).eq("id", comment.id).select(), `${role} edits comment`);
    });
  }
  test("ALLOWED: Legal edits their own comment", async () => {
    assertAllowed(await as("legal").from("task_comments").update({ body: "Legal's comment (edited)" }).eq("id", comment.id).select(), "legal edits own comment");
  });

  test("nobody can post as someone else or move a comment to another task", async () => {
    assertRefused(
      await as("marketing").from("task_comments").insert({ task_id: devTask.id, body: "fake", author_id: users.director.id }).select(),
      "fake author",
    );
    assertRefused(await as("legal").from("task_comments").update({ task_id: financeTask.id }).eq("id", comment.id).select(), "move comment");
  });

  for (const role of others("legal", "admin")) {
    test(`${role} cannot delete Legal's comment`, async () => {
      assertRefused(await as(role).from("task_comments").delete().eq("id", comment.id).select(), `${role} deletes comment`);
    });
  }
  test("ALLOWED: Admin deletes Legal's comment", async () => {
    assertAllowed(await as("admin").from("task_comments").delete().eq("id", comment.id).select(), "admin deletes comment");
  });
});

// ---------------------------------------------------------------------------
describe("Attachments and files", () => {
  for (const role of ROLES) {
    test(`${role} cannot edit an attachment`, async () => {
      assertRefused(await as(role).from("task_attachments").update({ name: "renamed" }).eq("id", link.id).select(), `${role} edits attachment`);
    });
  }

  for (const role of ["head_of_finance", "finance", "marketing", "software_dev"]) {
    test(`${role} cannot remove Legal's link`, async () => {
      assertRefused(await as(role).from("task_attachments").delete().eq("id", link.id).select(), `${role} removes link`);
    });
  }
  for (const role of ["director", "admin", "legal"]) {
    test(`ALLOWED: ${role === "legal" ? "the person who added it (legal)" : role} removes a link`, async () => {
      const { data } = await as("legal")
        .from("task_attachments")
        .insert({ task_id: devTask.id, kind: "link", name: `to remove by ${role}`, url: "https://example.com" })
        .select()
        .single();
      assertAllowed(await as(role).from("task_attachments").delete().eq("id", data.id).select(), `${role} removes link`);
    });
  }

  test("unsafe links, oversized files and fake uploaders are refused", async () => {
    assertRefused(
      await as("marketing").from("task_attachments").insert({ task_id: devTask.id, kind: "link", name: "x", url: "javascript:alert(1)" }).select(),
      "javascript: link",
    );
    assertRefused(
      await as("marketing")
        .from("task_attachments")
        .insert({ task_id: devTask.id, kind: "file", name: "big.pdf", storage_path: `${devTask.id}/big.pdf`, size_bytes: 11 * 1024 * 1024 })
        .select(),
      "file over 10 MB",
    );
    assertRefused(
      await as("marketing")
        .from("task_attachments")
        .insert({ task_id: devTask.id, kind: "link", name: "x", url: "https://example.com", added_by: users.director.id })
        .select(),
      "fake added_by",
    );
  });

  test("files can only be uploaded into an existing task's folder, and only allowed types", async () => {
    assertStorageRefused(
      await as("marketing").storage.from(BUCKET).upload(`not-a-task/${randomUUID()}.pdf`, PDF, { contentType: "application/pdf" }),
      "upload outside a task folder",
    );
    assertStorageRefused(
      await as("marketing").storage.from(BUCKET).upload(`${randomUUID()}/${randomUUID()}.pdf`, PDF, { contentType: "application/pdf" }),
      "upload into a task that doesn't exist",
    );
    assertStorageRefused(
      await as("marketing").storage.from(BUCKET).upload(`${devTask.id}/${randomUUID()}.exe`, new Blob(["MZ"]), { contentType: "application/x-msdownload" }),
      "upload a .exe",
    );
  });

  test("storage is private, limited to 10 MB, and only accepts the approved file types", async () => {
    const { data, error } = await service.storage.getBucket(BUCKET);
    assert.equal(error, null);
    assert.equal(data.public, false, "bucket must be private");
    assert.equal(Number(data.file_size_limit), 10 * 1024 * 1024, "bucket limit must be 10 MB");
    assert.ok(!data.allowed_mime_types.includes("application/x-msdownload"), "executables must not be allowed");
  });

  test("a file still attached to a task cannot be removed from storage, not even by its uploader", async () => {
    for (const role of ["marketing", "legal"]) {
      const result = await as(role).storage.from(BUCKET).remove([filePath]);
      if (result.error) assertStorageRefused(result, `${role} removes attached file`);
      else assert.equal(result.data.length, 0, `${role} removed an attached file`);
    }
    const { data } = await service.storage.from(BUCKET).list(devTask.id);
    assert.ok(data.some((f) => filePath.endsWith(f.name)), "the attached file must still exist");
  });

  test("ALLOWED: an active team member downloads an attached file", async () => {
    const { data, error } = await as("marketing").storage.from(BUCKET).download(filePath);
    assert.equal(error, null, `download refused: ${error?.message}`);
    assert.ok(data.size > 0);
  });
});

// ---------------------------------------------------------------------------
describe("Activity log (append-only)", () => {
  test("changes are recorded automatically, with who did them", async () => {
    const { data } = await as("admin")
      .from("activity_log")
      .select("action, actor_id")
      .eq("task_id", devTask.id)
      .eq("action", "status_changed");
    assert.ok(data?.length > 0, "the status change was not logged");
    assert.ok(data.every((e) => e.actor_id), "a logged change is missing who did it");
  });

  for (const role of ROLES) {
    test(`${role} cannot add, edit or delete log entries${role === "admin" ? " (not even Admin)" : ""}`, async () => {
      assertRefused(
        await as(role).from("activity_log").insert({ task_title: "fake", action: "task_created" }).select(),
        `${role} inserts log entry`,
      );
      assertRefused(await as(role).from("activity_log").update({ task_title: "hacked" }).eq("task_id", devTask.id).select(), `${role} edits log`);
      assertRefused(await as(role).from("activity_log").delete().eq("task_id", devTask.id).select(), `${role} deletes log`);
    });
  }

  test("not even the secret (service) key can edit or delete log entries", async () => {
    const { data: entry } = await service
      .from("activity_log")
      .select("id")
      .eq("task_id", financeTask.id)
      .eq("action", "task_created")
      .single();
    assertRefused(await service.from("activity_log").update({ task_title: "hacked" }).eq("id", entry.id).select(), "service edits log");
    assertRefused(await service.from("activity_log").delete().eq("id", entry.id).select(), "service deletes log");
    const still = await service.from("activity_log").select("task_title").eq("id", entry.id).single();
    assert.equal(still.data?.task_title, financeTask.title, "the log entry must be unchanged");
  });
});

// ---------------------------------------------------------------------------
describe("Database internals are not exposed", () => {
  test("the permission helper functions cannot be called through the API", async () => {
    for (const fn of ["is_admin", "is_active_user", "current_job_role", "can_manage_milestones"]) {
      assertRefused(await as("admin").rpc(fn), `call ${fn}`);
    }
  });
});

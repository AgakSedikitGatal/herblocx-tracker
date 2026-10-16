"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_LABEL,
  ALLOWED_TYPES,
  ATTACHMENT_BUCKET,
  MAX_FILE_BYTES,
  fileType,
  safeFileName,
} from "@/lib/attachments";
import { createClient } from "@/lib/supabase/client";
import { addLink, deleteAttachment, recordUpload } from "./attachment-actions";

export type AttachmentView = {
  id: string;
  kind: "link" | "file";
  name: string;
  href: string; // links: the URL itself; files: /attachments/<id> (checks login, then opens)
  detail: string; // "drive.google.com" or "1.2 MB"
  addedBy: string;
  addedAt: string; // already formatted (Jakarta)
  canDelete: boolean;
};

export function Attachments({ taskId, attachments }: { taskId: string; attachments: AttachmentView[] }) {
  return (
    <div className="grid gap-5">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="grid gap-2">
          {attachments.map((a) => (
            <AttachmentItem key={a.id} taskId={taskId} attachment={a} />
          ))}
        </ul>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <AddLink taskId={taskId} />
        <UploadFile taskId={taskId} />
      </div>
    </div>
  );
}

function AttachmentItem({ taskId, attachment: a }: { taskId: string; attachment: AttachmentView }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    deleteAttachment.bind(null, a.id, taskId),
    {},
  );

  return (
    <li className="grid gap-1 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {a.kind === "link" ? "Link" : "File"}
        </span>
        <a
          href={a.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium break-all hover:underline"
        >
          {a.name}
        </a>
        <span className="text-xs text-muted-foreground">{a.detail}</span>
        {a.canDelete && (
          <form
            action={action}
            className="ml-auto"
            onSubmit={(event) => {
              if (!window.confirm(`Remove "${a.name}"?`)) event.preventDefault();
            }}
          >
            <Button type="submit" variant="ghost" size="xs" disabled={pending}>
              {pending ? "Removing…" : "Remove"}
            </Button>
          </form>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        Added by {a.addedBy} · {a.addedAt}
      </span>
      <FormMessage state={state} />
    </li>
  );
}

function AddLink({ taskId }: { taskId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addLink.bind(null, taskId), {});

  return (
    <form action={action} className="grid content-start gap-2">
      <h3 className="text-sm font-medium">Add a link</h3>
      <FormMessage state={state} />
      <div className="grid gap-1">
        <Label htmlFor="link-url" className="text-xs">Link (e.g. Google Drive)</Label>
        <Input
          id="link-url"
          name="url"
          type="url"
          required
          placeholder="https://drive.google.com/…"
          defaultValue={state.values?.url}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="link-name" className="text-xs">Name (optional)</Label>
        <Input id="link-name" name="name" maxLength={200} placeholder="Budget sheet" defaultValue={state.values?.name} />
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Adding…" : "Add link"}
      </Button>
    </form>
  );
}

function UploadFile({ taskId }: { taskId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return setMessage({ error: "Choose a file first." });
    if (file.size > MAX_FILE_BYTES) return setMessage({ error: "That file is larger than 10 MB." });
    const type = fileType(file);
    if (!ALLOWED_TYPES.has(type)) return setMessage({ error: `Allowed types: ${ALLOWED_LABEL}.` });

    setMessage({});
    startTransition(async () => {
      const path = `${taskId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await createClient()
        .storage.from(ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: type, upsert: false });
      if (error) {
        setMessage({ error: `Upload failed: ${error.message}` });
        return;
      }
      const result = await recordUpload(taskId, { path, name: file.name, size: file.size, type });
      if (result.error) {
        setMessage(result);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      setMessage({ success: `"${file.name}" uploaded.` });
    });
  }

  return (
    <form onSubmit={upload} className="grid content-start gap-2">
      <h3 className="text-sm font-medium">Upload a file</h3>
      <FormMessage state={message} />
      <div className="grid gap-1">
        <Label htmlFor="file" className="text-xs">File (max 10 MB)</Label>
        <Input id="file" ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} required />
        <p className="text-xs text-muted-foreground">{ALLOWED_LABEL}. Only logged-in team members can open it.</p>
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}

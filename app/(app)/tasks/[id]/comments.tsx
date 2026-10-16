"use client";

import { useActionState, useState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment, editComment } from "./comment-actions";

export type CommentView = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string; // already formatted (Jakarta)
  edited: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function Comments({ taskId, comments }: { taskId: string; comments: CommentView[] }) {
  return (
    <div className="grid gap-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="grid gap-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} taskId={taskId} comment={comment} />
          ))}
        </ul>
      )}
      <NewComment taskId={taskId} />
    </div>
  );
}

function NewComment({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addComment.bind(null, taskId),
    {},
  );

  return (
    <form action={formAction} className="grid gap-2">
      <FormMessage state={state} />
      <label htmlFor="new-comment" className="sr-only">
        Write a comment
      </label>
      <Textarea
        id="new-comment"
        name="body"
        rows={3}
        maxLength={5000}
        required
        placeholder="Write a comment…"
        defaultValue={state.values?.body}
      />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Posting…" : "Post comment"}
      </Button>
    </form>
  );
}

function CommentItem({ taskId, comment }: { taskId: string; comment: CommentView }) {
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState<FormState, FormData>(
    deleteComment.bind(null, comment.id, taskId),
    {},
  );

  return (
    <li className="grid gap-1 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        <span className="text-sm font-medium text-foreground">{comment.authorName}</span>
        <span>{comment.createdAt}</span>
        {comment.edited && <span>(edited)</span>}
      </div>
      {editing ? (
        <EditComment taskId={taskId} comment={comment} onDone={() => setEditing(false)} />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
      )}
      {!editing && (comment.canEdit || comment.canDelete) && (
        <div className="flex items-center gap-1">
          {comment.canEdit && (
            <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {comment.canDelete && (
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm("Delete this comment?")) event.preventDefault();
              }}
            >
              <Button type="submit" variant="ghost" size="xs" disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </form>
          )}
        </div>
      )}
      <FormMessage state={deleteState} />
    </li>
  );
}

function EditComment({
  taskId,
  comment,
  onDone,
}: {
  taskId: string;
  comment: CommentView;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await editComment(comment.id, taskId, prev, formData);
      if (!result.error) onDone();
      return result;
    },
    {},
  );

  return (
    <form action={formAction} className="grid gap-2">
      <FormMessage state={state} />
      <label htmlFor={`edit-${comment.id}`} className="sr-only">
        Edit comment
      </label>
      <Textarea
        id={`edit-${comment.id}`}
        name="body"
        rows={3}
        maxLength={5000}
        required
        defaultValue={state.values?.body ?? comment.body}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

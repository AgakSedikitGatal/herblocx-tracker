-- HerblocX Tracker: activity log written ONLY by database triggers, so no screen or bug can skip it.
-- The log is append-only: nobody (Admin included, and even the service role key) can edit or delete entries.
-- Comment text is never copied into the log, so a removed comment's content does not live on.

create function public.log_task_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_changes jsonb := '{}'::jsonb;
  v_field text;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (new.id, new.title, v_actor, 'task_created', jsonb_build_object(
      'status', new.status, 'assignee_id', new.assignee_id, 'department', new.department,
      'priority', new.priority, 'due_date', new.due_date, 'milestone_id', new.milestone_id));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (old.id, old.title, v_actor, 'task_deleted', jsonb_build_object(
      'status', old.status, 'assignee_id', old.assignee_id, 'department', old.department));
    return old;
  end if;

  -- UPDATE: one entry per kind of change.
  if new.status is distinct from old.status then
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (new.id, new.title, v_actor, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (new.id, new.title, v_actor, 'reassigned',
            jsonb_build_object('from', old.assignee_id, 'to', new.assignee_id));
  end if;

  foreach v_field in array array['title', 'description', 'department', 'priority', 'due_date', 'milestone_id'] loop
    if (to_jsonb(new) -> v_field) is distinct from (to_jsonb(old) -> v_field) then
      if v_field = 'description' then
        -- Descriptions can be long: record that it changed, not the full text.
        v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('changed', true));
      else
        v_changes := v_changes || jsonb_build_object(v_field, jsonb_build_object(
          'from', to_jsonb(old) -> v_field, 'to', to_jsonb(new) -> v_field));
      end if;
    end if;
  end loop;

  if v_changes <> '{}'::jsonb then
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (new.id, new.title, v_actor, 'task_updated', jsonb_build_object('changes', v_changes));
  end if;

  return new;
end;
$$;

create trigger tasks_log_insert after insert on public.tasks
  for each row execute function public.log_task_changes();
create trigger tasks_log_update after update on public.tasks
  for each row execute function public.log_task_changes();
create trigger tasks_log_delete after delete on public.tasks
  for each row execute function public.log_task_changes();

create function public.log_comment_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_task_id uuid := case when tg_op = 'DELETE' then old.task_id else new.task_id end;
  v_comment_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
  v_title text;
begin
  select title into v_title from public.tasks where id = v_task_id;
  if v_title is null then
    return null; -- the whole task is being deleted; its 'task_deleted' entry covers this
  end if;

  if tg_op = 'INSERT' then
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (v_task_id, v_title, (select auth.uid()), 'commented',
            jsonb_build_object('comment_id', v_comment_id));
  elsif tg_op = 'UPDATE' then
    if new.body is distinct from old.body then
      insert into public.activity_log (task_id, task_title, actor_id, action, details)
      values (v_task_id, v_title, (select auth.uid()), 'comment_edited',
              jsonb_build_object('comment_id', v_comment_id));
    end if;
  else
    insert into public.activity_log (task_id, task_title, actor_id, action, details)
    values (v_task_id, v_title, (select auth.uid()), 'comment_deleted',
            jsonb_build_object('comment_id', v_comment_id, 'author_id', old.author_id));
  end if;
  return null;
end;
$$;

create trigger task_comments_log after insert or update or delete on public.task_comments
  for each row execute function public.log_comment_changes();

create function public.log_attachment_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.task_attachments := case when tg_op = 'DELETE' then old else new end;
  v_title text;
begin
  select title into v_title from public.tasks where id = v_row.task_id;
  if v_title is null then
    return null; -- the whole task is being deleted; its 'task_deleted' entry covers this
  end if;

  insert into public.activity_log (task_id, task_title, actor_id, action, details)
  values (
    v_row.task_id, v_title, (select auth.uid()),
    case when tg_op = 'DELETE' then 'attachment_removed' else 'attachment_added' end::public.activity_action,
    jsonb_build_object('attachment_id', v_row.id, 'kind', v_row.kind, 'name', v_row.name)
  );
  return null;
end;
$$;

create trigger task_attachments_log after insert or delete on public.task_attachments
  for each row execute function public.log_attachment_changes();

-- Append-only guard. This also blocks the service role key and the SQL editor.
create function public.prevent_activity_log_changes()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'The activity log is append-only: entries cannot be changed or deleted.';
end;
$$;

create trigger activity_log_no_update_or_delete before update or delete on public.activity_log
  for each row execute function public.prevent_activity_log_changes();
create trigger activity_log_no_truncate before truncate on public.activity_log
  for each statement execute function public.prevent_activity_log_changes();

revoke execute on function
  public.log_task_changes(), public.log_comment_changes(), public.log_attachment_changes(),
  public.prevent_activity_log_changes()
  from public, anon, authenticated;

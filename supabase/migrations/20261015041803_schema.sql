-- HerblocX Tracker: core schema (tables, helper functions, views, grants).
-- Row Level Security policies live in the next migration. Nothing here opens access on its own.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.job_role as enum (
  'director', 'head_of_finance', 'finance', 'marketing', 'software_dev', 'legal'
);
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.attachment_kind as enum ('link', 'file');
create type public.activity_action as enum (
  'task_created', 'task_updated', 'status_changed', 'reassigned', 'task_deleted',
  'commented', 'comment_edited', 'comment_deleted',
  'attachment_added', 'attachment_removed'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per login account. Accounts are deactivated, never deleted
-- ("on delete restrict" makes deleting the login fail while the profile exists).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  email text not null unique,
  job_role public.job_role not null,
  is_admin boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  start_date date not null,
  end_date date not null,
  owner_id uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestone_dates_in_order check (end_date >= start_date)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  status public.task_status not null default 'todo',
  assignee_id uuid references public.profiles (id),
  department public.job_role not null,
  priority public.task_priority not null default 'medium',
  due_date date not null,
  milestone_id uuid references public.milestones (id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_status_idx on public.tasks (status);
create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_milestone_idx on public.tasks (milestone_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  kind public.attachment_kind not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  url text check (url is null or (url ~* '^https?://' and char_length(url) <= 2000)),
  storage_path text unique,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 10485760),
  mime_type text,
  added_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint attachment_kind_fields check (
    (kind = 'link' and url is not null and storage_path is null and size_bytes is null)
    or (
      kind = 'file' and url is null and size_bytes is not null
      and storage_path like (task_id::text || '/%')
    )
  )
);
create index task_attachments_task_idx on public.task_attachments (task_id);

-- Append-only history. task_id has no foreign key on purpose: entries must outlive deleted tasks.
-- actor_id is empty only for changes made outside the app (for example in the Supabase SQL editor).
create table public.activity_log (
  id bigint generated always as identity primary key,
  task_id uuid,
  task_title text not null,
  actor_id uuid references public.profiles (id),
  action public.activity_action not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_task_idx on public.activity_log (task_id, created_at desc);
create index activity_log_created_idx on public.activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions used by the permission rules.
-- SECURITY DEFINER so they can read profiles without tripping over profiles' own rules.
-- ---------------------------------------------------------------------------
create function public.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and is_active
  );
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and is_active and is_admin
  );
$$;

-- Job role of the logged-in user, or null when they are inactive or not logged in.
create function public.current_job_role()
returns public.job_role
language sql stable security definer set search_path = ''
as $$
  select job_role from public.profiles where id = (select auth.uid()) and is_active;
$$;

create function public.jakarta_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- Admin, Director and Head of Finance may create and edit any milestone.
create function public.can_manage_milestones()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or coalesce(public.current_job_role() in ('director', 'head_of_finance'), false);
$$;

-- Admin and Director: any task. Head of Finance: Finance-department tasks.
-- Everyone: tasks they created or are assigned to.
create function public.can_edit_task(p_created_by uuid, p_assignee_id uuid, p_department public.job_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or coalesce(public.current_job_role() = 'director', false)
      or coalesce(public.current_job_role() = 'head_of_finance'
                  and p_department in ('finance', 'head_of_finance'), false)
      or (public.is_active_user()
          and coalesce((select auth.uid()) in (p_created_by, p_assignee_id), false));
$$;

-- Admin and Director: any task. Head of Finance: Finance-department tasks. Nobody else.
create function public.can_delete_task(p_department public.job_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or coalesce(public.current_job_role() = 'director', false)
      or coalesce(public.current_job_role() = 'head_of_finance'
                  and p_department in ('finance', 'head_of_finance'), false);
$$;

-- ---------------------------------------------------------------------------
-- Housekeeping triggers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create function public.set_comment_edited_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger task_comments_set_edited_at before update on public.task_comments
  for each row execute function public.set_comment_edited_at();

-- An Admin cannot remove their own Admin permission or deactivate themselves (no lock-out).
create function public.guard_own_profile()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.id = (select auth.uid()) then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'You cannot change your own Admin permission.';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'You cannot deactivate your own account.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_own_profile before update on public.profiles
  for each row execute function public.guard_own_profile();

-- New owners/assignees must be active people. The trigger argument names the column to check.
create function public.check_person_is_active()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_new uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_old uuid;
begin
  if tg_op = 'UPDATE' then
    v_old := (to_jsonb(old) ->> tg_argv[0])::uuid;
  end if;
  if v_new is not null and v_new is distinct from v_old
     and not exists (select 1 from public.profiles where id = v_new and is_active) then
    raise exception 'The selected person is not an active user.';
  end if;
  return new;
end;
$$;

create trigger milestones_owner_is_active before insert or update of owner_id on public.milestones
  for each row execute function public.check_person_is_active('owner_id');
create trigger tasks_assignee_is_active before insert or update of assignee_id on public.tasks
  for each row execute function public.check_person_is_active('assignee_id');

-- ---------------------------------------------------------------------------
-- Link login accounts (auth.users) to profiles
-- ---------------------------------------------------------------------------

-- Every new login gets a profile that starts INACTIVE and NOT Admin. The admin page
-- (or the seed script) switches it on, so an account created any other way has no access.
create function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if coalesce(v_meta ->> 'full_name', '') = '' or coalesce(v_meta ->> 'job_role', '') = '' then
    raise exception 'Accounts must be created from the HerblocX Tracker admin page.';
  end if;
  insert into public.profiles (id, full_name, email, job_role)
  values (new.id, v_meta ->> 'full_name', new.email, (v_meta ->> 'job_role')::public.job_role);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create function public.handle_auth_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- Views (computed numbers). security_invoker = the viewer's own permission rules apply.
-- ---------------------------------------------------------------------------
create view public.task_board with (security_invoker = true) as
select
  t.*,
  (t.status <> 'done' and t.due_date < public.jakarta_today()) as is_overdue
from public.tasks t;

create view public.milestone_progress with (security_invoker = true) as
select
  m.id as milestone_id,
  count(t.id)::int as total_tasks,
  (count(t.id) filter (where t.status = 'done'))::int as done_tasks,
  case
    when count(t.id) = 0 then 0
    else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))::int
  end as progress_pct
from public.milestones m
left join public.tasks t on t.milestone_id = m.id
group by m.id;

create view public.task_status_counts with (security_invoker = true) as
select s.status, count(t.id)::int as task_count
from unnest(enum_range(null::public.task_status)) as s (status)
left join public.tasks t on t.status = s.status
group by s.status;

create view public.person_workload with (security_invoker = true) as
select
  p.id as profile_id,
  p.full_name,
  p.job_role,
  (count(t.id) filter (where t.status <> 'done'))::int as open_tasks,
  (count(t.id) filter (where t.status <> 'done' and t.due_date < public.jakarta_today()))::int as overdue_tasks
from public.profiles p
left join public.tasks t on t.assignee_id = p.id
where p.is_active
group by p.id;

-- ---------------------------------------------------------------------------
-- Grants. Start from nothing, then allow only the columns the app may write.
-- Logged-out visitors (anon) get nothing at all.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.milestones, public.tasks, public.task_comments,
  public.task_attachments, public.activity_log,
  public.task_board, public.milestone_progress, public.task_status_counts, public.person_workload
  from anon, authenticated, public;

grant select on public.profiles, public.milestones, public.tasks, public.task_comments,
  public.task_attachments, public.activity_log,
  public.task_board, public.milestone_progress, public.task_status_counts, public.person_workload
  to authenticated;

grant update (full_name, job_role, is_admin, is_active) on public.profiles to authenticated;

grant insert (title, description, start_date, end_date, owner_id),
      update (title, description, start_date, end_date, owner_id),
      delete
  on public.milestones to authenticated;

grant insert (title, description, status, assignee_id, department, priority, due_date, milestone_id),
      update (title, description, status, assignee_id, department, priority, due_date, milestone_id),
      delete
  on public.tasks to authenticated;

grant insert (task_id, body), update (body), delete on public.task_comments to authenticated;

grant insert (task_id, kind, name, url, storage_path, size_bytes, mime_type), delete
  on public.task_attachments to authenticated;

-- activity_log: read-only for everyone (see the activity log migration).

grant all on public.profiles, public.milestones, public.tasks, public.task_comments,
  public.task_attachments, public.activity_log,
  public.task_board, public.milestone_progress, public.task_status_counts, public.person_workload
  to service_role;

-- Functions: helpers callable by logged-in users only; trigger functions by nobody directly.
revoke execute on function
  public.is_active_user(), public.is_admin(), public.current_job_role(), public.jakarta_today(),
  public.can_manage_milestones(), public.can_edit_task(uuid, uuid, public.job_role),
  public.can_delete_task(public.job_role),
  public.set_updated_at(), public.set_comment_edited_at(), public.guard_own_profile(),
  public.check_person_is_active(), public.handle_new_auth_user(), public.handle_auth_user_email_change()
  from public, anon, authenticated;

grant execute on function
  public.is_active_user(), public.is_admin(), public.current_job_role(), public.jakarta_today(),
  public.can_manage_milestones(), public.can_edit_task(uuid, uuid, public.job_role),
  public.can_delete_task(public.job_role)
  to authenticated, service_role;

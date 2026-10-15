-- HerblocX Tracker: Row Level Security, the approved permission matrix (PLAN.md section 4).
-- Every policy requires an ACTIVE account. Deactivated users can see and do nothing.
-- Anything without a matching policy is refused.

alter table public.profiles enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.activity_log enable row level security;

-- ---------------------------------------------------------------------------
-- Users / accounts: everyone can see the team list; only Admin can change it.
-- New profiles are created only by the login-account trigger. Nobody can delete one.
-- ---------------------------------------------------------------------------
create policy "Active users can view profiles"
  on public.profiles for select to authenticated
  using (public.is_active_user());

create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------------------------
create policy "Active users can view milestones"
  on public.milestones for select to authenticated
  using (public.is_active_user());

create policy "Admin, Director and Head of Finance can create milestones"
  on public.milestones for insert to authenticated
  with check (public.can_manage_milestones() and created_by = (select auth.uid()));

create policy "Admin, Director, Head of Finance or the owner can edit milestones"
  on public.milestones for update to authenticated
  using (
    public.can_manage_milestones()
    or (owner_id = (select auth.uid()) and public.is_active_user())
  )
  with check (public.is_active_user());

create policy "Admin and Director can delete milestones"
  on public.milestones for delete to authenticated
  using (public.is_admin() or coalesce(public.current_job_role() = 'director', false));

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create policy "Active users can view tasks"
  on public.tasks for select to authenticated
  using (public.is_active_user());

create policy "Active users can create tasks"
  on public.tasks for insert to authenticated
  with check (public.is_active_user() and created_by = (select auth.uid()));

create policy "Permitted users can edit tasks"
  on public.tasks for update to authenticated
  using (public.can_edit_task(created_by, assignee_id, department))
  with check (public.is_active_user());

create policy "Permitted users can delete tasks"
  on public.tasks for delete to authenticated
  using (public.can_delete_task(department));

-- ---------------------------------------------------------------------------
-- Comments: anyone active can comment; only the author edits; author or Admin deletes.
-- ---------------------------------------------------------------------------
create policy "Active users can view comments"
  on public.task_comments for select to authenticated
  using (public.is_active_user());

create policy "Active users can comment"
  on public.task_comments for insert to authenticated
  with check (public.is_active_user() and author_id = (select auth.uid()));

create policy "Authors can edit their own comments"
  on public.task_comments for update to authenticated
  using (author_id = (select auth.uid()) and public.is_active_user())
  with check (author_id = (select auth.uid()));

create policy "Authors and Admin can delete comments"
  on public.task_comments for delete to authenticated
  using (public.is_admin() or (author_id = (select auth.uid()) and public.is_active_user()));

-- ---------------------------------------------------------------------------
-- Attachments: anyone active can add; never edited; uploader, Director or Admin deletes.
-- ---------------------------------------------------------------------------
create policy "Active users can view attachments"
  on public.task_attachments for select to authenticated
  using (public.is_active_user());

create policy "Active users can add attachments"
  on public.task_attachments for insert to authenticated
  with check (public.is_active_user() and added_by = (select auth.uid()));

create policy "Uploader, Director and Admin can delete attachments"
  on public.task_attachments for delete to authenticated
  using (
    public.is_admin()
    or coalesce(public.current_job_role() = 'director', false)
    or (added_by = (select auth.uid()) and public.is_active_user())
  );

-- ---------------------------------------------------------------------------
-- Activity log: read-only. There is deliberately NO insert, update or delete policy.
-- ---------------------------------------------------------------------------
create policy "Active users can view the activity log"
  on public.activity_log for select to authenticated
  using (public.is_active_user());

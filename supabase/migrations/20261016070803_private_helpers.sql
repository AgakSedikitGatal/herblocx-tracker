-- HerblocX Tracker: move the permission helper functions out of the public API.
-- Supabase's security advisor flagged that logged-in users could call these SECURITY DEFINER
-- helpers directly at /rest/v1/rpc/... They only ever report the caller's own permissions,
-- but they don't need to be reachable, so they move to a "private" schema that the API does
-- not expose. Policies point at the functions themselves (not their names), so every
-- permission rule keeps working unchanged.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_active_user() set schema private;
alter function public.is_admin() set schema private;
alter function public.current_job_role() set schema private;
alter function public.can_manage_milestones() set schema private;
alter function public.can_edit_task(uuid, uuid, public.job_role) set schema private;
alter function public.can_delete_task(public.job_role) set schema private;

-- Helpers that call other helpers by name must point at the new schema.
-- CREATE OR REPLACE keeps each function's identity, so the policies stay attached.
create or replace function private.can_manage_milestones()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
      or coalesce(private.current_job_role() in ('director', 'head_of_finance'), false);
$$;

create or replace function private.can_edit_task(p_created_by uuid, p_assignee_id uuid, p_department public.job_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
      or coalesce(private.current_job_role() = 'director', false)
      or coalesce(private.current_job_role() = 'head_of_finance'
                  and p_department in ('finance', 'head_of_finance'), false)
      or (private.is_active_user()
          and coalesce((select auth.uid()) in (p_created_by, p_assignee_id), false));
$$;

create or replace function private.can_delete_task(p_department public.job_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
      or coalesce(private.current_job_role() = 'director', false)
      or coalesce(private.current_job_role() = 'head_of_finance'
                  and p_department in ('finance', 'head_of_finance'), false);
$$;

-- Same access as before: logged-in users (the permission rules run as them) and the server.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

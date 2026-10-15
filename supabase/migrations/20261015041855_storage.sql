-- HerblocX Tracker: private storage bucket for task file uploads.
-- Max 10 MB per file, enforced by the bucket itself. No public links: files open only
-- for logged-in active users, through short-lived signed links.
-- Files are stored as "<task id>/<random id>-<file name>".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-files', 'task-files', false, 10485760,
  array[
    'application/pdf',
    'image/jpeg', 'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do nothing;

create policy "Active users can read task files"
  on storage.objects for select to authenticated
  using (bucket_id = 'task-files' and public.is_active_user());

create policy "Active users can upload task files into an existing task folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-files'
    and public.is_active_user()
    and exists (
      select 1 from public.tasks t where t.id::text = (storage.foldername(objects.name))[1]
    )
  );

-- Who may remove a file is decided by the attachment rules: the app first deletes the
-- attachment row (allowed only for the uploader, Director or Admin), and only a file that
-- no attachment points to any more can then be removed from storage.
create policy "Active users can remove files no attachment points to"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-files'
    and public.is_active_user()
    and not exists (
      select 1 from public.task_attachments a where a.storage_path = objects.name
    )
  );

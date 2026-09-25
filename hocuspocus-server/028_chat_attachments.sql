-- ── Chat attachments: private Storage bucket + metadata table ───────────────

-- 1. Private bucket, 25 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', false, 26214400)
on conflict (id) do nothing;

-- 2. Storage access follows the room. Object paths are
--    "<room_id>/<uuid>/<file name>", so the first folder is the room.
drop policy if exists "chat_files_select" on storage.objects;
create policy "chat_files_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_see_chat_room((storage.foldername(name))[1], (auth.uid())::text)
  );

drop policy if exists "chat_files_insert" on storage.objects;
create policy "chat_files_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_chat_member((storage.foldername(name))[1], (auth.uid())::text)
    and public.chat_room_postable((storage.foldername(name))[1], (auth.uid())::text)
  );

-- Remove your own uploads (a file attached but never sent).
drop policy if exists "chat_files_delete" on storage.objects;
create policy "chat_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-attachments' and owner = auth.uid());

-- 3. Metadata, one row per file, tied to its message.
create table if not exists public.chat_attachments (
  id          text primary key default gen_random_uuid()::text,
  room_id     text not null references public.chat_rooms(id) on delete cascade,
  message_id  text not null references public.chat_messages(id) on delete cascade,
  uploader_id text references public.people(id) on delete set null,
  path        text not null,
  name        text not null,
  mime        text not null default 'application/octet-stream',
  size        bigint not null default 0,
  created_at  bigint not null default public.now_ms()
);

create index if not exists chat_attachments_room_idx
  on public.chat_attachments (room_id);
create index if not exists chat_attachments_message_idx
  on public.chat_attachments (message_id);

alter table public.chat_attachments enable row level security;

-- Visible with the room — and hidden once their message is deleted.
drop policy if exists "chat_attachments_select" on public.chat_attachments;
create policy "chat_attachments_select" on public.chat_attachments
  for select to authenticated
  using (
    public.can_see_chat_room(room_id, (auth.uid())::text)
    and exists (
      select 1 from public.chat_messages m
      where m.id = chat_attachments.message_id
        and m.deleted_at is null
    )
  );

-- Only on your own message, in that message's room, with a file stored
-- under that room's folder.
drop policy if exists "chat_attachments_insert" on public.chat_attachments;
create policy "chat_attachments_insert" on public.chat_attachments
  for insert to authenticated
  with check (
    chat_attachments.uploader_id = (auth.uid())::text
    and public.is_chat_member(chat_attachments.room_id, (auth.uid())::text)
    and public.chat_room_postable(chat_attachments.room_id, (auth.uid())::text)
    and chat_attachments.path like chat_attachments.room_id || '/%'
    and exists (
      select 1 from public.chat_messages m
      where m.id = chat_attachments.message_id
        and m.room_id = chat_attachments.room_id
        and m.author_id = (auth.uid())::text
    )
  );

-- 4. Messages may now be files-only (empty text).
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages
  add constraint chat_messages_body_check check (length(body) <= 8000);

-- 5. Send a message and its attachments in ONE transaction. SECURITY
--    INVOKER (the default): both inserts go through the normal RLS policies,
--    so no permission logic is duplicated here.
create or replace function public.send_chat_message(
  p_id text,
  p_room text,
  p_body text,
  p_reply_to text,
  p_attachments jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  msg public.chat_messages;
  file_count integer := coalesce(jsonb_array_length(p_attachments), 0);
  body_text text := coalesce(p_body, '');
begin
  if file_count > 10 then
    raise exception 'too many attachments' using errcode = '22023';
  end if;
  if btrim(body_text) = '' and file_count = 0 then
    raise exception 'empty message' using errcode = '22023';
  end if;

  insert into public.chat_messages (id, room_id, author_id, body, reply_to_id)
  values (p_id, p_room, (auth.uid())::text, body_text, p_reply_to)
  returning * into msg;

  insert into public.chat_attachments
    (room_id, message_id, uploader_id, path, name, mime, size)
  select
    p_room, p_id, (auth.uid())::text,
    a ->> 'path',
    left(coalesce(a ->> 'name', 'file'), 255),
    coalesce(a ->> 'mime', 'application/octet-stream'),
    coalesce((a ->> 'size')::bigint, 0)
  from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) as a;

  return jsonb_build_object(
    'message', to_jsonb(msg),
    'attachments', coalesce(
      (select jsonb_agg(to_jsonb(x) order by x.created_at)
       from public.chat_attachments x
       where x.message_id = p_id),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.send_chat_message(text, text, text, text, jsonb) to authenticated;

-- 6. Live attachments.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_attachments'
  ) then
    alter publication supabase_realtime add table public.chat_attachments;
  end if;
end $$;
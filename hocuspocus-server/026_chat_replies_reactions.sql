-- ── Chat: reactions + reply integrity ───────────────────────────────────────

create table if not exists public.chat_reactions (
  room_id    text not null references public.chat_rooms(id) on delete cascade,
  message_id text not null references public.chat_messages(id) on delete cascade,
  person_id  text not null references public.people(id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at bigint not null default public.now_ms(),
  primary key (message_id, person_id, emoji)
);

create index if not exists chat_reactions_room_idx
  on public.chat_reactions (room_id);

alter table public.chat_reactions enable row level security;

drop policy if exists "chat_reactions_select" on public.chat_reactions;
create policy "chat_reactions_select" on public.chat_reactions
  for select to authenticated
  using (public.can_see_chat_room(room_id, (auth.uid())::text));

-- React as yourself, as a member who can post, on a live message that
-- really belongs to the room the row claims.
drop policy if exists "chat_reactions_insert" on public.chat_reactions;
create policy "chat_reactions_insert" on public.chat_reactions
  for insert to authenticated
  with check (
    person_id = (auth.uid())::text
    and public.is_chat_member(room_id, (auth.uid())::text)
    and public.chat_room_postable(room_id, (auth.uid())::text)
    and exists (
      select 1 from public.chat_messages m
      where m.id = message_id
        and m.room_id = chat_reactions.room_id
        and m.deleted_at is null
    )
  );

drop policy if exists "chat_reactions_delete" on public.chat_reactions;
create policy "chat_reactions_delete" on public.chat_reactions
  for delete to authenticated
  using (person_id = (auth.uid())::text);

-- Replies must point at a message in the SAME room.
drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = (auth.uid())::text
    and deleted_at is null
    and public.is_chat_member(room_id, (auth.uid())::text)
    and public.chat_room_postable(room_id, (auth.uid())::text)
    and (
      reply_to_id is null
      or exists (
        select 1 from public.chat_messages r
        where r.id = reply_to_id
          and r.room_id = chat_messages.room_id
      )
    )
  );

-- Live reactions.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_reactions'
  ) then
    alter publication supabase_realtime add table public.chat_reactions;
  end if;
end $$;
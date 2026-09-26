-- ── Chat: share a page block into a room ────────────────────────────────────

-- One shared block per message. No SELECT policy on purpose: clients never
-- read this table directly — room_block_refs() returns the snapshot only to
-- people who can read the page, so sharing a private page's block into a
-- room never leaks its text.
create table if not exists public.chat_block_refs (
  message_id text primary key references public.chat_messages(id) on delete cascade,
  room_id    text not null references public.chat_rooms(id) on delete cascade,
  page_id    text not null references public.pages(id) on delete cascade,
  block_id   text not null check (char_length(block_id) between 1 and 100),
  snapshot   text not null default '' check (char_length(snapshot) <= 2000),
  created_at bigint not null default public.now_ms()
);

create index if not exists chat_block_refs_room_idx
  on public.chat_block_refs (room_id);

alter table public.chat_block_refs enable row level security;

-- Send a message that carries a block, in one transaction. SECURITY DEFINER
-- (the table has no client policies), so every rule is checked explicitly:
-- you post as yourself, as a member who can post, replying within the room,
-- sharing a page you can read.
create or replace function public.send_block_message(
  p_id text,
  p_room text,
  p_body text,
  p_reply_to text,
  p_page text,
  p_block text,
  p_snapshot text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := (auth.uid())::text;
  msg public.chat_messages;
begin
  if caller is null
     or not public.is_chat_member(p_room, caller)
     or not public.chat_room_postable(p_room, caller) then
    raise exception 'you can''t post in this room' using errcode = '42501';
  end if;

  if public.collab_page_access(p_page, caller) is null then
    raise exception 'you can''t read that page' using errcode = '42501';
  end if;

  if p_reply_to is not null and not exists (
    select 1 from public.chat_messages r
    where r.id = p_reply_to and r.room_id = p_room
  ) then
    raise exception 'reply target is not in this room' using errcode = '22023';
  end if;

  insert into public.chat_messages (id, room_id, author_id, body, reply_to_id)
  values (p_id, p_room, caller, coalesce(p_body, ''), p_reply_to)
  returning * into msg;

  insert into public.chat_block_refs (message_id, room_id, page_id, block_id, snapshot)
  values (p_id, p_room, p_page, p_block, left(coalesce(p_snapshot, ''), 2000));

  return jsonb_build_object('message', to_jsonb(msg));
end;
$$;

-- A room's shared blocks. Page, block and snapshot come back only for pages
-- the caller can read; otherwise they're null (→ a locked card).
create or replace function public.room_block_refs(p_room text)
returns table (message_id text, page_id text, block_id text, snapshot text)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.message_id,
    case when a.readable then r.page_id end,
    case when a.readable then r.block_id end,
    case when a.readable then r.snapshot end
  from public.chat_block_refs r
  join public.chat_messages m
    on m.id = r.message_id and m.deleted_at is null
  cross join lateral (
    select public.collab_page_access(r.page_id, (auth.uid())::text) is not null
      as readable
  ) a
  where r.room_id = p_room
    and public.can_see_chat_room(p_room, (auth.uid())::text);
$$;

grant execute on function public.send_block_message(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.room_block_refs(text) to authenticated;
-- ── Showcase rooms: a room linked to one database page ─────────────────────
--
-- A showcase room is an ordinary room (kind 'room') plus showcase_page_id:
-- the database page its entries live in. Every new row in that database is
-- posted into the room as a row message; its replies form the row's thread.

-- ── Undo the first attempt (idempotent) ─────────────────────────────────────
drop function if exists public.set_room_showcase(text, text, jsonb);
alter table public.chat_rooms drop constraint if exists chat_rooms_showcase_check;
alter table public.chat_rooms drop constraint if exists chat_rooms_layout_check;
drop index if exists public.chat_rooms_source_idx;
alter table public.chat_rooms
  drop column if exists showcase_keys,
  drop column if exists source_id,
  drop column if exists layout;

-- ── The link ────────────────────────────────────────────────────────────────
alter table public.chat_rooms
  add column if not exists showcase_page_id text
    references public.pages(id) on delete set null;

-- One room per showcase database.
create unique index if not exists chat_rooms_showcase_page_uniq
  on public.chat_rooms (showcase_page_id)
  where showcase_page_id is not null;

-- ── Row messages ────────────────────────────────────────────────────────────
-- Same shape as chat_block_refs: no client policies; room_row_refs() returns
-- the page id only to people who can read the row.
create table if not exists public.chat_row_refs (
  message_id text primary key references public.chat_messages(id) on delete cascade,
  room_id    text not null references public.chat_rooms(id) on delete cascade,
  page_id    text not null references public.pages(id) on delete cascade,
  created_at bigint not null default public.now_ms()
);

create index if not exists chat_row_refs_room_idx
  on public.chat_row_refs (room_id);

-- One message per row per room (a re-insert never double-posts).
create unique index if not exists chat_row_refs_room_page_uniq
  on public.chat_row_refs (room_id, page_id);

alter table public.chat_row_refs enable row level security;

-- ── Link a room to a database page ─────────────────────────────────────────
-- Room owner only; the page must be a database container you can read.
create or replace function public.set_room_showcase(p_room text, p_page text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := (auth.uid())::text;
begin
  if caller is null or not exists (
    select 1 from public.chat_members
    where room_id = p_room and person_id = caller and role = 'owner'
  ) then
    raise exception 'only the room owner can do this' using errcode = '42501';
  end if;

  if p_page is not null then
    if public.collab_page_access(p_page, caller) is null then
      raise exception 'you can''t read that page' using errcode = '42501';
    end if;
    if not exists (select 1 from public.data_sources ds where ds.page_id = p_page) then
      raise exception 'that page is not a database' using errcode = '22023';
    end if;
  end if;

  update public.chat_rooms
     set showcase_page_id = p_page
   where id = p_room and kind = 'room';
end;
$$;

-- ── Post each new row into its showcase room ───────────────────────────────
-- Fires for rows created anywhere (the room's Share button or the database
-- page itself). Template pages are skipped. The row's owner is the author.
create or replace function public.post_showcase_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  msg_id text;
begin
  if new.source_id is null
     or new.category = 'Template'
     or new.deleted_at is not null then
    return new;
  end if;

  for r in
    select cr.id
    from public.chat_rooms cr
    join public.data_sources ds on ds.page_id = cr.showcase_page_id
    where ds.id = new.source_id
  loop
    if exists (
      select 1 from public.chat_row_refs x
      where x.room_id = r.id and x.page_id = new.id
    ) then
      continue;
    end if;

    msg_id := gen_random_uuid()::text;
    insert into public.chat_messages (id, room_id, author_id, body)
    values (msg_id, r.id, new.owner_id, '');
    insert into public.chat_row_refs (message_id, room_id, page_id)
    values (msg_id, r.id, new.id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_post_showcase_row on public.pages;
create trigger trg_post_showcase_row
  after insert on public.pages
  for each row execute function public.post_showcase_row();

-- ── A room's row messages ───────────────────────────────────────────────────
create or replace function public.room_row_refs(p_room text)
returns table (message_id text, page_id text)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.message_id,
    case
      when public.collab_page_access(r.page_id, (auth.uid())::text) is not null
      then r.page_id
    end
  from public.chat_row_refs r
  join public.chat_messages m
    on m.id = r.message_id and m.deleted_at is null
  where r.room_id = p_room
    and public.can_see_chat_room(p_room, (auth.uid())::text);
$$;

revoke all on function public.set_room_showcase(text, text) from public;
grant execute on function public.set_room_showcase(text, text) to authenticated;
grant execute on function public.room_row_refs(text) to authenticated;
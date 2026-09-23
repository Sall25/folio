-- ── Chat: rooms (workspace / teamspace), DMs, members, messages ─────────────

create table if not exists public.chat_rooms (
  id              text primary key default gen_random_uuid()::text,
  kind            text not null default 'room' check (kind in ('room', 'dm')),
  name            text,
  icon            text,
  -- Host workspace. For teamspace rooms: the teamspace's host. For DMs: the
  -- opener's workspace (informational only; DM access is membership).
  workspace_id    text references public.workspaces(id) on delete cascade,
  teamspace_id    text references public.teamspaces(id) on delete cascade,
  visibility      text not null default 'private'
                    check (visibility in ('open', 'private')),
  created_by      text references public.people(id) on delete set null,
  created_at      bigint not null
                    default ((extract(epoch from now()) * 1000)::bigint),
  last_message_at bigint,
  -- 'a:b' with the two person ids sorted; one DM per pair.
  dm_key          text unique
);

create table if not exists public.chat_members (
  room_id      text not null references public.chat_rooms(id) on delete cascade,
  person_id    text not null references public.people(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  last_read_at bigint not null default 0,
  joined_at    bigint not null
                 default ((extract(epoch from now()) * 1000)::bigint),
  primary key (room_id, person_id)
);

create table if not exists public.chat_messages (
  id          text primary key default gen_random_uuid()::text,
  room_id     text not null references public.chat_rooms(id) on delete cascade,
  author_id   text references public.people(id) on delete set null,
  body        text not null check (length(body) between 1 and 8000),
  reply_to_id text references public.chat_messages(id) on delete set null,
  created_at  bigint not null
                default ((extract(epoch from now()) * 1000)::bigint),
  edited_at   bigint,
  deleted_at  bigint
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at desc);
create index if not exists chat_members_person_idx
  on public.chat_members (person_id);
create index if not exists chat_rooms_teamspace_idx
  on public.chat_rooms (teamspace_id);

-- ── Helpers (security definer: read tables without RLS recursion) ───────────

create or replace function public.now_ms()
returns bigint language sql stable as $$
  select (extract(epoch from now()) * 1000)::bigint;
$$;

create or replace function public.is_chat_member(p_room text, person text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_members
    where room_id = p_room and person_id = person
  );
$$;

-- Is `person` inside a scope (workspace, or teamspace if given)? Used both for
-- open-room visibility and for who may be invited.
create or replace function public.chat_scope_allows(
  p_workspace text, p_teamspace text, person text
)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_teamspace is not null
      then public.is_teamspace_member_person(p_teamspace, person)
    else p_workspace is not null and p_workspace = (
      select workspace_id from public.people where id = person
    )
  end;
$$;

create or replace function public.can_see_chat_room(p_room text, person text)
returns boolean language sql stable security definer set search_path = public as $$
  select person is not null and (
    public.is_chat_member(p_room, person)
    or exists (
      select 1 from public.chat_rooms r
      where r.id = p_room
        and r.kind = 'room'
        and r.visibility = 'open'
        and public.chat_scope_allows(r.workspace_id, r.teamspace_id, person)
    )
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Rooms and memberships are created only through the RPCs below (no insert
-- policies), so every create/join/invite is validated server-side.

alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_rooms_select" on public.chat_rooms;
create policy "chat_rooms_select" on public.chat_rooms
  for select to authenticated
  using (public.can_see_chat_room(id, (auth.uid())::text));

drop policy if exists "chat_rooms_update" on public.chat_rooms;
create policy "chat_rooms_update" on public.chat_rooms
  for update to authenticated
  using (exists (
    select 1 from public.chat_members m
    where m.room_id = id and m.person_id = (auth.uid())::text and m.role = 'owner'
  ));

drop policy if exists "chat_rooms_delete" on public.chat_rooms;
create policy "chat_rooms_delete" on public.chat_rooms
  for delete to authenticated
  using (kind = 'room' and exists (
    select 1 from public.chat_members m
    where m.room_id = id and m.person_id = (auth.uid())::text and m.role = 'owner'
  ));

drop policy if exists "chat_members_select" on public.chat_members;
create policy "chat_members_select" on public.chat_members
  for select to authenticated
  using (public.can_see_chat_room(room_id, (auth.uid())::text));

-- Leave a room yourself; owners can remove others.
drop policy if exists "chat_members_delete" on public.chat_members;
create policy "chat_members_delete" on public.chat_members
  for delete to authenticated
  using (
    person_id = (auth.uid())::text
    or exists (
      select 1 from public.chat_members o
      where o.room_id = chat_members.room_id
        and o.person_id = (auth.uid())::text
        and o.role = 'owner'
    )
  );

drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
  for select to authenticated
  using (public.can_see_chat_room(room_id, (auth.uid())::text));

drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = (auth.uid())::text
    and deleted_at is null
    and public.is_chat_member(room_id, (auth.uid())::text)
  );

-- Edit / soft-delete your own messages.
drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages
  for update to authenticated
  using (author_id = (auth.uid())::text)
  with check (author_id = (auth.uid())::text);

-- ── Triggers ─────────────────────────────────────────────────────────────

create or replace function public.chat_touch_room()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_rooms
  set last_message_at = new.created_at
  where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists trg_chat_touch_room on public.chat_messages;
create trigger trg_chat_touch_room
  after insert on public.chat_messages
  for each row execute function public.chat_touch_room();

-- Every teamspace gets an open #general room.
create or replace function public.chat_teamspace_general()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  room text;
  owner text := new.owner_ids[1];
begin
  insert into public.chat_rooms (name, kind, visibility, teamspace_id, workspace_id, created_by)
  values ('general', 'room', 'open', new.id, new.workspace_id, owner)
  returning id into room;

  if owner is not null then
    insert into public.chat_members (room_id, person_id, role)
    values (room, owner, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_teamspace_general on public.teamspaces;
create trigger trg_chat_teamspace_general
  after insert on public.teamspaces
  for each row execute function public.chat_teamspace_general();

-- Backfill #general for existing teamspaces.
insert into public.chat_rooms (name, kind, visibility, teamspace_id, workspace_id, created_by)
select 'general', 'room', 'open', t.id, t.workspace_id, t.owner_ids[1]
from public.teamspaces t
where not exists (
  select 1 from public.chat_rooms r
  where r.teamspace_id = t.id and r.name = 'general'
);

insert into public.chat_members (room_id, person_id, role)
select r.id, r.created_by, 'owner'
from public.chat_rooms r
where r.name = 'general' and r.teamspace_id is not null and r.created_by is not null
on conflict do nothing;

-- ── RPCs ─────────────────────────────────────────────────────────────────

create or replace function public.create_chat_room(
  p_name text,
  p_icon text,
  p_teamspace_id text,
  p_visibility text,
  p_member_ids text[]
)
returns text language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  ws text;
  room text;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'room name required' using errcode = '22023';
  end if;

  if p_teamspace_id is not null then
    if not public.is_teamspace_member_person(p_teamspace_id, caller) then
      raise exception 'not a member of this teamspace' using errcode = '42501';
    end if;
    select workspace_id into ws from public.teamspaces where id = p_teamspace_id;
  else
    select workspace_id into ws from public.people where id = caller;
  end if;

  insert into public.chat_rooms (name, icon, kind, visibility, workspace_id, teamspace_id, created_by)
  values (trim(p_name), p_icon, 'room',
          case when p_visibility = 'open' then 'open' else 'private' end,
          ws, p_teamspace_id, caller)
  returning id into room;

  insert into public.chat_members (room_id, person_id, role)
  values (room, caller, 'owner');

  -- Invitees outside the room's scope are skipped, not errors.
  insert into public.chat_members (room_id, person_id, role)
  select room, m, 'member'
  from unnest(coalesce(p_member_ids, '{}')) as m
  where m <> caller
    and public.chat_scope_allows(ws, p_teamspace_id, m)
  on conflict do nothing;

  return room;
end;
$$;

create or replace function public.add_chat_members(p_room text, p_member_ids text[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  r public.chat_rooms;
  added integer;
begin
  select * into r from public.chat_rooms where id = p_room;
  if r.id is null or r.kind <> 'room' then
    raise exception 'room not found' using errcode = '22023';
  end if;
  if not public.is_chat_member(p_room, caller) then
    raise exception 'only members can invite' using errcode = '42501';
  end if;

  insert into public.chat_members (room_id, person_id, role)
  select p_room, m, 'member'
  from unnest(coalesce(p_member_ids, '{}')) as m
  where public.chat_scope_allows(r.workspace_id, r.teamspace_id, m)
  on conflict do nothing;

  get diagnostics added = row_count;
  return added;
end;
$$;

create or replace function public.join_chat_room(p_room text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
begin
  if not public.can_see_chat_room(p_room, caller) then
    raise exception 'cannot join this room' using errcode = '42501';
  end if;
  insert into public.chat_members (room_id, person_id, role)
  values (p_room, caller, 'member')
  on conflict do nothing;
end;
$$;

create or replace function public.open_dm(p_other text)
returns text language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  key text;
  room text;
  shares boolean;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_other is null or p_other = caller then
    raise exception 'invalid recipient' using errcode = '22023';
  end if;

  -- DMs between people who share a workspace or a teamspace.
  select
    (select workspace_id from public.people where id = p_other)
      = (select workspace_id from public.people where id = caller)
    or exists (
      select 1 from public.teamspaces t
      where public.is_teamspace_member_person(t.id, caller)
        and public.is_teamspace_member_person(t.id, p_other)
    )
  into shares;

  if not coalesce(shares, false) then
    raise exception 'you can only message people you share a space with'
      using errcode = '42501';
  end if;

  key := least(caller, p_other) || ':' || greatest(caller, p_other);

  select id into room from public.chat_rooms where dm_key = key;
  if room is null then
    insert into public.chat_rooms (kind, dm_key, workspace_id, created_by)
    values ('dm', key, (select workspace_id from public.people where id = caller), caller)
    returning id into room;
  end if;

  insert into public.chat_members (room_id, person_id, role)
  values (room, caller, 'member'), (room, p_other, 'member')
  on conflict do nothing;

  return room;
end;
$$;

create or replace function public.mark_chat_read(p_room text)
returns void language sql security definer set search_path = public as $$
  update public.chat_members
  set last_read_at = public.now_ms()
  where room_id = p_room and person_id = (auth.uid())::text;
$$;

create or replace function public.chat_unread_counts()
returns table (room_id text, unread integer)
language sql stable security definer set search_path = public as $$
  select m.room_id, count(msg.id)::integer
  from public.chat_members m
  join public.chat_messages msg
    on msg.room_id = m.room_id
   and msg.created_at > m.last_read_at
   and msg.deleted_at is null
   and msg.author_id is distinct from m.person_id
  where m.person_id = (auth.uid())::text
  group by m.room_id;
$$;

grant execute on function public.create_chat_room(text, text, text, text, text[]) to authenticated;
grant execute on function public.add_chat_members(text, text[]) to authenticated;
grant execute on function public.join_chat_room(text) to authenticated;
grant execute on function public.open_dm(text) to authenticated;
grant execute on function public.mark_chat_read(text) to authenticated;
grant execute on function public.chat_unread_counts() to authenticated;

-- ── Realtime: stream message changes to subscribed clients (RLS applies) ────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
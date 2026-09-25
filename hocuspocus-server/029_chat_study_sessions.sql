-- ── Chat study sessions: a shared focus timer per room ──────────────────────

create table if not exists public.chat_study_sessions (
  id            text primary key default gen_random_uuid()::text,
  room_id       text not null references public.chat_rooms(id) on delete cascade,
  started_by    text references public.people(id) on delete set null,
  started_at    bigint not null default public.now_ms(),
  focus_minutes integer not null check (focus_minutes between 5 and 120),
  break_minutes integer not null check (break_minutes between 1 and 60),
  rounds        integer not null check (rounds between 1 and 12),
  ended_at      bigint
);

-- At most one open session per room.
create unique index if not exists chat_study_sessions_open_uniq
  on public.chat_study_sessions (room_id)
  where ended_at is null;

create table if not exists public.chat_study_participants (
  session_id text not null references public.chat_study_sessions(id) on delete cascade,
  room_id    text not null references public.chat_rooms(id) on delete cascade,
  person_id  text not null references public.people(id) on delete cascade,
  joined_at  bigint not null default public.now_ms(),
  primary key (session_id, person_id)
);

create index if not exists chat_study_participants_room_idx
  on public.chat_study_participants (room_id);

alter table public.chat_study_sessions enable row level security;
alter table public.chat_study_participants enable row level security;

drop policy if exists "chat_study_sessions_select" on public.chat_study_sessions;
create policy "chat_study_sessions_select" on public.chat_study_sessions
  for select to authenticated
  using (public.can_see_chat_room(room_id, (auth.uid())::text));

drop policy if exists "chat_study_participants_select" on public.chat_study_participants;
create policy "chat_study_participants_select" on public.chat_study_participants
  for select to authenticated
  using (public.can_see_chat_room(room_id, (auth.uid())::text));

-- Total length: every round's focus + break, minus the last break.
create or replace function public.study_session_total_ms(f integer, b integer, r integer)
returns bigint language sql immutable as $$
  select ((r * (f + b)) - b)::bigint * 60000;
$$;

create or replace function public.study_session_is_open(s public.chat_study_sessions)
returns boolean language sql stable as $$
  select s.ended_at is null
    and s.started_at
        + public.study_session_total_ms(s.focus_minutes, s.break_minutes, s.rounds)
        > public.now_ms();
$$;

-- All writes go through these RPCs.
create or replace function public.start_study_session(
  p_room text,
  p_focus integer,
  p_break integer,
  p_rounds integer
)
returns text language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  session_id text;
begin
  if not (public.is_chat_member(p_room, caller)
          and public.chat_room_postable(p_room, caller)) then
    raise exception 'only room members can start a study session'
      using errcode = '42501';
  end if;

  -- Close sessions that ran their course without being stopped.
  update public.chat_study_sessions s
  set ended_at = public.now_ms()
  where s.room_id = p_room
    and s.ended_at is null
    and not public.study_session_is_open(s);

  insert into public.chat_study_sessions
    (room_id, started_by, focus_minutes, break_minutes, rounds)
  values (p_room, caller, p_focus, p_break, p_rounds)
  returning id into session_id;

  insert into public.chat_study_participants (session_id, room_id, person_id)
  values (session_id, p_room, caller);

  return session_id;
exception
  when unique_violation then
    raise exception 'a study session is already running in this room'
      using errcode = '22023';
end;
$$;

-- The starter or a room owner can stop a session.
create or replace function public.stop_study_session(p_session text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  s public.chat_study_sessions;
begin
  select * into s from public.chat_study_sessions where id = p_session;
  if s.id is null then
    raise exception 'session not found' using errcode = '22023';
  end if;
  if s.started_by is distinct from caller and not exists (
    select 1 from public.chat_members m
    where m.room_id = s.room_id and m.person_id = caller and m.role = 'owner'
  ) then
    raise exception 'only the starter or a room owner can stop it'
      using errcode = '42501';
  end if;

  update public.chat_study_sessions
  set ended_at = public.now_ms()
  where id = p_session and ended_at is null;
end;
$$;

create or replace function public.join_study_session(p_session text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  s public.chat_study_sessions;
begin
  select * into s from public.chat_study_sessions where id = p_session;
  if s.id is null or not public.study_session_is_open(s) then
    raise exception 'this session has ended' using errcode = '22023';
  end if;
  if not (public.is_chat_member(s.room_id, caller)
          and public.chat_room_postable(s.room_id, caller)) then
    raise exception 'only room members can join' using errcode = '42501';
  end if;

  insert into public.chat_study_participants (session_id, room_id, person_id)
  values (p_session, s.room_id, caller)
  on conflict do nothing;
end;
$$;

create or replace function public.leave_study_session(p_session text)
returns void language sql security definer set search_path = public as $$
  delete from public.chat_study_participants
  where session_id = p_session and person_id = (auth.uid())::text;
$$;

grant execute on function public.start_study_session(text, integer, integer, integer) to authenticated;
grant execute on function public.stop_study_session(text) to authenticated;
grant execute on function public.join_study_session(text) to authenticated;
grant execute on function public.leave_study_session(text) to authenticated;

-- Live sessions and participants.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'chat_study_sessions'
  ) then
    alter publication supabase_realtime add table public.chat_study_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'chat_study_participants'
  ) then
    alter publication supabase_realtime add table public.chat_study_participants;
  end if;
end $$;
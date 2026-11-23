-- Inviting someone to a room: say who was actually added, and let their own
-- app find out at once.
--
-- Two things were quietly wrong.
--
-- 1. add_chat_members filters the people you picked through
--    chat_scope_allows — for a teamspace room that means "already in this
--    teamspace", for a workspace room "in this workspace" — and skipped the
--    rest without a word, returning only a row count the client threw away.
--    Invite three people from outside and the app said it had done it. It
--    returns what happened now: who was added, who was already there, and
--    who was out of scope, so the app can name them.
--
-- 2. chat_members was not in the realtime publication, so a person invited
--    while sitting in the app stayed a non-member as far as their own copy
--    was concerned — they could see the room and not write in it — until
--    their rooms query happened to refetch.

-- ── 1. The invite says what it did ─────────────────────────────────────────
drop function if exists public.add_chat_members(text, text[]);

create function public.add_chat_members(p_room text, p_member_ids text[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller text := (auth.uid())::text;
  r public.chat_rooms;
  wanted text[];
  allowed text[];
  added text[];
begin
  select * into r from public.chat_rooms where id = p_room;
  if r.id is null or r.kind <> 'room' then
    raise exception 'room not found' using errcode = '22023';
  end if;
  if not public.is_chat_member(p_room, caller) then
    raise exception 'only members can invite' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct m), '{}')
    into wanted
    from unnest(coalesce(p_member_ids, '{}')) as m
   where coalesce(m, '') <> '';

  select coalesce(array_agg(m), '{}')
    into allowed
    from unnest(wanted) as m
   where public.chat_scope_allows(r.workspace_id, r.teamspace_id, m);

  with ins as (
    insert into public.chat_members (room_id, person_id, role)
    select p_room, m, 'member' from unnest(allowed) as m
    on conflict do nothing
    returning person_id
  )
  select coalesce(array_agg(person_id), '{}') into added from ins;

  return jsonb_build_object(
    'added', to_jsonb(added),
    -- Picked, allowed, and already in the room: nothing to report, but the
    -- caller should not be told they were added either.
    'already', to_jsonb((
      select coalesce(array_agg(m), '{}')
        from unnest(allowed) as m
       where not (m = any(added))
    )),
    -- Picked and out of the room's scope: the ones the app has to explain.
    'skipped', to_jsonb((
      select coalesce(array_agg(m), '{}')
        from unnest(wanted) as m
       where not (m = any(allowed))
    ))
  );
end;
$function$;

-- ── 2. Membership changes reach the person they are about ──────────────────
do $$
begin
  alter publication supabase_realtime add table public.chat_members;
exception
  when duplicate_object then null;
end
$$;

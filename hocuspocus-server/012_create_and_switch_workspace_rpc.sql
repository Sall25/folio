-- ── Atomic create-workspace-and-switch, and switch-workspace ────────────────
-- Both are single transactions so you can't end up with an orphaned workspace
-- (create) or a half-applied switch. Called via supabase.rpc(), running as the
-- authenticated user, so auth.uid() is the caller — no way to act as someone
-- else.

-- create_workspace: makes a new workspace owned by the caller, moves the
-- caller's membership (people.workspace_id) into it, returns the new id.
create or replace function public.create_workspace(ws_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id text := auth.uid()::text;
  new_ws_id text := gen_random_uuid()::text;
begin
  if caller_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- New workspace, owned by the caller.
  insert into public.workspaces (id, name, owner_id)
  values (new_ws_id, coalesce(nullif(trim(ws_name), ''), 'New workspace'), caller_id);

  -- Switch the caller into it. They become its owner (their single people row
  -- moves; they're a member of exactly one workspace at a time).
  update public.people
  set workspace_id = new_ws_id,
      role = 'owner'
  where id = caller_id;

  return new_ws_id;
end;
$$;

-- switch_workspace: move the caller's membership into an existing workspace
-- they OWN. Reused by the switcher. Rejects switching into a workspace you
-- don't own (membership of others' workspaces is teamspaces, not this).
create or replace function public.switch_workspace(target_ws_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id text := auth.uid()::text;
  owns      boolean;
begin
  if caller_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.workspaces
    where id = target_ws_id and owner_id = caller_id
  ) into owns;

  if not owns then
    raise exception 'you do not own that workspace' using errcode = '42501';
  end if;

  update public.people
  set workspace_id = target_ws_id
  where id = caller_id;
end;
$$;

-- Let authenticated users call both.
grant execute on function public.create_workspace(text)  to authenticated;
grant execute on function public.switch_workspace(text)  to authenticated;
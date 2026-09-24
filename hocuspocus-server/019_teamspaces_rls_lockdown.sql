-- ── Teamspaces RLS lockdown ─────────────────────────────────────────────────
-- 1. teamspaces_select used is_workspace_member(), which ignores the row, so
--    every open/closed teamspace in EVERY workspace was readable by anyone.
-- 2. teamspaces_write allowed any caller whose people.role = 'owner' — i.e.
--    every user (each owns their own workspace) — to insert/update/delete
--    ANY teamspace, including adding themselves to member_ids (which grants
--    page access via the teamspace path).

-- ── Reads ─────────────────────────────────────────────────────────────────
drop policy if exists "teamspaces_select" on public.teamspaces;
drop policy if exists "teamspaces_select_members" on public.teamspaces;

create policy "teamspaces_select" on public.teamspaces
  for select to authenticated
  using (
    -- Members (direct, owner, or via group) — from any workspace.
    public.is_teamspace_member(id)
    -- Open/closed teamspaces are discoverable, but only inside their host
    -- workspace. Private ones are members-only.
    or (
      access in ('open', 'closed')
      and workspace_id = (
        select p.workspace_id from public.people p
        where p.id = (auth.uid())::text
      )
    )
  );

-- ── Writes ────────────────────────────────────────────────────────────────
drop policy if exists "teamspaces_write" on public.teamspaces;

-- Create in your own workspace, as an owner. set_teamspace_defaults (BEFORE
-- INSERT) fills workspace_id and owner_ids first; RLS checks the result.
create policy "teamspaces_insert" on public.teamspaces
  for insert to authenticated
  with check (
    (auth.uid())::text = any (owner_ids)
    and workspace_id = (
      select p.workspace_id from public.people p
      where p.id = (auth.uid())::text
    )
  );

create policy "teamspaces_update" on public.teamspaces
  for update to authenticated
  using ((auth.uid())::text = any (owner_ids))
  with check ((auth.uid())::text = any (owner_ids));

create policy "teamspaces_delete" on public.teamspaces
  for delete to authenticated
  using ((auth.uid())::text = any (owner_ids));

-- ── Membership fields only change through RPCs ────────────────────────────
-- Direct client updates run as `authenticated`; inside the SECURITY DEFINER
-- membership RPCs current_user is the function owner, so they pass. (This
-- trigger function must NOT be security definer, or current_user would
-- always be its owner.) The SQL editor runs as postgres and passes too.
create or replace function public.guard_teamspace_membership()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (
       new.member_ids      is distinct from old.member_ids
       or new.owner_ids    is distinct from old.owner_ids
       or new.workspace_id is distinct from old.workspace_id
       or new.pinned_page_ids is distinct from old.pinned_page_ids
     )
  then
    raise exception 'membership changes must go through the membership functions'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_teamspace_membership on public.teamspaces;
create trigger trg_guard_teamspace_membership
  before update on public.teamspaces
  for each row
  execute function public.guard_teamspace_membership();
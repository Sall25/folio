-- Teamspaces belong to a workspace.
--
-- A teamspace shows in the sidebar of its home workspace only
-- (teamspaces.workspace_id, the workspace it was created in). Each person
-- can also show it in other workspaces they're in, for themselves only
-- (teamspace_placements). Owners move a teamspace's home for everyone with
-- the existing move_teamspace(ts_id, target_ws_id). Access is unchanged: a member can still open the
-- teamspace's pages from any workspace (links, search, mentions).
--
-- Existing teamspaces keep the home they have; nothing moves.

create table if not exists public.teamspace_placements (
  person_id text not null default (auth.uid())::text,
  teamspace_id text not null references public.teamspaces (id) on delete cascade,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, teamspace_id, workspace_id)
);

alter table public.teamspace_placements enable row level security;

-- Your own rows only. Adding one needs you to be in the teamspace and in the
-- workspace you show it in.
drop policy if exists teamspace_placements_select on public.teamspace_placements;
create policy teamspace_placements_select on public.teamspace_placements
  for select to authenticated
  using (person_id = (auth.uid())::text);

drop policy if exists teamspace_placements_insert on public.teamspace_placements;
create policy teamspace_placements_insert on public.teamspace_placements
  for insert to authenticated
  with check (
    person_id = (auth.uid())::text
    and public.is_teamspace_member(teamspace_id)
    and public.is_workspace_member_of(workspace_id, (auth.uid())::text)
  );

drop policy if exists teamspace_placements_delete on public.teamspace_placements;
create policy teamspace_placements_delete on public.teamspace_placements
  for delete to authenticated
  using (person_id = (auth.uid())::text);

grant select, insert, delete on public.teamspace_placements to authenticated;
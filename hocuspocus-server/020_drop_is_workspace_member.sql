-- ── Replace every is_workspace_member() policy, then drop the function ─────
-- is_workspace_member() ignores the row being checked, so each policy using
-- it effectively granted access to every row of the table:
--   • workspace_settings — every workspace's invite link was readable
--   • groups             — every group (names, member lists) was readable
--   • data_sources       — every database schema was readable AND writable

-- ── workspace_settings: the workspaces you own or are currently in ─────────
-- id is the workspace id (one settings row per workspace).
drop policy if exists "workspace_settings_select" on public.workspace_settings;
create policy "workspace_settings_select" on public.workspace_settings
  for select to authenticated
  using (
    id in (
      select w.id from public.workspaces w
      where w.owner_id = (auth.uid())::text
    )
    or id = (
      select p.workspace_id from public.people p
      where p.id = (auth.uid())::text
    )
  );

-- ── groups: your workspace's groups, plus any group you're in ──────────────
-- The second clause matters for teamspaces: a member from another workspace
-- who belongs through a group can see that group. (Membership checks read
-- groups as security definer, so page access doesn't depend on this.)
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated
  using (
    workspace_id = (
      select p.workspace_id from public.people p
      where p.id = (auth.uid())::text
    )
    or (auth.uid())::text = any (member_ids)
  );

-- ── data_sources: follow the database page ─────────────────────────────────
-- A data source is readable when its page is readable. The subquery on pages
-- runs under the caller's own RLS, so this mirrors pages_select exactly
-- (workspace pages, teamspace pages, cross-workspace members). A source
-- with no page_id falls back to its rows.
drop policy if exists "data_sources_select" on public.data_sources;
drop policy if exists "data_sources_write" on public.data_sources;

create policy "data_sources_select" on public.data_sources
  for select to authenticated
  using (
    (page_id is not null and exists (
      select 1 from public.pages p where p.id = data_sources.page_id
    ))
    or (page_id is null and exists (
      select 1 from public.pages r where r.source_id = data_sources.id
    ))
  );

-- Writable when the page is writable (owner / page_access via can_write_page,
-- or teamspace membership). Sourceless-page fallback: any writable row.
create or replace function public.can_write_data_source(p_source text, p_page text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_page is not null then
      public.can_write_page(p_page)
      or public.teamspace_grants_access_to_page(p_page)
    else exists (
      select 1 from public.pages r
      where r.source_id = p_source
        and (public.can_write_page(r.id)
             or public.teamspace_grants_access_to_page(r.id))
    )
  end;
$$;

-- Creating a data source happens alongside creating its database page, which
-- may not exist yet at insert time — allow a pageless insert, or one whose
-- page you can write.
create policy "data_sources_insert" on public.data_sources
  for insert to authenticated
  with check (
    auth.uid() is not null
    and (page_id is null or public.can_write_data_source(id, page_id))
  );

create policy "data_sources_update" on public.data_sources
  for update to authenticated
  using (public.can_write_data_source(id, page_id))
  with check (public.can_write_data_source(id, page_id));

create policy "data_sources_delete" on public.data_sources
  for delete to authenticated
  using (public.can_write_data_source(id, page_id));

-- ── Drop is_workspace_member() (every overload) ────────────────────────────
-- No policy uses it anymore; dropping it means a future policy can't reach
-- for it by accident. (Function BODIES aren't dependency-tracked, so check
-- the query below first — any function still calling it would break.)
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_workspace_member'
  loop
    execute format('drop function %s', fn);
  end loop;
end $$;
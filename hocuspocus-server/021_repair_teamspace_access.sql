-- ── Repair: apply the missing teamspace-access, pins/templates, and
--    is_workspace_member cleanup in one go. Idempotent. ─────────────────────

-- ═══ 1. Columns first (the guard trigger reads pinned_page_ids) ═══════════

alter table public.teamspaces
  add column if not exists pinned_page_ids text[] not null default '{}';

-- ═══ 2. Teamspace access helpers ══════════════════════════════════════════

create or replace function public.is_teamspace_member_person(ts_id text, person text)
returns boolean language sql stable security definer set search_path = public as $$
  select person is not null and exists (
    select 1 from public.teamspaces t
    where t.id = ts_id
      and (
        person = any (t.owner_ids)
        or person = any (t.member_ids)
        or exists (
          select 1 from public.groups g
          where g.id = any (t.group_ids)
            and person = any (g.member_ids)
        )
      )
  );
$$;

create or replace function public.is_teamspace_member(ts_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_teamspace_member_person(ts_id, (auth.uid())::text);
$$;

-- Membership grants access, except for teamspaces in your OTHER owned
-- workspaces (hidden until you switch into that workspace).
create or replace function public.teamspace_grants_access(ts_id text, page_ws_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select ts_id is not null
    and public.is_teamspace_member(ts_id)
    and (
      page_ws_id = (
        select p.workspace_id from public.people p
        where p.id = (auth.uid())::text
      )
      or not exists (
        select 1 from public.workspaces w
        where w.id = page_ws_id
          and w.owner_id = (auth.uid())::text
      )
    );
$$;

create or replace function public.teamspace_grants_access_to_page(pid text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select public.teamspace_grants_access(p.teamspace_id, p.workspace_id)
     from public.pages p where p.id = pid),
    false
  );
$$;

-- ═══ 3. Page teamspace stamping (final version: host pinning + templates) ═

create or replace function public.set_page_teamspace_id()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ts text;
  host_ws text;
begin
  if new.parent_id is not null then
    select teamspace_id into ts
    from public.pages where id = new.parent_id;
  elsif new.source_id is not null then
    select p.teamspace_id into ts
    from public.data_sources ds
    join public.pages p on p.id = ds.page_id
    where ds.id = new.source_id;
  elsif exists (select 1 from public.teamspaces where id = new.id) then
    ts := new.id;
  elsif new.category = 'Template'
    and new.teamspace_id is not null
    and (
      auth.uid() is null
      or public.is_teamspace_member_person(new.teamspace_id, (auth.uid())::text)
    ) then
    ts := new.teamspace_id;
  end if;

  new.teamspace_id := ts;

  if ts is not null then
    select workspace_id into host_ws
    from public.teamspaces where id = ts;
    if host_ws is not null then
      new.workspace_id := host_ws;
    end if;
  end if;

  return new;
end;
$$;

-- ═══ 4. New teamspaces: creator's workspace + creator as owner ════════════

create or replace function public.set_teamspace_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  caller_ws text;
begin
  if caller is null then
    return new;
  end if;

  select workspace_id into caller_ws
  from public.people where id = caller;
  if caller_ws is not null then
    new.workspace_id := caller_ws;
  end if;

  if coalesce(array_length(new.owner_ids, 1), 0) = 0 then
    new.owner_ids := array[caller];
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_teamspace_defaults on public.teamspaces;
create trigger trg_set_teamspace_defaults
  before insert on public.teamspaces
  for each row
  execute function public.set_teamspace_defaults();

-- Backfill existing teamspaces from their root page.
update public.teamspaces t
set workspace_id = p.workspace_id
from public.pages p
where p.id = t.id
  and t.workspace_id is distinct from p.workspace_id;

update public.teamspaces t
set owner_ids = array[p.owner_id]
from public.pages p
where p.id = t.id
  and p.owner_id is not null
  and coalesce(array_length(t.owner_ids, 1), 0) = 0;

-- Pin existing teamspace pages to their teamspace's host workspace.
update public.pages p
set workspace_id = t.workspace_id
from public.teamspaces t
where p.teamspace_id = t.id
  and t.workspace_id is not null
  and p.workspace_id is distinct from t.workspace_id;

-- ═══ 5. Page policies: add the teamspace path ═════════════════════════════

alter policy "pages_select"
on public.pages
to authenticated
using (
  (
    workspace_id in (
      select p.workspace_id from public.people p
      where p.id = (auth.uid())::text
    )
    and (
      owner_id = (auth.uid())::text
      or can_read_page(id)
    )
  )
  or public.teamspace_grants_access(teamspace_id, workspace_id)
);

alter policy "pages_update"
on public.pages
to authenticated
using (
  can_write_page(id)
  or public.teamspace_grants_access(teamspace_id, workspace_id)
)
with check (
  can_write_page(id)
  or public.teamspace_grants_access(teamspace_id, workspace_id)
);

alter policy "pages_insert"
on public.pages
to authenticated
with check (
  auth.uid() is not null
  and (
    parent_id is null
    or can_write_page(parent_id)
    or public.teamspace_grants_access_to_page(parent_id)
  )
);

-- ═══ 6. Shared pins (owners only) ═════════════════════════════════════════

create or replace function public.set_teamspace_pin(
  ts_id text,
  page_id text,
  pinned boolean
)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  result text[];
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.teamspaces
    where id = ts_id and caller = any (owner_ids)
  ) then
    raise exception 'only teamspace owners can pin pages' using errcode = '42501';
  end if;

  if pinned and not exists (
    select 1 from public.pages
    where id = page_id and teamspace_id = ts_id
  ) then
    raise exception 'page is not in this teamspace' using errcode = '22023';
  end if;

  update public.teamspaces
  set pinned_page_ids = case
    when pinned then array_append(array_remove(pinned_page_ids, page_id), page_id)
    else array_remove(pinned_page_ids, page_id)
  end
  where id = ts_id
  returning pinned_page_ids into result;

  return result;
end;
$$;

grant execute on function public.set_teamspace_pin(text, text, boolean) to authenticated;

-- ═══ 7. Replace every is_workspace_member() policy ════════════════════════

-- workspace_settings (holds invite links): workspaces you own or are in.
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

-- groups: your workspace's groups, plus any group you're in.
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

-- data_sources: follow the database page (fallback: its rows).
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

drop policy if exists "data_sources_select" on public.data_sources;
drop policy if exists "data_sources_write" on public.data_sources;
drop policy if exists "data_sources_insert" on public.data_sources;
drop policy if exists "data_sources_update" on public.data_sources;
drop policy if exists "data_sources_delete" on public.data_sources;

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

-- ═══ 8. Drop is_workspace_member() — only if nothing else calls it ═══════
-- Function bodies aren't dependency-tracked, so this checks them itself and
-- skips the drop (with a notice) if any function still references it.
do $$
declare
  fn regprocedure;
  callers text;
begin
  select string_agg(p.proname, ', ') into callers
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosrc ilike '%is_workspace_member%'
    and p.proname <> 'is_workspace_member';

  if callers is not null then
    raise notice 'is_workspace_member() NOT dropped — still called by: %', callers;
    return;
  end if;

  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_workspace_member'
  loop
    execute format('drop function %s', fn);
  end loop;
end $$;
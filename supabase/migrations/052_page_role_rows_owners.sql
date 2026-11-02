-- "Everyone in the teamspace" now reaches database rows and teamspace owners.
--
-- 1. page_teamspace_id walked up through parent pages only. A database row
--    isn't a child of its database's page (it hangs off it through its data
--    source), so for rows, and pages inside rows, it found no teamspace:
--    "Everyone in the teamspace · Can edit" granted nothing there, and the
--    page stayed read-only for the teamspace's members. It now walks up the
--    same way the teamspace_id column is kept (propagate_page_teamspace_id):
--    the parent page, or for a row its database's page. The teamspace_id
--    column is the fallback.
--
-- 2. page_effective_role checked "Everyone in the teamspace" (and the
--    teamspace baseline) against teamspace_effective_members, which lists
--    members and groups but not the teamspace's owners. It now uses
--    is_teamspace_member_person (owners, members, groups), the check the
--    rest of the app uses. Everything else in it is unchanged from 051.

create or replace function public.page_teamspace_id(p_id text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  with recursive chain(id, depth) as (
    select id, 0 from public.pages where id = p_id
    union all
    select coalesce(p.parent_id, ds.page_id), c.depth + 1
    from chain c
    join public.pages p on p.id = c.id
    left join public.data_sources ds on ds.id = p.source_id
    where coalesce(p.parent_id, ds.page_id) is not null
      and c.depth < 100
  )
  select coalesce(
    (
      select c.id
      from chain c
      join public.teamspaces ts on ts.id = c.id
      order by c.depth
      limit 1
    ),
    (select teamspace_id from public.pages where id = p_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.page_effective_role(p_id text, person text)
 RETURNS public.page_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  best     public.page_role := null;
  pg_owner text;
  pg_cat   text;
  pg_ws    text;
  ga       public.general_access;
  ga_role  public.page_role;
  ts_id    text;
  in_ws    boolean := false;
begin
  select owner_id, category, workspace_id, general_access, general_access_role
    into pg_owner, pg_cat, pg_ws, ga, ga_role
  from public.pages where id = p_id;

  -- Page doesn't exist.
  if not found then
    return null;
  end if;

  -- 1. Owner always has full access.
  if person is not null and pg_owner is not null and person = pg_owner then
    return 'full';
  end if;

  -- Anonymous: only a 'public' general access grants anything.
  if person is null then
    if ga = 'public' then
      return ga_role;
    end if;
    return null;
  end if;

  -- Is the person part of THIS page's workspace? (Current members, or the
  -- workspace's owner.) Guests don't count.
  in_ws := exists (
      select 1 from public.people
      where id = person
        and role in ('owner', 'member')
        and workspace_id = pg_ws
    )
    or exists (
      select 1 from public.workspaces w
      where w.id = pg_ws and w.owner_id = person
    );

  -- 2. Explicit grants (direct + group), inherited up the parent chain.
  with recursive chain as (
    select id, parent_id from public.pages where id = p_id
    union all
    select p.id, p.parent_id
    from public.pages p join chain c on p.id = c.parent_id
  ),
  grants as (
    select pa.role
    from public.page_access pa
    join chain c on c.id = pa.page_id
    where pa.subject_type = 'person' and pa.subject_id = person
    union all
    select pa.role
    from public.page_access pa
    join chain c on c.id = pa.page_id
    join public.groups g on g.id = pa.subject_id
    where pa.subject_type = 'group' and person = any (g.member_ids)
  )
  select max(role) into best from grants;

  -- 3. General-access override.
  if ga = 'workspace' then
    if in_ws then
      best := public.greatest_role(best, ga_role);
    end if;
  elsif ga = 'teamspace' then
    -- "Everyone in the teamspace": owners, members and attached groups of
    -- the teamspace this page is in get the chosen role.
    ts_id := public.page_teamspace_id(p_id);
    if ts_id is not null and public.is_teamspace_member_person(ts_id, person) then
      best := public.greatest_role(best, ga_role);
    end if;
  elsif ga = 'public' then
    best := public.greatest_role(best, ga_role);
  end if;

  -- 4. Category baseline (only adds) — unless the page was set to "Only
  -- people invited", which must mean exactly that. A teamspace's own root
  -- page always stays open to its members.
  if ga = 'private' and not public.is_teamspace_root(p_id) then
    return best;
  end if;

  if pg_cat = 'Shared' then
    -- Members of this page's workspace.
    if in_ws then
      best := public.greatest_role(best, coalesce(ga_role, 'view'));
    end if;
  elsif pg_cat = 'Teamspaces' then
    ts_id := public.page_teamspace_id(p_id);
    if ts_id is not null and public.is_teamspace_member_person(ts_id, person) then
      best := public.greatest_role(best, 'view');
    end if;
  end if;

  return best;
end;
$function$;
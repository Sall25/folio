-- Page access: "Only people invited" means it, and access set for a page
-- can be given to every page inside it.
--
-- 1. page_effective_role: the category baselines (every teamspace member can
--    view a teamspace page; every workspace member can open a Shared page)
--    no longer apply to a page set to "Only people invited" (private). The
--    share panel said only the people listed could open it, while teamspace
--    or workspace members still could. A teamspace's own root page stays
--    open to its members. Everything else is unchanged.
--
-- 2. Pages outside any teamspace still set to "Everyone in the teamspace"
--    (the column's default, or a page moved out of a teamspace) granted
--    nobody anything, while the share panel showed a teamspace option that
--    isn't offered there. They become "Only people invited": same access,
--    honest label.
--
-- 3. set_page_general_access_tree(page, access, role): set a page's general
--    access and every page inside it (sub-pages, database rows), as chosen
--    when moving a page into a teamspace. Needs full access to the page.

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
    -- "Everyone in the teamspace": members of the teamspace this page is in
    -- (direct, owners, or via an attached group) get the chosen role.
    ts_id := public.page_teamspace_id(p_id);
    if ts_id is not null
       and person in (select public.teamspace_effective_members(ts_id)) then
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
    if ts_id is not null
       and person in (select public.teamspace_effective_members(ts_id)) then
      best := public.greatest_role(best, 'view');
    end if;
  end if;

  return best;
end;
$function$
;

update public.pages
set general_access = 'private'
where general_access = 'teamspace'
  and public.page_teamspace_id(id) is null;

create or replace function public.set_page_general_access_tree(
  p_id text,
  p_access public.general_access,
  p_role public.page_role
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  caller text := (auth.uid())::text;
  changed integer;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if public.page_effective_role(p_id, caller) is distinct from 'full' then
    raise exception 'you need full access to change who can open this page'
      using errcode = '42501';
  end if;

  -- The page and everything under it: sub-pages, and the rows of databases
  -- whose page is in it (same walk as propagate_page_teamspace_id).
  with recursive
  edges(id, up) as (
    select id, parent_id from public.pages where parent_id is not null
    union all
    select r.id, ds.page_id
    from public.pages r
    join public.data_sources ds on ds.id = r.source_id
    where ds.page_id is not null
  ),
  sub(id) as (
    select p_id
    union
    select e.id from sub s join edges e on e.up = s.id
  )
  update public.pages
  set general_access = p_access,
      general_access_role = p_role
  where id in (select id from sub);

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.set_page_general_access_tree(text, public.general_access, public.page_role) from public, anon;
grant execute on function public.set_page_general_access_tree(text, public.general_access, public.page_role) to authenticated;

-- ── page_effective_role: scope "workspace" access to the page's workspace ──
-- The ga='workspace' override and the 'Shared' category baseline checked
-- that the person was an owner/member of ANY workspace — which every user is
-- (each owns their own). They now require membership in THIS page's
-- workspace: its current members, or its owner.

create or replace function public.page_effective_role(p_id text, person text)
returns public.page_role
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
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
  elsif ga = 'public' then
    best := public.greatest_role(best, ga_role);
  end if;

  -- 4. Category baseline (only adds).
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
$function$;

-- ── Collab server: same rules as the database ─────────────────────────────
-- The old "not in a teamspace → allow" branch let anyone with a page id open
-- its live document. Now: owner, teamspace membership, or any role from
-- page_effective_role (grants, workspace sharing, public).
create or replace function public.can_person_access_page(p_id text, person text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      pg.owner_id = person
      or (
        pg.teamspace_id is not null
        and public.is_teamspace_member_person(pg.teamspace_id, person)
      )
      or public.page_effective_role(pg.id, person) is not null
    from public.pages pg
    where pg.id = p_id
  ), false);
$$;
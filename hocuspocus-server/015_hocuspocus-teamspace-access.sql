-- ── One membership definition for RLS and the collab server ────────────────
-- is_teamspace_member(ts) (used by RLS) works off auth.uid(). The Hocuspocus
-- server calls with the service role, where auth.uid() is null, and passes the
-- person explicitly. Both now go through the same person-parameterized check,
-- so the editor and the database can't disagree about teamspace access.

create or replace function public.is_teamspace_member_person(ts_id text, person text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

-- RLS version delegates to the shared definition.
create or replace function public.is_teamspace_member(ts_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teamspace_member_person(ts_id, (auth.uid())::text);
$$;

-- Collab-server access check.
--   • Owner of the page → yes.
--   • Page under a teamspace (teamspace_id set) → yes if the person is a
--     member (owner / direct / via group). This replaces the parent_id walk.
--   • Page not under a teamspace → yes, unchanged from before (the
--     documented v1 private-page gap — see note below).
--   • Page doesn't exist → no.
create or replace function public.can_person_access_page(p_id text, person text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      pg.owner_id = person
      or (
        pg.teamspace_id is not null
        and public.is_teamspace_member_person(pg.teamspace_id, person)
      )
      or pg.teamspace_id is null
    from public.pages pg
    where pg.id = p_id
  ), false);
$$;

-- This RPC takes the person as a parameter, so any signed-in user could call
-- it through the public API to probe other people's access. Only the collab
-- server (service role) needs it.
revoke execute on function public.can_person_access_page(text, text) from public, anon, authenticated;
grant execute on function public.can_person_access_page(text, text) to service_role;

revoke execute on function public.is_teamspace_member_person(text, text) from public, anon, authenticated;
grant execute on function public.is_teamspace_member_person(text, text) to service_role;
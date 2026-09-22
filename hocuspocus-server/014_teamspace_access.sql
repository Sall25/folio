-- ── Teamspace membership as an access path ──────────────────────────────────
-- A person is a member of one workspace, but can be a member of teamspaces in
-- other people's workspaces. Being in a teamspace (directly, as an owner, or
-- through a group) grants read/write on every page under it, regardless of
-- which workspace hosts it.

-- 1. Is the caller in this teamspace? SECURITY DEFINER so it reads
--    teamspaces/groups without going through their RLS (avoids recursion
--    when pages/teamspaces policies call it).
create or replace function public.is_teamspace_member(ts_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teamspaces t
    where t.id = ts_id
      and (
        (auth.uid())::text = any (t.owner_ids)
        or (auth.uid())::text = any (t.member_ids)
        or exists (
          select 1 from public.groups g
          where g.id = any (t.group_ids)
            and (auth.uid())::text = any (g.member_ids)
        )
      )
  );
$$;

-- 2. Does teamspace membership grant access to a page in this workspace?
--    Yes if you're a member, EXCEPT for teamspaces in your OTHER owned
--    workspaces — those stay hidden until you switch into that workspace,
--    so your own workspaces don't bleed into each other.
create or replace function public.teamspace_grants_access(ts_id text, page_ws_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

-- Same check, keyed by a page id — used by the INSERT policy to ask
-- "does teamspace membership let me write under this parent?"
create or replace function public.teamspace_grants_access_to_page(pid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select public.teamspace_grants_access(p.teamspace_id, p.workspace_id)
     from public.pages p where p.id = pid),
    false
  );
$$;

-- 3. Pages inside a teamspace always belong to the teamspace's HOST
--    workspace, whoever creates them. A foreign member's client stamps its
--    own workspace_id; this overrides it. Replaces the step-1 function.
create or replace function public.set_page_teamspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- 4. New teamspaces: host workspace = the creator's current workspace, and
--    the creator is an owner. The client currently sends neither (the
--    column default was 'workspace_default', and owner_ids was empty).
create or replace function public.set_teamspace_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := (auth.uid())::text;
  caller_ws text;
begin
  if caller is null then
    return new;  -- SQL editor / service role: leave as provided
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

-- 5. Backfill existing teamspaces from their root page: host workspace =
--    root page's workspace; owner = root page's owner if owner_ids is empty.
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

-- 6. Page policies: add the teamspace path alongside the existing rules.
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

-- 7. Teamspace records: members can read the teamspaces they belong to.
--    Added as its own permissive policy — ORs with whatever exists today.
drop policy if exists "teamspaces_select_members" on public.teamspaces;
create policy "teamspaces_select_members"
on public.teamspaces
for select
to authenticated
using (public.is_teamspace_member(id));
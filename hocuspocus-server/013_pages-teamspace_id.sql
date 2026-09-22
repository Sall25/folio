-- ── pages.teamspace_id: which teamspace (if any) a page lives under ─────────
-- Denormalized so RLS can answer "is this page in a teamspace I'm a member
-- of?" with a lookup instead of walking parent_id up the tree per row.
--
-- A page belongs to a teamspace if:
--   • it IS the teamspace root page (page.id = teamspaces.id — the shared-id
--     pairing buildTeamspacePair creates), or
--   • its parent belongs to one (children inherit), or
--   • it's a database ROW whose database page belongs to one
--     (source_id → data_sources.page_id).
-- The server computes this in triggers, so a client can't set it wrong.

-- 1. Column + FK. If a teamspace is deleted, its pages fall back to
--    workspace-only access rather than blocking the delete.
alter table public.pages
  add column if not exists teamspace_id text
  references public.teamspaces(id) on delete set null;

create index if not exists pages_teamspace_id_idx
  on public.pages (teamspace_id);

-- 2. Backfill. Walk down from every teamspace root page, following both
--    edge types (parent_id children, and database rows via source_id), and
--    stamp each reached page with that root's teamspace id.
with recursive
edges(id, up) as (
  select id, parent_id from public.pages where parent_id is not null
  union all
  select r.id, ds.page_id
  from public.pages r
  join public.data_sources ds on ds.id = r.source_id
  where ds.page_id is not null
),
sub(id, ts) as (
  select p.id, p.id
  from public.pages p
  where p.id in (select id from public.teamspaces)
  union
  select e.id, s.ts
  from sub s
  join edges e on e.up = s.id
)
update public.pages p
set teamspace_id = sub.ts
from sub
where p.id = sub.id
  and p.teamspace_id is distinct from sub.ts;

-- 3. BEFORE insert / move: compute teamspace_id from the page's position.
--    Authoritative — overrides whatever the client sent.
create or replace function public.set_page_teamspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ts text;
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
    ts := new.id;  -- the teamspace root page itself
  end if;

  new.teamspace_id := ts;
  return new;
end;
$$;

drop trigger if exists trg_set_page_teamspace_id on public.pages;
create trigger trg_set_page_teamspace_id
  before insert or update of parent_id, source_id on public.pages
  for each row
  execute function public.set_page_teamspace_id();

-- 4. AFTER a move changed a page's teamspace: push the new value down its
--    whole subtree (children + database rows under it). The subtree update
--    only sets teamspace_id, so it doesn't re-fire either trigger.
create or replace function public.propagate_page_teamspace_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.teamspace_id is distinct from old.teamspace_id then
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
      select new.id
      union
      select e.id from sub s join edges e on e.up = s.id
    )
    update public.pages
    set teamspace_id = new.teamspace_id
    where id in (select id from sub where id <> new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_propagate_page_teamspace_id on public.pages;
create trigger trg_propagate_page_teamspace_id
  after update of parent_id, source_id on public.pages
  for each row
  execute function public.propagate_page_teamspace_id();
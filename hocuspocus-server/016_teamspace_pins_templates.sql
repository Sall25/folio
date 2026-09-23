-- ── Shared pins + teamspace-owned templates ─────────────────────────────────

-- 1. Pins live on the teamspace (shared: everyone sees the same list).
alter table public.teamspaces
  add column if not exists pinned_page_ids text[] not null default '{}';

-- Owners-only pin/unpin, atomic server-side (no client read-modify-write on
-- the array). Only pages that actually belong to the teamspace can be pinned.
create or replace function public.set_teamspace_pin(
  ts_id text,
  page_id text,
  pinned boolean
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
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

-- 2. Teamspace templates are ROOT pages (no parent), so the step-1 trigger
--    would compute teamspace_id = null for them. Allow a Template page to
--    keep the teamspace_id the client sent, but only if the caller is a
--    member of that teamspace. Everything else is unchanged from step 2.
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
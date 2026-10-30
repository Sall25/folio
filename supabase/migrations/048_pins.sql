-- Pins across pages: a block of one page shown in the rail on every page.
--   scope 'mine'      — only the person who pinned it sees it
--   scope 'teamspace' — every member of the teamspace sees it (step 3)
-- The block is found in the page's saved content by its id (UniqueID).
-- Access follows the source page: a pin to a page you can't read is hidden.

create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  person_id text not null default (auth.uid())::text,
  page_id text not null references public.pages (id) on delete cascade,
  block_id text not null,
  scope text not null default 'mine' check (scope in ('mine', 'teamspace')),
  teamspace_id text,
  position double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now(),
  check (scope <> 'teamspace' or teamspace_id is not null)
);

create unique index if not exists pins_unique_mine
  on public.pins (person_id, page_id, block_id)
  where scope = 'mine';
create unique index if not exists pins_unique_team
  on public.pins (teamspace_id, page_id, block_id)
  where scope = 'teamspace';
create index if not exists pins_person_idx on public.pins (person_id);
create index if not exists pins_teamspace_idx on public.pins (teamspace_id);

alter table public.pins enable row level security;

drop policy if exists pins_select on public.pins;
create policy pins_select on public.pins for select to authenticated
  using (
    public.can_read_page(page_id)
    and (
      (scope = 'mine' and person_id = (auth.uid())::text)
      or (scope = 'teamspace'
          and public.is_teamspace_member_person(teamspace_id, (auth.uid())::text))
    )
  );

drop policy if exists pins_insert on public.pins;
create policy pins_insert on public.pins for insert to authenticated
  with check (
    person_id = (auth.uid())::text
    and public.can_read_page(page_id)
    and (
      scope = 'mine'
      or public.is_teamspace_member_person(teamspace_id, (auth.uid())::text)
    )
  );

drop policy if exists pins_update on public.pins;
create policy pins_update on public.pins for update to authenticated
  using (person_id = (auth.uid())::text)
  with check (person_id = (auth.uid())::text);

-- Your own pins; a teamspace pin can be removed by any member.
drop policy if exists pins_delete on public.pins;
create policy pins_delete on public.pins for delete to authenticated
  using (
    person_id = (auth.uid())::text
    or (scope = 'teamspace'
        and public.is_teamspace_member_person(teamspace_id, (auth.uid())::text))
  );

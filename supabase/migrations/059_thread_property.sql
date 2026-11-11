-- Comments on a database cell: a page-level thread on the row's page,
-- tagged with the property it's about. The row page lists it with its other
-- comments ("on Status"); the table shows it on that cell.
alter table public.threads add column if not exists property_id text;

create index if not exists threads_page_property_idx
  on public.threads (page_id, property_id)
  where property_id is not null;

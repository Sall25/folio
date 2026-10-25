-- 046: a database made from a block has no page of its own until it's given
-- a title. Until then it's held by the page the block is on:
--
--   • data_sources.host_page_id — that page. Who can see and edit the
--     database follows it, and its rows are created under it;
--   • once titled, the database gets its page (data_sources.page_id) and
--     everything follows that page, as before.
--
-- Before this, a data source with no page was only readable through its rows,
-- so a new, empty one vanished on reload.
-- Idempotent.

alter table public.data_sources
  add column if not exists host_page_id text
    references public.pages(id) on delete cascade;

-- ── Write access: the database's page, else the page holding it, else its
--    rows (as before) ─────────────────────────────────────────────────────────
create or replace function public.can_write_data_source(p_source text, p_page text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case
    when p_page is not null then
      public.can_write_page(p_page)
      or public.teamspace_grants_access_to_page(p_page)
    else exists (
      select 1 from public.data_sources ds
      where ds.id = p_source
        and ds.host_page_id is not null
        and (public.can_write_page(ds.host_page_id)
             or public.teamspace_grants_access_to_page(ds.host_page_id))
    ) or exists (
      select 1 from public.pages r
      where r.source_id = p_source
        and (public.can_write_page(r.id)
             or public.teamspace_grants_access_to_page(r.id))
    )
  end;
$function$;

-- ── Read access: same order ──────────────────────────────────────────────────
drop policy if exists data_sources_select on public.data_sources;
create policy data_sources_select on public.data_sources
  as permissive for select to authenticated
  using (
    (page_id is not null and exists (
      select 1 from public.pages p where p.id = data_sources.page_id))
    or (page_id is null and (
      (host_page_id is not null and exists (
        select 1 from public.pages h where h.id = data_sources.host_page_id))
      or exists (
        select 1 from public.pages r where r.source_id = data_sources.id)))
  );
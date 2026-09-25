-- Ids of every page the caller can edit, in one call — for the sidebar's
-- per-row actions. Same rule as the pages UPDATE policy. SECURITY INVOKER
-- (default): pages RLS still applies, so only readable pages are considered.
create or replace function public.my_editable_page_ids()
returns setof text
language sql
stable
set search_path = public
as $$
  select p.id
  from public.pages p
  where p.deleted_at is null
    and (
      p.owner_id = (auth.uid())::text
      or public.can_write_page(p.id)
      or public.teamspace_grants_access(p.teamspace_id, p.workspace_id)
    );
$$;

grant execute on function public.my_editable_page_ids() to authenticated;
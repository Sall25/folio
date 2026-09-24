-- ── Collab access level for Hocuspocus ──────────────────────────────────────
-- Returns 'edit', 'view', or null (no access). The collab server connects
-- anything below 'edit' as read-only, so view/comment roles can't change
-- content through the live document.
create or replace function public.collab_page_access(p_id text, person text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (
    select case
      when person is null then null
      when pg.owner_id = person then 'edit'
      when pg.teamspace_id is not null
           and public.is_teamspace_member_person(pg.teamspace_id, person)
        then 'edit'
      when public.page_effective_role(pg.id, person) >= 'edit'::public.page_role
        then 'edit'
      when public.page_effective_role(pg.id, person) is not null
        then 'view'
      else null
    end
    from public.pages pg
    where pg.id = p_id
  );
$$;

-- Takes the person as a parameter — only the collab server may call it.
revoke execute on function public.collab_page_access(text, text) from public, anon, authenticated;
grant execute on function public.collab_page_access(text, text) to service_role;
-- Sub-pages follow their parent's sharing.
--
-- People and groups invited to a page already reach every page inside it
-- (page_effective_role walks up the parent chain, 051). General access
-- ("Everyone in the workspace", "Anyone with the link"…) lives on each page
-- row, so a new sub-page got its category's default instead, often
-- "Only people invited", and stayed closed to people who could open its
-- parent.
--
-- 1. A new page with a parent (or a new database row, whose parent is its
--    database's page) starts with the parent's general access and role.
-- 2. The share panel now changes general access with
--    set_page_general_access_tree (051), so a change on a page reaches the
--    pages inside it too.
-- Existing pages are left as they are.

create or replace function public.inherit_page_general_access()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  up text := new.parent_id;
  parent_access public.general_access;
  parent_role public.page_role;
begin
  if up is null and new.source_id is not null then
    select page_id into up from public.data_sources where id = new.source_id;
  end if;
  if up is null then
    return new;
  end if;

  select general_access, general_access_role
    into parent_access, parent_role
  from public.pages where id = up;

  if found and parent_access is not null then
    new.general_access := parent_access;
    new.general_access_role := coalesce(parent_role, new.general_access_role);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_inherit_page_general_access on public.pages;
create trigger trg_inherit_page_general_access
  before insert on public.pages
  for each row execute function public.inherit_page_general_access();

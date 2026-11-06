-- @all in a page: notifies everyone who can open the page.
--
-- The editor calls notify_page_mention_all once for an @all chip (after the
-- same short wait as a person mention, so the sentence around it goes along
-- as the message). The function:
--   - only works for someone who can edit the page (not view or comment);
--   - looks at everyone who could have access: the page's workspace members,
--     and people or groups shared on any page of that workspace (grants are
--     inherited from parent pages);
--   - keeps those page_effective_role says can open this page, minus the
--     caller;
--   - adds a "user-mention" notification for each, deduplicated per chip
--     ("all-mention:<node id>"), so opening the page again sends nothing.
-- Returns how many notifications were added.

create or replace function public.notify_page_mention_all(
  p_page_id text,
  p_node_id text,
  p_message text
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller text := (auth.uid())::text;
  caller_role public.page_role;
  author_name text;
  page_title text;
  ws text;
  person text;
  sent integer := 0;
begin
  if caller is null or p_node_id is null or p_node_id = '' then
    return 0;
  end if;
  caller_role := public.page_effective_role(p_page_id, caller);
  if caller_role is null or caller_role in ('view', 'comment') then
    return 0;
  end if;

  select nullif(title, ''), workspace_id into page_title, ws
  from public.pages where id = p_page_id;
  select name into author_name from public.people where id = caller;

  for person in
    select distinct p from (
      select wm.person_id as p
      from public.workspace_members wm
      where wm.workspace_id = ws
      union
      select pa.subject_id
      from public.page_access pa
      join public.pages pg on pg.id = pa.page_id
      where pg.workspace_id = ws and pa.subject_type = 'person'
      union
      select unnest(g.member_ids)
      from public.page_access pa
      join public.pages pg on pg.id = pa.page_id
      join public.groups g on g.id = pa.subject_id
      where pg.workspace_id = ws and pa.subject_type = 'group'
    ) candidates
  loop
    continue when person is null or person = caller;
    continue when public.page_effective_role(p_page_id, person) is null;

    insert into public.notifications
      (id, recipient_id, actor_id, type, title, message, read,
       source_page_id, source_page_title, target_node_id,
       mention_id, mention_label, dedup_key, created_at)
    values
      (gen_random_uuid()::text, person, caller, 'user-mention',
       coalesce(author_name, 'Someone') || ' mentioned everyone in '
         || coalesce(page_title, 'a page'),
       coalesce(
         nullif(left(p_message, 300), ''),
         'Everyone was mentioned in ' || coalesce(page_title, 'a page') || '.'
       ),
       false, p_page_id, page_title, p_node_id,
       'all', 'all', 'all-mention:' || p_node_id, public.now_ms())
    on conflict (recipient_id, dedup_key) where dedup_key is not null
    do nothing;

    if found then
      sent := sent + 1;
    end if;
  end loop;

  return sent;
end;
$function$;

revoke all on function public.notify_page_mention_all(text, text, text)
  from public, anon;
grant execute on function public.notify_page_mention_all(text, text, text)
  to authenticated;

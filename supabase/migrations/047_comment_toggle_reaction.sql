-- Toggle the signed-in person's reaction on a comment. Anyone who can
-- comment on the page may react (the update policy only lets authors edit
-- their own comments). Atomic: only this person's entry for this emoji
-- changes, so simultaneous reactions don't overwrite each other.
create or replace function public.toggle_comment_reaction(
  p_comment_id text,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := auth.uid()::text;
  page text;
  role public.page_role;
  current jsonb;
  people jsonb;
begin
  if me is null then
    raise exception 'not signed in';
  end if;

  select t.page_id into page
  from public.comments c
  join public.threads t on t.id = c.thread_id
  where c.id = p_comment_id;
  if page is null then
    raise exception 'comment not found';
  end if;

  role := public.page_effective_role(page, me);
  if role is null or role = 'view' then
    raise exception 'no permission to react';
  end if;

  select reactions into current
  from public.comments where id = p_comment_id
  for update;

  people := coalesce(current -> p_emoji, '[]'::jsonb);
  if people ? me then
    people := (select coalesce(jsonb_agg(x), '[]'::jsonb)
               from jsonb_array_elements_text(people) x where x <> me);
  else
    people := people || to_jsonb(me);
  end if;

  current := case
    when jsonb_array_length(people) = 0 then current - p_emoji
    else jsonb_set(current, array[p_emoji], people)
  end;

  update public.comments set reactions = current where id = p_comment_id;
  return current;
end;
$$;

revoke all on function public.toggle_comment_reaction(text, text) from public, anon;
grant execute on function public.toggle_comment_reaction(text, text) to authenticated;
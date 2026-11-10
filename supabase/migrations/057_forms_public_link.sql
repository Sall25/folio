-- Forms answered by link (056 follow-up).
--
-- A form's audience can now be "Anyone with the link" (audience.kind =
-- 'link'): people who aren't signed in can open and answer it. Their answer
-- is anonymous: the row is owned by the database page's owner, with
-- "Only people invited" sharing, and "one answer per person" can't apply to
-- them (signed-in people answering a link form still get it, and person
-- properties set to "Me" record them).
--
-- get_form tells a signed-out visitor of a form that isn't by link to sign
-- in (needsSignIn) instead of returning nothing, so the page can say so.
-- An anonymous answer is capped in size.

create or replace function public.form_audience_has(
  p_view jsonb,
  p_workspace_id text,
  p_person text
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  kind text := coalesce(p_view->'audience'->>'kind', 'workspace');
begin
  if kind = 'link' then
    return true;
  end if;
  if p_person is null then
    return false;
  end if;
  if not public.is_workspace_member_of(p_workspace_id, p_person)
     and not exists (
       select 1 from public.workspaces w
       where w.id = p_workspace_id and w.owner_id = p_person
     ) then
    return false;
  end if;
  if kind = 'groups' then
    return exists (
      select 1
      from public.groups g
      where g.id in (
          select jsonb_array_elements_text(
            coalesce(p_view->'audience'->'groupIds', '[]'::jsonb)
          )
        )
        and p_person = any (g.member_ids)
    );
  end if;
  return true;
end;
$function$;

create or replace function public.get_form(p_source_id text, p_view_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  me text := auth.uid()::text;
  v jsonb;
  ds public.data_sources%rowtype;
  db public.pages%rowtype;
  role public.page_role;
  in_audience boolean;
  answered boolean := false;
  props jsonb;
  by_link boolean;
begin
  v := public.form_view(p_source_id, p_view_id);
  if v is null then
    return null;
  end if;
  select * into ds from public.data_sources where id = p_source_id;
  select * into db from public.pages where id = ds.page_id;
  if not found then
    return null;
  end if;

  by_link := coalesce(v->'audience'->>'kind', 'workspace') = 'link';
  if me is null and not by_link then
    return jsonb_build_object('needsSignIn', true);
  end if;

  role := case when me is null then null
               else public.page_effective_role(db.id, me) end;
  in_audience := public.form_audience_has(v, db.workspace_id, me);
  if not in_audience and (role is null or role < 'edit') then
    return null;
  end if;

  if me is not null then
    answered := exists (
      select 1 from public.pages p
      where p.source_id = p_source_id
        and p.owner_id = me
        and p.deleted_at is null
        and p.settings->>'formViewId' = p_view_id
    );
  end if;

  select coalesce(jsonb_agg(p order by q.ord), '[]'::jsonb) into props
  from jsonb_array_elements(coalesce(v->'questions', '[]'::jsonb))
         with ordinality q(question, ord)
  join jsonb_array_elements(ds.properties) p
    on p->>'id' = q.question->>'propertyId';

  return jsonb_build_object(
    'databaseTitle', coalesce(nullif(db.title, ''), ds.name, ''),
    'databasePageId', db.id,
    'workspaceId', db.workspace_id,
    'view', jsonb_build_object(
      'id', v->'id',
      'formTitle', v->'formTitle',
      'formDescription', v->'formDescription',
      'questions', coalesce(v->'questions', '[]'::jsonb),
      'closesAt', v->'closesAt',
      'onePerPerson', coalesce(v->'onePerPerson', 'true'::jsonb)
    ),
    'properties', props,
    'closed', public.form_is_closed(v),
    'canAnswer', in_audience,
    'canEdit', role is not null and role >= 'edit',
    'answered', answered,
    'anonymous', me is null,
    'byLink', by_link
  );
end;
$function$;

create or replace function public.submit_form_response(
  p_source_id text,
  p_view_id text,
  p_values jsonb
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
  me text := auth.uid()::text;
  v jsonb;
  ds public.data_sources%rowtype;
  db public.pages%rowtype;
  me_person public.people%rowtype;
  q jsonb;
  prop jsonb;
  prop_type text;
  answer jsonb;
  shown boolean;
  vals jsonb := '{}'::jsonb;
  asked text[] := '{}';
  title_text text := '';
  row_id text := gen_random_uuid()::text;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  def jsonb;
  owner text;
begin
  v := public.form_view(p_source_id, p_view_id);
  if v is null then
    raise exception 'This form doesn''t exist anymore' using errcode = 'P0002';
  end if;
  select * into ds from public.data_sources where id = p_source_id;
  select * into db from public.pages where id = ds.page_id;
  if not found then
    raise exception 'This form doesn''t exist anymore' using errcode = 'P0002';
  end if;

  if me is null and coalesce(v->'audience'->>'kind', 'workspace') <> 'link' then
    raise exception 'Sign in to answer this form' using errcode = '42501';
  end if;
  if not public.form_audience_has(v, db.workspace_id, me) then
    raise exception 'You can''t answer this form' using errcode = '42501';
  end if;
  if public.form_is_closed(v) then
    raise exception 'This form is closed' using errcode = '22023';
  end if;
  if me is null and octet_length(coalesce(p_values, '{}'::jsonb)::text) > 100000 then
    raise exception 'This answer is too long' using errcode = '22001';
  end if;
  if me is not null and coalesce((v->>'onePerPerson')::boolean, true) and exists (
       select 1 from public.pages p
       where p.source_id = p_source_id
         and p.owner_id = me
         and p.deleted_at is null
         and p.settings->>'formViewId' = p_view_id
     ) then
    raise exception 'You already answered this form' using errcode = '23505';
  end if;

  if me is not null then
    select * into me_person from public.people where id = me;
  end if;

  for q in select * from jsonb_array_elements(coalesce(v->'questions', '[]'::jsonb))
  loop
    prop := null;
    select p into prop from jsonb_array_elements(ds.properties) p
    where p->>'id' = q->>'propertyId';
    if prop is null then
      continue;
    end if;
    prop_type := prop->'config'->>'type';
    if prop_type in ('person', 'relation', 'rollup', 'formula', 'created_time',
                     'created_by', 'edited_time', 'edited_by', 'unique_id') then
      continue;
    end if;

    shown := true;
    if q->'showIf' is not null and jsonb_typeof(q->'showIf') = 'object' then
      shown := (q->'showIf'->>'propertyId') = any (asked)
        and public.form_answer_matches(
          vals->(q->'showIf'->>'propertyId'),
          coalesce(q->'showIf'->'values', '[]'::jsonb)
        );
    end if;
    if not shown then
      continue;
    end if;

    answer := p_values->(prop->>'id');
    if coalesce((q->>'required')::boolean, false)
       and public.form_answer_empty(answer, prop_type) then
      raise exception 'Answer "%"', prop->>'name' using errcode = '23502';
    end if;
    if answer is not null and jsonb_typeof(answer) <> 'null' then
      vals := vals || jsonb_build_object(prop->>'id', answer);
      if prop_type = 'title' then
        title_text := coalesce(answer #>> '{}', '');
      end if;
    end if;
    asked := asked || (prop->>'id');
  end loop;

  for prop in select * from jsonb_array_elements(ds.properties)
  loop
    if vals ? (prop->>'id') then
      continue;
    end if;
    prop_type := prop->'config'->>'type';
    def := case prop_type
      when 'status' then (
        select to_jsonb(i->>'id')
        from jsonb_array_elements(coalesce(prop->'config'->'groups', '[]'::jsonb)) g,
             jsonb_array_elements(coalesce(g->'items', '[]'::jsonb)) i
        where coalesce((i->>'isDefault')::boolean, false)
        limit 1
      )
      when 'checkbox' then 'false'::jsonb
      when 'person' then case
        when prop->'config'->>'default' = 'me' and me_person.id is not null then
          jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            'id', me_person.id,
            'name', coalesce(nullif(me_person.name, ''), me_person.email),
            'avatarUrl', me_person.avatar_url
          )))
        else '[]'::jsonb
      end
      when 'multi_select' then '[]'::jsonb
      when 'relation' then '[]'::jsonb
      when 'files' then '[]'::jsonb
      when 'title' then '""'::jsonb
      when 'text' then '""'::jsonb
      when 'url' then '""'::jsonb
      when 'email' then '""'::jsonb
      when 'phone' then '""'::jsonb
      else null
    end;
    if def is not null then
      vals := vals || jsonb_build_object(prop->>'id', def);
    end if;
  end loop;

  -- An anonymous answer belongs to the database's owner.
  owner := coalesce(me, db.owner_id);

  insert into public.pages (
    id, title, content, parent_id, category, source_id, "values",
    created_at, updated_at, workspace_id, owner_id, settings
  ) values (
    row_id,
    title_text,
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        case when title_text = '' then jsonb_build_object('type', 'title', 'content', '[]'::jsonb)
        else jsonb_build_object('type', 'title', 'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', title_text)))
        end
      )
    ),
    db.id,
    'Private',
    p_source_id,
    vals,
    now_ms,
    now_ms,
    db.workspace_id,
    owner,
    jsonb_build_object(
      'width', 'medium', 'text', 'normal', 'locked', false,
      'formViewId', p_view_id,
      'formAnonymous', me is null
    )
  );

  update public.pages
  set general_access = 'private'
  where id = row_id;

  if db.owner_id is not null and db.owner_id is distinct from owner then
    insert into public.page_access (page_id, subject_type, subject_id, role)
    values (row_id, 'person', db.owner_id, 'full');
  end if;

  return row_id;
end;
$function$;

grant execute on function public.get_form(text, text) to anon;
grant execute on function public.submit_form_response(text, text, jsonb) to anon;

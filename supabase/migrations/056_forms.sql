-- Forms: a database view whose questions are the database's properties.
--
-- The form lives in the data source's saved views (data_sources.saved_views,
-- kept in sync by the database block), as a view of type 'form'. Answering
-- goes through submit_form_response, never a direct insert, so the server
-- decides:
--   - who can answer: the form's audience (the workspace, or some groups);
--   - whether it's still open (closed by hand, or past its closing time);
--   - one answer per person, when the form says so;
--   - required questions (those shown: "show only if" is applied);
--   - which properties the answer may set: the form's questions only. The
--     rest get their defaults (status's default item, unchecked boxes, the
--     respondent in person properties whose default is "Me").
--
-- Each answer is a row of the database, owned by the person who answered,
-- with its sharing set to "Only people invited": they see their own row
-- only. The database page's owner is invited to it (Full access), and anyone
-- invited to the database page reaches it through the parent chain as usual.
-- So students should be given the form, not the database.
--
-- get_form returns what the fill page needs: the form, its questions'
-- properties, and whether the caller can answer.

-- The form view of a data source, or null.
create or replace function public.form_view(p_source_id text, p_view_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select v
  from public.data_sources ds,
       jsonb_array_elements(coalesce(ds.saved_views, '[]'::jsonb)) v
  where ds.id = p_source_id
    and v->>'id' = p_view_id
    and v->>'type' = 'form'
  limit 1;
$function$;

-- Whether a person is in a form's audience.
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

-- Whether the form is closed now.
create or replace function public.form_is_closed(p_view jsonb)
returns boolean
language sql
immutable
as $function$
  select coalesce((p_view->>'closed')::boolean, false)
    or (
      p_view->>'closesAt' is not null
      and (p_view->>'closesAt')::bigint
          <= (extract(epoch from now()) * 1000)::bigint
    );
$function$;

-- Whether an answer leaves a question "empty".
create or replace function public.form_answer_empty(p_value jsonb, p_type text)
returns boolean
language sql
immutable
as $function$
  select p_value is null
    or jsonb_typeof(p_value) = 'null'
    or (jsonb_typeof(p_value) = 'string' and btrim(p_value #>> '{}') = '')
    or (jsonb_typeof(p_value) = 'array' and jsonb_array_length(p_value) = 0)
    or (p_type = 'checkbox' and p_value = 'false'::jsonb);
$function$;

-- Whether an answer matches a "show only if" list (option ids, status item
-- ids, or "true" / "false" for a checkbox).
create or replace function public.form_answer_matches(p_value jsonb, p_values jsonb)
returns boolean
language sql
immutable
as $function$
  select case
    when p_value is null or jsonb_typeof(p_value) = 'null' then false
    when jsonb_typeof(p_value) = 'object' then
      p_values ? (p_value->>'id')
    when jsonb_typeof(p_value) = 'array' then exists (
      select 1 from jsonb_array_elements(p_value) e
      where p_values ? (e->>'id')
    )
    when jsonb_typeof(p_value) = 'boolean' then
      p_values ? (p_value #>> '{}')
    else p_values ? (p_value #>> '{}')
  end;
$function$;

-- What the fill page shows.
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

  role := public.page_effective_role(db.id, me);
  in_audience := public.form_audience_has(v, db.workspace_id, me);
  -- Someone who can't answer and can't edit the database gets nothing.
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

  -- The questions' properties, in the form's order.
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
    'answered', answered
  );
end;
$function$;

-- Answer a form: creates the row and returns its id.
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
begin
  if me is null then
    raise exception 'Sign in to answer this form' using errcode = '42501';
  end if;

  v := public.form_view(p_source_id, p_view_id);
  if v is null then
    raise exception 'This form doesn''t exist anymore' using errcode = 'P0002';
  end if;
  select * into ds from public.data_sources where id = p_source_id;
  select * into db from public.pages where id = ds.page_id;
  if not found then
    raise exception 'This form doesn''t exist anymore' using errcode = 'P0002';
  end if;

  if not public.form_audience_has(v, db.workspace_id, me) then
    raise exception 'You can''t answer this form' using errcode = '42501';
  end if;
  if public.form_is_closed(v) then
    raise exception 'This form is closed' using errcode = '22023';
  end if;
  if coalesce((v->>'onePerPerson')::boolean, true) and exists (
       select 1 from public.pages p
       where p.source_id = p_source_id
         and p.owner_id = me
         and p.deleted_at is null
         and p.settings->>'formViewId' = p_view_id
     ) then
    raise exception 'You already answered this form' using errcode = '23505';
  end if;

  select * into me_person from public.people where id = me;

  -- The answers: the form's questions only, in its order. A question hidden
  -- by its "show only if" is dropped (and isn't required).
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

  -- Defaults for everything the form didn't ask.
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
    me,
    jsonb_build_object(
      'width', 'medium', 'text', 'normal', 'locked', false,
      'formViewId', p_view_id
    )
  );

  -- Their own row only (the insert copied the database's sharing).
  update public.pages
  set general_access = 'private'
  where id = row_id;

  -- The database's owner sees every answer.
  if db.owner_id is not null and db.owner_id <> me then
    insert into public.page_access (page_id, subject_type, subject_id, role)
    values (row_id, 'person', db.owner_id, 'full');
  end if;

  return row_id;
end;
$function$;

revoke all on function public.form_view(text, text) from public, anon, authenticated;
revoke all on function public.form_audience_has(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.get_form(text, text) from public, anon;
revoke all on function public.submit_form_response(text, text, jsonb) from public, anon;
grant execute on function public.get_form(text, text) to authenticated;
grant execute on function public.submit_form_response(text, text, jsonb) to authenticated;

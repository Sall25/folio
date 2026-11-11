-- Question blocks: a question inside a page (/question), answered by the
-- people who can read the page.
--
-- The question itself (prompt, choices, the right answer, an explanation)
-- lives in the page's document. Answers live here, one per person per block,
-- and go through these functions only (no table policies):
--   answer_question       — save or change your answer (you can read the page)
--   my_question_answers   — your answers on a page, by block
--   question_answers_for  — every answer to a block, with who gave it, for
--                           people who can edit the page

create table if not exists public.question_answers (
  page_id text not null references public.pages(id) on delete cascade,
  block_id text not null,
  person_id text not null,
  answer jsonb not null,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (page_id, block_id, person_id)
);

alter table public.question_answers enable row level security;
revoke all on public.question_answers from anon, authenticated;

create or replace function public.answer_question(
  p_page_id text,
  p_block_id text,
  p_answer jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
  me text := auth.uid()::text;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if me is null then
    raise exception 'Sign in to answer' using errcode = '42501';
  end if;
  if public.page_effective_role(p_page_id, me) is null then
    raise exception 'You can''t answer this question' using errcode = '42501';
  end if;
  if octet_length(coalesce(p_answer, 'null'::jsonb)::text) > 20000 then
    raise exception 'This answer is too long' using errcode = '22001';
  end if;
  if p_block_id is null or length(p_block_id) > 100 then
    raise exception 'Unknown question' using errcode = '22023';
  end if;

  insert into public.question_answers
    (page_id, block_id, person_id, answer, created_at, updated_at)
  values (p_page_id, p_block_id, me, p_answer, now_ms, now_ms)
  on conflict (page_id, block_id, person_id)
  do update set answer = excluded.answer, updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.my_question_answers(p_page_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_object_agg(block_id, answer), '{}'::jsonb)
  from public.question_answers
  where page_id = p_page_id
    and person_id = auth.uid()::text;
$function$;

create or replace function public.question_answers_for(
  p_page_id text,
  p_block_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  me text := auth.uid()::text;
  role public.page_role;
begin
  if me is null then
    return null;
  end if;
  role := public.page_effective_role(p_page_id, me);
  if role is null or role < 'edit' then
    return null;
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'personId', qa.person_id,
      'name', coalesce(nullif(p.name, ''), p.email, ''),
      'avatarUrl', p.avatar_url,
      'answer', qa.answer,
      'updatedAt', qa.updated_at
    ) order by qa.updated_at desc), '[]'::jsonb)
    from public.question_answers qa
    left join public.people p on p.id = qa.person_id
    where qa.page_id = p_page_id
      and qa.block_id = p_block_id
  );
end;
$function$;

revoke all on function public.answer_question(text, text, jsonb) from public, anon;
revoke all on function public.my_question_answers(text) from public, anon;
revoke all on function public.question_answers_for(text, text) from public, anon;
grant execute on function public.answer_question(text, text, jsonb) to authenticated;
grant execute on function public.my_question_answers(text) to authenticated;
grant execute on function public.question_answers_for(text, text) to authenticated;

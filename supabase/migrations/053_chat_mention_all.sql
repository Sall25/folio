-- @all in chat: "@[all]" in a message body mentions everyone in the room.
--
-- 1. chat_mention_excerpt shows it as "@all" in the notification preview.
-- 2. chat_notify_mentions also notifies every member of the room when the
--    body holds @[all] (not the author, and only people who can see the
--    room, as for a single mention). Someone named directly keeps the
--    "mentioned you" title; the others get "mentioned everyone". The dedup
--    key is the same, so nobody gets two notifications for one message.
-- 3. chat_unread_mentions counts @all messages in the room's mention badge.
-- Everything else in these functions is unchanged from 000_baseline.

create or replace function public.chat_mention_excerpt(p_body text)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  result text := p_body;
  m text[];
begin
  for m in select regexp_matches(p_body, '@\[person:([^\]]+)\]', 'g') loop
    result := replace(
      result,
      '@[person:' || m[1] || ']',
      '@' || coalesce((select name from public.people where id = m[1]), 'someone')
    );
  end loop;
  result := replace(result, '@[all]', '@all');
  result := regexp_replace(result, '@\[page:[^\]]+\]', 'a page', 'g');
  return left(result, 160);
end;
$function$;

create or replace function public.chat_notify_mentions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  person text;
  author_name text;
  room public.chat_rooms;
  page_title text;
  where_text text;
  note_title text;
  excerpt text;
  has_all boolean;
begin
  has_all := position('@[all]' in new.body) > 0;
  if new.deleted_at is not null
     or (position('@[person:' in new.body) = 0 and not has_all) then
    return new;
  end if;

  select * into room from public.chat_rooms where id = new.room_id;
  select name into author_name from public.people where id = new.author_id;
  excerpt := public.chat_mention_excerpt(new.body);

  if room.kind = 'page' then
    select nullif(title, '') into page_title from public.pages where id = room.page_id;
  end if;

  where_text := case
    when room.kind = 'dm' then ' in a direct message'
    when room.kind = 'page' then
      ' in the discussion on "' || coalesce(page_title, 'a page') || '"'
    else ' in #' || coalesce(room.name, 'a room')
  end;

  for person in
    select distinct p from (
      select (regexp_matches(new.body, '@\[person:([^\]]+)\]', 'g'))[1] as p
      union
      select m.person_id from public.chat_members m
      where has_all and m.room_id = new.room_id
    ) recipients
  loop
    continue when person is null or person = new.author_id;
    continue when not public.can_see_chat_room(new.room_id, person);

    note_title := coalesce(author_name, 'Someone') || case
      when position('@[person:' || person || ']' in new.body) > 0
        then ' mentioned you'
      else ' mentioned everyone'
    end || where_text;

    insert into public.notifications
      (id, recipient_id, actor_id, type, title, message, read,
       source_room_id, source_page_id, source_page_title,
       target_node_id, dedup_key, created_at)
    select
      gen_random_uuid()::text, person, new.author_id, 'chat-mention',
      note_title, excerpt, false,
      new.room_id,
      case when room.kind = 'page' then room.page_id end,
      case when room.kind = 'page' then page_title end,
      new.id, 'chat:' || new.id || ':' || person, public.now_ms()
    where not exists (
      select 1 from public.notifications
      where dedup_key = 'chat:' || new.id || ':' || person
    );
  end loop;

  return new;
end;
$function$;

create or replace function public.chat_unread_mentions()
returns table(room_id text, mentions integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select m.room_id, count(msg.id)::integer
  from public.chat_members m
  join public.chat_messages msg
    on msg.room_id = m.room_id
   and msg.created_at > m.last_read_at
   and msg.deleted_at is null
   and msg.author_id is distinct from m.person_id
   and (
     position('@[person:' || m.person_id || ']' in msg.body) > 0
     or position('@[all]' in msg.body) > 0
   )
  where m.person_id = (auth.uid())::text
  group by m.room_id;
$function$;

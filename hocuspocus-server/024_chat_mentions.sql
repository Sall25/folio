-- ── Chat mentions: server-side notifications + unread mention counts ───────

-- Which room a chat notification points to (source_page_id is for pages).
alter table public.notifications
  add column if not exists source_room_id text;

-- Readable excerpt of a message for the notification text. Person tokens
-- become @Name; page tokens become "a page" — never the title, since the
-- recipient may not have access to that page.
create or replace function public.chat_mention_excerpt(p_body text)
returns text language plpgsql stable security definer set search_path = public as $$
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
  result := regexp_replace(result, '@\[page:[^\]]+\]', 'a page', 'g');
  return left(result, 160);
end;
$$;

-- On every new message: notify each mentioned person who can see the room
-- (not the author). dedup_key keeps retries from double-notifying.
create or replace function public.chat_notify_mentions()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  person text;
  author_name text;
  room public.chat_rooms;
  note_title text;
  excerpt text;
begin
  if new.deleted_at is not null or position('@[person:' in new.body) = 0 then
    return new;
  end if;

  select * into room from public.chat_rooms where id = new.room_id;
  select name into author_name from public.people where id = new.author_id;
  excerpt := public.chat_mention_excerpt(new.body);
  note_title := coalesce(author_name, 'Someone') || case
    when room.kind = 'dm' then ' mentioned you in a direct message'
    else ' mentioned you in #' || coalesce(room.name, 'a room')
  end;

  for person in
    select distinct (regexp_matches(new.body, '@\[person:([^\]]+)\]', 'g'))[1]
  loop
    continue when person = new.author_id;
    continue when not public.can_see_chat_room(new.room_id, person);

    insert into public.notifications
      (id, recipient_id, actor_id, type, title, message, read,
       source_room_id, target_node_id, dedup_key, created_at)
    select
      gen_random_uuid()::text, person, new.author_id, 'chat-mention',
      note_title, excerpt, false,
      new.room_id, new.id, 'chat:' || new.id || ':' || person, public.now_ms()
    where not exists (
      select 1 from public.notifications
      where dedup_key = 'chat:' || new.id || ':' || person
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_chat_notify_mentions on public.chat_messages;
create trigger trg_chat_notify_mentions
  after insert on public.chat_messages
  for each row execute function public.chat_notify_mentions();

-- Unread messages that mention YOU, per room (for the @ badge).
create or replace function public.chat_unread_mentions()
returns table (room_id text, mentions integer)
language sql stable security definer set search_path = public as $$
  select m.room_id, count(msg.id)::integer
  from public.chat_members m
  join public.chat_messages msg
    on msg.room_id = m.room_id
   and msg.created_at > m.last_read_at
   and msg.deleted_at is null
   and msg.author_id is distinct from m.person_id
   and position('@[person:' || m.person_id || ']' in msg.body) > 0
  where m.person_id = (auth.uid())::text
  group by m.room_id;
$$;

grant execute on function public.chat_unread_mentions() to authenticated;
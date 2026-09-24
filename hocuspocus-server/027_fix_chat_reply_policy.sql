-- Fix: in the reply check, the bare `reply_to_id` inside the subquery bound
-- to the subquery's own row (r.reply_to_id), so every reply was rejected.
-- Qualify it as the NEW row's column.
drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = (auth.uid())::text
    and deleted_at is null
    and public.is_chat_member(room_id, (auth.uid())::text)
    and public.chat_room_postable(room_id, (auth.uid())::text)
    and (
      chat_messages.reply_to_id is null
      or exists (
        select 1 from public.chat_messages r
        where r.id = chat_messages.reply_to_id
          and r.room_id = chat_messages.room_id
      )
    )
  );
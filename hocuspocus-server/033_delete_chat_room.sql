-- ── Delete a room ───────────────────────────────────────────────────────────
-- Room owners only, and only kind 'room' (DMs and page discussions aren't
-- deletable this way). Everything hanging off the room — members, messages,
-- reactions, attachments rows, block/row refs, study sessions — goes with it
-- through its ON DELETE CASCADE foreign keys. A showcase's database page is
-- NOT touched: chat_rooms.showcase_page_id points at the page, not the
-- other way round.
--
-- Storage files are removed by the client before calling this (the bucket's
-- policies check membership, which disappears with the room).
create or replace function public.delete_chat_room(p_room text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text := (auth.uid())::text;
begin
  if caller is null or not exists (
    select 1
    from public.chat_members m
    join public.chat_rooms r on r.id = m.room_id
    where m.room_id = p_room
      and m.person_id = caller
      and m.role = 'owner'
      and r.kind = 'room'
  ) then
    raise exception 'only the room owner can delete this room'
      using errcode = '42501';
  end if;

  delete from public.chat_rooms where id = p_room;
end;
$$;

revoke all on function public.delete_chat_room(text) from public;
grant execute on function public.delete_chat_room(text) to authenticated;
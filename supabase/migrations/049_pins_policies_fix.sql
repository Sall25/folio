-- 048 used is_teamspace_member_person(), which only the service role may
-- execute: every pins request failed with "permission denied". Use
-- is_teamspace_member(ts_id), which checks the signed-in person and is
-- granted to authenticated.

drop policy if exists pins_select on public.pins;
create policy pins_select on public.pins for select to authenticated
  using (
    public.can_read_page(page_id)
    and (
      (scope = 'mine' and person_id = (auth.uid())::text)
      or (scope = 'teamspace' and public.is_teamspace_member(teamspace_id))
    )
  );

drop policy if exists pins_insert on public.pins;
create policy pins_insert on public.pins for insert to authenticated
  with check (
    person_id = (auth.uid())::text
    and public.can_read_page(page_id)
    and (scope = 'mine' or public.is_teamspace_member(teamspace_id))
  );

drop policy if exists pins_delete on public.pins;
create policy pins_delete on public.pins for delete to authenticated
  using (
    person_id = (auth.uid())::text
    or (scope = 'teamspace' and public.is_teamspace_member(teamspace_id))
  );
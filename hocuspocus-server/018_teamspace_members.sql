-- ── Teamspace membership: invitations + owner-only membership RPCs ──────────
-- Membership changes go through RPCs that check the caller, instead of
-- clients patching teamspaces.member_ids / owner_ids directly.

create or replace function public.is_teamspace_owner_person(ts_id text, person text)
returns boolean language sql stable security definer set search_path = public as $$
  select person is not null and exists (
    select 1 from public.teamspaces
    where id = ts_id and person = any (owner_ids)
  );
$$;

-- ── Invitations ───────────────────────────────────────────────────────────
-- Addressed by EMAIL, so they work across workspaces and before the invitee
-- has an account. The teamspace's name/icon and the inviter's name are
-- snapshotted: the invitee can't read the teamspace until they accept.
create table if not exists public.teamspace_invites (
  id             text primary key default gen_random_uuid()::text,
  teamspace_id   text not null references public.teamspaces(id) on delete cascade,
  email          text not null,
  invited_by     text references public.people(id) on delete set null,
  inviter_name   text,
  teamspace_name text,
  icon_name      text,
  icon_target    text,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined')),
  created_at     bigint not null default public.now_ms(),
  responded_at   bigint
);

-- One pending invite per teamspace + email.
create unique index if not exists teamspace_invites_pending_uniq
  on public.teamspace_invites (teamspace_id, email)
  where status = 'pending';

create index if not exists teamspace_invites_email_idx
  on public.teamspace_invites (email);

alter table public.teamspace_invites enable row level security;

-- The invitee (by their signed-in email) and the teamspace's owners can see
-- an invite. All writes go through the RPCs below.
drop policy if exists "teamspace_invites_select" on public.teamspace_invites;
create policy "teamspace_invites_select" on public.teamspace_invites
  for select to authenticated
  using (
    lower(email) = lower(auth.jwt() ->> 'email')
    or public.is_teamspace_owner_person(teamspace_id, (auth.uid())::text)
  );

-- Owners invite by email. Always succeeds silently (no "no such account"
-- error), so it can't be used to discover who has a Folio account.
create or replace function public.invite_to_teamspace(p_ts text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  em text := lower(trim(p_email));
  ts public.teamspaces;
begin
  if not public.is_teamspace_owner_person(p_ts, caller) then
    raise exception 'only teamspace owners can invite' using errcode = '42501';
  end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  select * into ts from public.teamspaces where id = p_ts;

  -- Already in the teamspace → nothing to do.
  if exists (
    select 1 from public.people p
    where lower(p.email) = em
      and (p.id = any (ts.member_ids) or p.id = any (ts.owner_ids))
  ) then
    return;
  end if;

  insert into public.teamspace_invites
    (teamspace_id, email, invited_by, inviter_name, teamspace_name, icon_name, icon_target)
  values (
    p_ts,
    em,
    caller,
    (select name from public.people where id = caller),
    (select title from public.pages where id = p_ts),
    (select cover ->> 'iconName' from public.pages where id = p_ts),
    (select cover ->> 'target' from public.pages where id = p_ts)
  )
  on conflict do nothing;
end;
$$;

create or replace function public.accept_teamspace_invite(p_invite text)
returns text language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  me_email text := lower(auth.jwt() ->> 'email');
  inv public.teamspace_invites;
begin
  select * into inv from public.teamspace_invites where id = p_invite for update;
  if inv.id is null or inv.status <> 'pending' or lower(inv.email) <> me_email then
    raise exception 'invitation not found' using errcode = '42501';
  end if;

  update public.teamspaces
  set member_ids = case
    when caller = any (member_ids) then member_ids
    else array_append(member_ids, caller)
  end
  where id = inv.teamspace_id;

  update public.teamspace_invites
  set status = 'accepted', responded_at = public.now_ms()
  where id = p_invite;

  return inv.teamspace_id;
end;
$$;

create or replace function public.decline_teamspace_invite(p_invite text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me_email text := lower(auth.jwt() ->> 'email');
begin
  update public.teamspace_invites
  set status = 'declined', responded_at = public.now_ms()
  where id = p_invite
    and status = 'pending'
    and lower(email) = me_email;
end;
$$;

create or replace function public.revoke_teamspace_invite(p_invite text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
begin
  delete from public.teamspace_invites i
  where i.id = p_invite
    and i.status = 'pending'
    and public.is_teamspace_owner_person(i.teamspace_id, caller);
end;
$$;

-- ── Direct membership (owners) ────────────────────────────────────────────

-- Add someone from the teamspace's HOST workspace directly. People from other
-- workspaces are invited by email instead.
create or replace function public.add_teamspace_member(p_ts text, p_person text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  host_ws text;
begin
  if not public.is_teamspace_owner_person(p_ts, caller) then
    raise exception 'only teamspace owners can add members' using errcode = '42501';
  end if;

  select workspace_id into host_ws from public.teamspaces where id = p_ts;
  if (select workspace_id from public.people where id = p_person)
       is distinct from host_ws then
    raise exception 'this person is not in the workspace; invite them by email'
      using errcode = '22023';
  end if;

  update public.teamspaces
  set member_ids = case
    when p_person = any (member_ids) then member_ids
    else array_append(member_ids, p_person)
  end
  where id = p_ts;
end;
$$;

-- Owners remove anyone; anyone can remove themselves (leave). The last owner
-- can't leave or be removed. Leaving also drops their chat memberships in
-- this teamspace's rooms (private rooms would otherwise stay visible).
create or replace function public.remove_teamspace_member(p_ts text, p_person text)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  ts public.teamspaces;
begin
  select * into ts from public.teamspaces where id = p_ts;
  if ts.id is null then
    raise exception 'teamspace not found' using errcode = '22023';
  end if;
  if caller <> p_person and not (caller = any (ts.owner_ids)) then
    raise exception 'only teamspace owners can remove members' using errcode = '42501';
  end if;
  if p_person = any (ts.owner_ids) and coalesce(array_length(ts.owner_ids, 1), 0) <= 1 then
    raise exception 'a teamspace needs at least one owner' using errcode = '22023';
  end if;

  update public.teamspaces
  set member_ids = array_remove(member_ids, p_person),
      owner_ids  = array_remove(owner_ids, p_person)
  where id = p_ts;

  delete from public.chat_members
  where person_id = p_person
    and room_id in (select id from public.chat_rooms where teamspace_id = p_ts);
end;
$$;

create or replace function public.set_teamspace_owner(p_ts text, p_person text, p_owner boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller text := (auth.uid())::text;
  ts public.teamspaces;
begin
  select * into ts from public.teamspaces where id = p_ts;
  if not (caller = any (ts.owner_ids)) then
    raise exception 'only teamspace owners can change roles' using errcode = '42501';
  end if;
  if not (p_person = any (ts.member_ids) or p_person = any (ts.owner_ids)) then
    raise exception 'not a member of this teamspace' using errcode = '22023';
  end if;

  if p_owner then
    update public.teamspaces
    set owner_ids = case
          when p_person = any (owner_ids) then owner_ids
          else array_append(owner_ids, p_person)
        end,
        member_ids = case
          when p_person = any (member_ids) then member_ids
          else array_append(member_ids, p_person)
        end
    where id = p_ts;
  else
    if coalesce(array_length(ts.owner_ids, 1), 0) <= 1 and p_person = any (ts.owner_ids) then
      raise exception 'a teamspace needs at least one owner' using errcode = '22023';
    end if;
    update public.teamspaces
    set owner_ids = array_remove(owner_ids, p_person),
        member_ids = case
          when p_person = any (member_ids) then member_ids
          else array_append(member_ids, p_person)
        end
    where id = p_ts;
  end if;
end;
$$;

grant execute on function public.invite_to_teamspace(text, text) to authenticated;
grant execute on function public.accept_teamspace_invite(text) to authenticated;
grant execute on function public.decline_teamspace_invite(text) to authenticated;
grant execute on function public.revoke_teamspace_invite(text) to authenticated;
grant execute on function public.add_teamspace_member(text, text) to authenticated;
grant execute on function public.remove_teamspace_member(text, text) to authenticated;
grant execute on function public.set_teamspace_owner(text, text, boolean) to authenticated;
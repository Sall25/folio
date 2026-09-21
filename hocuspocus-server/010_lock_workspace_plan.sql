-- ── Lock down who can change workspaces.plan ────────────────────────────────
-- A plain column an end user can PATCH means a free user can self-upgrade to
-- 'pro' for nothing, bypassing every limit at once. RLS can't easily gate a
-- SINGLE column, so a BEFORE UPDATE trigger does it: reject any change to
-- `plan` unless the caller is the service role (your server / a future Stripe
-- webhook) or a Postgres superuser. All OTHER column updates (name, icon,
-- settings) pass through untouched.

create or replace function public.enforce_workspace_plan_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only care when `plan` is actually being changed.
  if new.plan is distinct from old.plan then
    -- auth.role() is 'service_role' for server-side calls made with the
    -- service key, and 'authenticated'/'anon' for normal client calls.
    -- current_user is 'postgres'/superuser for direct SQL-editor edits.
    -- Allow the change only from those privileged contexts.
    if coalesce(auth.role(), '') <> 'service_role'
       and current_user not in ('postgres', 'supabase_admin') then
      raise exception
        'plan can only be changed by the server (attempted % -> %)',
        old.plan, new.plan
        using errcode = '42501'; -- insufficient_privilege
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_workspace_plan_immutable on public.workspaces;

create trigger trg_workspace_plan_immutable
  before update on public.workspaces
  for each row
  execute function public.enforce_workspace_plan_immutable();
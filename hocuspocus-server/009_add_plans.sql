-- ── Plans foundation ────────────────────────────────────────────────────────
-- Two tiers to start: 'free' and 'pro'. A workspace's plan is just a word on
-- the row; who SETS that word (you by hand now, Stripe later) is irrelevant to
-- every limit check that reads it.

-- 1. The plan enum. Guarded so re-running is safe.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_plan') then
    create type workspace_plan as enum ('free', 'pro');
  end if;
end $$;

-- 2. plan column on workspaces. Defaults to 'free' — every existing workspace
--    and every new signup starts free until explicitly upgraded.
alter table public.workspaces
  add column if not exists plan workspace_plan not null default 'free';

-- 3. plan_limits — ONE editable row per tier, so tweaking "free = 20 members"
--    to "free = 25 members" is a single UPDATE, not five triggers rewritten.
--    A limit of NULL means "unlimited" (used by pro).
create table if not exists public.plan_limits (
  plan               workspace_plan primary key,
  max_members        integer,          -- null = unlimited
  max_teamspaces     integer,
  max_workspaces     integer,          -- per owner
  version_history    boolean not null default false
);

-- 4. Seed the two tiers. on conflict → update, so re-running this migration
--    (or editing the numbers and re-applying) keeps the rows correct instead
--    of erroring on the primary key.
insert into public.plan_limits (plan, max_members, max_teamspaces, max_workspaces, version_history)
values
  ('free', 20,   2,    4,    false),
  ('pro',  null, null, null, true)
on conflict (plan) do update set
  max_members     = excluded.max_members,
  max_teamspaces  = excluded.max_teamspaces,
  max_workspaces  = excluded.max_workspaces,
  version_history = excluded.version_history;

-- 5. RLS: everyone signed in can READ plan_limits (the UI needs it to show
--    limits/upgrade prompts). Nobody can write it via the API — you edit it
--    directly in SQL, or a future admin path with the service role.
alter table public.plan_limits enable row level security;

drop policy if exists "plan_limits readable by authenticated" on public.plan_limits;
create policy "plan_limits readable by authenticated"
  on public.plan_limits for select
  to authenticated
  using (true);
-- ── Workspace ownership: a person can own/create multiple workspaces ────────
-- A person still has exactly one people row (they're a MEMBER of one workspace
-- at a time — multi-person collaboration is teamspaces, not multi-membership).
-- Ownership of multiple workspaces lives on workspaces.owner_id, not on people.

-- 1. owner_id → people.id. Nullable for now so existing rows don't break; we
--    backfill next, then it's effectively always set going forward.
alter table public.workspaces
  add column if not exists owner_id text references public.people(id);

-- 2. Backfill: each existing workspace's owner is whoever is its 'owner' in
--    people. (Pre-existing single-workspace signups each have exactly one
--    owner, so this is unambiguous.)
update public.workspaces w
set owner_id = p.id
from public.people p
where p.workspace_id = w.id
  and p.role = 'owner'
  and w.owner_id is null;
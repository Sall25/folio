-- Soft-delete (trash) for pages. Instead of DELETEing, set deleted_at; the tree
-- filters deleted_at is null. Trash shows deleted_at is not null. Restore clears
-- it; permanent delete does a real DELETE. Cascades are handled app-side (the
-- subtree is trashed/restored together) so restore can bring a subtree back.

alter table public.pages
  add column if not exists deleted_at bigint;  -- epoch millis, null = active

-- Index for the two common queries: active pages (null) and trash (not null).
create index if not exists pages_deleted_at_idx
  on public.pages (deleted_at);
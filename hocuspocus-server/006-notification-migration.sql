-- Notifications: recipient-targeted, persisted, cross-user.
-- A mention/backlink/date event creates a row for the RECIPIENT; each user
-- reads only their own. All ids TEXT, timestamps bigint epoch-millis, idempotent.

create table if not exists public.notifications (
  id            text primary key,
  recipient_id  text not null references public.people (id) on delete cascade,
  actor_id      text references public.people (id) on delete set null,
  type          text not null,               -- user-mention | date-due | date-overdue | backlink | comment-mention
  title         text not null,
  message       text not null,
  read          boolean not null default false,
  -- source context for navigation
  source_page_id   text references public.pages (id) on delete cascade,
  source_page_title text,
  target_node_id   text,                      -- node/mention id to scroll to
  -- optional mention extras
  mention_id    text,
  mention_label text,
  -- dedup key so the same event doesn't insert twice (e.g. re-render)
  dedup_key     text,
  created_at    bigint not null
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- Dedup: one row per (recipient, dedup_key). Lets inserts be idempotent when a
-- mention re-renders or a date re-evaluates.
create unique index if not exists notifications_dedup_idx
  on public.notifications (recipient_id, dedup_key)
  where dedup_key is not null;

alter table public.notifications enable row level security;

-- You can only see YOUR notifications.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (recipient_id = (auth.uid())::text);

-- Anyone authenticated can create a notification FOR someone (you mention them).
-- The recipient must be a real person; the actor is the current user.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (
    (auth.uid())::text is not null
    and exists (select 1 from public.people p where p.id = recipient_id)
  );

-- You can update (mark read) / delete (dismiss) only your own.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (recipient_id = (auth.uid())::text);

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete using (recipient_id = (auth.uid())::text);
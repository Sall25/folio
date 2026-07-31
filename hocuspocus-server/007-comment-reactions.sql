-- Reactions on comments: a jsonb map of emoji → array of person ids who reacted.
-- e.g. { "👍": ["p1","p2"], "❤️": ["p3"] }. No new table; loads with the comment.

alter table public.comments
  add column if not exists reactions jsonb not null default '{}'::jsonb;
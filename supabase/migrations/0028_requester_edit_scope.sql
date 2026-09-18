-- Requester previously had no way to change a brief after submitting it — if they needed
-- more artworks or more time, they had to ask the manager manually. Split into its own
-- migration from 0029 because Postgres won't let a brand new enum value be used in the
-- same transaction it was added in.
alter type notification_type add value if not exists 'brief_updated';

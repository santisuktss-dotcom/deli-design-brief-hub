-- create_brief() never notified anyone — the manager had no signal that a new brief had
-- come in except by noticing it in the queue. Split into its own migration from 0026
-- because Postgres won't let a brand new enum value be used in the same transaction it
-- was added in.
alter type notification_type add value if not exists 'new_brief';

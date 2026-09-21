-- Postgres never auto-indexes a foreign key column on the child table (only the parent
-- side's primary key is indexed), and every one of these gets a `where brief_id = ...`
-- lookup on every single Project Detail page view (history, files, submissions, comments
-- each queried separately) — with no data they're fast regardless, but as briefs pile up
-- these become sequential scans. Add the missing indexes now while it's a one-line fix.
create index if not exists brief_history_brief_id_idx on public.brief_history (brief_id);
create index if not exists brief_files_brief_id_idx on public.brief_files (brief_id);
create index if not exists brief_submissions_brief_id_idx on public.brief_submissions (brief_id);
create index if not exists brief_comments_brief_id_idx on public.brief_comments (brief_id);

-- The composite primary key on brief_assignments (brief_id, designer_id) already covers
-- "which designers are on this brief" lookups, but the Calendar page's "which briefs is
-- this designer assigned to" query filters by designer_id alone — a prefix index on
-- (brief_id, designer_id) can't serve that, so it needs its own index.
create index if not exists brief_assignments_designer_id_idx on public.brief_assignments (designer_id);

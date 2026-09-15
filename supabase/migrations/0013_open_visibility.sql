-- Visibility change per manager request:
-- - Everyone (any signed-in role) can see every brief in Selected Works / Overview.
-- - Full project detail (history, files, submissions, comments) stays open to the
--   manager and to ANY designer (not just the one assigned) — only requesters are
--   restricted to their own briefs, enforced at the app layer in the Project Detail page
--   (the brief row itself is visible to everyone for the listing, but a requester hitting
--   another requester's /projects/[id] sees a "not authorized" message instead of the
--   sub-table content, which RLS still blocks for them below).

drop policy if exists briefs_select on public.briefs;
create policy briefs_select on public.briefs for select using (auth.uid() is not null);

drop policy if exists brief_assignments_select on public.brief_assignments;
create policy brief_assignments_select on public.brief_assignments for select using (
  public.is_manager()
  or public.is_designer()
  or exists (select 1 from public.briefs b where b.id = brief_id and b.requester_id = auth.uid())
);

drop policy if exists brief_history_select on public.brief_history;
create policy brief_history_select on public.brief_history for select using (
  public.is_manager()
  or public.is_designer()
  or exists (select 1 from public.briefs b where b.id = brief_id and b.requester_id = auth.uid())
);

drop policy if exists brief_files_select on public.brief_files;
create policy brief_files_select on public.brief_files for select using (
  public.is_manager()
  or public.is_designer()
  or exists (select 1 from public.briefs b where b.id = brief_id and b.requester_id = auth.uid())
);

drop policy if exists brief_submissions_select on public.brief_submissions;
create policy brief_submissions_select on public.brief_submissions for select using (
  public.is_manager()
  or public.is_designer()
  or exists (select 1 from public.briefs b where b.id = brief_id and b.requester_id = auth.uid())
);

drop policy if exists brief_comments_select on public.brief_comments;
create policy brief_comments_select on public.brief_comments for select using (
  public.is_manager()
  or public.is_designer()
  or exists (select 1 from public.briefs b where b.id = brief_id and b.requester_id = auth.uid())
);

drop policy if exists brief_comments_insert on public.brief_comments;
create policy brief_comments_insert on public.brief_comments for insert with check (
  author_id = auth.uid()
  and (
    public.is_manager()
    or public.is_designer()
    or exists (select 1 from public.briefs b where b.id = brief_id and b.requester_id = auth.uid())
  )
);

-- 0013 opened up briefs_select so every role sees every brief on Selected Works/Overview,
-- but brief_assignments stayed restricted to manager/designer/owning-requester — so the
-- nested brief_assignments(...) join in the Works grid query silently came back empty for
-- a requester viewing anyone else's brief, showing "Unassigned" even when a designer was
-- actually assigned (which the manager saw correctly). Who's assigned isn't sensitive
-- information the way comments/files/submissions are, so open it up the same way briefs
-- itself was opened.
drop policy if exists brief_assignments_select on public.brief_assignments;
create policy brief_assignments_select on public.brief_assignments for select using (auth.uid() is not null);

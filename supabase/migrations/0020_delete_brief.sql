-- Manager asked for per-project delete, not just the all-or-nothing monthly reset —
-- e.g. removing a single test/mistake entry without wiping every brief for the month.
-- All child tables already cascade on briefs.id (see 0001_init.sql), so deleting the
-- brief row alone cleans up assignments/history/files/submissions/comments/notifications.
create or replace function public.delete_brief(p_brief_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can delete a project';
  end if;

  delete from public.briefs where id = p_brief_id;
end;
$$;

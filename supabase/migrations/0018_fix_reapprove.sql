-- The Approve/Request revision buttons stayed visible even after a brief was already
-- Completed (fixed at the UI level in ProjectActions.tsx), so clicking Approve again
-- silently re-ran the whole thing — re-updating status (no-op), but also re-inserting a
-- duplicate brief_history row and a duplicate "was approved" notification every time.
-- Guard it at the database level too: reject outright if the brief is already Completed.
create or replace function public.approve_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  timing text;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (public.is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the Creative & Design Manager or the requester can approve this brief';
  end if;
  if b.status = 'Completed' then
    raise exception 'This brief has already been approved';
  end if;
  if not exists (select 1 from public.brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot approve before the designer has submitted work';
  end if;

  timing := case
    when b.due_date is null then null
    when current_date < b.due_date then 'early'
    when current_date = b.due_date then 'ontime'
    else 'late'
  end;

  update public.briefs set status = 'Completed', delivery_timing = timing
    where id = p_brief_id returning * into updated;

  insert into public.brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Approved', 'oklch(0.5 0.13 156)');
  insert into public.notifications (recipient_id, brief_id, type, message)
    values (b.requester_id, p_brief_id, 'approved', '"' || b.title || '" was approved');

  return updated;
end;
$$;

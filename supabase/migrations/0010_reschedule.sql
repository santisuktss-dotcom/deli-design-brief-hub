-- Lets the Creative & Design Manager move a brief's deadline after it's already been
-- created, per README "Design manager: move deadline" — still server-validated against
-- weekends/company holidays, same as brief creation.
create or replace function public.reschedule_brief(p_brief_id uuid, p_due_date date)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can reschedule a deadline';
  end if;

  if public.is_blocked_date(p_due_date) then
    raise exception 'Due date cannot fall on a weekend or company holiday';
  end if;

  update public.briefs set due_date = p_due_date, updated_at = now()
  where id = p_brief_id
  returning * into updated;

  if updated is null then
    raise exception 'Brief not found';
  end if;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (updated.id, 'Deadline rescheduled', 'New deadline: ' || to_char(p_due_date, 'DD Mon YYYY'), 'oklch(0.78 0.13 76)');

  return updated;
end;
$$;

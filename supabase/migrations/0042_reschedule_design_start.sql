-- Manager can drag a brief's "Design start" chip to another day on the work calendar,
-- the same way Due can already be dragged (reschedule_brief, 0031). Manager-only: the
-- designer and requester keep their existing scope. The start can't land on a weekend or
-- company holiday (same rule as the deadline), nor after the brief's current deadline.
create or replace function public.reschedule_brief_start(p_brief_id uuid, p_start_date date)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
  current_due date;
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can move the design start date';
  end if;

  if public.is_blocked_date(p_start_date) then
    raise exception 'Design start cannot fall on a weekend or company holiday';
  end if;

  select due_date into current_due from public.briefs where id = p_brief_id;
  if current_due is not null and p_start_date > current_due then
    raise exception 'Design start cannot be after the deadline';
  end if;

  update public.briefs set start_date = p_start_date, updated_at = now()
  where id = p_brief_id
  returning * into updated;

  if updated is null then
    raise exception 'Brief not found';
  end if;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (updated.id, 'Design start rescheduled', 'New design start: ' || to_char(p_start_date, 'DD Mon YYYY'), 'oklch(0.78 0.13 76)');

  return updated;
end;
$$;

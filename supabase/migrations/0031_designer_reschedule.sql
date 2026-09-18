-- Manager wants both themselves and the assigned designer to be able to drag a brief's
-- due date to a new day on the work calendar — e.g. the designer works out they can
-- deliver earlier than planned. reschedule_brief() was manager-only; widened to also
-- accept the brief's assigned designer, in either date direction (unlike the requester's
-- forward-only update_brief_scope — a designer or manager moving it is a deliberate
-- re-plan, not a scope change to guard against). Notifies the manager when a designer
-- (not the manager themself) makes the change, reusing the 'brief_updated' enum value
-- already added in 0028 — no new enum value needed here.
create or replace function public.reschedule_brief(p_brief_id uuid, p_due_date date)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
  is_mgr boolean;
begin
  is_mgr := public.is_manager();
  if not (is_mgr or public.is_assigned_designer(p_brief_id)) then
    raise exception 'Only the Creative & Design Manager or the assigned designer can reschedule a deadline';
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

  if not is_mgr then
    insert into public.notifications (recipient_id, brief_id, type, message)
      select id, p_brief_id, 'brief_updated',
        '"' || updated.title || '" ผู้ออกแบบเลื่อนวันส่งงานเป็น ' || to_char(p_due_date, 'DD Mon YYYY') ||
        ' · "' || updated.title || '" — the designer moved the deadline to ' || to_char(p_due_date, 'DD Mon YYYY')
      from public.profiles where role = 'manager';
  end if;

  return updated;
end;
$$;

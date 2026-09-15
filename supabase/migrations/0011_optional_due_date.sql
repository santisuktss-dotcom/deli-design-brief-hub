-- A requester can now leave the deadline blank when creating a brief — the Creative &
-- Design Manager sets/confirms it afterwards (via the Set/Reschedule deadline button on
-- Project Detail, which already calls reschedule_brief).
alter table public.briefs alter column due_date drop not null;

create or replace function public.create_brief(
  p_title text, p_category brief_category, p_brief_text text, p_deliverable text,
  p_channel text, p_round int, p_assets int, p_due_date date default null,
  p_requester_name text default null, p_requester_email text default null
) returns briefs language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  new_brief briefs;
begin
  select * into me from profiles where id = auth.uid();
  if me is null or me.role not in ('manager', 'requester') then
    raise exception 'Only the design manager or a requester can create a brief';
  end if;
  if p_due_date is not null and public.is_blocked_date(p_due_date) then
    raise exception 'Due date cannot fall on a weekend or company holiday';
  end if;
  if coalesce(trim(p_requester_name), trim(me.name)) = '' then
    raise exception 'A requester name is required';
  end if;

  insert into public.briefs (
    code, title, category, brief_text, deliverable, channel, round, assets,
    due_date, requester_id, requester_email, requester_name
  ) values (
    public.next_brief_code(), p_title, p_category, p_brief_text, p_deliverable, p_channel, p_round,
    coalesce(p_assets, 1), p_due_date, me.id,
    coalesce(p_requester_email, me.email), coalesce(p_requester_name, me.name)
  ) returning * into new_brief;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (new_brief.id, 'Brief received', null, 'rgba(26,22,20,.22)');

  return new_brief;
end;
$$;

-- Lets the Creative & Design Manager also edit a brief's artwork count (not just the
-- requester). The manager already has full, any-direction control over the deadline via
-- reschedule_brief, so this only needs to open up the assets side of update_brief_scope —
-- the app only ever sends p_due_date from the manager's own UI as null, but the
-- forward-only date guard is still relaxed for a manager-supplied date defensively.
-- When the manager makes the edit, notify the requester instead of the manager team
-- (previously the only notify path, written for the requester-edits-their-own-brief case).
create or replace function public.update_brief_scope(p_brief_id uuid, p_due_date date, p_assets int)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  changes text[] := array[]::text[];
  is_mgr boolean;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  is_mgr := public.is_manager();
  if not (is_mgr or b.requester_id = auth.uid()) then
    raise exception 'Only the Creative & Design Manager or the requester who created this brief can update it';
  end if;
  if b.status in ('Completed', 'Cancelled') then
    raise exception 'This brief is already closed and cannot be changed';
  end if;

  if p_due_date is not null then
    if not is_mgr and b.due_date is not null and p_due_date < b.due_date then
      raise exception 'The deadline can only be moved later, not earlier';
    end if;
    if public.is_blocked_date(p_due_date) then
      raise exception 'Due date cannot fall on a weekend or company holiday';
    end if;
    if p_due_date <> coalesce(b.due_date, p_due_date) then
      changes := array_append(changes, 'deadline moved to ' || to_char(p_due_date, 'DD Mon YYYY'));
    end if;
  end if;

  if p_assets is not null then
    if p_assets < 1 then
      raise exception 'Number of artworks must be at least 1';
    end if;
    if p_assets <> b.assets then
      changes := array_append(changes, 'artworks changed to ' || p_assets);
    end if;
  end if;

  if array_length(changes, 1) is null then
    return b;
  end if;

  update public.briefs set
    due_date = coalesce(p_due_date, due_date),
    original_due_date = coalesce(p_due_date, original_due_date),
    assets = coalesce(p_assets, assets),
    updated_at = now()
  where id = p_brief_id
  returning * into updated;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (
      p_brief_id,
      case when is_mgr then 'Manager updated brief' else 'Requester updated brief' end,
      array_to_string(changes, '; '),
      'oklch(0.71 0.11 252)'
    );

  if is_mgr then
    if b.requester_id is not null then
      insert into public.notifications (recipient_id, brief_id, type, message)
        values (b.requester_id, p_brief_id, 'brief_updated',
          '"' || updated.title || '" ถูกแก้ไขโดย Creative & Design Manager (' || array_to_string(changes, ', ') || ') · "' ||
          updated.title || '" was updated by the Creative & Design Manager (' || array_to_string(changes, ', ') || ')');
    end if;
  else
    insert into public.notifications (recipient_id, brief_id, type, message)
      select id, p_brief_id, 'brief_updated',
        '"' || updated.title || '" ถูกแก้ไขโดยผู้บรีฟ (' || array_to_string(changes, ', ') || ') · "' ||
        updated.title || '" was updated by the requester (' || array_to_string(changes, ', ') || ')'
      from public.profiles where role = 'manager';
  end if;

  return updated;
end;
$$;

-- Lets the requester (own brief) or the Creative & Design Manager fix a brief's title if
-- it was typed wrong. Mirrors update_brief_category (0037): same permission shape, same
-- closed-brief guard, same notify-the-other-side pattern.
create or replace function public.update_brief_title(p_brief_id uuid, p_title text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  is_mgr boolean;
  new_title text;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  is_mgr := public.is_manager();
  if not (is_mgr or b.requester_id = auth.uid()) then
    raise exception 'Only the Creative & Design Manager or the requester who created this brief can rename it';
  end if;
  if b.status in ('Completed', 'Cancelled') then
    raise exception 'This brief is already closed and cannot be changed';
  end if;

  new_title := trim(coalesce(p_title, ''));
  if new_title = '' then
    raise exception 'Job title cannot be empty';
  end if;
  if new_title = b.title then
    return b;
  end if;

  update public.briefs set title = new_title, updated_at = now()
  where id = p_brief_id
  returning * into updated;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (p_brief_id,
      case when is_mgr then 'Manager updated brief' else 'Requester updated brief' end,
      'title changed from "' || b.title || '" to "' || new_title || '"', 'oklch(0.71 0.11 252)');

  if is_mgr then
    if b.requester_id is not null and b.requester_id <> auth.uid() then
      insert into public.notifications (recipient_id, brief_id, type, message)
        values (b.requester_id, p_brief_id, 'brief_updated',
          '"' || b.title || '" ถูกเปลี่ยนชื่อเป็น "' || new_title || '" โดย Creative & Design Manager · Renamed to "' ||
          new_title || '" by the Creative & Design Manager');
    end if;
  else
    insert into public.notifications (recipient_id, brief_id, type, message)
      select id, p_brief_id, 'brief_updated',
        '"' || b.title || '" ถูกเปลี่ยนชื่อเป็น "' || new_title || '" โดยผู้บรีฟ · Renamed to "' ||
        new_title || '" by the requester'
      from public.profiles where role = 'manager';
  end if;

  return updated;
end;
$$;

grant execute on function public.update_brief_title(uuid, text) to authenticated;

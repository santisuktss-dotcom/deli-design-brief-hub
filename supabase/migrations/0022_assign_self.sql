-- Manager wants to be able to assign a brief to themselves (design it personally),
-- not just to other designers. assign_designer() rejected p_designer_id unless the
-- target profile's role was exactly 'designer', so the manager's own id always failed
-- with "Designer not found". Widened to also accept the manager role.
create or replace function public.assign_designer(p_brief_id uuid, p_designer_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  d profiles;
  updated briefs;
  v_inserted int;
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can assign a designer';
  end if;
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not b.accepted then
    raise exception 'Accept the brief before assigning a designer';
  end if;
  select * into d from public.profiles where id = p_designer_id and role in ('designer', 'manager');
  if d is null then raise exception 'Designer not found'; end if;

  insert into public.brief_assignments (brief_id, designer_id) values (p_brief_id, p_designer_id)
    on conflict do nothing;
  get diagnostics v_inserted = row_count;

  update public.briefs set status = 'Design', start_date = coalesce(start_date, current_date)
    where id = p_brief_id and status in ('Brief', 'Review')
    returning * into updated;
  if updated is null then select * into updated from public.briefs where id = p_brief_id; end if;

  if v_inserted > 0 then
    insert into public.brief_history (brief_id, title, note, status_color)
      values (p_brief_id, 'Designer assigned', d.name, 'oklch(0.52 0.14 250)');
    insert into public.notifications (recipient_id, brief_id, type, message)
      values (p_designer_id, p_brief_id, 'assigned',
        'Creative & Design Manager assigned "' || b.title || '" to you');
  end if;

  return updated;
end;
$$;

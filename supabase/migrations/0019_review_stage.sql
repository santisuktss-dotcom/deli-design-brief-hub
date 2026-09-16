-- The "Review" status (02, ตรวจบรีฟ / ประเมินงาน) was defined in STATUS/STAGE_TXT but
-- never actually set by any RPC — accept_brief left status at 'Brief' and assign_designer
-- jumped straight to 'Design', so the workflow strip's Review count was always 0. Manager
-- now wants this to be a real stage: accepting a brief moves it into Review (manager is
-- assessing scope before assigning), and assigning a designer moves it out of Review into
-- Design exactly as assign_designer already handles (it already accepts status in
-- ('Brief', 'Review') going into Design, so no change needed there).
create or replace function public.accept_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can accept a brief';
  end if;
  update public.briefs set accepted = true, accepted_at = now(), status = 'Review'
    where id = p_brief_id and status = 'Brief'
    returning * into updated;
  if updated is null then
    raise exception 'Brief not found or not in an acceptable state';
  end if;
  insert into public.brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Brief accepted', 'oklch(0.5 0.13 156)');
  return updated;
end;
$$;

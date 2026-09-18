-- The Assign modal could only ever add a designer (insert ... on conflict do nothing) —
-- there was no way to remove one once checked, so a mis-click stuck permanently. Adds the
-- matching unassign RPC; manager-only, same as assign_designer. Deliberately doesn't touch
-- brief.status — removing an assignment is a correction, not a status transition.
create or replace function public.unassign_designer(p_brief_id uuid, p_designer_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  d profiles;
  v_deleted int;
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can unassign a designer';
  end if;
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  select * into d from public.profiles where id = p_designer_id;

  delete from public.brief_assignments where brief_id = p_brief_id and designer_id = p_designer_id;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    insert into public.brief_history (brief_id, title, note, status_color)
      values (p_brief_id, 'Designer removed', coalesce(d.name, 'Designer'), 'rgba(26,22,20,.3)');
  end if;

  return b;
end;
$$;

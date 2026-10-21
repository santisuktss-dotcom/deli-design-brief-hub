-- A requester could not ask for a revision once a brief was 'Completed' (e.g. a fix needed
-- the day after sign-off or auto-complete): request_revision() only accepted status = 'Approved'
-- from a requester and answered "The Creative & Design Manager needs to review the work first",
-- while the page still showed the Request revision button on Completed briefs. Allow
-- 'Approved' and 'Completed'; everything else in the function is unchanged from 0041.
create or replace function public.request_revision(p_brief_id uuid, p_note text, p_image_url text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  assignee uuid;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (public.is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the Creative & Design Manager or the requester can request a revision';
  end if;
  -- The manager can send work straight back to the designer at any stage; the requester
  -- has to wait for the manager's own review (status = 'Approved') first, and may also reopen
  -- a brief that is already 'Completed' (the UI offers this; it used to be blocked here with a
  -- misleading "manager needs to review first" error).
  if not public.is_manager() and b.status not in ('Approved', 'Completed') then
    raise exception 'The Creative & Design Manager needs to review the work first';
  end if;
  if not exists (select 1 from public.brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot request a revision before the designer has submitted work';
  end if;

  update public.briefs set status = 'Revision' where id = p_brief_id returning * into updated;

  insert into public.brief_comments (brief_id, author_id, author_name, text, image_url)
    values (p_brief_id, auth.uid(), coalesce((select name from public.profiles where id = auth.uid()), 'Requester'), coalesce(p_note, ''), p_image_url);
  insert into public.brief_history (brief_id, title, note, status_color)
    values (p_brief_id, 'Revision requested', p_note, 'oklch(0.62 0.14 68)');

  select designer_id into assignee from public.brief_assignments where brief_id = p_brief_id limit 1;
  if assignee is not null then
    insert into public.notifications (recipient_id, brief_id, type, message)
      values (assignee, p_brief_id, 'revision_requested',
        'มีการขอแก้ไขงาน "' || b.title || '" · Revision requested for "' || b.title || '"');
  end if;

  -- Managers (except the one who asked, and the assignee who was just notified above).
  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'revision_requested',
      'ผู้บรีฟขอแก้ไขงาน "' || b.title || '" · The requester asked for a revision on "' || b.title || '"'
    from public.profiles
    where role = 'manager' and id <> auth.uid() and id is distinct from assignee;

  -- The requester, when the manager is the one sending it back.
  if b.requester_id <> auth.uid() then
    insert into public.notifications (recipient_id, brief_id, type, message)
      values (b.requester_id, p_brief_id, 'revision_requested',
        '"' || b.title || '" — Creative & Design Manager ส่งกลับให้แก้ไข · "' || b.title ||
        '" — sent back for revision by the Creative & Design Manager');
  end if;

  return updated;
end;
$$;

-- Manager wants a review step before the requester ever sees Approve/Request revision:
-- submitted work now goes to the manager first. approve_brief() becomes two-stage, using
-- the 'Approved' status that already existed in STATUS/ORDER but nothing ever set:
--   1st click (status not yet 'Approved'): manager-only, moves Design -> Approved,
--      notifies the requester it's ready for their confirmation.
--   2nd click (status already 'Approved'): manager or requester, moves Approved ->
--      Completed, same as before.
-- request_revision() keeps working for the manager at any stage (straight back to the
-- designer without routing through the requester first), but a requester now can only
-- request a revision once the manager has reviewed (status = 'Approved').
create or replace function public.approve_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  timing text;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (public.is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the Creative & Design Manager or the requester can approve this brief';
  end if;
  if b.status = 'Completed' then
    raise exception 'This brief has already been approved';
  end if;
  if not exists (select 1 from public.brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot approve before the designer has submitted work';
  end if;

  if b.status <> 'Approved' then
    -- Stage 1: the manager's own review, before the requester is even shown Approve.
    if not public.is_manager() then
      raise exception 'The Creative & Design Manager needs to review the work first';
    end if;

    update public.briefs set status = 'Approved' where id = p_brief_id returning * into updated;

    insert into public.brief_history (brief_id, title, status_color)
      values (p_brief_id, 'Reviewed by manager', 'oklch(0.74 0.11 157)');
    insert into public.notifications (recipient_id, brief_id, type, message)
      values (b.requester_id, p_brief_id, 'approved',
        '"' || updated.title || '" ผ่านการตรวจจาก Creative & Design Manager แล้ว รอการยืนยันจากคุณ · "' ||
        updated.title || '" was reviewed by the Creative & Design Manager — ready for your confirmation');

    return updated;
  end if;

  -- Stage 2: final sign-off, by either the manager or the requester.
  timing := case
    when b.due_date is null then null
    when current_date < b.due_date then 'early'
    when current_date = b.due_date then 'ontime'
    else 'late'
  end;

  update public.briefs set status = 'Completed', delivery_timing = timing
    where id = p_brief_id returning * into updated;

  insert into public.brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Approved', 'oklch(0.5 0.13 156)');
  insert into public.notifications (recipient_id, brief_id, type, message)
    values (b.requester_id, p_brief_id, 'approved',
      '"' || b.title || '" ได้รับการอนุมัติแล้ว · "' || b.title || '" was approved');

  return updated;
end;
$$;

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
  -- has to wait for the manager's own review (status = 'Approved') first.
  if not public.is_manager() and b.status <> 'Approved' then
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

  return updated;
end;
$$;

-- Fixes gathered while testing the real designer flow:
-- 1. assign_designer()'s notification insert was unconditional, so re-assigning the same
--    designer (assignment insert itself is deduped via ON CONFLICT DO NOTHING) still fired
--    a duplicate "assigned" notification every time. Now only notifies on a genuinely new
--    assignment row.
-- 2. "design manager" (lowercase, missing "Creative &") in every RPC's error/notification
--    text — these live in Postgres functions so the earlier app-wide text rename never
--    touched them.

create or replace function public.create_brief(
  p_title text, p_category brief_category, p_brief_text text, p_deliverable text,
  p_channel text, p_round int, p_assets int, p_due_date date default null,
  p_requester_name text default null, p_requester_email text default null
) returns briefs language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  new_brief briefs;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.role not in ('manager', 'requester') then
    raise exception 'Only the Creative & Design Manager or a requester can create a brief';
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

create or replace function public.accept_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
begin
  if not public.is_manager() then
    raise exception 'Only the Creative & Design Manager can accept a brief';
  end if;
  update public.briefs set accepted = true, accepted_at = now()
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
  select * into d from public.profiles where id = p_designer_id and role = 'designer';
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

create or replace function public.submit_work(p_brief_id uuid, p_link text, p_image_url text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (public.is_manager() or public.is_assigned_designer(p_brief_id)) then
    raise exception 'Only the assigned designer or the Creative & Design Manager can submit work';
  end if;

  insert into public.brief_submissions (brief_id, submitted_by, link, image_url)
    values (p_brief_id, auth.uid(), p_link, p_image_url);
  if p_link is not null and trim(p_link) <> '' then
    insert into public.brief_files (brief_id, name, ext, url, is_link) values (p_brief_id, p_link, 'LINK', p_link, true);
  end if;

  insert into public.brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Work submitted', 'oklch(0.52 0.14 250)');
  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'submitted', 'Designer submitted "' || b.title || '" — awaiting Creative & Design Manager review'
    from public.profiles where role = 'manager';

  return b;
end;
$$;

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
  if not exists (select 1 from public.brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot approve before the designer has submitted work';
  end if;

  timing := case
    when current_date < b.due_date then 'early'
    when current_date = b.due_date then 'ontime'
    else 'late'
  end;

  update public.briefs set status = 'Completed', delivery_timing = timing
    where id = p_brief_id returning * into updated;

  insert into public.brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Approved', 'oklch(0.5 0.13 156)');
  insert into public.notifications (recipient_id, brief_id, type, message)
    values (b.requester_id, p_brief_id, 'approved', '"' || b.title || '" was approved');

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
      values (assignee, p_brief_id, 'revision_requested', 'Revision requested for "' || b.title || '"');
  end if;

  return updated;
end;
$$;

create or replace function public.cancel_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then raise exception 'Only the requester can cancel this brief'; end if;
  if b.status <> 'Brief' or b.accepted then
    raise exception 'A brief can only be cancelled before the Creative & Design Manager accepts it';
  end if;

  update public.briefs set status = 'Cancelled' where id = p_brief_id returning * into updated;
  insert into public.brief_history (brief_id, title, status_color) values (p_brief_id, 'Cancel requested', '#8E0E22');
  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'cancelled', 'Requester asked to cancel "' || b.title || '"' from public.profiles where role = 'manager';

  return updated;
end;
$$;

create or replace function public.hold_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then raise exception 'Only the requester can put this brief on hold'; end if;
  if b.status <> 'Brief' or b.accepted then
    raise exception 'A brief can only be put on hold before the Creative & Design Manager accepts it';
  end if;

  update public.briefs set status = 'OnHold' where id = p_brief_id returning * into updated;
  insert into public.brief_history (brief_id, title, status_color) values (p_brief_id, 'Hold requested', 'oklch(0.62 0.1 60)');
  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'hold', 'Requester asked to put "' || b.title || '" on hold' from public.profiles where role = 'manager';

  return updated;
end;
$$;

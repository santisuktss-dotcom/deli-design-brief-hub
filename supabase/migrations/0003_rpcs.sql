-- Security-definer RPCs: the only way to mutate briefs. This is what makes the
-- business rules server-enforced instead of UI-only, per README "Business Rules".

create or replace function next_brief_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  ym text := to_char(now(), 'YYMM');
  seq int;
begin
  select count(*) + 1 into seq from briefs where code like 'DL-' || ym || '-%';
  return 'DL-' || ym || '-' || lpad(seq::text, 2, '0');
end;
$$;

create or replace function is_blocked_date(p_date date)
returns boolean language sql stable security definer set search_path = public as $$
  select extract(dow from p_date) in (0, 6)
    or exists (select 1 from company_holidays where holiday_date = p_date);
$$;

-- Manager or requester creates a brief. Manager may backdate/create on behalf of
-- another department by passing p_requester_email/p_requester_name explicitly.
create or replace function create_brief(
  p_title text, p_category brief_category, p_brief_text text, p_deliverable text,
  p_channel text, p_round int, p_assets int, p_due_date date,
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
  if is_blocked_date(p_due_date) then
    raise exception 'Due date cannot fall on a weekend or company holiday';
  end if;
  if coalesce(trim(p_requester_name), trim(me.name)) = '' then
    raise exception 'A requester name is required';
  end if;

  insert into briefs (
    code, title, category, brief_text, deliverable, channel, round, assets,
    due_date, requester_id, requester_email, requester_name
  ) values (
    next_brief_code(), p_title, p_category, p_brief_text, p_deliverable, p_channel, p_round,
    coalesce(p_assets, 1), p_due_date, me.id,
    coalesce(p_requester_email, me.email), coalesce(p_requester_name, me.name)
  ) returning * into new_brief;

  insert into brief_history (brief_id, title, note, status_color)
    values (new_brief.id, 'Brief received', null, 'rgba(26,22,20,.22)');

  return new_brief;
end;
$$;

-- Gate 1 of 2: manager accepts. Work still cannot start until a designer is assigned.
create or replace function accept_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
begin
  if not is_manager() then
    raise exception 'Only the design manager can accept a brief';
  end if;
  update briefs set accepted = true, accepted_at = now()
    where id = p_brief_id and status = 'Brief'
    returning * into updated;
  if updated is null then
    raise exception 'Brief not found or not in an acceptable state';
  end if;
  insert into brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Brief accepted', 'oklch(0.5 0.13 156)');
  return updated;
end;
$$;

-- Gate 2 of 2: assigning a designer to an accepted brief starts the work (-> Design, start_date stamped).
create or replace function assign_designer(p_brief_id uuid, p_designer_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  d profiles;
  updated briefs;
begin
  if not is_manager() then
    raise exception 'Only the design manager can assign a designer';
  end if;
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not b.accepted then
    raise exception 'Accept the brief before assigning a designer';
  end if;
  select * into d from profiles where id = p_designer_id and role = 'designer';
  if d is null then raise exception 'Designer not found'; end if;

  insert into brief_assignments (brief_id, designer_id) values (p_brief_id, p_designer_id)
    on conflict do nothing;

  update briefs set status = 'Design', start_date = coalesce(start_date, current_date)
    where id = p_brief_id and status in ('Brief', 'Review')
    returning * into updated;
  if updated is null then select * into updated from briefs where id = p_brief_id; end if;

  insert into brief_history (brief_id, title, note, status_color)
    values (p_brief_id, 'Designer assigned', d.name, 'oklch(0.52 0.14 250)');
  insert into notifications (recipient_id, brief_id, type, message)
    values (p_designer_id, p_brief_id, 'assigned',
      'Design Manager assigned "' || b.title || '" to you');

  return updated;
end;
$$;

-- Designer (or manager) submits work-in-progress or final files for review.
create or replace function submit_work(p_brief_id uuid, p_link text, p_image_url text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (is_manager() or is_assigned_designer(p_brief_id)) then
    raise exception 'Only the assigned designer or the design manager can submit work';
  end if;

  insert into brief_submissions (brief_id, submitted_by, link, image_url)
    values (p_brief_id, auth.uid(), p_link, p_image_url);
  if p_link is not null and trim(p_link) <> '' then
    insert into brief_files (brief_id, name, ext, url, is_link) values (p_brief_id, p_link, 'LINK', p_link, true);
  end if;

  insert into brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Work submitted', 'oklch(0.52 0.14 250)');
  insert into notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'submitted', 'Designer submitted "' || b.title || '" — awaiting Design Manager review'
    from profiles where role = 'manager';

  return b;
end;
$$;

-- Manager (or the requester on their own brief) approves — this is the final signoff, closing the job.
create or replace function approve_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  timing text;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the design manager or the requester can approve this brief';
  end if;
  if not exists (select 1 from brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot approve before the designer has submitted work';
  end if;

  timing := case
    when current_date < b.due_date then 'early'
    when current_date = b.due_date then 'ontime'
    else 'late'
  end;

  update briefs set status = 'Completed', delivery_timing = timing
    where id = p_brief_id returning * into updated;

  insert into brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Approved', 'oklch(0.5 0.13 156)');
  insert into notifications (recipient_id, brief_id, type, message)
    values (b.requester_id, p_brief_id, 'approved', '"' || b.title || '" was approved');

  return updated;
end;
$$;

-- Manager (or the requester on their own brief) requests a revision — only once a submission exists.
create or replace function request_revision(p_brief_id uuid, p_note text, p_image_url text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  assignee uuid;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the design manager or the requester can request a revision';
  end if;
  if not exists (select 1 from brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot request a revision before the designer has submitted work';
  end if;

  update briefs set status = 'Revision' where id = p_brief_id returning * into updated;

  insert into brief_comments (brief_id, author_id, author_name, text, image_url)
    values (p_brief_id, auth.uid(), coalesce((select name from profiles where id = auth.uid()), 'Requester'), coalesce(p_note, ''), p_image_url);
  insert into brief_history (brief_id, title, note, status_color)
    values (p_brief_id, 'Revision requested', p_note, 'oklch(0.62 0.14 68)');

  select designer_id into assignee from brief_assignments where brief_id = p_brief_id limit 1;
  if assignee is not null then
    insert into notifications (recipient_id, brief_id, type, message)
      values (assignee, p_brief_id, 'revision_requested', 'Revision requested for "' || b.title || '"');
  end if;

  return updated;
end;
$$;

-- Requester-only, and only before the manager has accepted — mirrors canCancelHold in the prototype.
create or replace function cancel_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then raise exception 'Only the requester can cancel this brief'; end if;
  if b.status <> 'Brief' or b.accepted then
    raise exception 'A brief can only be cancelled before the design manager accepts it';
  end if;

  update briefs set status = 'Cancelled' where id = p_brief_id returning * into updated;
  insert into brief_history (brief_id, title, status_color) values (p_brief_id, 'Cancel requested', '#8E0E22');
  insert into notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'cancelled', 'Requester asked to cancel "' || b.title || '"' from profiles where role = 'manager';

  return updated;
end;
$$;

create or replace function hold_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then raise exception 'Only the requester can put this brief on hold'; end if;
  if b.status <> 'Brief' or b.accepted then
    raise exception 'A brief can only be put on hold before the design manager accepts it';
  end if;

  update briefs set status = 'OnHold' where id = p_brief_id returning * into updated;
  insert into brief_history (brief_id, title, status_color) values (p_brief_id, 'Hold requested', 'oklch(0.62 0.1 60)');
  insert into notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'hold', 'Requester asked to put "' || b.title || '" on hold' from profiles where role = 'manager';

  return updated;
end;
$$;

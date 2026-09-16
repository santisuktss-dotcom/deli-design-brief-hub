-- Split into its own migration after 0023's `alter type ... add value` — Postgres
-- disallows using a brand new enum value in the same transaction it was added in.
--
-- The requester only ever heard back once, at Approve. Adds three more points where they
-- get notified: their brief was accepted, design has started (designer assigned), and the
-- designer has submitted work for review. Reuses the 'assigned'/'submitted' enum values
-- for the requester's copy of those two events (type isn't used for icon/branching in the
-- UI, just stored) rather than growing the enum further.

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
  insert into public.notifications (recipient_id, brief_id, type, message)
    values (updated.requester_id, p_brief_id, 'accepted',
      '"' || updated.title || '" was accepted — a designer will be assigned soon');
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
    insert into public.notifications (recipient_id, brief_id, type, message)
      values (b.requester_id, p_brief_id, 'assigned',
        '"' || b.title || '" has started design');
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
  if p_image_url is not null and trim(p_image_url) <> '' then
    insert into public.brief_files (brief_id, name, ext, url, is_link) values (p_brief_id, 'Submitted image', 'IMG', p_image_url, false);
  end if;

  insert into public.brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Work submitted', 'oklch(0.52 0.14 250)');
  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'submitted', 'Designer submitted "' || b.title || '" — awaiting Creative & Design Manager review'
    from public.profiles where role = 'manager';
  insert into public.notifications (recipient_id, brief_id, type, message)
    values (b.requester_id, p_brief_id, 'submitted',
      '"' || b.title || '" — the designer has submitted work, pending review');

  return b;
end;
$$;

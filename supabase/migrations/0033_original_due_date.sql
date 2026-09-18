-- The calendar drag-to-reschedule feature (reschedule_brief, 0031) lets the manager and
-- assigned designer freely move a brief's due_date around for internal planning — but the
-- requester ("Other Department") should keep seeing the deadline exactly as it was first
-- set/agreed, unaffected by that internal re-planning. This adds original_due_date: set
-- once at creation, updated only when the requester themselves deliberately pushes their
-- own deadline later (update_brief_scope), and left untouched by reschedule_brief.
alter table public.briefs add column original_due_date date;
update public.briefs set original_due_date = due_date;

create or replace function public.create_brief(
  p_title text, p_category brief_category, p_brief_text text, p_deliverable text,
  p_channel text, p_round int, p_assets int, p_due_date date default null,
  p_requester_name text default null, p_requester_email text default null,
  p_reference_link text default null, p_reference_image_url text default null
) returns briefs language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  new_brief briefs;
  requester_display text;
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
  requester_display := coalesce(p_requester_name, me.name);

  insert into public.briefs (
    code, title, category, brief_text, deliverable, channel, round, assets,
    due_date, original_due_date, requester_id, requester_email, requester_name
  ) values (
    public.next_brief_code(), p_title, p_category, p_brief_text, p_deliverable, p_channel, p_round,
    coalesce(p_assets, 1), p_due_date, p_due_date, me.id,
    coalesce(p_requester_email, me.email), requester_display
  ) returning * into new_brief;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (new_brief.id, 'Brief received', null, 'rgba(26,22,20,.22)');

  if p_reference_link is not null and trim(p_reference_link) <> '' then
    insert into public.brief_files (brief_id, name, ext, url, is_link)
      values (new_brief.id, p_reference_link, 'LINK', p_reference_link, true);
  end if;
  if p_reference_image_url is not null and trim(p_reference_image_url) <> '' then
    insert into public.brief_files (brief_id, name, ext, url, is_link)
      values (new_brief.id, 'Reference image', 'IMG', p_reference_image_url, false);
  end if;

  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, new_brief.id, 'new_brief',
      requester_display || ' ส่งบรีฟใหม่เข้ามา: "' || new_brief.title || '" · ' ||
      requester_display || ' submitted a new brief: "' || new_brief.title || '"'
    from public.profiles where role = 'manager';

  return new_brief;
end;
$$;

-- Requester's own forward-only deadline push is their own re-agreement to a new deadline,
-- not the design team's internal re-plan — so unlike reschedule_brief, this keeps
-- original_due_date in lockstep with due_date.
create or replace function public.update_brief_scope(p_brief_id uuid, p_due_date date, p_assets int)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  changes text[] := array[]::text[];
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then
    raise exception 'Only the requester who created this brief can update it';
  end if;
  if b.status in ('Completed', 'Cancelled') then
    raise exception 'This brief is already closed and cannot be changed';
  end if;

  if p_due_date is not null then
    if b.due_date is not null and p_due_date < b.due_date then
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
    values (p_brief_id, 'Requester updated brief', array_to_string(changes, '; '), 'oklch(0.71 0.11 252)');

  insert into public.notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'brief_updated',
      '"' || updated.title || '" ถูกแก้ไขโดยผู้บรีฟ (' || array_to_string(changes, ', ') || ') · "' ||
      updated.title || '" was updated by the requester (' || array_to_string(changes, ', ') || ')'
    from public.profiles where role = 'manager';

  return updated;
end;
$$;

-- Lets the requester attach a reference link and/or image when creating a brief (the
-- "Brief details" field's Reference link/image, per the prototype's fLink/addLink copy
-- which existed in the dict but was never wired into the New Brief form). Both land in
-- brief_files, same as a designer's submitted files, so they show up immediately on
-- Project Detail.
create or replace function public.create_brief(
  p_title text, p_category brief_category, p_brief_text text, p_deliverable text,
  p_channel text, p_round int, p_assets int, p_due_date date default null,
  p_requester_name text default null, p_requester_email text default null,
  p_reference_link text default null, p_reference_image_url text default null
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

  if p_reference_link is not null and trim(p_reference_link) <> '' then
    insert into public.brief_files (brief_id, name, ext, url, is_link)
      values (new_brief.id, p_reference_link, 'LINK', p_reference_link, true);
  end if;
  if p_reference_image_url is not null and trim(p_reference_image_url) <> '' then
    insert into public.brief_files (brief_id, name, ext, url, is_link)
      values (new_brief.id, 'Reference image', 'IMG', p_reference_image_url, false);
  end if;

  return new_brief;
end;
$$;

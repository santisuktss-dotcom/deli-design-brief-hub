-- Storage bucket for Submit Work / Request Revision image attachments. Public bucket
-- (read) since the app already shows every brief to everyone; write restricted to
-- signed-in users. Also makes submit_work() log the attached image into brief_files so
-- it shows up in the existing Files list on Project Detail, same as a submitted link.

insert into storage.buckets (id, name, public)
values ('brief-uploads', 'brief-uploads', true)
on conflict (id) do nothing;

drop policy if exists "brief_uploads_insert" on storage.objects;
create policy "brief_uploads_insert" on storage.objects for insert
  with check (bucket_id = 'brief-uploads' and auth.uid() is not null);

drop policy if exists "brief_uploads_select" on storage.objects;
create policy "brief_uploads_select" on storage.objects for select
  using (bucket_id = 'brief-uploads');

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

  return b;
end;
$$;

-- Lets whoever posted a link/image fix or remove it (in case they sent the wrong one).
-- Covers both places attachments live: brief_files (requester's reference link/image,
-- designer's submitted link/image) and brief_comments.image_url (revision-request image).
-- The Creative & Design Manager can edit/delete any of them too.

-- Track who added each file. Defaulting to auth.uid() means create_brief/submit_work
-- (security definer, but auth.uid() is still the caller) fill it in without being rewritten.
alter table public.brief_files
  add column if not exists uploaded_by uuid references public.profiles (id) on delete set null default auth.uid();
alter table public.brief_files alter column uploaded_by set default auth.uid();

-- Backfill existing rows: a submitted link/image belongs to whoever submitted it; anything
-- left over was attached at brief creation, so it belongs to the requester.
update public.brief_files f set uploaded_by = s.submitted_by
from public.brief_submissions s
where f.uploaded_by is null and s.brief_id = f.brief_id
  and s.submitted_by is not null
  and (f.url = s.link or f.url = s.image_url);

update public.brief_files f set uploaded_by = b.requester_id
from public.briefs b
where f.uploaded_by is null and b.id = f.brief_id;

create or replace function public.update_brief_file(p_file_id uuid, p_url text)
returns brief_files language plpgsql security definer set search_path = public as $$
declare
  f brief_files;
  updated brief_files;
begin
  select * into f from public.brief_files where id = p_file_id;
  if f is null then raise exception 'File not found'; end if;
  if not (public.is_manager() or f.uploaded_by = auth.uid()) then
    raise exception 'Only the person who added this file or the Creative & Design Manager can edit it';
  end if;
  if p_url is null or trim(p_url) = '' then
    raise exception 'Link or image cannot be empty';
  end if;

  update public.brief_files set
    url = trim(p_url),
    -- A link's display name is the link itself, so keep them in sync.
    name = case when is_link then trim(p_url) else name end
  where id = p_file_id
  returning * into updated;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (f.brief_id, case when f.is_link then 'Link updated' else 'Image updated' end, null, 'rgba(26,22,20,.22)');

  return updated;
end;
$$;

create or replace function public.delete_brief_file(p_file_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  f brief_files;
begin
  select * into f from public.brief_files where id = p_file_id;
  if f is null then raise exception 'File not found'; end if;
  if not (public.is_manager() or f.uploaded_by = auth.uid()) then
    raise exception 'Only the person who added this file or the Creative & Design Manager can delete it';
  end if;

  delete from public.brief_files where id = p_file_id;

  insert into public.brief_history (brief_id, title, note, status_color)
    values (f.brief_id, case when f.is_link then 'Link removed' else 'Image removed' end, null, 'rgba(26,22,20,.22)');
end;
$$;

-- p_image_url null removes the image from the comment (the comment text stays).
create or replace function public.update_comment_image(p_comment_id uuid, p_image_url text)
returns brief_comments language plpgsql security definer set search_path = public as $$
declare
  c brief_comments;
  updated brief_comments;
begin
  select * into c from public.brief_comments where id = p_comment_id;
  if c is null then raise exception 'Comment not found'; end if;
  if not (public.is_manager() or c.author_id = auth.uid()) then
    raise exception 'Only the person who posted this image or the Creative & Design Manager can change it';
  end if;

  update public.brief_comments set image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where id = p_comment_id
  returning * into updated;

  return updated;
end;
$$;

grant execute on function public.update_brief_file(uuid, text) to authenticated;
grant execute on function public.delete_brief_file(uuid) to authenticated;
grant execute on function public.update_comment_image(uuid, text) to authenticated;

-- Lets the requester (own brief) or the Creative & Design Manager fix a brief's category
-- if the wrong one was picked (e.g. Product → General Trade). Kept separate from
-- update_brief_scope so that function's signature/callers stay untouched. Notifies the
-- other side the same way update_brief_scope does.
create or replace function public.update_brief_category(p_brief_id uuid, p_category brief_category)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  is_mgr boolean;
  change text;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  is_mgr := public.is_manager();
  if not (is_mgr or b.requester_id = auth.uid()) then
    raise exception 'Only the Creative & Design Manager or the requester who created this brief can change its category';
  end if;
  if b.status in ('Completed', 'Cancelled') then
    raise exception 'This brief is already closed and cannot be changed';
  end if;
  if p_category is null or p_category = b.category then
    return b;
  end if;

  update public.briefs set category = p_category, updated_at = now()
  where id = p_brief_id
  returning * into updated;

  change := 'category changed from ' || b.category || ' to ' || p_category;
  insert into public.brief_history (brief_id, title, note, status_color)
    values (p_brief_id,
      case when is_mgr then 'Manager updated brief' else 'Requester updated brief' end,
      change, 'oklch(0.71 0.11 252)');

  if is_mgr then
    if b.requester_id is not null and b.requester_id <> auth.uid() then
      insert into public.notifications (recipient_id, brief_id, type, message)
        values (b.requester_id, p_brief_id, 'brief_updated',
          '"' || updated.title || '" ถูกแก้ไขโดย Creative & Design Manager (' || change || ') · "' ||
          updated.title || '" was updated by the Creative & Design Manager (' || change || ')');
    end if;
  else
    insert into public.notifications (recipient_id, brief_id, type, message)
      select id, p_brief_id, 'brief_updated',
        '"' || updated.title || '" ถูกแก้ไขโดยผู้บรีฟ (' || change || ') · "' ||
        updated.title || '" was updated by the requester (' || change || ')'
      from public.profiles where role = 'manager';
  end if;

  return updated;
end;
$$;

grant execute on function public.update_brief_category(uuid, brief_category) to authenticated;

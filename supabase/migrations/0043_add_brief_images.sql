-- Lets a brief take more than one image at the three places that only accepted one: the
-- requester's reference image (New Brief), the designer's submitted preview and the
-- revision-request image. The existing RPCs still take the first image as before; the rest
-- go through here and land in brief_files like any other attachment, so they show up in
-- the Files list and can be edited or deleted by whoever added them (0037).
create or replace function public.add_brief_images(p_brief_id uuid, p_urls text[], p_name text)
returns int language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  u text;
  n int := 0;
begin
  select * into b from public.briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (public.is_manager() or b.requester_id = auth.uid() or public.is_assigned_designer(p_brief_id)) then
    raise exception 'You cannot add images to this brief';
  end if;
  if coalesce(array_length(p_urls, 1), 0) > 20 then
    raise exception 'Too many images';
  end if;

  foreach u in array coalesce(p_urls, array[]::text[]) loop
    if u is not null and trim(u) <> '' then
      insert into public.brief_files (brief_id, name, ext, url, is_link)
        values (p_brief_id, coalesce(nullif(trim(p_name), ''), 'Image'), 'IMG', trim(u), false);
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

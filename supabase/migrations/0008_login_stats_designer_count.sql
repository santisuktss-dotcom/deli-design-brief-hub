-- designer_count should reflect the invited team size (designer_allowlist), not only
-- designers who have actually completed their first Google sign-in — a newly-invited
-- designer should count immediately, per manager request.
create or replace function public.get_login_stats()
returns table (jobs_count int, assets_count int, designer_count int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.briefs)::int,
    (select coalesce(sum(assets), 0) from public.briefs)::int,
    (select count(*) from public.designer_allowlist)::int;
$$;

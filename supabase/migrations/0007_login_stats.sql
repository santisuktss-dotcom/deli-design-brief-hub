-- The login page renders pre-auth (anon session), but briefs/profiles RLS requires
-- auth.uid() is not null — so the login page's counts always read 0 regardless of real
-- data. Expose just the three aggregate numbers it needs via a security-definer RPC.
create or replace function public.get_login_stats()
returns table (jobs_count int, assets_count int, designer_count int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.briefs)::int,
    (select coalesce(sum(assets), 0) from public.briefs)::int,
    (select count(*) from public.profiles where role = 'designer')::int;
$$;

grant execute on function public.get_login_stats() to anon, authenticated;

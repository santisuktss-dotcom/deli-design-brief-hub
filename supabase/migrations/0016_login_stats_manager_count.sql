-- Adds a manager count to the login page's stat row (0 projects, 1 manager, 2 designers,
-- 6 flow steps). Counted the same way as designer_count (real signed-in profiles), since
-- there's no separate "manager allowlist" table — the app only supports one MANAGER_EMAIL.
-- Postgres won't let CREATE OR REPLACE change a function's return columns, so drop first.
drop function if exists public.get_login_stats();

create function public.get_login_stats()
returns table (jobs_count int, assets_count int, designer_count int, manager_count int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.briefs)::int,
    (select coalesce(sum(assets), 0) from public.briefs)::int,
    (select count(*) from public.designer_allowlist)::int,
    (select count(*) from public.profiles where role = 'manager')::int;
$$;

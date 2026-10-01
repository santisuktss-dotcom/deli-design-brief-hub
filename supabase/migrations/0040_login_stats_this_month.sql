-- Matches the Overview hero's "due this month" scoping (see app/(app)/page.tsx) on the
-- public login page's stat row. jobs_count/assets_count used to be an all-time running
-- tally (same thing Reset Month existed to "fix" by deleting data — see 0039); scope them
-- to briefs whose due_date falls in the current calendar month instead, so the number
-- rolls over on its own next month. designer_count/manager_count are team-size counts,
-- not deadline-related, so they stay all-time.
create or replace function public.get_login_stats()
returns table (jobs_count int, assets_count int, designer_count int, manager_count int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.briefs
      where due_date >= date_trunc('month', current_date)
        and due_date < date_trunc('month', current_date) + interval '1 month')::int,
    (select coalesce(sum(assets), 0) from public.briefs
      where due_date >= date_trunc('month', current_date)
        and due_date < date_trunc('month', current_date) + interval '1 month')::int,
    (select count(*) from public.designer_allowlist)::int,
    (select count(*) from public.profiles where role = 'manager')::int;
$$;

-- Supabase enables the pg-safeupdate extension by default, which rejects any DELETE/UPDATE
-- without a WHERE clause ("DELETE requires a WHERE clause") — reset_month()'s unqualified
-- `delete from briefs` was hitting that. `where true` deletes everything while still
-- satisfying the safety check.
create or replace function public.reset_month()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_report record;
begin
  if not public.is_manager() then
    raise exception 'Only the design manager can reset the month';
  end if;

  select * into v_report from public.get_monthly_report();

  insert into public.monthly_report_snapshots (month, total_projects, total_assets, dept_workload_pct, status_breakdown)
  values (to_char(now(), 'YYYY-MM'), v_report.total_projects, v_report.total_assets, v_report.dept_workload_pct, v_report.status_breakdown);

  delete from public.briefs where true;
end;
$$;

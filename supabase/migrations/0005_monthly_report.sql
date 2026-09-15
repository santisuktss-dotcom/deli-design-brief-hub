-- Monthly report stats + reset-with-snapshot, per README "Monthly Report modal" section.

create or replace function get_monthly_report()
returns table (total_projects int, total_assets int, dept_workload_pct numeric, status_breakdown jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_total_projects int;
  v_total_assets int;
  v_breakdown jsonb;
  v_denom int;
  v_active int;
  v_pct numeric;
begin
  if not is_manager() then
    raise exception 'Only the design manager can view the monthly report';
  end if;

  select count(*), coalesce(sum(assets), 0) into v_total_projects, v_total_assets from briefs;

  select coalesce(jsonb_object_agg(t.status, t.cnt), '{}'::jsonb) into v_breakdown
  from (select status, count(*) cnt from briefs group by status) t;

  select count(*) filter (where status <> 'Cancelled') into v_denom from briefs;
  select count(*) filter (where status in ('Design', 'Revision')) into v_active from briefs;
  v_pct := case when v_denom = 0 then 0 else round(100.0 * v_active / v_denom) end;

  return query select v_total_projects, v_total_assets, v_pct, v_breakdown;
end;
$$;

-- Snapshots current-month stats before clearing live data, so past months stay downloadable.
create or replace function reset_month()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_report record;
begin
  if not is_manager() then
    raise exception 'Only the design manager can reset the month';
  end if;

  select * into v_report from get_monthly_report();

  insert into monthly_report_snapshots (month, total_projects, total_assets, dept_workload_pct, status_breakdown)
  values (to_char(now(), 'YYYY-MM'), v_report.total_projects, v_report.total_assets, v_report.dept_workload_pct, v_report.status_breakdown);

  delete from briefs;
end;
$$;

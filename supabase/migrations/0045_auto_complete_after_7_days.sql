-- Once the manager has reviewed the work (status 'Approved'), the requester has 7 days to
-- confirm. If they don't, the brief completes itself — same outcome as the requester
-- pressing Approve (status Completed + delivery_timing), logged as an automatic approval.
-- The clock starts at the "Reviewed by manager" history row written by approve_brief().
create or replace function public.auto_complete_reviewed_briefs()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n integer := 0;
  timing text;
begin
  for r in
    select b.id, b.title, b.requester_id, b.due_date, h.reviewed_at
    from public.briefs b
    join lateral (
      select max(created_at) as reviewed_at from public.brief_history
      where brief_id = b.id and title = 'Reviewed by manager'
    ) h on true
    where b.status = 'Approved' and h.reviewed_at is not null
      and h.reviewed_at <= now() - interval '7 days'
  loop
    -- Timing is judged on the day the manager signed off, not the day the sweep ran.
    timing := case
      when r.due_date is null then null
      when (r.reviewed_at at time zone 'Asia/Bangkok')::date < r.due_date then 'early'
      when (r.reviewed_at at time zone 'Asia/Bangkok')::date = r.due_date then 'ontime'
      else 'late'
    end;
    update public.briefs set status = 'Completed', delivery_timing = timing where id = r.id;
    insert into public.brief_history (brief_id, title, status_color)
      values (r.id, 'Auto-approved after 7 days', 'oklch(0.5 0.13 156)');
    if r.requester_id is not null then
      insert into public.notifications (recipient_id, brief_id, type, message)
        values (r.requester_id, r.id, 'approved',
          '"' || r.title || '" ถูกปิดงานอัตโนมัติ (ไม่ได้ยืนยันภายใน 7 วัน) · "' || r.title ||
          '" was completed automatically (no confirmation within 7 days)');
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Run daily when pg_cron is available (Supabase: Database > Extensions > pg_cron).
-- Without it the app calls the function itself when the dashboard loads.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('auto-complete-reviewed-briefs', '5 17 * * *',
      'select public.auto_complete_reviewed_briefs()');
  end if;
end $$;

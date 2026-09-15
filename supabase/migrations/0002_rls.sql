-- Row Level Security: coarse visibility only. All mutations go through
-- security-definer RPCs (see 0003_rpcs.sql) so business rules can't be bypassed
-- by writing to tables directly, even by an authenticated client.

create or replace function is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'manager'
  );
$$;

create or replace function is_designer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'designer'
  );
$$;

create or replace function is_assigned_designer(p_brief_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from brief_assignments
    where brief_id = p_brief_id and designer_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table designer_allowlist enable row level security;
alter table company_holidays enable row level security;
alter table briefs enable row level security;
alter table brief_assignments enable row level security;
alter table brief_history enable row level security;
alter table brief_files enable row level security;
alter table brief_submissions enable row level security;
alter table brief_comments enable row level security;
alter table notifications enable row level security;
alter table monthly_report_snapshots enable row level security;
alter table team_capacity_defaults enable row level security;

-- profiles: everyone signed in can read all profiles (needed for assignee names,
-- avatars, nicknames across roles); only the owning user or a manager can update.
create policy profiles_select_all on profiles for select using (auth.uid() is not null);
create policy profiles_update_self on profiles for update using (id = auth.uid() or is_manager());
create policy profiles_insert_self on profiles for insert with check (id = auth.uid());

-- designer_allowlist / company_holidays / team_capacity_defaults: manager-managed,
-- readable by anyone signed in (needed client-side for date-picker blocking, allowlist checks).
create policy allowlist_select on designer_allowlist for select using (auth.uid() is not null);
create policy allowlist_manage on designer_allowlist for all using (is_manager()) with check (is_manager());

create policy holidays_select on company_holidays for select using (auth.uid() is not null);
create policy holidays_manage on company_holidays for all using (is_manager()) with check (is_manager());

create policy capacity_defaults_select on team_capacity_defaults for select using (auth.uid() is not null);
create policy capacity_defaults_manage on team_capacity_defaults for all using (is_manager()) with check (is_manager());

-- briefs: manager sees all; requester sees own; designer sees assigned.
create policy briefs_select on briefs for select using (
  is_manager()
  or requester_id = auth.uid()
  or is_assigned_designer(id)
);
-- Direct inserts/updates are blocked by RLS; use the create_brief / *_brief RPCs.
create policy briefs_insert_none on briefs for insert with check (false);
create policy briefs_update_none on briefs for update using (false);

create policy brief_assignments_select on brief_assignments for select using (
  is_manager()
  or designer_id = auth.uid()
  or exists (select 1 from briefs b where b.id = brief_id and b.requester_id = auth.uid())
);
create policy brief_assignments_write_none on brief_assignments for all using (false) with check (false);

create policy brief_history_select on brief_history for select using (
  is_manager()
  or is_assigned_designer(brief_id)
  or exists (select 1 from briefs b where b.id = brief_id and b.requester_id = auth.uid())
);
create policy brief_history_write_none on brief_history for all using (false) with check (false);

create policy brief_files_select on brief_files for select using (
  is_manager()
  or is_assigned_designer(brief_id)
  or exists (select 1 from briefs b where b.id = brief_id and b.requester_id = auth.uid())
);
create policy brief_files_write_none on brief_files for all using (false) with check (false);

create policy brief_submissions_select on brief_submissions for select using (
  is_manager()
  or is_assigned_designer(brief_id)
  or exists (select 1 from briefs b where b.id = brief_id and b.requester_id = auth.uid())
);
create policy brief_submissions_write_none on brief_submissions for all using (false) with check (false);

-- comments: same visibility as the parent brief, but any of those roles may post directly
-- (comments carry no business-rule gating, unlike status-changing actions).
create policy brief_comments_select on brief_comments for select using (
  is_manager()
  or is_assigned_designer(brief_id)
  or exists (select 1 from briefs b where b.id = brief_id and b.requester_id = auth.uid())
);
create policy brief_comments_insert on brief_comments for insert with check (
  author_id = auth.uid()
  and (
    is_manager()
    or is_assigned_designer(brief_id)
    or exists (select 1 from briefs b where b.id = brief_id and b.requester_id = auth.uid())
  )
);

-- notifications: each recipient sees only their own rows; can mark their own as read.
create policy notifications_select_own on notifications for select using (recipient_id = auth.uid());
create policy notifications_update_own on notifications for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
create policy notifications_insert_none on notifications for insert with check (false);

-- monthly report snapshots: manager-only.
create policy report_snapshots_select on monthly_report_snapshots for select using (is_manager());
create policy report_snapshots_write_none on monthly_report_snapshots for all using (false) with check (false);

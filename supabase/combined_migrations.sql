-- Deli Design Brief Hub — core schema
-- Ported from the design prototype's STATUS/CATS/TEAM constants and README data model.

create extension if not exists "pgcrypto";

create type user_role as enum ('manager', 'designer', 'requester');

create type brief_status as enum (
  'Brief', 'Review', 'Design', 'Revision', 'Approved', 'Completed', 'Cancelled', 'OnHold'
);

create type brief_category as enum (
  'Product', 'E-Commerce', 'Modern Trade', 'General Trade', 'Corporate'
);

create type notification_type as enum (
  'assigned', 'approved', 'revision_requested', 'submitted', 'cancelled', 'hold'
);

-- Extends auth.users. Row is created on first login by the auth callback/confirm routes.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role user_role not null,
  name text not null,
  name_en text,
  nickname text,
  initials text not null,
  department text,
  capacity_pct int not null default 0,
  capacity_cap int not null default 0,
  created_at timestamptz not null default now()
);

-- Manager-managed invite list gating designer magic-link sign-in.
create table designer_allowlist (
  email text primary key,
  name text not null,
  name_en text,
  initials text not null,
  invited_at timestamptz not null default now()
);

-- Manager-editable blocked non-working days, in addition to weekends.
create table company_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  label text
);

create table briefs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  category brief_category not null,
  status brief_status not null default 'Brief',
  requester_id uuid references profiles (id),
  requester_email text not null,
  requester_name text not null,
  brief_text text,
  deliverable text,
  channel text,
  round int,
  assets int not null default 1,
  assets_done int not null default 0,
  start_date date,
  due_date date not null,
  delivery_timing text check (delivery_timing in ('early', 'ontime', 'late')),
  accepted boolean not null default false,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index briefs_requester_id_idx on briefs (requester_id);
create index briefs_status_idx on briefs (status);

create table brief_assignments (
  brief_id uuid not null references briefs (id) on delete cascade,
  designer_id uuid not null references profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (brief_id, designer_id)
);

create table brief_history (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs (id) on delete cascade,
  title text not null,
  note text,
  status_color text,
  created_at timestamptz not null default now()
);

create table brief_files (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs (id) on delete cascade,
  name text not null,
  ext text,
  size text,
  url text not null,
  is_link boolean not null default false,
  created_at timestamptz not null default now()
);

create table brief_submissions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs (id) on delete cascade,
  submitted_by uuid references profiles (id),
  link text,
  image_url text,
  created_at timestamptz not null default now()
);

create table brief_comments (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs (id) on delete cascade,
  author_id uuid references profiles (id),
  author_name text not null,
  text text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- Real per-recipient rows — replaces the prototype's single shared in-memory notification list.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  brief_id uuid references briefs (id) on delete cascade,
  type notification_type not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on notifications (recipient_id, read);

create table monthly_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  total_projects int not null,
  total_assets int not null,
  dept_workload_pct numeric not null,
  status_breakdown jsonb not null,
  created_at timestamptz not null default now()
);

-- Seed lookup by email since profiles can't be pre-populated before first login.
create table team_capacity_defaults (
  email text primary key,
  name text not null,
  share_pct int not null,
  capacity int not null
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger briefs_set_updated_at
before update on briefs
for each row execute function set_updated_at();
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
-- Security-definer RPCs: the only way to mutate briefs. This is what makes the
-- business rules server-enforced instead of UI-only, per README "Business Rules".

create or replace function next_brief_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  ym text := to_char(now(), 'YYMM');
  seq int;
begin
  select count(*) + 1 into seq from briefs where code like 'DL-' || ym || '-%';
  return 'DL-' || ym || '-' || lpad(seq::text, 2, '0');
end;
$$;

create or replace function is_blocked_date(p_date date)
returns boolean language sql stable security definer set search_path = public as $$
  select extract(dow from p_date) in (0, 6)
    or exists (select 1 from company_holidays where holiday_date = p_date);
$$;

-- Manager or requester creates a brief. Manager may backdate/create on behalf of
-- another department by passing p_requester_email/p_requester_name explicitly.
create or replace function create_brief(
  p_title text, p_category brief_category, p_brief_text text, p_deliverable text,
  p_channel text, p_round int, p_assets int, p_due_date date,
  p_requester_name text default null, p_requester_email text default null
) returns briefs language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  new_brief briefs;
begin
  select * into me from profiles where id = auth.uid();
  if me is null or me.role not in ('manager', 'requester') then
    raise exception 'Only the design manager or a requester can create a brief';
  end if;
  if is_blocked_date(p_due_date) then
    raise exception 'Due date cannot fall on a weekend or company holiday';
  end if;
  if coalesce(trim(p_requester_name), trim(me.name)) = '' then
    raise exception 'A requester name is required';
  end if;

  insert into briefs (
    code, title, category, brief_text, deliverable, channel, round, assets,
    due_date, requester_id, requester_email, requester_name
  ) values (
    next_brief_code(), p_title, p_category, p_brief_text, p_deliverable, p_channel, p_round,
    coalesce(p_assets, 1), p_due_date, me.id,
    coalesce(p_requester_email, me.email), coalesce(p_requester_name, me.name)
  ) returning * into new_brief;

  insert into brief_history (brief_id, title, note, status_color)
    values (new_brief.id, 'Brief received', null, 'rgba(26,22,20,.22)');

  return new_brief;
end;
$$;

-- Gate 1 of 2: manager accepts. Work still cannot start until a designer is assigned.
create or replace function accept_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  updated briefs;
begin
  if not is_manager() then
    raise exception 'Only the design manager can accept a brief';
  end if;
  update briefs set accepted = true, accepted_at = now()
    where id = p_brief_id and status = 'Brief'
    returning * into updated;
  if updated is null then
    raise exception 'Brief not found or not in an acceptable state';
  end if;
  insert into brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Brief accepted', 'oklch(0.5 0.13 156)');
  return updated;
end;
$$;

-- Gate 2 of 2: assigning a designer to an accepted brief starts the work (-> Design, start_date stamped).
create or replace function assign_designer(p_brief_id uuid, p_designer_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  d profiles;
  updated briefs;
begin
  if not is_manager() then
    raise exception 'Only the design manager can assign a designer';
  end if;
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not b.accepted then
    raise exception 'Accept the brief before assigning a designer';
  end if;
  select * into d from profiles where id = p_designer_id and role = 'designer';
  if d is null then raise exception 'Designer not found'; end if;

  insert into brief_assignments (brief_id, designer_id) values (p_brief_id, p_designer_id)
    on conflict do nothing;

  update briefs set status = 'Design', start_date = coalesce(start_date, current_date)
    where id = p_brief_id and status in ('Brief', 'Review')
    returning * into updated;
  if updated is null then select * into updated from briefs where id = p_brief_id; end if;

  insert into brief_history (brief_id, title, note, status_color)
    values (p_brief_id, 'Designer assigned', d.name, 'oklch(0.52 0.14 250)');
  insert into notifications (recipient_id, brief_id, type, message)
    values (p_designer_id, p_brief_id, 'assigned',
      'Design Manager assigned "' || b.title || '" to you');

  return updated;
end;
$$;

-- Designer (or manager) submits work-in-progress or final files for review.
create or replace function submit_work(p_brief_id uuid, p_link text, p_image_url text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (is_manager() or is_assigned_designer(p_brief_id)) then
    raise exception 'Only the assigned designer or the design manager can submit work';
  end if;

  insert into brief_submissions (brief_id, submitted_by, link, image_url)
    values (p_brief_id, auth.uid(), p_link, p_image_url);
  if p_link is not null and trim(p_link) <> '' then
    insert into brief_files (brief_id, name, ext, url, is_link) values (p_brief_id, p_link, 'LINK', p_link, true);
  end if;

  insert into brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Work submitted', 'oklch(0.52 0.14 250)');
  insert into notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'submitted', 'Designer submitted "' || b.title || '" — awaiting Design Manager review'
    from profiles where role = 'manager';

  return b;
end;
$$;

-- Manager (or the requester on their own brief) approves — this is the final signoff, closing the job.
create or replace function approve_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  timing text;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the design manager or the requester can approve this brief';
  end if;
  if not exists (select 1 from brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot approve before the designer has submitted work';
  end if;

  timing := case
    when current_date < b.due_date then 'early'
    when current_date = b.due_date then 'ontime'
    else 'late'
  end;

  update briefs set status = 'Completed', delivery_timing = timing
    where id = p_brief_id returning * into updated;

  insert into brief_history (brief_id, title, status_color)
    values (p_brief_id, 'Approved', 'oklch(0.5 0.13 156)');
  insert into notifications (recipient_id, brief_id, type, message)
    values (b.requester_id, p_brief_id, 'approved', '"' || b.title || '" was approved');

  return updated;
end;
$$;

-- Manager (or the requester on their own brief) requests a revision — only once a submission exists.
create or replace function request_revision(p_brief_id uuid, p_note text, p_image_url text)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
  assignee uuid;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if not (is_manager() or b.requester_id = auth.uid()) then
    raise exception 'Only the design manager or the requester can request a revision';
  end if;
  if not exists (select 1 from brief_submissions where brief_id = p_brief_id) then
    raise exception 'Cannot request a revision before the designer has submitted work';
  end if;

  update briefs set status = 'Revision' where id = p_brief_id returning * into updated;

  insert into brief_comments (brief_id, author_id, author_name, text, image_url)
    values (p_brief_id, auth.uid(), coalesce((select name from profiles where id = auth.uid()), 'Requester'), coalesce(p_note, ''), p_image_url);
  insert into brief_history (brief_id, title, note, status_color)
    values (p_brief_id, 'Revision requested', p_note, 'oklch(0.62 0.14 68)');

  select designer_id into assignee from brief_assignments where brief_id = p_brief_id limit 1;
  if assignee is not null then
    insert into notifications (recipient_id, brief_id, type, message)
      values (assignee, p_brief_id, 'revision_requested', 'Revision requested for "' || b.title || '"');
  end if;

  return updated;
end;
$$;

-- Requester-only, and only before the manager has accepted — mirrors canCancelHold in the prototype.
create or replace function cancel_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then raise exception 'Only the requester can cancel this brief'; end if;
  if b.status <> 'Brief' or b.accepted then
    raise exception 'A brief can only be cancelled before the design manager accepts it';
  end if;

  update briefs set status = 'Cancelled' where id = p_brief_id returning * into updated;
  insert into brief_history (brief_id, title, status_color) values (p_brief_id, 'Cancel requested', '#8E0E22');
  insert into notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'cancelled', 'Requester asked to cancel "' || b.title || '"' from profiles where role = 'manager';

  return updated;
end;
$$;

create or replace function hold_brief(p_brief_id uuid)
returns briefs language plpgsql security definer set search_path = public as $$
declare
  b briefs;
  updated briefs;
begin
  select * into b from briefs where id = p_brief_id;
  if b is null then raise exception 'Brief not found'; end if;
  if b.requester_id <> auth.uid() then raise exception 'Only the requester can put this brief on hold'; end if;
  if b.status <> 'Brief' or b.accepted then
    raise exception 'A brief can only be put on hold before the design manager accepts it';
  end if;

  update briefs set status = 'OnHold' where id = p_brief_id returning * into updated;
  insert into brief_history (brief_id, title, status_color) values (p_brief_id, 'Hold requested', 'oklch(0.62 0.1 60)');
  insert into notifications (recipient_id, brief_id, type, message)
    select id, p_brief_id, 'hold', 'Requester asked to put "' || b.title || '" on hold' from profiles where role = 'manager';

  return updated;
end;
$$;
-- Callable pre-auth (anon) so the login page can check the designer allowlist
-- before sending a magic link, without exposing the allowlist table itself.
create or replace function check_designer_allowlist(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from designer_allowlist where email = lower(p_email));
$$;

grant execute on function check_designer_allowlist(text) to anon, authenticated;

-- Looks up the profile fields to seed on first designer login (name/initials from
-- the allowlist), used by the auth confirm route right after verifyOtp.
create or replace function designer_allowlist_entry(p_email text)
returns table (name text, name_en text, initials text)
language sql stable security definer set search_path = public as $$
  select name, name_en, initials from designer_allowlist where email = lower(p_email);
$$;

grant execute on function designer_allowlist_entry(text) to authenticated;

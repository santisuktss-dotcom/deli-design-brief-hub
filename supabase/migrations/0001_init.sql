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

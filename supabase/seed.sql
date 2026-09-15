-- Seed data ported from the prototype's INVITED_DESIGNERS / DESIGNER_BY_EMAIL / HOLIDAYS / TEAM constants.

insert into designer_allowlist (email, name, name_en, initials) values
  ('delithaidesigner2@gmail.com', 'Designer1', 'Designer1', 'D1'),
  ('delithaidesigner3@gmail.com', 'Designer2', 'Designer2', 'D2')
on conflict (email) do nothing;

-- Kept as a supported concept per README (currently empty in the live prototype;
-- the manager can add rows here or via the app later).
-- insert into company_holidays (holiday_date, label) values ('2026-10-13', 'Public holiday');

insert into team_capacity_defaults (email, name, share_pct, capacity) values
  ('delithaidesigner@gmail.com', 'Design Manager', 20, 4),
  ('delithaidesigner2@gmail.com', 'Designer1', 40, 8),
  ('delithaidesigner3@gmail.com', 'Designer2', 40, 8)
on conflict (email) do nothing;

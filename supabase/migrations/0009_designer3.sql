-- Third designer, per manager request: reuses the same Google account as the
-- Creative & Design Manager (delithaidesigner@gmail.com) — signing in via the
-- "Designer" button on the login page grants the designer role for that session's
-- profile row; signing in via the "Creative & Design Manager" button grants manager.
insert into public.designer_allowlist (email, name, name_en, initials) values
  ('delithaidesigner@gmail.com', 'Designer3', 'Designer3', 'D3')
on conflict (email) do nothing;

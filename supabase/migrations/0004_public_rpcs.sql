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

-- Manager wants job codes to read as DL-DDMMYY-NN (the actual date) instead of
-- DL-YYMM-NN (year+month only). Kept the -NN sequence suffix since date alone
-- collides whenever 2+ briefs are created on the same day.
create or replace function public.next_brief_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  dmy text := to_char(now(), 'DDMMYY');
  seq int;
begin
  select count(*) + 1 into seq from public.briefs where code like 'DL-' || dmy || '-%';
  return 'DL-' || dmy || '-' || lpad(seq::text, 2, '0');
end;
$$;

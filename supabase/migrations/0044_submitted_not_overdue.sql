-- A brief whose work has been submitted is waiting on review, not on the designer, so it
-- must stop counting as overdue. submit_work() only inserts a brief_submissions row (the
-- status stays Design/Revision until the manager reviews), so the UI had no way to tell
-- "still being designed" from "handed in, awaiting review". briefs.submitted_at is that
-- marker: set whenever work is submitted, cleared when a revision is requested (the
-- designer is on the clock again). Done with triggers so submit_work/request_revision
-- keep their current bodies untouched.
alter table public.briefs add column if not exists submitted_at timestamptz;

create or replace function public.briefs_mark_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.briefs set submitted_at = now() where id = new.brief_id;
  return new;
end;
$$;

drop trigger if exists brief_submissions_mark_submitted on public.brief_submissions;
create trigger brief_submissions_mark_submitted
  after insert on public.brief_submissions
  for each row execute function public.briefs_mark_submitted();

create or replace function public.briefs_clear_submitted()
returns trigger language plpgsql as $$
begin
  if new.status = 'Revision' and old.status is distinct from 'Revision' then
    new.submitted_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists briefs_clear_submitted_on_revision on public.briefs;
create trigger briefs_clear_submitted_on_revision
  before update on public.briefs
  for each row execute function public.briefs_clear_submitted();

-- Backfill: latest submission, unless a revision was requested after it.
update public.briefs b set submitted_at = s.last_at
from (select brief_id, max(created_at) as last_at from public.brief_submissions group by brief_id) s
where s.brief_id = b.id
  and not exists (
    select 1 from public.brief_history h
    where h.brief_id = b.id and h.title = 'Revision requested' and h.created_at > s.last_at
  );

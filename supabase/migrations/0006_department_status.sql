-- Department Status is now a manually-set flag (open / busy / over), not a calculated
-- capacity percentage — the design manager clicks a row to change it (per manager request,
-- replacing the prototype's auto-calculated 20%/40% capacity math).

create table public.department_status (
  id boolean primary key default true check (id),
  status text not null default 'open' check (status in ('open', 'busy', 'over')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.department_status (id, status) values (true, 'open');

alter table public.department_status enable row level security;

create policy department_status_select on public.department_status for select using (true);

-- No direct table mutation policy — all changes go through set_department_status().

create or replace function public.set_department_status(p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then
    raise exception 'Only the design manager can change department status';
  end if;

  if p_status not in ('open', 'busy', 'over') then
    raise exception 'Invalid department status';
  end if;

  update public.department_status
  set status = p_status, updated_at = now(), updated_by = auth.uid()
  where id = true;
end;
$$;

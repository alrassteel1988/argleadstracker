alter table public.leads
  add column if not exists imported_at timestamptz,
  add column if not exists imported_by uuid references auth.users(id);

create index if not exists leads_imported_at_idx
  on public.leads (imported_at desc)
  where imported_at is not null;

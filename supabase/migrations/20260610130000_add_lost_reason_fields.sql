alter table public.leads
  add column if not exists lost_reason text,
  add column if not exists lost_reason_detail text,
  add column if not exists lost_competitor text,
  add column if not exists lost_at timestamptz,
  add column if not exists lost_by uuid references auth.users(id);

create index if not exists leads_lost_reason_idx
  on public.leads (lost_reason)
  where lost_reason is not null;

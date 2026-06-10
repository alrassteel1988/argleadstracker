alter table public.leads
  add column if not exists stage_updated_at timestamptz,
  add column if not exists stage_updated_by uuid references auth.users(id);

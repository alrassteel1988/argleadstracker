create table if not exists public.lead_intelligence_reports (
  id text primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'researching', 'generating_pdf', 'completed', 'failed')),
  report_json jsonb,
  weighted_score numeric(3,1),
  displayed_score integer check (displayed_score is null or displayed_score between 1 and 10),
  priority text check (priority is null or priority in ('', 'A', 'B', 'C', 'D')),
  demand_classification text,
  steel_demand text,
  buyer_classification text,
  workflow_version text not null,
  provider_metadata jsonb not null default '{}'::jsonb,
  research_timestamp timestamptz,
  pdf_storage_key text,
  pdf_url text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  initiating_user_id uuid references public.profiles(id),
  initiated_by uuid references public.profiles(id),
  is_current boolean not null default false,
  superseded_at timestamptz
);

create index if not exists lead_intelligence_reports_lead_created_idx
  on public.lead_intelligence_reports (lead_id, created_at desc);
create index if not exists lead_intelligence_reports_current_idx
  on public.lead_intelligence_reports (lead_id)
  where is_current and status = 'completed';
create index if not exists lead_intelligence_reports_job_idx
  on public.lead_intelligence_reports (status, created_at)
  where status in ('queued', 'researching', 'generating_pdf');

alter table public.lead_intelligence_reports enable row level security;
alter table public.lead_intelligence_reports force row level security;

grant select, insert, update on public.lead_intelligence_reports to authenticated;

drop policy if exists "lead intelligence read by lead access" on public.lead_intelligence_reports;
create policy "lead intelligence read by lead access" on public.lead_intelligence_reports
  for select to authenticated
  using (private.crm_can_access_lead(lead_id));

drop policy if exists "lead intelligence queue by lead access" on public.lead_intelligence_reports;
create policy "lead intelligence queue by lead access" on public.lead_intelligence_reports
  for insert to authenticated
  with check (
    private.crm_can_access_lead(lead_id)
    and initiating_user_id = (select auth.uid())
    and status = 'queued'
    and report_json is null
    and coalesce(pdf_storage_key, '') = ''
  );

drop policy if exists "lead intelligence leadership update" on public.lead_intelligence_reports;
create policy "lead intelligence leadership update" on public.lead_intelligence_reports
  for update to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-intelligence-reports', 'lead-intelligence-reports', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "lead intelligence PDFs are server managed" on storage.objects;
create policy "lead intelligence PDFs are server managed" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lead-intelligence-reports'
    and split_part(name, '/', 1) = 'lead-intelligence'
    and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
    and private.crm_can_access_lead(split_part(name, '/', 2)::uuid)
  );

-- Writes are intentionally performed by the server-side service role worker.
-- Do not add broad authenticated insert/update policies for this bucket.
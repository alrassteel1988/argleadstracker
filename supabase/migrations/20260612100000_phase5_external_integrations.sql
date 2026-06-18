alter table public.leads
  add column if not exists auto_enrichment jsonb,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  service text not null,
  action text not null,
  status text not null,
  duration_ms integer not null default 0,
  error text,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.market_intelligence (
  id text primary key,
  title text not null,
  source text not null,
  url text unique,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  summary text,
  sector_tags text[] not null default '{}',
  geography_tags text[] not null default '{}',
  companies_mentioned text[] not null default '{}',
  matched_company_ids text[] not null default '{}',
  relevance_score numeric not null default 0
);

create table if not exists public.market_intelligence_archive (
  like public.market_intelligence including all
);

create index if not exists integration_logs_timestamp_idx on public.integration_logs (timestamp desc);
create index if not exists integration_logs_service_idx on public.integration_logs (service, status);
create index if not exists market_intelligence_published_idx on public.market_intelligence (published_at desc);
create index if not exists market_intelligence_tags_idx on public.market_intelligence using gin (sector_tags, geography_tags);

alter table public.integration_logs enable row level security;
alter table public.market_intelligence enable row level security;
alter table public.market_intelligence_archive enable row level security;

drop policy if exists "Authenticated users can insert integration logs" on public.integration_logs;
create policy "Authenticated users can insert integration logs" on public.integration_logs
  for insert to authenticated
  with check (auth.uid() = created_by or created_by is null);

drop policy if exists "Admins can read integration logs" on public.integration_logs;
create policy "Admins can read integration logs" on public.integration_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager')
    )
  );

drop policy if exists "Authenticated users can read market intelligence" on public.market_intelligence;
create policy "Authenticated users can read market intelligence" on public.market_intelligence
  for select to authenticated
  using (true);

drop policy if exists "Admins can manage market intelligence" on public.market_intelligence;
create policy "Admins can manage market intelligence" on public.market_intelligence
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager')
    )
  );

drop policy if exists "Authenticated users can read archived market intelligence" on public.market_intelligence_archive;
create policy "Authenticated users can read archived market intelligence" on public.market_intelligence_archive
  for select to authenticated
  using (true);

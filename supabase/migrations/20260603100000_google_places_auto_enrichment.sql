alter table public.companies add column if not exists legal_name text not null default '';
alter table public.companies add column if not exists year_established text not null default '';
alter table public.companies add column if not exists business_category text not null default '';
alter table public.companies add column if not exists opening_hours jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists products_services_remarks text not null default '';
alter table public.companies add column if not exists enrichment_source text not null default '';
alter table public.companies add column if not exists enriched_at timestamptz;

alter table public.leads add column if not exists legal_name text not null default '';
alter table public.leads add column if not exists year_established text not null default '';
alter table public.leads add column if not exists business_category text not null default '';
alter table public.leads add column if not exists opening_hours jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists products_services_remarks text not null default '';
alter table public.leads add column if not exists enrichment_source text not null default '';
alter table public.leads add column if not exists enriched_at timestamptz;

update public.companies set enrichment_status = 'enriched' where enrichment_status = 'completed';
update public.leads set enrichment_status = 'enriched' where enrichment_status = 'completed';
update public.enrichment_status set status = 'enriched' where status = 'completed';

alter table public.companies drop constraint if exists companies_enrichment_status_check;
alter table public.companies add constraint companies_enrichment_status_check
  check (enrichment_status in ('pending', 'enriched', 'partial', 'failed', 'not_found'));

alter table public.leads drop constraint if exists leads_enrichment_status_check;
alter table public.leads add constraint leads_enrichment_status_check
  check (enrichment_status in ('pending', 'enriched', 'partial', 'failed', 'not_found'));

alter table public.enrichment_status drop constraint if exists enrichment_status_status_check;
alter table public.enrichment_status add constraint enrichment_status_status_check
  check (status in ('pending', 'enriched', 'partial', 'failed', 'not_found'));

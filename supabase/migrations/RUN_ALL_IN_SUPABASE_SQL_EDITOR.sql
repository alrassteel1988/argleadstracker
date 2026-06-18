-- BEGIN 20260602154500_create_lead_enrichment_backend.sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'salesman' check (role in ('admin', 'salesman')),
  territory text not null default 'Dubai',
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  industry text not null default '',
  location text not null default '',
  address text not null default '',
  phone text not null default '',
  website text not null default '',
  google_place_id text,
  google_maps_url text not null default '',
  google_rating numeric(3, 2),
  google_review_count integer not null default 0,
  enrichment_status text not null default 'pending' check (enrichment_status in ('pending', 'completed', 'failed')),
  enrichment_updated_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists industry text not null default '';
alter table public.companies add column if not exists location text not null default '';
alter table public.companies add column if not exists address text not null default '';
alter table public.companies add column if not exists phone text not null default '';
alter table public.companies add column if not exists website text not null default '';
alter table public.companies add column if not exists google_place_id text;
alter table public.companies add column if not exists google_maps_url text not null default '';
alter table public.companies add column if not exists google_rating numeric(3, 2);
alter table public.companies add column if not exists google_review_count integer not null default 0;
alter table public.companies add column if not exists enrichment_status text not null default 'pending';
alter table public.companies add column if not exists enrichment_updated_at timestamptz;
alter table public.companies add column if not exists created_by uuid references auth.users(id);
alter table public.companies add column if not exists updated_at timestamptz not null default now();

create unique index if not exists companies_google_place_id_key
  on public.companies (google_place_id)
  where google_place_id is not null and google_place_id <> '';
create unique index if not exists companies_website_key
  on public.companies (lower(website))
  where website <> '';

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  industry text not null default '',
  location text not null default '',
  address text not null default '',
  phone text not null default '',
  website text not null default '',
  google_place_id text,
  google_maps_url text not null default '',
  google_rating numeric(3, 2),
  google_review_count integer not null default 0,
  contact_name text not null default '',
  contact_email text not null default '',
  hunter_confidence_score integer,
  lead_status text not null default 'New',
  notes text not null default '',
  territory text not null default 'Dubai',
  assigned_salesman text not null default 'Unassigned',
  priority text not null default 'New',
  estimated_value numeric(14, 2) not null default 0,
  product_interest text not null default '',
  activity_purpose text not null default 'Company Introductory',
  next_action text not null default 'To Call',
  next_action_date date not null default current_date,
  last_activity date not null default current_date,
  source text not null default 'Manual entry',
  activities jsonb not null default '[]'::jsonb,
  enrichment_status text not null default 'pending' check (enrichment_status in ('pending', 'completed', 'failed')),
  enrichment_updated_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.leads add column if not exists location text not null default '';
alter table public.leads add column if not exists address text not null default '';
alter table public.leads add column if not exists website text not null default '';
alter table public.leads add column if not exists google_place_id text;
alter table public.leads add column if not exists google_maps_url text not null default '';
alter table public.leads add column if not exists google_rating numeric(3, 2);
alter table public.leads add column if not exists google_review_count integer not null default 0;
alter table public.leads add column if not exists contact_email text not null default '';
alter table public.leads add column if not exists hunter_confidence_score integer;
alter table public.leads add column if not exists lead_status text not null default 'New';
alter table public.leads add column if not exists territory text not null default 'Dubai';
alter table public.leads add column if not exists assigned_salesman text not null default 'Unassigned';
alter table public.leads add column if not exists priority text not null default 'New';
alter table public.leads add column if not exists estimated_value numeric(14, 2) not null default 0;
alter table public.leads add column if not exists product_interest text not null default '';
alter table public.leads add column if not exists activity_purpose text not null default 'Company Introductory';
alter table public.leads add column if not exists next_action text not null default 'To Call';
alter table public.leads add column if not exists next_action_date date not null default current_date;
alter table public.leads add column if not exists last_activity date not null default current_date;
alter table public.leads add column if not exists source text not null default 'Manual entry';
alter table public.leads add column if not exists activities jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists enrichment_status text not null default 'pending';
alter table public.leads add column if not exists enrichment_updated_at timestamptz;
alter table public.leads add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.leads add column if not exists assigned_to uuid references auth.users(id);
alter table public.leads add column if not exists updated_at timestamptz not null default now();

create unique index if not exists leads_google_place_id_key
  on public.leads (google_place_id)
  where google_place_id is not null and google_place_id <> '';

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  contact_name text not null default '',
  contact_email text not null,
  phone text not null default '',
  contact_type text not null default '',
  hunter_confidence_score integer,
  source_data jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, contact_email)
);

alter table public.contacts add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.contacts add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.contacts add column if not exists contact_name text not null default '';
alter table public.contacts add column if not exists contact_email text not null default '';
alter table public.contacts add column if not exists phone text not null default '';
alter table public.contacts add column if not exists contact_type text not null default '';
alter table public.contacts add column if not exists hunter_confidence_score integer;
alter table public.contacts add column if not exists source_data jsonb not null default '[]'::jsonb;
alter table public.contacts add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.contacts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  keyword text not null,
  location text not null default '',
  provider text not null check (provider in ('google_places', 'hunter')),
  result_count integer not null default 0,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  error_message text not null default '',
  created_at timestamptz not null default now()
);

alter table public.search_history add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.search_history add column if not exists keyword text not null default '';
alter table public.search_history add column if not exists location text not null default '';
alter table public.search_history add column if not exists provider text not null default 'google_places';
alter table public.search_history add column if not exists result_count integer not null default 0;
alter table public.search_history add column if not exists status text not null default 'completed';
alter table public.search_history add column if not exists error_message text not null default '';

create table if not exists public.enrichment_status (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  provider text not null check (provider in ('google_places', 'hunter')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  details jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, provider)
);

alter table public.enrichment_status add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.enrichment_status add column if not exists provider text not null default 'google_places';
alter table public.enrichment_status add column if not exists status text not null default 'pending';
alter table public.enrichment_status add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.enrichment_status add column if not exists error_message text not null default '';
alter table public.enrichment_status add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.enrichment_status add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();
drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts
for each row execute function public.set_updated_at();
drop trigger if exists enrichment_status_set_updated_at on public.enrichment_status;
create trigger enrichment_status_set_updated_at before update on public.enrichment_status
for each row execute function public.set_updated_at();

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, territory)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'salesman' end,
    coalesce(new.raw_user_meta_data ->> 'territory', 'Dubai')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert on public.search_history to authenticated;
grant select, insert, update on public.enrichment_status to authenticated;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.leads enable row level security;
alter table public.contacts enable row level security;
alter table public.search_history enable row level security;
alter table public.enrichment_status enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Authenticated users can read companies" on public.companies;
drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Authenticated users can update companies" on public.companies;
drop policy if exists "Authenticated users can delete companies" on public.companies;
drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can create leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Authenticated users can read contacts" on public.contacts;
drop policy if exists "Authenticated users can create contacts" on public.contacts;
drop policy if exists "Authenticated users can update contacts" on public.contacts;
drop policy if exists "Authenticated users can delete contacts" on public.contacts;
drop policy if exists "Users can read own searches" on public.search_history;
drop policy if exists "Users can create own searches" on public.search_history;
drop policy if exists "Authenticated users can read enrichment status" on public.enrichment_status;
drop policy if exists "Authenticated users can create enrichment status" on public.enrichment_status;
drop policy if exists "Authenticated users can update enrichment status" on public.enrichment_status;

create policy "Authenticated users can read profiles" on public.profiles
  for select to authenticated using (true);
create policy "Authenticated users can read companies" on public.companies
  for select to authenticated using (true);
create policy "Authenticated users can create companies" on public.companies
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update companies" on public.companies
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete companies" on public.companies
  for delete to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can read leads" on public.leads
  for select to authenticated using (true);
create policy "Authenticated users can create leads" on public.leads
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update leads" on public.leads
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete leads" on public.leads
  for delete to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can read contacts" on public.contacts
  for select to authenticated using (true);
create policy "Authenticated users can create contacts" on public.contacts
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update contacts" on public.contacts
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete contacts" on public.contacts
  for delete to authenticated using ((select auth.uid()) is not null);
create policy "Users can read own searches" on public.search_history
  for select to authenticated using (created_by = (select auth.uid()));
create policy "Users can create own searches" on public.search_history
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can read enrichment status" on public.enrichment_status
  for select to authenticated using (true);
create policy "Authenticated users can create enrichment status" on public.enrichment_status
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update enrichment status" on public.enrichment_status
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create index if not exists companies_created_by_idx on public.companies(created_by);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists contacts_created_by_idx on public.contacts(created_by);
create index if not exists enrichment_status_created_by_idx on public.enrichment_status(created_by);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists search_history_created_by_idx on public.search_history(created_by);

-- END 20260602154500_create_lead_enrichment_backend.sql

-- BEGIN 20260602161000_harden_shared_crm_rls.sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Users can read own leads" on public.leads;
drop policy if exists "Users can insert own leads" on public.leads;
drop policy if exists "Users can update own leads" on public.leads;
drop policy if exists "Users can delete own leads" on public.leads;

drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Authenticated users can update companies" on public.companies;
drop policy if exists "Authenticated users can delete companies" on public.companies;
drop policy if exists "Authenticated users can create leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Authenticated users can create contacts" on public.contacts;
drop policy if exists "Authenticated users can update contacts" on public.contacts;
drop policy if exists "Authenticated users can delete contacts" on public.contacts;
drop policy if exists "Users can read own searches" on public.search_history;
drop policy if exists "Users can create own searches" on public.search_history;
drop policy if exists "Authenticated users can create enrichment status" on public.enrichment_status;
drop policy if exists "Authenticated users can update enrichment status" on public.enrichment_status;

create policy "Authenticated users can create companies" on public.companies
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update companies" on public.companies
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete companies" on public.companies
  for delete to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can create leads" on public.leads
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update leads" on public.leads
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete leads" on public.leads
  for delete to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can create contacts" on public.contacts
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update contacts" on public.contacts
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete contacts" on public.contacts
  for delete to authenticated using ((select auth.uid()) is not null);
create policy "Users can read own searches" on public.search_history
  for select to authenticated using (created_by = (select auth.uid()));
create policy "Users can create own searches" on public.search_history
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can create enrichment status" on public.enrichment_status
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Authenticated users can update enrichment status" on public.enrichment_status
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create index if not exists companies_created_by_idx on public.companies(created_by);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists contacts_created_by_idx on public.contacts(created_by);
create index if not exists enrichment_status_created_by_idx on public.enrichment_status(created_by);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists search_history_created_by_idx on public.search_history(created_by);

-- END 20260602161000_harden_shared_crm_rls.sql

-- BEGIN 20260603100000_google_places_auto_enrichment.sql
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

-- END 20260603100000_google_places_auto_enrichment.sql

-- BEGIN 20260603130000_blueprint_phase1_foundation.sql
alter table public.companies add column if not exists country_emirate text not null default '';
alter table public.companies add column if not exists sector text not null default 'Other';
alter table public.companies add column if not exists tier text not null default '2';
alter table public.companies add column if not exists primary_contact_title text not null default '';
alter table public.companies add column if not exists secondary_contact_name text not null default '';
alter table public.companies add column if not exists secondary_contact_title text not null default '';
alter table public.companies add column if not exists secondary_contact_mobile text not null default '';
alter table public.companies add column if not exists secondary_contact_email text not null default '';
alter table public.companies add column if not exists first_order_date date;
alter table public.companies add column if not exists estimated_monthly_volume text not null default '';
alter table public.companies add column if not exists tags text not null default '';

alter table public.leads add column if not exists country_emirate text not null default '';
alter table public.leads add column if not exists sector text not null default 'Other';
alter table public.leads add column if not exists tier text not null default '2';
alter table public.leads add column if not exists primary_contact_title text not null default '';
alter table public.leads add column if not exists secondary_contact_name text not null default '';
alter table public.leads add column if not exists secondary_contact_title text not null default '';
alter table public.leads add column if not exists secondary_contact_mobile text not null default '';
alter table public.leads add column if not exists secondary_contact_email text not null default '';
alter table public.leads add column if not exists quotation_ref text not null default '';
alter table public.leads add column if not exists first_order_date date;
alter table public.leads add column if not exists estimated_monthly_volume text not null default '';
alter table public.leads add column if not exists tags text not null default '';

update public.leads set lead_status = 'PROSPECT' where lead_status in ('New', 'Qualified', 'Proposal', 'Negotiation', 'Won');

alter table public.leads drop constraint if exists leads_status_blueprint_check;
alter table public.leads add constraint leads_status_blueprint_check
  check (lead_status in ('PROSPECT', 'OUTREACH', 'ENGAGED', 'SAMPLING', 'ACTIVE', 'DORMANT'));

create table if not exists public.pmrs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  activity_id text not null default '',
  meeting_date date not null default current_date,
  filed_by uuid references auth.users(id),
  products_discussed text not null default '',
  competitors_mentioned text not null default '',
  compliance_requirements text not null default '',
  relationship_heat_score integer not null default 3 check (relationship_heat_score between 1 and 5),
  first_order_timing text not null default 'unknown',
  potential_annual_value text not null default '500K-2M',
  director_action_required text not null default 'None',
  account_status text not null default 'Warm',
  raw_document_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pmrs_set_updated_at on public.pmrs;
create trigger pmrs_set_updated_at before update on public.pmrs
for each row execute function public.set_updated_at();

alter table public.pmrs enable row level security;
grant select, insert on public.pmrs to authenticated;

create policy "Authenticated users can read PMRs" on public.pmrs
  for select to authenticated using (true);
create policy "Authenticated users can create PMRs" on public.pmrs
  for insert to authenticated with check (filed_by = (select auth.uid()));

create index if not exists pmrs_company_id_idx on public.pmrs(company_id);
create index if not exists pmrs_lead_id_idx on public.pmrs(lead_id);
create index if not exists leads_status_idx on public.leads(lead_status);
create index if not exists leads_tier_idx on public.leads(tier);

-- END 20260603130000_blueprint_phase1_foundation.sql

-- BEGIN 20260606120000_role_scoped_salesman_access.sql
update public.leads as lead
set assigned_to = profile.id
from public.profiles as profile
where lead.assigned_to is null
  and profile.role = 'salesman'
  and lower(profile.full_name) = lower(lead.assigned_salesman);

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;

create policy "Admins can read all profiles" on public.profiles
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users can read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can create leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Admins can read all leads" on public.leads;
drop policy if exists "Admins can create leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop policy if exists "Admins can delete leads" on public.leads;
drop policy if exists "Salesmen can read own leads" on public.leads;
drop policy if exists "Salesmen can create own leads" on public.leads;
drop policy if exists "Salesmen can update own leads" on public.leads;
drop policy if exists "Salesmen can delete own leads" on public.leads;

create policy "Admins can read all leads" on public.leads
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can create leads" on public.leads
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update leads" on public.leads
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete leads" on public.leads
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read own leads" on public.leads
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );

create policy "Salesmen can create own leads" on public.leads
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (assigned_to is null or assigned_to = (select auth.uid()))
  );

create policy "Salesmen can update own leads" on public.leads
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  )
  with check (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );

create policy "Salesmen can delete own leads" on public.leads
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );

drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;
drop policy if exists "Admins can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read own PMRs" on public.pmrs;
drop policy if exists "Salesmen can create own PMRs" on public.pmrs;

create policy "Admins can read all PMRs" on public.pmrs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read own PMRs" on public.pmrs
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

create policy "Salesmen can create own PMRs" on public.pmrs
  for insert to authenticated
  with check (
    filed_by = (select auth.uid())
    and exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

-- END 20260606120000_role_scoped_salesman_access.sql

-- BEGIN 20260609120000_supabase_pmrs_and_voice_storage.sql
alter table public.pmrs add column if not exists voice_note_id text not null default '';
alter table public.pmrs add column if not exists voice_note_url text not null default '';
alter table public.pmrs add column if not exists voice_note_path text not null default '';
alter table public.pmrs add column if not exists voice_note_mime_type text not null default '';
alter table public.pmrs add column if not exists voice_note_size_bytes integer not null default 0;
alter table public.pmrs add column if not exists voice_note_transcript text not null default '';

create index if not exists pmrs_voice_note_id_idx on public.pmrs(voice_note_id)
  where voice_note_id <> '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pmr-voice-notes',
  'pmr-voice-notes',
  false,
  20971520,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'application/octet-stream']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;
drop policy if exists "Admins can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read own PMRs" on public.pmrs;
drop policy if exists "Salesmen can create own PMRs" on public.pmrs;

create policy "Admins can read all PMRs" on public.pmrs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Salesmen can read own PMRs" on public.pmrs
  for select to authenticated
  using (
    exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

create policy "Salesmen can create own PMRs" on public.pmrs
  for insert to authenticated
  with check (
    filed_by = (select auth.uid())
    and exists (
      select 1
      from public.leads lead
      where lead.id = public.pmrs.lead_id
        and (
          lead.created_by = (select auth.uid())
          or lead.assigned_to = (select auth.uid())
          or exists (
            select 1
            from public.profiles profile
            where profile.id = (select auth.uid())
              and profile.role = 'salesman'
              and lower(profile.full_name) = lower(lead.assigned_salesman)
          )
        )
    )
  );

-- END 20260609120000_supabase_pmrs_and_voice_storage.sql

-- BEGIN 20260610120000_add_activity_completed_at_for_overdue_banner.sql
alter table if exists public.activities
  add column if not exists completed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'activities'
  ) then
    execute '
      create index if not exists activities_open_reminders_due_idx
      on public.activities (reminder_due_date)
      where type = ''Reminder'' and completed_at is null
    ';
  end if;
end $$;

-- END 20260610120000_add_activity_completed_at_for_overdue_banner.sql

-- BEGIN 20260610130000_add_lost_reason_fields.sql
alter table public.leads
  add column if not exists lost_reason text,
  add column if not exists lost_reason_detail text,
  add column if not exists lost_competitor text,
  add column if not exists lost_at timestamptz,
  add column if not exists lost_by uuid references auth.users(id);

create index if not exists leads_lost_reason_idx
  on public.leads (lost_reason)
  where lost_reason is not null;

-- END 20260610130000_add_lost_reason_fields.sql

-- BEGIN 20260610143000_add_lead_import_audit_columns.sql
alter table public.leads
  add column if not exists imported_at timestamptz,
  add column if not exists imported_by uuid references auth.users(id);

create index if not exists leads_imported_at_idx
  on public.leads (imported_at desc)
  where imported_at is not null;

-- END 20260610143000_add_lead_import_audit_columns.sql

-- BEGIN 20260612140000_one_click_ai_actions.sql
create extension if not exists pgcrypto;

create table if not exists public.ai_action_log (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null default now(),
  user_uid uuid references auth.users(id) on delete set null,
  user_role text not null default '',
  scope text not null default 'company_record',
  company_id uuid references public.leads(id) on delete set null,
  action text not null,
  duration_ms integer not null default 0,
  status text not null default 'success' check (status in ('success', 'failed')),
  error text not null default ''
);

alter table public.ai_action_log
  add column if not exists user_role text not null default '',
  add column if not exists scope text not null default 'company_record',
  add column if not exists company_id uuid references public.leads(id) on delete set null,
  add column if not exists action text not null default '',
  add column if not exists duration_ms integer not null default 0,
  add column if not exists status text not null default 'success',
  add column if not exists error text not null default '';

create index if not exists ai_action_log_user_timestamp_idx on public.ai_action_log(user_uid, "timestamp" desc);
create index if not exists ai_action_log_company_idx on public.ai_action_log(company_id);

create table if not exists public.attention_flags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.leads(id) on delete set null,
  company_name text not null default '',
  flagged_by_uid uuid references auth.users(id) on delete set null,
  flagged_by_name text not null default '',
  flagged_at timestamptz not null default now(),
  reason text not null default '',
  latest_pmr_id uuid references public.pmrs(id) on delete set null,
  latest_pmr_snapshot jsonb not null default '{}'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by text not null default '',
  acknowledged_at timestamptz,
  resolution_note text not null default '',
  resolved_by text not null default '',
  resolved_at timestamptz
);

create index if not exists attention_flags_status_flagged_at_idx on public.attention_flags(status, flagged_at desc);
create index if not exists attention_flags_company_idx on public.attention_flags(company_id);
create index if not exists attention_flags_flagged_by_idx on public.attention_flags(flagged_by_uid);

alter table public.ai_action_log enable row level security;
alter table public.attention_flags enable row level security;

grant select, insert on public.ai_action_log to authenticated;
grant select, insert, update on public.attention_flags to authenticated;

drop policy if exists "Users can insert own AI action logs" on public.ai_action_log;
drop policy if exists "Users can read own AI action logs" on public.ai_action_log;
drop policy if exists "Leadership can read AI action logs" on public.ai_action_log;

create policy "Users can insert own AI action logs" on public.ai_action_log
  for insert to authenticated
  with check (user_uid = (select auth.uid()));

create policy "Users can read own AI action logs" on public.ai_action_log
  for select to authenticated
  using (user_uid = (select auth.uid()));

create policy "Leadership can read AI action logs" on public.ai_action_log
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

drop policy if exists "Users can create attention flags" on public.attention_flags;
drop policy if exists "Salesmen can read own attention flags" on public.attention_flags;
drop policy if exists "Leadership can read attention flags" on public.attention_flags;
drop policy if exists "Leadership can update attention flags" on public.attention_flags;

create policy "Users can create attention flags" on public.attention_flags
  for insert to authenticated
  with check (flagged_by_uid = (select auth.uid()));

create policy "Salesmen can read own attention flags" on public.attention_flags
  for select to authenticated
  using (flagged_by_uid = (select auth.uid()));

create policy "Leadership can read attention flags" on public.attention_flags
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

create policy "Leadership can update attention flags" on public.attention_flags
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'director', 'manager'));

-- END 20260612140000_one_click_ai_actions.sql

-- BEGIN 20260616120000_configuration_agent_audit.sql

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.configuration_audit_log (
  id text primary key,
  "timestamp" timestamptz not null default now(),
  actor_uid uuid references auth.users(id),
  actor_name text not null default '',
  action text not null default '',
  before_config jsonb not null default '{}'::jsonb,
  after_config jsonb not null default '{}'::jsonb,
  diff jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb
);

create index if not exists configuration_audit_log_timestamp_idx
  on public.configuration_audit_log("timestamp" desc);

alter table public.app_config enable row level security;
alter table public.configuration_audit_log enable row level security;

grant select, insert, update on public.app_config to authenticated;
grant select, insert on public.configuration_audit_log to authenticated;

drop policy if exists "Admins can read app config" on public.app_config;
drop policy if exists "Admins can manage app config" on public.app_config;
drop policy if exists "Admins can read configuration audit" on public.configuration_audit_log;
drop policy if exists "Admins can insert configuration audit" on public.configuration_audit_log;

create policy "Admins can read app config" on public.app_config
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

create policy "Admins can manage app config" on public.app_config
  for all to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

create policy "Admins can read configuration audit" on public.configuration_audit_log
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

create policy "Admins can insert configuration audit" on public.configuration_audit_log
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
    )
  );

-- END 20260616120000_configuration_agent_audit.sql

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
  next_action text not null default 'Qualify lead',
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
alter table public.leads add column if not exists next_action text not null default 'Qualify lead';
alter table public.leads add column if not exists next_action_date date not null default current_date;
alter table public.leads add column if not exists last_activity date not null default current_date;
alter table public.leads add column if not exists source text not null default 'Manual entry';
alter table public.leads add column if not exists activities jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists enrichment_status text not null default 'pending';
alter table public.leads add column if not exists enrichment_updated_at timestamptz;
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

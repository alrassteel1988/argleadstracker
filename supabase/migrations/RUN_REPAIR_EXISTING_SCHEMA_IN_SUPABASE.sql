create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'salesman',
  territory text not null default 'Dubai',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists role text not null default 'salesman';
alter table public.profiles add column if not exists territory text not null default 'Dubai';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.companies add column if not exists company_name text not null default '';
alter table public.companies add column if not exists industry text not null default '';
alter table public.companies add column if not exists location text not null default '';
alter table public.companies add column if not exists address text not null default '';
alter table public.companies add column if not exists phone text not null default '';
alter table public.companies add column if not exists website text not null default '';
alter table public.companies add column if not exists google_place_id text;
alter table public.companies add column if not exists google_maps_url text not null default '';
alter table public.companies add column if not exists google_rating numeric(3, 2);
alter table public.companies add column if not exists google_review_count integer not null default 0;
alter table public.companies add column if not exists legal_name text not null default '';
alter table public.companies add column if not exists year_established text not null default '';
alter table public.companies add column if not exists business_category text not null default '';
alter table public.companies add column if not exists opening_hours jsonb not null default '[]'::jsonb;
alter table public.companies add column if not exists products_services_remarks text not null default '';
alter table public.companies add column if not exists enrichment_source text not null default '';
alter table public.companies add column if not exists enrichment_status text not null default 'pending';
alter table public.companies add column if not exists enrichment_updated_at timestamptz;
alter table public.companies add column if not exists enriched_at timestamptz;
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
alter table public.companies add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

alter table public.leads add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.leads add column if not exists company_name text not null default '';
alter table public.leads add column if not exists industry text not null default '';
alter table public.leads add column if not exists location text not null default '';
alter table public.leads add column if not exists address text not null default '';
alter table public.leads add column if not exists phone text not null default '';
alter table public.leads add column if not exists website text not null default '';
alter table public.leads add column if not exists google_place_id text;
alter table public.leads add column if not exists google_maps_url text not null default '';
alter table public.leads add column if not exists google_rating numeric(3, 2);
alter table public.leads add column if not exists google_review_count integer not null default 0;
alter table public.leads add column if not exists contact_name text not null default '';
alter table public.leads add column if not exists contact_email text not null default '';
alter table public.leads add column if not exists hunter_confidence_score integer;
alter table public.leads add column if not exists lead_status text not null default 'PROSPECT';
alter table public.leads add column if not exists notes text not null default '';
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
alter table public.leads add column if not exists legal_name text not null default '';
alter table public.leads add column if not exists year_established text not null default '';
alter table public.leads add column if not exists business_category text not null default '';
alter table public.leads add column if not exists opening_hours jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists products_services_remarks text not null default '';
alter table public.leads add column if not exists enrichment_source text not null default '';
alter table public.leads add column if not exists enriched_at timestamptz;
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
alter table public.leads add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.leads add column if not exists created_at timestamptz not null default now();
alter table public.leads add column if not exists updated_at timestamptz not null default now();

alter table public.contacts add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.contacts add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.contacts add column if not exists contact_name text not null default '';
alter table public.contacts add column if not exists contact_email text not null default '';
alter table public.contacts add column if not exists phone text not null default '';
alter table public.contacts add column if not exists contact_type text not null default '';
alter table public.contacts add column if not exists hunter_confidence_score integer;
alter table public.contacts add column if not exists source_data jsonb not null default '[]'::jsonb;
alter table public.contacts add column if not exists created_by uuid default auth.uid() references auth.users(id);
alter table public.contacts add column if not exists created_at timestamptz not null default now();
alter table public.contacts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users(id),
  keyword text not null default '',
  location text not null default '',
  provider text not null default 'google_places',
  result_count integer not null default 0,
  status text not null default 'completed',
  error_message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.enrichment_status (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  provider text not null default 'google_places',
  status text not null default 'pending',
  details jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  relationship_heat_score integer not null default 3,
  first_order_timing text not null default 'unknown',
  potential_annual_value text not null default '500K-2M',
  director_action_required text not null default 'None',
  account_status text not null default 'Warm',
  raw_document_url text not null default '',
  notes text not null default '',
  voice_note_id text not null default '',
  voice_note_url text not null default '',
  voice_note_path text not null default '',
  voice_note_mime_type text not null default '',
  voice_note_size_bytes integer not null default 0,
  voice_note_transcript text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmrs add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.pmrs add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.pmrs add column if not exists activity_id text not null default '';
alter table public.pmrs add column if not exists meeting_date date not null default current_date;
alter table public.pmrs add column if not exists filed_by uuid references auth.users(id);
alter table public.pmrs add column if not exists products_discussed text not null default '';
alter table public.pmrs add column if not exists competitors_mentioned text not null default '';
alter table public.pmrs add column if not exists compliance_requirements text not null default '';
alter table public.pmrs add column if not exists relationship_heat_score integer not null default 3;
alter table public.pmrs add column if not exists first_order_timing text not null default 'unknown';
alter table public.pmrs add column if not exists potential_annual_value text not null default '500K-2M';
alter table public.pmrs add column if not exists director_action_required text not null default 'None';
alter table public.pmrs add column if not exists account_status text not null default 'Warm';
alter table public.pmrs add column if not exists raw_document_url text not null default '';
alter table public.pmrs add column if not exists notes text not null default '';
alter table public.pmrs add column if not exists voice_note_id text not null default '';
alter table public.pmrs add column if not exists voice_note_url text not null default '';
alter table public.pmrs add column if not exists voice_note_path text not null default '';
alter table public.pmrs add column if not exists voice_note_mime_type text not null default '';
alter table public.pmrs add column if not exists voice_note_size_bytes integer not null default 0;
alter table public.pmrs add column if not exists voice_note_transcript text not null default '';
alter table public.pmrs add column if not exists created_at timestamptz not null default now();
alter table public.pmrs add column if not exists updated_at timestamptz not null default now();

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
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      territory = excluded.territory;
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
drop trigger if exists pmrs_set_updated_at on public.pmrs;
create trigger pmrs_set_updated_at before update on public.pmrs
for each row execute function public.set_updated_at();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

insert into public.profiles (id, full_name, role, territory)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'name', users.email, ''),
  case when users.email = 'glory@alrassteel.com' then 'admin'
       when users.raw_app_meta_data ->> 'role' = 'admin' then 'admin'
       else 'salesman' end,
  coalesce(users.raw_user_meta_data ->> 'territory', 'Dubai')
from auth.users users
on conflict (id) do update
set role = case when excluded.full_name = 'glory@alrassteel.com' then 'admin' else excluded.role end;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert on public.search_history to authenticated;
grant select, insert, update on public.enrichment_status to authenticated;
grant select, insert on public.pmrs to authenticated;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.leads enable row level security;
alter table public.contacts enable row level security;
alter table public.search_history enable row level security;
alter table public.enrichment_status enable row level security;
alter table public.pmrs enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
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
drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;
drop policy if exists "Admins can read all PMRs" on public.pmrs;
drop policy if exists "Salesmen can read own PMRs" on public.pmrs;
drop policy if exists "Salesmen can create own PMRs" on public.pmrs;

create policy "Admins can read all profiles" on public.profiles
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or id = (select auth.uid()));

create policy "Users can read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "Authenticated users can read companies" on public.companies
  for select to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can create companies" on public.companies
  for insert to authenticated with check (created_by = (select auth.uid()) or created_by is null);
create policy "Authenticated users can update companies" on public.companies
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete companies" on public.companies
  for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Authenticated users can read leads" on public.leads
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
    or exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'salesman'
        and lower(profile.full_name) = lower(public.leads.assigned_salesman)
    )
  );
create policy "Authenticated users can create leads" on public.leads
  for insert to authenticated with check (created_by = (select auth.uid()) or created_by is null);
create policy "Authenticated users can update leads" on public.leads
  for update to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or created_by = (select auth.uid())
    or assigned_to = (select auth.uid())
  );
create policy "Authenticated users can delete leads" on public.leads
  for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Authenticated users can read contacts" on public.contacts
  for select to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can create contacts" on public.contacts
  for insert to authenticated with check (created_by = (select auth.uid()) or created_by is null);
create policy "Authenticated users can update contacts" on public.contacts
  for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "Authenticated users can delete contacts" on public.contacts
  for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Users can read own searches" on public.search_history
  for select to authenticated using (created_by = (select auth.uid()));
create policy "Users can create own searches" on public.search_history
  for insert to authenticated with check (created_by = (select auth.uid()) or created_by is null);
create policy "Authenticated users can read enrichment status" on public.enrichment_status
  for select to authenticated using ((select auth.uid()) is not null);
create policy "Authenticated users can create enrichment status" on public.enrichment_status
  for insert to authenticated with check (created_by = (select auth.uid()) or created_by is null);
create policy "Authenticated users can update enrichment status" on public.enrichment_status
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

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

create unique index if not exists companies_google_place_id_key
  on public.companies (google_place_id)
  where google_place_id is not null and google_place_id <> '';
create unique index if not exists companies_website_key
  on public.companies (lower(website))
  where website <> '';
create unique index if not exists leads_google_place_id_key
  on public.leads (google_place_id)
  where google_place_id is not null and google_place_id <> '';
create index if not exists companies_created_by_idx on public.companies(created_by);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists contacts_created_by_idx on public.contacts(created_by);
create index if not exists enrichment_status_created_by_idx on public.enrichment_status(created_by);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists leads_status_idx on public.leads(lead_status);
create index if not exists leads_tier_idx on public.leads(tier);
create index if not exists pmrs_company_id_idx on public.pmrs(company_id);
create index if not exists pmrs_lead_id_idx on public.pmrs(lead_id);
create index if not exists pmrs_voice_note_id_idx on public.pmrs(voice_note_id)
  where voice_note_id <> '';
create index if not exists search_history_created_by_idx on public.search_history(created_by);

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

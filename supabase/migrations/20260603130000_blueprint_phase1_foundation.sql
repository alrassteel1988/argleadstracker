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

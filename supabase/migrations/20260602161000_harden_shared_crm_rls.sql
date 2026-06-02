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

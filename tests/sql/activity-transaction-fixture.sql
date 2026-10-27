-- Run only in a disposable database. No customer data is used.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
end $$;
create table public.profiles (id uuid primary key, role text, status text, full_name text);
create table public.leads (id uuid primary key, assigned_to uuid, assigned_salesman text, activities jsonb, last_activity date);
grant select, update on public.leads to authenticated;
grant select on public.profiles to authenticated;
alter table public.leads enable row level security;
create policy deliberately_broad_test_policy on public.leads for all to authenticated using (true) with check (true);
insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001', 'salesman', 'active', 'Test Salesman'),
  ('00000000-0000-0000-0000-000000000002', 'salesman', 'active', 'Other Salesman');
insert into public.leads values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Salesman', '[{"id":"a","version":1,"type":"Phone Call","text":"Original"},{"id":"b","version":1,"text":"Keep"}]', '2026-01-01'),
  ('10000000-0000-0000-0000-000000000002', null, 'Other Salesman', '[{"id":"other","version":1}]', '2026-01-01'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Test Salesman', '[{"id":"dup"},{"id":"dup"}]', '2026-01-01');

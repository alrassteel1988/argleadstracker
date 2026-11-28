-- Replace overlapping permissive INSERT rules; leave reads, updates and lifecycle rules intact.
begin;
set local lock_timeout = '5s';

do $$
begin
  if not coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.leads')),false) then
    raise exception 'Lead RLS must already be enabled';
  end if;
  -- An unknown permissive ALL/INSERT rule could bypass the replacement through OR composition.
  if exists (select 1 from pg_policy where polrelid='public.leads'::regclass
    and polpermissive and polcmd in ('a','*')
    and polname not in ('F04 leads insert','Salesmen can insert self-owned leads','CRM lead insert')) then
    raise exception 'Unexpected permissive lead insert policy; review before applying this migration';
  end if;
  if not exists (select 1 from pg_policy where polrelid='public.leads'::regclass
    and polname in ('F04 leads insert','Salesmen can insert self-owned leads','CRM lead insert'))
    or exists (select 1 from pg_policy where polrelid='public.leads'::regclass
      and polname in ('F04 leads insert','Salesmen can insert self-owned leads','CRM lead insert')
      and (polcmd<>'a' or not polpermissive or polroles<>array['authenticated'::regrole::oid])) then
    raise exception 'Expected authenticated lead INSERT policy configuration is missing or changed';
  end if;
end;
$$;

drop policy if exists "F04 leads insert" on public.leads;
drop policy if exists "Salesmen can insert self-owned leads" on public.leads;
drop policy if exists "CRM lead insert" on public.leads;

create policy "CRM lead insert" on public.leads for insert to authenticated
  with check (
    leads.created_by = (select auth.uid())
    and nullif(btrim(leads.territory),'') is not null
    and char_length(btrim(leads.territory)) <= 100
    and leads.territory !~ '[[:cntrl:]]'
    and leads.territory <> '__custom_territory__'
    and exists (
      select 1 from public.profiles actor
      where actor.id = (select auth.uid()) and actor.status = 'active'
        and (
          actor.role in ('admin','director','manager')
          or (actor.role = 'salesman' and leads.assigned_to = actor.id
            and (coalesce(actor.full_name,'') = '' or leads.assigned_salesman = actor.full_name))
        )
    )
  );

notify pgrst,'reload schema';
commit;

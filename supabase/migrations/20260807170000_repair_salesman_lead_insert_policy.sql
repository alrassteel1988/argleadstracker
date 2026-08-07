grant insert on public.leads to authenticated;

drop policy if exists "Salesmen can insert self-owned leads" on public.leads;

create policy "Salesmen can insert self-owned leads" on public.leads
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and assigned_to = auth.uid()
    and exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and lower(profile.role) = 'salesman'
        and lower(coalesce(profile.status, 'active')) = 'active'
        and (
          coalesce(public.leads.territory, '') = ''
          or coalesce(profile.territory, '') = ''
          or public.leads.territory = profile.territory
        )
    )
  );

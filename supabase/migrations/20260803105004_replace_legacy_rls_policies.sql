-- Fix F-04: normal CRM traffic must be evaluated as the signed-in user.
-- Service-role access remains reserved for explicitly controlled server jobs.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.crm_is_leadership()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.status = 'active'
      and profile.role in ('admin', 'director', 'manager')
  );
$$;

create or replace function private.crm_can_access_lead(target_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.crm_is_leadership()
    or exists (
      select 1
      from public.leads lead
      join public.profiles profile on profile.id = auth.uid()
      where lead.id = target_lead_id
        and profile.status = 'active'
        and profile.role = 'salesman'
        and (
          lead.created_by = auth.uid()
          or lead.assigned_to = auth.uid()
          or lower(lead.assigned_salesman) = lower(profile.full_name)
          or (
            lead.territory <> 'Mixed'
            and lead.territory = profile.territory
          )
        )
    );
$$;

revoke all on function private.crm_is_leadership() from public;
revoke all on function private.crm_can_access_lead(uuid) from public;
revoke all on function private.crm_is_leadership() from anon;
revoke all on function private.crm_can_access_lead(uuid) from anon;
grant execute on function private.crm_is_leadership() to authenticated;
grant execute on function private.crm_can_access_lead(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.leads enable row level security;
alter table public.leads force row level security;
alter table public.contacts enable row level security;
alter table public.contacts force row level security;
alter table public.search_history enable row level security;
alter table public.search_history force row level security;
alter table public.enrichment_status enable row level security;
alter table public.enrichment_status force row level security;
alter table public.pmrs enable row level security;
alter table public.pmrs force row level security;
alter table public.handoff_logs enable row level security;
alter table public.handoff_logs force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.ai_action_log enable row level security;
alter table public.ai_action_log force row level security;
alter table public.attention_flags enable row level security;
alter table public.attention_flags force row level security;
alter table public.integration_logs enable row level security;
alter table public.integration_logs force row level security;
alter table public.market_intelligence enable row level security;
alter table public.market_intelligence force row level security;
alter table public.market_intelligence_archive enable row level security;
alter table public.market_intelligence_archive force row level security;
alter table public.agent_query_log enable row level security;
alter table public.agent_query_log force row level security;
alter table public.app_config enable row level security;
alter table public.app_config force row level security;
alter table public.configuration_audit_log enable row level security;
alter table public.configuration_audit_log force row level security;
alter table public.weekly_sales_reports enable row level security;
alter table public.weekly_sales_reports force row level security;
alter table public.weekly_report_events enable row level security;
alter table public.weekly_report_events force row level security;
alter table public.assistant_audit_logs enable row level security;
alter table public.assistant_audit_logs force row level security;
alter table public.email_drafts enable row level security;
alter table public.email_drafts force row level security;

-- Remove the broad starter policies that granted every authenticated user
-- unrestricted access to shared CRM records.
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
drop policy if exists "Authenticated users can read enrichment status" on public.enrichment_status;
drop policy if exists "Authenticated users can create enrichment status" on public.enrichment_status;
drop policy if exists "Authenticated users can update enrichment status" on public.enrichment_status;
drop policy if exists "Authenticated users can read PMRs" on public.pmrs;
drop policy if exists "Authenticated users can create PMRs" on public.pmrs;

-- PostgreSQL combines permissive policies with OR. Remove every historical
-- policy from the protected CRM tables before installing the canonical set so
-- an older policy cannot silently widen access.
do $$
declare
  protected_table text;
  policy_row record;
begin
  foreach protected_table in array array[
    'profiles',
    'companies',
    'leads',
    'contacts',
    'search_history',
    'enrichment_status',
    'pmrs',
    'handoff_logs',
    'notifications',
    'ai_action_log',
    'attention_flags',
    'integration_logs',
    'market_intelligence',
    'market_intelligence_archive',
    'agent_query_log',
    'app_config',
    'configuration_audit_log',
    'weekly_sales_reports',
    'weekly_report_events',
    'assistant_audit_logs',
    'email_drafts'
  ]
  loop
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = protected_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_row.policyname,
        protected_table
      );
    end loop;
  end loop;
end
$$;

drop policy if exists "F04 profiles read" on public.profiles;
create policy "F04 profiles read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.crm_is_leadership());

drop policy if exists "F04 profiles leadership update" on public.profiles;
create policy "F04 profiles leadership update" on public.profiles
  for update to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());

drop policy if exists "F04 companies read" on public.companies;
create policy "F04 companies read" on public.companies
  for select to authenticated
  using (
    private.crm_is_leadership()
    or created_by = auth.uid()
    or exists (
      select 1 from public.leads lead
      where lead.company_id = public.companies.id
        and private.crm_can_access_lead(lead.id)
    )
  );

drop policy if exists "F04 companies insert" on public.companies;
create policy "F04 companies insert" on public.companies
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "F04 companies update" on public.companies;
create policy "F04 companies update" on public.companies
  for update to authenticated
  using (
    private.crm_is_leadership()
    or created_by = auth.uid()
    or exists (
      select 1 from public.leads lead
      where lead.company_id = public.companies.id
        and private.crm_can_access_lead(lead.id)
    )
  )
  with check (
    private.crm_is_leadership()
    or created_by = auth.uid()
    or exists (
      select 1 from public.leads lead
      where lead.company_id = public.companies.id
        and private.crm_can_access_lead(lead.id)
    )
  );

drop policy if exists "F04 companies delete" on public.companies;
create policy "F04 companies delete" on public.companies
  for delete to authenticated
  using (private.crm_is_leadership() or created_by = auth.uid());

-- Replace all historical lead policies with one canonical role rule.
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'leads'
  loop
    execute format('drop policy if exists %I on public.leads', policy_row.policyname);
  end loop;
end
$$;

create policy "F04 leads read" on public.leads
  for select to authenticated using (private.crm_can_access_lead(id));
create policy "F04 leads insert" on public.leads
  for insert to authenticated
  with check (
    private.crm_is_leadership()
    or exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.status = 'active'
        and profile.role = 'salesman'
        and created_by = auth.uid()
        and territory = profile.territory
        and territory <> 'Mixed'
        and (assigned_to is null or assigned_to = auth.uid())
        and (
          coalesce(assigned_salesman, '') in ('', 'Unassigned')
          or lower(assigned_salesman) = lower(profile.full_name)
        )
    )
  );
create policy "F04 leads update" on public.leads
  for update to authenticated
  using (private.crm_can_access_lead(id))
  with check (private.crm_can_access_lead(id));
create policy "F04 leads delete" on public.leads
  for delete to authenticated
  using (private.crm_is_leadership() or created_by = auth.uid());

drop policy if exists "F04 contacts read" on public.contacts;
create policy "F04 contacts read" on public.contacts
  for select to authenticated
  using (
    private.crm_is_leadership()
    or created_by = auth.uid()
    or (lead_id is not null and private.crm_can_access_lead(lead_id))
    or exists (
      select 1 from public.leads lead
      where lead.company_id = public.contacts.company_id
        and private.crm_can_access_lead(lead.id)
    )
  );
drop policy if exists "F04 contacts insert" on public.contacts;
create policy "F04 contacts insert" on public.contacts
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      lead_id is null
      or private.crm_can_access_lead(lead_id)
    )
  );
drop policy if exists "F04 contacts update" on public.contacts;
create policy "F04 contacts update" on public.contacts
  for update to authenticated
  using (
    private.crm_is_leadership()
    or created_by = auth.uid()
    or (lead_id is not null and private.crm_can_access_lead(lead_id))
  )
  with check (
    private.crm_is_leadership()
    or created_by = auth.uid()
    or (lead_id is not null and private.crm_can_access_lead(lead_id))
  );
drop policy if exists "F04 contacts delete" on public.contacts;
create policy "F04 contacts delete" on public.contacts
  for delete to authenticated
  using (private.crm_is_leadership() or created_by = auth.uid());

drop policy if exists "F04 searches own" on public.search_history;
create policy "F04 searches own" on public.search_history
  for all to authenticated
  using (created_by = auth.uid() or private.crm_is_leadership())
  with check (created_by = auth.uid() or private.crm_is_leadership());

drop policy if exists "F04 enrichment lead access" on public.enrichment_status;
create policy "F04 enrichment lead access" on public.enrichment_status
  for all to authenticated
  using (private.crm_can_access_lead(lead_id))
  with check (created_by = auth.uid() and private.crm_can_access_lead(lead_id));

-- PMRs inherit the same lead boundary. Leadership may update review fields;
-- salesmen create records only as themselves.
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'pmrs'
  loop
    execute format('drop policy if exists %I on public.pmrs', policy_row.policyname);
  end loop;
end
$$;
create policy "F04 PMRs read" on public.pmrs
  for select to authenticated using (private.crm_can_access_lead(lead_id));
create policy "F04 PMRs insert" on public.pmrs
  for insert to authenticated
  with check (filed_by = auth.uid() and private.crm_can_access_lead(lead_id));
create policy "F04 PMRs leadership update" on public.pmrs
  for update to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());

drop policy if exists "F04 handoffs read" on public.handoff_logs;
create policy "F04 handoffs read" on public.handoff_logs
  for select to authenticated using (private.crm_can_access_lead(lead_id));
drop policy if exists "F04 handoffs insert" on public.handoff_logs;
create policy "F04 handoffs insert" on public.handoff_logs
  for insert to authenticated
  with check (private.crm_is_leadership());

drop policy if exists "F04 notifications own" on public.notifications;
create policy "F04 notifications own" on public.notifications
  for select to authenticated using (recipient_uid = auth.uid());
drop policy if exists "F04 notifications update own" on public.notifications;
create policy "F04 notifications update own" on public.notifications
  for update to authenticated
  using (recipient_uid = auth.uid())
  with check (recipient_uid = auth.uid());

drop policy if exists "F04 AI actions own" on public.ai_action_log;
create policy "F04 AI actions own" on public.ai_action_log
  for all to authenticated
  using (user_uid = auth.uid() or private.crm_is_leadership())
  with check (
    (user_uid = auth.uid() and (company_id is null or private.crm_can_access_lead(company_id)))
    or private.crm_is_leadership()
  );

drop policy if exists "F04 attention lead access" on public.attention_flags;
create policy "F04 attention lead access" on public.attention_flags
  for select to authenticated
  using (
    private.crm_is_leadership()
    or flagged_by_uid = auth.uid()
    or (company_id is not null and private.crm_can_access_lead(company_id))
  );
drop policy if exists "F04 attention insert" on public.attention_flags;
create policy "F04 attention insert" on public.attention_flags
  for insert to authenticated
  with check (
    flagged_by_uid = auth.uid()
    and company_id is not null
    and private.crm_can_access_lead(company_id)
  );
drop policy if exists "F04 attention leadership update" on public.attention_flags;
create policy "F04 attention leadership update" on public.attention_flags
  for update to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());

drop policy if exists "F04 integration own insert" on public.integration_logs;
create policy "F04 integration own insert" on public.integration_logs
  for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "F04 integration leadership read" on public.integration_logs;
create policy "F04 integration leadership read" on public.integration_logs
  for select to authenticated using (private.crm_is_leadership());

drop policy if exists "F04 market intelligence read" on public.market_intelligence;
create policy "F04 market intelligence read" on public.market_intelligence
  for select to authenticated using (true);
drop policy if exists "F04 market intelligence leadership" on public.market_intelligence;
create policy "F04 market intelligence leadership" on public.market_intelligence
  for all to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());
drop policy if exists "F04 market archive read" on public.market_intelligence_archive;
create policy "F04 market archive read" on public.market_intelligence_archive
  for select to authenticated using (true);

drop policy if exists "F04 agent queries own" on public.agent_query_log;
create policy "F04 agent queries own" on public.agent_query_log
  for all to authenticated
  using (user_uid = auth.uid() or private.crm_is_leadership())
  with check (user_uid = auth.uid());

drop policy if exists "F04 app config admin" on public.app_config;
create policy "F04 app config admin" on public.app_config
  for all to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());
drop policy if exists "F04 config audit admin" on public.configuration_audit_log;
create policy "F04 config audit admin" on public.configuration_audit_log
  for all to authenticated
  using (private.crm_is_leadership())
  with check (private.crm_is_leadership());

drop policy if exists "F04 weekly reports read" on public.weekly_sales_reports;
create policy "F04 weekly reports read" on public.weekly_sales_reports
  for select to authenticated
  using (user_id = auth.uid() or private.crm_is_leadership());
drop policy if exists "F04 weekly reports insert" on public.weekly_sales_reports;
create policy "F04 weekly reports insert" on public.weekly_sales_reports
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "F04 weekly reports update" on public.weekly_sales_reports;
create policy "F04 weekly reports update" on public.weekly_sales_reports
  for update to authenticated
  using (
    private.crm_is_leadership()
    or (
      user_id = auth.uid()
      and status in ('not_started', 'in_progress', 'revision_required')
    )
  )
  with check (user_id = auth.uid() or private.crm_is_leadership());

drop policy if exists "F04 weekly events access" on public.weekly_report_events;
create policy "F04 weekly events access" on public.weekly_report_events
  for select to authenticated
  using (
    private.crm_is_leadership()
    or exists (
      select 1 from public.weekly_sales_reports report
      where report.id = public.weekly_report_events.report_id
        and report.user_id = auth.uid()
    )
  );
drop policy if exists "F04 weekly events insert" on public.weekly_report_events;
create policy "F04 weekly events insert" on public.weekly_report_events
  for insert to authenticated
  with check (
    private.crm_is_leadership()
    or exists (
      select 1 from public.weekly_sales_reports report
      where report.id = public.weekly_report_events.report_id
        and report.user_id = auth.uid()
    )
  );

drop policy if exists "F04 assistant logs own" on public.assistant_audit_logs;
create policy "F04 assistant logs own" on public.assistant_audit_logs
  for all to authenticated
  using (user_id = auth.uid() or private.crm_is_leadership())
  with check (user_id = auth.uid());

drop policy if exists "F04 email drafts lead access" on public.email_drafts;
create policy "F04 email drafts lead access" on public.email_drafts
  for all to authenticated
  using (
    private.crm_is_leadership()
    or (user_id = auth.uid() and private.crm_can_access_lead(lead_id))
  )
  with check (
    user_id = auth.uid()
    and private.crm_can_access_lead(lead_id)
  );

-- Both PMR voice notes and structured-activity attachments use this private
-- bucket. Upload/sign operations now execute with the user's JWT.
-- Retire the unused legacy bucket policies. Production inventory confirmed
-- that lead-files is empty; leaving these broad policies in place would still
-- expose future objects added to that bucket to every authenticated user.
drop policy if exists "authenticated users can read lead files" on storage.objects;
drop policy if exists "authenticated users can update lead files" on storage.objects;
drop policy if exists "authenticated users can upload lead files" on storage.objects;

drop policy if exists "F04 private CRM media insert" on storage.objects;
create policy "F04 private CRM media insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pmr-voice-notes'
    and owner_id = auth.uid()::text
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or (
        split_part(name, '/', 1) = 'activity-attachments'
        and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        and private.crm_can_access_lead(split_part(name, '/', 2)::uuid)
      )
    )
  );

drop policy if exists "F04 private CRM media read" on storage.objects;
create policy "F04 private CRM media read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pmr-voice-notes'
    and (
      private.crm_is_leadership()
      or owner_id = auth.uid()::text
      or exists (
        select 1 from public.pmrs pmr
        where pmr.voice_note_path = storage.objects.name
          and private.crm_can_access_lead(pmr.lead_id)
      )
      or (
        split_part(name, '/', 1) = 'activity-attachments'
        and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        and private.crm_can_access_lead(split_part(name, '/', 2)::uuid)
      )
    )
  );

-- Supabase Storage upsert requires SELECT, INSERT, and UPDATE access. Keep the
-- update boundary identical to the insert boundary while allowing leadership
-- to replace an existing CRM attachment when operationally necessary.
drop policy if exists "F04 private CRM media update" on storage.objects;
create policy "F04 private CRM media update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pmr-voice-notes'
    and (
      private.crm_is_leadership()
      or (
        owner_id = auth.uid()::text
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or (
            split_part(name, '/', 1) = 'activity-attachments'
            and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
            and private.crm_can_access_lead(split_part(name, '/', 2)::uuid)
          )
        )
      )
    )
  )
  with check (
    bucket_id = 'pmr-voice-notes'
    and (
      private.crm_is_leadership()
      or (
        owner_id = auth.uid()::text
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or (
            split_part(name, '/', 1) = 'activity-attachments'
            and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
            and private.crm_can_access_lead(split_part(name, '/', 2)::uuid)
          )
        )
      )
    )
  );

drop policy if exists "F04 private CRM media delete" on storage.objects;
create policy "F04 private CRM media delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pmr-voice-notes'
    and (owner_id = auth.uid()::text or private.crm_is_leadership())
  );

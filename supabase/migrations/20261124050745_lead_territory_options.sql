-- Customer territory is descriptive. Ownership, lifecycle and caller RLS remain enforced.
begin;
set local lock_timeout='5s';
drop policy if exists "Salesmen can insert self-owned leads" on public.leads;
create policy "Salesmen can insert self-owned leads" on public.leads
  for insert to authenticated with check (
    created_by = (select auth.uid()) and assigned_to = (select auth.uid())
    and nullif(btrim(territory),'') is not null and char_length(btrim(territory)) <= 100
    and territory !~ '[[:cntrl:]]' and territory <> '__custom_territory__'
    and exists (select 1 from public.profiles profile where profile.id = (select auth.uid())
      and profile.role = 'salesman' and profile.status = 'active')
  );

create or replace function public.save_new_crm_lead(p_lead jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  company_id uuid;
  company_columns text;
  lead_columns text;
  insert_lead text;
  saved_id uuid;
  saved_lead jsonb;
  rejected_constraint text;
  rejected_table text;
  rejected_schema text;
begin
  select * into actor from public.profiles where id=auth.uid();
  if not found or actor.status is distinct from 'active' or actor.role is null or actor.role not in ('admin','director','manager','salesman') then
    raise exception 'An active CRM account is required' using errcode='42501';
  end if;
  if jsonb_typeof(p_lead) is distinct from 'object' then
    raise exception 'A lead object is required' using errcode='22023';
  end if;
  if (p_lead->>'created_by')::uuid is distinct from actor.id then
    raise exception 'Lead creator must match the signed-in user' using errcode='42501';
  end if;
  if p_lead->>'initial_management_task_id' is not null then
    raise exception 'Use the Admin initial-task workflow for management assignments' using errcode='42501';
  end if;
  if actor.role='salesman' and (
    (p_lead->>'assigned_to')::uuid is distinct from actor.id
    or (coalesce(actor.full_name,'')<>'' and p_lead->>'assigned_salesman' is distinct from actor.full_name)
  ) then
    raise exception 'Salesmen can create only self-owned leads' using errcode='42501';
  end if;
  if jsonb_typeof(p_lead->'territory') is distinct from 'string'
    or nullif(btrim(p_lead->>'territory'),'') is null
    or char_length(btrim(p_lead->>'territory')) > 100
    or p_lead->>'territory' ~ '[[:cntrl:]]'
    or p_lead->>'territory' = '__custom_territory__' then
    raise exception 'Enter a territory of 1 to 100 plain-text characters' using errcode='22023';
  end if;
  p_lead := jsonb_set(p_lead,'{territory}',to_jsonb(btrim(regexp_replace(p_lead->>'territory','[[:space:]]+',' ','g'))));
  p_lead := p_lead-'id';
  if exists (select 1 from jsonb_object_keys(p_lead) fields(key) where key <> all(array[
    'company_id','company_name','country_emirate','sector','tier','legal_name','year_established','industry','location',
    'address','phone','website','google_place_id','google_maps_url','google_rating','google_review_count','latitude','longitude',
    'business_category','opening_hours','products_services_remarks','steel_products_likely_needed','competitors_likely_using',
    'certifications','estimated_scale','estimated_annual_revenue','key_personnel','recent_projects','contact_name',
    'primary_contact_title','contact_email','secondary_contact_name','secondary_contact_title','secondary_contact_mobile',
    'secondary_contact_email','hunter_confidence_score','lead_status','notes','territory','assigned_salesman','priority',
    'estimated_value','product_interest','activity_purpose','next_action','next_action_date','last_activity','source',
    'quotation_ref','first_order_date','estimated_monthly_volume','tags','activities','closed_reason','closed_note','lost_reason','lost_reason_detail',
    'lost_competitor','lost_at','lost_by','imported_at','imported_by','auto_enrichment','enrichment_status','enrichment_source',
    'enriched_at','enrichment_updated_at','created_by','assigned_to'
  ])) then raise exception 'Unsupported lead registration field' using errcode='22023'; end if;

  company_id := (p_lead->>'company_id')::uuid;
  if company_id is not null then
    -- Check visibility before the new lead could itself grant access to a linked company.
    perform 1 from public.companies c where c.id=company_id;
    if not found then raise exception 'Company is not available' using errcode='42501'; end if;
  else
    select string_agg(format('%I',a.attname),', ' order by a.attnum) into company_columns
      from pg_attribute a where a.attrelid='public.companies'::regclass and a.attnum>0 and not a.attisdropped
      and a.attname in ('company_name','legal_name','year_established','industry','location','address','phone','website',
        'google_place_id','google_maps_url','google_rating','google_review_count','latitude','longitude','business_category',
        'opening_hours','products_services_remarks','enrichment_source','enrichment_status','enriched_at','enrichment_updated_at','created_by')
      and (p_lead ? a.attname::text or a.attname='enrichment_updated_at');
    execute format('insert into public.companies (%1$s) select %1$s from jsonb_populate_record(null::public.companies,$1) returning id',company_columns)
      into strict company_id using p_lead || jsonb_build_object('enrichment_updated_at',p_lead->'enriched_at');
  end if;

  -- A separate read observes the inserted row for the existing lookup-based RLS policy.
  saved_id := gen_random_uuid();
  p_lead := p_lead || jsonb_build_object('company_id',company_id,'id',saved_id);
  select string_agg(format('%I',key),', ' order by key) into lead_columns from jsonb_object_keys(p_lead) fields(key);
  insert_lead := format('insert into public.leads (%1$s) select %1$s from jsonb_populate_record(null::public.leads,$1)',lead_columns);
  begin
    execute insert_lead using p_lead;
  exception when check_violation then
    get stacked diagnostics rejected_constraint=constraint_name,rejected_table=table_name,rejected_schema=schema_name;
    if p_lead->>'lead_status'='NEW' and rejected_schema='public' and rejected_table='leads'
      and rejected_constraint='leads_status_blueprint_check' then
      execute insert_lead using p_lead || '{"lead_status":"PROSPECT"}'::jsonb;
    else raise;
    end if;
  end;
  -- Closing during registration archives immediately; keep the released minimal response.
  if p_lead->>'lead_status'='CLOSED_NOT_INTERESTED' and actor.role<>'admin' then
    saved_lead:=jsonb_build_object('id',saved_id,'is_archived',true,'lead_status','CLOSED_NOT_INTERESTED');
  else
    select to_jsonb(l) into strict saved_lead from public.leads l where l.id=saved_id;
  end if;
  return saved_lead;
end;
$$;
revoke all on function public.save_new_crm_lead(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_new_crm_lead(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;

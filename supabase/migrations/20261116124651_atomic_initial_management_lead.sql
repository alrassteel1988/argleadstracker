create function public.save_initial_management_lead(p_lead jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  actor_id uuid := auth.uid();
  company_id uuid;
  input_company public.companies%rowtype;
  lead_columns text;
  insert_lead text;
  saved_id uuid;
  saved_lead jsonb;
  rejected_constraint text;
  rejected_table text;
  rejected_schema text;
begin
  if actor_id is null or not exists (
    select 1 from public.profiles p where p.id = actor_id and p.role = 'admin' and p.status = 'active'
  ) then
    raise exception 'Only an active Admin can assign an initial management task' using errcode = '42501';
  end if;
  if jsonb_typeof(p_lead) is distinct from 'object' or p_lead->>'initial_management_task_id' is null then
    raise exception 'A linked lead and initial task are required' using errcode = '22023';
  end if;
  if (p_lead->>'created_by')::uuid is distinct from actor_id then
    raise exception 'Lead creator must match the signed-in Admin' using errcode = '42501';
  end if;

  company_id := (p_lead->>'company_id')::uuid;
  if company_id is null then
    input_company := jsonb_populate_record(null::public.companies, p_lead);
    insert into public.companies (
      company_name, legal_name, year_established, industry, location, address, phone, website,
      google_place_id, google_maps_url, google_rating, google_review_count, latitude, longitude,
      business_category, opening_hours, enrichment_source, enrichment_status, enriched_at,
      enrichment_updated_at, created_by
    ) values (
      input_company.company_name, input_company.legal_name, input_company.year_established,
      input_company.industry, input_company.location, input_company.address, input_company.phone,
      input_company.website, input_company.google_place_id, input_company.google_maps_url,
      input_company.google_rating, input_company.google_review_count, input_company.latitude,
      input_company.longitude, input_company.business_category, input_company.opening_hours,
      input_company.enrichment_source, input_company.enrichment_status, input_company.enriched_at,
      input_company.enriched_at, actor_id
    ) returning id into company_id;
  end if;

  -- Insert only supplied fields so PostgreSQL still applies defaults for omitted fields.
  p_lead := (p_lead - 'id') || jsonb_build_object('company_id', company_id);
  select string_agg(format('%I', key), ', ' order by key) into lead_columns
    from jsonb_object_keys(p_lead) as fields(key);
  insert_lead := format('insert into public.leads (%1$s) select %1$s from jsonb_populate_record(null::public.leads, $1) returning id', lead_columns);
  begin
    execute insert_lead into strict saved_id using p_lead;
  exception when check_violation then
    get stacked diagnostics rejected_constraint = constraint_name, rejected_table = table_name,
      rejected_schema = schema_name;
    if p_lead->>'lead_status' = 'NEW' and rejected_schema = 'public' and rejected_table = 'leads'
      and rejected_constraint = 'leads_status_blueprint_check' then
      execute insert_lead into strict saved_id using p_lead || '{"lead_status":"PROSPECT"}'::jsonb;
    else
      raise;
    end if;
  end;

  select to_jsonb(l) into strict saved_lead from public.leads l where l.id = saved_id;
  return saved_lead;
end;
$$;

revoke all on function public.save_initial_management_lead(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_initial_management_lead(jsonb) to authenticated;
notify pgrst, 'reload schema';

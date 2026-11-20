begin;

do $$ begin
  if to_regprocedure('public.save_initial_management_lead(jsonb)') is null then
    raise exception 'The released atomic initial-management registration RPC is required.';
  end if;
end $$;

create or replace function public.save_initial_management_lead(p_lead jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  actor_id uuid := auth.uid();
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
    select string_agg(format('%I', a.attname), ', ' order by a.attnum) into company_columns
      from pg_attribute a
      where a.attrelid = 'public.companies'::regclass and a.attnum > 0 and not a.attisdropped
        and a.attname in (
          'company_name', 'legal_name', 'year_established', 'industry', 'location', 'address', 'phone', 'website',
          'google_place_id', 'google_maps_url', 'google_rating', 'google_review_count', 'latitude', 'longitude',
          'business_category', 'opening_hours', 'enrichment_source', 'enrichment_status', 'enriched_at',
          'enrichment_updated_at', 'created_by'
        ) and (p_lead ? a.attname::text or a.attname in ('created_by', 'enrichment_updated_at'));
    execute format('insert into public.companies (%1$s) select %1$s from jsonb_populate_record(null::public.companies, $1) returning id', company_columns)
      into strict company_id using p_lead || jsonb_build_object('created_by', actor_id, 'enrichment_updated_at', p_lead->'enriched_at');
  end if;

  -- Lookup-based SELECT policies cannot see the inserted lead during INSERT RETURNING.
  -- A separate read in this transaction preserves RLS and observes the task trigger's updates.
  saved_id := gen_random_uuid();
  p_lead := (p_lead - 'id') || jsonb_build_object('company_id', company_id, 'id', saved_id);
  select string_agg(format('%I', key), ', ' order by key) into lead_columns
    from jsonb_object_keys(p_lead) as fields(key);
  insert_lead := format('insert into public.leads (%1$s) select %1$s from jsonb_populate_record(null::public.leads, $1)', lead_columns);
  begin
    execute insert_lead using p_lead;
  exception when check_violation then
    get stacked diagnostics rejected_constraint = constraint_name, rejected_table = table_name,
      rejected_schema = schema_name;
    if p_lead->>'lead_status' = 'NEW' and rejected_schema = 'public' and rejected_table = 'leads'
      and rejected_constraint = 'leads_status_blueprint_check' then
      execute insert_lead using p_lead || '{"lead_status":"PROSPECT"}'::jsonb;
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
commit;

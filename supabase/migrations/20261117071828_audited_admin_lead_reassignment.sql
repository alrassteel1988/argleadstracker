-- Current assignment controls sales access; original authorship is audit evidence only.
create or replace function private.crm_can_access_lead(target_lead_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select private.crm_is_leadership()
    or exists (
      select 1 from public.leads lead
      join public.profiles profile on profile.id = auth.uid()
      where lead.id = target_lead_id and profile.status = 'active' and profile.role = 'salesman'
        and (lead.assigned_to = profile.id
          or (lead.assigned_to is null and nullif(btrim(lead.assigned_salesman), '') is not null
            and lower(btrim(lead.assigned_salesman)) = lower(btrim(profile.full_name))
            and not exists (select 1 from public.profiles other where other.id <> profile.id
              and other.role = 'salesman' and other.status = 'active'
              and lower(btrim(other.full_name)) = lower(btrim(profile.full_name)))))
    );
$$;

-- The definer is private so PostgREST exposes only the invoker wrapper. Validate
-- the authenticated Admin and constrain every caller-supplied edit before elevation.
create or replace function private.reassign_lead(
  p_lead_id uuid, p_target_id uuid, p_note text, p_expected_updated_at timestamptz, p_patch jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog
as $$
declare
  v_actor public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_lead public.leads%rowtype;
  v_previous_uid uuid;
  v_prior_matches uuid[];
  v_note text := regexp_replace(coalesce(p_note, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_territory text;
  v_handoff_id text := 'handoff-' || gen_random_uuid()::text;
  v_at timestamptz := clock_timestamp();
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_columns text;
  v_event jsonb;
  v_allowed constant text[] := array[
    'company_name','industry','location','address','phone','website','google_place_id',
    'google_maps_url','google_rating','google_review_count','contact_name','contact_email',
    'hunter_confidence_score','lead_status','notes','territory','priority','estimated_value',
    'product_interest','activity_purpose','next_action','next_action_date','source','legal_name',
    'year_established','business_category','opening_hours','steel_products_likely_needed',
    'competitors_likely_using','certifications','estimated_scale','estimated_annual_revenue',
    'key_personnel','recent_projects','products_services_remarks','enrichment_source',
    'enrichment_status','enriched_at','enrichment_updated_at','lost_reason','lost_reason_detail',
    'lost_competitor','lost_at','lost_by','auto_enrichment','latitude','longitude'
  ];
begin
  select * into v_actor from public.profiles where id = auth.uid() for share;
  if not found or v_actor.status is distinct from 'active' or v_actor.role is distinct from 'admin' then
    raise exception 'Only an active Admin can reassign a lead.' using errcode = '42501';
  end if;
  if char_length(v_note) not between 20 and 4000 then
    raise exception 'Enter a handoff note of 20 to 4000 characters.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_patch) <> 'object'
    or exists (select 1 from jsonb_object_keys(v_patch) key where not key = any(v_allowed)) then
    raise exception 'Invalid lead edit in reassignment.' using errcode = '22023';
  end if;
  select * into v_target from public.profiles where id = p_target_id for share;
  if not found or v_target.status is distinct from 'active' or v_target.role is distinct from 'salesman'
    or nullif(btrim(v_target.full_name), '') is null then
    raise exception 'Choose an active Salesman with a display name.' using errcode = '22023';
  end if;
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead not found.' using errcode = 'PT404'; end if;
  if v_lead.updated_at is distinct from p_expected_updated_at then
    raise exception 'The lead changed. Refresh it before reassigning.' using errcode = 'PT409';
  end if;
  if v_lead.assigned_to = p_target_id then
    raise exception 'The selected Salesman already owns this lead.' using errcode = 'PT409';
  end if;

  v_previous_uid := v_lead.assigned_to;
  if v_previous_uid is null and nullif(btrim(v_lead.assigned_salesman), '') is not null then
    select array_agg(profile.id) into v_prior_matches from public.profiles profile
    where profile.role = 'salesman' and profile.status = 'active'
      and lower(btrim(profile.full_name)) = lower(btrim(v_lead.assigned_salesman));
    if cardinality(v_prior_matches) = 1 then v_previous_uid := v_prior_matches[1]; end if;
  end if;
  v_territory := coalesce(nullif(btrim(v_patch->>'territory'), ''), nullif(btrim(v_target.territory), ''), v_lead.territory, '');
  if v_territory not in ('UAE-North','UAE-South','Saudi','Oman','Kuwait','Bahrain','Mixed','') then
    raise exception 'Choose a valid territory for the handoff.' using errcode = '22023';
  end if;
  v_event := jsonb_build_object(
    'id', 'act-' || gen_random_uuid()::text, 'type', 'Handoff',
    'at', (v_at at time zone 'Asia/Dubai')::date, 'created_at', v_at, 'updated_at', v_at,
    'created_by', v_actor.id, 'created_by_name', v_actor.full_name, 'logged_by', v_actor.full_name,
    'version', 1, 'handoff_id', v_handoff_id, 'text',
    'Reassigned from ' || coalesce(nullif(v_lead.assigned_salesman,''), 'Unassigned') || ' to ' || v_target.full_name || '.'
  );
  insert into public.handoff_logs (lead_id, handoff_id, "timestamp", previous_owner_uid, previous_owner_name,
    new_owner_uid, new_owner_name, previous_territory, new_territory, handoff_note,
    initiated_by_uid, initiated_by_name, initiated_by_role)
  values (v_lead.id, v_handoff_id, v_at, v_previous_uid, coalesce(v_lead.assigned_salesman,''),
    v_target.id, v_target.full_name, coalesce(v_lead.territory,''), v_territory, v_note,
    v_actor.id, v_actor.full_name, v_actor.role);

  v_patch := v_patch || jsonb_build_object('assigned_to',v_target.id,'assigned_salesman',v_target.full_name,
    'territory',v_territory, 'activities',jsonb_build_array(v_event) || coalesce(v_lead.activities,'[]'::jsonb));
  -- Only keys in the fixed allowlist or the server-generated fields above can reach this statement.
  select string_agg(format('%1$I = patch.%1$I', key), ', ' order by key) into v_columns
    from jsonb_object_keys(v_patch) key;
  execute format('update public.leads l set %s from jsonb_populate_record(null::public.leads,$2) patch where l.id=$1 returning l.*', v_columns)
    into v_lead using p_lead_id, v_patch;
  if v_lead.id is null then raise exception 'Lead ownership was not changed.' using errcode = 'PT409'; end if;

  insert into public.notifications(recipient_uid,lead_id,type,title,message,payload)
  values (v_target.id,p_lead_id,'handoff','A lead was assigned to you',
    'Management assigned you a lead. Open the lead to review its handoff history.', '{}'::jsonb);
  if v_previous_uid is not null and v_previous_uid <> v_target.id then
    insert into public.notifications(recipient_uid,lead_id,type,title,message,payload)
    values (v_previous_uid,null,'handoff','Lead access updated',
      'Management reassigned a lead. It is no longer in your pipeline.', '{}'::jsonb);
  end if;
  return to_jsonb(v_lead);
end;
$$;

create or replace function public.reassign_lead(
  p_lead_id uuid, p_target_id uuid, p_note text, p_expected_updated_at timestamptz, p_patch jsonb
) returns jsonb language sql security invoker set search_path = pg_catalog
as $$ select private.reassign_lead(p_lead_id,p_target_id,p_note,p_expected_updated_at,p_patch) $$;

create or replace function private.guard_lead_owner_update()
returns trigger language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if current_user is distinct from (
    select pg_get_userbyid(proowner) from pg_proc
    where oid = 'private.reassign_lead(uuid,uuid,text,timestamp with time zone,jsonb)'::regprocedure
  ) then
    raise exception 'Lead ownership changes require the Admin handoff workflow.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_lead_owner_update on public.leads;
create trigger guard_lead_owner_update before update on public.leads for each row
  when (old.assigned_to is distinct from new.assigned_to or old.assigned_salesman is distinct from new.assigned_salesman)
  execute function private.guard_lead_owner_update();

revoke insert, update, delete, truncate on public.handoff_logs from public, anon, authenticated, service_role;
drop policy if exists "F04 notifications own" on public.notifications;
create policy "F04 notifications own" on public.notifications for select to authenticated
  using (recipient_uid = auth.uid() and (type <> 'handoff' or lead_id is null or private.crm_can_access_lead(lead_id)));
revoke all on function private.guard_lead_owner_update() from public, anon, authenticated;
revoke all on function private.reassign_lead(uuid,uuid,text,timestamptz,jsonb) from public, anon, authenticated;
revoke all on function public.reassign_lead(uuid,uuid,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function private.reassign_lead(uuid,uuid,text,timestamptz,jsonb) to authenticated;
grant execute on function public.reassign_lead(uuid,uuid,text,timestamptz,jsonb) to authenticated;
notify pgrst, 'reload schema';

-- Preserve existing PMRs and activities. File new PMRs and their timeline event together.
create or replace function public.file_lead_pmr(
  p_lead_id uuid, p_pmr jsonb, p_event jsonb, p_previous_activities jsonb, p_substantive_call boolean
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_lead public.leads%rowtype;
  v_pmr public.pmrs%rowtype;
  v_input public.pmrs%rowtype;
  v_event_id text := coalesce(p_event->>'id', '');
  v_activity_id text := coalesce(p_pmr->>'activity_id', '');
  v_items jsonb;
  v_meeting jsonb;
  v_prior_event jsonb;
  v_event jsonb;
  v_type text;
  v_outcome text;
  v_status text[];
  v_today date := (now() at time zone 'Asia/Dubai')::date;
begin
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status is distinct from 'active' then
    raise exception 'An active CRM account is required.' using errcode = '42501';
  end if;
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead not found.' using errcode = 'PT404';
  end if;
  if v_event_id !~ '^(act|pmr-act)-[a-zA-Z0-9-]{8,100}$' or v_activity_id = '' then
    raise exception 'Invalid meeting or filing reference.' using errcode = '22023';
  end if;

  v_items := coalesce(v_lead.activities, '[]'::jsonb);
  select item into v_prior_event from jsonb_array_elements(v_items) item where item->>'id' = v_event_id limit 1;
  select * into v_pmr from public.pmrs where lead_id = p_lead_id and activity_id = v_activity_id
    order by created_at desc limit 1;
  if found then
    if v_prior_event->>'pmr_id' = v_pmr.id::text and v_pmr.filed_by = v_uid then
      return jsonb_build_object('pmr', to_jsonb(v_pmr), 'lead', to_jsonb(v_lead), 'duplicate', true);
    end if;
    raise exception 'A PMR has already been filed for this meeting.' using errcode = 'PT409';
  end if;
  if v_prior_event is not null or v_items is distinct from p_previous_activities then
    raise exception 'The activities changed. Refresh the lead before filing the PMR.' using errcode = 'PT409';
  end if;
  v_input := jsonb_populate_record(null::public.pmrs, p_pmr);
  if v_input.meeting_date is null or not isfinite(v_input.meeting_date) or v_input.meeting_date > v_today then
    raise exception 'Choose a completed customer meeting with a valid date no later than today.' using errcode = '22023';
  end if;

  if v_activity_id <> v_event_id then
    select item into v_meeting from jsonb_array_elements(v_items) item where item->>'id' = v_activity_id limit 1;
    v_type := lower(btrim(coalesce(v_meeting->>'type', '')));
    v_outcome := lower(btrim(coalesce(nullif(v_meeting->>'transaction_outcome', ''), v_meeting->>'outcome', '')));
    v_status := array[lower(btrim(coalesce(v_meeting->>'status', ''))),
      lower(btrim(coalesce(v_meeting->>'transaction_status', ''))),
      lower(btrim(coalesce(v_meeting->>'followup_resolution', '')))];
    if v_meeting is null or left(coalesce(v_meeting->>'at', ''), 10) <> to_char(v_input.meeting_date, 'YYYY-MM-DD')
      or exists (select 1 from jsonb_each(v_meeting) entry where entry.key in ('archived', 'reminder', 'delete_request', 'correction')
        and entry.value not in ('null', 'false', '""', '0'))
      or v_meeting->>'deletion_status' = 'pending'
      or v_status && array['cancelled', 'canceled', 'scheduled', 'planned', 'in progress', 'in_progress', 'not reached', 'failed']
      or v_outcome ~ 'not reached|no answer|voicemail|wrong number|invalid number|meeting booked'
      or (v_type = 'phone call' and (p_substantive_call is distinct from true
        or v_outcome not in ('spoke to customer', 'done - spoke to customer', 'connected')))
      or (v_type <> 'phone call' and (
        v_type not in ('in-person meeting', 'site visit', 'video call', 'video meeting', 'customer meeting', 'meeting', 'visit')
        or (not (v_status && array['completed', 'closed', 'done'])
          and v_meeting->'followup_completed' is distinct from 'true'::jsonb and v_outcome !~ '^done\y'
          and exists (select 1 from jsonb_each(v_meeting) entry
            where entry.key in ('due_date', 'due_at', 'reminder', 'next_action_date', 'followup_label')
            and entry.value not in ('null', 'false', '""', '0'))))) then
      raise exception 'Choose a completed customer meeting, visit, video meeting, or a confirmed substantive call.'
        using errcode = '22023';
    end if;
    v_type := 'PMR Filed';
  else
    v_type := coalesce(p_event->>'type', '');
    if v_type not in ('In-Person Meeting', 'Site Visit', 'Video Call', 'Phone Call')
      or (v_type = 'Phone Call' and p_substantive_call is distinct from true) then
      raise exception 'Choose a meeting type and confirm that any phone call was substantive.' using errcode = '22023';
    end if;
  end if;

  insert into public.pmrs (company_id, lead_id, activity_id, meeting_date, filed_by, products_discussed,
    competitors_mentioned, compliance_requirements, relationship_heat_score, first_order_timing,
    potential_annual_value, director_action_required, account_status, raw_document_url, notes,
    voice_note_id, voice_note_url, voice_note_path, voice_note_mime_type, voice_note_size_bytes, voice_note_transcript)
  values (v_lead.company_id, p_lead_id, v_activity_id, v_input.meeting_date, v_uid, v_input.products_discussed,
    v_input.competitors_mentioned, v_input.compliance_requirements, v_input.relationship_heat_score, v_input.first_order_timing,
    v_input.potential_annual_value, v_input.director_action_required, v_input.account_status, v_input.raw_document_url, v_input.notes,
    v_input.voice_note_id, v_input.voice_note_url, v_input.voice_note_path, v_input.voice_note_mime_type,
    v_input.voice_note_size_bytes, v_input.voice_note_transcript)
  returning * into v_pmr;

  v_event := jsonb_build_object(
    'id', v_event_id, 'type', v_type, 'text', 'PMR filed. Heat score ' || v_pmr.relationship_heat_score || '/5.',
    'at', case when v_type = 'PMR Filed' then v_today else v_pmr.meeting_date end,
    'activity_id', v_activity_id, 'meeting_activity_id', v_activity_id, 'pmr_id', v_pmr.id, 'pmr_linked', true,
    'target_activity_id', case when v_type = 'PMR Filed' then v_activity_id else '' end,
    'status', 'completed', 'transaction_status', 'closed',
    'transaction_outcome', case when v_type = 'Phone Call' then 'Done - spoke to customer' else '' end,
    'created_by', v_uid, 'created_by_name', coalesce(v_profile.full_name, ''),
    'created_at', now(), 'updated_at', now(), 'version', 1,
    'audit_history', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(),
      'action', 'pmr_filed', 'actor_id', v_uid, 'actor_name', coalesce(v_profile.full_name, ''), 'at', now())),
    'voice_note_id', v_pmr.voice_note_id, 'voice_note_url', v_pmr.voice_note_url,
    'voice_note_path', v_pmr.voice_note_path, 'voice_note_mime_type', v_pmr.voice_note_mime_type,
    'voice_note_size_bytes', v_pmr.voice_note_size_bytes, 'voice_note_transcript', v_pmr.voice_note_transcript,
    'quotation_ref', coalesce(p_event->>'quotation_ref', '')
  );
  update public.leads set
    activities = jsonb_build_array(v_event) || v_items,
    last_activity = case when v_type = 'PMR Filed' then v_lead.last_activity else greatest(v_lead.last_activity, v_pmr.meeting_date) end,
    tags = concat_ws(', ', nullif(v_lead.tags, ''), nullif(v_pmr.compliance_requirements, ''), nullif(v_pmr.competitors_mentioned, ''))
  where id = p_lead_id returning * into v_lead;
  if not found then
    raise exception 'The lead could not be updated.' using errcode = '42501';
  end if;
  return jsonb_build_object('pmr', to_jsonb(v_pmr), 'lead', to_jsonb(v_lead));
end;
$$;

revoke all on function public.file_lead_pmr(uuid, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.file_lead_pmr(uuid, jsonb, jsonb, jsonb, boolean) to authenticated;
notify pgrst, 'reload schema';

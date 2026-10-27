do $$ begin
  if has_function_privilege('anon', 'public.update_activity_transaction(uuid,text,integer,text,text,text,date)', 'execute') then
    raise exception 'Anonymous access granted';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.update_activity_transaction('10000000-0000-0000-0000-000000000001', 'a', 1, 'pending', 'Call back requested', 'Please call back', '2026-11-01');
do $$ declare v_activity jsonb; begin
  select activities->0 into v_activity from public.leads where id='10000000-0000-0000-0000-000000000001';
  if v_activity->>'transaction_status' <> 'pending' or v_activity->>'transaction_remarks' <> 'Please call back'
    or v_activity->>'version' <> '2' or v_activity->>'text' <> 'Original'
    or v_activity->'audit_history'->0->>'actor_id' <> '00000000-0000-0000-0000-000000000001' then
    raise exception 'Transaction data not preserved';
  end if;
  if (select activities->1->>'text' from public.leads where id='10000000-0000-0000-0000-000000000001') <> 'Keep'
    or (select last_activity from public.leads where id='10000000-0000-0000-0000-000000000001') <> '2026-01-01'::date then
    raise exception 'Unrelated activity or last-contact date changed';
  end if;
  begin
    perform public.update_activity_transaction('10000000-0000-0000-0000-000000000001', 'a', 1, 'closed', 'Done - spoke to customer', 'Done', null);
    raise exception 'Stale version accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.update_activity_transaction('10000000-0000-0000-0000-000000000002', 'other', 1, 'closed', 'Done - spoke to customer', 'Done', null);
    raise exception 'Unassigned lead accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.update_activity_transaction('10000000-0000-0000-0000-000000000001', 'b', 1, 'pending', 'Call back requested', ' ', '2026-11-01');
    raise exception 'Blank remark accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_activity_transaction('10000000-0000-0000-0000-000000000003', 'dup', 1, 'closed', 'Done - spoke to customer', 'Done', null);
    raise exception 'Duplicate ID accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_activity_transaction('10000000-0000-0000-0000-000000000001', 'b', 1, 'pending', 'Call back requested', 'Needs date', null);
    raise exception 'Missing date accepted';
  exception when invalid_parameter_value then null; end;
end $$;

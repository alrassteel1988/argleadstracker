-- Explicitly approved staging only. Uses the designated synthetic accounts; always rolls back.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '3s';

do $$
declare
  admin_id uuid;
  sales_id uuid;
  sales_name text;
  prefix text := 'CODEX-INSERT-POLICY-' || gen_random_uuid()::text;
  body jsonb;
  assigned jsonb;
  unassigned jsonb;
  other_owner jsonb;
  rfq jsonb;
  closed jsonb;
  self_lead jsonb;
  country text;
  patch jsonb;
  rejected boolean;
  visible_count integer;
  direct_id uuid := gen_random_uuid();
  checks jsonb := '[]';
begin
  select p.id into strict admin_id from public.profiles p join auth.users u on u.id=p.id
    where lower(u.email)='admin@alrassteeltest.com' and p.role='admin' and p.status='active';
  select p.id,p.full_name into strict sales_id,sales_name from public.profiles p join auth.users u on u.id=p.id
    where lower(u.email)='sales@alrassteeltest.com' and p.role='salesman' and p.status='active';
  if nullif(sales_name,'') is null then raise exception 'Named synthetic Salesman required'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='leads'
    and policyname='CRM lead insert' and cmd='INSERT' and permissive='PERMISSIVE') then
    raise exception 'Approved INSERT repair is not installed';
  end if;

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','email','admin@alrassteeltest.com')::text,true);
  execute 'set local role authenticated';
  body := jsonb_build_object('company_name',prefix||'-admin-assigned','created_by',admin_id,
    'assigned_to',sales_id,'assigned_salesman',sales_name,'territory','Qatar','lead_status','NEW',
    'notes','Rollback-only synthetic policy acceptance.','activities','[]'::jsonb,'next_action','','next_action_date',null);
  assigned := public.save_new_crm_lead(body);
  if (assigned->>'assigned_to')::uuid is distinct from sales_id or (assigned->>'created_by')::uuid is distinct from admin_id
    or assigned->>'territory' is distinct from 'Qatar' then raise exception 'Admin assignment failed'; end if;
  unassigned := public.save_new_crm_lead(body||jsonb_build_object('company_name',prefix||'-admin-unassigned',
    'assigned_to',null,'assigned_salesman','Unassigned','territory','India'));
  if unassigned->>'assigned_to' is not null then raise exception 'Admin Unassigned lead failed'; end if;
  other_owner := public.save_new_crm_lead(body||jsonb_build_object('company_name',prefix||'-other-owner',
    'assigned_to',admin_id,'assigned_salesman','Admin','territory','Qatar'));
  rfq := public.save_initial_management_lead(body||jsonb_build_object('company_name',prefix||'-initial-rfq',
    'territory','Syria','initial_management_task_id',gen_random_uuid(),
    'next_action','Respond to Initial RFQ','activity_purpose','Quotation Submission'));
  select count(*) into visible_count from public.management_tasks where id=(rfq->>'initial_management_task_id')::uuid
    and lead_id=(rfq->>'id')::uuid and assignee_id=sales_id and title='Respond to Initial RFQ';
  if visible_count<>1 then raise exception 'Admin initial RFQ task linkage failed'; end if;
  checks := checks || '["Admin assigned international registration","Admin Unassigned registration","Admin initial RFQ task linkage"]'::jsonb;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub',sales_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sales_id,'role','authenticated','email','sales@alrassteeltest.com')::text,true);
  execute 'set local role authenticated';
  body := body||jsonb_build_object('created_by',sales_id);
  foreach country in array array['Qatar','India','Iraq','Syria','Turkmenistan'] loop
    self_lead := public.save_new_crm_lead(body||jsonb_build_object('company_name',prefix||'-sales-'||country,'territory',country));
    if (self_lead->>'assigned_to')::uuid is distinct from sales_id or (self_lead->>'created_by')::uuid is distinct from sales_id
      or self_lead->>'assigned_salesman' is distinct from sales_name or self_lead->>'territory' is distinct from country then
      raise exception 'Salesman international ownership failed';
    end if;
  end loop;
  checks := checks || '["Salesman Qatar/India/Iraq/Syria/custom registration"]'::jsonb;

  insert into public.leads(id,company_id,company_name,created_by,assigned_to,assigned_salesman,territory,lead_status,next_action,next_action_date)
    values(direct_id,(self_lead->>'company_id')::uuid,prefix||'-direct-self',sales_id,sales_id,sales_name,'Netherlands',self_lead->>'lead_status','',null);
  select count(*) into visible_count from public.leads where id=direct_id and assigned_to=sales_id;
  if visible_count<>1 then raise exception 'Valid direct self-owned insert failed'; end if;
  for patch in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('assigned_to',null),jsonb_build_object('assigned_to',admin_id),
    jsonb_build_object('assigned_salesman','Unassigned'),jsonb_build_object('territory',''),
    jsonb_build_object('territory',repeat('x',101)),jsonb_build_object('territory',E'India\nPrivate'),
    jsonb_build_object('territory','__custom_territory__'))) loop
    rejected := false;
    begin
      insert into public.leads(company_id,company_name,created_by,assigned_to,assigned_salesman,territory,lead_status,next_action,next_action_date)
        values((self_lead->>'company_id')::uuid,prefix||'-rejected-'||gen_random_uuid()::text,sales_id,
          case when patch ? 'assigned_to' then (patch->>'assigned_to')::uuid else sales_id end,
          case when patch ? 'assigned_salesman' then patch->>'assigned_salesman' else sales_name end,
          case when patch ? 'territory' then patch->>'territory' else 'India' end,self_lead->>'lead_status','',null);
    exception when insufficient_privilege then rejected := true;
    end;
    if not rejected then raise exception 'Unsafe direct INSERT was accepted'; end if;
  end loop;
  checks := checks || '["Valid direct self-owned INSERT","Direct NULL/other-owner/name bypass rejected","Direct invalid territory rejected"]'::jsonb;

  for patch in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('created_by',admin_id),jsonb_build_object('assigned_to',null),
    jsonb_build_object('assigned_to',admin_id),jsonb_build_object('assigned_salesman','Unassigned'))) loop
    rejected := false;
    begin
      perform public.save_new_crm_lead(body||patch||jsonb_build_object('company_name',prefix||'-rejected-rpc-'||gen_random_uuid()::text));
    exception when insufficient_privilege then rejected := true;
    end;
    if not rejected then raise exception 'Unsafe registration RPC was accepted'; end if;
  end loop;
  rejected := false;
  begin
    perform public.save_new_crm_lead(body||jsonb_build_object('company_name',prefix||'-bad-territory','territory',''));
  exception when invalid_parameter_value then rejected := true;
  end;
  if not rejected then raise exception 'Blank RPC territory was accepted'; end if;
  rejected := false;
  begin
    perform public.save_initial_management_lead(body||jsonb_build_object('company_name',prefix||'-forged-task',
      'initial_management_task_id',gen_random_uuid(),'next_action','Respond to Initial RFQ'));
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Salesman created an Admin-only management task'; end if;
  checks := checks || '["RPC forged creator/owner/name rejected","RPC invalid territory rejected","Admin-only initial task permission preserved"]'::jsonb;

  select count(*) into visible_count from public.leads where id in ((unassigned->>'id')::uuid,(other_owner->>'id')::uuid);
  if visible_count<>0 then raise exception 'Unassigned or other-owner lead disclosed to Salesman'; end if;
  select count(*) into visible_count from public.leads where id=(assigned->>'id')::uuid;
  if visible_count<>1 then raise exception 'Assigned lead unavailable to Salesman'; end if;
  select count(*) into visible_count from public.management_tasks where id=(rfq->>'initial_management_task_id')::uuid;
  if visible_count<>1 then raise exception 'Assigned RFQ task unavailable to Salesman'; end if;
  checks := checks || '["Current-assignment isolation","Assigned RFQ task visible to Salesman"]'::jsonb;

  closed := public.save_new_crm_lead(body||jsonb_build_object('company_name',prefix||'-closed',
    'lead_status','CLOSED_NOT_INTERESTED','closed_reason','Uses another supplier','closed_note','Synthetic closure, rollback-only.'));
  if closed->>'is_archived' is distinct from 'true' or closed->>'lead_status' is distinct from 'CLOSED_NOT_INTERESTED' then
    raise exception 'Closed registration response regressed';
  end if;
  select count(*) into visible_count from public.leads where id=(closed->>'id')::uuid;
  if visible_count<>0 then raise exception 'Closed lead disclosed to Salesman'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','email','admin@alrassteeltest.com')::text,true);
  execute 'set local role authenticated';
  select count(*) into visible_count from public.leads where id=(closed->>'id')::uuid
    and is_archived and closed_reason='Uses another supplier' and jsonb_array_length(activities)>0;
  if visible_count<>1 then raise exception 'Admin archive or creation history regressed'; end if;
  checks := checks || '["Closed registration and minimal response","Archive visibility and creation history retained"]'::jsonb;
  execute 'reset role';
  perform set_config('arg.insert_policy_test',jsonb_build_object('passed',true,'checks',checks,'rollback_only',true)::text,true);
end;
$$;

select current_setting('arg.insert_policy_test')::jsonb as staging_test_result;
rollback;

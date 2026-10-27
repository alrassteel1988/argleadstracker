-- Review before applying: assigns stable identifiers only to activity objects
-- whose IDs are missing or empty. Existing IDs, ordering and content remain intact.
-- Ambiguous existing IDs must be resolved separately; they cannot be rewritten
-- safely without inspecting references from PMRs and other records.
do $$
begin
  if exists (
    select 1
    from public.leads as lead
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(lead.activities) = 'array' then lead.activities else '[]'::jsonb end
    ) as item(value)
    where jsonb_typeof(item.value) = 'object'
      and nullif(btrim(item.value->>'id'), '') is not null
    group by lead.id, item.value->>'id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate activity IDs exist within a lead; review references before assigning IDs';
  end if;
end $$;

update public.leads as lead
set activities = (
  select jsonb_agg(
    case
      when jsonb_typeof(item.value) = 'object'
       and (item.value->>'id' is null or btrim(item.value->>'id') = '')
      then jsonb_set(item.value, '{id}', to_jsonb('act_' || gen_random_uuid()::text), true)
      else item.value
    end
    order by item.ordinality
  )
  from jsonb_array_elements(case when jsonb_typeof(lead.activities) = 'array' then lead.activities else '[]'::jsonb end) with ordinality as item(value, ordinality)
)
where jsonb_typeof(lead.activities) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(case when jsonb_typeof(lead.activities) = 'array' then lead.activities else '[]'::jsonb end) as item(value)
    where jsonb_typeof(item.value) = 'object'
      and (item.value->>'id' is null or btrim(item.value->>'id') = '')
  );

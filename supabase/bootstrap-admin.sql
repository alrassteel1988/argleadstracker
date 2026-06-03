-- First create this email in Supabase Dashboard > Authentication > Users.
-- Then run this file once in the Supabase SQL editor.
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"name":"Glory","territory":"All"}'::jsonb
where email = 'glory@alrassteel.com';

insert into public.profiles (id, full_name, role, territory, status)
select id, 'Glory', 'admin', 'All', 'active'
from auth.users
where email = 'glory@alrassteel.com'
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  territory = excluded.territory,
  status = excluded.status;

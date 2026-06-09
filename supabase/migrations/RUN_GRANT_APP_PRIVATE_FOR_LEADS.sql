grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;
alter default privileges in schema app_private grant execute on functions to authenticated;

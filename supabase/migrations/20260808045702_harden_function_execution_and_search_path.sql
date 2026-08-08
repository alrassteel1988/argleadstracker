-- Harden function execution grants and search paths flagged by Supabase advisors.
-- Keep weekly report RPCs callable by signed-in app users only.

revoke execute on function public.submit_weekly_report(jsonb, integer, text) from public;
revoke execute on function public.submit_weekly_report(jsonb, integer, text) from anon;
grant execute on function public.submit_weekly_report(jsonb, integer, text) to authenticated;

revoke execute on function public.review_weekly_report(text, text, text, text, text) from public;
revoke execute on function public.review_weekly_report(text, text, text, text, text) from anon;
grant execute on function public.review_weekly_report(text, text, text, text, text) to authenticated;

alter function app_private.admin_email()
  set search_path = app_private, public, pg_temp;

alter function app_private.current_email()
  set search_path = app_private, public, pg_temp;

alter function app_private."current_role"()
  set search_path = app_private, public, pg_temp;

alter function app_private.is_admin()
  set search_path = app_private, public, pg_temp;

alter function app_private.is_manager()
  set search_path = app_private, public, pg_temp;

alter function app_private.can_write_tracker()
  set search_path = app_private, public, pg_temp;

alter function app_private.assigned_to_user(jsonb)
  set search_path = app_private, public, pg_temp;

alter function app_private.can_read_company(jsonb)
  set search_path = app_private, public, pg_temp;

alter function app_private.can_read_company_id(text)
  set search_path = app_private, public, pg_temp;

revoke execute on function app_private.admin_email() from public, anon;
revoke execute on function app_private.current_email() from public, anon;
revoke execute on function app_private."current_role"() from public, anon;
revoke execute on function app_private.is_admin() from public, anon;
revoke execute on function app_private.is_manager() from public, anon;
revoke execute on function app_private.can_write_tracker() from public, anon;
revoke execute on function app_private.assigned_to_user(jsonb) from public, anon;
revoke execute on function app_private.can_read_company(jsonb) from public, anon;
revoke execute on function app_private.can_read_company_id(text) from public, anon;

grant execute on function app_private.admin_email() to authenticated;
grant execute on function app_private.current_email() to authenticated;
grant execute on function app_private."current_role"() to authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_manager() to authenticated;
grant execute on function app_private.can_write_tracker() to authenticated;
grant execute on function app_private.assigned_to_user(jsonb) to authenticated;
grant execute on function app_private.can_read_company(jsonb) to authenticated;
grant execute on function app_private.can_read_company_id(text) to authenticated;

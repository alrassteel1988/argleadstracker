-- Restore the missing field without replaying the historical next_action default change.
alter table public.leads
  add column if not exists activity_purpose text not null default 'Company Introductory';

alter table public.leads
  add column if not exists activity_purpose text not null default 'Company Introductory';

alter table public.leads
  alter column next_action set default 'To Call';

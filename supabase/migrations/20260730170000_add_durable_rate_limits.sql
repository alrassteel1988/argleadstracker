-- Shared, atomic request throttling for serverless/API instances.
-- The bucket table is private; only the service role may execute the public RPC wrappers.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create table if not exists private.rate_limit_buckets (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null default 0 check (request_count >= 0),
  strike_count integer not null default 0 check (strike_count between 0 and 5),
  blocked_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (scope, subject_hash),
  constraint rate_limit_subject_hash_format check (subject_hash ~ '^[a-f0-9]{64}$')
);

revoke all on table private.rate_limit_buckets from public;
revoke all on table private.rate_limit_buckets from anon;
revoke all on table private.rate_limit_buckets from authenticated;
grant select, insert, update, delete on table private.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_bucket private.rate_limit_buckets%rowtype;
  v_block_seconds integer;
begin
  if coalesce(length(trim(p_scope)), 0) = 0
    or p_subject_hash !~ '^[a-f0-9]{64}$'
    or p_limit < 1
    or p_window_seconds < 1
    or p_block_seconds < 1 then
    raise exception 'Invalid rate-limit request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || p_subject_hash, 0));

  insert into private.rate_limit_buckets (scope, subject_hash, window_started_at, updated_at)
  values (p_scope, p_subject_hash, v_now, v_now)
  on conflict (scope, subject_hash) do nothing;

  select *
  into v_bucket
  from private.rate_limit_buckets
  where scope = p_scope and subject_hash = p_subject_hash
  for update;

  if v_bucket.blocked_until is not null and v_bucket.blocked_until > v_now then
    return query select
      false,
      v_bucket.request_count,
      0,
      greatest(1, ceil(extract(epoch from (v_bucket.blocked_until - v_now)))::integer),
      v_bucket.blocked_until;
    return;
  end if;

  if v_bucket.blocked_until is not null
    or v_now >= v_bucket.window_started_at + make_interval(secs => p_window_seconds) then
    update private.rate_limit_buckets
    set window_started_at = v_now,
        request_count = 0,
        strike_count = case
          when blocked_until is not null then strike_count
          else greatest(0, strike_count - 1)
        end,
        blocked_until = null,
        updated_at = v_now
    where scope = p_scope and subject_hash = p_subject_hash
    returning * into v_bucket;
  end if;

  update private.rate_limit_buckets
  set request_count = request_count + 1,
      updated_at = v_now
  where scope = p_scope and subject_hash = p_subject_hash
  returning * into v_bucket;

  if v_bucket.request_count > p_limit then
    v_bucket.strike_count := least(5, v_bucket.strike_count + 1);
    v_block_seconds := least(
      86400,
      ceil(p_block_seconds * power(2, greatest(0, v_bucket.strike_count - 1)))::integer
    );
    update private.rate_limit_buckets
    set strike_count = v_bucket.strike_count,
        blocked_until = v_now + make_interval(secs => v_block_seconds),
        updated_at = v_now
    where scope = p_scope and subject_hash = p_subject_hash
    returning * into v_bucket;

    return query select
      false,
      v_bucket.request_count,
      0,
      v_block_seconds,
      v_bucket.blocked_until;
    return;
  end if;

  return query select
    true,
    v_bucket.request_count,
    greatest(0, p_limit - v_bucket.request_count),
    0,
    v_bucket.window_started_at + make_interval(secs => p_window_seconds);
end;
$$;

create or replace function public.reset_rate_limit(
  p_scope text,
  p_subject_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
begin
  if coalesce(length(trim(p_scope)), 0) = 0 or p_subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate-limit reset request';
  end if;
  delete from private.rate_limit_buckets
  where scope = p_scope and subject_hash = p_subject_hash;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer, integer) from public;
revoke all on function public.consume_rate_limit(text, text, integer, integer, integer) from anon;
revoke all on function public.consume_rate_limit(text, text, integer, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer, integer) to service_role;

revoke all on function public.reset_rate_limit(text, text) from public;
revoke all on function public.reset_rate_limit(text, text) from anon;
revoke all on function public.reset_rate_limit(text, text) from authenticated;
grant execute on function public.reset_rate_limit(text, text) to service_role;

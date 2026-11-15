-- Maison Matcha Club foundation. REVIEW ONLY: not applied to any database.
-- Requires a dedicated Maison Matcha Supabase project. PostgreSQL 15+.
create extension if not exists pgcrypto;
create schema if not exists club_private;
revoke all on schema club_private from public, anon, authenticated;
create table public.club_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check(length(display_name) between 1 and 120),
  phone text, created_at timestamptz not null default now()
);
create table public.club_staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','manager','service','accountant')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.club_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_lo text not null, title_en text not null,
  price_lak bigint not null check(price_lak >= 0),
  included_cups integer not null check(included_cups > 0),
  duration_days integer not null check(duration_days between 1 and 366),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan_id uuid not null references public.club_plans(id),
  status text not null default 'pending' check(status in ('pending','active','suspended','expired','cancelled')),
  starts_at timestamptz, expires_at timestamptz,
  created_at timestamptz not null default now(),
  check(expires_at is null or starts_at is null or expires_at > starts_at)
);
create table public.club_payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id),
  amount_lak bigint not null check(amount_lak > 0),
  status text not null default 'pending' check(status in ('pending','approved','rejected','refunded')),
  bank_reference text,
  slip_path text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index club_payments_bank_reference_unique on public.club_payments(bank_reference) where bank_reference is not null;
create table public.club_cards (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id),
  token_hash text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.club_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check(status in ('pending','confirmed','preparing','ready','fulfilled','cancelled')),
  channel text not null check(channel in ('web','instore')),
  created_at timestamptz not null default now()
);
create table public.club_redemptions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id),
  order_id uuid references public.club_orders(id),
  cups integer not null check(cups > 0),
  status text not null check(status in ('reserved','consumed','released','reversed')),
  idempotency_key text not null unique,
  loyverse_receipt_id text unique,
  created_at timestamptz not null default now()
);
create table public.club_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id),
  redemption_id uuid references public.club_redemptions(id),
  delta_cups integer not null check(delta_cups <> 0),
  event_type text not null check(event_type in ('grant','reserve','release','consume','reverse','expire','adjust')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index club_balance_ledger_member_idx on public.club_balance_ledger(membership_id,created_at);
create table public.club_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- All public tables are default-deny. Members may read their own records only.
do $$ declare t text; begin
  foreach t in array array['club_profiles','club_staff_roles','club_plans','club_memberships','club_payments','club_cards','club_orders','club_redemptions','club_balance_ledger','club_audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;
grant select on public.club_profiles, public.club_plans, public.club_memberships,
  public.club_payments, public.club_orders, public.club_redemptions,
  public.club_balance_ledger to authenticated;
grant select on public.club_plans to anon;
create policy club_public_plans on public.club_plans for select to anon,authenticated using (active = true);
create policy club_own_profile on public.club_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy club_own_membership on public.club_memberships for select to authenticated using (user_id = (select auth.uid()));
create policy club_own_payment on public.club_payments for select to authenticated using (
  exists(select 1 from public.club_memberships m where m.id = membership_id and m.user_id = (select auth.uid()))
);
create policy club_own_orders on public.club_orders for select to authenticated using (user_id = (select auth.uid()));
create policy club_own_redemptions on public.club_redemptions for select to authenticated using (
  exists(select 1 from public.club_memberships m where m.id = membership_id and m.user_id = (select auth.uid()))
);
create policy club_own_ledger on public.club_balance_ledger for select to authenticated using (
  exists(select 1 from public.club_memberships m where m.id = membership_id and m.user_id = (select auth.uid()))
);
-- No client-side writes, staff-role reads, card token reads, or audit-log reads.
-- All sensitive writes must go through verified, audited server endpoints and atomic transactions.
-- Never expose a Supabase secret/service-role key to a browser.

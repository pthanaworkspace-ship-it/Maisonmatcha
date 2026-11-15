# Maison Matcha Club — isolated foundation (Phase 1–2)

**Status:** review-only; not activated. Production `main` and `maisonmatcha.live` unchanged.

## Audit
- Repository: `pthanaworkspace-ship-it/Maisonmatcha`.
- Production: Vercel `maison-matcha-order`, framework Other/static, Python build `build_for_vercel.py`, output `dist`.
- Existing public routes: `/`, `/menu`, `/matcha`, `/order`, `/visit`. Order uses WhatsApp and a static Lao QR.
- Supabase project listing returned only `Coolkit`; **do not deploy Club schema to Coolkit**.

## Phase 1: regression gate
Run `python3 tests/test_site_smoke.py`. It builds into `dist/` and verifies five pages, local assets, order WhatsApp button, and QR insertion when the QR image exists. Do not merge until preview smoke tests and mobile checkout checks pass.

## Phase 2: schema security
Review `supabase/migrations/20261115000100_club_foundation.sql` in a **new, dedicated Maison Matcha Supabase project**. The migration is **not applied**. It creates plans, memberships, payments, card hashes, orders, redemptions, append-only entitlement ledger, staff roles and audit logs.

- Every exposed table enables RLS, and authenticated clients only receive scoped read policies for their own records.
- No direct client write permissions, staff-role reads, raw QR token reads, or audit-log reads.
- No service-role key in the browser. Staff approval, redemption, issuance and refund operations require audited, transactional server endpoints not yet implemented.
- No actual balance deduction or member signup is available in this phase.
- Private payment-slip storage bucket and storage policies require a dedicated project and further review.

## Before any production change
1. Approve creation of a dedicated Maison Matcha Supabase project and its region/billing.
2. Approve auth method (verified phone or email), membership rules and staff roles.
3. Review migrations and run security advisors in the isolated project; test RLS as two different members, anonymous user and service actor.
4. Implement atomic redemption/reservation operations and authenticated API before enabling Club pages.
5. Add Vercel preview-only credentials and test the preview; production credentials only after explicit approval.
6. Obtain and securely configure Loyverse API access separately, after capability review.
7. Review a PR; never auto-merge to `main`.

## Known design decisions
- Staff role membership is stored in a server-controlled table, not user metadata.
- Current SQL is an initial read-only access model. Additional tables (order items, stock, accounting, sync events) and atomic mutation functions belong to later phases.
- Club QR tokens should be random, revocable and stored only as hashes; actual card generation is later.
- Current schema is a proposal; test in a new project before applying.

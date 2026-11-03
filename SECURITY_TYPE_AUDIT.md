# Security & Type Audit Report

**Review date:** 2026-11-02  
**Scope:** Repository-level defensive source review of `src/`, Prisma schema/migrations, API contracts, CI, and focused unit/E2E tests. This was not an external network penetration test and did not target a deployed system.

## Executive Summary

The requested feature work is implemented, and the reviewed high-impact authorization and payment-state findings were addressed. Admin appointment exports remain admin-only; partner API keys now access only explicitly scoped public catalog/availability reads. Access JWTs are bound to active sessions, and password changes revoke other sessions. Payment initialization and webhook state transitions now serialize on the appointment row and recheck state transactionally.

No unresolved high-severity issue was confirmed during this source review. This is not a certification or guarantee that no vulnerabilities exist; residual limitations are listed below.

## Threat Areas Reviewed

- **IDOR and authorization:** user appointment listing is scoped to the authenticated user; cancel/reschedule/status/review use cases enforce participant ownership or the explicit admin/provider role. Admin routes use router-level JWT and role guards. Service mutations verify provider ownership. Partner routes use independent API-key scope checks.
- **Mass assignment and trusted values:** registration explicitly passes accepted fields and creates client-role users; service writes use validated fields; payment amount comes from the stored service price; API-key creation uses a strict schema and an allowlist of scopes.
- **Booking and payment races:** booking/reschedule paths use serializable transactions and conditional state updates. Payment initialization, session attachment, and verified webhook transitions now lock the appointment row and recheck current appointment/payment state. Webhook event IDs are unique per provider and committed atomically with state changes.
- **Webhook authenticity:** Stripe requests are parsed as raw buffers on the webhook route and verified by the Stripe SDK against the configured signature secret before dispatch.
- **Session/token lifecycle:** refresh tokens are stored as hashes, rotate once, and replay revokes active sessions. Access JWTs include a session ID and protected routes verify that the session remains active. Password changes revoke all other sessions while preserving the current session.
- **API-key handling:** keys use 256-bit random secrets, are shown only on creation, are stored as SHA-256 hashes, and are checked for revocation, expiry, and required scope. The partner report scope was removed after review because it granted a global booking export; exports remain admin-only.
- **Streaming and resource use:** report export uses bounded, ID-keyset batches and a Node readable stream rather than loading the full dataset into memory. Export columns are IDs, timestamps, and enums rather than free-form spreadsheet cells.

## Fixes Applied

- Prevented revoked or expired sessions from continuing to authorize access JWTs.
- Revoked other active sessions after a successful password change.
- Rejected expired consumed refresh tokens before replay-revocation handling.
- Rechecked appointment state under lock before creating or attaching checkout sessions; aligned webhook lock ordering to avoid reopening paid appointments.
- Removed global appointment export from partner scopes; partner integrations can read only public service and availability data with separate scopes.
- Rejected API-key mass-assignment fields and expiration times that are already in the past.
- Added whole-project strict TypeScript checking and fixed all reported errors without compiler suppressions, including exact-optional-property, in-memory Prisma model, Redis import, OpenAPI response, and test mock typing issues.

## Validation Evidence

- Session unit tests cover active-session lookup, preserving the current session on password change, and expired refresh-token handling.
- E2E tests cover session revocation/password-change behavior, API-key scope and revocation, invalid key creation inputs, payment-state transitions, and admin-only streaming export.
- OpenAPI tests verify the new route declarations and security schemes. CI runs `yarn typecheck` and `yarn openapi:check` in addition to the unit/E2E suites.
- Final validation passed: 112 unit tests across 27 files and 80 E2E tests across 27 files. `yarn typecheck`, `yarn lint`, `yarn build`, `yarn prisma validate`, and `yarn openapi:check` also passed.
- One earlier full E2E run performed concurrently with other validation jobs hit a single 500 in the existing concurrent-booking test; the case passed in isolation and the full E2E suite passed when rerun alone.

## Residual Limitations

- Stripe refund events are not currently mapped by the webhook verifier, so externally initiated refunds may require a follow-up event mapping and reconciliation process.
- Cache invalidation is best-effort while Redis is unavailable; short configured TTLs bound stale public catalog/availability data.
- API-key scopes currently authorize public catalog and public availability reads; there is no partner-specific tenant/resource binding model.
- The review was static and repository-local. It did not include live infrastructure, dependency supply-chain, container runtime, or third-party configuration testing.
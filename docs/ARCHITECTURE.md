# Architecture

## Application Structure

The application separates HTTP transport, business workflows, and persistence. Fastify routes and controllers validate requests and map responses; use cases own application rules; repository interfaces isolate the use cases from Prisma and in-memory persistence adapters. `src/app.ts` composes the HTTP application, while `src/server.ts` and `src/worker.ts` are separate process entry points.

## Transactional Outbox

Appointment creation and cancellation write their notification event in the same PostgreSQL transaction as the appointment change. This prevents a committed booking from losing its corresponding event if the process stops between database work and queue publication.

The worker polls pending outbox rows every two seconds in batches of up to 100 and enqueues BullMQ jobs using the event UUID as the job ID. Delivery retries up to five times with exponential backoff starting at one second. Successfully delivered records become `PROCESSED`; exhausted jobs become `FAILED`. The current notification adapter is intentionally a mock that logs supported appointment events, so replace it with a real delivery adapter before relying on external notifications.

## Session Management

Login issues a 15-minute bearer access token and a seven-day refresh token in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/auth` (also `Secure` in production). The raw refresh token is returned only to the cookie; the database stores its SHA-256 hash.

Refresh rotates the token transactionally: the old token is consumed, a new hash is stored, and session usage and expiry are updated. Reuse of an already-consumed token revokes all active sessions for that user. Users can list active sessions, revoke one session, or revoke all sessions. Access-token validation also checks that the associated session remains active.

## Redis Caching

Redis caches the public service catalog for 60 seconds and service/date availability for 30 seconds by default. Keys are namespaced with `CACHE_KEY_PREFIX` (`bookify` by default). Service changes invalidate the catalog and relevant availability; booking changes invalidate the affected service/date; business-hours changes invalidate availability entries.

Pattern invalidation iterates with `SCAN`, avoiding a blocking keyspace-wide `KEYS` operation. Cache reads, writes, and invalidations fail open: database-backed requests continue if Redis is unavailable, with TTLs acting as an invalidation safety net. Configure `REDIS_URL`, `CACHE_KEY_PREFIX`, `SERVICE_CATALOG_CACHE_TTL_SECONDS`, and `SERVICE_AVAILABILITY_CACHE_TTL_SECONDS` through the environment.

## Audit Trail

Sensitive profile, business-hours, and session-revocation actions are recorded as append-only audit events. Entries include actor and role, action, target, request metadata, timestamp, and appropriate change details. The audit repository exposes append and query behavior without application-level update/delete operations; credential values are excluded from payloads. Administrators can filter and paginate records through the API.

## Security Hardening

- Zod validates request contracts and environment configuration.
- Role checks are combined with resource ownership checks; public registration creates client accounts.
- Global rate limiting is supplemented with tighter login and registration limits.
- Appointment conflict checks and writes use PostgreSQL `SERIALIZABLE` transactions, retrying recognized serialization conflicts up to three attempts.
- Refresh tokens and partner API keys are stored as hashes; partner key secrets are shown only once.
- Image uploads are limited to one file and 5 MB, and the declared image type is checked against file-signature detection.
- Stripe webhooks validate signatures against the original request body and deduplicate provider event IDs.
- Production configuration requires a JWT secret of at least 32 characters and Stripe payment credentials with public redirect URLs.

For endpoint-level security behavior, see the [API Guide](API.md). For runtime and secret configuration, see [Deployment](DEPLOYMENT.md).
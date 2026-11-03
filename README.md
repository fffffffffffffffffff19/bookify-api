# Bookify API

[![Node.js](https://img.shields.io/badge/Node.js-26%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7%2B-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5%2B-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7%2B-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-5%2B-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml/badge.svg)](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml)

Bookify is a production-minded REST API for service discovery and appointment operations. It brings client, provider, and administrator workflows together with validated HTTP contracts, transactional booking safeguards, PostgreSQL persistence, and interactive OpenAPI docs.

---

## Features

- **Validated API contracts:** Zod validates request payloads and environment configuration; errors return consistent, actionable responses.
- **Concurrency-safe bookings:** appointment conflict checks and inserts run in Prisma transactions at PostgreSQL `SERIALIZABLE` isolation. Serialization conflicts are retried, and competing bookings receive `409 Conflict`.
- **Transactional appointment notifications:** appointment creation and cancellation write an outbox event in the same serializable transaction; a polling BullMQ worker delivers mock notifications with bounded exponential retries.
- **Payment checkout and webhooks:** appointments use a trusted service price to create Stripe Checkout Sessions (or local mock sessions); signed Stripe events update payment state transactionally and are deduplicated by provider event ID.
- **Redis read caching:** the public service catalog and date-specific availability use short-lived, namespaced cache entries; cache outages fall back to PostgreSQL without failing public reads.
- **Scoped partner API keys:** administrator-issued keys are stored as SHA-256 hashes, return their secret once, and authorize partner routes by explicit scopes.
- **OpenTelemetry observability:** opt-in request spans and latency/count metrics export over OTLP, with automatic HTTP and PostgreSQL instrumentation.
- **Streaming admin exports:** appointment reports stream as CSV in bounded keyset batches rather than materializing the full dataset in memory.
- **Role-based access control:** `CLIENT`, `PROVIDER`, and `ADMIN` roles are enforced alongside resource ownership rules. Public registration creates client accounts.
- **Refresh-token sessions:** 15-minute bearer access tokens pair with seven-day `HttpOnly` refresh cookies. Refresh tokens rotate on use, are stored as hashes, and replay revokes all active sessions for the affected user.
- **Immutable audit trail:** sensitive profile, business-hours, and session-revocation events are appended with actor, request, target, and change metadata; administrators can filter and paginate the history.
- **Appointment lifecycle:** create, list, cancel, reschedule, and transition appointments, with business rules around allowed status changes and completion times.
- **Service operations:** public catalog and availability endpoints, plus provider-owned service management.
- **Image uploads:** authenticated avatar and service-image uploads with signature validation, 5 MB limits, and local HTTP serving.
- **Reviews and business hours:** clients can review completed appointments; administrators manage global operating hours.
- **Request protection:** global rate limiting, with tighter per-IP/email login limits and registration limits.
- **Discoverable API:** OpenAPI 3 documentation and Swagger UI are served by the application.

Successful JSON responses use a `{ "data": ... }` envelope. Validation and application errors include an `errorCode`; rate-limit errors include an error code and message.

## Tech Stack

| Area | Technologies and choices |
|---|---|
| Runtime and language | Node.js 26, TypeScript 7, strict compiler settings |
| HTTP API | Fastify 5, REST, OpenAPI 3, Swagger UI |
| Validation and security | Zod 4, rotating refresh-token sessions, short-lived JWT authentication, role and ownership-based authorization, rate limiting |
| Persistence and jobs | PostgreSQL, Prisma 7, transactional outbox, BullMQ, Redis |
| Testing | Vitest 5 unit and E2E projects, PostgreSQL-backed E2E environment, Supertest 7 |
| Local development and CI | Yarn, Vite 8, tsup 9, Docker Compose, GitHub Actions |

## Architecture

The codebase separates HTTP concerns, application rules, and persistence behind repository interfaces. Fastify controllers validate and translate requests; use cases own workflows; Prisma repositories provide the production persistence adapter, with in-memory adapters available for focused unit tests.

```text
src/
  config/          Environment and business-hours configuration
  http/            Fastify controllers, middleware, routes, and schemas
  repositories/    Repository contracts and in-memory/Prisma adapters
  use-cases/       Appointment, business-hours, review, service, and user workflows
  app.ts           Shared Fastify application factory
  server.ts        HTTP server entry point
  worker.ts        Outbox poller and BullMQ notification worker
prisma/
  migrations/      Database migration history
  schema.prisma    PostgreSQL data model
```

## Quickstart

### Requirements

- Node.js 26 or later
- Yarn Classic 1 or later
- Docker with the Docker Compose plugin

### Run the API locally

Clone the repository, install dependencies, and create your local environment file:

```bash
git clone https://github.com/fffffffffffffffffff19/bookify-api.git
cd bookify-api
yarn install --frozen-lockfile
cp .env.example .env
```

The example `.env` targets PostgreSQL on `localhost:5432`, matching the Compose database. Replace the placeholder `JWT_SECRET` for your environment; production secrets must be at least 32 characters. Keep `.env` out of source control.

Start PostgreSQL and Redis, generate Prisma Client, and apply migrations:

```bash
docker compose up -d postgres redis
yarn db:generate
yarn db:migrate
```

Run the API and outbox worker in separate terminals:

```bash
yarn start:dev
```

```bash
yarn start:worker:dev
```

The API listens on [http://localhost:3333](http://localhost:3333) by default. This hybrid workflow is the recommended development setup: `tsx watch` reloads the API as source files change, and running Node on the host keeps editor debugging and logs straightforward, while PostgreSQL remains isolated in Docker.

To run the API, PostgreSQL, Redis, and worker in containers instead, use:

```bash
yarn start:docker
```

This builds the application image, starts all four services, and applies migrations when the API container starts. It is useful for checking the containerized setup; source changes require rebuilding the image, so it is less convenient for day-to-day iteration.

`REDIS_URL` configures the worker's Redis connection and defaults to `redis://localhost:6379`; use `redis://redis:6379` for the Compose worker. The worker polls pending outbox rows every two seconds, enqueues jobs by event UUID, and retries delivery up to five times with exponential backoff. Successful events become `PROCESSED`; events that exhaust retries become `FAILED`. The current notification adapter is intentionally a mock and logs the appointment event ID and type.

## API Documentation

- Swagger UI: [http://localhost:3333/docs](http://localhost:3333/docs)
- OpenAPI JSON: [http://localhost:3333/docs/json](http://localhost:3333/docs/json)
- Health check: [http://localhost:3333/health](http://localhost:3333/health), a public endpoint that returns `{ "status": "ok" }` inside the standard success envelope.

Protected operations use bearer access JWT authentication. Register with `POST /users`, authenticate through `POST /sessions`, then enter the returned 15-minute token in Swagger UI's **Authorize** control. Login also sets the seven-day `bookify_refresh` cookie as `HttpOnly` and `SameSite=Strict`; production responses add `Secure`. Browsers send this cookie automatically to `/auth` routes. Refresh-token values are not returned in JSON.

Call `POST /auth/refresh` to rotate the refresh cookie and receive a new access token. A consumed refresh token indicates possible theft and revokes every active refresh session for that user. `POST /auth/logout` revokes the cookie's session and clears the cookie. Authenticated clients can inspect sessions with `GET /auth/sessions`, revoke one with `DELETE /auth/sessions/:sessionId`, or revoke all with `DELETE /auth/sessions/all`. The refresh cookie is scoped to `/auth`; non-browser clients should retain and send the cookie using a cookie jar.

## API Operations

<details>
<summary><b>Click to expand full API Operations list</b></summary>

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Check API health |
| `POST` | `/users` | Public, rate-limited | Register a client account |
| `POST` | `/sessions` | Public, rate-limited | Authenticate and receive an access JWT and refresh cookie |
| `POST` | `/auth/refresh` | Refresh cookie | Rotate refresh token and issue an access JWT |
| `POST` | `/auth/logout` | Refresh cookie | Revoke the current refresh session |
| `GET` | `/auth/sessions` | Authenticated | List active sessions |
| `DELETE` | `/auth/sessions/:sessionId` | Authenticated | Revoke one owned session |
| `DELETE` | `/auth/sessions/all` | Authenticated | Revoke all active sessions |
| `GET` | `/services/public` | Public | Browse services and provider summaries |
| `GET` | `/services/:serviceId/availability` | Public | Check availability for a service and date |
| `GET` | `/services` | Authenticated | List the authenticated user's services |
| `POST` | `/services` | Provider | Create a service |
| `PUT` | `/services/:id` | Provider | Update an owned service |
| `DELETE` | `/services/:id` | Provider | Delete an owned service |
| `GET` | `/me` | Authenticated | Read safe profile fields |
| `PATCH` | `/me` | Authenticated | Update profile and optionally password |
| `PATCH` | `/me/avatar` | Authenticated | Upload a JPEG, PNG, or WebP avatar (maximum 5 MB) |
| `PATCH` | `/services/:id/image` | Owning provider | Upload a JPEG, PNG, or WebP service image (maximum 5 MB) |
| `POST` | `/appointments` | Client | Book an appointment |
| `GET` | `/appointments` | Authenticated | List own appointments with pagination and filters |
| `PATCH` | `/appointments/:id/cancel` | Authenticated; ownership rules apply | Cancel an appointment |
| `PATCH` | `/appointments/:id/reschedule` | Authenticated; ownership and admin rules apply | Reschedule an appointment |
| `PATCH` | `/appointments/:id/status` | Authenticated; role and ownership rules apply | Apply an allowed status transition |
| `POST` | `/appointments/:id/pay` | Owning client | Initialize or resume appointment checkout |
| `POST` | `/webhooks/stripe` | Public, Stripe signature required | Process verified payment status events |
| `POST` | `/appointments/:id/review` | Owning client | Review a completed appointment |
| `GET` | `/provider/appointments` | Provider or admin | View the provider schedule |
| `GET` | `/admin/appointments` | Admin | List and filter all appointments |
| `GET` | `/admin/metrics` | Admin | View appointment, user, and performance metrics |
| `GET` | `/admin/reports/stream` | Admin | Stream appointments as a CSV attachment |
| `POST` | `/admin/api-keys` | Admin | Create a partner API key with explicit scopes |
| `DELETE` | `/admin/api-keys/:id` | Admin | Revoke a partner API key |
| `GET` | `/partner/services` | API key with `services:read` | Read the partner service catalog |
| `GET` | `/partner/services/:serviceId/availability` | API key with `availability:read` | Read public service availability |
| `GET` | `/admin/audit-logs` | Admin | Filter and paginate the immutable audit trail |
| `GET` | `/admin/business-hours` | Admin | Read global business hours |
| `PATCH` | `/admin/business-hours` | Admin | Update global business hours |

</details>

Uploads use multipart form data with a single `file` field. The API validates the declared image MIME type and the file signature, assigns a server-generated name, and returns a URL such as `/uploads/avatars/<user-id>/<generated-name>.png`. Local files are stored under `UPLOAD_DIR` (default `uploads/`) and served from `/uploads/`. `StorageAdapter` defines the `store` and `delete` contract used by upload handlers; the local adapter is the configured provider, while an object-store adapter can implement the same contract and return its public URL.

Appointment listing supports `page`, `perPage`, `status`, `from`, and `to`. Time filters apply to appointment start time; `from` is inclusive and `to` is exclusive. `perPage` defaults to 20 and is capped at 100. Responses include pagination metadata.

The admin audit trail supports `page`, `perPage`, `action`, `actorId`, `from`, and `to`; date bounds are inclusive and `perPage` defaults to 20 with a maximum of 100. Audit entries are created through a centralized append-only repository contract and expose no application-level update or delete operation. Password values and other credentials are never included in event payloads.

Payment initialization reads the appointment's price from its service record; clients cannot provide or override the amount. Set `PAYMENT_PROVIDER=mock` for local development, or configure `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` for Stripe Checkout. Set `PAYMENT_SUCCESS_URL`, `PAYMENT_CANCEL_URL`, and `PAYMENT_CURRENCY` as needed. Production requires the Stripe provider and both Stripe secrets. The public `POST /webhooks/stripe` endpoint verifies Stripe's timestamped signature against the unmodified request body; duplicate event IDs are accepted but not applied twice. For local Stripe testing, forward events with `stripe listen --forward-to localhost:3333/webhooks/stripe`.

The Redis cache uses `REDIS_URL` and `CACHE_KEY_PREFIX` (default `bookify`). `SERVICE_CATALOG_CACHE_TTL_SECONDS` defaults to 60 seconds and `SERVICE_AVAILABILITY_CACHE_TTL_SECONDS` to 30 seconds. Service mutations invalidate the catalog and affected service availability; appointment slot changes invalidate the affected service/date key, and business-hours changes clear all availability entries. Pattern invalidation uses Redis `SCAN`, and cache reads, writes, and invalidations fail open so database-backed reads and mutations continue when Redis is unavailable.

API keys are created and revoked through admin routes. The plaintext value is returned only once; store it as a secret and send it in `X-API-Key`. Supported scopes are `services:read` and `availability:read`; routes reject keys without the required scope and reject revoked or expired keys. Keys are never stored in plaintext. System-wide appointment exports remain admin-only.

OpenTelemetry is disabled by default. Set `OTEL_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT` to export traces and metrics to an OTLP collector; HTTP and PostgreSQL auto-instrumentation is enabled alongside request count/latency measurements. `yarn typecheck` checks the entire TypeScript project. `yarn openapi:check` boots the API in the isolated E2E environment and verifies that routes and security declarations remain represented in the generated OpenAPI document; CI runs both checks.

## Testing and Build

The unit suite covers use cases; E2E tests exercise the HTTP API against PostgreSQL and the project migrations. Start the local database first with `docker compose up -d postgres`, then run:

```bash
yarn test
yarn test:e2e
yarn build
```

GitHub Actions runs on pushes and pull requests targeting `main`. The workflow provisions PostgreSQL, generates Prisma Client, applies migrations, and runs both test suites. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## License

MIT. See [LICENSE](LICENSE).

# Bookify API

A TypeScript REST API for service discovery and appointment scheduling. It supports client, provider, and admin workflows, PostgreSQL persistence through Prisma, and interactive OpenAPI documentation.

## Tech Stack

- Node.js 22
- Fastify 5 and TypeScript (strict mode)
- PostgreSQL and Prisma ORM
- Zod request and environment validation
- JWT authentication with role-based access control
- Vitest unit tests and Supertest/PostgreSQL E2E tests
- Docker Compose and GitHub Actions
- `@fastify/swagger` and `@fastify/swagger-ui`

## Features

- Public service catalog with provider summaries, plus provider-owned service management.
- Authenticated client, provider, and admin accounts; public registration creates client accounts only.
- Safe `GET /me` profile DTO and `PATCH /me` profile/password updates.
- Appointment creation, listing, cancellation, rescheduling, status transitions, and reviews.
- Appointment status state machine: only `PENDING` can become `COMPLETED` or `CANCELLED`; terminal states cannot transition again. Completion is disallowed until the appointment end time.
- Clients can cancel their own pending appointments. Providers can complete or cancel their own pending appointments, and admins can manage pending appointments.
- Review ratings from 1–5, optional comments up to 500 characters, and one review per completed appointment by its owning client.
- Dynamic global business hours, editable by administrators.
- Database-side appointment pagination and filtering by status and start-time range.
- Appointment creation checks provider conflicts and inserts in one Prisma interactive transaction at `SERIALIZABLE` isolation. Serialization conflicts are retried; a competing booking receives HTTP 409.
- Rate limiting: global 100 requests per minute, login 5 per minute per IP/email, and registration 10 per minute.
- Standard success envelope: `{ "data": ... }`. Rate-limit errors use `{ "error": { "code": "TOO_MANY_REQUESTS", "message": "..." } }`; other errors include `message` and `errorCode`.
- Swagger UI at `/docs` and the generated OpenAPI document at `/docs/json`.

## Architecture

The code follows a Clean Architecture-inspired layout:

```text
src/
  config/                 Environment and business-hours configuration
  errors/                 Typed application errors
  http/
    controllers/          Fastify handlers and E2E specifications
    middlewares/          JWT and role authorization
    routes/               Route registration and OpenAPI metadata
    schemas/              Request schemas and OpenAPI JSON Schemas
  repositories/
    in-memory/            Test adapters
    prisma/               PostgreSQL/Prisma adapters
  use-cases/
    appointments/         Appointment workflow rules
    business-hours/       Business-hours workflows
    reviews/              Review workflows
    services/             Service workflows
    users/                Registration, authentication, and profile workflows
    factories/            Production dependency construction
  app.ts                  Shared Fastify application factory
  server.ts               Production listener
prisma/
  migrations/             Database migration history
  schema.prisma           Database model
```

Controllers handle HTTP parsing and responses; use cases own business rules; repository interfaces isolate persistence. Production and E2E tests use the shared Fastify app bootstrap.

## API Documentation

Start the API and open [http://localhost:3333/docs](http://localhost:3333/docs). The OpenAPI JSON is available at [http://localhost:3333/docs/json](http://localhost:3333/docs/json). Protected operations use the `BearerAuth` JWT security scheme; use the token returned by `POST /sessions` in Swagger's **Authorize** control.

## API Routes

Successful JSON responses are wrapped in `{ "data": ... }`. Protected routes require `Authorization: Bearer <JWT>` unless otherwise noted. See `/docs` for full request/response schemas and error details.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |
| `POST` | `/users` | Public, rate-limited | Register a client account |
| `POST` | `/sessions` | Public, rate-limited | Authenticate and obtain a JWT |
| `GET` | `/services/public` | Public | Browse services and provider summaries |
| `GET` | `/services/:serviceId/availability?date=YYYY-MM-DD` | Public | Check service availability |
| `GET` | `/services` | Authenticated | List the authenticated provider's services |
| `POST` | `/services` | Provider | Create a service |
| `PUT` | `/services/:id` | Provider | Update an owned service |
| `DELETE` | `/services/:id` | Provider | Delete an owned service |
| `GET` | `/me` | Authenticated | Get safe profile fields |
| `PATCH` | `/me` | Authenticated | Update profile and optionally password |
| `POST` | `/appointments` | Client | Book an appointment |
| `GET` | `/appointments` | Authenticated | List own appointments; supports `page`, `perPage`, `status`, `from`, `to` |
| `PATCH` | `/appointments/:id/cancel` | Appointment participant | Cancel a pending appointment |
| `PATCH` | `/appointments/:id/reschedule` | Appointment participant or admin | Reschedule after availability and conflict checks |
| `PATCH` | `/appointments/:id/status` | Client, provider, or admin | Apply an allowed status transition |
| `POST` | `/appointments/:id/review` | Owning client | Review a completed appointment |
| `GET` | `/provider/appointments` | Provider or admin | List provider schedule |
| `GET` | `/admin/appointments` | Admin | List all appointments; supports pagination and filters |
| `GET` | `/admin/business-hours` | Admin | Read global working hours |
| `PATCH` | `/admin/business-hours` | Admin | Update global working hours |

Appointment `from` is inclusive and `to` is exclusive, applied to appointment start time. `perPage` defaults to 20 and is capped at 100. Appointment list responses include `pagination` metadata.

## Setup

### Prerequisites

- Node.js 22 or later
- Yarn 1.22 or npm
- Docker and Docker Compose (for local PostgreSQL and E2E tests)

### Install and configure

```bash
git clone https://github.com/fffffffffffffffffff19/bookify-api.git
cd bookify-api
yarn install
cp .env.example .env
```

Set the environment values in `.env`:

| Variable | Description |
|---|---|
| `NODE_ENV` | `dev`, `development`, `test`, or `production` |
| `PORT` | HTTP port (defaults to `3333`) |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET` | JWT signing secret; production requires at least 32 characters |
| `SENTRY_DSN` | Optional error-reporting DSN |

For a local host process, use a database hostname reachable from the host, typically `localhost`. The Compose API container uses the Compose service hostname `postgres`.

Start PostgreSQL and apply migrations:

```bash
docker compose up -d postgres
npx prisma generate
npx prisma migrate deploy
```

Start the development API:

```bash
yarn start:dev
```

Alternatively, run the API and database with Compose:

```bash
docker compose up --build
```

The API listens on the configured port (default `3333`).

## Tests and Build

E2E tests use real PostgreSQL migrations and isolated schemas. Start the database first with `docker compose up -d postgres`.

```bash
npx vitest run --project unit
npx vitest run --project e2e
npm run build
```

Or use the project scripts `yarn test` and `yarn test:e2e`.

## CI

GitHub Actions runs against a PostgreSQL service, generates Prisma Client, deploys migrations, and runs unit and E2E tests. See `.github/workflows/ci.yml`.

## License

MIT. See [LICENSE](LICENSE).

# Bookify API

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml/badge.svg)](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml)

Bookify is a production-minded REST API for service discovery and appointment operations. It brings client, provider, and administrator workflows together with validated HTTP contracts, transactional booking safeguards, PostgreSQL persistence, and interactive OpenAPI docs.

---

## Features

- **Validated API contracts:** Zod validates request payloads and environment configuration; errors return consistent, actionable responses.
- **Concurrency-safe bookings:** appointment conflict checks and inserts run in Prisma transactions at PostgreSQL `SERIALIZABLE` isolation. Serialization conflicts are retried, and competing bookings receive `409 Conflict`.
- **Role-based access control:** `CLIENT`, `PROVIDER`, and `ADMIN` roles are enforced alongside resource ownership rules. Public registration creates client accounts.
- **Appointment lifecycle:** create, list, cancel, reschedule, and transition appointments, with business rules around allowed status changes and completion times.
- **Service operations:** public catalog and availability endpoints, plus provider-owned service management.
- **Reviews and business hours:** clients can review completed appointments; administrators manage global operating hours.
- **Request protection:** global rate limiting, with tighter per-IP/email login limits and registration limits.
- **Discoverable API:** OpenAPI 3 documentation and Swagger UI are served by the application.

Successful JSON responses use a `{ "data": ... }` envelope. Validation and application errors include an `errorCode`; rate-limit errors include an error code and message.

## Tech Stack

| Area | Technologies and choices |
|---|---|
| Runtime and language | Node.js 22, TypeScript 7, strict compiler settings |
| HTTP API | Fastify 5, REST, OpenAPI 3, Swagger UI |
| Validation and security | Zod, JWT authentication, role- and ownership-based authorization, rate limiting |
| Persistence | PostgreSQL, Prisma 6, versioned SQL migrations |
| Testing | Vitest unit and E2E projects, PostgreSQL-backed E2E environment, Supertest |
| Local development and CI | Yarn, Docker Compose, GitHub Actions |

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
prisma/
  migrations/      Database migration history
  schema.prisma    PostgreSQL data model
```

## Quickstart

### Requirements

- Node.js 22 or later
- Yarn Classic (1.22)
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

Start PostgreSQL, generate Prisma Client, and apply migrations:

```bash
docker compose up -d postgres
yarn db:generate
yarn db:migrate
```

Run the development server:

```bash
yarn start:dev
```

The API listens on [http://localhost:3333](http://localhost:3333) by default. To run both the API and PostgreSQL in containers instead, use `docker compose up --build`; the API container applies migrations on startup.

## API Documentation

- Swagger UI: [http://localhost:3333/docs](http://localhost:3333/docs)
- OpenAPI JSON: [http://localhost:3333/docs/json](http://localhost:3333/docs/json)
- Health check: [http://localhost:3333/health](http://localhost:3333/health), a public endpoint that returns `{ "status": "ok" }` inside the standard success envelope.

Protected operations use bearer JWT authentication. Register with `POST /users`, authenticate through `POST /sessions`, then enter the returned token in Swagger UI's **Authorize** control.

## API Operations

The API exposes 21 operations. All paths are relative to the server origin; protected operations require `Authorization: Bearer <JWT>`. See `/docs` for request and response schemas.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Check API health |
| `POST` | `/users` | Public, rate-limited | Register a client account |
| `POST` | `/sessions` | Public, rate-limited | Authenticate and receive a JWT |
| `GET` | `/services/public` | Public | Browse services and provider summaries |
| `GET` | `/services/:serviceId/availability` | Public | Check availability for a service and date |
| `GET` | `/services` | Authenticated | List the authenticated user's services |
| `POST` | `/services` | Provider | Create a service |
| `PUT` | `/services/:id` | Provider | Update an owned service |
| `DELETE` | `/services/:id` | Provider | Delete an owned service |
| `GET` | `/me` | Authenticated | Read safe profile fields |
| `PATCH` | `/me` | Authenticated | Update profile and optionally password |
| `POST` | `/appointments` | Client | Book an appointment |
| `GET` | `/appointments` | Authenticated | List own appointments with pagination and filters |
| `PATCH` | `/appointments/:id/cancel` | Authenticated; ownership rules apply | Cancel an appointment |
| `PATCH` | `/appointments/:id/reschedule` | Authenticated; ownership and admin rules apply | Reschedule an appointment |
| `PATCH` | `/appointments/:id/status` | Authenticated; role and ownership rules apply | Apply an allowed status transition |
| `POST` | `/appointments/:id/review` | Owning client | Review a completed appointment |
| `GET` | `/provider/appointments` | Provider or admin | View the provider schedule |
| `GET` | `/admin/appointments` | Admin | List and filter all appointments |
| `GET` | `/admin/business-hours` | Admin | Read global business hours |
| `PATCH` | `/admin/business-hours` | Admin | Update global business hours |

Appointment listing supports `page`, `perPage`, `status`, `from`, and `to`. Time filters apply to appointment start time; `from` is inclusive and `to` is exclusive. `perPage` defaults to 20 and is capped at 100. Responses include pagination metadata.

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

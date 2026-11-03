# Bookify API

[![Node.js](https://img.shields.io/badge/Node.js-26-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml/badge.svg)](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml)

Bookify is a production-minded REST API for service discovery and appointment booking. It combines role-aware provider and client workflows with concurrency-safe scheduling, PostgreSQL persistence, payment integration, and operational tooling.

## Project Overview

- **Reliable booking:** serializable transactions protect appointment creation and rescheduling from conflicting requests.
- **Durable async work:** appointment changes and notification events are committed together through a transactional outbox.
- **Practical security:** short-lived JWT access, rotating refresh-token sessions, scoped partner keys, and an append-only audit trail.
- **Operational visibility:** Redis read caching, OpenTelemetry traces and metrics, and streaming administrator reports.

## Quick Start

Requires Yarn Classic and Docker Compose. Clone the repository, then start the complete containerized stack:

```bash
git clone https://github.com/fffffffffffffffffff19/bookify-api.git
cd bookify-api
yarn install --frozen-lockfile
yarn start:docker
```

The API is available at [http://localhost:3333](http://localhost:3333); interactive API docs are at [http://localhost:3333/docs](http://localhost:3333/docs). Compose starts PostgreSQL, Redis, the API, and the notification worker; the API container applies database migrations at startup.

For host-based development with hot reload, install Node.js 26, then run `yarn install --frozen-lockfile` and copy `.env.example` to `.env`. Start dependencies with `docker compose up -d postgres redis`, generate Prisma Client, and apply migrations with `yarn db:generate` and `yarn db:migrate`. Start the API and worker in separate terminals with `yarn start:dev` and `yarn start:worker:dev`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): application boundaries, outbox, sessions, cache, audit, and security.
- [API Guide](docs/API.md): authentication, Swagger/OpenAPI, and scoped partner keys.
- [Testing](docs/TESTING.md): unit, E2E, concurrency, and type-safety checks.
- [Deployment](docs/DEPLOYMENT.md): environment, CI/CD, telemetry, and automated releases.

MIT licensed; see [LICENSE](LICENSE).

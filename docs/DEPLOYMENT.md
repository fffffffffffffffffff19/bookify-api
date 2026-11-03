# Deployment

## Environment Setup

Copy `.env.example` to `.env` for local development. The API requires `DATABASE_URL` and `JWT_SECRET`; Redis defaults to `redis://localhost:6379` and is required for caching, shared rate limiting, and the worker queue. The API checks Redis connectivity before becoming ready. The Compose network uses the service hostnames `postgres` and `redis`, which are already configured in `docker-compose.yml`.

Useful settings include:

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `3333` |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection for cache, shared rate limits, and worker queue | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `UPLOAD_DIR` | Local upload storage directory | `uploads` |
| `PAYMENT_PROVIDER` | `mock` or `stripe` gateway | `mock` |
| `OTEL_ENABLED` | Enable traces and metrics export | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP collector base URL | `http://localhost:4318` |

Production requires a JWT secret of at least 32 characters, `PAYMENT_PROVIDER=stripe`, Stripe secret and webhook keys, and non-local payment redirect URLs. Keep secrets in the deployment platform's secret store, not in source control. Configure cache TTLs and key prefix as described in [Architecture: Redis Caching](ARCHITECTURE.md#redis-caching).

## Local Runtime

For host-based development, run PostgreSQL and Redis with `docker compose up -d postgres redis`, then install, generate Prisma Client, and migrate:

```bash
yarn install --frozen-lockfile
yarn db:generate
yarn db:migrate
```

Start the API with `yarn start:dev` and the outbox worker separately with `yarn start:worker:dev`. To build and run the complete container stack, use `yarn start:docker`; the API container applies migrations before serving requests.

## OpenTelemetry

Telemetry is opt-in. Set `OTEL_ENABLED=true` and point `OTEL_EXPORTER_OTLP_ENDPOINT` at an OTLP/HTTP collector. The service exports traces to `/v1/traces` and metrics to `/v1/metrics`; metric export runs every 30 seconds. Node auto-instrumentations include HTTP and PostgreSQL instrumentation, and the Fastify hooks add request spans plus request count and duration metrics. Telemetry shuts down with the API application.

## Continuous Integration

The [CI workflow](../.github/workflows/ci.yml) runs for pushes and pull requests targeting `main`. It provisions PostgreSQL, installs the locked Yarn dependencies, generates Prisma Client, runs typecheck, lint, and build, applies migrations, then executes unit tests, E2E tests, and the OpenAPI contract check. **Current workflow gap:** E2E tests now require Redis for the shared rate-limit backend, but the workflow currently provisions PostgreSQL only and does not set `REDIS_URL`; add a Redis service and configure its URL before relying on the E2E CI job.

## Automated Releases

After CI succeeds on a push to `main`, the release job uses semantic-release and GitHub Releases. On the first run with no version tags, it creates a baseline release from the stable version in `package.json`; subsequent runs calculate a release from Conventional Commit messages. `feat:` triggers a minor release, `fix:` and `perf:` a patch, and a `!` marker or `BREAKING CHANGE:` footer a major release. The workflow has `contents: write` permission; repository branch protection must permit the release bot to push its version update to `main`.

Releases publish GitHub Releases, not an npm package. Release setup is configured in [.releaserc.json](../.releaserc.json) and the CI workflow.
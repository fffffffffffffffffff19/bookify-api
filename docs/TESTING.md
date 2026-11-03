# Testing

## Prerequisites

Install dependencies and generate Prisma Client before running checks:

```bash
yarn install --frozen-lockfile
yarn db:generate
```

PostgreSQL is required for end-to-end tests. Start the Compose database and apply migrations:

```bash
docker compose up -d postgres
yarn db:migrate
```

The E2E Vitest environment uses `DATABASE_URL` and `JWT_SECRET`; `.env.example` provides local defaults. E2E tests run serially with one worker to keep database state predictable.

## Unit Tests

Unit tests focus on use cases and isolated adapters such as storage and cache:

```bash
yarn test
yarn test:watch
```

## End-to-End Tests

The E2E project exercises HTTP controllers against PostgreSQL and the repository's migrations:

```bash
yarn test:e2e
yarn test:e2e:watch
```

To validate that routes and security schemes remain represented in generated OpenAPI output, run:

```bash
yarn openapi:check
```

## Concurrency and Race-Condition Coverage

Concurrency-sensitive HTTP tests issue requests in parallel and assert that invariants hold under contention. Current coverage includes two clients competing for one provider slot, concurrent rescheduling, competing appointment status transitions, and request rate limits. Appointment creation and rescheduling use serializable database transactions and retry recognized serialization conflicts up to three attempts; verify both the winning result and the expected conflict response when changing these paths.

Run the relevant E2E project with `yarn test:e2e`; Vitest's `--maxWorkers=1` setting is intentional for the database-backed suite, while concurrency is created explicitly inside individual tests.

## Type Safety, Lint, and Build

Run the full TypeScript check, lint, and production build with:

```bash
yarn typecheck
yarn lint
yarn build
```

`yarn typecheck` runs `tsc --noEmit` with the repository's strict TypeScript configuration. CI also runs Prisma generation, migrations, both test projects, and the OpenAPI contract check. See [Deployment](DEPLOYMENT.md#continuous-integration) for the workflow sequence.
# 📅 Bookify API

[![CI](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml/badge.svg)](https://github.com/fffffffffffffffffff19/bookify-api/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A robust, production-ready RESTful API for managing service appointments, built using **Node.js 22**, **Fastify**, **Prisma ORM**, and **TypeScript**, following **Domain-Driven Design (DDD)** and Clean Architecture principles.

---

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v22+)
- **Framework**: [Fastify](https://fastify.dev/) (High-performance web framework)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Static typing and safety)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM](https://www.prisma.io/)
- **Testing**: [Vitest](https://vitest.dev/) & [Supertest](https://github.com/ladjs/supertest) (Isolated Unit & E2E Testing with Custom Prisma Environment)
- **Validation**: [Zod](https://zod.dev/) (Schema validation and environment parsing)
- **Authentication**: [JWT](https://jwt.io/) (`@fastify/jwt`) with Role-Based Access Control (`ADMIN` / `MEMBER`)
- **DevOps & CI/CD**: [Docker](https://www.docker.com/) & Docker Compose, [GitHub Actions](https://github.com/features/actions)

---

## Architecture & Folder Structure

The application is structured following Clean Architecture and DDD principles to ensure decoupled business logic and maintainability:

```text
bookify-api/
├── prisma/
│   ├── migrations/                            # PostgreSQL database migrations
│   └── schema.prisma                          # Prisma data models & datasource config
└── src/
    ├── config/                                # Business logic configurations
    ├── http/
    │   ├── controllers/                       # Fastify HTTP controllers & E2E specs
    │   ├── middlewares/                       # JWT & Role verification middlewares
    │   └── routes/                            # Modular API route definitions
    ├── lib/                                   # Shared library instances
    ├── repositories/
    │   ├── in-memory/                         # In-memory repositories for unit testing
    │   └── prisma/                            # Prisma repository implementations
    ├── use-cases/
    │   ├── factories/                         # Factory functions for Use Cases
    │   ├── appointments/                      # Appointment Use Cases & unit specs
    │   ├── services/                          # Service Use Cases & unit specs
    │   └── users/                             # User Use Cases & unit specs
    ├── app.ts                                 # Fastify app setup & plugin registrations
    └── server.ts                              # Application entry point

```

---

## Getting Started

### Prerequisites

- **Node.js** (v22+)
- **Yarn** (v1.22+)
- **Docker** & **Docker Compose**

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fffffffffffffffffff19/bookify-api.git
   cd bookify-api
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Start the database and API via Docker:**
   ```bash
   docker compose up --build -d
   ```

5. **Run database migrations locally:**
   ```bash
   npx prisma migrate deploy
   ```

6. **Start the development server:**
   ```bash
   yarn start:dev
   ```

---

## Running Tests

The test suite includes **Unit Tests** for isolated use cases (using in-memory repositories) and **E2E Tests** for HTTP routes running against isolated PostgreSQL schema instances.

> ⚠️ **Important:** E2E tests run real migrations and database operations against PostgreSQL. Make sure the Docker container is running (`docker compose up -d`) before executing E2E tests locally.

```bash
# Run unit tests
yarn test

# Run End-to-End tests 
yarn test:e2e
```

---

## CI/CD Pipeline

Automated testing and deployment preparation are powered by **GitHub Actions** (`.github/workflows/ci.yml`). On every `push` or `pull_request` to `main`, the pipeline automatically:
1. Spawns a transient PostgreSQL 15 container with health checks.
2. Installs dependencies using frozen lockfiles.
3. Generates the Prisma Client and applies database migrations.
4. Runs unit tests and E2E controller specs in isolated database environments.

---

## License

This project is licensed under the [MIT License](LICENSE).
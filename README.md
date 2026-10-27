# 📅 Bookify API

A robust RESTful API in Node.js for managing service appointments, built following **Domain-Driven Design (DDD)** principles with **Fastify**, **Prisma**, and **TypeScript**.

## Tech Stack

- **Node.js** (v20+)
- **Fastify** (Fast and low-overhead web framework)
- **TypeScript** (Static typing)
- **Prisma ORM** & **PostgreSQL** (Data persistence)
- **Vitest** & **Supertest** (Unit and E2E testing)
- **Zod** (Data validation and schema parsing)
- **JWT** (Role-based authentication & authorization)
- **Sentry** (Error tracking and monitoring)
- **Docker & Docker Compose** (Containerized database environment)

## Architecture

The project follows Domain-Driven Design (DDD) principles with a clean separation of concerns:

- `src/use-cases`: Isolated business rules and logic.
- `src/repositories`: Data abstraction layer using the Repository Pattern (both Prisma and in-memory repositories for testing).
- `src/http`: Controllers, middlewares, and Fastify route definitions.

## Getting Started

### Prerequisites

- Node.js (v20+)
- Yarn
- Docker & Docker Compose

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/bookify-api.git
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

4. **Start the PostgreSQL database:**
   ```bash
   docker compose up -d
   ```

5. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server:**
   ```bash
   yarn dev
   ```

## Running Tests

The project maintains 100% End-to-End coverage across all HTTP routes alongside comprehensive unit tests for business use cases.

```bash
# Run unit tests (Use Cases)
yarn test

# Run End-to-End (E2E) tests
yarn test:e2e
```

## License
This project is licensed under the [MIT License](LICENSE).
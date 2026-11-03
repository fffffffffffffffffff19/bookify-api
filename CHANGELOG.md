# Changelog

All notable changes to this project are documented in this file.

## [1.49.2] - 2026-11-03

### Security
- Login attempts are now limited by a normalized, hashed account identifier in shared Redis storage, preventing distributed IP rotation from bypassing the account limit.
- Password updates and revocation of other active sessions now commit in one database transaction.
- Newly issued partner API keys expire after 90 days by default; custom expirations are capped at one year.

### Fixed
- The general appointment status endpoint now rejects cancellation after an appointment has started.
- Partner service catalog responses now use bounded pagination with a maximum page size of 100.
- Exhausted serializable retries during appointment rescheduling now return a booking conflict instead of an internal server error.
- TypeScript checks explicitly target the project, include all source TypeScript files, and enable additional unused-code, return-path, casing, and switch checks.

### Verification
- `yarn typecheck` and `yarn lint` passed.
- `yarn test`: 27 files, 119 tests passed.
- `yarn test:e2e --reporter=dot`: 27 files, 85 tests passed.

## [1.49.1] - 2026-11-02

### Fixed
- Service edits now persist only supplied fields, preserve Prisma Decimal prices, and avoid overwriting concurrent changes to omitted fields.
- Appointment creation now enforces same-day business-hour boundaries, accepts valid timezone offsets, and returns a booking conflict when serializable retries are exhausted.
- Payment amounts now use exact Decimal arithmetic and currency-specific minor units, including Stripe's ISK and UGX representation.
- Service creation and updates reject nonpositive prices; API schemas now match controller validation for prices and password lengths.
- Restricted service deletion returns a conflict response, confirmed appointments return the correct rescheduling error, and in-memory profile updates preserve avatar URLs.
- Session-store errors are no longer reported as invalid credentials; worker promise failures are handled and the HTTP server closes gracefully on termination signals.

### Verification
- `yarn typecheck`, `yarn lint`, and `yarn build` passed.
- `yarn test`: 27 files, 117 tests passed.
- `yarn test:e2e --reporter=dot`: 27 files, 83 tests passed.
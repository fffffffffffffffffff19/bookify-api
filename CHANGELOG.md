# Changelog

All notable changes to this project are documented in this file.

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
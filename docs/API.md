# API Guide

## API Discovery

With the API running locally:

- Swagger UI: [http://localhost:3333/docs](http://localhost:3333/docs)
- OpenAPI JSON: [http://localhost:3333/docs/json](http://localhost:3333/docs/json)
- Health check: [http://localhost:3333/health](http://localhost:3333/health)

Swagger UI documents bearer JWT security and the `X-API-Key` scheme. The application returns successful JSON responses in a `data` envelope; validation and application errors include an `errorCode`.

## User Authentication

Register a client account with `POST /users`, then authenticate with `POST /sessions`. Login returns a short-lived access JWT and sets a seven-day refresh cookie. Use the access token as a bearer token for protected routes or paste it into Swagger UI's **Authorize** dialog.

The refresh cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/auth`, and marked `Secure` in production. Browsers send it automatically to the authentication endpoints. Non-browser clients should retain it in a cookie jar. `POST /auth/refresh` rotates the token and returns a new access token; `POST /auth/logout` revokes the current session. Authenticated users can inspect active sessions at `GET /auth/sessions`, revoke one at `DELETE /auth/sessions/:sessionId`, or revoke all at `DELETE /auth/sessions/all`.

Refresh-token reuse revokes all active sessions for the affected user. Access tokens last 15 minutes; refresh sessions last seven days. The API does not expose the raw refresh token in its JSON response. See [Architecture: Session Management](ARCHITECTURE.md#session-management) for storage and rotation details.

Changing a password requires the current password. The new password hash and revocation of the user's other active sessions are committed in one database transaction; the session used to make the change remains active.

## Scoped Partner API Keys

An administrator creates a key using `POST /admin/api-keys`, specifying a name, one or more scopes, and optionally an expiration. Keys expire after 90 days by default; a supplied expiration must be in the future and no more than 365 days away. The plaintext secret is returned once; store it in a secrets manager because only its SHA-256 hash is persisted. Revoke a key with `DELETE /admin/api-keys/:id`.

Send the key in the `X-API-Key` request header. Supported scopes are:

| Scope | Authorized operation |
|---|---|
| `services:read` | `GET /partner/services` |
| `availability:read` | `GET /partner/services/:serviceId/availability` |

Keys are rejected when missing, invalid, expired, revoked, or lacking the endpoint's required scope. Partner keys do not grant administrator privileges; system-wide appointment exports and key management remain admin-only.

`GET /partner/services` supports bounded pagination with `page` (default `1`) and `perPage` (default `20`, maximum `100`). Its success envelope is `{ "data": { "services": [...], "pagination": { "page": 1, "perPage": 20, "total": 0, "totalPages": 0 } } }`. Values outside the supported bounds are rejected.

## Other API Areas

The OpenAPI document also covers user profiles and uploads, provider services, appointment booking and lifecycle operations, payment checkout and Stripe webhooks, reviews, business hours, audit logs, administrator metrics, and CSV appointment exports. The generated specification is contract-checked in CI with `yarn openapi:check`.
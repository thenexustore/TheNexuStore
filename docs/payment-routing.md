# Payment API routing (canonical + compatibility)

## Canonical route

Use `/payments/*` for all customer payment endpoints.

Current canonical endpoints:
- `POST /payments/initiate`
- `POST /payments/redsys/create`
- `POST /payments/redsys/notify`
- `POST /payments/redsys/notification`
- `GET /payments/redsys/ok`
- `GET /payments/redsys/ko`
- `POST /payments/cod/confirm/:orderId`
- `GET /payments/status/:orderId`

## Legacy compatibility route

`/payment/*` remains available as a compatibility alias to avoid breaking old clients.
Responses on legacy endpoints include `X-Nexus-Deprecated-Route` with migration guidance.

## Migration guidance

- New integrations must only target `/payments/*`.
- Existing clients should migrate from `/payment/*` to `/payments/*`.
- Redsys callback URLs should be configured with `/payments/redsys/*` endpoints.

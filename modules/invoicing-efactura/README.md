# invoicing-efactura — standalone module

First standalone slice of the documentiulia platform (REQ-043 modular architecture).
Romanian invoicing + ANAF compliance as a self-contained product: invoices
(+recurring, reminders), VAT, payments, billing, e-Factura B2B/B2C, SPV,
SAF-T D406, e-Transport — with its own auth, database, Redis, and port.

## Design: deployable slice, not a fork

The module shares the platform's source tree (`backend/src`). A dedicated
entrypoint (`backend/src/main-invoicing.ts`) bootstraps only the invoicing
module graph (`backend/src/standalone/invoicing-app.module.ts`). No code is
duplicated — fixes land once and reach both deployment modes.

- **Standalone mode** (this compose file): own Postgres, own Redis, own
  `JWT_SECRET`, port 3101. Sellable as its own product.
- **Platform mode**: the same modules run inside the full backend on :3001 —
  nothing changes there.

Transitive imports (finance, notifications, communication, saga) currently
ship with the slice; they get pruned when slim module variants exist.

## Run

```bash
cp .env.example .env   # set JWT secrets (+ ANAF creds when available)
docker compose up -d --build
curl http://localhost:3101/api/v1/health
```

Migrations run automatically on boot (`prisma migrate deploy` against the
module's own database — full platform schema, only invoicing tables used).

## Smoke test

```bash
# register + login
curl -X POST localhost:3101/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test1234!","firstName":"Test","lastName":"User"}'
# then use the returned token against /api/v1/invoices, /api/v1/vat, /api/v1/efactura-b2b ...
```

## Market research

See [docs/research/invoicing-efactura.md](../../docs/research/invoicing-efactura.md) — verified findings (REQ-044): pricing corridor 15-30 RON/mo, accountant multi-client beachhead (25€+2€/CIF benchmark), differentiation = ungated bundle with full SAF-T D406 generation.

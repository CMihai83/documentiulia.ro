# ops-supply — standalone module

Standalone slice of documentiulia (REQ-043, port **3107**).
Operations/SCM: inventory, warehouse, procurement, vendors, logistics, fleet, courier, ecommerce, quality.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-ops-supply.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3107/api/v1/health
```

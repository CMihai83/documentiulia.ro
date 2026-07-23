# crm-sales — standalone module

Standalone slice of documentiulia (REQ-043, port **3106**).
CRM + sales: contacts/deals/activities, partners, resellers, marketing automation, client portal.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-crm-sales.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3106/api/v1/health
```

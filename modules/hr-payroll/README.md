# hr-payroll — standalone module

Standalone slice of documentiulia (REQ-043, port **3103**).
HR + payroll: employees, contracts, forms, payroll saga, employee portal, ATS, HSE, scheduling.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-hr-payroll.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3103/api/v1/health
```

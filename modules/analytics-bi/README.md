# analytics-bi — standalone module

Standalone slice of documentiulia (REQ-043, port **3108**).
Analytics & BI: dashboards, KPIs, reports, simulation engine, fraud detection.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-analytics-bi.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3108/api/v1/health
```

# compliance-hub — standalone module

Standalone slice of documentiulia (REQ-043, port **3104**).
Compliance calendar, D112/D394, REVISAL, e-audit, GDPR (+ext), freelancer/PFA compliance.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-compliance-hub.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3104/api/v1/health
```

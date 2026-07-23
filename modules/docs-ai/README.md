# docs-ai — standalone module

Standalone slice of documentiulia (REQ-043, port **3105**).
Document AI: store/versioning/workflow, generation, OCR + smart categorization, PDF, contracts, templates.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-docs-ai.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3105/api/v1/health
```

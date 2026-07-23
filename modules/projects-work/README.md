# projects-work — standalone module

Standalone slice of documentiulia (REQ-043, port **3109**).
Projects & services work: PM (epics/kanban/tasks/time), workspaces, collaboration, workflow, consulting, expertise, business case.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-projects-work.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3109/api/v1/health
```

# lms-content — standalone module

Standalone slice of documentiulia (REQ-043, port **3110**).
Learning & content: LMS courses/certifications/gamification, CMS (blog/forum/courses), help center.

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-lms-content.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` and `modules/invoicing-efactura/README.md`.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3110/api/v1/health
```

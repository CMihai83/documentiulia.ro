# accounting-core — standalone module

Second standalone slice of the documentiulia platform (REQ-043 architecture,
port **3102**). SME accounting and close as a self-contained product:

- Chart of accounts + period closing (`/api/v1/accounting`, `accounting/periods`)
- Bank reconciliation (`/api/v1/bank-reconciliation`)
- Budgets: planning, tracking, variance, forecasting (`/api/v1/budgets/*`)
- Controlling: cost/profit centers, consolidation (`/api/v1/controlling`)
- Fixed assets: depreciation, disposal, maintenance (`/api/v1/assets/*`)
- Funds/treasury (`/api/v1/funds`), expense management (`/api/v1/expense-management`)

Deployable-slice pattern — shared source tree, dedicated entrypoint
(`backend/src/main-accounting.ts`), own Postgres/Redis/JWT. See
`docs/architecture/standalone-modules.md` for the dual-mode contract and
`modules/invoicing-efactura/README.md` for the template this replicates.

## Run

```bash
cp .env.example .env   # set JWT secrets
docker compose up -d --build
curl http://localhost:3102/api/v1/health
```

## Market research

See [docs/research/accounting-core.md](../../docs/research/accounting-core.md) — verified findings (REQ-044): bifurcated Saga-desktop vs cloud market, wedge = e-Factura auto-booking + native SAF-T D406 from GL + true PSD2 bank feeds, accountant multi-client beachhead at €10-30/mo per company.

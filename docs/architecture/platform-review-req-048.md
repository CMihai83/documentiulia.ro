# Platform Review — REQ-048 (2026-08-13)

**Method:** multi-agent workflow, 8 review dimensions × parallel agents (36 total),
findings deduplicated, every critical/high double-verified by skeptic agents that
read the actual code. 77 raw findings → 13 confirmed critical/high (1 refuted),
63 lower-severity logged below.

## Confirmed and FIXED (PRs #48, #49, #50 + certainty-engine 8f34db3)

1. **[critical] Journal entries are only POSTED when the invoice is PAID, breaking accrual accounting everywhere downstream**
   `backend/src/accounting/accounting.service.ts`

2. **[critical] generateUBL (used by the main invoice submission flow) emits unescaped, EN16931-noncompliant XML**
   `backend/src/anaf/efactura.service.ts`

3. **[critical] SAF-T D406 generate/preview/download take userId from body/params, not the JWT**
   `backend/src/anaf/saft-d406.controller.ts`

4. **[critical] e-Factura B2B XML generate/submit/validate use caller-supplied userId**
   `backend/src/anaf/efactura-b2b.controller.ts`

5. **[critical] Database maintenance controller has no auth guard; runs VACUUM/REINDEX with unsanitized table name**
   `backend/src/database/database.controller.ts`

6. **[critical] certainty-engine JWT_SECRET defaults to 'dev-secret-change-me'**
   `certainty-engine/api/app/config.py`

7. **[critical] 17+ dashboard pages read localStorage 'accessToken', which login never sets (it stores 'auth_token') — every request sends 'Bearer null'**
   `frontend/contexts/AuthContext.tsx`

8. **[critical] Invoice hard-delete with no status/legalHold guard cascades away Payments and InvoiceItems**
   `backend/src/invoices/invoices.service.ts`

9. **[critical] Only documentiulia-db is backed up; certainty-engine and module-slice databases have zero backup coverage**
   `scripts/backup-encrypted.sh`

10. **[high] Security-audit controller unauthenticated: anyone can block/unblock IPs and read audit reports**
   `backend/src/security/security-audit.controller.ts`

11. **[high] Client-portal controller unauthenticated and keyed only by clientId path param**
   `backend/src/client-portal/client-portal.controller.ts`

12. **[high] JWT verification falls back to hardcoded secret 'documentiulia_jwt_secret'**
   `backend/src/auth/jwt.strategy.ts`

13. **[high] REVISAL submit posts to nonexistent /api/v1/revisal/* and then shows a success toast telling the user the contract was transmitted**
   `frontend/app/[locale]/dashboard/contracts/page.tsx`

## Refuted by verification

- All MFA calls go to /api/auth/mfa/* which is neither a Next API route nor proxied — backend serves /api/v1/mfa/*; 2FA cannot be enabled, verified, or disabled

## Open backlog (lower severity, not yet fixed)

Ranked as reported. Several are worth promoting — notably the D406 invoice-status
filtering, non-RON currency handling, period-boundary bug, and the 19% default VAT
rate, which affect fiscal accuracy.

### critical (4)
- **Every slice ships a committed, predictable JWT_SECRET that is used live, enabling token forgery / full auth bypass**  
  `modules/invoicing-efactura/.env.example` — Each slice's .env.example commits a literal secret (JWT_SECRET=change-me-standalone-invoicing, accounting=change-me-standalone-accounting, etc.). README says `cp .env.example .env` and many operators never change it. Thi
- **17 dashboard pages read localStorage key 'accessToken' which is never written — every API call sends 'Bearer null'**  
  `frontend/app/[locale]/dashboard/accounting/general-ledger/page.tsx` — AuthContext only ever stores the JWT under 'auth_token' (/root/documentiulia.ro/frontend/contexts/AuthContext.tsx:100,157), but 17 pages read localStorage.getItem('accessToken'): accounting/general-ledger, journal-entry,
- **e-Factura B2B dashboard keys all requests to 'demo-user' because 'user_id' is never stored**  
  `frontend/app/[locale]/dashboard/efactura-b2b/page.tsx` — getUserId() = localStorage.getItem('user_id') || 'demo-user', but no app code ever calls setItem('user_id') (only e2e tests set a different 'user' key). So every real user's e-Factura B2B page fetches /efactura-b2b/dashb
- **Live deployment signs JWTs with the publicly committed placeholder secret**  
  `certainty-engine/api/app/config.py` — config.py falls back to 'dev-secret-change-me', and the actual /root/certainty-engine/.env (line 2) sets JWT_SECRET=change-me-to-a-long-random-string — byte-identical to the committed .env.example placeholder. Verified i

### high (31)
- **D406 includes CANCELLED, DRAFT and proforma invoices in VAT totals and SalesInvoices**  
  `backend/src/anaf/saft-d406-monthly.service.ts` — The invoice query (lines 195-201) filters only by userId and invoiceDate — no status filter. totalVATCollected/totalVATDeductible (lines 292-295) and buildSalesInvoices therefore include cancelled invoices and drafts, an
- **Period end boundary is midnight of the last day — invoices/payments later that day fall into a reporting gap**  
  `backend/src/anaf/saft-d406-monthly.service.ts` — endDate = new Date(year, month, 0) is the last day of the month at 00:00:00 local, and the Prisma filter uses lte: endDate (lines 198, 205). Any invoice or payment whose stored invoiceDate/paymentDate carries a time comp
- **Non-RON invoices are declared in D406 (and posted to the ledger) at foreign-currency face value labeled as RON**  
  `backend/src/anaf/saft-d406-monthly.service.ts` — InvoicesService.create stores netAmount/vatAmount in the invoice currency and separately computes baseNetAmount/baseVatAmount in RON via the BNR rate (invoices.service.ts:45-47). But the D406 builder uses inv.netAmount/v
- **Default VAT rate is still 19% after the Legea 141/2025 switch to 21% (Aug 2025)**  
  `backend/src/invoices/recurring-invoice.service.ts` — recurring-invoice.service.ts:115 sets vatRate: dto.vatRate || 19 on recurring-invoice templates — templates created today (Aug 2026) without an explicit rate generate invoices at 19%, and with autoSubmitSpv these go stra
- **generateCreditNote keeps the original invoice's positive vatBreakdown while totals go negative**  
  `backend/src/anaf/efactura.service.ts` — generateCreditNote spreads {...originalInvoice} (line 925) and then replaces only lines and totals. If the original invoice carried a vatBreakdown array (positive taxableAmount/taxAmount), the credit note retains it unch
- **Invoices already submitted to ANAF can be hard-deleted or have amounts edited**  
  `backend/src/invoices/invoices.service.ts` — delete() (lines 276-279) runs prisma.invoice.delete with no status/efacturaId guard, and update() (lines 243-251) recalculates netAmount/vatAmount/grossAmount on any invoice, including status SUBMITTED/APPROVED with an e
- **Bank-reconciliation controller unauthenticated and not user/org-scoped**  
  `backend/src/bank-reconciliation/bank-reconciliation.controller.ts` — @Controller('bank-reconciliation') has no guard and endpoints take accountId/transaction id from query/path with no user scoping. Anonymous callers can list bank accounts and transactions (GET /accounts, /transactions), 
- **Payroll run page calls four endpoints that don't exist: hr/payroll/summary, hr/payroll/calculate, hr/payroll/d112, hr/payroll/approve-all**  
  `frontend/app/[locale]/dashboard/hr/payroll/[period]/page.tsx` — Backend hr controller (backend/src/hr/hr.controller.ts) exposes @Post('payroll/generate'), @Post('payroll/process'), @Get('payroll'), @Put('payroll/:id/status'), @Get('payroll/:id/download') — there is no summary, no cal
- **Invoice detail 'Submit to SPV' posts to /api/v1/anaf/efactura/submit/:id but backend route is POST anaf/efactura/submit expecting {xml, cui} in the body**  
  `frontend/app/[locale]/dashboard/invoices/[id]/page.tsx` — backend/src/anaf/anaf.controller.ts:70 defines @Post('efactura/submit') with body { xml: string; cui: string } (spv.controller.ts:135 similarly has spv/efactura/submit). The frontend appends the invoice id as an extra pa
- **New-expense form POSTs to /api/v1/expenses — no 'expenses' controller exists (backend prefix is 'expense-management'), so expenses can never be saved**  
  `frontend/app/[locale]/dashboard/expenses/new/page.tsx` — backend/src/expense-management/expense-management.controller.ts:24 is @Controller('expense-management'); grep confirms no @Controller('expenses') anywhere. The form's onSubmit POST /api/v1/expenses returns 404 on every s
- **OCR upload posts multipart FormData to /api/v1/ocr/process, but the backend only has @Post('process/:documentId') taking a JSON body for an already-stored document**  
  `frontend/app/[locale]/dashboard/DashboardClient.tsx` — backend/src/ocr/ocr.controller.ts:22 defines @Post('process/:documentId') with @Body() ProcessOCRDto — there is no file-upload route at ocr/process and no @UseInterceptors(FileInterceptor) on the controller. DashboardCli
- **Settings pages GET/PATCH /api/v1/auth/profile — the backend has no such route (profile read is auth/me or settings/profile; no update route matches)**  
  `frontend/app/[locale]/dashboard/settings/profile/page.tsx` — backend/src/auth/auth.controller.ts exposes only @Get('me') (:189) for profile; the alias controller has @Get('profile') under @Controller('settings') plus @Post('user') for updates (backend/src/api-aliases.controller.ts
- **Whole pages call /api/... without the v1 prefix — only /api/v1/* is proxied to the backend, so logistics and quizzes render permanently empty**  
  `frontend/app/[locale]/dashboard/logistics/page.tsx` — logistics/page.tsx fetches /api/logistics/inventory/reports/summary (:230), /items (:236), /warehouses (:242), /alerts (:248), /customs/declarations (:260), /carbon/dashboard (:267), /demand-forecast/dashboard (:274), an
- **Data-export page targets a 'data-export' controller that doesn't exist in the backend, and its failure paths show toast.success — the same fake-success pattern survives in inventory, freelancer, and billing**  
  `frontend/app/[locale]/dashboard/data-export/page.tsx` — No @Controller('data-export') exists anywhere in backend/src; all six endpoints (POST /api/v1/data-export/start :235, /:id/retry :262, /quick/:type :288, /:id/pause :309, GET /templates/:type :335, POST /schedule/toggle 
- **No unique constraint on Invoice.invoiceNumber per user/org — duplicate invoice numbers persist silently**  
  `backend/prisma/schema.prisma` — Invoice has @@unique on nothing involving invoiceNumber (only documentId is unique), and invoices.service.ts create() (line 54) inserts dto.invoiceNumber without any duplicate check. Failure scenario: a double-click on s
- **Recurring invoice numbers derived from count(+1) — collisions after any deletion and under concurrency**  
  `backend/src/invoices/recurring-invoice.service.ts` — generateInvoiceFromTemplate numbers invoices as `${series}${year}-${count+1}` where count = prisma.invoice.count of ALL org invoices in the year (lines 351-361), not just this series. Failure scenarios: (1) any invoice d
- **Payment create/update/delete and invoice status recompute are separate writes with no $transaction**  
  `backend/src/payments/payments.service.ts` — create() writes the Payment (line 23) then separately calls updateInvoicePaymentStatus (line 42) which reads payments and updates invoice.paidAmount/paymentStatus (lines 358-391); update() and remove() follow the same pa
- **Invoice paid-status aggregation is currency-blind and done in JS floats**  
  `backend/src/payments/payments.service.ts` — updateInvoicePaymentStatus sums Number(p.amount) across all COMPLETED payments (line 370) and compares to Number(invoice.grossAmount) (lines 371-374), then writes the float sum back into the Decimal paidAmount (line 387)
- **linkToPayment raw SQL references non-existent Payment."userId" column — feature always fails; design also strands old invoice status**  
  `backend/src/invoices/invoices.service.ts` — The raw query at lines 1084-1089 filters Payment by "userId", but the Payment model (schema.prisma:270-291) has no userId column — payments are scoped only through invoice.userId. At runtime Postgres raises 'column "user
- **adjustStock is a non-transactional read-modify-write — concurrent adjustments lose stock and corrupt the movement ledger**  
  `backend/src/inventory/inventory.service.ts` — adjustStock reads product.currentStock (line 209), computes newStock in JS, inserts a StockMovement with previousStock/newStock (lines 232-246), then updates the product (lines 249-252). No $transaction, no atomic increm
- **Stateful containers (certainty db, all module-slice db/redis) have no restart policy — a reboot leaves production databases down**  
  `certainty-engine/docker-compose.yml` — In /root/certainty-engine/docker-compose.yml only api and web declare restart: unless-stopped; the db service does not. Same pattern in every slice compose (/root/documentiulia.ro/modules/invoicing-efactura/docker-compos
- **deploy-production.sh is both unrunnable and dangerous: `docker system prune -f --volumes` on a shared host, plus port conflicts with the real deployment**  
  `scripts/deploy-production.sh` — The script has fully drifted from actual practice (backend=docker, frontend=pm2, system nginx). (1) cleanup() runs `docker system prune -f --volumes` unconditionally at the end of every deploy — on this shared host runni
- **Certainty API (:8000), web (:3005) and Next.js frontend (:3000) are bound to all interfaces with no firewall — direct internet access bypasses nginx/Cloudflare**  
  `certainty-engine/docker-compose.yml` — ufw is inactive and the DOCKER-USER chain is empty. certainty-engine compose publishes api as "8000:8000" and web as "3005:3000" (0.0.0.0), and ecosystem.config.js:15 sets HOSTNAME 0.0.0.0 so pm2 Next.js listens on *:300
- **.env.production.example omits the encryption/signing keys the code needs — a deploy from the example silently stores PII unencrypted**  
  `backend/.env.production.example` — The example file lists DATABASE_URL/JWT/ANAF/SMTP etc. but not ENCRYPTION_MASTER_KEY, CREDENTIAL_SIGNING_KEY, PEER_REVIEW_HMAC_KEY, or BACKUP_ENCRYPTION_KEY, all of which docker-compose.yml passes through (lines 54-56) a
- **Hardcoded shared JWT fallback secret 'documentiulia_jwt_secret' makes tokens cross-valid across all slices and the platform**  
  `backend/src/auth/auth.module.ts` — Both auth.module.ts:27 (JwtModule secret) and auth/jwt.strategy.ts:35 (Passport secretOrKey) fall back to the same literal 'documentiulia_jwt_secret' when JWT_SECRET is unset. If any slice is deployed without JWT_SECRET 
- **Payment confirmation email shows 'Email trimis' success even when the API errors or the network fails**  
  `frontend/app/[locale]/dashboard/payments/[id]/page.tsx` — handleSendEmail: the else branch (response not ok, comment '// Simulate success for demo') and the catch branch (line ~370, '// Simulate success for demo even on network error') both fire toast.success('Email trimis', 'C
- **Compliance page presents fully hardcoded ANAF compliance and declaration statuses as real (zero API calls)**  
  `frontend/app/[locale]/dashboard/compliance/page.tsx` — The page contains no fetch at all (grep -c 'fetch(' = 0). complianceItems (lines 52-61) claim 'e-Factura: compliant', 'SAF-T D406: compliant', 'REVISAL: warning' with lastCheck dates, and declarations (lines 64-69) show 
- **94 router.push targets point to routes with no page.tsx — including the global dashboard search**  
  `frontend/app/[locale]/dashboard/DashboardClient.tsx` — Cross-checking every router.push('/dashboard/...') in dashboard pages against app/[locale] page files finds 94 targets with no matching route, all producing 404s: DashboardClient.tsx:604 pushes /dashboard/search (the mai
- **Marketing page still ships hardcoded audiences and analytics charts directly under a comment claiming 'no fabricated sample data'**  
  `frontend/app/[locale]/dashboard/marketing/page.tsx` — Lines 75-76 say campaigns come from the API with 'no fabricated sample data', yet lines 78-107 hardcode audiences (Toți abonații: 3250, Clienți Premium: 450...), emailPerformance (6 months of sent/opened/clicked), audien
- **API published on 0.0.0.0:8000, bypassing nginx TLS, security headers, and body-size cap**  
  `certainty-engine/docker-compose.yml` — ports: "8000:8000" binds the FastAPI container to all interfaces (confirmed live: 0.0.0.0:8000->8000). The nginx vhost certainty.documentiulia.ro proxies /api/ from 127.0.0.1:8000 with TLS, security headers, and client_m
- **Upload endpoint reads the entire request body into memory before the 25 MB check**  
  `certainty-engine/api/app/main.py` — upload_document does data = file.file.read() at line 82 and only then checks len(data) > 25MB at line 83. Combined with the API being directly exposed on public port 8000 (no nginx 30m cap on that path), an unauthenticat

### medium (24)
- **Trial balance always reports zero opening balances and clamps contrary balances to zero**  
  `backend/src/accounting/accounting.service.ts` — getTrialBalance hardcodes openingDebit/openingCredit to 0 (lines 267-268) and computes closing as Math.max(0, ...) on the side dictated by account nature (lines 271-272). Two failures: (1) the D406 GeneralLedgerAccounts 
- **Closed/locked period state lives in an in-memory Map and is not enforced on postings**  
  `backend/src/accounting/period-closing.service.ts` — PeriodClosingService stores all AccountingPeriod state in `private periods: Map` (line 65). Failure scenario: an accountant closes and locks July 2026; the backend restarts (deploys are weekly per ops guidelines) and eve
- **certainty-engine CORS allow_origins=['*'] with allow_methods/headers '*'**  
  `certainty-engine/api/app/main.py` — CORSMiddleware is configured with allow_origins=['*'], allow_methods=['*'], allow_headers=['*']. Combined with a Bearer-token API, any origin can script cross-origin calls if it obtains a token; more importantly it disab
- **Error-logging endpoint protected by hardcoded fallback API key 'default-error-logging-key'**  
  `backend/src/errors/errors.controller.ts` — validateApiKey uses process.env.ERROR_LOGGING_API_KEY || 'default-error-logging-key', and the check only runs when NODE_ENV==='production' (errors.controller.ts:38,53). In any non-production env the endpoint is fully ope
- **update() lets amounts/invoiceNumber of ANAF-SUBMITTED invoices be mutated; finalizeAndSubmit has no double-submit guard**  
  `backend/src/invoices/invoices.service.ts` — update() (lines 237-274) applies UpdateInvoiceDto (which includes invoiceNumber, netAmount, vatRate, status) with no check on current status, spvSubmitted, legalHold, or restrictedAt. Failure scenario: after an invoice i
- **deleteProduct hard-deletes the entire StockMovement history for the product**  
  `backend/src/inventory/inventory.service.ts` — deleteProduct (lines 193-200) runs stockMovement.deleteMany then product.delete (also non-transactionally). StockMovement rows carry unitCost, referenceType/referenceId (e.g. links to invoices) and are the audit trail fo
- **DeMinimisAid.amountEur (and FundingProfile financials) store money as Float**  
  `backend/prisma/schema.prisma` — DeMinimisAid.amountEur (line 3484) is Float, yet it is the ledger used for the legally binding EUR 300,000 rolling 3-year de minimis ceiling check (per the model's own doc comment); FundingProfile.turnoverEur/balanceShee
- **Backend container runs without CORS_ORIGINS, FRONTEND_URL, or SMTP settings — CORS falls back to localhost:3000 and WebSockets from production origin are blocked**  
  `docker-compose.yml` — docker-compose.yml's backend environment block passes only DB/Redis/JWT/Grok/ANAF/crypto vars. Verified via `docker exec documentiulia-backend printenv`: CORS_ORIGINS, FRONTEND_URL, SMTP_* are absent (they live only in e
- **nginx adds Access-Control-Allow-Origin:* on /api/v1/ while the backend sends Allow-Credentials:true — wildcard defeats CORS and the combo is spec-invalid**  
  `/etc/nginx/sites-available/documentiulia.ro` — Verified live response on /api/v1/health: `Access-Control-Allow-Credentials: true` (from NestJS) together with nginx's `Access-Control-Allow-Origin: *`. Per the fetch spec, browsers reject credentialed responses with a w
- **No log rotation anywhere: docker json-file logs unbounded (up to 445MB), /var/log/documentiulia has a 159MB rejections.log, no pm2-logrotate**  
  `docker-compose.yml` — /etc/docker/daemon.json does not exist and no compose file sets a logging: option, so every container logs to an unbounded json-file (verified: documentiulia-db 113MB, others 445MB/257MB/239MB). /etc/logrotate.d has no d
- **No monitoring or alerting is actually running — observability stack is defined but not deployed, and backup/restore failures alert no one**  
  `docker-compose.observability.yml` — docker-compose.observability.yml defines an ELK stack, but no elasticsearch/kibana/prometheus/grafana/alertmanager container exists on the host (verified via docker ps -a). Project guidelines mandate Prometheus/Grafana w
- **README smoke-test register payload uses firstName/lastName but the DTO requires `name` — the documented onboarding command returns HTTP 400**  
  `modules/invoicing-efactura/README.md` — The README smoke test posts {"email":...,"password":"Test1234!","firstName":"Test","lastName":"User"}. RegisterDto (backend/src/auth/auth.controller.ts:21-39) defines only email/password/name/company/cui, and the global 
- **DB_PASSWORD defaults to the database name (weak, guessable) and the same value is committed in .env.example / .env**  
  `modules/invoicing-efactura/docker-compose.yml` — Every slice compose uses `POSTGRES_PASSWORD: ${DB_PASSWORD:-invoicing}` and DATABASE_URL `...:${DB_PASSWORD:-invoicing}@db:5432/...`, defaulting the Postgres password to the DB/user name. .env.example commits DB_PASSWORD
- **Refresh tokens are held in an in-process Map, so every slice restart logs out all users and the design breaks with >1 replica**  
  `backend/src/auth/auth.service.ts` — auth.service.ts:67 stores refresh tokens in `private refreshTokens: Map<string, StoredRefreshToken>` (the code comment at line 36/66 even says it 'should be Redis in production'). Each slice compose sets `restart: unless
- **Billing and Monitoring dashboard pages are 100% hardcoded — fake paid invoices and fake 99.99% uptime with 'checked 2 sec ago'**  
  `frontend/app/[locale]/dashboard/billing/page.tsx` — Both pages contain zero fetch calls. billing/page.tsx hardcodes an active 'Business 149 RON' subscription, six invoices INV-2025-007..012 all marked 'paid' with downloadUrl '#', and usage metrics (234 facturi, 12450 API 
- **CRM marks activities completed and deals moved with success toasts even when the PATCH fails**  
  `frontend/app/[locale]/dashboard/crm/page.tsx` — handleCompleteActivity and handleMoveDealStage (line 342) never check response.ok — a 400/401/500 still shows toast.success('Activitate finalizată' / 'Deal mutat') and calls fetchData(), which silently reverts the UI to 
- **Quality module list page has all API calls commented out as TODOs and always renders the error/empty state**  
  `frontend/app/[locale]/dashboard/quality/page.tsx` — fetchData reads a token (from the wrong key 'token', never set) and then every fetch to /api/v1/quality/* is commented out (lines 219-263); it unconditionally calls loadEmpty() which sets loadError=true. So the Quality l
- **Hardcoded RO/EN mixing: 39 pages show concatenated bilingual error strings and pages mix Romanian headings with English placeholders**  
  `frontend/app/[locale]/dashboard/ecommerce/page.tsx` — 157 of 222 dashboard page.tsx files use no useTranslations at all. 39 files (crm, projects, blog, scheduling, contracts, assets, employee-portal, finance/transactions/[id], partners/[id]/edit, ...) hardcode the error str
- **CORS allows every origin with all methods and headers on a production API**  
  `certainty-engine/api/app/main.py` — allow_origins=["*"] with allow_methods/headers=["*"] means any website can script requests against the live API, including the Authorization header (note: allow_credentials is not set, so this is not the cookie-credentia
- **In-process extraction with no recovery leaves documents stuck in 'processing' forever after a restart**  
  `certainty-engine/api/app/extraction.py` — run_extraction runs via FastAPI BackgroundTasks in the API process. If the container restarts/crashes/OOMs mid-extraction (deploys happen: restart: unless-stopped), the document row keeps status='processing' permanently 
- **49-year term-cap check computes the term from min/max of ALL dates in the field, and ANAF deadline uses the wrong anchor date**  
  `certainty-engine/api/app/compliance.py` — _check_term_cap regex-scans every ISO date in the term_dates value and takes start=min, end=max (lines 42-43). The extraction prompt asks for 'commencement date and expiration date (and term length if stated)', but value
- **CSV export writes LLM-derived values verbatim — spreadsheet formula injection from a hostile lease**  
  `certainty-engine/api/app/main.py` — export_csv writes field/value/snippet straight into the CSV. extracted_value and source_snippet are derived from arbitrary uploaded document text by the LLM (snippets are required to be exact quotes of the document), so 
- **Optimistic correction update with no error handling silently loses user corrections**  
  `certainty-engine/web/app/documents/[id]/page.tsx` — saveCorrection applies the optimistic UI update and closes the editor BEFORE awaiting api('/api/corrections'); if that POST fails (network blip, backend restart, expired token during 401 redirect race), the rejection is 
- **No backup of the certainty Postgres volume; api/web services have no healthchecks**  
  `certainty-engine/docker-compose.yml` — All customer data — users, uploaded lease texts, extractions, the admin-verified corrections that are the product's stated 'data moat', and Stripe subscription linkage — lives solely in the local docker volume pgdata. Th

### low (4)
- **ecosystem.config.js defines a backend pm2 app with an unsupported env_file key — running it boots a secretless backend that fights the docker container for port 3001**  
  `ecosystem.config.js` — The backend actually runs in docker, but the ecosystem file still declares a documentiulia-backend pm2 app relying on `env_file`, which pm2 does not support in ecosystem configs (it is silently ignored). Failure scenario
- **JWT_REFRESH_SECRET is declared in every slice .env.example but is never read anywhere in the backend — dead, misleading config**  
  `modules/invoicing-efactura/.env.example` — All ten slice .env.example files declare JWT_REFRESH_SECRET (e.g. change-me-standalone-invoicing-refresh). A repo-wide grep of backend/src (excluding specs) for JWT_REFRESH_SECRET / REFRESH_SECRET returns nothing; refres
- **api depends_on redis uses condition: service_started with no redis healthcheck, so the app can connect before Redis is ready**  
  `modules/invoicing-efactura/docker-compose.yml` — Every slice compose gives the db a healthcheck and waits on service_healthy, but redis has no healthcheck and api waits only on `condition: service_started` (container process spawned, not necessarily accepting connectio
- **run_checks DELETE + INSERTs are separate transactions — concurrent corrections duplicate or drop compliance rows**  
  `certainty-engine/api/app/compliance.py` — q() opens a fresh pooled connection (own transaction) per statement, so run_checks' DELETE (line 162) and the following per-check INSERTs are not atomic. submit_correction calls run_checks synchronously on every correcti

> Note on the 'critical' entries in this open list: they overlap with fixes already
> shipped (slice JWT secrets, the accessToken key) or are duplicate framings of them;
> they were not re-verified individually. Re-run the review to get a clean delta.

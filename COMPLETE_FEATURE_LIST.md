# DocumentIulia - Complete Feature List

## Date: 2025-11-19 18:20 UTC

## Login Credentials

### Test Users
- **Admin**: `test_admin@accountech.com` / `TestPass123!`
- **User**: `test_user@accountech.com` / `TestPass123!`
- **Manager**: `test_manager@accountech.com` / `TestPass123!`

### Production Users
- **CEO**: `ceo@accountech.com` (John Smith - admin)
- **CFO**: `cfo@accountech.com` (Sarah Johnson)
- **Accountant**: `accountech@accountech.com` (Emily Davis)
- **Inventory**: `inventory@accountech.com` (David Brown)
- **Sales**: `sales@accountech.com` (Mike Williams)

---

## All Available Features (19 Main Modules)

### 1. 📊 Panou Control (Dashboard)
**Route**: `/dashboard`
- Overview of business metrics
- Quick access to all modules
- Recent activity feed

### 2. 📄 Facturi (Invoices)
**Routes**: `/invoices`, `/invoices/new`, `/invoices/:id/edit`
- Create, edit, delete invoices
- Send invoices via email
- Invoice status tracking
- PDF generation

### 3. 💳 Chitanțe (Bills)
**Route**: `/bills`
- Manage incoming bills
- Track payment status
- Bill categorization

### 4. 🧾 Cheltuieli (Expenses)
**Route**: `/expenses`
- Track business expenses
- Receipt upload
- Expense categorization
- Reporting

### 5. 🔢 Contabilitate (Accounting)
**Routes**: `/accounting`, `/accounting/chart-of-accounts`
- General ledger management
- Chart of accounts (Plan de Conturi)
- Trial balance
- Journal entries
- **NEW**: Advanced accounting features

### 6. 📦 Inventar (Inventory Management)
**Route**: `/inventory`
**Sub-routes**:
- `/inventory/products` - Product catalog
- `/inventory/stock-levels` - Stock levels by warehouse
- `/inventory/warehouses` - Warehouse management
- `/inventory/low-stock` - Low stock alerts
- `/inventory/movements` - Stock movement history
- `/inventory/adjustments` - Stock adjustments
- `/inventory/transfers` - Inter-warehouse transfers

Features:
- Multi-warehouse support
- Real-time stock tracking
- Automated reorder points
- Stock valuation (FIFO, LIFO, Weighted Average)
- Barcode/SKU management

### 7. 🎯 CRM (Customer Relationship Management)
**Route**: `/crm`
**Sub-routes**:
- `/crm/opportunities` - Sales opportunities pipeline
- `/crm/opportunities/:id` - Opportunity details
- `/crm/quotations` - Quotation management
- `/crm/contacts` - Contact management

Features:
- Sales pipeline visualization
- Opportunity tracking
- Quote generation
- Customer history
- Sales forecasting

### 8. 🛒 Comenzi Achiziție (Purchase Orders)
**Routes**: `/purchase-orders`, `/purchase-orders/:id`
- Create purchase orders
- Track supplier orders
- PO approval workflow
- Receive goods
- Link to inventory

### 9. 💼 Proiecte (Project Management) **NEW**
**Route**: `/projects`
- Project tracking
- Task management
- Resource allocation
- Project budgeting
- Timeline visualization

### 10. ⏰ Pontaj Timp (Time Tracking) **NEW**
**Routes**: `/time-tracking`, `/time/entries`
- Employee time tracking
- Timesheet management
- Billable vs non-billable hours
- Time entry approval
- Project time allocation

### 11. 👥 Contacte (Contacts)
**Route**: `/contacts`
- Customer management
- Supplier management
- Contact categorization
- Communication history

### 12. 📈 Rapoarte (Reports)
**Route**: `/reports`
- Profit & Loss (Cont de Profit și Pierdere)
- Balance Sheet (Bilanț)
- Cash Flow Statement
- Trial Balance
- Custom date ranges
- Export to PDF/Excel

### 13. 📊 Analize & BI (Analytics & Business Intelligence) **NEW**
**Route**: `/analytics`
- Interactive dashboards
- Sales analytics
- Financial metrics
- Trend analysis
- Predictive analytics
- Custom reports

### 14. 💡 Analize AI (AI Insights)
**Route**: `/insights`
- AI-powered business insights
- Anomaly detection
- Trend predictions
- Automated recommendations
- Cash flow forecasting

### 15. 🧠 Consultant Business (Business Consultant AI)
**Route**: `/business-consultant`
- AI business advisor
- Strategy recommendations
- Financial planning
- Growth optimization
- Risk analysis

### 16. ⚖️ Legislație Fiscală (Fiscal Law AI)
**Routes**: `/fiscal-law`, `/fiscal-law-ai`
- Romanian tax law database
- AI-powered tax consultant
- Automated compliance checks
- Tax deadline reminders
- ANAF integration

### 17. 🌳 Arbori de Decizie (Decision Trees)
**Route**: `/decision-trees`
- Interactive decision guidance
- Business decision framework
- Tax optimization paths
- Compliance workflows

### 18. 📚 Tutoriale & Ghiduri (Tutorials & Guides)
**Route**: `/tutorials`
- Platform tutorials
- Accounting guides
- Best practices
- Video walkthroughs

### 19. 👤 Context Personal (Personal Context)
**Route**: `/personal-context`
- User preferences
- Business profile
- Industry settings
- Tax regime configuration

---

## Admin Features (Admin Users Only)

### 🛡️ Actualizări Arbori (Decision Tree Updates)
**Route**: `/admin/decision-tree-updates`
- Update decision tree content
- Manage business logic
- Configure workflows

---

## Technical Modules Overview

### Core Accounting Features
- **Double-entry bookkeeping**
- **Romanian accounting standards (RAS/IFRS)**
- **TVA (VAT) management**
- **Automated journal entries**
- **Bank reconciliation**

### Inventory Management
- **Multi-warehouse support**
- **Real-time stock tracking**
- **Automated reorder points**
- **Stock valuation methods**
- **Barcode integration**

### CRM & Sales
- **Opportunity pipeline**
- **Quote-to-cash workflow**
- **Customer segmentation**
- **Sales forecasting**
- **Communication tracking**

### AI-Powered Features
- **Natural language queries**
- **Automated insights**
- **Predictive analytics**
- **Smart recommendations**
- **Anomaly detection**

### Compliance & Reporting
- **Romanian fiscal regulations**
- **ANAF e-Factura integration**
- **Automated tax calculations**
- **Compliance monitoring**
- **Audit trails**

---

## API Endpoints Summary

All endpoints use JWT authentication and company context headers.

### Authentication
- `POST /api/v1/auth/login.php` - User login
- `POST /api/v1/auth/register.php` - User registration
- `GET /api/v1/auth/me.php` - Get current user

### Core Financial
- `/api/v1/invoices/*` - Invoice management
- `/api/v1/bills/*` - Bill management
- `/api/v1/expenses/*` - Expense tracking
- `/api/v1/accounting/*` - Accounting operations
- `/api/v1/reports/*` - Financial reports

### Inventory
- `/api/v1/inventory/products.php` - Product catalog
- `/api/v1/inventory/stock-levels.php` - Stock tracking
- `/api/v1/inventory/warehouses.php` - Warehouse management
- `/api/v1/inventory/movements.php` - Stock movements
- `/api/v1/inventory/adjustments.php` - Stock adjustments
- `/api/v1/inventory/transfers.php` - Inter-warehouse transfers

### CRM
- `/api/v1/crm/opportunities.php` - Sales opportunities
- `/api/v1/crm/quotations.php` - Quotations
- `/api/v1/contacts/*` - Contact management

### Purchase Orders
- `/api/v1/purchase-orders/*` - PO management

### Time & Projects
- `/api/v1/time/entries.php` - Time tracking
- `/api/v1/projects/*` - Project management

### Analytics & AI
- `/api/v1/analytics/*` - Analytics endpoints
- `/api/v1/insights/*` - AI insights
- `/api/v1/fiscal/ai-consultant.php` - Fiscal AI consultant

---

## System Requirements

- **Backend**: PHP 8.2, PostgreSQL 14+, TimescaleDB
- **Frontend**: React 19, TypeScript, Vite
- **Server**: Nginx, Cloudflared (HTTPS)
- **AI**: Ollama (local AI processing)

---

## Quick Start Guide

1. **Login**: Visit `https://documentiulia.ro/login`
2. **Use test credentials**: `test_user@accountech.com` / `TestPass123!`
3. **Explore dashboard**: All 19 modules visible in left sidebar
4. **Navigate features**: Click any sidebar item to explore
5. **Add data**: Each module has "Add New" buttons to create entries

---

## Support & Documentation

- **Error Logs**: `/var/log/nginx/documentiulia.ro-error.log`
- **API Documentation**: Available in each endpoint's header comments
- **User Guide**: Tutorials page (in-app)
- **Technical Docs**: `/var/www/documentiulia.ro/README.md`

---

**Status**: ✅ All modules deployed and accessible
**Last Update**: 2025-11-19 18:20 UTC
**Build**: `dist/assets/index-D-wPB0W9.js` (1041.13 kB)

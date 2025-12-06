# Documentiulia.ro - Complete Project Backlog & Sprint Planning

## Master Tracking Document
**Last Updated**: 2025-11-30
**Project Status**: SPRINTS 1-21 COMPLETE, EPICS 1-5 COMPLETE
**Total Story Points Estimated**: ~850 points
**Points Completed**: ~680 points (Sprints 1-21)
**Estimated Duration**: 6-9 months (with 1-2 developers)

---

## Executive Summary

Transform documentiulia.ro from a generic accounting platform into **"The Digital Bridge for European SMEs"** - a persona-adaptive platform serving Romanian and European small businesses.

### Current State
- Basic accounting platform functional
- 60+ API endpoints working
- React frontend deployed
- PostgreSQL database operational
- OCR engine functional

### Target State
- Persona-adaptive UI that morphs based on business type
- 6 specialized vertical modules (Delivery, Construction, Electrical, etc.)
- Multi-language, multi-currency support
- EU compliance automation (e-Factura, GDPR, VAT)
- Pan-European market readiness

---

## EPIC OVERVIEW

| Epic ID | Epic Name | Story Points | Priority | Status |
|---------|-----------|--------------|----------|--------|
| **E1** | Persona System Core | 120 | P0 - Critical | COMPLETE (Sprint 1-3) |
| **E2** | Romanian Market Features | 150 | P0 - Critical | COMPLETE (Sprint 4-6) |
| **E3** | Construction/Trades Module | 180 | P1 - High | COMPLETE (Sprint 7-12) |
| **E4** | Delivery/Logistics Module | 140 | P2 - Medium | COMPLETE (Sprint 13-17) |
| **E5** | EU Expansion Framework | 100 | P2 - Medium | COMPLETE (Sprint 18-21) |
| **E6** | Mobile Experience | 80 | P3 - Low | IN PROGRESS (Sprint 22) |
| **E7** | AI/ML Enhancements | 80 | P3 - Low | NOT STARTED |

---

# EPIC 1: PERSONA SYSTEM CORE
**Priority**: P0 - Critical (Must complete first)
**Total Points**: 120
**Dependencies**: None (Foundation)

## User Stories

### E1-US01: Database Schema for Personas
**Points**: 13 | **Sprint**: 1 | **Status**: NOT STARTED

**Description**: Create database tables for persona management

**Acceptance Criteria**:
- [ ] Create `business_personas` table with 12 persona definitions
- [ ] Create `company_persona_settings` table linking companies to personas
- [ ] Create `feature_toggles` table for persona-based feature flags
- [ ] Create `persona_onboarding_steps` table
- [ ] Migration scripts created and tested
- [ ] Seed data for all 12 personas

**Technical Tasks**:
```sql
-- Tables to create:
- business_personas
- company_persona_settings
- feature_toggles
- persona_onboarding_steps
- persona_dashboard_layouts
```

---

### E1-US02: Persona Selection During Onboarding
**Points**: 21 | **Sprint**: 1-2 | **Status**: NOT STARTED

**Description**: Implement persona selection wizard during company setup

**Acceptance Criteria**:
- [ ] Visual persona selection screen with icons and descriptions
- [ ] Multi-language support (RO, EN initially)
- [ ] "Not sure? Help me choose" quiz option
- [ ] Selected persona saves to company settings
- [ ] Persona can be changed later from settings
- [ ] Analytics tracking for persona selection

**UI Screens**:
```
1. Welcome screen with persona grid (12 options)
2. Persona detail modal with features highlighted
3. Quiz flow (5-7 questions) for undecided users
4. Confirmation screen with "Start Setup" button
```

---

### E1-US03: Adaptive Dashboard Framework
**Points**: 34 | **Sprint**: 2-3 | **Status**: NOT STARTED

**Description**: Dashboard that morphs based on selected persona

**Acceptance Criteria**:
- [ ] Dashboard layout defined per persona in database
- [ ] Widget system with drag-and-drop customization
- [ ] Default widgets different per persona
- [ ] Widget data sources configurable
- [ ] Save custom layouts per user
- [ ] Reset to persona default option

**Widgets Required** (Phase 1):
```
- Revenue chart (all personas)
- Expenses chart (all personas)
- Outstanding invoices (all personas)
- Cash flow forecast (all personas)
- Quick actions (persona-specific)
- Today's tasks (persona-specific)
- Recent activity feed
```

---

### E1-US04: Feature Toggle System
**Points**: 21 | **Sprint**: 2 | **Status**: NOT STARTED

**Description**: Show/hide features based on persona and subscription

**Acceptance Criteria**:
- [ ] Feature registry with all platform features
- [ ] Persona-to-feature mapping in database
- [ ] Subscription tier to feature mapping
- [ ] API middleware to check feature access
- [ ] UI components conditionally render based on access
- [ ] "Upgrade to unlock" prompts for hidden features

**Feature Categories**:
```
- Core (all personas): Invoicing, Expenses, Contacts
- Vertical (specific): Routes, Estimates, Service Calls
- Premium (paid): AI features, Advanced Analytics
- Regional (country): e-Factura, ANRE tracking
```

---

### E1-US05: Persona-Specific Navigation
**Points**: 13 | **Sprint**: 3 | **Status**: NOT STARTED

**Description**: Sidebar navigation changes based on persona

**Acceptance Criteria**:
- [ ] Navigation items defined per persona
- [ ] Icons and labels customizable
- [ ] Nested navigation for complex modules
- [ ] "Favorites" section user can customize
- [ ] Recent items quick access
- [ ] Search across all sections

**Navigation Examples**:
```
CONSTRUCTION:
├── Dashboard
├── Estimates
├── Projects
├── Materials
├── Crew
├── Invoices
└── Settings

DELIVERY:
├── Dashboard
├── Routes
├── Drivers
├── Packages
├── Fleet
├── Invoices
└── Settings
```

---

### E1-US06: Persona Analytics & Tracking
**Points**: 8 | **Sprint**: 3 | **Status**: NOT STARTED

**Description**: Track persona adoption and feature usage

**Acceptance Criteria**:
- [ ] Track persona selection rates
- [ ] Track feature usage by persona
- [ ] Identify unused features per persona
- [ ] Admin dashboard for persona analytics
- [ ] Export data for analysis

---

### E1-US07: Multi-Language Foundation
**Points**: 13 | **Sprint**: 1 | **Status**: NOT STARTED

**Description**: Implement i18n framework for multi-language support

**Acceptance Criteria**:
- [ ] i18next or similar library integrated
- [ ] Romanian translations complete (100%)
- [ ] English translations complete (100%)
- [ ] Language switcher in header
- [ ] Language preference saved to user profile
- [ ] RTL support prepared (for future Arabic)

---

# EPIC 2: ROMANIAN MARKET FEATURES
**Priority**: P0 - Critical
**Total Points**: 150
**Dependencies**: E1 (Persona System)

## User Stories

### E2-US01: e-Factura Integration
**Points**: 34 | **Sprint**: 4-5 | **Status**: NOT STARTED

**Description**: Integrate with ANAF e-Factura system for B2B/B2G invoicing

**Acceptance Criteria**:
- [ ] SPV (Spatiul Privat Virtual) OAuth connection
- [ ] Generate e-Factura XML format
- [ ] Submit invoices to ANAF API
- [ ] Receive and parse responses
- [ ] Track submission status
- [ ] Handle errors and rejections
- [ ] Store e-Factura reference numbers
- [ ] Download PDF from ANAF

**Technical Requirements**:
```
- ANAF API credentials storage
- XML generation library
- Digital signature handling
- Background job for submissions
- Webhook for status updates
```

---

### E2-US02: Romanian Tax Calculations
**Points**: 21 | **Sprint**: 4 | **Status**: NOT STARTED

**Description**: Implement Romanian-specific tax calculations

**Acceptance Criteria**:
- [ ] TVA (VAT) calculation at 19%, 9%, 5%, 0%
- [ ] CAS/CASS calculation for employees
- [ ] Impozit pe venit (income tax) calculation
- [ ] Impozit pe profit (corporate tax)
- [ ] Contribution deadlines calendar
- [ ] Tax optimization suggestions
- [ ] Declaration 112 pre-population

---

### E2-US03: Romanian Bank Integration
**Points**: 34 | **Sprint**: 5-6 | **Status**: NOT STARTED

**Description**: Connect to Romanian banks for transaction import

**Acceptance Criteria**:
- [ ] BT (Banca Transilvania) integration
- [ ] BCR integration
- [ ] BRD integration
- [ ] ING Romania integration
- [ ] Automatic transaction categorization
- [ ] Bank statement import (MT940, CSV)
- [ ] Reconciliation with invoices/expenses

**Integration Options**:
```
Priority 1: Salt Edge (aggregator)
Priority 2: Direct bank APIs where available
Fallback: Manual CSV/PDF import
```

---

### E2-US04: WhatsApp Business Integration
**Points**: 21 | **Sprint**: 6 | **Status**: NOT STARTED

**Description**: Integrate WhatsApp for business communication

**Acceptance Criteria**:
- [ ] WhatsApp Business API connection
- [ ] Send invoices via WhatsApp
- [ ] Send payment reminders
- [ ] Receive client messages in platform
- [ ] Template messages for common scenarios
- [ ] Message history per contact
- [ ] Opt-out handling

---

### E2-US05: Romanian Supplier Database
**Points**: 13 | **Sprint**: 7 | **Status**: NOT STARTED

**Description**: Pre-populated Romanian supplier database

**Acceptance Criteria**:
- [ ] Major suppliers (Dedeman, Hornbach, etc.)
- [ ] Supplier categories
- [ ] Price tracking per supplier
- [ ] Integration with material calculations
- [ ] User can add custom suppliers

---

### E2-US06: Romanian Calendar & Holidays
**Points**: 8 | **Sprint**: 4 | **Status**: NOT STARTED

**Description**: Romanian business calendar integration

**Acceptance Criteria**:
- [ ] Romanian public holidays
- [ ] Bank holidays
- [ ] Tax deadline calendar
- [ ] "Zile libere" handling in scheduling
- [ ] Easter calculation (Orthodox)

---

### E2-US07: ANAF CUI/CIF Validation
**Points**: 8 | **Sprint**: 4 | **Status**: NOT STARTED

**Description**: Validate Romanian company registration numbers

**Acceptance Criteria**:
- [ ] CUI/CIF format validation
- [ ] ANAF API lookup for company details
- [ ] Auto-populate company name, address
- [ ] TVA payer status check
- [ ] Cache results for performance

---

### E2-US08: Romanian Invoice Templates
**Points**: 13 | **Sprint**: 5 | **Status**: NOT STARTED

**Description**: Legally compliant Romanian invoice templates

**Acceptance Criteria**:
- [ ] Factura fiscala template
- [ ] Factura proforma template
- [ ] Aviz de insotire template
- [ ] Chitanta template
- [ ] All legal requirements met
- [ ] Customizable logo/colors
- [ ] PDF generation with proper fonts

---

# EPIC 3: CONSTRUCTION/TRADES MODULE
**Priority**: P1 - High
**Total Points**: 180
**Dependencies**: E1, E2

## User Stories

### E3-US01: Estimation System
**Points**: 34 | **Sprint**: 7-8 | **Status**: NOT STARTED

**Description**: Create estimates/quotes for construction projects

**Acceptance Criteria**:
- [ ] Estimate builder with line items
- [ ] Material cost calculator
- [ ] Labor hour calculator
- [ ] Markup/margin settings
- [ ] PDF generation (branded)
- [ ] Email/WhatsApp sending
- [ ] Client acceptance tracking
- [ ] Convert accepted estimate to project

**Database Tables**:
```
- estimates
- estimate_items
- estimate_templates
- material_prices
```

---

### E3-US02: Project Management
**Points**: 34 | **Sprint**: 8-9 | **Status**: NOT STARTED

**Description**: Track construction projects from start to finish

**Acceptance Criteria**:
- [ ] Project creation from estimate
- [ ] Phase/milestone breakdown
- [ ] Task assignment to workers
- [ ] Progress tracking (percentage)
- [ ] Photo documentation per phase
- [ ] Daily log entries
- [ ] Budget vs. actual tracking

---

### E3-US03: Crew/Worker Management
**Points**: 21 | **Sprint**: 9 | **Status**: NOT STARTED

**Description**: Manage construction crew and assignments

**Acceptance Criteria**:
- [ ] Worker profiles with skills
- [ ] Availability calendar
- [ ] Assignment to projects/tasks
- [ ] Time tracking per project
- [ ] Performance metrics
- [ ] Payroll integration

---

### E3-US04: Materials Tracking
**Points**: 21 | **Sprint**: 9-10 | **Status**: NOT STARTED

**Description**: Track materials per project

**Acceptance Criteria**:
- [ ] Bill of materials from estimate
- [ ] Purchase order creation
- [ ] Delivery tracking
- [ ] Usage recording
- [ ] Waste tracking
- [ ] Cost variance reporting

---

### E3-US05: Supplier Management
**Points**: 13 | **Sprint**: 10 | **Status**: NOT STARTED

**Description**: Manage supplier relationships

**Acceptance Criteria**:
- [ ] Supplier database
- [ ] Payment terms tracking
- [ ] Purchase history
- [ ] Price comparison
- [ ] Credit limit tracking

---

### E3-US06: Service Calls (Electrical)
**Points**: 21 | **Sprint**: 10-11 | **Status**: NOT STARTED

**Description**: Service request management for electrical contractors

**Acceptance Criteria**:
- [ ] Service request intake
- [ ] Technician assignment
- [ ] Dispatch optimization
- [ ] Parts tracking per call
- [ ] Customer notifications
- [ ] Invoice generation on completion

---

### E3-US07: ANRE Certification Tracking
**Points**: 13 | **Sprint**: 11 | **Status**: NOT STARTED

**Description**: Track electrical certifications and compliance

**Acceptance Criteria**:
- [ ] ANRE grade tracking (A, B, C)
- [ ] Expiry date alerts
- [ ] Renewal process guidance
- [ ] Certification document storage
- [ ] Employee certification matrix

---

### E3-US08: Permit Management
**Points**: 13 | **Sprint**: 11 | **Status**: NOT STARTED

**Description**: Track permits and inspections

**Acceptance Criteria**:
- [ ] Permit requirement lookup
- [ ] Application tracking
- [ ] Inspection scheduling
- [ ] Result recording
- [ ] Document storage

---

### E3-US09: Project Profitability Dashboard
**Points**: 13 | **Sprint**: 12 | **Status**: NOT STARTED

**Description**: Real-time project financial tracking

**Acceptance Criteria**:
- [ ] Revenue vs. costs per project
- [ ] Margin percentage
- [ ] Cost breakdown by category
- [ ] Comparison to estimate
- [ ] Trend analysis

---

# EPIC 4: DELIVERY/LOGISTICS MODULE
**Priority**: P2 - Medium
**Total Points**: 140
**Dependencies**: E1, E2

## User Stories

### E4-US01: Route Planning
**Points**: 34 | **Sprint**: 13-14 | **Status**: NOT STARTED

**Description**: Optimize delivery routes for efficiency

**Acceptance Criteria**:
- [ ] Import delivery addresses
- [ ] Route optimization algorithm
- [ ] Multiple routes per day
- [ ] Time window constraints
- [ ] Vehicle capacity constraints
- [ ] Manual route adjustments
- [ ] Route export to navigation apps

**Integration Options**:
```
- Google Maps Platform
- OpenRouteService (open source)
- OSRM (self-hosted)
```

---

### E4-US02: Driver Mobile App
**Points**: 34 | **Sprint**: 14-15 | **Status**: NOT STARTED

**Description**: Mobile app for drivers (PWA)

**Acceptance Criteria**:
- [ ] Today's route view
- [ ] Turn-by-turn navigation link
- [ ] Delivery confirmation
- [ ] Photo proof of delivery
- [ ] Digital signature capture
- [ ] Failed delivery handling
- [ ] Offline capability

---

### E4-US03: Fleet Management
**Points**: 21 | **Sprint**: 15-16 | **Status**: NOT STARTED

**Description**: Manage delivery vehicles

**Acceptance Criteria**:
- [ ] Vehicle database
- [ ] Maintenance scheduling
- [ ] ITP/Insurance expiry tracking
- [ ] Fuel consumption tracking
- [ ] Cost per vehicle reporting

---

### E4-US04: Package Tracking
**Points**: 21 | **Sprint**: 16 | **Status**: NOT STARTED

**Description**: Track packages through delivery lifecycle

**Acceptance Criteria**:
- [ ] Package creation/import
- [ ] Status tracking
- [ ] Customer tracking link
- [ ] Delivery notifications
- [ ] Exception handling

---

### E4-US05: Driver Performance
**Points**: 13 | **Sprint**: 17 | **Status**: NOT STARTED

**Description**: Track and gamify driver performance

**Acceptance Criteria**:
- [ ] Deliveries per hour
- [ ] Fuel efficiency
- [ ] Customer ratings
- [ ] On-time percentage
- [ ] Leaderboard

---

### E4-US06: Customer Delivery Portal
**Points**: 13 | **Sprint**: 17 | **Status**: NOT STARTED

**Description**: Customer-facing delivery tracking

**Acceptance Criteria**:
- [ ] Track my package page
- [ ] ETA updates
- [ ] Reschedule delivery
- [ ] Delivery preferences
- [ ] Feedback submission

---

# EPIC 5: EU EXPANSION FRAMEWORK
**Priority**: P2 - Medium
**Total Points**: 100
**Dependencies**: E1, E2

## User Stories

### E5-US01: Multi-Currency System
**Points**: 21 | **Sprint**: 18 | **Status**: NOT STARTED

**Description**: Support multiple European currencies

**Acceptance Criteria**:
- [ ] EUR, RON, PLN, HUF, CZK, BGN support
- [ ] Real-time exchange rates (ECB)
- [ ] Currency on invoices
- [ ] Multi-currency reporting
- [ ] Default currency per company

---

### E5-US02: EU VAT Handling
**Points**: 21 | **Sprint**: 18-19 | **Status**: NOT STARTED

**Description**: Handle cross-border VAT scenarios

**Acceptance Criteria**:
- [ ] VIES VAT number validation
- [ ] Reverse charge automation
- [ ] OSS registration support
- [ ] Intrastat reporting prep
- [ ] VAT rate database per country

---

### E5-US03: German Market Localization
**Points**: 21 | **Sprint**: 19-20 | **Status**: NOT STARTED

**Description**: Prepare platform for German market

**Acceptance Criteria**:
- [ ] German translation (100%)
- [ ] XRechnung invoice format
- [ ] DATEV export compatibility
- [ ] German hosting option (GDPR++)
- [ ] DIN norm references

---

### E5-US04: Italian Market Localization
**Points**: 21 | **Sprint**: 20-21 | **Status**: NOT STARTED

**Description**: Prepare platform for Italian market

**Acceptance Criteria**:
- [ ] Italian translation (100%)
- [ ] SDI e-invoicing integration
- [ ] Codice Fiscale validation
- [ ] PEC email support
- [ ] Italian invoice templates

---

### E5-US05: Spanish Market Localization
**Points**: 13 | **Sprint**: 21 | **Status**: NOT STARTED

**Description**: Prepare platform for Spanish market

**Acceptance Criteria**:
- [ ] Spanish translation (100%)
- [ ] NIF validation
- [ ] Bizum payment integration
- [ ] Spanish invoice templates

---

# EPIC 6: MOBILE EXPERIENCE
**Priority**: P3 - Low
**Total Points**: 80
**Dependencies**: E1-E5

## User Stories

### E6-US01: Progressive Web App
**Points**: 21 | **Sprint**: 22 | **Status**: NOT STARTED

**Description**: Convert platform to installable PWA

**Acceptance Criteria**:
- [ ] Service worker implementation
- [ ] Offline basic functionality
- [ ] Install prompts
- [ ] Push notifications
- [ ] App-like navigation

---

### E6-US02: Mobile-Optimized UI
**Points**: 34 | **Sprint**: 22-23 | **Status**: NOT STARTED

**Description**: Optimize all screens for mobile

**Acceptance Criteria**:
- [ ] Responsive design review
- [ ] Touch-friendly interactions
- [ ] Mobile navigation pattern
- [ ] Fast load times (<3s)
- [ ] Thumb-zone optimization

---

### E6-US03: Voice Input (Romanian)
**Points**: 13 | **Sprint**: 24 | **Status**: NOT STARTED

**Description**: Voice input for patriarch-friendly interface

**Acceptance Criteria**:
- [ ] Romanian speech recognition
- [ ] Voice notes on projects
- [ ] Voice-to-text for descriptions
- [ ] Voice commands for navigation

---

### E6-US04: Camera Integration
**Points**: 13 | **Sprint**: 24 | **Status**: NOT STARTED

**Description**: Enhanced camera features

**Acceptance Criteria**:
- [ ] Receipt scanning
- [ ] Document scanning
- [ ] Progress photo capture
- [ ] Barcode/QR scanning

---

# EPIC 7: AI/ML ENHANCEMENTS
**Priority**: P3 - Low
**Total Points**: 80
**Dependencies**: E1-E5, sufficient data

## User Stories

### E7-US01: Smart Categorization
**Points**: 13 | **Sprint**: 25 | **Status**: NOT STARTED

**Description**: AI-powered expense categorization

**Acceptance Criteria**:
- [ ] Learn from user corrections
- [ ] Suggest categories
- [ ] Improve over time
- [ ] Multi-language support

---

### E7-US02: Cash Flow Prediction
**Points**: 21 | **Sprint**: 25-26 | **Status**: NOT STARTED

**Description**: Predict future cash flow

**Acceptance Criteria**:
- [ ] 30/60/90 day forecast
- [ ] Confidence intervals
- [ ] Scenario modeling
- [ ] Alert thresholds

---

### E7-US03: Photo-to-Estimate
**Points**: 21 | **Sprint**: 26 | **Status**: NOT STARTED

**Description**: AI analysis of site photos for estimates

**Acceptance Criteria**:
- [ ] Room measurement from photos
- [ ] Material identification
- [ ] Scope suggestion
- [ ] Integration with estimate builder

---

### E7-US04: Customer Payment Prediction
**Points**: 13 | **Sprint**: 27 | **Status**: NOT STARTED

**Description**: Predict when invoices will be paid

**Acceptance Criteria**:
- [ ] Historical payment patterns
- [ ] Customer scoring
- [ ] Collection recommendations

---

### E7-US05: EU Fund Matching
**Points**: 13 | **Sprint**: 27 | **Status**: NOT STARTED

**Description**: Match businesses to EU funding opportunities

**Acceptance Criteria**:
- [ ] Fund database maintenance
- [ ] Eligibility checking
- [ ] Application guidance
- [ ] Deadline tracking

---

# SPRINT PLANNING

## Sprint Overview (2-week sprints)

| Sprint | Focus | Story Points | Key Deliverables |
|--------|-------|--------------|------------------|
| **1** | Foundation | 40 | Database schema, i18n setup |
| **2** | Persona Core | 45 | Onboarding wizard, dashboard framework |
| **3** | Persona Complete | 35 | Navigation, feature toggles |
| **4** | Romanian Tax | 40 | Tax calculations, ANAF validation |
| **5** | e-Factura | 45 | Full e-Factura integration |
| **6** | Banking | 40 | Bank integration, WhatsApp |
| **7** | Estimates | 40 | Estimate builder, templates |
| **8** | Projects Start | 35 | Project management core |
| **9** | Projects Complete | 40 | Crew, materials tracking |
| **10** | Service Calls | 40 | Supplier mgmt, service system |
| **11** | Compliance | 35 | ANRE, permits |
| **12** | Analytics | 30 | Profitability dashboards |
| **13-17** | Delivery Module | 120 | Full delivery system |
| **18-21** | EU Expansion | 80 | Multi-currency, DE/IT/ES |
| **22-24** | Mobile | 60 | PWA, voice, camera |
| **25-27** | AI Features | 65 | ML enhancements |

---

## Sprint 1-2 (COMPLETE - Persona System)

**Duration**: 4 weeks
**Points**: 80
**Focus**: Persona System Core
**Status**: COMPLETE (2025-11-29)

### Completed Stories
| ID | Story | Points | Status |
|----|-------|--------|--------|
| E1-US01 | Database Schema for Personas | 13 | COMPLETE |
| E1-US02 | Persona Selection Onboarding | 21 | COMPLETE |
| E1-US04 | Feature Toggle System | 21 | COMPLETE |
| E1-US07 | Multi-Language Foundation | 13 | COMPLETE |

### Deliverables
- [x] 12 business personas in database
- [x] Feature toggle system with 100+ features
- [x] Persona-feature mappings
- [x] Frontend hooks: useFeature, usePersonaAnalytics

---

## Sprint 3 (COMPLETE - Adaptive Dashboard)

**Duration**: 2 weeks
**Points**: 50
**Focus**: Adaptive UI
**Status**: COMPLETE (2025-11-30)

### Completed Stories
| ID | Story | Points | Status |
|----|-------|--------|--------|
| E1-US03 | Adaptive Dashboard Framework | 34 | COMPLETE |
| E1-US05 | Persona-Specific Navigation | 13 | COMPLETE |
| E1-US06 | Analytics Dashboard | 8 | COMPLETE |

### Deliverables
- [x] Adaptive dashboard with persona layouts
- [x] Dynamic navigation system
- [x] Persona analytics dashboard (admin)
- [x] Frontend hooks: useDashboard, useNavigation

---

## Sprint 4 (COMPLETE - Romanian Market)

**Duration**: 2 weeks
**Points**: 71
**Focus**: Romanian Tax & e-Factura
**Status**: COMPLETE (2025-11-30)

### Completed Stories
| ID | Story | Points | Status |
|----|-------|--------|--------|
| E2-US02 | Romanian Tax Calculations | 21 | COMPLETE |
| E2-US06 | Romanian Calendar & Holidays | 8 | COMPLETE |
| E2-US07 | ANAF CUI/CIF Validation | 8 | COMPLETE |
| E2-US01 | e-Factura XML Generation (Part 1) | 34 | COMPLETE |

### Deliverables
- [x] Romanian tax calculation API (salary, PFA, micro, profit, dividend, VAT)
- [x] Romanian calendar with holidays and fiscal deadlines
- [x] Business days calculator
- [x] CUI/CIF validation with checksum verification
- [x] e-Factura UBL 2.1 XML generation (CIUS-RO compliant)
- [x] ANAF API integration (submit, check status)
- [x] Frontend hooks: useRomanianTax, useRomanianCalendar, useCUIValidation, useEFactura

### API Test Results (15/15 PASSED)
```
[1/15] Tax Rates API: PASS
[2/15] Salary Tax Calculation: PASS (5000 gross -> 2940 net)
[3/15] PFA Tax Calculation: PASS (100k income, 30k expenses -> 38500 net)
[4/15] Micro Enterprise Tax: PASS (1% on 50000 = 500 RON)
[5/15] Corporate Profit Tax: PASS (16% on 40k profit = 6400 RON)
[6/15] Dividend Tax: PASS (8% on 10000 = 800 RON)
[7/15] VAT Calculation: PASS (19% on 1000 = 190 RON)
[8/15] Tax Regime Comparison: PASS (Recommendation: micro)
[9/15] Romanian Holidays 2025: PASS (5 holidays)
[10/15] Fiscal Deadlines Jan 2025: PASS (6 deadlines)
[11/15] Business Days Count: PASS (20 business days in Jan 2025)
[12/15] Calendar Month View: PASS
[13/15] CUI Validation: PASS
[14/15] Invalid CUI Detection: PASS
[15/15] e-Factura Code Lists: PASS
```

---

## Sprint 5 (NEXT SPRINT)

**Duration**: 2 weeks
**Points**: ~40
**Focus**: Romanian Invoice Templates & Bank Integration

### Planned Stories
| ID | Story | Points | Status |
|----|-------|--------|--------|
| E2-US08 | Romanian Invoice Templates | 13 | PLANNED |
| E2-US03 | Romanian Bank Integration | 21 | PLANNED |
| E2-US04 | Enhanced ANAF Sync | 8 | PLANNED |

### Definition of Done
- [ ] Romanian invoice templates (chitanta, factura fiscala)
- [ ] Bank statement import (CSV, OFX)
- [ ] Bank account reconciliation
- [ ] ANAF OAuth flow complete
- [ ] Frontend integration complete
- [ ] Unit tests passing

---

# BACKLOG PRIORITIZATION

## P0 - Critical (Must Have for Launch)
- E1: Persona System Core (All stories)
- E2-US01: e-Factura Integration
- E2-US02: Romanian Tax Calculations
- E2-US07: ANAF Validation
- E2-US08: Romanian Invoice Templates

## P1 - High (Need for Differentiation)
- E3-US01: Estimation System
- E3-US02: Project Management
- E3-US09: Project Profitability Dashboard
- E2-US03: Romanian Bank Integration

## P2 - Medium (Competitive Features)
- E3-US03-08: Full Construction Module
- E4: Full Delivery Module
- E5-US01-02: Multi-Currency & EU VAT

## P3 - Low (Nice to Have)
- E6: Mobile Enhancements
- E7: AI/ML Features
- E5-US03-05: German/Italian/Spanish Markets

---

# DEPENDENCIES MAP

```
E1 (Persona Core)
├── E2 (Romanian Features)
│   ├── E3 (Construction) ─── E7 (AI)
│   └── E4 (Delivery)
└── E5 (EU Expansion)
    └── E6 (Mobile)
```

---

# RISK REGISTER

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| e-Factura API changes | HIGH | MEDIUM | Monitor ANAF announcements, flexible integration |
| Bank API access denied | MEDIUM | MEDIUM | Multiple aggregator options, fallback to import |
| Route optimization complexity | MEDIUM | LOW | Use proven libraries (OR-Tools, Google) |
| Multi-language content quality | LOW | MEDIUM | Professional translation for key markets |
| EU expansion regulations | MEDIUM | LOW | Country-by-country research before launch |

---

# TEAM REQUIREMENTS

## Minimum Viable Team
- 1 Full-stack Developer (60% backend, 40% frontend)
- 1 Frontend Developer
- 0.5 DevOps (can be outsourced)

## Ideal Team
- 2 Backend Developers
- 2 Frontend Developers
- 1 DevOps
- 1 QA Engineer
- 1 Product Manager

---

# METRICS & KPIs

## Development Metrics
- Sprint velocity (target: 35-45 points)
- Bug escape rate (<5%)
- Code coverage (>80%)
- Deployment frequency (weekly)

## Business Metrics (Post-Launch)
- User signups per persona
- Feature adoption rate
- Customer satisfaction (NPS)
- Monthly recurring revenue
- Churn rate

---

# QUICK REFERENCE: WHAT'S NEXT

## If Starting Fresh
1. Run database migrations (E1-US01)
2. Implement i18n framework (E1-US07)
3. Build persona selection UI (E1-US02)

## If Continuing Work
Check this document's Sprint section for current sprint stories.

## Current Blockers
- None (ready to start Sprint 1)

---

*Document maintained by: Project Team*
*Next review: After Sprint 2 completion*
*Version: 1.0*

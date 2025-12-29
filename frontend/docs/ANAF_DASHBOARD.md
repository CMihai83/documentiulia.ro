# ANAF Unified Dashboard - Technical Documentation

## Overview

The ANAF Unified Dashboard is a comprehensive Romanian tax compliance interface that consolidates 100+ backend endpoints across 8 controllers into a single, user-friendly dashboard. Built with Next.js 15, TypeScript, and shadcn/ui.

**Location**: `/app/[locale]/dashboard/compliance/anaf-status/page.tsx`

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18
- **Language**: TypeScript (strict mode)
- **UI Components**: shadcn/ui, Radix UI primitives
- **Icons**: Lucide React
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useEffect)
- **API Integration**: Axios via centralized API client

### Directory Structure
```
/app/[locale]/dashboard/compliance/anaf-status/
└── page.tsx                              # Main dashboard page

/components/dashboard/anaf/
├── accessible-badge.tsx                  # Accessible status badges with ARIA
├── anaf-header.tsx                       # Dashboard header with SPV status
├── deadlines-tab.tsx                     # Deadline tracking & calendar
├── efactura-tab.tsx                      # e-Factura B2B/B2C management
├── error-state.tsx                       # Error & empty state components
├── etransport-tab.tsx                    # Transport declarations (OUG 41/2022)
├── history-tab.tsx                       # Unified submission log
├── keyboard-shortcuts.tsx                # Keyboard navigation helper
├── loading-skeleton.tsx                  # Loading state skeletons
├── messages-tab.tsx                      # SPV notifications feed
├── overview-tab.tsx                      # Executive dashboard
├── saft-d406-tab.tsx                     # SAF-T D406 monthly reports
└── spv-connection-widget.tsx             # SPV OAuth2 connection widget

/lib/anaf/
├── api-client.ts                         # Axios instance with auth & rate limiting
├── services.ts                           # Service layer for 100+ endpoints
├── types.ts                              # TypeScript interfaces (40+ types)
├── constants.ts                          # VAT rates, grace periods, enums
├── formatters.ts                         # Date/currency/status formatting
└── mocks/
    ├── index.ts                          # Barrel exports
    ├── deadlines.mock.ts                 # 10 deadline reminders
    ├── efactura.mock.ts                  # 5 B2B invoices
    ├── etransport.mock.ts                # 5 transport declarations
    ├── messages.mock.ts                  # 15 SPV messages
    ├── saft-d406.mock.ts                 # SAF-T dashboard & reports
    └── spv-status.mock.ts                # SPV connection status
```

---

## Features by Tab

### 1. Overview Tab (`overview-tab.tsx`)

**Purpose**: Executive dashboard with compliance score and quick actions.

**Key Features**:
- **SVG Circular Compliance Score Gauge**:
  - 0-100 scale with dynamic color coding (green/orange/red)
  - Calculated based on overdue deadlines, pending actions, submissions
  - Labels: Excellent (90-100), Good (70-89), Critical (0-69)
- **Urgent Deadlines Alert Banner**: Top 3 overdue/due soon with countdown
- **Statistics Cards**: Total submissions, monthly submissions, pending actions, unread messages
- **Quick Actions Grid**: 4 navigation cards linking to SAF-T D406, e-Factura, e-Transport, Deadlines
- **Recent Activity Feed**: Last 10 SPV submissions with status badges

**Mock Data**: `mockSpvDashboard`, `mockDeadlineReminders`, `mockSpvSubmissions`

**Accessibility**: Full ARIA labels, semantic HTML, keyboard navigation

---

### 2. SAF-T D406 Tab (`saft-d406-tab.tsx`)

**Purpose**: Monthly SAF-T D406 reporting workflow per Order 1783/2021.

**Key Features**:
- **Period Selector**: Dropdown with last 24 months in Romanian format (e.g., "Ianuarie 2025")
- **Grace Period Banner**: Pilot grace period alert (Sept 2025 - Aug 2026, 6-month grace)
- **Pre-Submission Checklist**: 7 validation items with status indicators (ok/warning/error)
- **4 Action Buttons**:
  - Generate XML (with loading state)
  - Preview XML (modal with syntax highlighting)
  - Download XML (saves to local)
  - Submit to ANAF SPV (with confirmation)
- **Compliance Status Card**: Current period, status badge, days remaining, submission statistics
- **Recent Reports List**: Last 5 reports with status, date, file size

**Mock Data**: `mockSaftD406Dashboard`, `mockSaftD406GenerationResult`, `mockSaftD406Checklist`

**Validation**: DUKIntegrator-ready XML generation, file size check (<500MB)

---

### 3. e-Factura Tab (`efactura-tab.tsx`)

**Purpose**: B2B and B2C invoice management with batch operations.

**Key Features**:
- **B2B/B2C Sub-Tabs**: Using shadcn Tabs component
- **B2B Sub-Tab**:
  - Invoice list with 5-column grid (number/date, partner, amount, status, actions)
  - Batch selection with checkboxes (select all draft invoices)
  - Multi-invoice submission with progress indication
  - Status badges: Draft, Submitted, Accepted, Rejected
  - XML generation and download per invoice
- **B2C Sub-Tab**: Coming soon message (B2C mandatory from Jan 2025, 10-year retention)
- **Filters**: By status (Draft/Submitted/Accepted/Rejected), date, partner name

**Mock Data**: `mockEfacturaB2BInvoices` (5 invoices), `mockEfacturaB2BDashboard`

**Batch Operations**: Select all, batch submit, progress tracking

---

### 4. e-Transport Tab (`etransport-tab.tsx`)

**Purpose**: Transport declarations per OUG 41/2022 with UIT management.

**Key Features**:
- **Information Banner**: UIT (Unități de Identificare a Transportului) explanation
- **Statistics Dashboard**: Total (47), Active (3), Completed (38), Cancelled (6)
- **Category Breakdown**: 8 goods categories (Electronics: 10, Building Materials: 12, etc.)
- **Filters**: By status (Draft/Approved/In Transit/Completed/Cancelled), type (National/Import/Export/Intra-EU)
- **Transport List**: Full details for each declaration:
  - Sender/Receiver info (CUI, name, city)
  - Transport details (vehicle registration, driver, route, distance)
  - Goods summary (description, quantity, value)
- **Lifecycle Management**:
  - Start Transport (for approved declarations)
  - Complete (for in-transit declarations)
  - Cancel (with reason prompt)
- **UIT Display**: Shows transport identification code (e.g., "UIT-2025-001-ABC123")

**Mock Data**: `mockTransportDeclarations` (5 declarations), `mockTransportStatistics`

**Transport Types**: NATIONAL (42), INTERNATIONAL_IMPORT (2), INTERNATIONAL_EXPORT (2), INTRA_EU (1)

---

### 5. Deadlines Tab (`deadlines-tab.tsx`)

**Purpose**: ANAF compliance deadlines with calendar view and reminders.

**Key Features**:
- **Statistics Dashboard**: Overdue (2), Due Soon (3), Upcoming (3), Completed (2)
- **Grouped Deadline Lists**:
  - **Overdue** (red background): Critical alert with "Depășit cu X zile"
  - **Due Soon** (orange background): Urgent deadlines within 7 days
  - **Upcoming** (white background): Future deadlines
  - **Completed** (green tint): Finished deadlines
- **Filters**: By type (SAF-T D406/VAT Return/e-Factura/e-Transport/Custom), status
- **Days Remaining Calculation**: Real-time countdown (e.g., "Astăzi", "Mâine", "În 5 zile")
- **Mark as Completed**: Button for each deadline with confirmation
- **Auto-Refresh**: Updates every 5 minutes to recalculate status

**Mock Data**: `mockDeadlineReminders` (10 deadlines), `mockDeadlineSummary`

**Deadline Types**: SAFT_D406, EFACTURA_B2B, EFACTURA_B2C, E_TRANSPORT, VAT_RETURN, CUSTOM

---

### 6. Messages Tab (`messages-tab.tsx`)

**Purpose**: SPV notification center with real-time polling.

**Key Features**:
- **Real-Time Polling**: Fetches new messages every 30 seconds
- **Filter Toggle**: All messages (15) / Unread only
- **Message Type Indicators**: Color-coded by severity
  - SUCCESS (green): Positive confirmations
  - WARNING (orange): Attention needed
  - ERROR (red): Critical issues
  - INFO (blue): General notifications
- **Visual Distinction for Unread**: Blue left border + "Nou" badge
- **Mark as Read**: Button per message (updates state)
- **Unread Count Badge**: Shows in filter toggle

**Mock Data**: `mockSpvMessages` (15 messages), `mockUnreadMessages`

**Polling Interval**: 30 seconds (cleans up on unmount)

---

### 7. History Tab (`history-tab.tsx`)

**Purpose**: Unified submission log with retry and export functionality.

**Key Features**:
- **Statistics Dashboard**: Total (5), Accepted (2), Pending (1), Errors (2)
- **Dual Filters**:
  - Type: All/SAFT/EFACTURA/E_TRANSPORT
  - Status: All/ACCEPTED/SUBMITTED/REJECTED/ERROR
- **Submission List**: 4-column grid
  - Type with icon (FileText for SAFT, Receipt for e-Factura, Truck for e-Transport)
  - Submission date/time (Romanian locale)
  - Status badge with color coding
  - Actions (Retry for failed, Download XML for all)
- **Retry Functionality**: Re-submit failed submissions with confirmation
- **XML Download**: Download submitted declaration XMLs
- **Reference Display**: Shows `uploadIndex` or `reference` from ANAF

**Mock Data**: `mockSpvSubmissions` (5 submissions across all types)

**Status Colors**: ACCEPTED (green), SUBMITTED (blue), PENDING (yellow), REJECTED/ERROR (red)

---

## Mock Data Integration

### Environment Variable
```env
NEXT_PUBLIC_USE_MOCK_ANAF=true
```

When `true`, all components use local mock data with realistic delays (300ms-2000ms to simulate network).

### Mock Data Switching Pattern
```typescript
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

const fetchData = async () => {
  try {
    setLoading(true);
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network
      setData(mockData);
    } else {
      const response = await apiService.getData();
      setData(response.data);
    }
  } catch (error) {
    console.error('Failed to fetch:', error);
    if (USE_MOCK) setData(mockData); // Fallback
  } finally {
    setLoading(false);
  }
};
```

### Connecting Real APIs
To switch to real ANAF backend:
1. Set `NEXT_PUBLIC_USE_MOCK_ANAF=false`
2. Ensure backend API is running on configured base URL
3. All service methods in `/lib/anaf/services.ts` will call real endpoints

---

## Accessibility Features (WCAG 2.1 AA Compliant)

### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dialogs
- **Shift + ?**: Show keyboard shortcuts helper
- **←/→**: Navigate between tabs (future enhancement)
- **Home/End**: Jump to top/bottom of page

### Screen Reader Support
- **ARIA Labels**: All buttons, tabs, and interactive elements have descriptive labels
  - Example: `aria-label="Secțiunea SAF-T D406"`
- **ARIA Roles**: Proper role attributes for custom components
  - TabsList: `role="tablist"`, `aria-label="Navigare secțiuni ANAF"`
  - TabPanel: `role="tabpanel"`, `aria-labelledby="tab-overview"`
- **Live Regions**: Status badges use `role="status"` for dynamic updates
- **Skip to Content**: Skip navigation link for screen readers
  - Visible on focus: `sr-only focus:not-sr-only`

### Visual Accessibility
- **Color Contrast**: All text meets 4.5:1 minimum ratio
- **Status Colors**: Not color-only (includes icons and text labels)
- **Focus Indicators**: Visible outline on keyboard focus
- **Loading States**: Spinner with `aria-label` for screen readers
- **Error Messages**: Clear, actionable Romanian text

### Semantic HTML
- Proper heading hierarchy (h1 → h2 → h3)
- Button elements for actions (not divs with onClick)
- Descriptive link text (no "click here")
- Form labels properly associated with inputs

---

## Performance Optimizations

### Loading States
- **Skeleton Loaders**: `loading-skeleton.tsx` provides 6 skeleton variants
- **Lazy Loading**: Tab content only renders when active
- **Debounced Filters**: Search/filter inputs use debounce (future enhancement)

### API Optimizations
- **Rate Limiting**: Max 10 requests/second to ANAF API
- **Exponential Backoff**: Retry failed requests with max 3 attempts
- **Request Queuing**: Prevents concurrent duplicate requests
- **Polling Cleanup**: All intervals cleared on component unmount

### Bundle Size
- **Code Splitting**: Each tab component lazy-loaded (future)
- **Tree Shaking**: Unused imports eliminated by Webpack
- **Icon Optimization**: Lucide React uses tree-shakeable icons

---

## Mobile Responsiveness

### Breakpoints (Tailwind)
- **Mobile**: < 768px (1 column layouts)
- **Tablet**: 768px - 1024px (2 column layouts)
- **Desktop**: > 1024px (3+ column layouts)

### Mobile Optimizations
- **Tab Labels**: Hidden on mobile, only icons visible (`hidden md:inline`)
- **Grid Layouts**: Collapse to single column on mobile
- **Touch Targets**: Minimum 44x44px for buttons
- **Horizontal Scroll**: Prevented with `overflow-x-hidden`

---

## Error Handling

### Error States
- **Network Errors**: `ErrorState` component with retry button
- **Empty States**: `EmptyState` component with helpful message
- **Loading Failures**: Fallback to mock data in dev mode
- **Validation Errors**: Inline error messages in Romanian

### Error Boundaries (Future)
- React Error Boundary wrapper for each tab
- Graceful degradation to error UI
- Error logging to monitoring service

---

## Testing Strategy (Phase 7)

### Unit Tests (Jest + React Testing Library)
- **Target Coverage**: 80%
- **Test Files**: `*.test.tsx` co-located with components
- **Mock Data**: Reuse existing mock files from `/lib/anaf/mocks/`

### Integration Tests
- Test tab switching and data flow
- Test filter and search functionality
- Test batch operations (e-Factura)
- Test retry and mark-as-read actions

### E2E Tests (Playwright)
- **Critical User Journeys**:
  1. Generate SAF-T D406 → Submit → Check Status
  2. Select multiple e-Factura invoices → Batch submit
  3. View deadlines → Mark as completed
  4. View messages → Mark as read
  5. View history → Retry failed submission

### Accessibility Tests
- Automated tests with axe-core
- Keyboard navigation tests
- Screen reader compatibility tests (NVDA, JAWS)

---

## Deployment Checklist

### Environment Variables
```env
# Required
NEXT_PUBLIC_USE_MOCK_ANAF=false
NEXT_PUBLIC_API_BASE_URL=https://api.documentiulia.ro
NEXT_PUBLIC_ANAF_SPV_URL=https://api.anaf.ro/spv

# Optional
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_API_TIMEOUT=30000
```

### Pre-Deployment
- [ ] Switch `NEXT_PUBLIC_USE_MOCK_ANAF=false`
- [ ] Test all 7 tabs with real API
- [ ] Verify SPV OAuth2 flow
- [ ] Test error handling with network failures
- [ ] Run Lighthouse audit (target: 90+ score)
- [ ] Test on mobile devices (iOS Safari, Chrome Android)
- [ ] Verify Romanian diacritics display correctly (ș, ț, ă, î, â)
- [ ] Check console for errors/warnings
- [ ] Verify all translations loaded

### Post-Deployment
- [ ] Monitor API error rates
- [ ] Check submission success rates
- [ ] Verify polling intervals (30s for messages, 5min for deadlines)
- [ ] Test SPV reconnection after token expiry
- [ ] Verify XML downloads work correctly

---

## Romanian Compliance

### ANAF Regulations
- **SAF-T D406**: Order 1783/2021 - Monthly submission, pilot grace Sept 2025-Aug 2026
- **e-Factura B2B**: OUG 120/2021 - Mandatory since Jan 1, 2024
- **e-Factura B2C**: Legea 296/2023 - Mandatory from Jan 2025, 10-year retention
- **e-Transport**: OUG 41/2022 - UIT required before transport start
- **VAT Rates**: Legea 141/2025 - 21% standard, 11% reduced (effective Aug 2025)

### Data Retention
- **Audit Logs**: 10+ years per Romanian tax law
- **Invoices**: 10 years minimum
- **SAF-T Reports**: 5 years recommended
- **Transport Declarations**: 5 years

### GDPR Compliance
- No PII stored in frontend (only CUI, company names)
- Session tokens in httpOnly cookies
- No analytics tracking without consent
- User can export/delete data via backend API

---

## Troubleshooting

### Common Issues

**Problem**: "Failed to fetch data" errors
- **Solution**: Check `NEXT_PUBLIC_API_BASE_URL` is correct
- **Solution**: Verify backend is running and accessible
- **Solution**: Check CORS headers if calling from different domain

**Problem**: Tabs not switching
- **Solution**: Check browser console for React errors
- **Solution**: Verify all tab components imported correctly
- **Solution**: Clear browser cache and hard refresh

**Problem**: Mock data not loading
- **Solution**: Check `NEXT_PUBLIC_USE_MOCK_ANAF=true` in `.env.local`
- **Solution**: Restart Next.js dev server after env change
- **Solution**: Verify mock files exist in `/lib/anaf/mocks/`

**Problem**: Keyboard shortcuts not working
- **Solution**: Click inside the page to give it focus
- **Solution**: Check for conflicting browser extensions
- **Solution**: Try pressing Shift + ? to show shortcuts modal

**Problem**: Romanian characters not displaying
- **Solution**: Verify UTF-8 encoding in all files
- **Solution**: Check font supports Romanian diacritics
- **Solution**: Ensure `lang="ro"` in HTML tag

---

## Future Enhancements

### Phase 8 (Future)
- **Real-time WebSocket Updates**: Replace polling with WebSocket for messages/deadlines
- **Offline Support**: Service Worker for offline viewing
- **CSV/PDF Export**: Export history and reports to CSV/PDF
- **Advanced Filtering**: Date range pickers, multi-select filters
- **Analytics Dashboard**: Trends, processing time charts
- **Email/SMS Reminders**: Automated deadline notifications
- **Bulk Import**: Upload invoices from Excel/CSV
- **Custom Reminders**: User-defined deadline reminders
- **Collaboration**: Multi-user access with role-based permissions
- **AI Anomaly Detection**: Flag unusual submission patterns

### Technical Debt
- Migrate to React Query for better caching
- Add Zod schema validation for API responses
- Implement virtual scrolling for large lists
- Add Storybook for component documentation
- Set up Chromatic for visual regression testing

---

## Support & Maintenance

### Documentation
- **API Docs**: `/docs/api/ANAF_API.md` (backend endpoints)
- **Component Docs**: Inline JSDoc comments
- **Type Definitions**: `/lib/anaf/types.ts` (40+ interfaces)

### Monitoring
- **Error Logging**: Sentry integration (future)
- **Performance**: Lighthouse CI in GitHub Actions
- **Uptime**: ANAF API status page

### Contact
- **Technical Issues**: GitHub Issues
- **ANAF API Questions**: ANAF support portal
- **Feature Requests**: Product roadmap discussions

---

## Changelog

### v1.0.0 (2025-01-27)
- ✅ Initial release with all 7 tabs functional
- ✅ 100% mock data integration
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Keyboard navigation support
- ✅ Mobile responsive design
- ✅ Romanian language UI with proper diacritics
- ✅ Loading skeletons and error states
- ✅ Real-time polling for messages (30s)
- ✅ Batch operations for e-Factura
- ✅ Lifecycle management for e-Transport
- ✅ Compliance score gauge
- ✅ Urgent deadlines alerting

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0
**Maintainer**: DocumentIulia.ro Development Team

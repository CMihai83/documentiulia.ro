# Fraud Detection System - Setup Instructions

## Overview
A comprehensive fraud detection alerts system has been created for DocumentIulia.ro to monitor and prevent fraudulent transactions.

## Backend Components Created

### Location: `/root/documentiulia.ro/backend/src/fraud-detection/`

1. **fraud-detection.dto.ts** - Data Transfer Objects
   - `FraudAlertDto` - Main alert structure
   - `CreateFraudAlertDto` - Create new alert
   - `UpdateFraudAlertDto` - Update alert status
   - `FraudDetectionRulesDto` - Detection rules configuration
   - `TransactionAnalysisDto` - Transaction analysis input
   - `FraudDashboardStatsDto` - Dashboard statistics
   - Enums: `FraudAlertSeverity`, `FraudAlertStatus`, `FraudAlertType`

2. **fraud-rules.ts** - Configurable fraud detection rules
   - `FraudRule` interface and conditions
   - `DEFAULT_FRAUD_RULES` - 11 pre-configured rules
   - `FraudRulesEngine` - Rule evaluation engine
   - Risk scoring functions and severity thresholds

3. **fraud-detection.service.ts** - Core detection service
   - `analyzeTransaction()` - Main analysis method
   - Detection methods for all fraud types:
     - Unusual amounts (statistical analysis)
     - Duplicate invoices
     - Rapid succession transactions
     - Vendor anomalies
     - Geographic inconsistencies
     - Suspicious timing (weekends, after-hours)
     - Velocity anomalies
   - Alert management (create, update, get)
   - Dashboard statistics generation

4. **fraud-detection.controller.ts** - REST API endpoints
   - `POST /fraud-detection/analyze` - Analyze transaction
   - `GET /fraud-detection/alerts` - Get user alerts
   - `GET /fraud-detection/alerts/:id` - Get specific alert
   - `PUT /fraud-detection/alerts/:id` - Update alert status
   - `GET /fraud-detection/dashboard/stats` - Get dashboard stats
   - `GET /fraud-detection/rules` - Get detection rules
   - `PUT /fraud-detection/rules` - Update detection rules
   - Action endpoints: mark false positive, confirm, resolve

5. **fraud-detection.module.ts** - NestJS module
   - Imports: PrismaModule, NotificationsModule
   - Exports: FraudDetectionService

## Frontend Components Created

### Location: `/root/documentiulia.ro/frontend/components/alerts/`

1. **FraudAlertBanner.tsx** - High-priority alert banner
   - Displays critical/high severity alerts
   - Color-coded by severity
   - Dismissible with animations
   - Click to view details

2. **FraudAlertsList.tsx** - Alert management list
   - Filterable by severity, status, search
   - Sortable columns
   - Status indicators with icons
   - Risk score badges
   - Opens detail modal on click

3. **FraudAlertDetail.tsx** - Detailed alert view modal
   - Full alert information display
   - Risk score visualization
   - Metadata and additional info
   - Action buttons for status updates:
     - Mark as investigating
     - Mark as false positive
     - Confirm fraud
     - Resolve with notes

4. **RiskScoreIndicator.tsx** - Visual risk score components
   - `RiskScoreIndicator` - Circular score display
   - `RiskScoreProgress` - Progress bar display
   - Color-coded by risk level
   - Animated for critical scores
   - Trend indicators

### Dashboard Page: `/root/documentiulia.ro/frontend/app/[locale]/dashboard/security/fraud/page.tsx`

Features:
- Overview statistics (total, critical, pending, resolved)
- Average risk score display
- Risk trend chart (7 days)
- Alert distribution charts (by type, by severity)
- Recent alerts list with filtering
- Configuration panel for detection rules
- Export report functionality
- Critical alert banners at top

## Translations Added

### Files Updated:
- `/root/documentiulia.ro/frontend/messages/en.json`
- `/root/documentiulia.ro/frontend/messages/ro.json`

Translation keys added under `fraudDetection`:
- UI labels and titles
- Severity levels (low, medium, high, critical)
- Status types (pending, investigating, false_positive, confirmed, resolved)
- Risk levels
- Alert types (11 types)
- Action buttons and messages

## MANUAL STEP REQUIRED: Register Module in app.module.ts

**File:** `/root/documentiulia.ro/backend/src/app.module.ts`

### Step 1: Add Import
Add this line after line 82 (after I18nModule import):
```typescript
import { FraudDetectionModule } from './fraud-detection/fraud-detection.module';
```

### Step 2: Add to Imports Array
Add this line in the imports array after line 177 (after I18nModule):
```typescript
    FraudDetectionModule,
```

The section should look like:
```typescript
    BudgetManagementModule,
    VendorManagementModule,
    I18nModule,
    FraudDetectionModule,  // <-- Add this line
  ],
  providers: [
```

## Fraud Detection Features

### Alert Types Detected:
1. **UNUSUAL_AMOUNT** - Transactions significantly above user average (3+ std deviations)
2. **DUPLICATE_INVOICE** - Similar transactions within 24-hour window
3. **RAPID_SUCCESSION** - Multiple transactions within 5 minutes
4. **VENDOR_ANOMALY** - New vendors with large transactions (>10,000 RON, <7 days old)
5. **GEOGRAPHIC_INCONSISTENCY** - Impossible location changes
6. **WEEKEND_ACTIVITY** - Unusual weekend transactions
7. **AFTER_HOURS** - Transactions outside 8AM-6PM
8. **AMOUNT_ROUNDING** - Suspiciously round amounts
9. **SPLIT_TRANSACTION** - Pattern of splitting large amounts
10. **VELOCITY_ANOMALY** - 2x+ increase in transaction frequency
11. **UNUSUAL_VENDOR** - Blocked or high-risk vendors

### Risk Scoring:
- **0-30**: Low risk (blue)
- **30-50**: Medium risk (yellow)
- **50-70**: High risk (orange)
- **70-85**: Very high risk (orange)
- **85-100**: Critical risk (red)

### Notifications:
- High and critical alerts trigger email notifications
- Uses existing NotificationsService
- Type: COMPLIANCE_ALERT
- Immediate action required

## Testing Checklist

- [ ] Backend module registered in app.module.ts
- [ ] API endpoints accessible at `/fraud-detection/*`
- [ ] Service can analyze transactions
- [ ] Alerts are created and stored in database
- [ ] Notifications sent for high/critical alerts
- [ ] Dashboard page accessible at `/dashboard/security/fraud`
- [ ] Alerts display correctly with filtering
- [ ] Alert detail modal opens and functions
- [ ] Status updates work (investigating, false positive, resolved)
- [ ] Risk score indicators display correctly
- [ ] Charts render with data
- [ ] Translations work in both RO and EN
- [ ] Rules configuration can be updated

## Integration Points

1. **Database**: Uses Prisma `auditLog` table for storing alerts
2. **Notifications**: Integrates with NotificationsModule for email alerts
3. **Auth**: Controller expects `req.user.userId` from authentication
4. **Translations**: Uses next-intl with `fraudDetection` namespace

## API Usage Example

```typescript
// Analyze a transaction
const result = await fetch('/api/fraud-detection/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: 'TXN-123',
    userId: 'user-id',
    amount: 125000,
    currency: 'RON',
    vendorName: 'Tech Solutions SRL',
    timestamp: new Date(),
    metadata: {}
  })
});

// Get dashboard stats
const stats = await fetch('/api/fraud-detection/dashboard/stats');

// Update alert status
await fetch('/api/fraud-detection/alerts/alert-id', {
  method: 'PUT',
  body: JSON.stringify({
    status: 'FALSE_POSITIVE',
    resolution: 'Confirmed legitimate transaction'
  })
});
```

## Future Enhancements

- Machine learning model integration for improved detection
- Real-time WebSocket alerts
- Advanced pattern recognition
- Integration with external fraud databases
- Automated response actions
- Detailed forensic reports
- User behavior profiling
- Multi-currency risk assessment
- Geolocation API integration for precise location tracking

---

**Created:** 2025-12-12
**Version:** 1.0.0
**Status:** Ready for deployment (pending app.module.ts update)

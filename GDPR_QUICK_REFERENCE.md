# GDPR DSR System - Quick Reference Card

## For Developers

### Import Components
```typescript
import {
  DataExportRequest,
  DataDeletionRequest,
  ConsentManager,
  PrivacyDashboard,
} from '@/components/gdpr';
```

### Use Components
```tsx
// In any page
<DataExportRequest userId={user.id} onSuccess={() => console.log('Done')} />
<DataDeletionRequest userId={user.id} userEmail={user.email} />
<ConsentManager userId={user.id} />
<PrivacyDashboard userId={user.id} />
```

### API Calls (Frontend)
```typescript
// Create DSR request
await fetch(`/api/gdpr/dsr-requests?userId=${userId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'DATA_EXPORT', // or DATA_DELETION, DATA_ACCESS, etc.
    reason: 'User reason here',
  }),
});

// Update consent
await fetch(`/api/gdpr/consents?userId=${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    purpose: 'ANALYTICS', // or MARKETING, PERSONALIZATION, etc.
    granted: false,
  }),
});

// Export data
window.location.href = `/api/gdpr/export?userId=${userId}`;
```

### Backend Service Methods
```typescript
// In NestJS controller/service
constructor(private gdprService: GdprService) {}

// Create DSR
await this.gdprService.createDsrRequest(userId, dto, ipAddress);

// Update DSR (admin only)
await this.gdprService.updateDsrRequest(requestId, dto, adminId);

// Get requests
await this.gdprService.getDsrRequests(userId, status);

// Update consent
await this.gdprService.updateConsent(userId, dto, ipAddress, userAgent);

// Export data
await this.gdprService.exportUserData(userId);

// Delete data
await this.gdprService.deleteUserData(userId);
```

## For Admins

### Access Admin Panel
Navigate to: `/dashboard/admin/gdpr`

### Process a Request
1. Click on the request
2. Review details
3. Add admin notes
4. Choose:
   - "Start Processing" (Pending → In Progress)
   - "Approve & Complete" (Complete the request)
   - "Reject" (with reason)

### Filter Requests
- **By Status**: Pending, In Progress, Completed, Rejected
- **By Type**: Export, Deletion, Access, Rectification
- **By Search**: Email, name, or reason

### SLA Reminder
GDPR requires response within **30 days** of request submission.

## For End Users

### Access Privacy Settings
Navigate to: `/dashboard/settings/privacy`

### Tabs Available
1. **Privacy Overview** - See what data we have
2. **Consent Management** - Control data usage
3. **Export Data** - Download your data
4. **Delete Account** - Request deletion

### Request Data Export
1. Go to "Export Data" tab
2. Enter reason
3. Choose:
   - "Request Export" (creates ticket for admin)
   - "Download Now" (immediate download)

### Delete Account
1. Go to "Delete Account" tab
2. Read warnings carefully
3. Provide reason
4. Confirm email address
5. Check understanding box
6. Submit request

### Manage Consents
1. Go to "Consent Management" tab
2. Toggle any optional consent
3. Changes save automatically

## Quick Links

### Pages
- User Privacy: `/dashboard/settings/privacy`
- Admin Panel: `/dashboard/admin/gdpr`
- Privacy Policy: `/privacy`
- GDPR Info: `/gdpr`

### API Endpoints
- Create DSR: `POST /api/gdpr/dsr-requests`
- List DSRs: `GET /api/gdpr/dsr-requests`
- Update DSR: `PATCH /api/gdpr/dsr-requests/:id`
- Consents: `GET/PUT /api/gdpr/consents`
- Export: `GET /api/gdpr/export`
- Inventory: `GET /api/gdpr/data-inventory`

## Data Types

### DsrType
- `DATA_EXPORT` - Request data export
- `DATA_DELETION` - Request account deletion
- `DATA_ACCESS` - Request data access
- `DATA_RECTIFICATION` - Request data correction
- `CONSENT_WITHDRAWAL` - Withdraw consent

### DsrStatus
- `PENDING` - Awaiting review
- `IN_PROGRESS` - Being processed
- `APPROVED` - Approved (auto-transitions)
- `COMPLETED` - Finished
- `REJECTED` - Denied (with reason)

### ConsentPurpose
- `ESSENTIAL` - Required (always on)
- `ANALYTICS` - Usage analytics
- `MARKETING` - Email campaigns
- `PERSONALIZATION` - Custom experience
- `THIRD_PARTY_SHARING` - Integration data

## Common Scenarios

### Scenario 1: User wants their data
```
User → Export tab → Download Now → JSON file
```

### Scenario 2: User wants to leave
```
User → Delete tab → Confirmation → Admin reviews → Approved → Deleted
```

### Scenario 3: User opts out of marketing
```
User → Consents tab → Toggle MARKETING off → Saved
```

### Scenario 4: Admin processes deletion
```
Admin → GDPR panel → Filter Pending → Click request → Review → Approve
```

## Troubleshooting

### Issue: Can't create DSR request
**Check**: Is there already a pending request of the same type?

### Issue: Can't toggle consent
**Check**: Is it marked as "Essential"? Those can't be disabled.

### Issue: Export fails
**Check**: User must exist and have data in database.

### Issue: Admin panel empty
**Check**: User must have ADMIN role in database.

## Database Queries

### Find pending requests
```sql
SELECT * FROM "DsrRequest"
WHERE status = 'PENDING'
ORDER BY "createdAt" ASC;
```

### Check user consents
```sql
SELECT * FROM "Consent"
WHERE "userId" = 'USER_ID';
```

### Get overdue requests (>30 days)
```sql
SELECT * FROM "DsrRequest"
WHERE status IN ('PENDING', 'IN_PROGRESS')
AND "createdAt" < NOW() - INTERVAL '30 days';
```

## Environment Variables

### Required
```env
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## File Locations

### Backend
- Service: `/backend/src/gdpr/gdpr.service.ts`
- Controller: `/backend/src/gdpr/gdpr.controller.ts`
- DTOs: `/backend/src/gdpr/gdpr.dto.ts`

### Frontend
- Components: `/frontend/components/gdpr/`
- User Page: `/frontend/app/[locale]/dashboard/settings/privacy/page.tsx`
- Admin Page: `/frontend/app/[locale]/dashboard/admin/gdpr/page.tsx`
- API Routes: `/frontend/app/api/gdpr/`

### Database
- Migration: `/backend/prisma/migrations/add_gdpr_tables.sql`

## Support Contacts

- **Technical Issues**: dev@documentiulia.ro
- **GDPR Questions**: dpo@documentiulia.ro
- **User Support**: support@documentiulia.ro

## Key Metrics to Monitor

1. **Average Processing Time**: Should be < 30 days
2. **Pending Requests**: Should be reviewed daily
3. **Rejection Rate**: Should be low with good reasons
4. **Consent Opt-Out Rate**: Track trends
5. **Export Download Success Rate**: Should be near 100%

## Compliance Notes

- **30-day response**: GDPR Article 12(3)
- **Audit logging**: Required for accountability
- **IP tracking**: For consent proof
- **Legal retention**: Romanian law supersedes deletion
- **Data portability**: Must be machine-readable (JSON)

---

**Version**: 1.0.0
**Last Updated**: 2025-12-12
**Print this for your desk!** 📋

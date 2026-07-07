# GDPR DSR System - Setup Guide

## Quick Start

### 1. Database Migration

Run the Prisma migration to create the necessary tables:

```bash
cd /root/documentiulia.ro/backend

# Apply the migration
psql -U your_db_user -d documentiulia_db -f prisma/migrations/add_gdpr_tables.sql

# Or if using Prisma migrate
npx prisma migrate dev --name add-gdpr-tables
```

### 2. Backend Setup

The GDPR module is already integrated into the NestJS backend. Ensure the module is imported in `app.module.ts`:

```typescript
import { GdprModule } from './gdpr/gdpr.module';

@Module({
  imports: [
    // ... other modules
    GdprModule,
  ],
})
export class AppModule {}
```

### 3. Frontend Setup

No additional setup needed. The components and pages are ready to use.

### 4. Environment Variables

Ensure these are set in your `.env` files:

**Backend** (`/root/documentiulia.ro/backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/documentiulia_db"
JWT_SECRET="your-jwt-secret"
```

**Frontend** (`/root/documentiulia.ro/frontend/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Testing the Implementation

### 1. Test Backend Endpoints

Start the backend server:
```bash
cd /root/documentiulia.ro/backend
npm run start:dev
```

Test endpoints (replace `USER_ID` with actual user ID):

```bash
# Create a DSR request
curl -X POST "http://localhost:3001/api/gdpr/dsr-requests?userId=USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DATA_EXPORT",
    "reason": "I need my data for tax purposes"
  }'

# Get all DSR requests
curl "http://localhost:3001/api/gdpr/dsr-requests?userId=USER_ID"

# Update a consent
curl -X PUT "http://localhost:3001/api/gdpr/consents?userId=USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "ANALYTICS",
    "granted": false
  }'

# Export user data
curl "http://localhost:3001/api/gdpr/export?userId=USER_ID" -o export.json

# Get data inventory
curl "http://localhost:3001/api/gdpr/data-inventory?userId=USER_ID"
```

### 2. Test Frontend Pages

Start the frontend server:
```bash
cd /root/documentiulia.ro/frontend
npm run dev
```

Navigate to:
- **User Privacy Settings**: `http://localhost:3000/dashboard/settings/privacy`
- **Admin GDPR Management**: `http://localhost:3000/dashboard/admin/gdpr`

### 3. Test User Flows

#### A. Data Export Flow
1. Login as a user
2. Go to Dashboard > Settings > Privacy
3. Click "Export Data" tab
4. Fill in the reason field
5. Click "Request Export" or "Download Now"
6. Verify the DSR request is created or download starts

#### B. Data Deletion Flow
1. Go to "Delete Account" tab
2. Click "I want to delete my account"
3. Fill in:
   - Reason for deletion
   - Confirm email address
   - Check the understanding checkbox
4. Click "Delete My Account"
5. Verify DSR request is created

#### C. Consent Management Flow
1. Go to "Consent Management" tab
2. Toggle any non-essential consent
3. Verify the change is saved
4. Check the timestamp is updated

### 4. Test Admin Workflows

#### A. Review DSR Requests
1. Login as an admin
2. Go to Dashboard > Admin > GDPR
3. View the requests dashboard
4. Filter by status/type
5. Search for specific user

#### B. Process a Request
1. Click on a pending request
2. Review the details
3. Add admin notes
4. Choose action:
   - Start Processing (Pending → In Progress)
   - Approve & Complete
   - Reject (with reason)
5. Verify audit log is created

## File Structure

### Backend Files
```
/root/documentiulia.ro/backend/src/gdpr/
├── gdpr.module.ts          # NestJS module
├── gdpr.service.ts         # Service with business logic
├── gdpr.controller.ts      # REST API endpoints
├── gdpr.dto.ts             # Data transfer objects
└── retention.service.ts    # Existing retention service
```

### Frontend Files
```
/root/documentiulia.ro/frontend/
├── components/gdpr/
│   ├── DataExportRequest.tsx
│   ├── DataDeletionRequest.tsx
│   ├── ConsentManager.tsx
│   ├── PrivacyDashboard.tsx
│   └── index.ts
├── app/[locale]/dashboard/
│   ├── settings/privacy/page.tsx    # User privacy page
│   └── admin/gdpr/page.tsx          # Admin management page
└── app/api/gdpr/                    # API routes
    ├── dsr-requests/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── consents/route.ts
    ├── export/route.ts
    └── data-inventory/route.ts
```

## Database Schema

The migration creates two new tables:

### DsrRequest
- Stores all Data Subject Requests
- Tracks status from PENDING to COMPLETED/REJECTED
- Links to User table with CASCADE delete

### Consent
- Stores user consent preferences
- One record per user-purpose combination
- Tracks IP address and user agent for audit

## API Endpoints Reference

### User Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gdpr/dsr-requests` | POST | Create DSR request |
| `/api/gdpr/dsr-requests?userId=X` | GET | Get user's requests |
| `/api/gdpr/export?userId=X` | GET | Export user data |
| `/api/gdpr/consents?userId=X` | GET | Get user consents |
| `/api/gdpr/consents?userId=X` | PUT | Update consent |
| `/api/gdpr/data-inventory?userId=X` | GET | Get data inventory |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gdpr/dsr-requests` | GET | List all requests |
| `/api/gdpr/dsr-requests/:id` | GET | Get request details |
| `/api/gdpr/dsr-requests/:id` | PATCH | Update request status |

## Security Notes

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Admin endpoints check for ADMIN role
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Audit Logging**: All actions are logged with IP addresses
5. **Data Encryption**: Ensure HTTPS in production

## GDPR Compliance Checklist

Before going live, ensure:

- [ ] Database migration applied successfully
- [ ] Backend tests passing
- [ ] Frontend pages accessible
- [ ] Admin panel working
- [ ] Email notifications configured (future)
- [ ] DPO contact information updated
- [ ] Privacy policy updated
- [ ] GDPR information page created
- [ ] Staff trained on DSR processing
- [ ] 30-day response SLA monitoring in place

## Troubleshooting

### Issue: Database migration fails
**Solution**: Check PostgreSQL connection and ensure enums don't already exist. Drop them if needed:
```sql
DROP TYPE IF EXISTS "DsrType" CASCADE;
DROP TYPE IF EXISTS "DsrStatus" CASCADE;
DROP TYPE IF EXISTS "ConsentPurpose" CASCADE;
```

### Issue: Frontend can't connect to backend
**Solution**: Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly and backend is running.

### Issue: Admin panel shows "Access Denied"
**Solution**: Ensure user has `role: 'ADMIN'` in the database.

### Issue: Consent updates not persisting
**Solution**: Check unique constraint on `(userId, purpose)` in Consent table.

## Support

For implementation questions:
- Review `/root/documentiulia.ro/GDPR_IMPLEMENTATION.md`
- Check backend logs: `cd backend && npm run start:dev`
- Check frontend logs: `cd frontend && npm run dev`

## Next Steps

After setup:

1. **Configure Email Notifications**:
   - Send email when DSR status changes
   - Notify admins of new requests

2. **Add Metrics**:
   - Track DSR processing times
   - Monitor SLA compliance
   - Dashboard analytics

3. **Integrate with Existing Features**:
   - Link to user settings
   - Add to admin dashboard
   - Update navigation menus

4. **Documentation**:
   - Update user guide
   - Create admin handbook
   - Write API documentation

---

**Last Updated**: 2025-12-12
**Version**: 1.0.0

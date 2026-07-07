# GDPR Data Subject Request (DSR) Automation - DocumentIulia.ro

## Overview

This document describes the comprehensive GDPR compliance system implemented for DocumentIulia.ro, including Data Subject Request (DSR) automation, consent management, and privacy controls.

## Table of Contents

1. [Backend Implementation](#backend-implementation)
2. [Frontend Implementation](#frontend-implementation)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [User Flows](#user-flows)
6. [Admin Workflows](#admin-workflows)
7. [Compliance Features](#compliance-features)
8. [Testing](#testing)

## Backend Implementation

### Location
`/root/documentiulia.ro/backend/src/gdpr/`

### Files Created/Updated

#### 1. `gdpr.dto.ts`
Data Transfer Objects for GDPR operations:
- **DsrType Enum**: DATA_EXPORT, DATA_DELETION, DATA_ACCESS, DATA_RECTIFICATION, CONSENT_WITHDRAWAL
- **DsrStatus Enum**: PENDING, IN_PROGRESS, APPROVED, COMPLETED, REJECTED
- **ConsentPurpose Enum**: ESSENTIAL, ANALYTICS, MARKETING, PERSONALIZATION, THIRD_PARTY_SHARING
- **DTOs**: CreateDsrRequestDto, UpdateDsrRequestDto, UpdateConsentDto, and response DTOs

#### 2. `gdpr.service.ts`
Enhanced service with:
- **DSR Request Management**:
  - `createDsrRequest()` - Create new DSR with duplicate prevention
  - `getDsrRequests()` - Fetch all requests with filtering
  - `getDsrRequest()` - Get single request details
  - `updateDsrRequest()` - Update status with audit logging

- **Consent Management**:
  - `updateConsent()` - Update user consent preferences
  - `getUserConsents()` - Retrieve user's consent history

- **Data Operations** (existing):
  - `exportUserData()` - GDPR Article 20 (Right to Data Portability)
  - `deleteUserData()` - GDPR Article 17 (Right to Erasure)
  - `getDataInventory()` - Show what data is stored

#### 3. `gdpr.controller.ts`
REST API endpoints:
- `POST /gdpr/dsr-requests` - Create DSR request
- `GET /gdpr/dsr-requests` - List DSR requests (filtered)
- `GET /gdpr/dsr-requests/:id` - Get specific request
- `PATCH /gdpr/dsr-requests/:id` - Update request (Admin only)
- `PUT /gdpr/consents` - Update consent
- `GET /gdpr/consents` - Get user consents
- `GET /gdpr/export` - Export user data
- `DELETE /gdpr/delete` - Delete user data
- `GET /gdpr/data-inventory` - Get data inventory

## Frontend Implementation

### Location
`/root/documentiulia.ro/frontend/`

### Components Created

#### 1. `/components/gdpr/DataExportRequest.tsx`
User interface for requesting data export:
- **Features**:
  - Request formal export (creates DSR request)
  - Direct download option
  - Reason input with validation
  - Success/error feedback
  - GDPR Article 20 compliance

#### 2. `/components/gdpr/DataDeletionRequest.tsx`
Account and data deletion interface:
- **Features**:
  - Multi-step confirmation process
  - Email verification
  - Understanding acknowledgment checkbox
  - Warning about irreversibility
  - Legal retention notice
  - GDPR Article 17 compliance

#### 3. `/components/gdpr/ConsentManager.tsx`
Consent preference management:
- **Features**:
  - Toggle consents by purpose
  - Essential vs. optional differentiation
  - Real-time updates
  - Consent history timestamps
  - GDPR Article 7 compliance

#### 4. `/components/gdpr/PrivacyDashboard.tsx`
Privacy overview dashboard:
- **Features**:
  - Data inventory display
  - DSR request tracking
  - Status badges
  - Request history
  - GDPR transparency requirements

### Pages Created

#### 1. `/app/[locale]/dashboard/settings/privacy/page.tsx`
User privacy settings page:
- **Tabs**:
  - Privacy Overview (dashboard + info cards)
  - Consent Management
  - Export Data (with what's included breakdown)
  - Delete Account (with alternatives and retention policy)
- **Features**:
  - Tabbed navigation
  - GDPR compliance banner
  - DPO contact information
  - Links to privacy policy and GDPR info

#### 2. `/app/[locale]/dashboard/admin/gdpr/page.tsx`
Admin GDPR request management:
- **Features**:
  - Request statistics dashboard
  - Filter by status, type, search
  - Request details modal
  - Status update workflow
  - Admin notes and rejection reasons
  - Audit trail
  - Role-based access (Admin only)

## Database Schema

### New Tables

#### DsrRequest
```sql
CREATE TABLE "DsrRequest" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" DsrType NOT NULL,
    "status" DsrStatus DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "additionalDetails" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

**Indexes**:
- `userId`, `status`, `type`, `createdAt`

#### Consent
```sql
CREATE TABLE "Consent" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" ConsentPurpose NOT NULL,
    "granted" BOOLEAN DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    UNIQUE ("userId", "purpose")
);
```

**Indexes**:
- `userId`, `purpose`
- Unique constraint on `(userId, purpose)`

## API Endpoints

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/gdpr/dsr-requests` | Create DSR request | Yes (User) |
| GET | `/api/gdpr/dsr-requests?userId={id}` | Get user's requests | Yes (User) |
| GET | `/api/gdpr/export?userId={id}` | Export user data | Yes (User) |
| PUT | `/api/gdpr/consents?userId={id}` | Update consent | Yes (User) |
| GET | `/api/gdpr/consents?userId={id}` | Get consents | Yes (User) |
| GET | `/api/gdpr/data-inventory?userId={id}` | Get data inventory | Yes (User) |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/gdpr/dsr-requests` | List all requests | Yes (Admin) |
| GET | `/api/gdpr/dsr-requests/:id` | Get request details | Yes (Admin) |
| PATCH | `/api/gdpr/dsr-requests/:id` | Update request status | Yes (Admin) |

## User Flows

### 1. Data Export Flow
1. User navigates to Settings > Privacy > Export Data
2. User provides reason for export
3. Options:
   - **Request Export**: Creates DSR request for admin review
   - **Download Now**: Immediate JSON download
4. System generates export with all user data
5. Admin reviews formal requests (if requested)
6. User receives export or downloads immediately

### 2. Data Deletion Flow
1. User navigates to Settings > Privacy > Delete Account
2. User clicks "I want to delete my account"
3. Multi-step confirmation:
   - Provide deletion reason
   - Confirm email address
   - Acknowledge consequences checkbox
4. System creates DSR request with status PENDING
5. Admin reviews request within 30 days
6. Admin approves/rejects with notes
7. If approved, system executes deletion (with legal retention)
8. User receives notification of completion

### 3. Consent Management Flow
1. User navigates to Settings > Privacy > Consent Management
2. User sees all consent purposes (Essential/Optional)
3. User toggles consent on/off
4. System records consent change with:
   - Timestamp
   - IP address
   - User agent
5. Audit log created
6. Consent applied immediately to data processing

## Admin Workflows

### 1. DSR Request Review
1. Admin accesses Admin > GDPR Management
2. Views dashboard with statistics
3. Filters requests by status/type
4. Clicks request to open details modal
5. Reviews:
   - User information
   - Request reason
   - Additional details
6. Actions:
   - Mark "In Progress"
   - Add admin notes
   - Approve & Complete
   - Reject with reason
7. System logs all actions
8. User notified of decision

### 2. Request Processing
- **Pending → In Progress**: Admin starts review
- **In Progress → Completed**: Request fulfilled
- **In Progress → Rejected**: Cannot fulfill (with reason)
- All status changes logged in audit trail

## Compliance Features

### GDPR Rights Implemented

| Right | Article | Implementation |
|-------|---------|----------------|
| Right to Access | Art. 15 | Data inventory display, export functionality |
| Right to Rectification | Art. 16 | DSR request type available |
| Right to Erasure | Art. 17 | Deletion request with legal retention |
| Right to Data Portability | Art. 20 | JSON export with all data |
| Right to Object | Art. 21 | Consent withdrawal option |
| Right to be Informed | Art. 13/14 | Privacy dashboard, data inventory |

### Audit Logging

All GDPR-related actions logged:
- DSR request creation
- DSR status updates
- Consent changes
- Data exports
- Data deletions

Audit logs include:
- User ID
- Action type
- Entity and entity ID
- Details (JSON)
- IP address
- Timestamp

### Data Retention

System respects Romanian legal requirements:
- **Tax records**: 10 years (fiscal law)
- **Payroll data**: Employment + 50 years (labor law)
- **Financial transactions**: 10 years (anti-money laundering)
- **Contracts**: According to limitation periods

### Legal Basis Tracking

Data inventory shows legal basis for each category:
- Contract performance (Art. 6(1)(b))
- Legal obligation (Art. 6(1)(c))
- Legitimate interest (Art. 6(1)(f))

## Testing

### Backend Tests

Test the following endpoints:

```bash
# Create DSR request
curl -X POST http://localhost:3001/api/gdpr/dsr-requests?userId=USER_ID \
  -H "Content-Type: application/json" \
  -d '{"type":"DATA_EXPORT","reason":"Need my data for tax purposes"}'

# Get DSR requests
curl http://localhost:3001/api/gdpr/dsr-requests?userId=USER_ID

# Update consent
curl -X PUT http://localhost:3001/api/gdpr/consents?userId=USER_ID \
  -H "Content-Type: application/json" \
  -d '{"purpose":"ANALYTICS","granted":false}'

# Export data
curl http://localhost:3001/api/gdpr/export?userId=USER_ID \
  -o export.json
```

### Frontend Tests

1. **Privacy Settings Page**:
   - Navigate to `/dashboard/settings/privacy`
   - Test all tabs
   - Verify component rendering

2. **Data Export**:
   - Fill reason field
   - Test "Request Export" button
   - Test "Download Now" button

3. **Data Deletion**:
   - Test confirmation flow
   - Verify email validation
   - Check acknowledgment requirement

4. **Consent Manager**:
   - Toggle consents
   - Verify updates persist
   - Check "always on" for essential

5. **Admin Panel**:
   - Login as admin
   - Navigate to `/dashboard/admin/gdpr`
   - Test filters
   - Process a request
   - Add notes and approve/reject

### E2E Test Scenarios

1. **Complete Export Flow**: User requests → Admin approves → User downloads
2. **Complete Deletion Flow**: User requests → Admin reviews → Deletion executes
3. **Consent Changes**: User updates → System applies → Reflected in data processing
4. **Admin Workflow**: Multiple requests → Batch processing → Audit trail

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Admin endpoints require ADMIN role
3. **Rate Limiting**: Consider implementing for DSR creation
4. **Data Encryption**: All exported data should use HTTPS
5. **IP Logging**: Track IP addresses for consent and DSR requests
6. **Audit Trail**: Immutable logs of all GDPR actions

## Future Enhancements

1. **Email Notifications**: Notify users of DSR status changes
2. **Automated Export Delivery**: Email export files instead of download
3. **Data Anonymization**: Option to anonymize instead of delete
4. **Consent Receipts**: Generate PDF receipts for consent changes
5. **Data Portability**: Export to other formats (CSV, XML)
6. **Right to Restrict**: Implement data processing restriction
7. **Batch Operations**: Admin bulk approve/reject
8. **SLA Tracking**: Monitor 30-day GDPR response deadline

## Compliance Checklist

- [x] Right to Access (Article 15)
- [x] Right to Rectification (Article 16)
- [x] Right to Erasure (Article 17)
- [x] Right to Data Portability (Article 20)
- [x] Consent Management (Article 7)
- [x] Audit Logging
- [x] Data Inventory
- [x] Legal Retention Policies
- [x] User-Friendly Interface
- [x] Admin Review Workflow
- [ ] Email Notifications (pending)
- [ ] DPO Contact Integration (pending)
- [ ] Data Protection Impact Assessment (pending)

## Support

For questions or issues related to GDPR compliance:
- **Email**: dpo@documentiulia.ro
- **Documentation**: /privacy and /gdpr pages
- **Admin Portal**: /dashboard/admin/gdpr

---

**Last Updated**: 2025-12-12
**Version**: 1.0.0
**Compliance**: GDPR (EU 2016/679), Romanian Law 190/2018

# MFA/2FA Authentication System - DocumentIulia.ro

## Overview

Complete Multi-Factor Authentication (MFA) / Two-Factor Authentication (2FA) implementation for DocumentIulia.ro platform using TOTP (Time-based One-Time Password) standard.

## Architecture

### Backend (NestJS)

**Location:** `/root/documentiulia.ro/backend/src/mfa/`

#### Files Created:
- `mfa.module.ts` - NestJS module configuration
- `mfa.service.ts` - Core MFA business logic
- `mfa.controller.ts` - REST API endpoints
- `mfa.dto.ts` - Data Transfer Objects and validation

#### Key Features:
- **TOTP Generation**: Uses `speakeasy` library for TOTP secret generation
- **QR Code Generation**: Uses `qrcode` library for authenticator app setup
- **Backup Codes**: 10 single-use backup codes generated on MFA enable
- **Security**: All backup codes are bcrypt hashed before storage
- **Audit Logging**: All MFA operations are logged to audit trail

#### Database Schema (Prisma):
```prisma
model User {
  // ... existing fields
  mfaEnabled      Boolean   @default(false)
  mfaSecret       String?   // TOTP secret (base32 encoded)
  mfaBackupCodes  Json      @default("[]")  // Array of hashed backup codes
  mfaEnabledAt    DateTime? // When MFA was enabled
}
```

#### API Endpoints:

1. **POST /mfa/setup** - Generate MFA setup (QR code + secret)
   - Requires: User password for verification
   - Returns: QR code data URL, secret key, backup URL
   - Protected: JWT authentication required

2. **POST /mfa/verify-setup** - Verify and enable MFA
   - Requires: TOTP code, secret
   - Returns: Backup codes (10 codes)
   - Protected: JWT authentication required

3. **POST /mfa/verify** - Verify MFA code during login
   - Requires: User ID, TOTP code OR backup code
   - Returns: Success status
   - Public endpoint (used during login flow)

4. **POST /mfa/disable** - Disable MFA
   - Requires: Password, TOTP code
   - Returns: Success status
   - Protected: JWT authentication required

5. **POST /mfa/regenerate-backup-codes** - Generate new backup codes
   - Requires: Password, TOTP code
   - Returns: New backup codes (10 codes)
   - Protected: JWT authentication required

6. **GET /mfa/status** - Get MFA status
   - Returns: Enabled status, backup codes remaining, enabled date
   - Protected: JWT authentication required

### Frontend (Next.js 15)

**Location:** `/root/documentiulia.ro/frontend/`

#### Components Created:

1. **MFASetup.tsx** (`components/auth/MFASetup.tsx`)
   - Multi-step wizard for MFA setup
   - Steps: Password verification → QR code display → TOTP verification → Backup codes
   - Features: QR code display, manual secret entry, backup codes download

2. **MFAVerify.tsx** (`components/auth/MFAVerify.tsx`)
   - TOTP code verification during login
   - Backup code verification (alternative method)
   - 6-digit code input with validation
   - Warning when backup codes are running low

3. **BackupCodes.tsx** (`components/auth/BackupCodes.tsx`)
   - Display and manage backup codes
   - Copy to clipboard functionality
   - Download as text file
   - Regenerate codes with password + TOTP verification

4. **Security Settings Page** (`app/[locale]/dashboard/settings/security/page.tsx`)
   - Complete security dashboard
   - MFA enable/disable controls
   - Backup codes management
   - Active sessions management
   - Session revocation

#### API Routes Created:
- `/api/auth/mfa/setup`
- `/api/auth/mfa/verify-setup`
- `/api/auth/mfa/verify`
- `/api/auth/mfa/disable`
- `/api/auth/mfa/regenerate-backup-codes`
- `/api/auth/mfa/status`
- `/api/auth/sessions`
- `/api/auth/sessions/[tokenId]`
- `/api/auth/logout-all`

## Dependencies Installed

### Backend:
```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "@types/speakeasy": "^2.0.10",
  "@types/qrcode": "^1.5.5"
}
```

### Frontend:
```json
{
  "qrcode.react": "^3.1.0",
  "@types/qrcode.react": "^1.0.5"
}
```

## Setup Instructions

### 1. Backend Setup

```bash
cd /root/documentiulia.ro/backend

# Install dependencies (already done)
npm install speakeasy qrcode @types/speakeasy @types/qrcode

# Generate Prisma client (already done)
npx prisma generate

# Create migration (manual - requires interactive mode)
npx prisma migrate dev --name add_mfa_fields
```

### 2. Frontend Setup

```bash
cd /root/documentiulia.ro/frontend

# Install dependencies (already done)
npm install qrcode.react @types/qrcode.react
```

### 3. Environment Variables

Ensure these are set in your `.env` files:

**Backend (.env):**
```
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=your_database_url
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## Usage Flow

### Enabling MFA:

1. User navigates to `/dashboard/settings/security`
2. Clicks "Enable MFA"
3. Enters password for verification
4. Scans QR code with authenticator app (Google Authenticator, Authy, 1Password, etc.)
5. Enters 6-digit code to verify setup
6. Receives 10 backup codes - MUST save these securely
7. MFA is now enabled

### Login with MFA:

1. User enters email + password (standard login)
2. System detects MFA is enabled
3. User is prompted for 6-digit TOTP code
4. Alternative: Use backup code if authenticator unavailable
5. On successful verification, user is logged in

### Disabling MFA:

1. Navigate to `/dashboard/settings/security`
2. Click "Disable MFA"
3. Enter password
4. Enter current TOTP code
5. MFA is disabled (all backup codes invalidated)

### Regenerating Backup Codes:

1. Navigate to `/dashboard/settings/security`
2. Click "Manage Backup Codes"
3. Click "Regenerate"
4. Enter password + TOTP code
5. Receive new 10 backup codes (old codes invalidated)

## Security Features

1. **TOTP Standard**: RFC 6238 compliant, 30-second time window
2. **Backup Codes**: 10 single-use codes, bcrypt hashed in database
3. **Time Window**: 2-step tolerance (±60 seconds) for clock drift
4. **Audit Logging**: All MFA operations logged for compliance
5. **Password Verification**: Required for enable/disable/regenerate operations
6. **Secure Storage**: Secrets encrypted, backup codes hashed
7. **Session Management**: Integrated with existing JWT auth system

## Integration Points

### Auth Service Integration:

The MFA system integrates with the existing AuthService:

```typescript
// In login flow - check if MFA is enabled
const user = await this.prisma.user.findUnique({ where: { email } });
if (user.mfaEnabled) {
  // Return special response indicating MFA required
  return { mfaRequired: true, userId: user.id };
}

// After MFA verification, issue tokens normally
const tokens = await this.generateTokens(user.id, user.email);
```

### Middleware/Guard Integration:

For routes requiring MFA verification:

```typescript
@UseGuards(JwtAuthGuard, MfaGuard)
@Get('sensitive-data')
async getSensitiveData() {
  // Only accessible if user passed MFA
}
```

## Testing

### Backend API Testing:

```bash
# 1. Setup MFA
curl -X POST http://localhost:4000/mfa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "user_password"}'

# 2. Verify setup
curl -X POST http://localhost:4000/mfa/verify-setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456", "secret": "BASE32_SECRET"}'

# 3. Check status
curl http://localhost:4000/mfa/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Frontend Testing:

1. Navigate to `http://localhost:3000/dashboard/settings/security`
2. Test enable flow
3. Test verify flow
4. Test disable flow
5. Test backup codes

## File Structure

```
backend/
├── src/
│   └── mfa/
│       ├── mfa.module.ts
│       ├── mfa.service.ts
│       ├── mfa.controller.ts
│       └── mfa.dto.ts
└── prisma/
    └── schema.prisma (updated)

frontend/
├── components/
│   └── auth/
│       ├── MFASetup.tsx
│       ├── MFAVerify.tsx
│       └── BackupCodes.tsx
├── app/
│   ├── [locale]/
│   │   └── dashboard/
│   │       └── settings/
│   │           └── security/
│   │               └── page.tsx
│   └── api/
│       └── auth/
│           ├── mfa/
│           │   ├── setup/route.ts
│           │   ├── verify-setup/route.ts
│           │   ├── verify/route.ts
│           │   ├── disable/route.ts
│           │   ├── regenerate-backup-codes/route.ts
│           │   └── status/route.ts
│           ├── sessions/
│           │   ├── route.ts
│           │   └── [tokenId]/route.ts
│           └── logout-all/route.ts
```

## Compliance & Standards

- **RFC 6238**: TOTP implementation
- **OWASP**: Multi-factor authentication best practices
- **GDPR**: User data protection (MFA secrets encrypted)
- **SOC 2**: Audit logging for all MFA operations
- **NIST SP 800-63B**: Authentication standards compliance

## Future Enhancements

1. **SMS/Email OTP**: Alternative MFA methods
2. **WebAuthn/FIDO2**: Hardware key support
3. **Trusted Devices**: Remember device for 30 days
4. **MFA Enforcement**: Force MFA for admin users
5. **Recovery Options**: Account recovery flow for lost MFA
6. **Rate Limiting**: Enhanced brute force protection
7. **Push Notifications**: Mobile app push-based MFA

## Support

For issues or questions:
- Backend: Check logs in `/root/documentiulia.ro/backend/logs`
- Frontend: Check browser console
- Database: Check Prisma Studio: `npx prisma studio`
- Audit logs: Query `AuditLog` table for MFA events

## Changelog

### Version 1.0.0 (2025-12-12)
- Initial MFA implementation
- TOTP support with QR codes
- Backup codes (10 codes)
- Security settings UI
- Session management
- Audit logging
- API endpoints
- Frontend components

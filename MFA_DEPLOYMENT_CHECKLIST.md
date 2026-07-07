# MFA Deployment Checklist

## Pre-Deployment

### 1. Verify Backend Installation
```bash
cd /root/documentiulia.ro/backend
```

- [ ] Check MFA module exists
  ```bash
  ls -la src/mfa/
  # Should show: mfa.module.ts, mfa.service.ts, mfa.controller.ts, mfa.dto.ts
  ```

- [ ] Verify dependencies installed
  ```bash
  npm list speakeasy qrcode
  ```

- [ ] Check app.module.ts includes MfaModule
  ```bash
  grep -n "MfaModule" src/app.module.ts
  ```

- [ ] Verify Prisma schema updated
  ```bash
  grep -A 4 "mfaEnabled" prisma/schema.prisma
  ```

### 2. Verify Frontend Installation
```bash
cd /root/documentiulia.ro/frontend
```

- [ ] Check auth components exist
  ```bash
  ls -la components/auth/
  # Should show: MFASetup.tsx, MFAVerify.tsx, BackupCodes.tsx
  ```

- [ ] Check security settings page exists
  ```bash
  ls -la app/[locale]/dashboard/settings/security/
  # Should show: page.tsx
  ```

- [ ] Verify API routes created
  ```bash
  find app/api/auth -name "*.ts" | wc -l
  # Should show: 9 or more
  ```

- [ ] Verify dependencies installed
  ```bash
  npm list qrcode.react
  ```

## Deployment Steps

### 3. Database Migration
```bash
cd /root/documentiulia.ro/backend
```

- [ ] Run Prisma migration
  ```bash
  npx prisma migrate dev --name add_mfa_fields
  ```

- [ ] Verify migration applied
  ```bash
  npx prisma migrate status
  ```

- [ ] Generate Prisma client (if needed)
  ```bash
  npx prisma generate
  ```

### 4. Backend Build & Test
```bash
cd /root/documentiulia.ro/backend
```

- [ ] Build backend
  ```bash
  npm run build
  ```

- [ ] Start backend in development
  ```bash
  npm run start:dev
  ```

- [ ] Test MFA endpoint
  ```bash
  # In another terminal
  curl http://localhost:4000/mfa/status -H "Authorization: Bearer TEST_TOKEN"
  # Should return JSON (even if 401 unauthorized)
  ```

- [ ] Check Swagger docs
  ```
  Open browser: http://localhost:4000/api
  Look for /mfa endpoints
  ```

### 5. Frontend Build & Test
```bash
cd /root/documentiulia.ro/frontend
```

- [ ] Build frontend
  ```bash
  npm run build
  ```

- [ ] Start frontend in development
  ```bash
  npm run dev
  ```

- [ ] Test security page
  ```
  Open browser: http://localhost:3000/dashboard/settings/security
  Should load without errors
  ```

- [ ] Check browser console
  ```
  No TypeScript or runtime errors
  ```

## Testing

### 6. End-to-End Testing

#### Test MFA Enable Flow
- [ ] Login to application
- [ ] Navigate to Security Settings
- [ ] Click "Enable MFA"
- [ ] Enter password
- [ ] QR code displays
- [ ] Scan with authenticator app (Google Authenticator, Authy, etc.)
- [ ] Enter 6-digit code
- [ ] Receive 10 backup codes
- [ ] Download/copy backup codes
- [ ] MFA status shows "Enabled"

#### Test MFA Login Flow
- [ ] Logout from application
- [ ] Login with email/password
- [ ] Prompted for MFA code
- [ ] Enter code from authenticator
- [ ] Successfully logged in

#### Test Backup Code Flow
- [ ] Logout from application
- [ ] Login with email/password
- [ ] Click "Use backup code"
- [ ] Enter one of the saved backup codes
- [ ] Successfully logged in
- [ ] Backup codes remaining decremented

#### Test MFA Management
- [ ] View backup codes remaining
- [ ] Regenerate backup codes
  - Enter password
  - Enter TOTP code
  - Receive new codes
- [ ] Disable MFA
  - Enter password
  - Enter TOTP code
  - MFA disabled successfully

#### Test Session Management
- [ ] View active sessions
- [ ] Revoke a specific session
- [ ] Logout all sessions
- [ ] Verify all sessions cleared

### 7. Error Testing

- [ ] Test invalid TOTP code
- [ ] Test expired TOTP code
- [ ] Test wrong password
- [ ] Test invalid backup code
- [ ] Test used backup code
- [ ] Test with no backup codes remaining
- [ ] Test network errors

## Production Deployment

### 8. Environment Configuration

#### Backend .env
- [ ] Set JWT_SECRET (strong, unique)
- [ ] Set DATABASE_URL (production)
- [ ] Set NODE_ENV=production
- [ ] Set PORT (default 4000)

#### Frontend .env
- [ ] Set NEXT_PUBLIC_BACKEND_URL (production backend URL)
- [ ] Set NEXT_PUBLIC_API_URL (if different)
- [ ] Configure other environment variables

### 9. Security Checklist

- [ ] Secrets are not committed to git
- [ ] MFA secrets are encrypted in database
- [ ] Backup codes are hashed
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] JWT tokens have expiration
- [ ] Audit logging is enabled

### 10. Production Build

#### Backend
```bash
cd /root/documentiulia.ro/backend
npm run build
npm run start:prod
```

#### Frontend
```bash
cd /root/documentiulia.ro/frontend
npm run build
npm start
```

### 11. Monitoring

- [ ] Set up error logging
- [ ] Monitor MFA enable/disable events
- [ ] Track failed verification attempts
- [ ] Monitor backup code usage
- [ ] Set up alerts for suspicious activity

## Post-Deployment

### 12. Documentation

- [ ] Update user documentation
- [ ] Update admin documentation
- [ ] Document recovery procedures
- [ ] Document support escalation

### 13. User Communication

- [ ] Notify users about MFA availability
- [ ] Provide setup instructions
- [ ] Create FAQ page
- [ ] Offer support channels

### 14. Rollback Plan

- [ ] Document rollback procedure
- [ ] Test rollback in staging
- [ ] Keep previous deployment ready
- [ ] Have migration rollback ready

## Final Verification

### 15. Production Smoke Tests

- [ ] MFA setup works in production
- [ ] MFA login works in production
- [ ] Backup codes work in production
- [ ] Sessions work in production
- [ ] Error handling works correctly
- [ ] UI is responsive on mobile
- [ ] Dark mode works correctly

### 16. Performance

- [ ] API response times < 500ms
- [ ] QR code generation < 1s
- [ ] Page load times acceptable
- [ ] No memory leaks
- [ ] Database queries optimized

### 17. Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Error messages clear

## Success Criteria

✅ All checklist items completed
✅ No critical errors in logs
✅ Users can enable MFA successfully
✅ Users can login with MFA successfully
✅ Backup codes work correctly
✅ Session management works
✅ Documentation is complete
✅ Monitoring is in place

## Rollback Triggers

Rollback if:
- [ ] Critical security vulnerability found
- [ ] Database corruption occurs
- [ ] >50% of users cannot login
- [ ] System performance degraded >50%
- [ ] Data loss detected

## Support Contacts

- Technical Lead: [Contact]
- Database Admin: [Contact]
- Security Team: [Contact]
- On-Call Engineer: [Contact]

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Verified By:** _____________
**Status:** [ ] PASS [ ] FAIL

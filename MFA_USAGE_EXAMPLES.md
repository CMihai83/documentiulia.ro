# MFA Usage Examples - DocumentIulia.ro

## Quick Start Guide

### For End Users

#### 1. Enable MFA on Your Account

1. **Login to your account**
   - Navigate to `https://documentiulia.ro/login`
   - Enter your email and password

2. **Go to Security Settings**
   - Click on your profile
   - Select "Settings" → "Security"
   - Or navigate directly to `/dashboard/settings/security`

3. **Enable MFA**
   - Click the "Enable MFA" button
   - Enter your account password
   - Scan the QR code with your authenticator app:
     - Google Authenticator (iOS/Android)
     - Authy (iOS/Android/Desktop)
     - 1Password (iOS/Android/Desktop)
     - Microsoft Authenticator (iOS/Android)

4. **Verify Setup**
   - Enter the 6-digit code from your authenticator app
   - Click "Verify & Enable"

5. **Save Backup Codes**
   - You'll receive 10 backup codes
   - **IMPORTANT**: Save these in a secure location!
   - Download as text file or copy to password manager
   - Each code can only be used once

#### 2. Login with MFA

1. **Standard Login**
   - Go to login page
   - Enter email and password
   - Click "Login"

2. **MFA Challenge**
   - You'll be prompted for a verification code
   - Open your authenticator app
   - Enter the 6-digit code
   - Click "Verify"

3. **Alternative: Use Backup Code**
   - If you don't have access to your authenticator
   - Click "Use a backup code instead"
   - Enter one of your saved backup codes
   - Click "Verify"

#### 3. Manage Backup Codes

1. **View Remaining Codes**
   - Go to Security Settings
   - See how many backup codes remain
   - Warning shown if 2 or fewer codes left

2. **Regenerate Backup Codes**
   - Click "Manage Backup Codes"
   - Click "Regenerate"
   - Enter your password
   - Enter current TOTP code
   - Save new backup codes securely
   - **Note**: Old codes are invalidated!

#### 4. Disable MFA (Not Recommended)

1. Go to Security Settings
2. Click "Disable MFA"
3. Confirm the action
4. Enter your password
5. Enter current TOTP code from authenticator
6. MFA will be disabled

---

### For Developers

#### Backend Integration

##### 1. Check MFA Status

```typescript
import { MfaService } from './mfa/mfa.service';

@Injectable()
export class YourService {
  constructor(private mfaService: MfaService) {}

  async checkUserMfa(userId: string) {
    const status = await this.mfaService.getMfaStatus(userId);
    console.log(status);
    // {
    //   enabled: true,
    //   backupCodesRemaining: 7,
    //   enabledAt: '2025-12-12T10:30:00Z'
    // }
  }
}
```

##### 2. Verify MFA During Login

```typescript
// In your auth controller/service
async login(email: string, password: string) {
  const user = await this.validateCredentials(email, password);

  if (user.mfaEnabled) {
    // Return MFA challenge
    return {
      mfaRequired: true,
      userId: user.id,
      message: 'MFA verification required'
    };
  }

  // Normal login flow
  return this.generateTokens(user);
}

async verifyMfaAndLogin(userId: string, token: string) {
  // Verify MFA token
  await this.mfaService.verifyMfaToken(userId, token);

  // Generate auth tokens
  const user = await this.userService.findById(userId);
  return this.generateTokens(user);
}
```

##### 3. Protect Sensitive Routes

```typescript
// Create a custom MFA guard
@Injectable()
export class MfaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has MFA enabled and verified in current session
    if (user.mfaEnabled && !request.session.mfaVerified) {
      throw new UnauthorizedException('MFA verification required');
    }

    return true;
  }
}

// Use in controller
@Controller('admin')
export class AdminController {
  @UseGuards(JwtAuthGuard, MfaGuard)
  @Get('sensitive-data')
  async getSensitiveData() {
    // Only accessible after MFA verification
  }
}
```

#### Frontend Integration

##### 1. MFA Setup Flow

```typescript
import { MFASetup } from '@/components/auth/MFASetup';

export default function SecurityPage() {
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  const handleMfaComplete = (backupCodes: string[]) => {
    // Save backup codes or show to user
    console.log('MFA enabled! Backup codes:', backupCodes);
    setShowMfaSetup(false);
  };

  return (
    <div>
      <button onClick={() => setShowMfaSetup(true)}>
        Enable MFA
      </button>

      {showMfaSetup && (
        <MFASetup
          onComplete={handleMfaComplete}
          onCancel={() => setShowMfaSetup(false)}
        />
      )}
    </div>
  );
}
```

##### 2. MFA Login Flow

```typescript
import { MFAVerify } from '@/components/auth/MFAVerify';
import { useState } from 'react';

export default function LoginPage() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState('');

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.mfaRequired) {
      setMfaRequired(true);
      setUserId(data.userId);
    } else {
      // Normal login - save tokens
      localStorage.setItem('accessToken', data.accessToken);
      window.location.href = '/dashboard';
    }
  };

  const handleMfaSuccess = () => {
    // MFA verified - proceed to dashboard
    window.location.href = '/dashboard';
  };

  if (mfaRequired) {
    return (
      <MFAVerify
        userId={userId}
        onSuccess={handleMfaSuccess}
        onUseBackupCode={() => {/* Switch to backup code UI */}}
      />
    );
  }

  return (
    <LoginForm onSubmit={handleLogin} />
  );
}
```

##### 3. Display Backup Codes

```typescript
import { BackupCodes } from '@/components/auth/BackupCodes';

export default function BackupCodesPage() {
  const [codes, setCodes] = useState<string[]>([]);

  const handleRegenerate = async () => {
    const response = await fetch('/api/auth/mfa/regenerate-backup-codes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        password: userPassword,
        token: totpCode,
      }),
    });

    const data = await response.json();
    setCodes(data.backupCodes);
  };

  return (
    <BackupCodes
      codes={codes}
      onRegenerate={handleRegenerate}
    />
  );
}
```

---

## API Examples (cURL)

### 1. Generate MFA Setup

```bash
curl -X POST http://localhost:4000/mfa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_password"
  }'

# Response:
{
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupUrl": "otpauth://totp/DocumentIulia.ro..."
}
```

### 2. Verify and Enable MFA

```bash
curl -X POST http://localhost:4000/mfa/verify-setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456",
    "secret": "JBSWY3DPEHPK3PXP"
  }'

# Response:
{
  "success": true,
  "backupCodes": [
    "A1B2-C3D4",
    "E5F6-G7H8",
    "I9J0-K1L2",
    ...
  ],
  "message": "MFA enabled successfully..."
}
```

### 3. Verify MFA Code

```bash
curl -X POST http://localhost:4000/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here",
    "token": "123456"
  }'

# Response:
{
  "success": true
}
```

### 4. Get MFA Status

```bash
curl http://localhost:4000/mfa/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "enabled": true,
  "backupCodesRemaining": 7,
  "enabledAt": "2025-12-12T10:30:00Z"
}
```

### 5. Disable MFA

```bash
curl -X POST http://localhost:4000/mfa/disable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_password",
    "token": "123456"
  }'

# Response:
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

### 6. Regenerate Backup Codes

```bash
curl -X POST http://localhost:4000/mfa/regenerate-backup-codes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_password",
    "token": "123456"
  }'

# Response:
{
  "backupCodes": [
    "M1N2-O3P4",
    "Q5R6-S7T8",
    ...
  ],
  "message": "New backup codes generated..."
}
```

---

## Common Issues & Solutions

### Issue: "Invalid verification code"
**Solution**:
- Ensure your device time is synchronized
- TOTP codes are time-sensitive (30-second window)
- Check your authenticator app is showing the correct account

### Issue: "Lost access to authenticator app"
**Solution**:
- Use one of your backup codes
- Contact support if you don't have backup codes saved

### Issue: "QR code won't scan"
**Solution**:
- Try manual entry using the secret key
- Ensure good lighting and camera focus
- Try a different authenticator app

### Issue: Backup codes not working
**Solution**:
- Ensure you're entering the code exactly as saved
- Each code can only be used once
- Check if codes were regenerated (old codes invalidated)

---

## Best Practices

### For Users:
1. **Save Backup Codes Securely**
   - Store in password manager
   - Print and keep in safe place
   - Never share with anyone

2. **Keep Authenticator App Backed Up**
   - Use cloud backup features (if available)
   - Export secrets when changing devices
   - Set up on multiple devices

3. **Regenerate Codes Periodically**
   - Regenerate if you suspect compromise
   - Regenerate when running low (< 3 codes)

### For Developers:
1. **Never Log Sensitive Data**
   - Don't log TOTP secrets
   - Don't log backup codes
   - Hash backup codes before storage

2. **Implement Rate Limiting**
   - Limit MFA verification attempts
   - Use exponential backoff
   - Lock account after too many failures

3. **Provide Recovery Options**
   - Account recovery via email
   - Support team can disable MFA
   - Require strong identity verification

---

## Testing Checklist

- [ ] Enable MFA flow works
- [ ] QR code displays correctly
- [ ] Manual secret entry works
- [ ] TOTP verification works
- [ ] Backup codes are generated
- [ ] Backup codes can be downloaded
- [ ] Login with MFA works
- [ ] Backup code login works
- [ ] Used backup codes are invalidated
- [ ] Backup code regeneration works
- [ ] MFA disable flow works
- [ ] Audit logs are created
- [ ] Session management works
- [ ] Error messages are clear
- [ ] Mobile UI is responsive

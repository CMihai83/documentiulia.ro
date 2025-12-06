# e-Factura Frontend Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the e-Factura components into the existing DocumentIulia frontend.

## Components Created

All components are located in `/var/www/documentiulia.ro/frontend/src/components/efactura/`:

1. **EFacturaStatus.tsx** - Status badge component
2. **EFacturaUploadButton.tsx** - Upload button with loading states
3. **EFacturaSettings.tsx** - OAuth configuration page
4. **EFacturaBatchUpload.tsx** - Batch upload interface
5. **ReceivedInvoicesPage.tsx** - List received invoices from suppliers
6. **EFacturaAnalytics.tsx** - Analytics dashboard

## Integration Steps

### Step 1: Add e-Factura Status to InvoicesPage.tsx

**Location:** `/var/www/documentiulia.ro/frontend/src/pages/InvoicesPage.tsx`

```typescript
// Add import at the top
import { EFacturaStatus } from '../components/efactura';

// In the table, add a new column header (around line 140):
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  e-Factura Status
</th>

// In the table row (around line 160), add a new cell:
<td className="px-6 py-4">
  <EFacturaStatus
    status={invoice.efactura_status || 'not_configured'}
    uploadIndex={invoice.efactura_upload_index}
    message={invoice.efactura_message}
  />
</td>
```

### Step 2: Add Upload Button to Invoice Detail/Form Page

**Location:** `/var/www/documentiulia.ro/frontend/src/pages/InvoiceFormPage.tsx`

```typescript
// Add imports
import { EFacturaUploadButton, EFacturaStatus } from '../components/efactura';
import { useState } from 'react';

// Add state
const [efacturaStatus, setEfacturaStatus] = useState(invoice?.efactura_status);

// Add section in the form (after save button):
{invoice && invoice.id && (
  <div className="mt-6 border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">e-Factura ANAF</h3>

    <div className="flex items-center gap-4">
      <EFacturaStatus
        status={efacturaStatus || 'pending'}
        uploadIndex={invoice.efactura_upload_index}
      />

      <EFacturaUploadButton
        invoiceId={invoice.id}
        companyId={invoice.company_id}
        currentStatus={efacturaStatus}
        onUploadComplete={(result) => {
          setEfacturaStatus('uploaded');
          alert('Invoice uploaded successfully to ANAF');
        }}
        onUploadError={(error) => {
          alert(`Upload failed: ${error}`);
        }}
      />
    </div>
  </div>
)}
```

### Step 3: Add e-Factura Routes to App.tsx

**Location:** `/var/www/documentiulia.ro/frontend/src/App.tsx`

```typescript
// Add imports
import { EFacturaSettings } from './components/efactura';
import ReceivedInvoicesPage from './components/efactura/ReceivedInvoicesPage';
import EFacturaAnalytics from './components/efactura/EFacturaAnalytics';

// Add routes in the routing section:
<Route path="/settings/efactura" element={<EFacturaSettings />} />
<Route path="/invoices/received" element={<ReceivedInvoicesPage />} />
<Route path="/analytics/efactura" element={<EFacturaAnalytics />} />
```

### Step 4: Add Menu Items to Navigation

**Location:** `/var/www/documentiulia.ro/frontend/src/components/layout/DashboardLayout.tsx` (or similar)

```typescript
// In the settings dropdown or sidebar navigation:
{
  name: 'e-Factura Settings',
  href: '/settings/efactura',
  icon: Settings
},
{
  name: 'Received Invoices',
  href: '/invoices/received',
  icon: Download
},
{
  name: 'e-Factura Analytics',
  href: '/analytics/efactura',
  icon: BarChart
}
```

### Step 5: Update TypeScript Types

**Location:** `/var/www/documentiulia.ro/frontend/src/types/index.ts`

Add e-Factura fields to Invoice type:

```typescript
export interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  // Add e-Factura fields:
  efactura_status?: 'pending' | 'uploading' | 'uploaded' | 'accepted' | 'rejected' | 'error' | 'not_configured';
  efactura_upload_index?: number;
  efactura_message?: string;
  // ... other existing fields
}
```

### Step 6: Add Batch Upload to Invoices List Page

**Location:** `/var/www/documentiulia.ro/frontend/src/pages/InvoicesPage.tsx`

```typescript
// Add import
import { EFacturaBatchUpload } from '../components/efactura';
import { useState } from 'react';

// Add state
const [showBatchUpload, setShowBatchUpload] = useState(false);

// Add button in the header section (around line 98):
<button
  onClick={() => setShowBatchUpload(!showBatchUpload)}
  className="btn-secondary flex items-center gap-2"
>
  <Upload className="w-5 h-5" />
  Batch Upload to ANAF
</button>

// Add batch upload component (after the header, around line 140):
{showBatchUpload && (
  <div className="mb-6">
    <EFacturaBatchUpload
      companyId={currentCompanyId}
      invoices={filteredInvoices}
      onUploadComplete={(result) => {
        alert(`Uploaded ${result.successful}/${result.total} invoices successfully`);
        loadInvoices(); // Reload to get updated statuses
        setShowBatchUpload(false);
      }}
    />
  </div>
)}
```

## API Configuration

The components use the `API_BASE_URL` from `/var/www/documentiulia.ro/frontend/src/config.ts`. This automatically detects localhost vs production and sets the correct API endpoint.

## OAuth Flow Setup

### First-Time Setup for Users:

1. User goes to Settings → e-Factura Settings
2. Selects their company
3. Clicks "Connect to ANAF e-Factura"
4. Redirected to ANAF OAuth page (logincert.anaf.ro)
5. Logs in with their ANAF credentials
6. Grants permission to DocumentIulia
7. Redirected back to DocumentIulia with auth code
8. System exchanges code for access token and refresh token
9. Tokens stored encrypted in database
10. Connection status shows "Connected"

### OAuth Callback Route

Add this route to handle the OAuth callback:

```typescript
<Route path="/efactura/oauth-callback" element={<OAuthCallback />} />
```

Create the callback component:

```typescript
// /var/www/documentiulia.ro/frontend/src/pages/OAuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      alert(`OAuth failed: ${error}`);
      navigate('/settings/efactura');
      return;
    }

    if (code && state) {
      // The backend oauth-callback.php will handle the token exchange
      // Redirect to settings page
      navigate('/settings/efactura?oauth=success');
    } else {
      navigate('/settings/efactura?oauth=error');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing ANAF authorization...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
```

## Testing the Integration

### Manual Testing Steps:

1. **Test Status Display:**
   - Navigate to Invoices page
   - Verify e-Factura status column appears
   - Check that pending invoices show "Pending" badge

2. **Test Single Upload:**
   - Open an invoice detail page
   - Click "Upload to ANAF" button
   - Verify loading state shows
   - Check status updates to "Uploaded"

3. **Test Batch Upload:**
   - Go to Invoices list
   - Click "Batch Upload to ANAF"
   - Select multiple invoices
   - Click upload
   - Verify progress and results

4. **Test OAuth Connection:**
   - Go to Settings → e-Factura
   - Select a company
   - Click "Connect to ANAF"
   - Complete OAuth flow (requires valid ANAF test/production credentials)
   - Verify connection status shows "Connected"

5. **Test Received Invoices:**
   - Navigate to "Received Invoices" page
   - Click "Download New"
   - Verify invoices from suppliers appear
   - Check auto-matching status

6. **Test Analytics:**
   - Navigate to "e-Factura Analytics"
   - Select a company
   - Change period (7d, 30d, 90d, 365d)
   - Verify statistics update

## Styling Notes

All components use Tailwind CSS classes consistent with the existing DocumentIulia design system:

- Primary color: `blue-600`
- Success: `green-600`
- Error: `red-600`
- Warning: `yellow-600`
- Neutral: `gray-*`

## Error Handling

All components include comprehensive error handling:

- Network errors show user-friendly messages
- Unauthorized errors redirect to login
- Validation errors show specific field messages
- ANAF API errors display ANAF's error messages

## Security Considerations

- All API calls require Bearer token authentication
- OAuth tokens stored encrypted (AES-256-CBC)
- Company access verified on every API call
- CSRF protection via state parameter in OAuth flow

## Production Deployment Checklist

- [ ] Update `config.ts` with production API URL
- [ ] Register OAuth application with ANAF (production)
- [ ] Update OAuth redirect URIs in ANAF console
- [ ] Set up production SSL certificate for documentiulia.ro
- [ ] Test OAuth flow in production environment
- [ ] Verify ANAF API credentials are production (not test)
- [ ] Enable error logging and monitoring
- [ ] Test all flows with real invoices
- [ ] Create user documentation/tutorials
- [ ] Train support team on e-Factura features

## Support Resources

- **ANAF e-Factura Documentation:** https://www.anaf.ro/efactura
- **RO_CIUS Specification:** EN 16931 with Romanian customizations
- **UBL 2.1 Standard:** http://docs.oasis-open.org/ubl/UBL-2.1.html
- **OAuth 2.0 RFC:** https://tools.ietf.org/html/rfc6749

## Troubleshooting

### Common Issues:

**Issue:** "Not Connected" status even after OAuth
- Check database for oauth tokens
- Verify token expiration
- Check ANAF API credentials

**Issue:** Upload fails with "Invalid XML"
- Verify invoice has all required fields
- Check CIF format (RO prefix)
- Validate VAT calculations

**Issue:** Received invoices not auto-matching
- Check CIF matches exactly
- Verify amount is within ±1% tolerance
- Check date proximity (±7 days default)

**Issue:** OAuth callback fails
- Verify redirect_uri matches exactly what's registered with ANAF
- Check state parameter for CSRF protection
- Ensure SSL certificate is valid

## Next Steps

After integration:

1. Create video tutorials for users
2. Add tooltips/help text to e-Factura features
3. Implement notification system for upload failures
4. Add scheduled auto-sync of invoice statuses
5. Create reporting dashboard for e-Factura compliance

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Author:** DocumentIulia Development Team

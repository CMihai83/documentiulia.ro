/**
 * e-Factura React Hook
 * E2-US01: e-Factura XML Generation and ANAF Integration
 */

import { useState, useCallback } from 'react';

const API_BASE = '/api/v1/efactura';

interface EFacturaSettings {
  is_enabled: boolean;
  auto_submit: boolean;
  anaf_client_id?: string;
  anaf_client_secret?: string;
  use_test_environment: boolean;
  notification_email?: string;
}

interface CodeListItem {
  code: string;
  name_ro: string;
  name_en: string;
  description?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface EFacturaStatus {
  invoice_id: string;
  company_id: string;
  status: string;
  upload_index?: string;
  anaf_status?: string;
  anaf_message?: string;
  xml_file_path?: string;
  uploaded_at?: string;
  last_sync_at?: string;
}

interface SubmitResult {
  success: boolean;
  upload_index?: string;
  message?: string;
  error?: string;
}

interface SyncHistoryItem {
  action: string;
  status: string;
  error_message?: string;
  created_at: string;
  response_data?: any;
}

export function useEFactura() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    const companyId = localStorage.getItem('company_id');
    return {
      'Authorization': `Bearer ${token}`,
      'X-Company-ID': companyId || '',
      'Content-Type': 'application/json'
    };
  }, []);

  // Get code lists (invoice types, units, tax categories, etc.)
  const getCodeLists = useCallback(async (): Promise<Record<string, CodeListItem[]>> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/code-lists.php`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch code lists');
      return data.data.lists || {};
    } catch (err: any) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Get specific code list
  const getCodeList = useCallback(async (listType: string): Promise<CodeListItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/code-lists.php?type=${listType}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch code list');
      return data.data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Get e-Factura settings for company
  const getSettings = useCallback(async (): Promise<EFacturaSettings | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/settings.php`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch settings');
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Save e-Factura settings
  const saveSettings = useCallback(async (settings: Partial<EFacturaSettings>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/settings.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to save settings');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Validate invoice for e-Factura
  const validateInvoice = useCallback(async (invoiceId: string): Promise<ValidationResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/validate.php?invoice_id=${invoiceId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Validation failed');
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return { valid: false, errors: [err.message], warnings: [] };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Generate XML preview (without submitting)
  const generateXML = useCallback(async (invoiceId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/generate-xml.php?invoice_id=${invoiceId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'XML generation failed');
      return data.data.xml;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Download XML file
  const downloadXML = useCallback(async (invoiceId: string): Promise<void> => {
    try {
      const xml = await generateXML(invoiceId);
      if (xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoiceId}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [generateXML]);

  // Submit invoice to ANAF
  const submitToANAF = useCallback(async (invoiceId: string): Promise<SubmitResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/submit.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ invoice_id: invoiceId })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Submission failed');
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Check invoice status from ANAF
  const checkStatus = useCallback(async (invoiceId: string): Promise<EFacturaStatus | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/status.php?invoice_id=${invoiceId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Status check failed');
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Get sync history for invoice
  const getHistory = useCallback(async (invoiceId: string): Promise<SyncHistoryItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/history.php?invoice_id=${invoiceId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch history');
      return data.data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Refresh status from ANAF (checks actual status)
  const refreshFromANAF = useCallback(async (invoiceId: string): Promise<EFacturaStatus | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/refresh-status.php`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ invoice_id: invoiceId })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Refresh failed');
      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  return {
    loading,
    error,
    // Code lists
    getCodeLists,
    getCodeList,
    // Settings
    getSettings,
    saveSettings,
    // Invoice operations
    validateInvoice,
    generateXML,
    downloadXML,
    submitToANAF,
    checkStatus,
    getHistory,
    refreshFromANAF
  };
}

export default useEFactura;

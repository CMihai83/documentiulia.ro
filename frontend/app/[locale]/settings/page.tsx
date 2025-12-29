'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings, RefreshCw, CheckCircle, XCircle, Clock,
  FileText, Users, Package, AlertCircle, Loader2,
  Download, Shield, Trash2, Link, Unlink, Building2,
  Calendar, Send, ExternalLink, Bell
} from 'lucide-react';
import {
  fetchUserGdprData,
  downloadGdprDataAsJson,
  downloadGdprDataAsHtml,
  requestDataDeletion,
  type GdprExportData
} from '@/lib/gdpr-export';
import { MFASetup } from '@/components/auth/MFASetup';
import { BackupCodes } from '@/components/auth/BackupCodes';

interface SagaStatus {
  connected: boolean;
  apiVersion: string;
  lastSync: string | null;
  error?: string;
}

interface SpvConnectionStatus {
  connected: boolean;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  cui?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  lastError?: string;
  features: {
    efactura: boolean;
    saft: boolean;
    notifications: boolean;
  };
}

interface SpvDeadlines {
  saft: {
    frequency: string;
    nextDeadline: string;
    currentPeriod: string;
    daysRemaining: number;
    pilotPeriod: { start: string; end: string };
    gracePeriodMonths: number;
  };
  efactura: {
    b2bMandatory: string;
    currentStatus: string;
    daysUntilMandatory: number;
  };
}

interface MfaStatus {
  enabled: boolean;
  method: 'totp' | null;
  backupCodesCount: number;
  lastUsed: string | null;
}

interface SyncResult {
  success: boolean;
  message: string;
  sagaId?: string;
}

interface NotificationPreferences {
  email: {
    invoiceReminders: boolean;
    overdueAlerts: boolean;
    complianceDeadlines: boolean;
    weeklyReports: boolean;
    systemAlerts: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const [sagaStatus, setSagaStatus] = useState<SagaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingInvoices, setSyncingInvoices] = useState(false);
  const [syncingPayroll, setSyncingPayroll] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [gdprData, setGdprData] = useState<GdprExportData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(true);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);
  const [notifPrefsMessage, setNotifPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SPV State
  const [spvStatus, setSpvStatus] = useState<SpvConnectionStatus | null>(null);
  const [spvDeadlines, setSpvDeadlines] = useState<SpvDeadlines | null>(null);
  const [spvLoading, setSpvLoading] = useState(true);
  const [spvConnecting, setSpvConnecting] = useState(false);
  const [spvDisconnecting, setSpvDisconnecting] = useState(false);
  const [spvMessage, setSpvMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MFA State
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchSagaStatus();
    fetchSpvStatus();
    fetchSpvDeadlines();
    fetchNotificationPreferences();
    fetchMfaStatus();
  }, [token]);

  // Handle SPV OAuth callback
  useEffect(() => {
    const spvParam = searchParams.get('spv');
    const messageParam = searchParams.get('message');

    if (spvParam === 'connected') {
      setSpvMessage({ type: 'success', text: 'Conectat cu succes la ANAF SPV!' });
      fetchSpvStatus();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (spvParam === 'error') {
      setSpvMessage({ type: 'error', text: messageParam || 'Eroare la conectarea cu ANAF SPV' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  const fetchSagaStatus = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/saga/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSagaStatus(data);
      } else {
        setSagaStatus({
          connected: false,
          apiVersion: 'v3.2',
          lastSync: null,
          error: 'Failed to fetch status'
        });
      }
    } catch (error) {
      setSagaStatus({
        connected: false,
        apiVersion: 'v3.2',
        lastSync: null,
        error: 'Connection error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSpvStatus = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/spv/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSpvStatus(data);
      } else {
        setSpvStatus({
          connected: false,
          status: 'PENDING',
          features: { efactura: false, saft: false, notifications: false }
        });
      }
    } catch (error) {
      setSpvStatus({
        connected: false,
        status: 'ERROR',
        features: { efactura: false, saft: false, notifications: false }
      });
    } finally {
      setSpvLoading(false);
    }
  };

  const fetchSpvDeadlines = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/spv/deadlines`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSpvDeadlines(data);
      }
    } catch (error) {
      console.error('Failed to fetch SPV deadlines:', error);
    }
  };

  const fetchNotificationPreferences = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationPrefs(data.preferences);
      } else {
        // Set defaults if API fails
        setNotificationPrefs({
          email: {
            invoiceReminders: true,
            overdueAlerts: true,
            complianceDeadlines: true,
            weeklyReports: true,
            systemAlerts: true,
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      // Set defaults on error
      setNotificationPrefs({
        email: {
          invoiceReminders: true,
          overdueAlerts: true,
          complianceDeadlines: true,
          weeklyReports: true,
          systemAlerts: true,
        }
      });
    } finally {
      setNotifPrefsLoading(false);
    }
  };

  const fetchMfaStatus = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/mfa/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMfaStatus(data);
      } else {
        setMfaStatus({
          enabled: false,
          method: null,
          backupCodesCount: 0,
          lastUsed: null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
      setMfaStatus({
        enabled: false,
        method: null,
        backupCodesCount: 0,
        lastUsed: null,
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const updateNotificationPreference = async (key: keyof NotificationPreferences['email'], value: boolean) => {
    if (!token || !notificationPrefs) return;

    setNotifPrefsSaving(true);
    setNotifPrefsMessage(null);

    // Optimistically update UI
    const updatedPrefs = {
      ...notificationPrefs,
      email: {
        ...notificationPrefs.email,
        [key]: value,
      }
    };
    setNotificationPrefs(updatedPrefs);

    try {
      const response = await fetch(`${API_URL}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: { [key]: value }
        }),
      });

      if (response.ok) {
        setNotifPrefsMessage({ type: 'success', text: 'Preferinte salvate cu succes' });
      } else {
        // Revert on failure
        setNotificationPrefs(notificationPrefs);
        setNotifPrefsMessage({ type: 'error', text: 'Eroare la salvarea preferintelor' });
      }
    } catch (error) {
      // Revert on error
      setNotificationPrefs(notificationPrefs);
      setNotifPrefsMessage({ type: 'error', text: 'Eroare de retea' });
    } finally {
      setNotifPrefsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setNotifPrefsMessage(null), 3000);
    }
  };

  const connectToSpv = async () => {
    if (!token) return;

    setSpvConnecting(true);
    setSpvMessage(null);

    try {
      const response = await fetch(`${API_URL}/spv/oauth/authorize`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to ANAF OAuth page
        router.push(data.authUrl);
      } else {
        const error = await response.json();
        setSpvMessage({ type: 'error', text: error.message || 'Eroare la inițierea conectării' });
      }
    } catch (error) {
      setSpvMessage({ type: 'error', text: 'Eroare de rețea la conectarea cu ANAF' });
    } finally {
      setSpvConnecting(false);
    }
  };

  const disconnectFromSpv = async () => {
    if (!token) return;

    setSpvDisconnecting(true);
    setSpvMessage(null);

    try {
      const response = await fetch(`${API_URL}/spv/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setSpvMessage({ type: 'success', text: 'Deconectat de la ANAF SPV' });
        fetchSpvStatus();
      } else {
        const error = await response.json();
        setSpvMessage({ type: 'error', text: error.message || 'Eroare la deconectare' });
      }
    } catch (error) {
      setSpvMessage({ type: 'error', text: 'Eroare de rețea la deconectare' });
    } finally {
      setSpvDisconnecting(false);
    }
  };

  const getStatusColor = (status: SpvConnectionStatus['status']) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'EXPIRED': return 'text-orange-600 bg-orange-100';
      case 'ERROR':
      case 'REVOKED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: SpvConnectionStatus['status']) => {
    switch (status) {
      case 'ACTIVE': return 'Activ';
      case 'EXPIRED': return 'Expirat';
      case 'ERROR': return 'Eroare';
      case 'REVOKED': return 'Revocat';
      case 'PENDING': return 'În așteptare';
      default: return status;
    }
  };

  const syncInvoices = async () => {
    setSyncingInvoices(true);
    setLastSyncResult(null);

    try {
      // This would typically sync all pending invoices
      // For demo, we'll just call the sync endpoint with sample data
      const response = await fetch(`${API_URL}/saga/sync/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          number: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
          date: new Date().toISOString().split('T')[0],
          partner: {
            name: 'Demo Partner SRL',
            cui: 'RO12345678'
          },
          lines: [{
            description: 'Demo sync item',
            quantity: 1,
            unitPrice: 100,
            vatRate: 21
          }],
          totals: {
            net: 100,
            vat: 21,
            gross: 121
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastSyncResult({
          success: true,
          message: 'Invoices synced successfully',
          sagaId: data.sagaId
        });
        fetchSagaStatus();
      } else {
        setLastSyncResult({
          success: false,
          message: 'Failed to sync invoices'
        });
      }
    } catch (error) {
      setLastSyncResult({
        success: false,
        message: 'Sync error occurred'
      });
    } finally {
      setSyncingInvoices(false);
    }
  };

  const syncPayroll = async () => {
    setSyncingPayroll(true);
    setLastSyncResult(null);

    try {
      const response = await fetch(`${API_URL}/saga/sync/payroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          period: new Date().toISOString().slice(0, 7),
          employeeId: 'EMP001',
          grossSalary: 5000,
          cas: 1250,
          cass: 500,
          incomeTax: 325,
          netSalary: 2925
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastSyncResult({
          success: true,
          message: 'Payroll synced successfully',
          sagaId: data.sagaId
        });
        fetchSagaStatus();
      } else {
        setLastSyncResult({
          success: false,
          message: 'Failed to sync payroll'
        });
      }
    } catch (error) {
      setLastSyncResult({
        success: false,
        message: 'Sync error occurred'
      });
    } finally {
      setSyncingPayroll(false);
    }
  };

  const syncInventory = async () => {
    setSyncingInventory(true);
    setLastSyncResult(null);

    try {
      const response = await fetch(`${API_URL}/saga/sync/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: 'PROD001',
          name: 'Demo Product',
          quantity: 100,
          unitPrice: 50,
          vatRate: 21
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastSyncResult({
          success: true,
          message: 'Inventory synced successfully',
          sagaId: data.sagaId
        });
        fetchSagaStatus();
      } else {
        setLastSyncResult({
          success: false,
          message: 'Failed to sync inventory'
        });
      }
    } catch (error) {
      setLastSyncResult({
        success: false,
        message: 'Sync error occurred'
      });
    } finally {
      setSyncingInventory(false);
    }
  };

  const handleExportData = async () => {
    if (!token) return;
    setExportingData(true);

    try {
      const data = await fetchUserGdprData(token, API_URL);
      if (data) {
        setGdprData(data);
      } else {
        // Create mock data from current user if API not available
        const mockData: GdprExportData = {
          exportDate: new Date().toISOString(),
          user: {
            name: user?.name || '',
            email: user?.email || '',
            role: user?.role || '',
            company: user?.company,
            cui: user?.cui,
          },
          invoices: [],
          documents: [],
          auditLogs: [],
        };
        setGdprData(mockData);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportingData(false);
    }
  };

  const handleDownloadJson = () => {
    if (gdprData) {
      downloadGdprDataAsJson(gdprData);
    }
  };

  const handleDownloadHtml = () => {
    if (gdprData) {
      downloadGdprDataAsHtml(gdprData);
    }
  };

  const handleDeleteRequest = async () => {
    if (!token) return;

    const success = await requestDataDeletion(token, API_URL);
    if (success) {
      setDeletionRequested(true);
      setShowDeleteConfirm(false);
    }
  };

  const handleMfaSetupComplete = async (codes: string[]) => {
    setBackupCodes(codes);
    setShowMfaSetup(false);
    setShowBackupCodes(true);
    await fetchMfaStatus(); // Refresh MFA status
  };

  const handleRegenerateBackupCodes = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/mfa/regenerate-backup-codes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        await fetchMfaStatus(); // Refresh MFA status
      }
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
    }
  };

  const handleDisableMfa = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/mfa/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchMfaStatus(); // Refresh MFA status
      }
    } catch (error) {
      console.error('Failed to disable MFA:', error);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary-600" />
          {t('title')}
        </h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* SAGA Integration Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          SAGA v3.2 Integration
        </h2>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3">Connection Status</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking connection...
            </div>
          ) : sagaStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {sagaStatus.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={sagaStatus.connected ? 'text-green-700' : 'text-red-700'}>
                  {sagaStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">API Version:</span> {sagaStatus.apiVersion}
              </div>
              {sagaStatus.lastSync && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Last Sync:</span> {new Date(sagaStatus.lastSync).toLocaleString()}
                </div>
              )}
              {sagaStatus.error && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {sagaStatus.error}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Unable to fetch status</div>
          )}
          <button
            onClick={fetchSagaStatus}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        {/* Sync Actions */}
        {isAdmin ? (
          <div className="space-y-4">
            <h3 className="font-medium">Manual Sync Operations</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Sync Invoices */}
              <button
                onClick={syncInvoices}
                disabled={syncingInvoices || !sagaStatus?.connected}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {syncingInvoices ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : (
                  <FileText className="w-8 h-8 text-blue-600" />
                )}
                <span className="font-medium text-blue-700">Sync Invoices</span>
                <span className="text-xs text-blue-600">Push invoices to SAGA</span>
              </button>

              {/* Sync Payroll */}
              <button
                onClick={syncPayroll}
                disabled={syncingPayroll || !sagaStatus?.connected}
                className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {syncingPayroll ? (
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                ) : (
                  <Users className="w-8 h-8 text-purple-600" />
                )}
                <span className="font-medium text-purple-700">Sync Payroll</span>
                <span className="text-xs text-purple-600">Push payroll data</span>
              </button>

              {/* Sync Inventory */}
              <button
                onClick={syncInventory}
                disabled={syncingInventory || !sagaStatus?.connected}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {syncingInventory ? (
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                ) : (
                  <Package className="w-8 h-8 text-green-600" />
                )}
                <span className="font-medium text-green-700">Sync Inventory</span>
                <span className="text-xs text-green-600">Push stock levels</span>
              </button>
            </div>

            {/* Sync Result */}
            {lastSyncResult && (
              <div className={`p-4 rounded-lg ${lastSyncResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {lastSyncResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={lastSyncResult.success ? 'text-green-700' : 'text-red-700'}>
                    {lastSyncResult.message}
                  </span>
                </div>
                {lastSyncResult.sagaId && (
                  <div className="text-sm text-green-600 mt-1">
                    SAGA ID: {lastSyncResult.sagaId}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="w-5 h-5" />
              Only ADMIN and ACCOUNTANT roles can perform sync operations.
            </div>
          </div>
        )}
      </div>

      {/* ANAF SPV Integration Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          ANAF SPV Integration
        </h2>
        <p className="text-gray-600 mb-4">
          Conectează-te la Spațiul Privat Virtual ANAF pentru a trimite e-Facturi și SAF-T D406 automat.
        </p>

        {/* SPV Message */}
        {spvMessage && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            spvMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {spvMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {spvMessage.text}
            <button
              onClick={() => setSpvMessage(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3">Status Conexiune</h3>
          {spvLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Se verifică conexiunea...
            </div>
          ) : spvStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {spvStatus.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
                <span className={spvStatus.connected ? 'text-green-700' : 'text-gray-600'}>
                  {spvStatus.connected ? 'Conectat la ANAF SPV' : 'Neconectat'}
                </span>
                {spvStatus.connected && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(spvStatus.status)}`}>
                    {getStatusText(spvStatus.status)}
                  </span>
                )}
              </div>

              {spvStatus.connected && (
                <>
                  {spvStatus.cui && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">CUI:</span> {spvStatus.cui}
                    </div>
                  )}
                  {spvStatus.expiresAt && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Expiră:</span> {new Date(spvStatus.expiresAt).toLocaleDateString('ro-RO')}
                    </div>
                  )}
                  {spvStatus.lastUsedAt && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Ultima utilizare:</span> {new Date(spvStatus.lastUsedAt).toLocaleString('ro-RO')}
                    </div>
                  )}
                  {spvStatus.lastError && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {spvStatus.lastError}
                    </div>
                  )}

                  {/* Features */}
                  <div className="flex gap-4 mt-2">
                    <div className={`flex items-center gap-1 text-sm ${spvStatus.features.efactura ? 'text-green-600' : 'text-gray-400'}`}>
                      <FileText className="w-4 h-4" />
                      e-Factura
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${spvStatus.features.saft ? 'text-green-600' : 'text-gray-400'}`}>
                      <Package className="w-4 h-4" />
                      SAF-T D406
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${spvStatus.features.notifications ? 'text-green-600' : 'text-gray-400'}`}>
                      <AlertCircle className="w-4 h-4" />
                      Notificări
                    </div>
                  </div>
                </>
              )}

              {/* Connect/Disconnect Buttons */}
              <div className="flex gap-3 mt-3">
                {!spvStatus.connected ? (
                  <button
                    onClick={connectToSpv}
                    disabled={spvConnecting || !user?.cui}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {spvConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Se conectează...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4" />
                        Conectează la ANAF SPV
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={disconnectFromSpv}
                    disabled={spvDisconnecting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 transition"
                  >
                    {spvDisconnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Se deconectează...
                      </>
                    ) : (
                      <>
                        <Unlink className="w-4 h-4" />
                        Deconectează
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { fetchSpvStatus(); fetchSpvDeadlines(); }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reîmprospătează
                </button>
              </div>

              {!user?.cui && !spvStatus.connected && (
                <div className="flex items-center gap-2 text-sm text-orange-600 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  Trebuie să configurați CUI-ul companiei în profilul dvs. înainte de a vă conecta la SPV.
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Nu s-a putut obține statusul conexiunii</div>
          )}
        </div>

        {/* Deadlines Section */}
        {spvDeadlines && (
          <div className="p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2 text-indigo-700">
              <Calendar className="w-4 h-4" />
              Termene ANAF
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* SAF-T Deadline */}
              <div className="p-3 bg-white rounded-lg">
                <div className="font-medium text-gray-700">SAF-T D406</div>
                <div className="text-sm text-gray-600 mt-1">
                  Frecvență: {spvDeadlines.saft.frequency === 'monthly' ? 'Lunar' : 'Trimestrial'}
                </div>
                <div className="text-sm text-gray-600">
                  Perioada curentă: {spvDeadlines.saft.currentPeriod}
                </div>
                <div className={`text-sm mt-1 font-medium ${
                  spvDeadlines.saft.daysRemaining <= 5 ? 'text-red-600' :
                  spvDeadlines.saft.daysRemaining <= 10 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {spvDeadlines.saft.daysRemaining} zile până la termen
                </div>
              </div>

              {/* e-Factura Info */}
              <div className="p-3 bg-white rounded-lg">
                <div className="font-medium text-gray-700">e-Factura B2B</div>
                <div className="text-sm text-gray-600 mt-1">
                  Status actual: {spvDeadlines.efactura.currentStatus === 'voluntary' ? 'Voluntar' : 'Obligatoriu'}
                </div>
                <div className="text-sm text-gray-600">
                  Devine obligatoriu: {new Date(spvDeadlines.efactura.b2bMandatory).toLocaleDateString('ro-RO')}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {spvDeadlines.efactura.daysUntilMandatory} zile până devine obligatoriu
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-indigo-600">
              <a
                href="https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_legislative"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Detalii despre cerințele ANAF
              </a>
            </div>
          </div>
        )}

        {/* Quick Actions for Connected Users */}
        {spvStatus?.connected && isAdmin && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">Acțiuni Rapide</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <a
                href="/dashboard/invoices"
                className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-gray-100 transition"
              >
                <Send className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="font-medium text-gray-700">Trimite e-Facturi</div>
                  <div className="text-xs text-gray-500">Selectează facturile și trimite-le la ANAF</div>
                </div>
              </a>
              <a
                href="/dashboard/reports"
                className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-gray-100 transition"
              >
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="font-medium text-gray-700">Generează SAF-T</div>
                  <div className="text-xs text-gray-500">Generează și trimite raportul D406</div>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Securitate și Autentificare
        </h2>

        {/* MFA Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3">Autentificare Multi-Factor (MFA)</h3>
          {mfaLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Se încarcă statusul MFA...
            </div>
          ) : mfaStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mfaStatus.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={mfaStatus.enabled ? 'text-green-700' : 'text-red-700'}>
                    {mfaStatus.enabled ? 'MFA Activată' : 'MFA Dezactivată'}
                  </span>
                </div>
                {mfaStatus.enabled && mfaStatus.lastUsed && (
                  <div className="text-sm text-gray-600">
                    Ultima utilizare: {new Date(mfaStatus.lastUsed).toLocaleDateString('ro-RO')}
                  </div>
                )}
              </div>

              {mfaStatus.enabled && (
                <div className="text-sm text-gray-600">
                  <div>Coduri de rezervă disponibile: {mfaStatus.backupCodesCount}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleRegenerateBackupCodes}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      Regenerează Coduri
                    </button>
                    <button
                      onClick={handleDisableMfa}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    >
                      Dezactivează MFA
                    </button>
                  </div>
                </div>
              )}

              {!mfaStatus.enabled && (
                <button
                  onClick={() => setShowMfaSetup(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  Activează MFA
                </button>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Nu se poate încărca statusul MFA</div>
          )}
        </div>

        {/* MFA Setup Modal */}
        {showMfaSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <MFASetup
                onComplete={handleMfaSetupComplete}
                onCancel={() => setShowMfaSetup(false)}
              />
            </div>
          </div>
        )}

        {/* Backup Codes Modal */}
        {showBackupCodes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <BackupCodes
                codes={backupCodes}
                onRegenerate={handleRegenerateBackupCodes}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        {user && (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Name</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Role</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                user.role === 'ACCOUNTANT' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {user.role}
              </span>
            </div>
            {user.company && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Company</span>
                <span className="font-medium">{user.company}</span>
              </div>
            )}
            {user.cui && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">CUI</span>
                <span className="font-medium">{user.cui}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-600" />
          Preferinte Notificari
        </h2>
        <p className="text-gray-600 mb-4">
          Configureaza ce tipuri de notificari email doresti sa primesti.
        </p>

        {/* Notification Preferences Message */}
        {notifPrefsMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            notifPrefsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {notifPrefsMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {notifPrefsMessage.text}
          </div>
        )}

        {notifPrefsLoading ? (
          <div className="flex items-center gap-2 text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Se incarca preferintele...
          </div>
        ) : notificationPrefs ? (
          <div className="space-y-4">
            {/* Invoice Reminders */}
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <div className="font-medium text-gray-700">Memento-uri Facturi</div>
                <div className="text-sm text-gray-500">Primeste notificari inainte de scadenta facturilor</div>
              </div>
              <button
                onClick={() => updateNotificationPreference('invoiceReminders', !notificationPrefs.email.invoiceReminders)}
                disabled={notifPrefsSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationPrefs.email.invoiceReminders ? 'bg-orange-600' : 'bg-gray-200'
                } ${notifPrefsSaving ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPrefs.email.invoiceReminders ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Overdue Alerts */}
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <div className="font-medium text-gray-700">Alerte Facturi Restante</div>
                <div className="text-sm text-gray-500">Primeste notificari pentru facturile neplătite la timp</div>
              </div>
              <button
                onClick={() => updateNotificationPreference('overdueAlerts', !notificationPrefs.email.overdueAlerts)}
                disabled={notifPrefsSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationPrefs.email.overdueAlerts ? 'bg-orange-600' : 'bg-gray-200'
                } ${notifPrefsSaving ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPrefs.email.overdueAlerts ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Compliance Deadlines */}
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <div className="font-medium text-gray-700">Termene Conformitate</div>
                <div className="text-sm text-gray-500">Alerte pentru termene SAF-T, e-Factura si alte obligatii ANAF</div>
              </div>
              <button
                onClick={() => updateNotificationPreference('complianceDeadlines', !notificationPrefs.email.complianceDeadlines)}
                disabled={notifPrefsSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationPrefs.email.complianceDeadlines ? 'bg-orange-600' : 'bg-gray-200'
                } ${notifPrefsSaving ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPrefs.email.complianceDeadlines ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Weekly Reports */}
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <div className="font-medium text-gray-700">Rapoarte Saptamanale</div>
                <div className="text-sm text-gray-500">Sumar saptamanal cu activitatea contului tau</div>
              </div>
              <button
                onClick={() => updateNotificationPreference('weeklyReports', !notificationPrefs.email.weeklyReports)}
                disabled={notifPrefsSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationPrefs.email.weeklyReports ? 'bg-orange-600' : 'bg-gray-200'
                } ${notifPrefsSaving ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPrefs.email.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* System Alerts */}
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-gray-700">Alerte de Sistem</div>
                <div className="text-sm text-gray-500">Notificari e-Factura (acceptate/respinse) si actualizari sistem</div>
              </div>
              <button
                onClick={() => updateNotificationPreference('systemAlerts', !notificationPrefs.email.systemAlerts)}
                disabled={notifPrefsSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationPrefs.email.systemAlerts ? 'bg-orange-600' : 'bg-gray-200'
                } ${notifPrefsSaving ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPrefs.email.systemAlerts ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span><strong>Nota:</strong> Notificarile critice de securitate (resetare parola, confirmare cont) nu pot fi dezactivate.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Nu s-au putut incarca preferintele</div>
        )}
      </div>

      {/* GDPR Data Export Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          GDPR - Date Personale
        </h2>
        <p className="text-gray-600 mb-4">
          Conform GDPR (UE) 2016/679, aveti dreptul sa exportati sau sa solicitati stergerea datelor personale.
        </p>

        {/* Export Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Date (Art. 20 - Portabilitatea datelor)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Descarcati o copie a tuturor datelor dumneavoastra personale stocate in sistem.
          </p>

          {!gdprData ? (
            <button
              onClick={handleExportData}
              disabled={exportingData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {exportingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Se pregatesc datele...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Pregateste Export
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 mb-3">
                <CheckCircle className="w-5 h-5" />
                <span>Datele sunt pregatite pentru descarcare</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadJson}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Descarca JSON
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  <FileText className="w-4 h-4" />
                  Descarca Raport HTML
                </button>
                <button
                  onClick={() => setGdprData(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                >
                  Inchide
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Section */}
        <div className="p-4 bg-red-50 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2 text-red-700">
            <Trash2 className="w-4 h-4" />
            Stergere Date (Art. 17 - Dreptul la uitare)
          </h3>
          <p className="text-sm text-red-600 mb-4">
            Solicitati stergerea tuturor datelor personale. Aceasta actiune este ireversibila.
          </p>

          {deletionRequested ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Cererea de stergere a fost trimisa. Veti fi contactat in 30 de zile.</span>
            </div>
          ) : showDeleteConfirm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Sunteti sigur? Aceasta actiune nu poate fi anulata.</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteRequest}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Da, sterge datele mele
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                >
                  Anuleaza
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition"
            >
              <Trash2 className="w-4 h-4" />
              Solicita Stergere Date
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

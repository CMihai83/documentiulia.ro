'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Key,
  Mail,
  Building2,
  RefreshCw,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Unlink,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface SmartBillStatus {
  connected: boolean;
  lastSync: string | null;
}

interface SmartBillSeries {
  series: string[];
  error?: string;
}

export default function SmartBillIntegrationPage() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<SmartBillStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [credentials, setCredentials] = useState({
    email: '',
    apiKey: '',
    companyVat: '',
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v1/integrations/smartbill/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.connected) {
          fetchSeries();
        }
      }
    } catch (err) {
      console.error('Failed to fetch SmartBill status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async () => {
    setLoadingSeries(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v1/integrations/smartbill/series', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: SmartBillSeries = await res.json();
        setSeries(data.series || []);
      }
    } catch (err) {
      console.error('Failed to fetch series:', err);
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.email || !credentials.apiKey || !credentials.companyVat) {
      setMessage({ type: 'error', text: 'Completați toate câmpurile!' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v1/integrations/smartbill/test-connection', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la testarea conexiunii' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentials.email || !credentials.apiKey || !credentials.companyVat) {
      setMessage({ type: 'error', text: 'Completați toate câmpurile!' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v1/integrations/smartbill/credentials', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setStatus({ connected: true, lastSync: null });
        fetchSeries();
        setCredentials({ email: '', apiKey: '', companyVat: '' });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la salvarea credențialelor' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    // Navigate to disconnect confirmation page
    router.push('/dashboard/settings/integrations/smartbill/disconnect');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/settings/integrations"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Înapoi la Integrări
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
            <img
              src="https://www.smartbill.ro/images/logo.png"
              alt="SmartBill"
              className="h-10 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <FileText className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SmartBill</h1>
            <p className="text-gray-500">Sincronizare facturi și gestiune stocuri</p>
          </div>
          {status?.connected && (
            <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Conectat
            </span>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Connected State */}
      {status?.connected ? (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Status Integrare</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Stare</p>
                <p className="font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Activ
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Ultima sincronizare</p>
                <p className="font-medium text-gray-900">
                  {status.lastSync
                    ? new Date(status.lastSync).toLocaleString('ro-RO')
                    : 'Niciodată'}
                </p>
              </div>
            </div>
          </div>

          {/* Available Series */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Serii Facturi Disponibile</h2>
              <button
                onClick={fetchSeries}
                disabled={loadingSeries}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSeries ? 'animate-spin' : ''}`} />
                Actualizează
              </button>
            </div>
            {loadingSeries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : series.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {series.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nu au fost găsite serii de facturi</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Acțiuni Rapide</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Link
                href="/dashboard/invoices"
                className="p-4 border rounded-lg hover:bg-gray-50 transition flex items-center gap-3"
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Facturi</p>
                  <p className="text-sm text-gray-500">Sincronizează facturi</p>
                </div>
              </Link>
              <button className="p-4 border rounded-lg hover:bg-gray-50 transition flex items-center gap-3 text-left">
                <Download className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Import</p>
                  <p className="text-sm text-gray-500">Importă din SmartBill</p>
                </div>
              </button>
              <button className="p-4 border rounded-lg hover:bg-gray-50 transition flex items-center gap-3 text-left">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Sincronizare</p>
                  <p className="text-sm text-gray-500">Sync complet</p>
                </div>
              </button>
            </div>
          </div>

          {/* Disconnect */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Deconectare</h2>
            <p className="text-sm text-gray-500 mb-4">
              Deconectarea va opri sincronizarea cu SmartBill. Datele existente vor fi păstrate.
            </p>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-2"
            >
              <Unlink className="h-4 w-4" />
              Deconectează SmartBill
            </button>
          </div>
        </div>
      ) : (
        /* Not Connected - Setup Form */
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Configurare SmartBill</h2>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Cum obțineți credențialele:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Accesați contul SmartBill → Setări → API</li>
                <li>Copiați Token-ul API (cheia API)</li>
                <li>Introduceți email-ul de conectare SmartBill</li>
                <li>Introduceți CUI-ul companiei din SmartBill</li>
              </ol>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline h-4 w-4 mr-1" />
                Email SmartBill
              </label>
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="email@companie.ro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Key className="inline h-4 w-4 mr-1" />
                Cheie API (Token)
              </label>
              <input
                type="password"
                value={credentials.apiKey}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Company VAT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="inline h-4 w-4 mr-1" />
                CUI Companie
              </label>
              <input
                type="text"
                value={credentials.companyVat}
                onChange={(e) => setCredentials({ ...credentials, companyVat: e.target.value })}
                placeholder="RO12345678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Testează conexiunea
              </button>
              <button
                onClick={handleSaveCredentials}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Conectează SmartBill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

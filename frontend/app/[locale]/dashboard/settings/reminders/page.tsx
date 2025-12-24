'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import {
  Bell,
  Clock,
  Mail,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  Plus,
  X,
  FileText,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface ReminderSettings {
  enabled: boolean;
  daysBeforeDue: number[];
  daysAfterDue: number[];
  includeInvoicePdf: boolean;
  customMessage: string;
}

interface ReminderStats {
  totalSent: number;
  sentToday: number;
  sentThisWeek: number;
  sentThisMonth: number;
  failedCount: number;
  byType: {
    before_due: number;
    on_due: number;
    after_due: number;
  };
}

interface ReminderLog {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  reminderType: string;
  dayOffset: number;
  sentAt: string;
  recipientEmail: string;
  status: string;
}

export default function ReminderSettingsPage() {
  const t = useTranslations('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    daysBeforeDue: [7, 3, 1],
    daysAfterDue: [1, 7, 14, 30],
    includeInvoicePdf: true,
    customMessage: '',
  });
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'stats'>('settings');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes, logsRes] = await Promise.all([
        api.get<ReminderSettings>('/invoices/reminders/settings'),
        api.get<ReminderStats>('/invoices/reminders/stats'),
        api.get<{ logs: ReminderLog[] }>('/invoices/reminders/logs?limit=20'),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (logsRes.data?.logs) setLogs(logsRes.data.logs);
    } catch (error) {
      console.error('Error fetching reminder data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/invoices/reminders/settings', settings);
      setNotification({ type: 'success', message: 'Setarile au fost salvate cu succes!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification({ type: 'error', message: 'Eroare la salvarea setarilor' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const addDayBefore = () => {
    const newDay = Math.max(...settings.daysBeforeDue, 0) + 7;
    if (!settings.daysBeforeDue.includes(newDay)) {
      setSettings({
        ...settings,
        daysBeforeDue: [...settings.daysBeforeDue, newDay].sort((a, b) => b - a),
      });
    }
  };

  const removeDayBefore = (day: number) => {
    setSettings({
      ...settings,
      daysBeforeDue: settings.daysBeforeDue.filter(d => d !== day),
    });
  };

  const addDayAfter = () => {
    const newDay = Math.max(...settings.daysAfterDue, 0) + 7;
    if (!settings.daysAfterDue.includes(newDay)) {
      setSettings({
        ...settings,
        daysAfterDue: [...settings.daysAfterDue, newDay].sort((a, b) => a - b),
      });
    }
  };

  const removeDayAfter = (day: number) => {
    setSettings({
      ...settings,
      daysAfterDue: settings.daysAfterDue.filter(d => d !== day),
    });
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'before_due': return 'Inainte de scadenta';
      case 'on_due': return 'La scadenta';
      case 'after_due': return 'Dupa scadenta';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary-600" />
          Reamintiri Facturi
        </h1>
        <p className="text-gray-500 mt-1">
          Configureaza reamintirile automate pentru facturile neplatite
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'settings'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          Setari
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'logs'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Istoric
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'stats'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Statistici
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Reamintiri automate</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Trimite automat reamintiri pentru facturile neplatite
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {/* Days Before Due */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Zile inainte de scadenta
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Trimite reamintiri cu X zile inainte de data scadentei
                </p>
              </div>
              <button
                onClick={addDayBefore}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
              >
                <Plus className="w-4 h-4" />
                Adauga
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.daysBeforeDue.map((day) => (
                <div
                  key={day}
                  className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200"
                >
                  <span>{day} {day === 1 ? 'zi' : 'zile'}</span>
                  <button
                    onClick={() => removeDayBefore(day)}
                    className="hover:text-yellow-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {settings.daysBeforeDue.length === 0 && (
                <p className="text-sm text-gray-400">Nu sunt configurate reamintiri</p>
              )}
            </div>
          </div>

          {/* Days After Due */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Zile dupa scadenta (restante)
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Trimite reamintiri pentru facturile restante
                </p>
              </div>
              <button
                onClick={addDayAfter}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
              >
                <Plus className="w-4 h-4" />
                Adauga
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.daysAfterDue.map((day) => (
                <div
                  key={day}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200"
                >
                  <span>{day} {day === 1 ? 'zi' : 'zile'}</span>
                  <button
                    onClick={() => removeDayAfter(day)}
                    className="hover:text-red-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {settings.daysAfterDue.length === 0 && (
                <p className="text-sm text-gray-400">Nu sunt configurate reamintiri</p>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Optiuni suplimentare</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.includeInvoicePdf}
                onChange={(e) => setSettings({ ...settings, includeInvoicePdf: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                Ataseaza PDF-ul facturii la email
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mesaj personalizat (optional)
              </label>
              <textarea
                value={settings.customMessage}
                onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
                placeholder="Adauga un mesaj care va fi inclus in toate reamintirile..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salveaza setarile
            </button>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data trimiterii</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <Mail className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      Nu au fost trimise reamintiri inca
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{log.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{log.partnerName}</div>
                        <div className="text-xs text-gray-400">{log.recipientEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                          log.reminderType === 'before_due'
                            ? 'bg-yellow-100 text-yellow-700'
                            : log.reminderType === 'on_due'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {getReminderTypeLabel(log.reminderType)}
                          {log.dayOffset > 0 && ` (${log.dayOffset}z)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(log.sentAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          log.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 'sent' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {log.status === 'sent' ? 'Trimis' : 'Eroare'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total trimise</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSent}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Astazi</p>
              <p className="text-2xl font-bold text-primary-600">{stats.sentToday}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Saptamana aceasta</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sentThisWeek}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Luna aceasta</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sentThisMonth}</p>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reamintiri pe tip</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Inainte de scadenta
                </span>
                <span className="font-semibold">{stats.byType.before_due}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  La scadenta
                </span>
                <span className="font-semibold">{stats.byType.on_due}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Dupa scadenta (restante)
                </span>
                <span className="font-semibold">{stats.byType.after_due}</span>
              </div>
            </div>
          </div>

          {/* Failed Count */}
          {stats.failedCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{stats.failedCount} reamintiri esuate</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Verifica adresele de email ale clientilor si incearca din nou
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

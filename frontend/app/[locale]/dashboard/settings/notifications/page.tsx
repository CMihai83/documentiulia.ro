'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ArrowLeft, Save, Loader2, Bell, Mail, MessageSquare, Calendar, AlertTriangle, FileText, Users } from 'lucide-react';
import Link from 'next/link';

interface NotificationSettings {
  email: {
    invoiceReminders: boolean;
    paymentReceived: boolean;
    vatDeadlines: boolean;
    saftReminders: boolean;
    securityAlerts: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
  };
  push: {
    invoiceReminders: boolean;
    paymentReceived: boolean;
    vatDeadlines: boolean;
    saftReminders: boolean;
    securityAlerts: boolean;
  };
  sms: {
    criticalAlerts: boolean;
    vatDeadlines: boolean;
  };
}

export default function NotificationsSettingsPage() {
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      invoiceReminders: true,
      paymentReceived: true,
      vatDeadlines: true,
      saftReminders: true,
      securityAlerts: true,
      weeklyReport: false,
      monthlyReport: true,
    },
    push: {
      invoiceReminders: true,
      paymentReceived: true,
      vatDeadlines: true,
      saftReminders: false,
      securityAlerts: true,
    },
    sms: {
      criticalAlerts: false,
      vatDeadlines: false,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Simulate API call
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Preferintele de notificare au fost salvate!' });
      setSaving(false);
    }, 1000);
  };

  const NotificationToggle = ({
    checked,
    onChange,
    label,
    description
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
    description: string;
  }) => (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificari</h1>
          <p className="text-gray-600">Configureaza alertele si comunicarile</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Notificari Email</h3>
          </div>
          <div className="divide-y">
            <NotificationToggle
              checked={settings.email.invoiceReminders}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, invoiceReminders: !settings.email.invoiceReminders }
              })}
              label="Facturi restante"
              description="Primeste remindere pentru facturile neplatite"
            />
            <NotificationToggle
              checked={settings.email.paymentReceived}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, paymentReceived: !settings.email.paymentReceived }
              })}
              label="Plati primite"
              description="Confirmare la primirea platilor"
            />
            <NotificationToggle
              checked={settings.email.vatDeadlines}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, vatDeadlines: !settings.email.vatDeadlines }
              })}
              label="Termene TVA"
              description="Alerte pentru termenele de depunere TVA"
            />
            <NotificationToggle
              checked={settings.email.saftReminders}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, saftReminders: !settings.email.saftReminders }
              })}
              label="Rapoarte SAF-T D406"
              description="Remindere pentru raportare SAF-T lunara"
            />
            <NotificationToggle
              checked={settings.email.securityAlerts}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, securityAlerts: !settings.email.securityAlerts }
              })}
              label="Alerte securitate"
              description="Notificari pentru logari noi sau activitati suspecte"
            />
            <NotificationToggle
              checked={settings.email.weeklyReport}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, weeklyReport: !settings.email.weeklyReport }
              })}
              label="Raport saptamanal"
              description="Sumar saptamanal al activitatii"
            />
            <NotificationToggle
              checked={settings.email.monthlyReport}
              onChange={() => setSettings({
                ...settings,
                email: { ...settings.email, monthlyReport: !settings.email.monthlyReport }
              })}
              label="Raport lunar"
              description="Raport detaliat lunar cu statistici"
            />
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Notificari Push</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Notificari in timp real in browser
          </p>
          <div className="divide-y">
            <NotificationToggle
              checked={settings.push.invoiceReminders}
              onChange={() => setSettings({
                ...settings,
                push: { ...settings.push, invoiceReminders: !settings.push.invoiceReminders }
              })}
              label="Facturi restante"
              description="Alerte pentru facturile cu termen depasit"
            />
            <NotificationToggle
              checked={settings.push.paymentReceived}
              onChange={() => setSettings({
                ...settings,
                push: { ...settings.push, paymentReceived: !settings.push.paymentReceived }
              })}
              label="Plati primite"
              description="Notificare instantanee la primirea platilor"
            />
            <NotificationToggle
              checked={settings.push.vatDeadlines}
              onChange={() => setSettings({
                ...settings,
                push: { ...settings.push, vatDeadlines: !settings.push.vatDeadlines }
              })}
              label="Termene TVA"
              description="Remindere inainte de termenele ANAF"
            />
            <NotificationToggle
              checked={settings.push.securityAlerts}
              onChange={() => setSettings({
                ...settings,
                push: { ...settings.push, securityAlerts: !settings.push.securityAlerts }
              })}
              label="Alerte securitate"
              description="Alerte critice pentru securitatea contului"
            />
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Notificari SMS</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            SMS-uri pentru alerte critice (poate genera costuri suplimentare)
          </p>
          <div className="divide-y">
            <NotificationToggle
              checked={settings.sms.criticalAlerts}
              onChange={() => setSettings({
                ...settings,
                sms: { ...settings.sms, criticalAlerts: !settings.sms.criticalAlerts }
              })}
              label="Alerte critice"
              description="Notificari SMS pentru situatii urgente"
            />
            <NotificationToggle
              checked={settings.sms.vatDeadlines}
              onChange={() => setSettings({
                ...settings,
                sms: { ...settings.sms, vatDeadlines: !settings.sms.vatDeadlines }
              })}
              label="Termene TVA"
              description="SMS cu 1 zi inainte de termenul ANAF"
            />
          </div>
        </div>

        {/* Important Dates */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800">Termene importante ANAF</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• TVA lunar: pana pe 25 luna urmatoare</li>
                <li>• SAF-T D406: lunar, pana pe ultima zi a lunii urmatoare</li>
                <li>• e-Factura: in termen de 5 zile lucratoare de la emitere</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salveaza preferinte
          </button>
        </div>
      </form>
    </div>
  );
}

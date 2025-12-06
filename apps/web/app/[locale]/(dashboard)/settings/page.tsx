'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
// Mock user data for development (replace with real auth later)
import {
  Settings,
  User,
  Building2,
  Bell,
  Globe,
  Palette,
  Shield,
  CreditCard,
  Link,
  HelpCircle,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Check,
  Mail,
  Phone,
  MapPin,
  Hash,
  Banknote,
  Save,
  Loader2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCompanyStore } from '@/lib/store/company-store';

type SettingsTab = 'profile' | 'company' | 'notifications' | 'appearance' | 'integrations' | 'billing';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: typeof User;
  description: string;
}

const tabs: TabConfig[] = [
  { id: 'profile', label: 'Profil', icon: User, description: 'Informații personale și securitate' },
  { id: 'company', label: 'Date Firmă', icon: Building2, description: 'Informații despre companie' },
  { id: 'notifications', label: 'Notificări', icon: Bell, description: 'Preferințe de notificare' },
  { id: 'appearance', label: 'Aspect', icon: Palette, description: 'Tema și personalizare' },
  { id: 'integrations', label: 'Integrări', icon: Link, description: 'Conexiuni externe' },
  { id: 'billing', label: 'Abonament', icon: CreditCard, description: 'Plan și facturare' },
];

// Mock user for development
const mockUser = {
  firstName: 'Admin',
  lastName: 'DocumentIulia',
  fullName: 'Admin DocumentIulia',
  emailAddresses: [{ emailAddress: 'admin@documentiulia.ro' }],
};

export default function SettingsPage() {
  const t = useTranslations('settings');
  const user = mockUser;
  const { theme, setTheme } = useTheme();
  const { selectedCompany } = useCompanyStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    emailInvoicePaid: true,
    emailInvoiceOverdue: true,
    emailFiscalDeadlines: true,
    pushInvoicePaid: false,
    pushInvoiceOverdue: true,
    pushFiscalDeadlines: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user?.fullName || 'Utilizator'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {user?.emailAddresses?.[0]?.emailAddress || ''}
                </p>
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  Schimbă poza de profil
                </button>
              </div>
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prenume
                </label>
                <input
                  type="text"
                  defaultValue={user?.firstName || ''}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nume
                </label>
                <input
                  type="text"
                  defaultValue={user?.lastName || ''}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user?.emailAddresses?.[0]?.emailAddress || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Emailul este gestionat de Clerk și nu poate fi modificat aici
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  placeholder="+40 7XX XXX XXX"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Security Section */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Securitate
              </h4>
              <div className="space-y-4">
                <button className="flex items-center justify-between w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Schimbă parola</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Actualizează parola contului</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button className="flex items-center justify-between w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Autentificare în doi pași</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Adaugă un nivel suplimentar de securitate</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Firma selectată: <strong>{selectedCompany?.name || 'Nicio firmă selectată'}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Denumire
                </label>
                <input
                  type="text"
                  defaultValue={selectedCompany?.name || ''}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CUI
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    defaultValue={selectedCompany?.cui || ''}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nr. Reg. Comerț
                </label>
                <input
                  type="text"
                  defaultValue={selectedCompany?.regCom || ''}
                  placeholder="J40/1234/2020"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresă
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    rows={2}
                    placeholder="Str. Exemplu Nr. 10, București"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email firmă
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="contact@firma.ro"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefon firmă
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+40 21 XXX XXXX"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IBAN
                </label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="RO49AAAA1B31007593840000"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={selectedCompany?.vatPayer || false}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Firmă plătitoare de TVA</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <p className="text-gray-500 dark:text-gray-400">
              Configurează cum și când primești notificări.
            </p>

            {/* Email Notifications */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notificări Email
              </h4>
              <div className="space-y-3">
                {[
                  { key: 'emailInvoicePaid', label: 'Factură plătită', description: 'Când un client plătește o factură' },
                  { key: 'emailInvoiceOverdue', label: 'Factură restantă', description: 'Când o factură depășește termenul' },
                  { key: 'emailFiscalDeadlines', label: 'Termene fiscale', description: 'Înainte de deadlines importante' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-5.5 ml-0.5'
                            : 'translate-x-0.5'
                        }`} style={{ marginLeft: notifications[item.key as keyof typeof notifications] ? '22px' : '2px' }} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Push Notifications */}
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificări Push
              </h4>
              <div className="space-y-3">
                {[
                  { key: 'pushInvoicePaid', label: 'Factură plătită', description: 'Notificare instant pe dispozitiv' },
                  { key: 'pushInvoiceOverdue', label: 'Factură restantă', description: 'Alert când o factură devine restantă' },
                  { key: 'pushFiscalDeadlines', label: 'Termene fiscale', description: 'Reminder-uri pentru termene' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5`} style={{ marginLeft: notifications[item.key as keyof typeof notifications] ? '22px' : '2px' }} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Tema
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Luminoasă', icon: Sun },
                  { value: 'dark', label: 'Întunecată', icon: Moon },
                  { value: 'system', label: 'Sistem', icon: Monitor },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                      theme === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <option.icon className={`w-6 h-6 ${
                      theme === option.value
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      theme === option.value
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {option.label}
                    </span>
                    {theme === option.value && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Limbă
              </h4>
              <select className="w-full max-w-xs px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ro">Română</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Format dată
              </h4>
              <select className="w-full max-w-xs px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="dd/mm/yyyy">DD/MM/YYYY (31/12/2024)</option>
                <option value="mm/dd/yyyy">MM/DD/YYYY (12/31/2024)</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD (2024-12-31)</option>
              </select>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <p className="text-gray-500 dark:text-gray-400">
              Conectează DocumentIulia cu alte servicii pentru a automatiza fluxurile de lucru.
            </p>

            {[
              { name: 'ANAF e-Factura', description: 'Transmite și primește facturi electronic', connected: true, icon: '🏛️' },
              { name: 'ANAF SPV', description: 'Spațiul Privat Virtual pentru declarații', connected: true, icon: '📋' },
              { name: 'Banca Transilvania', description: 'Sincronizare automată tranzacții', connected: false, icon: '🏦' },
              { name: 'ING Bank', description: 'Import extrase de cont', connected: false, icon: '🏦' },
              { name: 'WooCommerce', description: 'Import comenzi din magazinul online', connected: false, icon: '🛒' },
              { name: 'Shopify', description: 'Sincronizare produse și comenzi', connected: false, icon: '🛍️' },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
                    {integration.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{integration.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{integration.description}</p>
                  </div>
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    integration.connected
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {integration.connected ? 'Conectat' : 'Conectează'}
                </button>
              </div>
            ))}
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Plan curent</p>
                  <h3 className="text-2xl font-bold mt-1">Profesional</h3>
                  <p className="text-blue-100 mt-2">49 RON / lună</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100">Următoarea plată</p>
                  <p className="font-semibold">1 Februarie 2025</p>
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Include:</h4>
              <ul className="space-y-3">
                {[
                  'Facturi nelimitate',
                  'OCR bonuri nelimitat',
                  'e-Factura complet',
                  'SAF-T D406',
                  'Prognoze AI',
                  'Conectare bancară',
                  'Suport prioritar',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Check className="w-5 h-5 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Metodă de plată</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-700 to-blue-900 rounded flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">•••• •••• •••• 4242</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Expiră 12/2026</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium">
                  Schimbă
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Upgrade la Enterprise
              </button>
              <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Vezi istoricul facturilor
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Setări
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gestionează preferințele contului și ale companiei
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <div>
                  <p className="font-medium">{tab.label}</p>
                  <p className="text-xs opacity-70">{tab.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            {renderContent()}

            {/* Save Button */}
            {(activeTab === 'profile' || activeTab === 'company' || activeTab === 'notifications') && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvează modificările
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

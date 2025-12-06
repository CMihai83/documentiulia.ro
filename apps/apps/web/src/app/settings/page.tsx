"use client";

import { useState } from "react";
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Globe,
  FileText,
  Key,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  ChevronRight,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AppLayout, MobileNav } from "@/components/layout";

type SettingsSection = "profile" | "company" | "billing" | "notifications" | "security" | "appearance" | "integrations";

const settingsSections = [
  { id: "profile" as SettingsSection, label: "Profil", icon: User, description: "Informații personale" },
  { id: "company" as SettingsSection, label: "Companie", icon: Building2, description: "Date firmă" },
  { id: "billing" as SettingsSection, label: "Facturare", icon: CreditCard, description: "Planuri și plăți" },
  { id: "notifications" as SettingsSection, label: "Notificări", icon: Bell, description: "Alerte și email-uri" },
  { id: "security" as SettingsSection, label: "Securitate", icon: Shield, description: "Parolă și 2FA" },
  { id: "appearance" as SettingsSection, label: "Aspect", icon: Palette, description: "Tema și limbă" },
  { id: "integrations" as SettingsSection, label: "Integrări", icon: Globe, description: "ANAF, SPV, bănci" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: "Ion",
    lastName: "Popescu",
    email: "ion.popescu@example.com",
    phone: "+40 721 123 456",
    role: "Administrator",
  });

  // Company form state
  const [company, setCompany] = useState({
    name: "SC DocumentIulia SRL",
    cui: "RO12345678",
    regCom: "J40/1234/2020",
    address: "Str. Contabilității nr. 10",
    city: "București",
    county: "București",
    postalCode: "010101",
    iban: "RO49BTRLRONCRT0123456789",
    bank: "Banca Transilvania",
    vatPayer: true,
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailInvoices: true,
    emailReports: true,
    emailAlerts: true,
    pushNotifications: true,
    weeklyDigest: false,
    taxDeadlines: true,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "ro",
    dateFormat: "DD.MM.YYYY",
    currency: "RON",
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Profil Utilizator</h2>
              <p className="text-slate-500">Gestionează informațiile tale personale</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-xl">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50 transition">
                  <Camera className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-slate-500">{profile.role}</p>
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                  Schimbă fotografia
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Prenume</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nume</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "company":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Informații Companie</h2>
              <p className="text-slate-500">Datele fiscale ale firmei tale</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Denumire Firmă</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">CUI / Cod Fiscal</label>
                <input
                  type="text"
                  value={company.cui}
                  onChange={(e) => setCompany({ ...company, cui: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nr. Reg. Comerțului</label>
                <input
                  type="text"
                  value={company.regCom}
                  onChange={(e) => setCompany({ ...company, regCom: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Adresă</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Oraș</label>
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Județ</label>
                <input
                  type="text"
                  value={company.county}
                  onChange={(e) => setCompany({ ...company, county: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">IBAN Principal</label>
                <input
                  type="text"
                  value={company.iban}
                  onChange={(e) => setCompany({ ...company, iban: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bancă</label>
                <input
                  type="text"
                  value={company.bank}
                  onChange={(e) => setCompany({ ...company, bank: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={company.vatPayer}
                    onChange={(e) => setCompany({ ...company, vatPayer: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Plătitor de TVA</span>
                </label>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Preferințe Notificări</h2>
              <p className="text-slate-500">Controlează cum primești alertele</p>
            </div>

            <div className="space-y-4">
              {[
                { key: "emailInvoices", label: "Notificări facturi noi", desc: "Primește email la primirea facturilor" },
                { key: "emailReports", label: "Rapoarte generate", desc: "Notificare când rapoartele sunt gata" },
                { key: "emailAlerts", label: "Alerte urgente", desc: "Erori SPV, respingeri ANAF" },
                { key: "pushNotifications", label: "Notificări push", desc: "Alerte în browser" },
                { key: "weeklyDigest", label: "Rezumat săptămânal", desc: "Email cu rezumatul activității" },
                { key: "taxDeadlines", label: "Termene fiscale", desc: "Reamintiri pentru declarații" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[item.key as keyof typeof notifications]}
                      onChange={(e) =>
                        setNotifications({ ...notifications, [item.key]: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Securitate</h2>
              <p className="text-slate-500">Protejează-ți contul</p>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Parolă</p>
                      <p className="text-sm text-slate-500">Ultima modificare: acum 30 de zile</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    Schimbă parola
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Autentificare în doi pași (2FA)</p>
                      <p className="text-sm text-slate-500">Adaugă un nivel suplimentar de securitate</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    Inactiv
                  </span>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Activează 2FA
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-xl">
                <h3 className="font-medium text-slate-900 mb-4">Sesiuni active</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Chrome pe Windows</p>
                      <p className="text-sm text-slate-500">București, România • Activ acum</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                      Curent
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Safari pe iPhone</p>
                      <p className="text-sm text-slate-500">București, România • Acum 2 ore</p>
                    </div>
                    <button className="text-sm text-red-600 hover:text-red-700">
                      Deconectează
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Aspect și Regionale</h2>
              <p className="text-slate-500">Personalizează interfața</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Temă</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "light", label: "Luminoasă", preview: "bg-white" },
                    { id: "dark", label: "Întunecată", preview: "bg-slate-900" },
                    { id: "system", label: "Sistem", preview: "bg-gradient-to-r from-white to-slate-900" },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setAppearance({ ...appearance, theme: theme.id })}
                      className={`p-4 rounded-xl border-2 transition ${
                        appearance.theme === theme.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className={`h-12 rounded-lg mb-3 ${theme.preview}`} />
                      <p className="text-sm font-medium text-slate-900">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Limbă</label>
                  <select
                    value={appearance.language}
                    onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ro">Română</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Format dată</label>
                  <select
                    value={appearance.dateFormat}
                    onChange={(e) => setAppearance({ ...appearance, dateFormat: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Integrări</h2>
              <p className="text-slate-500">Conectează servicii externe</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  name: "ANAF SPV",
                  description: "Sistemul Privat Virtual pentru e-Factura",
                  status: "connected",
                  icon: FileText,
                },
                {
                  name: "Banca Transilvania",
                  description: "Sincronizare automată extrase bancare",
                  status: "connected",
                  icon: CreditCard,
                },
                {
                  name: "BCR",
                  description: "Import tranzacții bancare",
                  status: "disconnected",
                  icon: CreditCard,
                },
                {
                  name: "Google Drive",
                  description: "Backup automat documente",
                  status: "disconnected",
                  icon: Globe,
                },
              ].map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-6 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <Icon className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{integration.name}</p>
                        <p className="text-sm text-slate-500">{integration.description}</p>
                      </div>
                    </div>
                    {integration.status === "connected" ? (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          <Check className="w-4 h-4" />
                          Conectat
                        </span>
                        <button className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg transition">
                          Setări
                        </button>
                      </div>
                    ) : (
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        Conectează
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Setări</h1>
          <p className="text-slate-500 mt-1">Gestionează contul și preferințele</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                        : "text-slate-600 hover:bg-slate-50 border-l-4 border-transparent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${isActive ? "text-blue-900" : "text-slate-900"}`}>
                        {section.label}
                      </p>
                      <p className={`text-xs ${isActive ? "text-blue-600" : "text-slate-500"}`}>
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-300"}`} />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              {renderContent()}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-5 h-5" />
                    <span>Modificările au fost salvate!</span>
                  </div>
                )}
                <div className="flex items-center gap-3 ml-auto">
                  <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    Anulează
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Se salvează...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvează modificările
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNav />
    </AppLayout>
  );
}

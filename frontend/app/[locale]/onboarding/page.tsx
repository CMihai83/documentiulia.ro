'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2, CreditCard, Users, FileText, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2, AlertCircle,
  Calculator, Banknote, UserPlus, Receipt
} from 'lucide-react';

// Types
interface CompanyDetails {
  name: string;
  cui: string;
  regCom: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  phone: string;
  email: string;
}

interface TaxConfig {
  vatPayer: boolean;
  vatRate: '21' | '11' | '5' | '0';
  taxRegime: 'normal' | 'micro' | 'nonprofit';
  anafCertificate: boolean;
  sagaIntegration: boolean;
}

interface BankDetails {
  bankName: string;
  bankAccount: string;
  swift: string;
  currency: 'RON' | 'EUR' | 'USD';
}

interface TeamMember {
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
}

interface OnboardingState {
  company: CompanyDetails;
  tax: TaxConfig;
  bank: BankDetails;
  team: TeamMember[];
  completed: boolean;
}

// Step components
const steps = [
  { id: 1, name: 'Companie', icon: Building2, description: 'Date firma' },
  { id: 2, name: 'Taxe', icon: Calculator, description: 'Configurare TVA' },
  { id: 3, name: 'Banca', icon: Banknote, description: 'Cont bancar' },
  { id: 4, name: 'Echipa', icon: UserPlus, description: 'Invita colegi' },
  { id: 5, name: 'Prima factura', icon: Receipt, description: 'Test platforma' },
];

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ro';

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [company, setCompany] = useState<CompanyDetails>({
    name: '',
    cui: '',
    regCom: '',
    address: '',
    city: '',
    county: '',
    postalCode: '',
    phone: '',
    email: '',
  });

  const [tax, setTax] = useState<TaxConfig>({
    vatPayer: true,
    vatRate: '21',
    taxRegime: 'normal',
    anafCertificate: false,
    sagaIntegration: false,
  });

  const [bank, setBank] = useState<BankDetails>({
    bankName: '',
    bankAccount: '',
    swift: '',
    currency: 'RON',
  });

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'viewer' as const });

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.company) setCompany(data.company);
        if (data.tax) setTax(data.tax);
        if (data.bank) setBank(data.bank);
        if (data.team) setTeam(data.team);
        if (data.currentStep) setCurrentStep(data.currentStep);
      } catch (e) {
        console.error('Failed to load onboarding progress:', e);
      }
    }
  }, []);

  // Save progress on change
  useEffect(() => {
    const data = { company, tax, bank, team, currentStep };
    localStorage.setItem('onboarding_progress', JSON.stringify(data));
  }, [company, tax, bank, team, currentStep]);

  // Fetch company data from ANAF by CUI
  const fetchCompanyFromANAF = async () => {
    if (!company.cui || company.cui.length < 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const cui = company.cui.replace(/^RO/i, '');
      const response = await fetch(`/api/anaf/company/${cui}`);

      if (response.ok) {
        const data = await response.json();
        setCompany(prev => ({
          ...prev,
          name: data.denumire || prev.name,
          address: data.adresa || prev.address,
          // Parse address components if available
        }));
      }
    } catch (e) {
      console.error('Failed to fetch from ANAF:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addTeamMember = () => {
    if (newMember.name && newMember.email) {
      setTeam([...team, { ...newMember }]);
      setNewMember({ name: '', email: '', role: 'viewer' });
    }
  };

  const removeTeamMember = (index: number) => {
    setTeam(team.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Save to backend
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, tax, bank, team }),
      });

      if (!response.ok) {
        throw new Error('Failed to save onboarding data');
      }

      // Clear local storage
      localStorage.removeItem('onboarding_progress');
      localStorage.setItem('onboarding_completed', 'true');

      // Redirect to dashboard
      router.push(`/${locale}/dashboard`);
    } catch (e) {
      setError('A aparut o eroare. Va rugam incercati din nou.');
      console.error('Onboarding error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bine ati venit in DocumentIulia
          </h1>
          <p className="text-gray-600">
            Configurati contul in cateva minute pentru a incepe
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all
                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                        ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                        ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                        {step.name}
                      </div>
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 mt-[-24px] ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* Step 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Datele Companiei</h2>
                  <p className="text-gray-500">Introduceti CUI-ul si completam automat</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CUI (Cod Unic de Inregistrare) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={company.cui}
                      onChange={(e) => setCompany({ ...company, cui: e.target.value })}
                      onBlur={fetchCompanyFromANAF}
                      placeholder="RO12345678"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={fetchCompanyFromANAF}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verifica ANAF'}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denumire Firma *
                  </label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    placeholder="SC Exemplu SRL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nr. Registrul Comertului
                  </label>
                  <input
                    type="text"
                    value={company.regCom}
                    onChange={(e) => setCompany({ ...company, regCom: e.target.value })}
                    placeholder="J40/1234/2020"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    placeholder="+40 721 123 456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresa
                  </label>
                  <input
                    type="text"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    placeholder="Str. Exemplu nr. 1, Sector 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Oras
                  </label>
                  <input
                    type="text"
                    value={company.city}
                    onChange={(e) => setCompany({ ...company, city: e.target.value })}
                    placeholder="Bucuresti"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judet
                  </label>
                  <input
                    type="text"
                    value={company.county}
                    onChange={(e) => setCompany({ ...company, county: e.target.value })}
                    placeholder="Bucuresti"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Firma
                  </label>
                  <input
                    type="email"
                    value={company.email}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    placeholder="contact@firma.ro"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cod Postal
                  </label>
                  <input
                    type="text"
                    value={company.postalCode}
                    onChange={(e) => setCompany({ ...company, postalCode: e.target.value })}
                    placeholder="010101"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tax Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Calculator className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Configurare Fiscala</h2>
                  <p className="text-gray-500">Setati regimul TVA si integrari</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium text-gray-900">Platitor de TVA</div>
                      <div className="text-sm text-gray-500">Firma este inregistrata ca platitor de TVA</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tax.vatPayer}
                      onChange={(e) => setTax({ ...tax, vatPayer: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>

                {tax.vatPayer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cota TVA Principala (Legea 141/2025)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: '21', label: '21%', desc: 'Standard' },
                        { value: '11', label: '11%', desc: 'Redus' },
                        { value: '5', label: '5%', desc: 'Super-redus' },
                        { value: '0', label: '0%', desc: 'Scutit' },
                      ].map((rate) => (
                        <button
                          key={rate.value}
                          type="button"
                          onClick={() => setTax({ ...tax, vatRate: rate.value as any })}
                          className={`p-3 border rounded-lg text-center transition ${
                            tax.vatRate === rate.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xl font-bold">{rate.label}</div>
                          <div className="text-xs text-gray-500">{rate.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regim Fiscal
                  </label>
                  <select
                    value={tax.taxRegime}
                    onChange={(e) => setTax({ ...tax, taxRegime: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="normal">Normal (Impozit pe profit 16%)</option>
                    <option value="micro">Microintreprindere (1% sau 3%)</option>
                    <option value="nonprofit">Non-profit / ONG</option>
                  </select>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Integrari ANAF</h3>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div>
                        <div className="font-medium text-gray-900">Certificat Digital SPV</div>
                        <div className="text-sm text-gray-500">Pentru e-Factura si SAF-T D406</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={tax.anafCertificate}
                        onChange={(e) => setTax({ ...tax, anafCertificate: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <div>
                        <div className="font-medium text-gray-900">Integrare SAGA</div>
                        <div className="text-sm text-gray-500">Sincronizare cu softul SAGA v3.2</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={tax.sagaIntegration}
                        onChange={(e) => setTax({ ...tax, sagaIntegration: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Banknote className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Cont Bancar</h2>
                  <p className="text-gray-500">Pentru facturare si plati</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numele Bancii
                  </label>
                  <input
                    type="text"
                    value={bank.bankName}
                    onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                    placeholder="Banca Transilvania"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={bank.bankAccount}
                    onChange={(e) => setBank({ ...bank, bankAccount: e.target.value.toUpperCase() })}
                    placeholder="RO49AAAA1B31007593840000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cod SWIFT/BIC
                  </label>
                  <input
                    type="text"
                    value={bank.swift}
                    onChange={(e) => setBank({ ...bank, swift: e.target.value.toUpperCase() })}
                    placeholder="BTRLRO22"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda Principala
                  </label>
                  <select
                    value={bank.currency}
                    onChange={(e) => setBank({ ...bank, currency: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="RON">RON - Leu Romanesc</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Dolar American</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>PSD2 Open Banking:</strong> Puteti conecta contul bancar direct pentru reconciliere automata a platilor. Aceasta optiune va fi disponibila in dashboard.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Team Members */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <UserPlus className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Invita Echipa</h2>
                  <p className="text-gray-500">Adaugati colegi care vor folosi platforma</p>
                </div>
              </div>

              {/* Add member form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Nume complet"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="email@firma.ro"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Vizualizare</option>
                  <option value="accountant">Contabil</option>
                  <option value="admin">Administrator</option>
                </select>
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Adauga
                </button>
              </div>

              {/* Team list */}
              {team.length > 0 ? (
                <div className="space-y-2">
                  {team.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                          {member.role === 'admin' ? 'Admin' : member.role === 'accountant' ? 'Contabil' : 'Vizualizare'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Niciun membru adaugat inca</p>
                  <p className="text-sm">Puteti sari acest pas si invita colegi mai tarziu</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: First Invoice */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Receipt className="w-8 h-8 text-green-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Gata de Start!</h2>
                  <p className="text-gray-500">Creati prima factura pentru a testa platforma</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Configurarea este completa!
                </h3>
                <p className="text-green-700 mb-4">
                  Contul dvs. este pregatit. Puteti incepe sa folositi DocumentIulia.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <FileText className="w-6 h-6 text-blue-600 mb-2" />
                    <div className="font-medium text-gray-900">Creaza Factura</div>
                    <div className="text-sm text-gray-500">Prima factura in 30 secunde</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <Calculator className="w-6 h-6 text-purple-600 mb-2" />
                    <div className="font-medium text-gray-900">Calculator TVA</div>
                    <div className="text-sm text-gray-500">21%/11% conform L.141/2025</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <Building2 className="w-6 h-6 text-orange-600 mb-2" />
                    <div className="font-medium text-gray-900">SAF-T D406</div>
                    <div className="text-sm text-gray-500">Raportare lunara ANAF</div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Rezumat configurare:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Firma:</div>
                  <div className="text-gray-900">{company.name || '-'}</div>
                  <div className="text-gray-500">CUI:</div>
                  <div className="text-gray-900">{company.cui || '-'}</div>
                  <div className="text-gray-500">TVA:</div>
                  <div className="text-gray-900">{tax.vatPayer ? `${tax.vatRate}%` : 'Neplatitor'}</div>
                  <div className="text-gray-500">Banca:</div>
                  <div className="text-gray-900">{bank.bankName || '-'}</div>
                  <div className="text-gray-500">Echipa:</div>
                  <div className="text-gray-900">{team.length} membri</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            Inapoi
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Sari acest pas
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Continua
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Se salveaza...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Finalizeaza si intra in Dashboard
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

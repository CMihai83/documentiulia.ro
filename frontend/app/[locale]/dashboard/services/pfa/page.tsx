'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Building,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  AlertCircle,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface PFAFormData {
  // Step 1: Personal Information
  firstName: string;
  lastName: string;
  cnp: string;
  idSeries: string;
  idNumber: string;
  birthDate: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  phone: string;
  email: string;

  // Step 2: Business Activity
  activityCode: string;
  activityDescription: string;
  mainActivity: string;
  secondaryActivities: string[];

  // Step 3: Registered Office
  officeAddress: string;
  officeCity: string;
  officeCounty: string;
  officePostalCode: string;
  hasPropertyDocument: boolean;
  propertyDocumentType: string;

  // Step 4: Bank & Tax Information
  bankName: string;
  iban: string;
  taxSystem: 'norma' | 'real';
  vatPayer: boolean;
}

const initialFormData: PFAFormData = {
  firstName: '',
  lastName: '',
  cnp: '',
  idSeries: '',
  idNumber: '',
  birthDate: '',
  address: '',
  city: '',
  county: '',
  postalCode: '',
  phone: '',
  email: '',
  activityCode: '',
  activityDescription: '',
  mainActivity: '',
  secondaryActivities: [],
  officeAddress: '',
  officeCity: '',
  officeCounty: '',
  officePostalCode: '',
  hasPropertyDocument: false,
  propertyDocumentType: '',
  bankName: '',
  iban: '',
  taxSystem: 'norma',
  vatPayer: false,
};

const steps = [
  { id: 1, title: 'Date Personale', icon: User },
  { id: 2, title: 'Activitate', icon: Briefcase },
  { id: 3, title: 'Sediu Social', icon: Building },
  { id: 4, title: 'Date Bancare', icon: CreditCard },
  { id: 5, title: 'Finalizare', icon: CheckCircle },
];

const romanianCounties = [
  'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud', 'Botosani', 'Braila',
  'Brasov', 'Bucuresti', 'Buzau', 'Calarasi', 'Caras-Severin', 'Cluj', 'Constanta',
  'Covasna', 'Dambovita', 'Dolj', 'Galati', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara',
  'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt', 'Olt',
  'Prahova', 'Salaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timis', 'Tulcea',
  'Valcea', 'Vaslui', 'Vrancea'
];

const commonCAENCodes = [
  { code: '6201', description: 'Activitati de realizare a soft-ului la comanda (software orientat client)' },
  { code: '6202', description: 'Activitati de consultanta in tehnologia informatiei' },
  { code: '6311', description: 'Prelucrarea datelor, administrarea paginilor web si activitati conexe' },
  { code: '7022', description: 'Activitati de consultanta pentru afaceri si management' },
  { code: '7410', description: 'Activitati de design specializat' },
  { code: '7311', description: 'Activitati ale agentiilor de publicitate' },
  { code: '7320', description: 'Activitati de studiere a pietei si de sondare a opiniei publice' },
  { code: '6910', description: 'Activitati juridice' },
  { code: '6920', description: 'Activitati de contabilitate si audit financiar; consultanta in domeniul fiscal' },
  { code: '7111', description: 'Activitati de arhitectura' },
  { code: '7112', description: 'Activitati de inginerie si consultanta tehnica legate de acestea' },
  { code: '8559', description: 'Alte forme de invatamant n.c.a.' },
];

export default function PFARegistrationPage() {
  const toast = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PFAFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof PFAFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof PFAFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof PFAFormData, string>> = {};

    switch (step) {
      case 1:
        if (!formData.firstName) newErrors.firstName = 'Prenumele este obligatoriu';
        if (!formData.lastName) newErrors.lastName = 'Numele este obligatoriu';
        if (!formData.cnp || formData.cnp.length !== 13) newErrors.cnp = 'CNP invalid (13 cifre)';
        if (!formData.email || !formData.email.includes('@')) newErrors.email = 'Email invalid';
        if (!formData.phone) newErrors.phone = 'Telefonul este obligatoriu';
        break;
      case 2:
        if (!formData.activityCode) newErrors.activityCode = 'Codul CAEN este obligatoriu';
        if (!formData.mainActivity) newErrors.mainActivity = 'Activitatea principala este obligatorie';
        break;
      case 3:
        if (!formData.officeAddress) newErrors.officeAddress = 'Adresa sediului este obligatorie';
        if (!formData.officeCity) newErrors.officeCity = 'Orasul este obligatoriu';
        if (!formData.officeCounty) newErrors.officeCounty = 'Judetul este obligatoriu';
        break;
      case 4:
        if (!formData.bankName) newErrors.bankName = 'Banca este obligatorie';
        if (!formData.iban || formData.iban.length < 24) newErrors.iban = 'IBAN invalid';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Succes', 'Cererea de inregistrare PFA a fost trimisa cu succes!');
      router.push('/dashboard/services');
    } catch {
      toast.error('Eroare', 'A aparut o eroare. Va rugam incercati din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep >= step.id
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 text-gray-400'
          }`}>
            <step.icon className="w-5 h-5" />
          </div>
          <span className={`ml-2 text-sm font-medium hidden md:block ${
            currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {step.title}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-4 ${
              currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Date Personale</h3>
      <p className="text-sm text-gray-500">Introduceti datele personale ale titularului PFA</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prenume *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ion"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Popescu"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNP *</label>
          <input
            type="text"
            value={formData.cnp}
            onChange={(e) => updateFormData('cnp', e.target.value.replace(/\D/g, '').slice(0, 13))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.cnp ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="1234567890123"
            maxLength={13}
          />
          {errors.cnp && <p className="text-red-500 text-xs mt-1">{errors.cnp}</p>}
        </div>

        <div className="flex gap-2">
          <div className="w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Serie CI</label>
            <input
              type="text"
              value={formData.idSeries}
              onChange={(e) => updateFormData('idSeries', e.target.value.toUpperCase().slice(0, 2))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="AB"
              maxLength={2}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Numar CI</label>
            <input
              type="text"
              value={formData.idNumber}
              onChange={(e) => updateFormData('idNumber', e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              maxLength={6}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="ion.popescu@email.com"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0712 345 678"
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresa Domiciliu</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateFormData('address', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Str. Exemplu, Nr. 1, Bl. A, Sc. 1, Ap. 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oras</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData('city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Bucuresti"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judet</label>
          <select
            value={formData.county}
            onChange={(e) => updateFormData('county', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecteaza judetul</option>
            {romanianCounties.map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Activitate Economica</h3>
      <p className="text-sm text-gray-500">Selectati codul CAEN si descrieti activitatea PFA</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cod CAEN Principal *</label>
          <select
            value={formData.activityCode}
            onChange={(e) => {
              const selected = commonCAENCodes.find(c => c.code === e.target.value);
              updateFormData('activityCode', e.target.value);
              if (selected) {
                updateFormData('activityDescription', selected.description);
              }
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.activityCode ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecteaza codul CAEN</option>
            {commonCAENCodes.map(caen => (
              <option key={caen.code} value={caen.code}>
                {caen.code} - {caen.description}
              </option>
            ))}
          </select>
          {errors.activityCode && <p className="text-red-500 text-xs mt-1">{errors.activityCode}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descriere Activitate Principala *</label>
          <textarea
            value={formData.mainActivity}
            onChange={(e) => updateFormData('mainActivity', e.target.value)}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.mainActivity ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Descrieti pe scurt activitatea pe care o veti desfasura..."
          />
          {errors.mainActivity && <p className="text-red-500 text-xs mt-1">{errors.mainActivity}</p>}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>PFA poate desfasura activitati doar in limitele codurilor CAEN declarate</li>
                <li>Puteti adauga activitati secundare ulterior la ONRC</li>
                <li>Verificati ca activitatea aleasa nu necesita autorizatii speciale</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Sediu Social</h3>
      <p className="text-sm text-gray-500">Introduceti adresa sediului social al PFA</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresa Sediu *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={formData.officeAddress}
              onChange={(e) => updateFormData('officeAddress', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.officeAddress ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Str. Exemplu, Nr. 1, Bl. A, Sc. 1, Ap. 1"
            />
          </div>
          {errors.officeAddress && <p className="text-red-500 text-xs mt-1">{errors.officeAddress}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oras *</label>
          <input
            type="text"
            value={formData.officeCity}
            onChange={(e) => updateFormData('officeCity', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.officeCity ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Bucuresti"
          />
          {errors.officeCity && <p className="text-red-500 text-xs mt-1">{errors.officeCity}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judet *</label>
          <select
            value={formData.officeCounty}
            onChange={(e) => updateFormData('officeCounty', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.officeCounty ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecteaza judetul</option>
            {romanianCounties.map(county => (
              <option key={county} value={county}>{county}</option>
            ))}
          </select>
          {errors.officeCounty && <p className="text-red-500 text-xs mt-1">{errors.officeCounty}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cod Postal</label>
          <input
            type="text"
            value={formData.officePostalCode}
            onChange={(e) => updateFormData('officePostalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="010101"
            maxLength={6}
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="hasPropertyDocument"
              checked={formData.hasPropertyDocument}
              onChange={(e) => updateFormData('hasPropertyDocument', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="hasPropertyDocument" className="text-sm text-gray-700">
              Detin document pentru spatiul sediului social
            </label>
          </div>

          {formData.hasPropertyDocument && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip Document</label>
              <select
                value={formData.propertyDocumentType}
                onChange={(e) => updateFormData('propertyDocumentType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecteaza tipul</option>
                <option value="proprietate">Contract de proprietate</option>
                <option value="inchiriere">Contract de inchiriere</option>
                <option value="comodat">Contract de comodat</option>
                <option value="acord">Acord de sediu social</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Date Bancare si Fiscale</h3>
      <p className="text-sm text-gray-500">Introduceti datele bancare si alegeti sistemul de impozitare</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banca *</label>
          <select
            value={formData.bankName}
            onChange={(e) => updateFormData('bankName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecteaza banca</option>
            <option value="BCR">BCR</option>
            <option value="BRD">BRD</option>
            <option value="ING">ING Bank</option>
            <option value="BT">Banca Transilvania</option>
            <option value="Raiffeisen">Raiffeisen Bank</option>
            <option value="UniCredit">UniCredit</option>
            <option value="CEC">CEC Bank</option>
            <option value="OTP">OTP Bank</option>
            <option value="Alpha">Alpha Bank</option>
            <option value="Libra">Libra Bank</option>
          </select>
          {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IBAN *</label>
          <input
            type="text"
            value={formData.iban}
            onChange={(e) => updateFormData('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.iban ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="RO49AAAA1B31007593840000"
          />
          {errors.iban && <p className="text-red-500 text-xs mt-1">{errors.iban}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-3">Sistem Impozitare *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => updateFormData('taxSystem', 'norma')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.taxSystem === 'norma'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.taxSystem === 'norma' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {formData.taxSystem === 'norma' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Norma de Venit</p>
                  <p className="text-xs text-gray-500">Impozit fix stabilit de ANAF pe baza activitatii</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => updateFormData('taxSystem', 'real')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.taxSystem === 'real'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.taxSystem === 'real' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {formData.taxSystem === 'real' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sistem Real</p>
                  <p className="text-xs text-gray-500">10% din venitul net (venituri - cheltuieli)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="vatPayer"
              checked={formData.vatPayer}
              onChange={(e) => updateFormData('vatPayer', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="vatPayer" className="text-sm text-gray-700">
              Doresc sa fiu platitor de TVA (obligatoriu daca depasesc 300.000 RON/an)
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Verificare si Finalizare</h3>
        <p className="text-sm text-gray-500">Verificati datele inainte de trimitere</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Nume Complet</p>
            <p className="font-medium">{formData.firstName} {formData.lastName}</p>
          </div>
          <div>
            <p className="text-gray-500">CNP</p>
            <p className="font-medium">{formData.cnp}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{formData.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Telefon</p>
            <p className="font-medium">{formData.phone}</p>
          </div>
          <div>
            <p className="text-gray-500">Cod CAEN</p>
            <p className="font-medium">{formData.activityCode}</p>
          </div>
          <div>
            <p className="text-gray-500">Sediu Social</p>
            <p className="font-medium">{formData.officeCity}, {formData.officeCounty}</p>
          </div>
          <div>
            <p className="text-gray-500">Banca</p>
            <p className="font-medium">{formData.bankName}</p>
          </div>
          <div>
            <p className="text-gray-500">Sistem Impozitare</p>
            <p className="font-medium">{formData.taxSystem === 'norma' ? 'Norma de Venit' : 'Sistem Real'}</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Documente necesare pentru ONRC:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Copie carte de identitate</li>
              <li>Declaratie pe propria raspundere</li>
              <li>Document sediu social (proprietate/inchiriere/comodat)</li>
              <li>Specimen de semnatura</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inregistrare PFA</h1>
        <p className="text-gray-600">Persoana Fizica Autorizata - Formular de inregistrare</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {renderStepIndicator()}

        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Inapoi
          </button>

          {currentStep < 5 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continua
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Se proceseaza...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Trimite Cererea
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

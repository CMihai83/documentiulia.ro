'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
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
  Plus,
  Trash2,
  Loader2,
  Euro,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Associate {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string;
  address: string;
  sharePercentage: number;
  isAdministrator: boolean;
}

interface SRLFormData {
  // Step 1: Company Information
  companyName: string;
  companyNameReserved: boolean;
  companyNameReservationNumber: string;

  // Step 2: Associates
  associates: Associate[];

  // Step 3: Activity
  activityCode: string;
  activityDescription: string;
  mainActivity: string;
  secondaryActivities: string[];

  // Step 4: Registered Office
  officeAddress: string;
  officeCity: string;
  officeCounty: string;
  officePostalCode: string;
  hasPropertyDocument: boolean;
  propertyDocumentType: string;

  // Step 5: Capital & Bank
  shareCapital: number;
  numberOfShares: number;
  shareValue: number;
  bankName: string;
  vatPayer: boolean;
  contactEmail: string;
  contactPhone: string;
}

const initialFormData: SRLFormData = {
  companyName: '',
  companyNameReserved: false,
  companyNameReservationNumber: '',
  associates: [
    {
      id: '1',
      firstName: '',
      lastName: '',
      cnp: '',
      address: '',
      sharePercentage: 100,
      isAdministrator: true,
    },
  ],
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
  shareCapital: 200,
  numberOfShares: 20,
  shareValue: 10,
  bankName: '',
  vatPayer: false,
  contactEmail: '',
  contactPhone: '',
};

const steps = [
  { id: 1, title: 'Denumire', icon: Building2 },
  { id: 2, title: 'Asociati', icon: Users },
  { id: 3, title: 'Activitate', icon: Briefcase },
  { id: 4, title: 'Sediu', icon: MapPin },
  { id: 5, title: 'Capital', icon: Euro },
  { id: 6, title: 'Finalizare', icon: CheckCircle },
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
  { code: '6201', description: 'Activitati de realizare a soft-ului la comanda' },
  { code: '6202', description: 'Activitati de consultanta in tehnologia informatiei' },
  { code: '4711', description: 'Comert cu amanuntul in magazine nespecializate' },
  { code: '4719', description: 'Comert cu amanuntul in magazine nespecializate cu vanzare de produse alimentare' },
  { code: '4791', description: 'Comert cu amanuntul prin intermediul caselor de comenzi sau prin Internet' },
  { code: '5610', description: 'Restaurante' },
  { code: '5630', description: 'Baruri si alte activitati de servire a bauturilor' },
  { code: '6810', description: 'Cumpararea si vanzarea de bunuri imobiliare proprii' },
  { code: '6820', description: 'Inchirierea si subinchirierea bunurilor imobiliare proprii sau inchiriate' },
  { code: '7022', description: 'Activitati de consultanta pentru afaceri si management' },
  { code: '4120', description: 'Lucrari de constructii a cladirilor rezidentiale si nerezidentiale' },
  { code: '4941', description: 'Transporturi rutiere de marfuri' },
];

export default function SRLRegistrationPage() {
  const toast = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SRLFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = <K extends keyof SRLFormData>(field: K, value: SRLFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addAssociate = () => {
    const newAssociate: Associate = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      cnp: '',
      address: '',
      sharePercentage: 0,
      isAdministrator: false,
    };
    updateFormData('associates', [...formData.associates, newAssociate]);
  };

  const removeAssociate = (id: string) => {
    if (formData.associates.length > 1) {
      updateFormData('associates', formData.associates.filter(a => a.id !== id));
    }
  };

  const updateAssociate = (id: string, field: keyof Associate, value: string | number | boolean) => {
    updateFormData('associates', formData.associates.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.companyName || formData.companyName.length < 3) {
          newErrors.companyName = 'Denumirea trebuie sa aiba minim 3 caractere';
        }
        if (!formData.companyName.includes('S.R.L.') && !formData.companyName.includes('SRL')) {
          // Auto-append SRL if not present
        }
        break;
      case 2:
        const totalShares = formData.associates.reduce((sum, a) => sum + (a.sharePercentage || 0), 0);
        if (totalShares !== 100) {
          newErrors.associates = 'Suma cotelor de participare trebuie sa fie 100%';
        }
        formData.associates.forEach((associate, index) => {
          if (!associate.firstName) newErrors[`associate_${index}_firstName`] = 'Prenumele este obligatoriu';
          if (!associate.lastName) newErrors[`associate_${index}_lastName`] = 'Numele este obligatoriu';
          if (!associate.cnp || associate.cnp.length !== 13) newErrors[`associate_${index}_cnp`] = 'CNP invalid';
        });
        if (!formData.associates.some(a => a.isAdministrator)) {
          newErrors.administrator = 'Trebuie sa existe cel putin un administrator';
        }
        break;
      case 3:
        if (!formData.activityCode) newErrors.activityCode = 'Codul CAEN este obligatoriu';
        if (!formData.mainActivity) newErrors.mainActivity = 'Descrierea activitatii este obligatorie';
        break;
      case 4:
        if (!formData.officeAddress) newErrors.officeAddress = 'Adresa sediului este obligatorie';
        if (!formData.officeCity) newErrors.officeCity = 'Orasul este obligatoriu';
        if (!formData.officeCounty) newErrors.officeCounty = 'Judetul este obligatoriu';
        break;
      case 5:
        if (formData.shareCapital < 200) newErrors.shareCapital = 'Capitalul social minim este 200 RON';
        if (!formData.bankName) newErrors.bankName = 'Selectati banca';
        if (!formData.contactEmail || !formData.contactEmail.includes('@')) newErrors.contactEmail = 'Email invalid';
        if (!formData.contactPhone) newErrors.contactPhone = 'Telefonul este obligatoriu';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Succes', 'Cererea de inregistrare SRL a fost trimisa cu succes!');
      router.push('/dashboard/services');
    } catch {
      toast.error('Eroare', 'A aparut o eroare. Va rugam incercati din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 overflow-x-auto">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-shrink-0">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep >= step.id
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 text-gray-400'
          }`}>
            <step.icon className="w-5 h-5" />
          </div>
          <span className={`ml-2 text-sm font-medium hidden lg:block ${
            currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {step.title}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-8 lg:w-12 h-0.5 mx-2 lg:mx-4 ${
              currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Denumire Societate</h3>
      <p className="text-sm text-gray-500">Introduceti denumirea dorita pentru societate</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Denumire Societate *</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => updateFormData('companyName', e.target.value.toUpperCase())}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.companyName ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="EXEMPLU BUSINESS S.R.L."
          />
          {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
          <p className="text-xs text-gray-500 mt-1">Denumirea va fi verificata pentru disponibilitate la ONRC</p>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="nameReserved"
            checked={formData.companyNameReserved}
            onChange={(e) => updateFormData('companyNameReserved', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="nameReserved" className="text-sm text-gray-700">
            Am rezervat deja denumirea la ONRC
          </label>
        </div>

        {formData.companyNameReserved && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numar Rezervare</label>
            <input
              type="text"
              value={formData.companyNameReservationNumber}
              onChange={(e) => updateFormData('companyNameReservationNumber', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123456/2025"
            />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Sfaturi pentru denumire:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Denumirea trebuie sa fie unica la nivel national</li>
                <li>Evitati denumiri similare cu branduri cunoscute</li>
                <li>Rezervarea denumirii este valabila 3 luni</li>
                <li>S.R.L. va fi adaugat automat la sfarsit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Asociati</h3>
          <p className="text-sm text-gray-500">Adaugati asociatii societatii si cotele de participare</p>
        </div>
        <button
          onClick={addAssociate}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
        >
          <Plus className="w-4 h-4" />
          Adauga Asociat
        </button>
      </div>

      {errors.associates && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {errors.associates}
        </div>
      )}
      {errors.administrator && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {errors.administrator}
        </div>
      )}

      <div className="space-y-4">
        {formData.associates.map((associate, index) => (
          <div key={associate.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">Asociat {index + 1}</h4>
              {formData.associates.length > 1 && (
                <button
                  onClick={() => removeAssociate(associate.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenume *</label>
                <input
                  type="text"
                  value={associate.firstName}
                  onChange={(e) => updateAssociate(associate.id, 'firstName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors[`associate_${index}_firstName`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Ion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
                <input
                  type="text"
                  value={associate.lastName}
                  onChange={(e) => updateAssociate(associate.id, 'lastName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors[`associate_${index}_lastName`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Popescu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNP *</label>
                <input
                  type="text"
                  value={associate.cnp}
                  onChange={(e) => updateAssociate(associate.id, 'cnp', e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors[`associate_${index}_cnp`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="1234567890123"
                  maxLength={13}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cota Participare (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={associate.sharePercentage}
                  onChange={(e) => updateAssociate(associate.id, 'sharePercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
                <input
                  type="text"
                  value={associate.address}
                  onChange={(e) => updateAssociate(associate.id, 'address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Str. Exemplu, Nr. 1, Bucuresti"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={associate.isAdministrator}
                    onChange={(e) => updateAssociate(associate.id, 'isAdministrator', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Administrator societate</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total cote participare:</span>
          <span className={`text-lg font-bold ${
            formData.associates.reduce((sum, a) => sum + (a.sharePercentage || 0), 0) === 100
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {formData.associates.reduce((sum, a) => sum + (a.sharePercentage || 0), 0)}%
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Activitate Economica</h3>
      <p className="text-sm text-gray-500">Selectati codul CAEN principal si descrieti activitatea</p>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Descriere Activitate *</label>
          <textarea
            value={formData.mainActivity}
            onChange={(e) => updateFormData('mainActivity', e.target.value)}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.mainActivity ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Descrieti obiectul de activitate al societatii..."
          />
          {errors.mainActivity && <p className="text-red-500 text-xs mt-1">{errors.mainActivity}</p>}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Puteti declara pana la 20 de coduri CAEN secundare</li>
                <li>Anumite activitati necesita autorizatii speciale (HoReCa, transport, etc.)</li>
                <li>Codurile CAEN se pot modifica ulterior la ONRC</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Sediu Social</h3>
      <p className="text-sm text-gray-500">Introduceti adresa sediului social al societatii</p>

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
              placeholder="Str. Exemplu, Nr. 1, Bl. A, Sc. 1, Et. 2, Ap. 10"
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
              id="hasPropertyDoc"
              checked={formData.hasPropertyDocument}
              onChange={(e) => updateFormData('hasPropertyDocument', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="hasPropertyDoc" className="text-sm text-gray-700">
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
                <option value="proprietate">Act de proprietate</option>
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

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Capital Social si Date Contact</h3>
      <p className="text-sm text-gray-500">Configurati capitalul social si datele bancare</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capital Social (RON) *</label>
          <input
            type="number"
            min="200"
            step="10"
            value={formData.shareCapital}
            onChange={(e) => {
              const capital = parseFloat(e.target.value) || 200;
              updateFormData('shareCapital', capital);
              updateFormData('numberOfShares', Math.floor(capital / formData.shareValue));
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.shareCapital ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.shareCapital && <p className="text-red-500 text-xs mt-1">{errors.shareCapital}</p>}
          <p className="text-xs text-gray-500 mt-1">Minim 200 RON</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valoare Parte Sociala (RON)</label>
          <input
            type="number"
            min="1"
            value={formData.shareValue}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 10;
              updateFormData('shareValue', value);
              updateFormData('numberOfShares', Math.floor(formData.shareCapital / value));
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numar Parti Sociale</label>
          <input
            type="number"
            value={formData.numberOfShares}
            readOnly
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
          />
        </div>
      </div>

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
          </select>
          {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.vatPayer}
              onChange={(e) => updateFormData('vatPayer', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Platitor de TVA de la infiintare</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Contact *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateFormData('contactEmail', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.contactEmail ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="contact@exemplu.ro"
            />
          </div>
          {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Contact *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => updateFormData('contactPhone', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.contactPhone ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0712 345 678"
            />
          </div>
          {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Verificare si Finalizare</h3>
        <p className="text-sm text-gray-500">Verificati datele inainte de trimitere</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Societate</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Denumire</p>
              <p className="font-medium">{formData.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Cod CAEN</p>
              <p className="font-medium">{formData.activityCode || '-'}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">Asociati ({formData.associates.length})</h4>
          <div className="space-y-2">
            {formData.associates.map((associate, index) => (
              <div key={associate.id} className="text-sm flex justify-between">
                <span>{associate.firstName} {associate.lastName}</span>
                <span className="text-gray-500">
                  {associate.sharePercentage}%
                  {associate.isAdministrator && <span className="ml-2 text-blue-600">(Admin)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">Sediu Social</h4>
          <p className="text-sm">{formData.officeAddress}, {formData.officeCity}, {formData.officeCounty}</p>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">Capital Social</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-medium">{formData.shareCapital} RON</p>
            </div>
            <div>
              <p className="text-gray-500">Parti Sociale</p>
              <p className="font-medium">{formData.numberOfShares}</p>
            </div>
            <div>
              <p className="text-gray-500">Valoare/Parte</p>
              <p className="font-medium">{formData.shareValue} RON</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Documente necesare pentru ONRC:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Copii carti de identitate asociati</li>
              <li>Actul constitutiv semnat</li>
              <li>Declaratie pe propria raspundere administrator</li>
              <li>Dovada sediu social</li>
              <li>Specimene de semnatura</li>
              <li>Cerere de inregistrare</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inregistrare SRL</h1>
        <p className="text-gray-600">Societate cu Raspundere Limitata - Formular de inregistrare</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {renderStepIndicator()}

        <div className="min-h-[450px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
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

          {currentStep < 6 ? (
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

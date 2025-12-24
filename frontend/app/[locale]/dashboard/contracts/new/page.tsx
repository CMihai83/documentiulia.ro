'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  FileText,
  Save,
  ArrowLeft,
  Building2,
  Calendar,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Euro,
} from 'lucide-react';

interface ContractFormData {
  name: string;
  partnerId: string;
  partnerName: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  currency: string;
  paymentTerms: string;
  description: string;
  notes: string;
  autoRenew: boolean;
  renewalNotificationDays: number;
}

interface Partner {
  id: string;
  name: string;
  cui: string;
  type: string;
}

const CONTRACT_TYPES = [
  { value: 'service', label: 'Prestări servicii' },
  { value: 'supply', label: 'Furnizare produse' },
  { value: 'lease', label: 'Leasing / Închiriere' },
  { value: 'employment', label: 'Contract muncă' },
  { value: 'collaboration', label: 'Colaborare' },
  { value: 'franchise', label: 'Franciză' },
  { value: 'nda', label: 'Confidențialitate (NDA)' },
  { value: 'other', label: 'Altele' },
];

const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Plată imediată' },
  { value: 'net15', label: 'Net 15 zile' },
  { value: 'net30', label: 'Net 30 zile' },
  { value: 'net60', label: 'Net 60 zile' },
  { value: 'net90', label: 'Net 90 zile' },
  { value: 'monthly', label: 'Lunar' },
  { value: 'quarterly', label: 'Trimestrial' },
  { value: 'custom', label: 'Personalizat' },
];

const CURRENCIES = [
  { value: 'RON', label: 'RON - Leu românesc' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - Dolar american' },
  { value: 'GBP', label: 'GBP - Liră sterlină' },
];

export default function NewContractPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractFormData>({
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'RON',
      paymentTerms: 'net30',
      contractType: 'service',
      autoRenew: false,
      renewalNotificationDays: 30,
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const autoRenew = watch('autoRenew');

  // Fetch partners
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/v1/partners', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setPartners(Array.isArray(data) ? data : data.data || []);
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
      }
    };
    fetchPartners();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = localStorage.getItem('accessToken');

      // Create FormData for file upload
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/v1/contracts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/contracts');
        }, 1500);
      } else {
        const error = await response.json();
        setSubmitError(error.message || 'Eroare la salvarea contractului');
      }
    } catch (error) {
      setSubmitError('Eroare de conexiune. Încercați din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate contract duration
  const calculateDuration = () => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;

    if (months > 0 && days > 0) return `${months} luni și ${days} zile`;
    if (months > 0) return `${months} luni`;
    return `${days} zile`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contract Nou</h1>
          <p className="text-gray-500 text-sm">Creează un nou contract în sistem</p>
        </div>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">Contract creat cu succes! Redirecționare...</span>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Informații de bază
          </h2>

          {/* Contract Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Denumire contract *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Denumirea este obligatorie' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Contract prestări servicii IT"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Partner and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Partener *
              </label>
              <select
                {...register('partnerId', { required: 'Partenerul este obligatoriu' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selectează partener</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} ({partner.cui})
                  </option>
                ))}
              </select>
              {errors.partnerId && (
                <p className="text-red-500 text-sm mt-1">{errors.partnerId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip contract *
              </label>
              <select
                {...register('contractType', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {CONTRACT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descriere / Obiect contract
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Descrierea obiectului contractului..."
            />
          </div>
        </div>

        {/* Duration & Value */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Perioada și valoare
          </h2>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data început *
              </label>
              <input
                type="date"
                {...register('startDate', { required: 'Data început este obligatorie' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data încheiere *
              </label>
              <input
                type="date"
                {...register('endDate', {
                  required: 'Data încheiere este obligatorie',
                  validate: (value) =>
                    !startDate || new Date(value) > new Date(startDate) ||
                    'Data încheiere trebuie să fie după data început',
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durată contract
              </label>
              <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                {calculateDuration() || '-'}
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Euro className="w-4 h-4 inline mr-1" />
                Valoare totală *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('totalValue', {
                  required: 'Valoarea este obligatorie',
                  min: { value: 0, message: 'Valoarea trebuie să fie pozitivă' },
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.totalValue && (
                <p className="text-red-500 text-sm mt-1">{errors.totalValue.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monedă
              </label>
              <select
                {...register('currency')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condiții plată
              </label>
              <select
                {...register('paymentTerms')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_TERMS.map((term) => (
                  <option key={term.value} value={term.value}>
                    {term.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-renewal */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('autoRenew')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Reînnoire automată</span>
                <p className="text-sm text-gray-500">
                  Contractul se va reînnoi automat la expirare
                </p>
              </div>
            </label>

            {autoRenew && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notificare cu câte zile înainte de expirare
                </label>
                <input
                  type="number"
                  {...register('renewalNotificationDays', { valueAsNumber: true })}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-500">zile</span>
              </div>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            Documente atașate
          </h2>

          <div>
            <label className="block">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition">
                <Plus className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Adaugă documente (PDF, Word, imagini)</span>
              </div>
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note interne
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Observații sau note pentru uz intern..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvează contract
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

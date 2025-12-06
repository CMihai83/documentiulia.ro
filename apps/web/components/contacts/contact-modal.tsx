'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button } from '@/components/ui/modal';
import { useCompanyStore } from '@/lib/store/company-store';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Hash,
  Briefcase,
  Globe,
  UserCircle,
  Check,
} from 'lucide-react';

// Client type
type ClientType = 'company' | 'individual';

interface ContactFormData {
  name: string;
  type: ClientType;
  cui: string;
  regCom: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  county: string;
  country: string;
  iban: string;
  bank: string;
  vatPayer: boolean;
  contactPerson: string;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingContact?: ContactFormData & { id: string };
}

// Romanian counties
const romanianCounties = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași',
  'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
  'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
  'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj',
  'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea', 'Vrancea'
];

// Romanian banks
const romanianBanks = [
  'Banca Transilvania',
  'BRD - Groupe Société Générale',
  'BCR (Banca Comercială Română)',
  'ING Bank',
  'Raiffeisen Bank',
  'UniCredit Bank',
  'CEC Bank',
  'Alpha Bank',
  'OTP Bank',
  'Libra Internet Bank',
  'Banca Romanească',
  'First Bank',
  'Garanti BBVA',
  'Patria Bank',
  'Intesa Sanpaolo',
  'Altă bancă',
];

const initialFormData: ContactFormData = {
  name: '',
  type: 'company',
  cui: '',
  regCom: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  county: '',
  country: 'România',
  iban: '',
  bank: '',
  vatPayer: true,
  contactPerson: '',
};

export function ContactModal({ isOpen, onClose, onSuccess, editingContact }: ContactModalProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  // Reset form when modal opens/closes or editing contact changes
  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setFormData({
          name: editingContact.name,
          type: editingContact.type,
          cui: editingContact.cui,
          regCom: editingContact.regCom,
          email: editingContact.email,
          phone: editingContact.phone,
          address: editingContact.address,
          city: editingContact.city,
          county: editingContact.county,
          country: editingContact.country || 'România',
          iban: editingContact.iban,
          bank: editingContact.bank,
          vatPayer: editingContact.vatPayer,
          contactPerson: editingContact.contactPerson,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, editingContact]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    }

    if (formData.type === 'company') {
      if (!formData.cui.trim()) {
        newErrors.cui = 'CUI este obligatoriu pentru persoane juridice';
      } else if (!/^RO?\d{2,10}$/.test(formData.cui.replace(/\s/g, ''))) {
        newErrors.cui = 'Format CUI invalid (ex: RO12345678)';
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email invalid';
    }

    if (formData.iban && !/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(formData.iban.replace(/\s/g, ''))) {
      newErrors.iban = 'Format IBAN invalid (ex: RO49AAAA1B31007593840000)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!selectedCompanyId) {
      alert('Selectează o firmă mai întâi');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingContact
        ? `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v2/clients/${editingContact.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v2/clients`;

      const response = await fetch(url, {
        method: editingContact ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-ID': selectedCompanyId,
        },
        body: JSON.stringify({
          ...formData,
          companyId: selectedCompanyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la salvare');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('A apărut o eroare la salvarea contactului');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingContact ? 'Editează Contact' : 'Contact Nou'}
      description={editingContact ? 'Modifică detaliile contactului' : 'Adaugă un client sau furnizor nou'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Contact Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tip Contact
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleInputChange('type', 'company')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'company'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.type === 'company'
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Building2 className={`w-6 h-6 ${
                    formData.type === 'company'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500'
                  }`} />
                </div>
                <div className="text-left">
                  <p className={`font-medium ${
                    formData.type === 'company'
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Persoană Juridică
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    SRL, SA, PFA, II
                  </p>
                </div>
                {formData.type === 'company' && (
                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 ml-auto" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('type', 'individual')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'individual'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  formData.type === 'individual'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <User className={`w-6 h-6 ${
                    formData.type === 'individual'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500'
                  }`} />
                </div>
                <div className="text-left">
                  <p className={`font-medium ${
                    formData.type === 'individual'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Persoană Fizică
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Client individual
                  </p>
                </div>
                {formData.type === 'individual' && (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />
                )}
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {formData.type === 'company' ? 'Denumire Firmă' : 'Nume Complet'} *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {formData.type === 'company' ? (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder={formData.type === 'company' ? 'SC Exemplu SRL' : 'Ion Popescu'}
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* CUI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {formData.type === 'company' ? 'CUI / CIF *' : 'CNP'}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.cui}
                  onChange={(e) => handleInputChange('cui', e.target.value.toUpperCase())}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cui ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder={formData.type === 'company' ? 'RO12345678' : '1234567890123'}
                />
              </div>
              {errors.cui && <p className="mt-1 text-sm text-red-500">{errors.cui}</p>}
            </div>

            {/* Reg Com (only for companies) */}
            {formData.type === 'company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nr. Registrul Comerțului
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.regCom}
                    onChange={(e) => handleInputChange('regCom', e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="J40/1234/2024"
                  />
                </div>
              </div>
            )}

            {/* VAT Payer Toggle (only for companies) */}
            {formData.type === 'company' && (
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.vatPayer}
                    onChange={(e) => handleInputChange('vatPayer', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Plătitor TVA
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Informații de Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="contact@exemplu.ro"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+40 722 123 456"
                  />
                </div>
              </div>

              {/* Contact Person (for companies) */}
              {formData.type === 'company' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Persoană de Contact
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ion Popescu"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Adresă
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresă
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Str. Exemplu Nr. 10, Bl. A, Sc. 1, Ap. 5"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Oraș
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="București"
                />
              </div>

              {/* County */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Județ
                </label>
                <select
                  value={formData.county}
                  onChange={(e) => handleInputChange('county', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează județ</option>
                  {romanianCounties.map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Țară
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="România"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Informații Bancare
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IBAN */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IBAN
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                      errors.iban ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="RO49AAAA1B31007593840000"
                  />
                </div>
                {errors.iban && <p className="mt-1 text-sm text-red-500">{errors.iban}</p>}
              </div>

              {/* Bank */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bancă
                </label>
                <select
                  value={formData.bank}
                  onChange={(e) => handleInputChange('bank', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează banca</option>
                  {romanianBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editingContact ? 'Salvează Modificările' : 'Adaugă Contact'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import type { CompanyData } from './OnboardingProvider';

const INDUSTRIES = [
  'retail',
  'services',
  'manufacturing',
  'construction',
  'it',
  'healthcare',
  'education',
  'agriculture',
  'hospitality',
  'transportation',
  'finance',
  'other',
];

export function CompanySetupStep() {
  const t = useTranslations('onboarding');
  const { data, updateCompanyData, nextStep, previousStep } = useOnboarding();

  const [formData, setFormData] = useState<Partial<CompanyData>>({
    name: data.companyData.name || '',
    cui: data.companyData.cui || '',
    address: data.companyData.address || '',
    city: data.companyData.city || '',
    county: data.companyData.county || '',
    postalCode: data.companyData.postalCode || '',
    industry: data.companyData.industry || '',
    phone: data.companyData.phone || '',
    email: data.companyData.email || '',
  });

  const handleChange = (field: keyof CompanyData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    updateCompanyData(formData);
    nextStep();
  };

  const isValid = formData.name && formData.cui && formData.industry;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t('company.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto px-4">
          {t('company.subtitle')}
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Company Basic Info */}
        <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {t('company.basicInfo')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="companyName">
                {t('company.name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder={t('company.namePlaceholder')}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cui">
                {t('company.cui')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cui"
                type="text"
                placeholder="RO12345678"
                value={formData.cui}
                onChange={(e) => handleChange('cui', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">
                {t('company.industry')} <span className="text-red-500">*</span>
              </Label>
              <select
                id="industry"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
              >
                <option value="">{t('company.selectIndustry')}</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {t(`company.industries.${industry}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('company.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+40 700 000 000"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('company.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@company.ro"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            {t('company.address')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">{t('company.streetAddress')}</Label>
              <Input
                id="address"
                type="text"
                placeholder={t('company.streetPlaceholder')}
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t('company.city')}</Label>
              <Input
                id="city"
                type="text"
                placeholder={t('company.cityPlaceholder')}
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="county">{t('company.county')}</Label>
              <Input
                id="county"
                type="text"
                placeholder={t('company.countyPlaceholder')}
                value={formData.county}
                onChange={(e) => handleChange('county', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('company.postalCode')}</Label>
              <Input
                id="postalCode"
                type="text"
                placeholder="012345"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={previousStep}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t('common.back')}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
          >
            {t('common.continue')}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          <span className="text-red-500">*</span> {t('company.requiredFields')}
        </p>
      </div>
    </div>
  );
}

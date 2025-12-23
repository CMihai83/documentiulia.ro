'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tTerms = useTranslations('terms');
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    cui: '',
    businessType: '',
  });

  // Business types for market partitioning per INSSE SMB data
  const businessTypes = [
    { id: 'logistics', label: t('businessTypes.logistics'), icon: '🚚' },
    { id: 'construction', label: t('businessTypes.construction'), icon: '🏗️' },
    { id: 'healthcare', label: t('businessTypes.healthcare'), icon: '🏥' },
    { id: 'retail', label: t('businessTypes.retail'), icon: '🛒' },
    { id: 'services', label: t('businessTypes.services'), icon: '💼' },
    { id: 'other', label: t('businessTypes.other'), icon: '📋' },
  ];
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (!acceptTerms || !gdprConsent) {
      setError(t('acceptTermsRequired'));
      return;
    }

    if (!formData.businessType) {
      setError(t('businessTypeRequired'));
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        company: formData.company || undefined,
        cui: formData.cui || undefined,
        businessType: formData.businessType,
        redirectUrl: '/onboarding',
      });
    } catch (err: any) {
      setError(err.message || t('registerError'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('register')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('haveAccount')}{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t('loginHere')}
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t('name')} *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('name')}
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('email')} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('email')}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                {t('company')}
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('company')}
                value={formData.company}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="cui" className="block text-sm font-medium text-gray-700">
                {t('cui')}
              </label>
              <input
                id="cui"
                name="cui"
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="RO12345678"
                value={formData.cui}
                onChange={handleChange}
              />
            </div>

            {/* Business Type Selector for Market Partitioning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('businessType')} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {businessTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, businessType: type.id }))}
                    className={`flex items-center gap-2 p-3 border rounded-lg text-left transition ${
                      formData.businessType === type.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('password')} *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                aria-describedby="password-strength"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('password')}
                value={formData.password}
                onChange={handleChange}
              />
              <div id="password-strength">
                <PasswordStrengthIndicator password={formData.password} minLength={8} />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('confirmPassword')} *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('confirmPassword')}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                {t('termsAgree')}{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                  {t('termsLink')}
                </Link>
              </label>
            </div>

            <div className="flex items-start">
              <input
                id="gdpr"
                name="gdpr"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
              />
              <label htmlFor="gdpr" className="ml-2 block text-sm text-gray-900">
                {t('gdprConsent')}
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !acceptTerms || !gdprConsent}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('registering') : t('register')}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                GDPR & ANAF Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

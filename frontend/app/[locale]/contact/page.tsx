'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Phone, MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function ContactPage() {
  const t = useTranslations();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setReferenceId(data.referenceId);
        setFormData({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
      } else {
        setStatus('error');
        setErrorMessage(data.message?.[0] || data.message || 'An error occurred. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">{t('contact.title')}</h1>
          <p className="mt-4 text-lg text-gray-600">{t('contact.subtitle')}</p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('contact.getInTouch')}</h2>
            <div className="space-y-6">
              <div className="flex items-center">
                <Mail className="h-6 w-6 text-blue-600 mr-4" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href="mailto:contact@documentiulia.ro" className="text-gray-600 hover:text-blue-600">
                    contact@documentiulia.ro
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-6 w-6 text-blue-600 mr-4" />
                <div>
                  <p className="font-medium">{t('contact.phone')}</p>
                  <a href="tel:+40754924464" className="text-gray-600 hover:text-blue-600">
                    +40 754 924 464
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="h-6 w-6 text-blue-600 mr-4" />
                <div>
                  <p className="font-medium">{t('contact.address')}</p>
                  <p className="text-gray-600">S.C. DOCUMENT&IULIA S.R.L.</p>
                  <p className="text-gray-600">Romania</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">{t('contact.businessHours') || 'Program'}</h3>
              <p className="text-blue-700 text-sm">
                Luni - Vineri: 09:00 - 18:00<br />
                Weekend: Închis
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('contact.sendMessage')}</h2>

            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('contact.successTitle') || 'Mesaj trimis!'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('contact.successMessage') || 'Mulțumim pentru mesaj. Vă vom contacta în curând.'}
                </p>
                <p className="text-sm text-gray-500">
                  Referință: {referenceId}
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('contact.sendAnother') || 'Trimite alt mesaj'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{errorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      {t('contact.name')} *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      minLength={2}
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ion Popescu"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      {t('contact.email')} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ion@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      {t('contact.phone')}
                    </label>
                    <div className="mt-1 relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
                        +40
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        pattern="[0-9\s\-]*"
                        inputMode="tel"
                        aria-describedby="phone-hint"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-12 pr-3 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="7XX XXX XXX"
                      />
                    </div>
                    <p id="phone-hint" className="mt-1 text-xs text-gray-500">
                      {t('contact.phoneHint') || 'Format: 7XX XXX XXX (mobil) sau 2X XXX XXXX (fix)'}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                      {t('contact.company') || 'Companie'}
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Numele companiei"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    {t('contact.subject') || 'Subiect'}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Despre ce doriți să discutăm?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    {t('contact.message')} *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    minLength={10}
                    value={formData.message}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descrieți pe scurt cum vă putem ajuta..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('contact.sending') || 'Se trimite...'}
                    </>
                  ) : (
                    t('contact.send')
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  {t('contact.gdprNote') || 'Datele dumneavoastră sunt protejate conform GDPR.'}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

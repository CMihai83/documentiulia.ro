'use client';

/**
 * Contact Page - FIX for /contact 404
 *
 * Features:
 * - Contact form with name, email, message
 * - GDPR consent checkbox
 * - Form validation
 * - Integration with backend /api/contact/submit
 * - Support ticket creation
 * - RO/EN bilingual support
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  Building2,
  MessageSquare,
  HelpCircle,
  Headphones,
} from 'lucide-react';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  gdprConsent: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
  gdprConsent?: string;
}

const contactReasons = [
  { value: 'general', label: 'Informații generale' },
  { value: 'sales', label: 'Vânzări și prețuri' },
  { value: 'support', label: 'Suport tehnic' },
  { value: 'billing', label: 'Facturare și plăți' },
  { value: 'partnership', label: 'Parteneriate' },
  { value: 'press', label: 'Presă și media' },
];

const supportChannels = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Răspundem în 24 de ore',
    contact: 'contact@documentiulia.ro',
    href: 'mailto:contact@documentiulia.ro',
  },
  {
    icon: Phone,
    title: 'Telefon',
    description: 'Luni-Vineri, 9:00-18:00',
    contact: '+40 21 123 4567',
    href: 'tel:+40211234567',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Chat în timp real',
    contact: 'Deschide chat',
    href: '#chat',
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Răspunsuri rapide',
    contact: 'Vezi ajutorul',
    href: '/help',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: 'general',
    message: '',
    gdprConsent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Numele trebuie să aibă minim 2 caractere';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Adresa de email nu este validă';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Mesajul este obligatoriu';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Mesajul trebuie să aibă minim 10 caractere';
    }

    if (!formData.gdprConsent) {
      newErrors.gdprConsent = 'Trebuie să accepți politica de confidențialitate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Submit to backend API
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          source: 'contact-page',
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          subject: 'general',
          message: '',
          gdprConsent: false,
        });
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">DocumentIulia</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-slate-600 hover:text-blue-600 transition">
              Funcționalități
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-blue-600 transition">
              Prețuri
            </Link>
            <Link href="/courses" className="text-slate-600 hover:text-blue-600 transition">
              Cursuri
            </Link>
            <Link href="/help" className="text-slate-600 hover:text-blue-600 transition">
              Ajutor
            </Link>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Contactează-ne
          </h1>
          <p className="text-xl text-slate-600">
            Suntem aici să te ajutăm. Trimite-ne un mesaj sau contactează-ne prin canalele disponibile.
          </p>
        </div>
      </section>

      {/* Support Channels */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {supportChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <a
                key={channel.title}
                href={channel.href}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                  <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{channel.title}</h3>
                <p className="text-sm text-slate-500 mb-2">{channel.description}</p>
                <p className="text-blue-600 font-medium">{channel.contact}</p>
              </a>
            );
          })}
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Trimite-ne un mesaj
              </h2>

              {submitStatus === 'success' ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Mesaj trimis cu succes!
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Îți mulțumim pentru mesaj. Te vom contacta în cel mai scurt timp posibil.
                  </p>
                  <button
                    onClick={() => setSubmitStatus('idle')}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Trimite un alt mesaj
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nume complet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.name ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Ion Popescu"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.email ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="email@exemplu.ro"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+40 7XX XXX XXX"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Companie
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nume companie SRL"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Subiect
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {contactReasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mesaj <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={5}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                        errors.message ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Scrie mesajul tău aici..."
                    />
                    {errors.message && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* GDPR Consent */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="gdprConsent"
                        checked={formData.gdprConsent}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                      />
                      <span className="text-sm text-slate-600">
                        Accept{' '}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
                          Politica de Confidențialitate
                        </Link>{' '}
                        și sunt de acord cu procesarea datelor mele personale în conformitate cu GDPR.{' '}
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    {errors.gdprConsent && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.gdprConsent}
                      </p>
                    )}
                  </div>

                  {/* Submit Error */}
                  {submitStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Eroare la trimitere</p>
                        <p className="text-sm text-red-600">
                          A apărut o problemă. Te rugăm să încerci din nou sau să ne contactezi telefonic.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Se trimite...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Trimite mesajul
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Date companie
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-slate-900">DocumentIulia SRL</p>
                  <p className="text-slate-500">Platformă de contabilitate</p>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                  <div>
                    <p className="text-slate-600">București, România</p>
                    <p className="text-slate-500">Sector 1, Str. Exemplu 123</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href="mailto:contact@documentiulia.ro" className="text-blue-600 hover:underline">
                    contact@documentiulia.ro
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href="tel:+40211234567" className="text-blue-600 hover:underline">
                    +40 21 123 4567
                  </a>
                </div>
                <div className="pt-3 border-t border-slate-100 text-slate-500">
                  <p>CUI: RO12345678</p>
                  <p>Reg. Com.: J40/1234/2020</p>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Program
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Luni - Vineri</span>
                  <span className="text-slate-900 font-medium">9:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sâmbătă</span>
                  <span className="text-slate-900 font-medium">10:00 - 14:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Duminică</span>
                  <span className="text-slate-500">Închis</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Suport email 24/7. Răspundem în max 24 ore.
              </p>
            </div>

            {/* Support CTA */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
              <Headphones className="w-10 h-10 mb-3 opacity-80" />
              <h3 className="font-semibold mb-2">Ai nevoie de ajutor rapid?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Vizitează pagina de ajutor pentru răspunsuri rapide la întrebările frecvente.
              </p>
              <Link
                href="/help"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
              >
                <HelpCircle className="w-4 h-4" />
                Centrul de ajutor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>&copy; 2025 DocumentIulia. Toate drepturile rezervate.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-blue-600">
              Confidențialitate
            </Link>
            <Link href="/terms" className="hover:text-blue-600">
              Termeni
            </Link>
            <Link href="/help" className="hover:text-blue-600">
              Ajutor
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

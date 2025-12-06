'use client';

import { useState } from 'react';
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  GraduationCap,
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  Star,
  DollarSign,
  Video,
  BookOpen,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "Venituri pasive",
    description: "Câștigă din fiecare student înscris la cursurile tale, lunar",
  },
  {
    icon: Users,
    title: "Audiență vastă",
    description: "Acces la mii de contabili și antreprenori care vor să învețe",
  },
  {
    icon: Video,
    title: "Suport tehnic",
    description: "Te ajutăm cu producția video și hosting-ul cursurilor",
  },
  {
    icon: Award,
    title: "Recunoaștere",
    description: "Devii expert recunoscut în comunitatea de contabilitate",
  },
];

const requirements = [
  "Experiență minimă de 5 ani în contabilitate sau fiscalitate",
  "Cunoștințe solide despre legislația fiscală românească",
  "Abilități de comunicare și prezentare",
  "Disponibilitate pentru a crea conținut de calitate",
  "Pasiune pentru educație și sharing de cunoștințe",
];

const steps = [
  {
    step: 1,
    title: "Aplică online",
    description: "Completează formularul cu experiența și propunerile tale de cursuri",
  },
  {
    step: 2,
    title: "Interviu",
    description: "Discutăm despre viziunea ta și planul de conținut",
  },
  {
    step: 3,
    title: "Creează cursul",
    description: "Îți oferim ghidare și resurse pentru producție",
  },
  {
    step: 4,
    title: "Lansare",
    description: "Publicăm cursul și începi să câștigi",
  },
];

const testimonials = [
  {
    name: "Andrei Ionescu",
    role: "Expert contabil, 15 ani experiență",
    quote: "Am lansat primul curs acum 6 luni și deja am peste 500 de studenți. Venitul suplimentar m-a ajutat enorm.",
    rating: 5,
  },
  {
    name: "Maria Stancu",
    role: "Consultant fiscal",
    quote: "Echipa DocumentIulia m-a ajutat cu tot procesul. De la filmare până la marketing, totul a fost profesionist.",
    rating: 5,
  },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  specialization: string;
  courseIdea: string;
  linkedin: string;
  gdprConsent: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  experience?: string;
  specialization?: string;
  courseIdea?: string;
  gdprConsent?: string;
}

export default function BecomeInstructorPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    experience: '',
    specialization: '',
    courseIdea: '',
    linkedin: '',
    gdprConsent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Numele trebuie să aibă minim 3 caractere';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Adresa de email nu este validă';
    }

    if (!formData.experience) {
      newErrors.experience = 'Selectează experiența';
    }

    if (!formData.specialization) {
      newErrors.specialization = 'Selectează specializarea';
    }

    if (!formData.courseIdea.trim()) {
      newErrors.courseIdea = 'Descrie ideea de curs';
    } else if (formData.courseIdea.trim().length < 50) {
      newErrors.courseIdea = 'Descrierea trebuie să aibă minim 50 caractere';
    }

    if (!formData.gdprConsent) {
      newErrors.gdprConsent = 'Trebuie să accepți termenii și condițiile';
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
      const response = await fetch('/api/instructor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          experience: '',
          specialization: '',
          courseIdea: '',
          linkedin: '',
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
          <Link
            href="/courses"
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi la cursuri
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <GraduationCap className="w-4 h-4" />
              Program Instructori
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Împărtășește cunoștințele tale de contabilitate
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Devino instructor pe platforma DocumentIulia și ajută mii de profesioniști să își dezvolte cariera în contabilitate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#apply"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Aplică acum
              </a>
              <a
                href="#benefits"
                className="inline-flex items-center justify-center gap-2 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:border-slate-400 transition"
              >
                Află mai multe
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center">
              <GraduationCap className="w-32 h-32 text-white/30" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">+45%</p>
                  <p className="text-sm text-slate-500">Creștere venituri</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            De ce să devii instructor?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
          Ce căutăm la instructori
        </h2>
        <p className="text-center text-slate-600 mb-12">
          Vrem să colaborăm cu profesioniști dedicați care pot oferi valoare studenților noștri
        </p>
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <ul className="space-y-4">
            {requirements.map((req) => (
              <li key={req} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Cum funcționează?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">{step.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-blue-100 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          Ce spun instructorii noștri
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-600 italic mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply" className="bg-slate-50 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
            Aplică pentru a deveni instructor
          </h2>
          <p className="text-center text-slate-600 mb-8">
            Completează formularul și te vom contacta în 48 de ore
          </p>

          {submitStatus === 'success' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Aplicație trimisă cu succes!
              </h3>
              <p className="text-slate-600 mb-6">
                Îți mulțumim pentru interes. Te vom contacta în 48 de ore pentru următorii pași.
              </p>
              <button
                onClick={() => setSubmitStatus('idle')}
                className="text-blue-600 font-medium hover:underline"
              >
                Trimite o altă aplicație
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Experiență în contabilitate <span className="text-red-500">*</span>
                </label>
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.experience ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selectează</option>
                  <option value="5-10">5-10 ani</option>
                  <option value="10-15">10-15 ani</option>
                  <option value="15+">15+ ani</option>
                </select>
                {errors.experience && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.experience}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Specializare principală <span className="text-red-500">*</span>
                </label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.specialization ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selectează</option>
                  <option value="contabilitate-generala">Contabilitate generală</option>
                  <option value="fiscalitate">Fiscalitate și taxe</option>
                  <option value="salarizare">Salarizare și HR</option>
                  <option value="efactura">E-Factura și digitalizare</option>
                  <option value="audit">Audit și control</option>
                  <option value="genai">GenAI și Automatizare</option>
                  <option value="fonduri">Fonduri EU și PNRR</option>
                </select>
                {errors.specialization && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.specialization}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Idee de curs <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="courseIdea"
                  value={formData.courseIdea}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                    errors.courseIdea ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Descrie pe scurt cursul pe care ai vrea să îl creezi (minim 50 caractere)..."
                />
                {errors.courseIdea && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.courseIdea}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {formData.courseIdea.length}/50 caractere minim
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Link LinkedIn sau portofoliu
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://linkedin.com/in/..."
                />
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
                    Accept{" "}
                    <Link href="/terms" className="text-blue-600 hover:underline">
                      Termenii și Condițiile
                    </Link>{" "}
                    și{" "}
                    <Link href="/privacy" className="text-blue-600 hover:underline">
                      Politica de Confidențialitate
                    </Link>
                    . <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.gdprConsent && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.gdprConsent}
                  </p>
                )}
              </div>

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Eroare la trimitere</p>
                    <p className="text-sm text-red-600">
                      A apărut o problemă. Te rugăm să încerci din nou.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Se trimite...
                  </>
                ) : (
                  'Trimite aplicația'
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>© 2025 DocumentIulia. Toate drepturile rezervate.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-blue-600">Confidențialitate</Link>
            <Link href="/terms" className="hover:text-blue-600">Termeni</Link>
            <Link href="/help" className="hover:text-blue-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

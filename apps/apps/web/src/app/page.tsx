"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Calculator,
  Receipt,
  TrendingUp,
  Users,
  BookOpen,
  MessageSquare,
  Shield,
  Zap,
  CheckCircle,
  Menu,
  X,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Facturare Electronică",
    description: "Generare și trimitere e-Factura direct către ANAF SPV",
  },
  {
    icon: Calculator,
    title: "Calcul TVA Automat",
    description: "Gestionare coduri TVA românești și calcul automat",
  },
  {
    icon: Receipt,
    title: "OCR Bonuri",
    description: "Scanare și procesare automată a bonurilor fiscale",
  },
  {
    icon: TrendingUp,
    title: "Rapoarte SAF-T",
    description: "Generare rapoarte SAF-T conforme cu cerințele ANAF",
  },
  {
    icon: Users,
    title: "Gestiune Clienți",
    description: "Bază de date completă cu clienți și furnizori",
  },
  {
    icon: Shield,
    title: "Conformitate ANAF",
    description: "Totul conform legislației fiscale românești",
  },
];

const stats = [
  { value: "172+", label: "Endpoint-uri API" },
  { value: "20", label: "Module" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Suport" },
];


export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">DocumentIulia</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-slate-600 hover:text-blue-600 transition">
              Funcționalități
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-blue-600 transition">
              Prețuri
            </Link>
            <Link href="/courses" className="text-slate-600 hover:text-blue-600 transition">
              Cursuri
            </Link>
            <Link href="/forum" className="text-slate-600 hover:text-blue-600 transition">
              Forum
            </Link>
            <Link href="/blog" className="text-slate-600 hover:text-blue-600 transition">
              Blog
            </Link>
            <Link href="/contact" className="text-slate-600 hover:text-blue-600 transition">
              Contact
            </Link>
            <Link href="/help" className="text-slate-600 hover:text-blue-600 transition">
              Ajutor
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/sign-in" className="text-slate-600 hover:text-blue-600 transition">
              Autentificare
            </Link>
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Începe Gratuit
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-4 space-y-3">
              <Link
                href="/features"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Funcționalități
              </Link>
              <Link
                href="/pricing"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Prețuri
              </Link>
              <Link
                href="/courses"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Cursuri
              </Link>
              <Link
                href="/forum"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Forum
              </Link>
              <Link
                href="/blog"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/contact"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/help"
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ajutor
              </Link>
              <div className="pt-3 border-t space-y-3">
                <Link
                  href="/sign-in"
                  className="block py-2 text-slate-600 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Autentificare
                </Link>
                <Link
                  href="/sign-up"
                  className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Începe Gratuit
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Platformă Completă de{" "}
            <span className="text-blue-600">Contabilitate</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Soluție integrată pentru contabilitate, facturare electronică e-Factura,
            raportare SAF-T și conformitate fiscală pentru companii din România.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Începe Gratuit
            </Link>
            <Link
              href="https://documentiulia.ro/api/v2/docs"
              target="_blank"
              className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
            >
              Vezi API Docs
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stat.value}</div>
              <div className="text-slate-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Funcționalități Complete
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-2xl text-white">
              <MessageSquare className="w-12 h-12 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Forum Comunitate</h3>
              <p className="mb-6 text-blue-100">
                Discută cu alți contabili și antreprenori, pune întrebări și
                împărtășește experiențe.
              </p>
              <Link
                href="/forum"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Intră în Forum
                <CheckCircle className="w-5 h-5" />
              </Link>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-2xl text-white">
              <BookOpen className="w-12 h-12 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Cursuri Online</h3>
              <p className="mb-6 text-emerald-100">
                Învață contabilitate și fiscalitate românească cu cursuri
                interactive și certificări.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition"
              >
                Vezi Cursurile
                <CheckCircle className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900">DocumentIulia</span>
              </div>
              <p className="text-slate-600">
                Platformă completă de contabilitate pentru România.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Produs</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/features" className="text-slate-600 hover:text-blue-600">
                    Funcționalități
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-slate-600 hover:text-blue-600">
                    Prețuri
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://documentiulia.ro/api/v2/docs"
                    className="text-slate-600 hover:text-blue-600"
                  >
                    API Docs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Comunitate</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/forum" className="text-slate-600 hover:text-blue-600">
                    Forum
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="text-slate-600 hover:text-blue-600">
                    Cursuri
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-slate-600 hover:text-blue-600">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-slate-600 hover:text-blue-600">
                    Confidențialitate
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-slate-600 hover:text-blue-600">
                    Termeni și Condiții
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-slate-600 hover:text-blue-600">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-slate-600 hover:text-blue-600">
                    Ajutor
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-slate-600">
            <p>&copy; {new Date().getFullYear()} DocumentIulia. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

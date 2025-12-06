import Link from "next/link";
import {
  FileText,
  ArrowRight,
  Receipt,
  Sparkles,
  BarChart3,
  Shield,
  Users,
  Zap,
  Globe,
  Clock,
  CheckCircle,
  ArrowLeft,
  Building2,
  CreditCard,
  FileSpreadsheet,
  Bot,
  Lock,
  Smartphone,
} from "lucide-react";

const mainFeatures = [
  {
    icon: Receipt,
    title: "E-Factura ANAF",
    description: "Integrare completă cu Sistemul Privat Virtual (SPV) pentru trimiterea și primirea facturilor electronice.",
    benefits: [
      "Trimitere automată către ANAF",
      "Descărcare facturi primite",
      "Validare în timp real",
      "Istoric complet transmisii",
    ],
    color: "blue",
  },
  {
    icon: Sparkles,
    title: "Extragere AI",
    description: "Tehnologie avansată de recunoaștere optică pentru extragerea automată a datelor din documente.",
    benefits: [
      "OCR pentru bonuri și facturi",
      "Categorizare inteligentă",
      "Învățare continuă",
      "Acuratețe 98%+",
    ],
    color: "purple",
  },
  {
    icon: BarChart3,
    title: "Rapoarte SAF-T",
    description: "Generare automată a rapoartelor SAF-T conforme cu cerințele ANAF pentru audit fiscal.",
    benefits: [
      "Format XML valid",
      "Validare înainte de export",
      "Istoric rapoarte",
      "Export programat",
    ],
    color: "emerald",
  },
  {
    icon: FileSpreadsheet,
    title: "Calcul TVA Automat",
    description: "Sistem avansat de calcul și reconciliere TVA cu suport pentru toate cotele din România.",
    benefits: [
      "Cote 19%, 9%, 5%, 0%",
      "TVA la încasare",
      "Deconturi D300",
      "Reconciliere automată",
    ],
    color: "amber",
  },
  {
    icon: CreditCard,
    title: "Import Bancar",
    description: "Importă automat extrasele bancare și reconciliază plățile cu facturile emise.",
    benefits: [
      "Suport toate băncile RO",
      "Format CSV și XML",
      "Matching automat",
      "Notificări plăți",
    ],
    color: "cyan",
  },
  {
    icon: Users,
    title: "Multi-utilizator",
    description: "Colaborează eficient cu echipa și contabilul, cu roluri și permisiuni granulare.",
    benefits: [
      "Roluri personalizate",
      "Acces pe companii",
      "Audit activitate",
      "Invitații email",
    ],
    color: "pink",
  },
];

const additionalFeatures = [
  { icon: Building2, title: "Multi-companie", description: "Gestionează mai multe firme din același cont" },
  { icon: Globe, title: "Facturi internaționale", description: "Suport pentru tranzacții în EUR și USD" },
  { icon: Clock, title: "Automatizări", description: "Facturi recurente și remindere automate" },
  { icon: Bot, title: "Asistent AI", description: "Răspunsuri instant la întrebări contabile" },
  { icon: Lock, title: "Securitate avansată", description: "Criptare end-to-end și 2FA" },
  { icon: Smartphone, title: "Aplicație mobilă", description: "Acces de oriunde, oricând" },
  { icon: Zap, title: "API complet", description: "Integrează cu orice sistem extern" },
  { icon: Shield, title: "Backup automat", description: "Date salvate zilnic în cloud" },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-600", border: "border-cyan-200" },
  pink: { bg: "bg-pink-100", text: "text-pink-600", border: "border-pink-200" },
};

export default function FeaturesPage() {
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
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition">
              <ArrowLeft className="w-4 h-4" />
              Înapoi
            </Link>
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Începe Gratuit
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          Tot ce ai nevoie pentru contabilitate
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
          O platformă completă care simplifică facturarea, raportarea și conformitatea fiscală pentru afacerea ta.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Începe Gratuit
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:border-slate-400 transition"
          >
            Vezi prețurile
          </Link>
        </div>
      </section>

      {/* Main Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          Funcționalități principale
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon;
            const colors = colorClasses[feature.color];
            return (
              <div
                key={feature.title}
                className={`bg-white rounded-2xl border-2 ${colors.border} p-6 hover:shadow-lg transition`}
              >
                <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-7 h-7 ${colors.text}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Și multe altele...
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white rounded-xl p-5 border border-slate-200">
                  <Icon className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">
          De ce DocumentIulia?
        </h2>
        <p className="text-center text-slate-600 mb-12">
          Compară cu metodele tradiționale de contabilitate
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-100 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-500 mb-4">Metoda tradițională</h3>
            <ul className="space-y-3">
              {[
                "Introducere manuală a datelor",
                "Erori frecvente de transcriere",
                "Ore pierdute cu birocrația",
                "Costuri ridicate contabilitate",
                "Risc amenzi ANAF",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-slate-600">
                  <span className="w-5 h-5 bg-slate-300 rounded-full flex items-center justify-center text-white text-xs">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-semibold text-blue-100 mb-4">Cu DocumentIulia</h3>
            <ul className="space-y-3">
              {[
                "Extragere automată cu AI",
                "Acuratețe 98%+",
                "Automatizări care economisesc timp",
                "Costuri reduse semnificativ",
                "Conformitate garantată",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-blue-600 text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pregătit să simplifici contabilitatea?
          </h2>
          <p className="text-blue-100 mb-8">
            Încearcă gratuit și descoperă cât de ușor poate fi.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
          >
            Începe Gratuit - Fără card
            <ArrowRight className="w-5 h-5" />
          </Link>
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

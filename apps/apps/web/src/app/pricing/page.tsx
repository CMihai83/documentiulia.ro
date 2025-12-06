import Link from "next/link";
import {
  Check,
  Zap,
  Building2,
  Crown,
  FileText,
  Users,
  Receipt,
  BarChart3,
  Shield,
  Phone,
  HelpCircle,
} from "lucide-react";

const plans = [
  {
    name: "Gratuit",
    description: "Perfect pentru freelanceri și PFA",
    price: "0",
    period: "pentru totdeauna",
    features: [
      "Până la 10 facturi/lună",
      "1 companie",
      "Export PDF facturi",
      "Calcul TVA automat",
      "Suport email",
    ],
    limitations: [
      "Fără e-Factura ANAF",
      "Fără rapoarte avansate",
    ],
    cta: "Începe Gratuit",
    ctaLink: "/sign-up",
    popular: false,
    icon: FileText,
  },
  {
    name: "Professional",
    description: "Pentru afaceri în creștere",
    price: "49",
    period: "/lună",
    features: [
      "Facturi nelimitate",
      "3 companii",
      "E-Factura ANAF integrat",
      "Rapoarte SAF-T",
      "Import bancar automat",
      "OCR bonuri fiscale",
      "Suport prioritar",
      "Export contabil",
    ],
    limitations: [],
    cta: "Începe Acum",
    ctaLink: "/sign-up?plan=pro",
    popular: true,
    icon: Zap,
  },
  {
    name: "Business",
    description: "Pentru echipe și firme mari",
    price: "149",
    period: "/lună",
    features: [
      "Tot ce include Professional",
      "Companii nelimitate",
      "Utilizatori nelimitați",
      "API acces complet",
      "Integrări personalizate",
      "Manager cont dedicat",
      "Training echipă",
      "SLA garantat 99.9%",
    ],
    limitations: [],
    cta: "Contactează-ne",
    ctaLink: "/help",
    popular: false,
    icon: Building2,
  },
];

const features = [
  {
    icon: Receipt,
    title: "E-Factura ANAF",
    description: "Integrare completă cu Sistemul Privat Virtual pentru facturare electronică",
  },
  {
    icon: BarChart3,
    title: "Rapoarte SAF-T",
    description: "Generare automată rapoarte SAF-T conforme cu cerințele ANAF",
  },
  {
    icon: Users,
    title: "Multi-utilizator",
    description: "Colaborează cu echipa ta și contabilul în timp real",
  },
  {
    icon: Shield,
    title: "Securitate",
    description: "Date criptate, backup automat și conformitate GDPR",
  },
];

export default function PricingPage() {
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
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          Prețuri simple și transparente
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Alege planul potrivit pentru afacerea ta. Fără costuri ascunse, fără surprize.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl shadow-sm border-2 p-8 ${
                  plan.popular
                    ? "border-blue-600 shadow-lg scale-105"
                    : "border-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Cel mai popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${plan.popular ? "bg-blue-100" : "bg-slate-100"}`}>
                    <Icon className={`w-6 h-6 ${plan.popular ? "text-blue-600" : "text-slate-600"}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-sm text-slate-500">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">{plan.price} RON</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-slate-400">
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">—</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaLink}
                  className={`block w-full py-3 px-4 rounded-xl text-center font-semibold transition ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Toate planurile includ
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          Întrebări frecvente
        </h2>
        <div className="space-y-6">
          {[
            {
              q: "Pot schimba planul oricând?",
              a: "Da, poți face upgrade sau downgrade oricând. Modificările se aplică de la următoarea perioadă de facturare.",
            },
            {
              q: "Există perioadă de probă?",
              a: "Planul Gratuit poate fi folosit fără limită de timp. Pentru planurile plătite, oferim 14 zile garanție de returnare a banilor.",
            },
            {
              q: "Ce metode de plată acceptați?",
              a: "Acceptăm carduri de credit/debit (Visa, Mastercard), transfer bancar și plată prin factura fiscală pentru companii.",
            },
            {
              q: "Datele mele sunt în siguranță?",
              a: "Da, folosim criptare end-to-end, backup zilnic și serverele noastre sunt găzduite în UE, conform GDPR.",
            },
          ].map((faq) => (
            <div key={faq.q} className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
              <p className="text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pregătit să simplifici contabilitatea?
          </h2>
          <p className="text-blue-100 mb-8">
            Alătură-te miilor de companii care folosesc DocumentIulia
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
            >
              Începe Gratuit
            </Link>
            <Link
              href="/help"
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Contactează-ne
            </Link>
          </div>
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

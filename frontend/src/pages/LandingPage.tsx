import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Brain,
  Zap,
  Shield,
  BarChart3,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">DocumentIulia</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/courses" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                Cursuri
              </Link>
              <Link to="/forum" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                Forum
              </Link>
              <Link to="/fiscal-law" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                Legislație Fiscală
              </Link>
              <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
                Conectare
              </Link>
              <Link to="/register" className="btn-primary">
                Începe Gratuit
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Închide meniul' : 'Deschide meniul'}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 animate-slide-up">
              <div className="flex flex-col gap-2">
                <Link
                  to="/courses"
                  className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cursuri
                </Link>
                <Link
                  to="/forum"
                  className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Forum
                </Link>
                <Link
                  to="/fiscal-law"
                  className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Legislație Fiscală
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Conectare
                </Link>
                <Link
                  to="/register"
                  className="btn-primary mx-4 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Începe Gratuit
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">AI-Powered Financial Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Contabilitatea Ta,
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
              Automatizată cu AI
            </span>
          </h1>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Uită de foi de calcul nesfârșite. DocumentIulia automatizează contabilitatea,
            prezice fluxul de numerar și oferă sfaturi fiscale AI bazate pe legislația românească.
            Economisește 15 ore pe săptămână.
          </p>

          <div className="flex gap-4 justify-center">
            <Link to="/register" className="btn-primary px-8 py-4 text-lg flex items-center gap-2">
              Începe Gratuit
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-secondary px-8 py-4 text-lg">
              Vezi Demo
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Fără card bancar • Gratuit 14 zile • Anulezi oricând
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-primary-600 mb-2">2,500+</div>
            <div className="text-gray-600">Afaceri din România</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-primary-600 mb-2">15 ore</div>
            <div className="text-gray-600">Economisite/Săptămână</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-primary-600 mb-2">98.5%</div>
            <div className="text-gray-600">Acuratețe AI</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
            <div className="text-gray-600">Monitorizare Automată</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Tot ce ai nevoie pentru contabilitate inteligentă
          </h2>
          <p className="text-xl text-gray-600">
            Funcționalități puternice adaptate legislației românești - economisești timp și bani
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Consultant AI de Business</h3>
            <p className="text-gray-600">
              Primește recomandări personalizate bazate pe contextul afacerii tale.
              Decizii mai inteligente, rezultate mai bune - cu puterea AI.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Predicție Flux de Numerar</h3>
            <p className="text-gray-600">
              Previziuni cu acuratețe de 98%. Știi exact când ai nevoie de finanțare
              sau când poți investi surplusul. Zero surprize neplăcute.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Facturare Automată</h3>
            <p className="text-gray-600">
              Creează, trimite și urmărește facturi automat. Încasează mai repede
              cu reminder-e inteligente și plăți online integrate.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Rapoarte în Timp Real</h3>
            <p className="text-gray-600">
              Dashboard-uri interactive actualizate instant. Înțelegi performanța
              afacerii tale dintr-o privire - fără Excel complicat.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Gestionare Cheltuieli</h3>
            <p className="text-gray-600">
              Scanează bonuri cu telefonul. AI categorizează automat cheltuielile
              și generează rapoarte pentru contabil - economisești ore întregi.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Securitate Bancară + GDPR</h3>
            <p className="text-gray-600">
              Datele tale criptate 256-bit end-to-end. Conformitate totală GDPR
              și legislație fiscală românească. Datele tale sunt în siguranță.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border-2 border-primary-200">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Forum Comunitate
              <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">NOU</span>
            </h3>
            <p className="text-gray-600 mb-4">
              Pune întrebări, primește răspunsuri de la experți, împărtășește cunoștințe.
              Sistem de reputație, badge-uri și leaderboard - învață împreună!
            </p>
            <Link to="/forum" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
              Explorează forumul
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border-2 border-primary-200">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Cursuri Finance
              <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">NOU</span>
            </h3>
            <p className="text-gray-600 mb-4">
              40 de lecții interactive despre contabilitate și fiscalitate românească.
              Învață cu flashcard-uri, quizuri și aplicații practice.
            </p>
            <Link to="/courses" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
              Vezi cursurile
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-gray-600 mb-6">Perfect for freelancers</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">
                $29
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Up to 50 invoices/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Basic AI insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Expense tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
              <Link to="/register" className="btn-secondary w-full text-center">
                Start Free Trial
              </Link>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-primary-600 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
              <p className="text-gray-600 mb-6">For growing businesses</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">
                $79
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Unlimited invoices</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Advanced AI insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Cash flow forecasting</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Custom reports</span>
                </li>
              </ul>
              <Link to="/register" className="btn-primary w-full text-center">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For large organizations</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">
                Custom
                <span className="text-lg font-normal text-gray-600"></span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">On-premise deployment</span>
                </li>
              </ul>
              <Link to="/register" className="btn-secondary w-full text-center">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Gata să-ți automatizezi contabilitatea?</h2>
          <p className="text-xl mb-8 text-primary-100">
            Alătură-te la mii de antreprenori români care folosesc deja DocumentIulia
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2">
              Începe Acum Gratuit
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold">DocumentIulia</span>
              </div>
              <p className="text-sm">
                Platformă de contabilitate inteligentă pentru afaceri moderne din România.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 DocumentIulia. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

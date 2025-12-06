'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  Book,
  Video,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  Clock,
  Star,
  Send,
  Headphones,
  Sparkles,
  Calculator,
  Receipt,
  Building2,
  FileCheck,
  Users,
  CreditCard,
  Settings,
  Zap,
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: number;
  views: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface VideoTutorial {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  category: string;
}

const faqCategories = [
  { id: 'all', name: 'Toate' },
  { id: 'facturare', name: 'Facturare' },
  { id: 'efactura', name: 'e-Factura' },
  { id: 'tva', name: 'TVA' },
  { id: 'cont', name: 'Cont' },
  { id: 'plati', name: 'Plăți' },
];

const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'Cum emit o factură electronică (e-Factura)?',
    answer: 'Pentru a emite o e-Factura, mergi la secțiunea Facturi, creează o factură nouă și completează toate datele obligatorii. După salvare, apasă butonul "Trimite la e-Factura". Sistemul va genera automat fișierul XML și îl va transmite către ANAF. Vei primi confirmarea în câteva minute.',
    category: 'efactura',
  },
  {
    id: '2',
    question: 'Care sunt termenele pentru declarația TVA (D300)?',
    answer: 'Declarația D300 trebuie depusă până pe data de 25 a lunii următoare perioadei de raportare. Pentru plătitorii lunari de TVA, termenul este pe 25 lunar. Pentru plătitorii trimestriali, termenul este pe 25 a primei luni din trimestrul următor. DocumentIulia te notifică automat cu 7 zile înainte.',
    category: 'tva',
  },
  {
    id: '3',
    question: 'Cum îmi conectez contul bancar?',
    answer: 'Mergi la Setări > Integrări și selectează banca ta. Vei fi redirecționat către site-ul băncii pentru autorizare. După confirmare, tranzacțiile se vor sincroniza automat. Acceptăm Banca Transilvania, BCR, BRD, ING, Raiffeisen și alte bănci românești.',
    category: 'plati',
  },
  {
    id: '4',
    question: 'Ce fac dacă am primit o eroare la trimiterea e-Facturii?',
    answer: 'Erorile comune includ: cod fiscal invalid, adresă incompletă sau format incorect. Verifică datele clientului și ale firmei tale. Dacă eroarea persistă, contactează suportul cu numărul de index sau mesajul de eroare. Poți retrimite factura după corectarea datelor.',
    category: 'efactura',
  },
  {
    id: '5',
    question: 'Cum anulez sau stornez o factură?',
    answer: 'Pentru a storna o factură, deschide factura originală și apasă "Generează Storno". Se va crea automat o factură cu valori negative care anulează factura originală. Pentru e-Facturi, stornarea va fi transmisă automat la ANAF.',
    category: 'facturare',
  },
  {
    id: '6',
    question: 'Pot schimba planul de abonament?',
    answer: 'Da, poți face upgrade sau downgrade oricând din Setări > Abonament. La upgrade, plătești diferența proporțională pentru perioada rămasă. La downgrade, noul preț se aplică de la următoarea factură. Nu există penalități pentru schimbarea planului.',
    category: 'cont',
  },
  {
    id: '7',
    question: 'Cum funcționează scanarea bonurilor (OCR)?',
    answer: 'Încarcă o poză a bonului din secțiunea Bonuri sau folosește camera dispozitivului. AI-ul nostru extrage automat: comerciant, dată, sumă, TVA și produse. Verifică datele și confirmă. Bonul va fi arhivat și categorisit automat.',
    category: 'facturare',
  },
  {
    id: '8',
    question: 'Ce este SAF-T și când trebuie să-l depun?',
    answer: 'SAF-T (Standard Audit File for Tax) este un format standard de raportare fiscală către ANAF. Se depune lunar, până la sfârșitul lunii următoare. DocumentIulia generează automat fișierul D406 din datele tale contabile. Verifică și trimite din secțiunea SAF-T.',
    category: 'tva',
  },
];

const helpArticles: HelpArticle[] = [
  {
    id: '1',
    title: 'Ghid complet pentru e-Factura',
    description: 'Tot ce trebuie să știi despre facturarea electronică în România',
    category: 'efactura',
    readTime: 10,
    views: 2345,
    icon: FileText,
  },
  {
    id: '2',
    title: 'Configurare inițială a contului',
    description: 'Pași pentru configurarea completă a firmei tale',
    category: 'cont',
    readTime: 5,
    views: 1890,
    icon: Settings,
  },
  {
    id: '3',
    title: 'Înțelegerea TVA în România',
    description: 'Cote TVA, scutiri și declarații obligatorii',
    category: 'tva',
    readTime: 15,
    views: 3421,
    icon: Calculator,
  },
  {
    id: '4',
    title: 'Gestionarea cheltuielilor',
    description: 'Cum să categorizezi și deduci cheltuielile corect',
    category: 'facturare',
    readTime: 8,
    views: 1567,
    icon: Receipt,
  },
  {
    id: '5',
    title: 'Conectarea cu băncile',
    description: 'Sincronizare automată cu conturile bancare',
    category: 'plati',
    readTime: 6,
    views: 987,
    icon: CreditCard,
  },
  {
    id: '6',
    title: 'Rapoarte financiare',
    description: 'Generarea și interpretarea rapoartelor',
    category: 'facturare',
    readTime: 12,
    views: 2134,
    icon: Building2,
  },
];

const videoTutorials: VideoTutorial[] = [
  { id: '1', title: 'Prima ta factură în 5 minute', duration: '5:32', thumbnail: '', category: 'facturare' },
  { id: '2', title: 'Conectare ANAF e-Factura', duration: '8:15', thumbnail: '', category: 'efactura' },
  { id: '3', title: 'Scanare bonuri cu OCR', duration: '3:45', thumbnail: '', category: 'facturare' },
  { id: '4', title: 'Generare raport SAF-T', duration: '6:20', thumbnail: '', category: 'tva' },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });

  const filteredFAQ = faqItems.filter(
    item =>
      (selectedCategory === 'all' || item.category === selectedCategory) &&
      (searchQuery === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = helpArticles.filter(
    article =>
      selectedCategory === 'all' || article.category === selectedCategory
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Cum te putem ajuta?</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Caută în documentație sau contactează echipa de suport
        </p>

        {/* Search */}
        <div className="mt-6 relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută întrebări, articole, tutoriale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Book, label: 'Documentație', desc: 'Ghiduri detaliate', href: '#articles' },
          { icon: Video, label: 'Video Tutoriale', desc: 'Învață vizual', href: '#videos' },
          { icon: MessageCircle, label: 'Chat Live', desc: 'Răspuns instant', href: '#contact' },
          { icon: Sparkles, label: 'Consultant AI', desc: 'Întrebări fiscale', href: '/ai-consultant' },
        ].map((action, index) => (
          <motion.a
            key={action.label}
            href={action.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary hover:shadow-lg transition-all group"
          >
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl group-hover:bg-primary/10 transition-colors">
              <action.icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-primary" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {action.label}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{action.desc}</p>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {faqCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Întrebări Frecvente
        </h2>
        <div className="space-y-3">
          {filteredFAQ.map((item) => (
            <div
              key={item.id}
              className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="font-medium pr-4">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                    expandedFAQ === item.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {expandedFAQ === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-gray-600 dark:text-gray-400">
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        {filteredFAQ.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Nu am găsit întrebări pentru căutarea ta
          </p>
        )}
      </div>

      {/* Articles Section */}
      <div id="articles">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Book className="w-5 h-5 text-primary" />
          Articole Populare
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-primary/10 transition-colors">
                  <article.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {article.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readTime} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" />
                      {article.views.toLocaleString()} vizualizări
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video Tutorials */}
      <div id="videos">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Video Tutoriale
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {videoTutorials.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="relative h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-black/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs bg-black/70 text-white rounded">
                  {video.duration}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" className="grid lg:grid-cols-2 gap-6">
        {/* Contact Form */}
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Trimite un Mesaj
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subiect</label>
              <select
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="">Selectează subiectul</option>
                <option value="facturare">Întrebare despre facturare</option>
                <option value="efactura">Problemă e-Factura</option>
                <option value="tehnic">Problemă tehnică</option>
                <option value="cont">Cont și abonament</option>
                <option value="altele">Altele</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mesajul tău</label>
              <textarea
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Descrie problema sau întrebarea ta..."
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
              />
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
              Trimite Mesajul
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-6 border border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-xl">
                <Headphones className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Suport Prioritar</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Disponibil pentru planurile Professional și Enterprise
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>+40 21 XXX XXXX</span>
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                  L-V 9:00-18:00
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>support@documentiulia.ro</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <span>Chat live în aplicație</span>
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                  Răspuns &lt; 5 min
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold mb-3">Timp mediu de răspuns</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Chat live</span>
                <span className="font-medium text-green-600">&lt; 5 minute</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                <span className="font-medium">&lt; 24 ore</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Telefon</span>
                <span className="font-medium text-green-600">Instant</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Status Sistem
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 font-medium">Toate sistemele funcționează normal</span>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
            >
              Vezi pagina de status
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

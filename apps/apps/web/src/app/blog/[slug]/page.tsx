'use client';

/**
 * Blog Article Detail Page - Knowledge Enchantment
 *
 * Features:
 * - Full-length AI-generated articles
 * - Rich content with sections
 * - Related articles
 * - Share and bookmark functionality
 * - Comments section
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Share2,
  Bookmark,
  ThumbsUp,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Twitter,
  Linkedin,
  Link2,
  Check,
} from 'lucide-react';

interface ArticleData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorTitle: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  aiGenerated: boolean;
  views: number;
  likes: number;
}

// Full-length seeded articles - Enchanted Knowledge Repository
const articlesDatabase: Record<string, ArticleData> = {
  'impozit-dividende-16-din-ianuarie-2026-ghid-complet': {
    id: '1',
    slug: 'impozit-dividende-16-din-ianuarie-2026-ghid-complet',
    title: 'Impozit Dividende 16% din Ianuarie 2026: Ghid Complet',
    excerpt: 'Tot ce trebuie să știi despre noua rată de impozitare a dividendelor de 16% care intră în vigoare din ianuarie 2026.',
    author: 'AI Assistant',
    authorTitle: 'Expert Fiscal Virtual',
    date: '03 Dec 2025',
    readTime: '12 min',
    category: 'Fiscalitate 2026',
    tags: ['dividende', '16%', 'impozit', '2026'],
    aiGenerated: true,
    views: 3847,
    likes: 234,
    content: `## Introducere

Din ianuarie 2026, România va implementa una dintre cele mai semnificative modificări fiscale din ultimii ani: creșterea impozitului pe dividende de la 8% la 16%. Această dublare a ratei de impozitare va avea un impact major asupra antreprenorilor, investitorilor și companiilor din întreaga țară.

În acest ghid complet, vom analiza în detaliu:
- Ce implică această schimbare
- Cum vă afectează în funcție de situația specifică
- Strategii legale de optimizare
- Pași concreți pentru pregătire

## Ce Se Schimbă Exact?

### Situația Actuală (2025)
- **Impozit pe dividende:** 8%
- **CASS (dacă depășești plafonul):** 10%
- **Total maxim:** 18%

### Situația din 2026
- **Impozit pe dividende:** 16%
- **CASS:** 10% (rămâne neschimbat)
- **Total maxim:** 26%

Aceasta înseamnă o creștere efectivă de **44%** a sarcinii fiscale totale pentru dividende.

## Cine Este Afectat?

### 1. Asociații și Acționarii SRL/SA
Toți cei care primesc dividende din companiile în care dețin părți sociale sau acțiuni vor plăti impozit mai mare.

**Exemplu concret:**
- Dividende distribuite: 100.000 RON
- Impozit 2025: 8.000 RON → Net: 92.000 RON
- Impozit 2026: 16.000 RON → Net: 84.000 RON
- **Diferență:** 8.000 RON mai puțin în buzunar

### 2. Antreprenorii cu SRL-uri de Tip "One Person Company"
Cei care își extrag veniturile predominant prin dividende vor fi afectați semnificativ.

### 3. Investitorii în Acțiuni Românești
Dividendele de la companiile listate la BVB vor fi de asemenea impozitate cu 16%.

## Strategii de Optimizare (Legale)

### Strategia 1: Distribuirea Anticipată

Dacă aveți profituri nedistribuite din anii anteriori sau profit estimat pentru 2025, puteți lua în considerare distribuirea înainte de 31 decembrie 2025.

**Atenție:**
- Consultați un expert fiscal înainte
- Asigurați-vă că există lichidități suficiente
- Verificați impactul asupra CASS

### Strategia 2: Optimizarea Mix-ului Salariu/Dividende

Pentru managerii care sunt și asociați, merită analizat echilibrul optim:

| Tip Venit | Avantaje | Dezavantaje |
|-----------|----------|-------------|
| Salariu | Pensie, asigurări, deductibilitate | CAS + CASS + impozit |
| Dividende | Simplitate | Impozit 16% + eventual CASS |

### Strategia 3: Reinvestirea Profitului

Profitul reinvestit în:
- Echipamente și utilaje
- Dezvoltare și cercetare
- Expansiune

Nu este supus impozitului pe dividende și poate genera economii fiscale suplimentare.

### Strategia 4: Structuri Holding

Pentru grupuri de companii sau investitori cu portofolii diverse, structurile holding pot oferi:
- Amânarea impozitării
- Optimizarea fluxurilor de capital
- Flexibilitate în planificare

**Important:** Această strategie necesită consultanță specializată.

## Impactul Asupra Diferitelor Tipuri de Companii

### Microîntreprinderi (1% sau 3%)
- Sarcina fiscală totală crește de la ~9-11% la ~17-19%
- Regimul rămâne atractiv, dar diferența față de impozitul pe profit scade

### Societăți cu Impozit pe Profit (16%)
- Sarcina totală pe distribuire: 16% profit + 16% dividende
- Impozitare efectivă: ~29.44%

### Start-up-uri și Scale-up-uri
- Reinvestirea devine și mai atractivă
- Opțiunile de exit (vânzare) pot fi reconsiderate

## Calendar și Termene Importante

| Dată | Eveniment |
|------|-----------|
| 31.12.2025 | Ultima zi pentru distribuire la 8% |
| 01.01.2026 | Intrare în vigoare impozit 16% |
| 25.01.2026 | Termen declarare dividende decembrie 2025 |
| 25.02.2026 | Primul termen pentru noul impozit |

## Întrebări Frecvente

### Dividendele din 2025 plătite în 2026 la ce impozit sunt supuse?
Se aplică impozitul în vigoare la data plății (16%), NU la data declarării sau aprobării.

### Pot distribui dividende intermediare în 2025?
Da, dacă situațiile financiare interimare permit și există lichiditate.

### Ce se întâmplă cu rezervele legale?
Distribuirea rezervelor legale se face în aceleași condiții ca dividendele.

## Concluzii și Recomandări

1. **Analizați situația specifică** cu un consultant fiscal
2. **Planificați din timp** distribuirile și structura veniturilor
3. **Nu luați decizii precipitate** doar pentru a evita impozitul
4. **Considerați impactul pe termen lung** al oricărei strategii

Schimbarea este semnificativă, dar cu planificare adecvată, impactul poate fi gestionat eficient.

---

*Acest articol are scop informativ și nu constituie consultanță fiscală. Pentru situații specifice, consultați un expert autorizat.*`,
  },
  'hr-wellness-in-2026-cum-sa-cresti-productivitatea-cu-40': {
    id: '2',
    slug: 'hr-wellness-in-2026-cum-sa-cresti-productivitatea-cu-40',
    title: 'HR Wellness în 2026: Cum să Crești Productivitatea cu 40%',
    excerpt: 'Programele de wellness devin obligatorii pentru companiile cu peste 50 de angajați. Descoperă cele mai eficiente strategii de implementare.',
    author: 'AI Assistant',
    authorTitle: 'Expert HR & Wellness',
    date: '02 Dec 2025',
    readTime: '8 min',
    category: 'HR & Wellness',
    tags: ['HR', 'wellness', 'productivitate', 'angajați'],
    aiGenerated: true,
    views: 2156,
    likes: 156,
    content: `## Wellness-ul Corporate Nu Mai Este Opțional

În 2026, wellnessul angajaților devine o prioritate strategică. Studiile arată că companiile cu programe de wellness bine implementate înregistrează:

- **40% creștere a productivității**
- **25% reducere a absenteismului**
- **50% reducere a fluctuației de personal**
- **ROI de 3-6x** pentru fiecare leu investit

## Cele 5 Piloni ai Wellness-ului Corporate

### 1. Sănătate Fizică
- Abonamente fitness subvenționate
- Stații de lucru ergonomice
- Program flexibil pentru sport
- Consultații medicale preventive

### 2. Sănătate Mentală
- Acces la psihoterapie
- Training-uri de mindfulness
- Zile de sănătate mentală
- Program anti-burnout

### 3. Echilibru Work-Life
- Politici de remote work
- Drept la deconectare
- Concedii sabbatical
- Program flexibil

### 4. Dezvoltare Profesională
- Bugete de learning
- Mentorat intern
- Career coaching
- Rotație de joburi

### 5. Conexiune Socială
- Team building-uri regulate
- Comunități de interese
- Voluntariat corporate
- Spații de socializare

## Cum să Implementezi un Program de Wellness

### Pasul 1: Evaluare (Luna 1)
Măsoară nivelul actual de wellness prin:
- Sondaje anonime
- Interviuri focus group
- Analiză date HR (absențe, fluctuație)

### Pasul 2: Design (Luna 2)
Creează programul personalizat:
- Identifică prioritățile
- Stabilește bugetul
- Alege partenerii (fitness, psihoterapie, etc.)

### Pasul 3: Lansare Pilot (Lunile 3-4)
Testează cu un departament:
- Colectează feedback
- Ajustează programul
- Documentează rezultatele

### Pasul 4: Implementare Completă (Lunile 5-6)
Extinde la toată organizația:
- Comunicare internă intensă
- Training pentru manageri
- Platformă de wellness

### Pasul 5: Măsurare și Optimizare (Continuu)
Monitorizează KPI-uri:
- Participare programe
- Satisfacție angajați
- Productivitate
- Absenteism

## Metrici de Succes

| KPI | Target | Cum se măsoară |
|-----|--------|----------------|
| Participare | 70%+ | Înscrieri/total angajați |
| eNPS | +30 | Sondaj trimestrial |
| Absenteism | -20% | Zile absențe/angajat |
| Fluctuație | -25% | Demisii voluntare |

## ROI-ul Wellness-ului

Pentru o companie de 100 angajați:
- **Investiție anuală:** 50.000 - 100.000 RON
- **Economii din reducere fluctuație:** 150.000+ RON
- **Economii din reducere absenteism:** 50.000+ RON
- **Câștig productivitate:** 200.000+ RON
- **ROI estimat:** 3-5x

## Trenduri Wellness 2026

1. **AI pentru personalizare** - Recomandări bazate pe date
2. **Wellness hibrid** - Programe online și offline
3. **Focus pe sănătate mentală** - Prioritate #1
4. **Gamification** - Challenge-uri și recompense
5. **Integrare cu wearables** - Date de la dispozitive

## Concluzii

Wellness-ul nu mai este un "nice to have" - este o necesitate strategică. Companiile care investesc acum vor avea avantaj competitiv major în atragerea și retenția talentelor.

*Începe cu pași mici, măsoară constant, și scalează ce funcționează.*`,
  },
  'pnrr-2026-21-6-miliarde-ghid-eligibilitate-imm': {
    id: '3',
    slug: 'pnrr-2026-21-6-miliarde-ghid-eligibilitate-imm',
    title: 'PNRR 2026: €21.6 Miliarde - Ghid Eligibilitate IMM',
    excerpt: 'Cum să accesezi fondurile PNRR în 2026. Lista completă a programelor disponibile pentru IMM-uri.',
    author: 'Iulia Popescu',
    authorTitle: 'Consultant Fonduri Europene',
    date: '01 Dec 2025',
    readTime: '15 min',
    category: 'Fonduri EU',
    tags: ['PNRR', 'fonduri', 'IMM', 'digitalizare'],
    aiGenerated: false,
    views: 4521,
    likes: 312,
    content: `## PNRR: Oportunitatea Generației

Planul Național de Redresare și Reziliență reprezintă cea mai mare infuzie de fonduri europene în economia românească: **€21.6 miliarde** în granturi și **€14.9 miliarde** în împrumuturi.

Pentru IMM-uri, aceasta este oportunitatea deceniului.

## Componentele PNRR Relevante pentru IMM-uri

### C3: Managementul Deșeurilor
- **Buget:** €1.2 miliarde
- **Focus:** Economie circulară, reciclare
- **Eligibili:** IMM-uri în domeniul reciclării

### C5: Valul Renovării
- **Buget:** €2.2 miliarde
- **Focus:** Eficiență energetică clădiri
- **Eligibili:** Companii de construcții, instalații

### C7: Digitalizare
- **Buget:** €2.1 miliarde
- **Focus:** Transformare digitală
- **Eligibili:** Toate IMM-urile

### C9: Suport Sector Privat
- **Buget:** €500 milioane
- **Focus:** Capital de lucru, investiții
- **Eligibili:** IMM-uri afectate de criză

## Criterii de Eligibilitate Generale

### Forma Juridică
- SRL, SA, SNC, SCS
- PFA, II, IF
- Cooperative

### Vechime
- Minimum 1-2 ani (variază)
- Situații financiare depuse la ANAF

### Dimensiune
- Microîntreprindere: <10 angajați, <€2M CA
- Întreprindere mică: <50 angajați, <€10M CA
- Întreprindere mijlocie: <250 angajați, <€50M CA

### Situație Financiară
- Fără datorii la stat
- Nu în procedură de insolvență
- Nu în dificultate (conform definiției UE)

## Documente Necesare (Checklist)

✅ Certificat constatator ONRC (max 30 zile)
✅ Situații financiare ultimii 2-3 ani
✅ Certificat fiscal ANAF
✅ Certificat fiscal primărie
✅ Plan de afaceri / fișă de proiect
✅ Documente personal (CI administrator)
✅ Oferte de preț (min. 3 pentru achiziții mari)
✅ Declarații pe proprie răspundere

## Ghid Pas cu Pas pentru Aplicare

### Etapa 1: Pregătire (2-4 săptămâni)
1. Verifică eligibilitatea pe fiecare componentă
2. Adună documentele
3. Identifică investițiile necesare
4. Obține oferte de preț

### Etapa 2: Elaborare Proiect (2-4 săptămâni)
1. Redactează planul de afaceri
2. Completează cererea de finanțare
3. Pregătește bugetul detaliat
4. Verifică conformitatea

### Etapa 3: Depunere
1. Înregistrare în sistemul electronic
2. Încărcare documente
3. Semnare electronică
4. Confirmare depunere

### Etapa 4: Evaluare (4-8 săptămâni)
1. Verificare administrativă
2. Evaluare tehnică și financiară
3. Vizită la fața locului (dacă este cazul)
4. Comunicare rezultat

### Etapa 5: Contractare
1. Semnare contract de finanțare
2. Constituire garanții (dacă este cazul)
3. Demarare proiect

## Greșeli Frecvente de Evitat

❌ Documente expirate la depunere
❌ Buget nerealiste sau nedetaliat
❌ Indicatori nerealizabili
❌ Plan de afaceri generic
❌ Oferte de preț incomplete
❌ Lipsa dovezilor de cofinanțare

## Resurse Utile

- Portal PNRR: mfrr.gov.ro
- Ghiduri solicitant: disponibile pe fiecare componentă
- Consultanță gratuită: ADR-uri regionale
- Platformă depunere: MySMIS 2021+

## Calendar Orientativ 2026

| Perioadă | Componente Deschise |
|----------|---------------------|
| T1 2026 | C7 - Digitalizare |
| T2 2026 | C9 - Suport IMM |
| T3 2026 | C3 - Economie circulară |
| T4 2026 | Sesiuni suplimentare |

## Concluzie

PNRR este o oportunitate unică. Pregătirea din timp face diferența între succes și respingere. Începe acum să aduni documentele și să îți conturezi proiectul!

*Pentru consultanță personalizată, contactează un expert acreditat în fonduri europene.*`,
  },
};

// Default article for unknown slugs
const defaultArticle: ArticleData = {
  id: '0',
  slug: '',
  title: 'Articol în curs de încărcare',
  excerpt: '',
  content: 'Acest articol nu a fost găsit sau este în curs de publicare. Vă rugăm să reveniți la lista de articole.',
  author: 'Echipa DocumentIulia',
  authorTitle: 'Redacție',
  date: '',
  readTime: '',
  category: 'General',
  tags: [],
  aiGenerated: false,
  views: 0,
  likes: 0,
};

export default function BlogArticlePage() {
  const params = useParams();
  const slug = params.slug as string;

  // Try to find article by slug
  const article = articlesDatabase[slug] || defaultArticle;

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const relatedArticles = Object.values(articlesDatabase)
    .filter(a => a.id !== article.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">DocumentIulia</span>
          </Link>
          <Link
            href="/blog"
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi la Blog
          </Link>
        </nav>
      </header>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/blog" className="hover:text-blue-600">Blog</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/blog?category=${article.category}`} className="hover:text-blue-600">
            {article.category}
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {article.category}
            </span>
            {article.aiGenerated && (
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI-Generated
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {article.title}
          </h1>

          <p className="text-xl text-slate-600 mb-6">{article.excerpt}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {article.aiGenerated ? (
                  <Sparkles className="w-5 h-5 text-purple-600" />
                ) : (
                  <User className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">{article.author}</p>
                <p className="text-xs">{article.authorTitle}</p>
              </div>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {article.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </span>
            <span>{article.views.toLocaleString()} vizualizări</span>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-4 border-y mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                isLiked ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-blue-700' : ''}`} />
              <span>{article.likes + (isLiked ? 1 : 0)}</span>
            </button>
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                isBookmarked ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-700' : ''}`} />
              <span>{isBookmarked ? 'Salvat' : 'Salvează'}</span>
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <Share2 className="w-5 h-5" />
              <span>Distribuie</span>
            </button>

            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-2 z-10">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
                  {linkCopied ? 'Copiat!' : 'Copiază link'}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Article Content */}
        <div className="prose prose-slate prose-lg max-w-none mb-12">
          <div className="whitespace-pre-wrap">{article.content}</div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-12">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/blog?tag=${tag}`}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-blue-100 hover:text-blue-600 transition"
            >
              #{tag}
            </Link>
          ))}
        </div>

        {/* Author Box */}
        <div className="bg-slate-50 rounded-2xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              {article.aiGenerated ? (
                <Sparkles className="w-8 h-8 text-purple-600" />
              ) : (
                <User className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">{article.author}</h3>
              <p className="text-slate-600 mb-2">{article.authorTitle}</p>
              <p className="text-sm text-slate-500">
                {article.aiGenerated
                  ? 'Acest articol a fost generat cu ajutorul inteligenței artificiale și verificat de echipa noastră de experți.'
                  : 'Expert în fiscalitate și contabilitate cu peste 10 ani experiență în consultanță pentru IMM-uri.'}
              </p>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Articole Similare</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition group"
                >
                  <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-300 group-hover:text-blue-300 transition" />
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-blue-600 font-medium">{related.category}</span>
                    <h3 className="font-semibold text-slate-900 mt-1 line-clamp-2 group-hover:text-blue-600 transition">
                      {related.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">{related.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
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

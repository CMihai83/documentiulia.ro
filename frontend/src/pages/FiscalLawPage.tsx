import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, BookOpen, FileText, Calendar, ChevronDown, ChevronUp, Download, Sparkles, AlertCircle, Info } from 'lucide-react';

interface QnAItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface HotTopic {
  title: string;
  summary: string;
  urgency: 'urgent' | 'important' | 'info';
  effectiveDate: string;
}

interface Template {
  title: string;
  code: string;
  description: string;
}

const FiscalLawPage: React.FC = () => {
  const [activeQnA, setActiveQnA] = useState<number | null>(null);
  const [qnaFilter, setQnaFilter] = useState('all');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<{ answer: string; references: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const hotTopics: HotTopic[] = [
    {
      title: 'Modificări Cod Fiscal 2025',
      summary: 'Noi praguri TVA și modificări la impozitul pe profit pentru microîntreprinderi',
      urgency: 'urgent',
      effectiveDate: '1 ianuarie 2025'
    },
    {
      title: 'Declarația Unică 2025',
      summary: 'Termenul limită de depunere: 25 mai 2025. Noutăți privind deducerile personale.',
      urgency: 'important',
      effectiveDate: '25 mai 2025'
    },
    {
      title: 'TVA Split Payment',
      summary: 'Plata defalcată a TVA obligatorie pentru toate companiile cu cifră de afaceri peste 15.000 lei/factură',
      urgency: 'info',
      effectiveDate: 'În vigoare'
    },
    {
      title: 'e-Factura',
      summary: 'Obligativitatea sistemului RO e-Factura pentru toate tranzacțiile B2B și B2G',
      urgency: 'info',
      effectiveDate: 'În vigoare'
    }
  ];

  const templates: Template[] = [
    { title: 'Declarația Unică', code: 'D212', description: 'Pentru venituri din salarii, dividende, închirieri' },
    { title: 'Declarație TVA', code: 'D300', description: 'Declarație privind taxa pe valoarea adăugată' },
    { title: 'Bilanț Contabil', code: 'D101', description: 'Situații financiare anuale' },
    { title: 'Declarație REVISAL', code: 'REVISAL', description: 'Registrul general de evidență a salariaților' },
    { title: 'Declarație CAS/CASS', code: 'D112', description: 'Obligații de plată către bugetul de stat' },
    { title: 'Cerere Înregistrare PFA', code: 'PFA', description: 'Formular înregistrare persoană fizică autorizată' }
  ];

  const qnaItems: QnAItem[] = [
    {
      id: 1,
      question: 'Când trebuie să mă înregistrez ca plătitor de TVA?',
      category: 'tva',
      answer: `<strong>Pragul de înregistrare obligatoriu:</strong> 300.000 lei (aproximativ 60.000 EUR) cifră de afaceri în ultimele 12 luni.<br><br>
      <strong>Pași de urmat:</strong><br>
      1. Depui formularul 010 la ANAF în termen de 10 zile de la depășirea pragului<br>
      2. Primești Certificat de înregistrare în scopuri de TVA<br>
      3. Emiți facturi cu TVA începând cu luna următoare<br>
      4. Depui declarații lunare D300 până în data de 25 a lunii următoare<br><br>
      <strong>Note importante:</strong><br>
      • Poți opta pentru înregistrare voluntară chiar sub prag<br>
      • TVA standard: 19%, TVA redus: 9% (alimente, medicamente), 5% (cărți, cazare)<br>
      • Sistemul TVA la încasare disponibil pentru cifre de afaceri sub 4.5 milioane lei`
    },
    {
      id: 2,
      question: 'Ce condiții trebuie să îndeplinesc pentru regimul de microîntreprindere?',
      category: 'microenterprise',
      answer: `<strong>Condiții cumulative pentru microîntreprindere (impozit 1%):</strong><br><br>
      1. <strong>Cifră de afaceri</strong>: Maximum 500.000 EUR în anul fiscal precedent<br>
      2. <strong>Capital social</strong>: Deținut de persoane fizice în proporție de min. 25%<br>
      3. <strong>Angajați</strong>: Minimum 1 angajat cu contract full-time (sau 2 part-time)<br>
      4. <strong>Activitate autorizată</strong>: Nu bancă, asigurări, pariuri, consultanță fiscală<br><br>
      <strong>Cote de impozitare:</strong><br>
      • Cu cel puțin 1 angajat: <span style="color: #10b981; font-weight: bold;">1%</span> din cifra de afaceri<br>
      • Fără angajați sau cifră > 60.000 EUR: <span style="color: #ef4444; font-weight: bold;">3%</span> din cifra de afaceri<br><br>
      <strong>Tranziție automată la impozit pe profit (16%):</strong><br>
      • Când cifra de afaceri depășește 500.000 EUR<br>
      • Când condițiile nu mai sunt îndeplinite`
    },
    {
      id: 3,
      question: 'Cum se calculează contribuțiile sociale pentru PFA?',
      category: 'pfa',
      answer: `<strong>Contribuții obligatorii pentru PFA:</strong><br><br>
      <strong>1. CAS (Pensie) - 25% din venitul net anual</strong><br>
      • Baza de calcul: Venit brut - Cheltuieli deductibile (maxim 40%)<br>
      • Plafon minim: 12 × salariul minim brut (12 × 3.700 lei = 44.400 lei în 2025)<br>
      • Plafon maxim: 60.000 lei/an<br>
      • Datorat doar dacă venitul net > 12 salarii minime<br><br>
      <strong>2. CASS (Sănătate) - 10% din venitul net anual</strong><br>
      • Baza de calcul: Aceeași ca pentru CAS<br>
      • Plafon minim: 6 × salariul minim brut (6 × 3.700 lei = 22.200 lei în 2025)<br>
      • Obligatorie indiferent de nivelul veniturilor<br><br>
      <strong>3. Impozit pe venit - 10% din venitul net</strong><br><br>
      <strong>Exemplu calcul pentru 100.000 lei venit brut:</strong><br>
      • Cheltuieli deductibile (40%): 40.000 lei<br>
      • Venit net: 60.000 lei<br>
      • CAS (25%): 15.000 lei<br>
      • CASS (10%): 6.000 lei<br>
      • Impozit (10%): 6.000 lei<br>
      • <strong>Total obligații</strong>: 27.000 lei (27%)<br>
      • <strong>Rămâne net</strong>: 73.000 lei`
    },
    {
      id: 4,
      question: 'Ce obligații am ca angajator?',
      category: 'employer',
      answer: `<strong>Obligații lunare ale angajatorului:</strong><br><br>
      <strong>1. Înregistrare în REVISAL</strong><br>
      • Înainte de prima zi de lucru a angajatului<br>
      • Contract individual de muncă înregistrat electronic<br><br>
      <strong>2. Calcul și plată contribuții sociale (lunar până pe 25):</strong><br>
      • CAS angajat: 25% din salariul brut (reținut din salariu)<br>
      • CASS angajat: 10% din salariul brut (reținut din salariu)<br>
      • Impozit venit: 10% din (salariu brut - contribuții - deducere personală)<br>
      • CAS angajator: 4% din salariul brut (plătit de companie)<br>
      • Contribuție asigurătorie pentru muncă: 2.25% (plătit de companie)<br><br>
      <strong>3. Declarații obligatorii:</strong><br>
      • D112: Declarație privind obligațiile de plată (lunar, până pe 25)<br>
      • Fluturaș de salariu: Comunicat lunar în REVISAL<br>
      • Declarația anuală 205: Situația plăților către persoane fizice<br><br>
      <strong>Exemplu cost total pentru salariu brut 5.000 lei:</strong><br>
      • Salariu brut: 5.000 lei<br>
      • CAS angajat (25%): -1.250 lei<br>
      • CASS angajat (10%): -500 lei<br>
      • Bază impozit: 3.250 lei (minus deducere 510 lei = 2.740 lei)<br>
      • Impozit (10%): -274 lei<br>
      • <strong>Salariu net primit</strong>: 2.976 lei<br>
      • CAS angajator (4%): +200 lei<br>
      • CAM (2.25%): +112.50 lei<br>
      • <strong>Cost total companie</strong>: 5.312.50 lei`
    },
    {
      id: 5,
      question: 'Ce cheltuieli sunt deductibile fiscal?',
      category: 'deductible',
      answer: `<strong>Cheltuieli deductibile fiscal (conform Codului Fiscal):</strong><br><br>
      <strong>✅ Deductibile 100%:</strong><br>
      • Materii prime și materiale<br>
      • Salarii și contribuții sociale<br>
      • Chirii pentru spații comerciale<br>
      • Utilități (energie, gaz, apă, internet) pentru spații comerciale<br>
      • Servicii profesionale (contabilitate, juridic, consultanță)<br>
      • Amortizarea mijloacelor fixe<br>
      • Cheltuieli de marketing și publicitate<br>
      • Servicii bancare și dobânzi<br><br>
      <strong>⚠️ Deductibile parțial:</strong><br>
      • Protocol (2% din venitul impozabil, max 5% din cheltuieli cu salariile)<br>
      • Sponsorizări (0.5% din cifra de afaceri pentru sport/cultură/religie)<br>
      • Cheltuieli sociale (5% din cheltuieli cu salariile)<br><br>
      <strong>❌ Nedeductibile:</strong><br>
      • Amenzile și penalitățile<br>
      • Cheltuieli personale ale asociaților/administratorilor<br>
      • TVA nedeductibilă<br>
      • Impozitul pe profit<br>
      • Cheltuieli fără documente justificative<br><br>
      <strong>‼️ Condiții generale de deductibilitate:</strong><br>
      1. Să fie efectuate în scopul desfășurării activității<br>
      2. Să fie justificate cu documente legale (facturi, contracte)<br>
      3. Să fie înregistrate în contabilitate<br>
      4. Să respecte reglementările fiscale specifice`
    },
    {
      id: 6,
      question: 'Cum funcționează sistemul TVA la încasare?',
      category: 'tva',
      answer: `<strong>TVA la încasare (Cash Accounting) - Sistem simplificat pentru IMM-uri:</strong><br><br>
      <strong>Condiții de eligibilitate:</strong><br>
      • Cifra de afaceri anuală sub 4.500.000 lei (aproximativ 900.000 EUR)<br>
      • Înregistrat ca plătitor de TVA<br>
      • Depunerea cererii la ANAF (formular 399)<br><br>
      <strong>Cum funcționează:</strong><br>
      • <span style="color: #10b981;">✅ Avantaj principal</span>: Plătești TVA către stat doar când încasezi de la clienți (nu la emiterea facturii)<br>
      • <span style="color: #10b981;">✅ Beneficiu cash-flow</span>: Nu blochezi bani în TVA neîncasat<br>
      • <span style="color: #ef4444;">❌ Dezavantaj</span>: Poți deduce TVA din achiziții doar când plătești furnizorilor<br><br>
      <strong>Exemplu concret:</strong><br><br>
      <em>Fără TVA la încasare (sistem normal):</em><br>
      • Emiți factură 10.000 lei + 1.900 lei TVA pe 15 ianuarie<br>
      • Încasezi de la client pe 15 martie<br>
      • <strong>Trebuie să plătești TVA (1.900 lei) până pe 25 februarie</strong> (chiar dacă nu ai încasat!)<br><br>
      <em>Cu TVA la încasare:</em><br>
      • Emiți factură 10.000 lei + 1.900 lei TVA pe 15 ianuarie<br>
      • Încasezi de la client pe 15 martie<br>
      • <strong>Plătești TVA (1.900 lei) până pe 25 aprilie</strong> (după încasare)<br><br>
      <strong>Atenție:</strong><br>
      • Facturile trebuie marcate cu mențiunea "TVA la încasare"<br>
      • Evidența separată a facturilor plătite/neplătite<br>
      • Declarația D300 cu secțiuni speciale pentru TVA la încasare`
    }
  ];

  const obligations = [
    {
      frequency: 'Lunar',
      deadline: '25 a fiecărei luni',
      items: [
        'Declarație TVA (D300) - dacă ești plătitor TVA',
        'Declarație obligații de plată (D112) - dacă ai angajați',
        'Plata TVA colectată',
        'Plata contribuții sociale angajați'
      ]
    },
    {
      frequency: 'Trimestrial',
      deadline: '25 ale lunii următoare trimestrului',
      items: [
        'Declarație informativă (D394) - tranzacții intracomunitare',
        'Situații financiare trimestriale (pentru companii mari)'
      ]
    },
    {
      frequency: 'Anual',
      deadline: 'Variabil',
      items: [
        'Declarația Unică (D212) - până pe 25 mai',
        'Declarație impozit profit/microîntreprindere (D101) - până pe 25 martie',
        'Bilanț contabil - până pe 150 zile de la încheierea exercițiului',
        'Declarație 205 - plăți către persoane fizice - până pe 28 februarie'
      ]
    }
  ];

  const toggleQnA = (id: number) => {
    setActiveQnA(activeQnA === id ? null : id);
  };

  const filterQnA = (category: string) => {
    setQnaFilter(category);
  };

  const filteredQnA = qnaFilter === 'all'
    ? qnaItems
    : qnaItems.filter(item => item.category === qnaFilter);

  const addToCalendar = (type: string) => {
    const icsContent = generateICS(type);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `obligatii_fiscale_${type}.ics`;
    link.click();
  };

  const generateICS = (type: string): string => {
    let events = '';
    const now = new Date();
    const year = now.getFullYear();

    if (type === 'monthly') {
      for (let month = 1; month <= 12; month++) {
        const date = new Date(year, month - 1, 25);
        events += `
BEGIN:VEVENT
UID:${Date.now()}-${month}@documentiulia.ro
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(date)}
SUMMARY:Declarații fiscale lunare (D300, D112)
DESCRIPTION:Termen limită depunere declarații TVA și obligații de plată
BEGIN:VALARM
TRIGGER:-P3D
DESCRIPTION:Reminder: 3 zile până la termen
ACTION:DISPLAY
END:VALARM
END:VEVENT`;
      }
    }

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AccounTech AI//Fiscal Obligations//RO
CALSCALE:GREGORIAN
METHOD:PUBLISH${events}
END:VCALENDAR`;
  };

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const sendAIQuestion = async () => {
    if (!aiQuestion.trim()) return;

    setAiLoading(true);
    try {
      const response = await fetch('/api/v1/fiscal/ai-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion })
      });

      const data = await response.json();
      if (data.success) {
        setAiResponse({
          answer: data.answer,
          references: data.references || []
        });
      }
    } catch (error) {
      console.error('Error calling AI consultant:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const urgencyColors = {
    urgent: 'border-red-500 bg-red-50',
    important: 'border-orange-500 bg-orange-50',
    info: 'border-cyan-500 bg-cyan-50'
  };

  const urgencyBadgeColors = {
    urgent: 'bg-red-500 text-white',
    important: 'bg-orange-500 text-white',
    info: 'bg-cyan-500 text-white'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AccounTech AI</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium">
                Acasă
              </Link>
              <Link to="/login" className="btn-primary">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with AI Consultant */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🇷🇴 Legislație Fiscală Română
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ghidul tău complet pentru conformitate fiscală în România
          </p>
        </div>

        {/* AI Consultant Banner */}
        <div
          className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center mb-12 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
          onClick={() => setAiModalOpen(true)}
        >
          <div className="inline-block mb-4">
            <Sparkles className="w-16 h-16 animate-pulse" />
          </div>
          <h3 className="text-3xl font-bold mb-3">AI Consultant Fiscal cu Acces la Legislație</h3>
          <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
            Consultantul nostru AI are acces la întreaga legislație fiscală română și poate interpreta cazuri complexe.
          </p>
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
          >
            <Brain className="w-5 h-5" />
            Consultă AI-ul Acum - Gratuit
          </button>
          <p className="text-sm text-indigo-200 mt-4">
            AI-ul analizează situația ta și oferă recomandări bazate pe legislația în vigoare
          </p>
        </div>
      </section>

      {/* Hot Topics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h2 className="text-3xl font-bold text-gray-900">Subiecte Fierbinți</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotTopics.map((topic, index) => (
            <div
              key={index}
              className={`border-l-4 p-6 rounded-lg shadow-md ${urgencyColors[topic.urgency]}`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900">{topic.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${urgencyBadgeColors[topic.urgency]}`}>
                  {topic.urgency === 'urgent' ? 'URGENT' : topic.urgency === 'important' ? 'IMPORTANT' : 'INFO'}
                </span>
              </div>
              <p className="text-gray-700 mb-3">{topic.summary}</p>
              <p className="text-sm text-gray-600">
                <strong>În vigoare:</strong> {topic.effectiveDate}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-primary-600" />
          <h2 className="text-3xl font-bold text-gray-900">Formulare și Template-uri</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{template.title}</h4>
                  <p className="text-sm text-gray-500">Cod: {template.code}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4 text-sm">{template.description}</p>
              <div className="flex gap-2">
                <button className="flex-1 bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors text-sm flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Descarcă PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fiscal Obligations Timeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-primary-600" />
          <h2 className="text-3xl font-bold text-gray-900">Calendar Obligații Fiscale</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {obligations.map((obligation, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
                index === 0 ? 'bg-blue-100 text-blue-800' :
                index === 1 ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {obligation.frequency}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Termen:</strong> {obligation.deadline}
              </p>
              <ul className="space-y-2">
                {obligation.items.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-primary-600 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => addToCalendar(obligation.frequency.toLowerCase())}
                className="mt-4 w-full bg-primary-50 text-primary-600 px-4 py-2 rounded hover:bg-primary-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Adaugă în Calendar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Q&A Knowledge Base */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6 text-primary-600" />
          <h2 className="text-3xl font-bold text-gray-900">Întrebări Frecvente</h2>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => filterQnA('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              qnaFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toate
          </button>
          <button
            onClick={() => filterQnA('tva')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              qnaFilter === 'tva' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            TVA
          </button>
          <button
            onClick={() => filterQnA('microenterprise')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              qnaFilter === 'microenterprise' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Microîntreprindere
          </button>
          <button
            onClick={() => filterQnA('pfa')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              qnaFilter === 'pfa' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PFA
          </button>
          <button
            onClick={() => filterQnA('employer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              qnaFilter === 'employer' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Angajatori
          </button>
          <button
            onClick={() => filterQnA('deductible')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              qnaFilter === 'deductible' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cheltuieli Deductibile
          </button>
        </div>

        <div className="space-y-4">
          {filteredQnA.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleQnA(item.id)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 text-left">{item.question}</span>
                {activeQnA === item.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              {activeQnA === item.id && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div
                    className="text-gray-700 mb-4"
                    dangerouslySetInnerHTML={{ __html: item.answer }}
                  />
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Întreabă AI pentru cazul tău specific
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ai nevoie de consultanță personalizată?</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Consultantul nostru AI poate analiza situația ta specifică și oferi recomandări bazate pe legislația în vigoare.
          </p>
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-3"
          >
            <Sparkles className="w-6 h-6" />
            Consultă AI-ul Gratuit
          </button>
        </div>
      </section>

      {/* AI Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8" />
                <div>
                  <h3 className="text-2xl font-bold">Consultant Fiscal AI</h3>
                  <p className="text-indigo-100 text-sm">Acces complet la legislația fiscală română</p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Quick Questions */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Întrebări rapide:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Trebuie să mă înregistrez la TVA?',
                    'Cum calc contribuțiile pentru PFA?',
                    'Ce înseamnă microîntreprindere?',
                    'Ce cheltuieli sunt deductibile?'
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setAiQuestion(q)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Input */}
              <div className="mb-4">
                <textarea
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Pune o întrebare despre legislația fiscală română..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={sendAIQuestion}
                disabled={aiLoading || !aiQuestion.trim()}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Se analizează...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Întreabă AI-ul
                  </>
                )}
              </button>

              {/* AI Response */}
              {aiResponse && (
                <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2">Răspuns AI:</h4>
                      <div
                        className="text-gray-700 mb-4"
                        dangerouslySetInnerHTML={{ __html: aiResponse.answer }}
                      />
                      {aiResponse.references.length > 0 && (
                        <div className="border-t border-indigo-200 pt-4">
                          <p className="text-sm font-semibold text-gray-900 mb-2">📚 Referințe legislative:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {aiResponse.references.map((ref, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <span>{ref}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            © 2025 AccounTech AI. Toate drepturile rezervate. | Informațiile prezentate au caracter informativ. Pentru consultanță fiscală personalizată, vă recomandăm să apelați la un consultant fiscal autorizat.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FiscalLawPage;

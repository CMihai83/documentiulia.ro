import React, { useState } from 'react';
import { BookOpen, TrendingUp, DollarSign, BarChart3, Settings, Calendar, Target, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';

type TutorialSection = 'kpi' | 'financial' | 'setup' | 'usage' | 'best-practices' | 'updates';

const TutorialsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<TutorialSection>('kpi');

  const sections = [
    { id: 'kpi' as TutorialSection, name: 'Interpretare KPI', icon: TrendingUp },
    { id: 'financial' as TutorialSection, name: 'Date Financiare', icon: DollarSign },
    { id: 'setup' as TutorialSection, name: 'Configurare Platformă', icon: Settings },
    { id: 'usage' as TutorialSection, name: 'Cum se Utilizează', icon: BookOpen },
    { id: 'best-practices' as TutorialSection, name: 'Best Practices', icon: Target },
    { id: 'updates' as TutorialSection, name: 'Actualizări & Mentenanță', icon: Calendar },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutoriale & Ghiduri</h1>
          <p className="text-gray-600 mt-1">Învață cum să utilizezi platforma AccountEch pentru rezultate optime</p>
        </div>

        {/* Section Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  activeSection === section.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-primary-300'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  activeSection === section.id ? 'text-primary-600' : 'text-gray-600'
                }`} />
                <p className={`text-sm font-medium text-center ${
                  activeSection === section.id ? 'text-primary-600' : 'text-gray-700'
                }`}>
                  {section.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Content Sections */}
        <div className="card">
          {activeSection === 'kpi' && <KPISection />}
          {activeSection === 'financial' && <FinancialSection />}
          {activeSection === 'setup' && <SetupSection />}
          {activeSection === 'usage' && <UsageSection />}
          {activeSection === 'best-practices' && <BestPracticesSection />}
          {activeSection === 'updates' && <UpdatesSection />}
        </div>
      </div>
    </DashboardLayout>
  );
};

const KPISection: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <TrendingUp className="w-8 h-8 text-primary-600" />
      <h2 className="text-2xl font-bold text-gray-900">Interpretare KPI (Key Performance Indicators)</h2>
    </div>

    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="border-l-4 border-green-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📈 Total Revenue (Venituri Totale)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Ce înseamnă:</strong> Suma totală a tuturor veniturilor generate din vânzări în perioada selectată.</p>
          <p><strong>Cum se interpretează:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Creștere constantă:</strong> Afacerea se dezvoltă sănătos</li>
            <li><strong>Stagnare:</strong> Necesită noi strategii de vânzare sau produse</li>
            <li><strong>Scădere:</strong> ALARMĂ! Investigați cauzele (pierdere clienți, concurență, calitate)</li>
          </ul>
          <p><strong>Acțiuni recomandate:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Comparați cu aceeași perioadă din anul precedent (YoY - Year over Year)</li>
            <li>Analizați care produse/servicii generează cele mai multe venituri</li>
            <li>Identificați tendințele sezoniere pentru a anticipa fluctuațiile</li>
          </ul>
        </div>
      </div>

      {/* Profit Metrics */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 Net Profit (Profit Net)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Ce înseamnă:</strong> Câștigul real după deducerea tuturor cheltuielilor (COGS, salarii, taxe, etc.).</p>
          <p><strong>Formula:</strong> Profit Net = Venituri Totale - Cheltuieli Totale</p>
          <p><strong>Marje de profit sănătoase (industry standard):</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Software/SaaS: 15-25%</li>
            <li>Retail: 5-10%</li>
            <li>Consultanță: 20-30%</li>
            <li>Manufacturing: 8-15%</li>
          </ul>
          <p><strong>Acțiuni dacă profitul este scăzut:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Reduceți cheltuielile operaționale (dar fără a afecta calitatea)</li>
            <li>Optimizați prețurile - analizați dacă puteți crește prețul fără a pierde clienți</li>
            <li>Negociați termeni mai buni cu furnizorii</li>
            <li>Eliminați produsele/serviciile neprofitabile</li>
          </ul>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="border-l-4 border-purple-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">💵 Cash Flow (Flux de Numerar)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Ce înseamnă:</strong> Mișcarea reală a banilor în și din afacere (diferă de profit!).</p>
          <p><strong>De ce este critic:</strong> Poți avea profit pe hârtie, dar fără cash flow pozitiv, nu poți plăti salarii sau furnizori.</p>
          <p><strong>Cum se interpretează:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cash Flow Pozitiv:</strong> Intră mai mulți bani decât ies - SĂNĂTOS</li>
            <li><strong>Cash Flow Negativ:</strong> Ieșiri mai mari decât intrări - PERICOL de insolvență</li>
          </ul>
          <p><strong>Acțiuni pentru îmbunătățire:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Reduceți termenele de plată de la clienți (de la 30 la 15 zile)</li>
            <li>Negociați termene mai lungi cu furnizorii</li>
            <li>Implementați penalități pentru facturi întârziate</li>
            <li>Oferiți discounturi pentru plăți anticipate (ex: 2% discount pentru plată în 7 zile)</li>
          </ul>
        </div>
      </div>

      {/* Outstanding Invoices */}
      <div className="border-l-4 border-orange-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📄 Outstanding Invoices (Facturi Neîncasate)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Ce înseamnă:</strong> Facturile emise dar neîncasate încă - bani care vi se datorează.</p>
          <p><strong>KPI critic:</strong> DSO (Days Sales Outstanding) - numărul mediu de zile până când încasați o factură.</p>
          <p><strong>Benchmark-uri DSO:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>0-30 zile: EXCELENT</li>
            <li>30-45 zile: BUN</li>
            <li>45-60 zile: ACCEPTABIL (dar monitorizați)</li>
            <li>60+ zile: PROBLEMATIC - risc de neplată</li>
          </ul>
          <p><strong>Acțiuni:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Monitorizați facturile "overdue" (restante) săptămânal</li>
            <li>Automatizați reminder-ele de plată (7, 14, 21 zile de la emitere)</li>
            <li>Pentru facturi &gt; 60 zile, apelați personal clientul</li>
            <li>Considerați factoring (vânzarea facturilor) pentru cash flow imediat</li>
          </ul>
        </div>
      </div>

      {/* Burn Rate */}
      <div className="border-l-4 border-red-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🔥 Burn Rate (Rata de Ardere a Capitalului)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Ce înseamnă:</strong> Viteza cu care cheltuiți banii (important pentru startup-uri și companii în creștere).</p>
          <p><strong>Formula:</strong> Burn Rate = (Cash Început Lună - Cash Sfârșit Lună) / 1 lună</p>
          <p><strong>Runway:</strong> Câte luni puteți supraviețui cu cash-ul actual la rata actuală de ardere.</p>
          <p><strong>Formula Runway:</strong> Runway = Cash Disponibil / Burn Rate Lunar</p>
          <p><strong>Exemple:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dacă aveți 100,000 RON și burn rate 20,000 RON/lună → Runway = 5 luni</li>
            <li>Dacă runway &lt; 6 luni → URGENȚĂ! Găsiți finanțare sau reduceți cheltuielile</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const FinancialSection: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <DollarSign className="w-8 h-8 text-primary-600" />
      <h2 className="text-2xl font-bold text-gray-900">Interpretarea Rapoartelor Financiare</h2>
    </div>

    <div className="space-y-6">
      {/* Profit & Loss */}
      <div className="border-l-4 border-green-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Profit & Loss (Cont de Profit și Pierdere)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Scop:</strong> Arată performanța financiară într-o perioadă (luna, trimestru, an).</p>
          <p><strong>Structură:</strong></p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-1">
            <div>Venituri (Revenue) ....................... 500,000 RON</div>
            <div>- Cost of Goods Sold (COGS) .............. -200,000 RON</div>
            <div className="border-t border-gray-300 pt-1">= Profit Brut (Gross Profit) ............ 300,000 RON (60%)</div>
            <div>- Cheltuieli Operaționale ................ -150,000 RON</div>
            <div>&nbsp;&nbsp;(Salarii, marketing, chirie, etc.)</div>
            <div className="border-t border-gray-300 pt-1">= Profit Operațional (EBITDA) ............ 150,000 RON (30%)</div>
            <div>- Dobânzi, Amortizare, Taxe .............. -50,000 RON</div>
            <div className="border-t-2 border-gray-400 pt-1 font-bold">= PROFIT NET ............................. 100,000 RON (20%)</div>
          </div>
          <p><strong>Cum se citește:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Gross Profit Margin:</strong> Trebuie &gt;50% pentru afaceri sănătoase</li>
            <li><strong>Operating Margin (EBITDA):</strong> Arată eficiența operațională</li>
            <li><strong>Net Profit Margin:</strong> Profitabilitatea reală (vezi mai sus pentru benchmark-uri)</li>
          </ul>
          <p><strong>Red Flags:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gross margin scăzut (&lt;30%) - prețuri prea mici sau COGS prea mare</li>
            <li>Operating expenses &gt; 50% din venituri - cheltuieli prea mari</li>
            <li>Profit net negativ 3+ luni consecutiv - nesustenabil</li>
          </ul>
        </div>
      </div>

      {/* Balance Sheet */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">⚖️ Balance Sheet (Bilanț Contabil)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Scop:</strong> Snapshot-ul sănătății financiare la un moment dat (spre deosebire de P&L care este o perioadă).</p>
          <p><strong>Ecuația de bază:</strong> Active = Pasive + Capital Propriu</p>
          <p><strong>Structură:</strong></p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-1">
            <div className="font-bold">ACTIVE (Assets):</div>
            <div>Cash & Echivalente ..................... 100,000 RON</div>
            <div>Facturi de încasat (AR) ................ 200,000 RON</div>
            <div>Inventar ................................ 150,000 RON</div>
            <div>Echipamente & Proprietăți ............... 300,000 RON</div>
            <div className="border-t border-gray-300 pt-1">TOTAL ACTIVE ............................ 750,000 RON</div>
            <div className="mt-3 font-bold">PASIVE (Liabilities):</div>
            <div>Facturi de plătit (AP) ................. 100,000 RON</div>
            <div>Împrumuturi ............................ 200,000 RON</div>
            <div className="border-t border-gray-300 pt-1">TOTAL PASIVE ............................ 300,000 RON</div>
            <div className="mt-3 font-bold">CAPITAL PROPRIU (Equity):</div>
            <div>Capitalul investitorilor + Profit reținut . 450,000 RON</div>
            <div className="border-t-2 border-gray-400 pt-1 font-bold">TOTAL PASIVE + CAPITAL .................. 750,000 RON</div>
          </div>
          <p><strong>Ratio-uri cheie:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Current Ratio = Active Curente / Pasive Curente</strong>
              <ul className="list-circle pl-6">
                <li>&gt;2.0 = Lichiditate excelentă</li>
                <li>1.5-2.0 = Sănătos</li>
                <li>&lt;1.0 = Risc de insolvență</li>
              </ul>
            </li>
            <li><strong>Debt-to-Equity = Total Datorii / Capital Propriu</strong>
              <ul className="list-circle pl-6">
                <li>&lt;0.5 = Risc scăzut</li>
                <li>0.5-1.5 = Moderat</li>
                <li>&gt;2.0 = Foarte îndatorat (risky)</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      {/* Cash Flow Statement */}
      <div className="border-l-4 border-purple-500 pl-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">💸 Cash Flow Statement (Situația Fluxurilor de Numerar)</h3>
        <div className="space-y-2 text-gray-700">
          <p><strong>Scop:</strong> Urmărește mișcarea REALĂ a banilor (nu accrual accounting).</p>
          <p><strong>3 Categorii:</strong></p>
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="font-semibold">1. Operating Cash Flow (din activitatea curentă)</p>
              <p>Bani din vânzări, plăți către furnizori, salarii</p>
              <p className="text-sm text-green-700 mt-1">✅ Trebuie să fie POZITIV pentru o afacere sănătoasă</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="font-semibold">2. Investing Cash Flow (din investiții)</p>
              <p>Achiziții de echipamente, vânzări de active</p>
              <p className="text-sm text-blue-700 mt-1">ℹ️ Adesea negativ (investiții în creștere)</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="font-semibold">3. Financing Cash Flow (din finanțare)</p>
              <p>Împrumuturi primite/rambursate, investiții de capital</p>
              <p className="text-sm text-orange-700 mt-1">⚠️ Monitorizați - dependența de finanțare externă poate fi riscantă</p>
            </div>
          </div>
          <p><strong>Regula de aur:</strong></p>
          <p className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500">
            <strong>Operating Cash Flow trebuie să acopere &gt;80% din cheltuielile operaționale.</strong> Dacă depindeți constant de finanțare externă pentru operațiuni zilnice, modelul de business nu este sustenabil.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const SetupSection: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <Settings className="w-8 h-8 text-primary-600" />
      <h2 className="text-2xl font-bold text-gray-900">Configurare Inițială a Platformei</h2>
    </div>

    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
      <p className="font-semibold text-blue-900">📌 Timpul estimat: 2-3 ore pentru setup complet</p>
      <p className="text-blue-800">Urmați pașii în ordine pentru rezultate optime</p>
    </div>

    <div className="space-y-6">
      {/* Step 1 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurare Companie</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Unde:</strong> Settings → Company Profile</p>
            <p><strong>Ce completați:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Denumire completă companie + CUI/CIF</li>
              <li>Adresă sediu social (pentru facturare)</li>
              <li>Persoană de contact + date bancare</li>
              <li>Logo companie (folosit pe facturi/documente)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Adăugare Utilizatori & Roluri</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Unde:</strong> Settings → Users & Permissions</p>
            <p><strong>Roluri recomandate:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Owner:</strong> Acces complet (CEO/Proprietar)</li>
              <li><strong>Admin:</strong> Toată platforma minus setări critice (CFO/Manager)</li>
              <li><strong>Accountant:</strong> Facturi, cheltuieli, rapoarte financiare</li>
              <li><strong>Sales:</strong> CRM, oportunități, oferte, facturi</li>
              <li><strong>Inventory Manager:</strong> Produse, comenzi achiziție, stocuri</li>
            </ul>
            <p className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-500 text-sm">
              ⚠️ <strong>Securitate:</strong> Nu dați acces Admin decât persoanelor de încredere. Folosiți principiul "least privilege" - doar accesul necesar pentru rol.
            </p>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Date Inițiale</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Ordin recomandat de import:</strong></p>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">1. Contacte (Customers & Vendors)</p>
                <p className="text-sm">Importați din Excel/CSV toți clienții și furnizorii existenți</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">2. Produse/Servicii</p>
                <p className="text-sm">Catalogul complet cu prețuri de vânzare și achiziție</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">3. Facturi Deschise (Outstanding)</p>
                <p className="text-sm">Doar cele neîncasate - pentru tracking corect al cash flow</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-semibold">4. Conturi Bancare</p>
                <p className="text-sm">Balante curente pentru fiecare cont</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurare Automatizări</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Automatizări esențiale:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Email Reminders:</strong> Facturi restante (7, 14, 30 zile)</li>
              <li><strong>Recurring Invoices:</strong> Pentru clienți cu abonamente/contracte lunare</li>
              <li><strong>Low Stock Alerts:</strong> Notificări când stocul scade sub prag</li>
              <li><strong>Financial Reports:</strong> Rapoarte P&L automate la sfârșitul lunii</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step 5 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">5</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Testare & Validare</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Checklist final:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>✅ Creați o factură test și trimiteți-o pe email</li>
              <li>✅ Generați un raport P&L și verificați cifrele</li>
              <li>✅ Testați fluxul CRM: Lead → Opportunity → Quote → Invoice</li>
              <li>✅ Verificați dashboard-ul - toate widget-urile afișează date?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const UsageSection: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <BookOpen className="w-8 h-8 text-primary-600" />
      <h2 className="text-2xl font-bold text-gray-900">Cum se Utilizează Platforma - Ghid Complet</h2>
    </div>

    <div className="space-y-6">
      {/* Daily Tasks */}
      <div className="border-2 border-green-300 bg-green-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6" />
          📅 Taskuri Zilnice (Daily Routine)
        </h3>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-lg">
            <p className="font-semibold text-gray-900">🌅 Dimineața (9:00 - 10:00)</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
              <li>Verificați Dashboard-ul pentru overview rapid</li>
              <li>Consultați Cash Flow forecast - sunteți pe target?</li>
              <li>Revedeți facturile overdue și trimiteți remindere</li>
              <li>Verificați AI Insights pentru alertele de azi</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="font-semibold text-gray-900">☀️ În timpul zilei (continuous)</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
              <li>Înregistrați cheltuielile imediat (nu lăsați pe final de lună!)</li>
              <li>Emiteți facturile pentru comenzi noi în aceeași zi</li>
              <li>Actualizați statusul oportunităților din CRM</li>
              <li>Marcați facturile plătite când primiți banii</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="font-semibold text-gray-900">🌙 Final de zi (17:00 - 18:00)</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
              <li>Reconciliați conturile bancare (compară sold platformă vs. sold real)</li>
              <li>Verificați task-urile incomplete din CRM</li>
              <li>Pregătiți lista de priorități pentru mâine</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Weekly Tasks */}
      <div className="border-2 border-blue-300 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          📆 Taskuri Săptămânale (Weekly Review)
        </h3>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-lg">
            <p className="font-semibold text-gray-900">Luni dimineață - Planning Session</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
              <li>Revedeți KPI-urile săptămânii trecute vs. target</li>
              <li>Planificați outreach pentru oportunități în "negotiation"</li>
              <li>Setați target-uri pentru săptămâna curentă</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="font-semibold text-gray-900">Miercuri - Mid-week Check</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
              <li>Verificați progresul către target-uri</li>
              <li>Ajustați strategia dacă e necesar</li>
              <li>Follow-up cu clienții care au oferte pending</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="font-semibold text-gray-900">Vineri - Weekly Wrap-up</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
              <li>Generați raport săptămânal (Revenue, Expenses, New Deals)</li>
              <li>Curățați CRM-ul (ștergeți lead-uri moarte)</li>
              <li>Backup-ați datele importante</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Monthly Tasks */}
      <div className="border-2 border-purple-300 bg-purple-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          📊 Taskuri Lunare (Monthly Close)
        </h3>
        <div className="space-y-2 text-gray-700">
          <p className="font-semibold">Între 1-5 ale lunii următoare:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Reconciliere completă:</strong> Verificați că toate tranzacțiile din luna trecută sunt înregistrate</li>
            <li><strong>Generați rapoarte financiare:</strong> P&L, Balance Sheet, Cash Flow pentru luna încheiată</li>
            <li><strong>Analizați performanța:</strong> Comparați cu luna anterioară și cu target-urile</li>
            <li><strong>Verificați inventory:</strong> Comparați stocul din platformă cu stocul fizic</li>
            <li><strong>Actualizați forecast-ul:</strong> Pe baza performanței lunii trecute</li>
            <li><strong>Plăți fiscale:</strong> Pregătiți declarațiile și plătiți taxele (TVA, impozit profit, etc.)</li>
          </ul>
          <div className="bg-white p-4 rounded-lg mt-4">
            <p className="font-semibold text-purple-900">🎯 Monthly Business Review Meeting</p>
            <p className="text-sm text-gray-600 mt-1">Organizați o întâlnire cu echipa pentru a discuta:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 mt-2">
              <li>Ce a mers bine? Ce învățăm?</li>
              <li>Ce nu a mers? Ce schimbăm?</li>
              <li>Care sunt target-urile pentru luna următoare?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BestPracticesSection: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <Target className="w-8 h-8 text-primary-600" />
      <h2 className="text-2xl font-bold text-gray-900">Best Practices pentru Rezultate Optime</h2>
    </div>

    <div className="space-y-6">
      {[
        {
          title: '💡 Păstrați date CLEAN',
          color: 'blue',
          items: [
            'Nu introduceți duplicate - verificați înainte dacă contactul/produsul există',
            'Folosiți naming conventions consistente (ex: "ACME SRL" nu "Acme", "acme", "ACME S.R.L.")',
            'Categorizați corect cheltuielile - ajută la rapoarte precise',
            'Ștergeți datele de test după configurarea inițială',
          ],
        },
        {
          title: '⚡ Automatizați tot ce se poate',
          color: 'green',
          items: [
            'Recurring invoices pentru clienți cu contracte lunare/anuale',
            'Email reminders automate pentru facturi (economisiți timp + creșteți rata de colectare)',
            'Low stock alerts - nu rămâneți fără inventar',
            'Rapoarte automate trimise pe email la sfârșitul lunii',
          ],
        },
        {
          title: '🔒 Securitate & Backup',
          color: 'red',
          items: [
            'Activați autentificare cu doi factori (2FA) pentru utilizatori Admin/Owner',
            'Schimbați parolele la 3 luni',
            'Export backup lunar al tuturor datelor (Settings → Export Data)',
            'Nu partajați credențiale de login - creați utilizatori separați',
          ],
        },
        {
          title: '📈 Urmăriți metrici relevanți',
          color: 'purple',
          items: [
            'Definiți 3-5 KPI-uri critice pentru afacerea voastră și monitorizați-i SĂPTĂMÂNAL',
            'Setați target-uri realiste (bazate pe date istorice + 10-20% creștere)',
            'Creați dashboard-uri personalizate pentru fiecare rol (Sales vede pipeline, CFO vede cash flow)',
            'Folosiți AI Insights - platformă identifică anomalii și oportunități automat',
          ],
        },
        {
          title: '🤝 Colaborare în echipă',
          color: 'orange',
          items: [
            'Folosiți Comments & Notes pe facturi/oportunități pentru context',
            'Atribuiți clear ownership - fiecare oportunitate trebuie să aibă un "Assigned To"',
            'Weekly stand-up cu echipa - 15 min pentru aliniare',
            'Transparență totală - toată echipa să vadă performanța în timp real',
          ],
        },
      ].map((section, idx) => (
        <div key={idx} className={`border-l-4 border-${section.color}-500 bg-${section.color}-50 p-6 rounded-lg`}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{section.title}</h3>
          <ul className="space-y-2">
            {section.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-start gap-2 text-gray-700">
                <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

const UpdatesSection: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <Calendar className="w-8 h-8 text-primary-600" />
      <h2 className="text-2xl font-bold text-gray-900">Când & Cum să Actualizați Datele</h2>
    </div>

    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-1" />
        <div>
          <p className="font-bold text-yellow-900 mb-2">Regula de aur: "Garbage In, Garbage Out"</p>
          <p className="text-yellow-800">
            Platforma este la fel de precisă ca datele pe care le introduceți. Actualizări regulate = decizii corecte bazate pe date reale.
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-6">
      {/* Real-time Updates */}
      <div className="border-2 border-green-300 bg-green-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-green-900 mb-4">⚡ Actualizări în Timp Real (Immediate)</h3>
        <div className="space-y-3 text-gray-700">
          <div className="bg-white p-4 rounded">
            <p className="font-semibold">📄 Facturi</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li><strong>Creare:</strong> Imediat după confirmare comandă (nu așteptați sfârșitul zilei)</li>
              <li><strong>Marcați ca plătită:</strong> În secunda în care vedeți banii în cont</li>
              <li><strong>De ce:</strong> Cash flow forecast-ul trebuie să fie real-time pentru decizii corecte</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded">
            <p className="font-semibold">💳 Cheltuieli</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li><strong>Înregistrare:</strong> Aceeași zi când cheltuiala apare</li>
              <li><strong>Pro tip:</strong> Fotografiați bonul și atașați la cheltuială pentru audit</li>
              <li><strong>De ce:</strong> Evitați să uitați cheltuieli → rapoarte P&L false</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded">
            <p className="font-semibold">🎯 CRM (Opportunities & Leads)</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li><strong>Status update:</strong> După fiecare interacțiune cu clientul</li>
              <li><strong>Notes:</strong> Adăugați imediat - nu veți mai ține minte peste 2 zile</li>
              <li><strong>De ce:</strong> Pipeline-ul trebuie să reflecte realitatea pentru forecast corect</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Daily Updates */}
      <div className="border-2 border-blue-300 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-blue-900 mb-4">📅 Actualizări Zilnice (End of Day)</h3>
        <div className="space-y-2 text-gray-700">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Reconciliere conturi bancare:</strong>
              <p className="text-sm">Comparați soldul din platformă cu cel din cont. Discrepanțe? Investigați imediat.</p>
            </li>
            <li>
              <strong>Inventar (dacă aveți magazin fizic):</strong>
              <p className="text-sm">Actualizați stocurile după vânzări/recepții. Greșelile se acumulează exponențial dacă așteptați.</p>
            </li>
            <li>
              <strong>Time tracking (dacă factură pe ore):</strong>
              <p className="text-sm">Înregistrați orele lucrate în aceeași zi - memory fades fast.</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Weekly Updates */}
      <div className="border-2 border-purple-300 bg-purple-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-purple-900 mb-4">📆 Actualizări Săptămânale</h3>
        <div className="space-y-2 text-gray-700">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Curățare CRM:</strong>
              <p className="text-sm">Ștergeți lead-urile "moarte" (nu răspund &gt; 3 săptămâni). Marcați won/lost pentru oportunități rezolvate.</p>
            </li>
            <li>
              <strong>Review AI Insights:</strong>
              <p className="text-sm">Platforma generează recomandări - verificați și acționați săptămânal.</p>
            </li>
            <li>
              <strong>Verificare facturi overdue:</strong>
              <p className="text-sm">Contactați clienții cu facturi &gt; 30 zile. Automatizarea e bună, dar call-ul personal e mai eficient.</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Monthly Updates */}
      <div className="border-2 border-red-300 bg-red-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-red-900 mb-4">📊 Actualizări Lunare (CRITICE)</h3>
        <div className="space-y-2 text-gray-700">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Reconciliere completă:</strong>
              <p className="text-sm">TOATE tranzacțiile trebuie să matchuiască între platformă și extrasele bancare. Zero discrepanțe admise.</p>
            </li>
            <li>
              <strong>Inventar fizic count:</strong>
              <p className="text-sm">Numărați stocul fizic și comparați cu sistemul. Ajustați discrepanțele.</p>
            </li>
            <li>
              <strong>Review & cleanup:</strong>
              <p className="text-sm">Categorii de cheltuieli, contacte duplicate, produse inactive - curățați lunar.</p>
            </li>
            <li>
              <strong>Backup complet:</strong>
              <p className="text-sm">Export all data (Settings → Export). Păstrați 3 backup-uri (luna curentă + 2 luni anterioare).</p>
            </li>
          </ul>
        </div>
      </div>

      {/* Quarterly & Annual */}
      <div className="border-2 border-orange-300 bg-orange-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-orange-900 mb-4">📈 Actualizări Trimestriale & Anuale</h3>
        <div className="space-y-3 text-gray-700">
          <div className="bg-white p-4 rounded">
            <p className="font-semibold">📊 Trimestrial (Q1, Q2, Q3, Q4)</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li>Review complet al KPI-urilor vs. target-uri anuale</li>
              <li>Ajustați strategia dacă nu sunteți on track</li>
              <li>Audit al utilizatorilor - ștergeți conturile inactive</li>
              <li>Update prices - analizați dacă prețurile trebuie ajustate (inflație, concurență)</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded">
            <p className="font-semibold">📅 Anual (ianuarie următorul)</p>
            <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
              <li><strong>Financial year close:</strong> Generați rapoarte complete pentru anul fiscal</li>
              <li><strong>Tax preparation:</strong> Pregătiți toate documentele pentru contabil/ANAF</li>
              <li><strong>Archive old data:</strong> Mutați datele vechi (&gt;2 ani) în arhivă</li>
              <li><strong>Strategic planning:</strong> Setați target-uri și bugete pentru anul următor</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default TutorialsPage;

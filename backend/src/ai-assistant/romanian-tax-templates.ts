/**
 * Romanian Tax Query Templates
 *
 * Predefined templates for common Romanian tax and compliance questions.
 * These provide instant, accurate answers for frequent user queries.
 */

export interface TaxTemplate {
  id: string;
  category:
    | 'VAT'
    | 'Income Tax'
    | 'Payroll'
    | 'Deductions'
    | 'ANAF'
    | 'e-Factura'
    | 'SAF-T'
    | 'Compliance'
    | 'Business'
    | 'HR';
  question: string;
  quickAnswer: string;
  detailedContext: string;
  relatedQueries: string[];
  tags: string[];
}

export const ROMANIAN_TAX_TEMPLATES: TaxTemplate[] = [
  // VAT Templates
  {
    id: 'vat-rate-2025',
    category: 'VAT',
    question: 'Care sunt cotele de TVA în 2025?',
    quickAnswer:
      'De la 1 august 2025: cota standard 21%, cota redusă 11% (produse alimentare, medicamente). Până atunci: 19% standard, 9% redusă.',
    detailedContext: `Conform Legii 141/2025:
- Cota standard: 21% (de la 1 august 2025, anterior 19%)
- Cota redusă: 11% (de la 1 august 2025, anterior 9%)
- Aplicabil pentru: produse alimentare, medicamente, cărți, ziare, cazare hoteluri
- Cota specială 5%: locuințe sociale (rămâne neschimbată)
- Perioada de tranziție: 1 ianuarie - 31 iulie 2025 se aplică cotele vechi`,
    relatedQueries: [
      'Când intră în vigoare noile cote de TVA?',
      'Ce produse beneficiază de cota redusă?',
      'Cum calculez TVA pentru facturi emise în iulie vs august 2025?',
    ],
    tags: ['TVA', 'Legea 141/2025', '21%', '11%', '2025'],
  },
  {
    id: 'vat-reverse-charge',
    category: 'VAT',
    question: 'Ce este taxarea inversă (reverse charge)?',
    quickAnswer:
      'TVA plătit de cumpărător, nu de vânzător. Se aplică pentru: construcții, cereale, deșeuri, gaze, energie electrică, aur, telefoane mobile, tablete, console jocuri.',
    detailedContext: `Taxarea inversă (reverse charge):
- Vânzătorul emite factură fără TVA, cu mențiunea "Taxare inversă conform art. 331/Codului Fiscal"
- Cumpărătorul înregistrează TVA colectată ȘI TVA deductibilă (autoliciv idare)
- Obligatoriu pentru: lucrări construcții, cereale/oleaginoase, deșeuri feroase/neferoase, gaze, energie
- Se aplică dacă AMBII parteneri sunt plătitori de TVA înregistrați în România
- Scop: prevenirea fraudei cu TVA în sectoare cu risc ridicat`,
    relatedQueries: [
      'Cum emit factură cu taxare inversă?',
      'Ce sectoare au taxare inversă obligatorie?',
      'Cum înregistrez factură cu reverse charge în contabilitate?',
    ],
    tags: ['TVA', 'reverse charge', 'taxare inversă', 'construcții', 'Art 331'],
  },

  // Income Tax Templates
  {
    id: 'pfa-income-tax',
    category: 'Income Tax',
    question: 'Cât este impozitul pe venit pentru PFA în 2025?',
    quickAnswer:
      'PFA plătesc 10% impozit pe venitul net (venit brut - cheltuieli deductibile). Plus contribuții sociale: 25% CASS (venit < 6 salarii medii brute) + 25% CAS (dacă venit > 12 salarii medii brute).',
    detailedContext: `Impozitare PFA 2025:
1. Impozit pe venit: 10% aplicat pe venitul net anual (venit - cheltuieli deductibile)
2. CASS (Sănătate): 25% pentru venit până la 6 salarii medii brute pe economie (aprox. 51.000 RON/an în 2025)
3. CAS (Pensie): 25% dacă venitul net anual > 12 salarii medii brute (aprox. 102.000 RON)
4. Cheltuieli deductibile: materii prime, utilități, amortizare echipamente, cursuri profesionale
5. Declarații: Declarația unică (D212) depusă până pe 25 mai pentru anul precedent
6. Plăți trimestriale: impozit + contribuții în rate`,
    relatedQueries: [
      'Ce cheltuieli pot deduce ca PFA?',
      'Când plătesc impozitul ca PFA?',
      'Care e diferența între venit brut și net?',
    ],
    tags: ['PFA', 'impozit venit', '10%', 'CASS', 'CAS', 'D212'],
  },

  // e-Factura Templates
  {
    id: 'efactura-mandatory',
    category: 'e-Factura',
    question: 'Cine are obligația de a emite e-Factura?',
    quickAnswer:
      'Obligatoriu pentru TOATE operațiunile B2B și B2G din România de la 1 ianuarie 2024. Facultativ pentru B2C. Transmitere prin SPV (sistemul e-Factura ANAF) în max 5 zile lucrătoare.',
    detailedContext: `Obligativitatea e-Factura:
- B2B (business-to-business): OBLIGATORIU de la 1 ianuarie 2024
- B2G (business-to-government): OBLIGATORIU de la 1 iulie 2022
- B2C (business-to-consumer): FACULTATIV
- Standard: RO_CIUS UBL 2.1 (XML)
- Transmitere: prin SPV ANAF sau furnizori autorizați (SmartBill, Nexus, etc.)
- Termen: max 5 zile lucrătoare de la data emiterii
- Validare: DUKIntegrator pentru verificare înainte de trimitere
- Sancțiuni: 1.000-5.000 RON pentru neconformitate`,
    relatedQueries: [
      'Cum emit e-Factura prin SPV?',
      'Ce este RO_CIUS?',
      'Pot folosi SmartBill pentru e-Factura?',
      'Ce amenzi sunt pentru e-Factura neemisă?',
    ],
    tags: ['e-Factura', 'B2B', 'B2G', 'SPV', 'ANAF', 'RO_CIUS', 'UBL 2.1'],
  },

  // SAF-T Templates
  {
    id: 'saft-d406',
    category: 'SAF-T',
    question: 'Ce este SAF-T D406 și cine trebuie să-l depună?',
    quickAnswer:
      'SAF-T D406 = raportare lunară XML cu toate facturile emise/primite. Obligatoriu de la 1 ianuarie 2025 pentru mari contribuabili, pilot până august 2026 pentru toți plătitorii TVA.',
    detailedContext: `SAF-T D406 (Standard Audit File for Tax):
- Început: 1 ianuarie 2025 (obligatoriu pentru mari contribuabili)
- Pilot: septembrie 2025 - august 2026 (6 luni grație pentru toți)
- Frecvență: LUNAR (până în ziua 25 a lunii următoare)
- Format: XML conform Order 1783/2021
- Conținut: toate facturile emise, primite, note contabile, solduri parteneri
- Dimensiune max: 500 MB per fișier PDF/XML
- Validare: DUKIntegrator înainte de trimitere
- Scop: înlocuirea Declarației 394 (D394) cu sistem automatenizat real-time`,
    relatedQueries: [
      'Cum generez SAF-T D406?',
      'Care e diferența între D394 și D406?',
      'Este obligatoriu SAF-T pentru SRL mic?',
      'Cum validez SAF-T cu DUKIntegrator?',
    ],
    tags: ['SAF-T', 'D406', 'Order 1783/2021', 'ANAF', 'XML', 'lunar'],
  },

  // Payroll & HR Templates
  {
    id: 'payroll-contributions-2025',
    category: 'Payroll',
    question: 'Care sunt contribuțiile salariale în 2025?',
    quickAnswer:
      'Angajat: 25% CAS (pensie) + 10% CASS (sănătate) = 35% din salariul brut. Angajator: 2.25% CAM (muncă). Total contribuții ~37.25% din brut.',
    detailedContext: `Contribuții salariale 2025:
Plătite de ANGAJAT (reținute din salariul brut):
- CAS (Pensie): 25%
- CASS (Sănătate): 10%
- Total angajat: 35%

Plătite de ANGAJATOR (peste salariul brut):
- CAM (Contribuția asiguratorie pentru muncă): 2.25%

Exemplu calcul:
- Salariu brut: 5.000 RON
- CAS angajat: 1.250 RON (25%)
- CASS angajat: 500 RON (10%)
- Salariu net: 3.250 RON (după impozit 10%)
- CAM angajator: 112.5 RON (2.25%)
- Cost total angajator: 5.112.5 RON`,
    relatedQueries: [
      'Cum calculez salariul net din brut?',
      'Ce este CAM 2.25%?',
      'Diferență între CAS și CASS?',
      'Cum completez fluturașul de salariu?',
    ],
    tags: ['salariu', 'CAS', 'CASS', 'CAM', '25%', '10%', '2.25%'],
  },

  // Deductions Templates
  {
    id: 'deduction-meal-vouchers',
    category: 'Deductions',
    question: 'Sunt deductibile tichetele de masă?',
    quickAnswer:
      'DA, 100% deductibile fiscal. Maxim 40.35 RON/zi (2025), neimpozabile pentru salariat. Beneficiu extrasalarial popular.',
    detailedContext: `Tichete de masă (vouchere):
- Deductibilitate fiscală: 100% pentru angajator
- Valoare maximă neimpozabilă: 40.35 RON/zi lucrătoare (2025)
- Frecvență: acordate pentru fiecare zi lucrată efectiv
- Nu se acordă pentru: concedii, zile libere, delegații cu diurnă
- Beneficii angajat: creștere venit net fără taxe
- Furnizori populari: Sodexo, Edenred, Up Romania
- Contabilizare: cheltuială cu personalul (641)
- Obligatoriu: contract cu furnizor autorizat CNP`,
    relatedQueries: [
      'Cum comand tichete de masă pentru angajați?',
      'Pot da tichete de masă și în weekend?',
      'Care sunt furnizorii autorizați de tichete?',
    ],
    tags: ['tichete masă', 'deduceri', 'beneficii', '40.35 RON', 'neimpozabil'],
  },
  {
    id: 'deduction-home-office',
    category: 'Deductions',
    question: 'Ce cheltuieli home office sunt deductibile?',
    quickAnswer:
      'Deductibile: utilități (electric, internet), mobilier birou, laptop/PC, software, cursuri. Necesită documente justificative (facturi pe firmă) și adeverință munca de acasă.',
    detailedContext: `Cheltuieli deductibile pentru munca de acasă:
- Echipamente: laptop, monitor, tastatură, mouse, webcam, căști
- Mobilier: birou, scaun ergonomic, bibliotecă
- Utilități: electricitate (proporțional), internet, telefon
- Software: Office 365, Adobe, Zoom, VPN
- Cursuri profesionale: certificări IT, limbă străină, management

Condiții deductibilitate:
- Factură/chitanță pe numele firmei (CUI)
- Justificare business: adeverință munca de acasă, contract
- Proporționalitate: utilități doar % folosit pentru muncă (ex: 30%)
- TVA deductibil: dacă firmă plătitoare TVA și factură cu TVA`,
    relatedQueries: [
      'Cum justific cheltuielile home office?',
      'Pot deduce chiria dacă lucrez de acasă?',
      'Este deductibil laptopul personal folosit pentru firmă?',
    ],
    tags: ['home office', 'deduceri', 'telemuncă', 'utilități', 'echipamente'],
  },

  // ANAF & Compliance
  {
    id: 'anaf-d112',
    category: 'ANAF',
    question: 'Ce este D112 și când se depune?',
    quickAnswer:
      'D112 = declarație informatică lunară pentru salarii și dividende. Depunere: până pe data de 25 a lunii următoare celei pentru care se depune.',
    detailedContext: `Declarația 112 (D112):
- Scop: raportare obligații fiscale pentru salarii, dividende, venituri drepturi autor
- Frecvență: LUNARĂ (pentru luni cu plăți) sau doar când există venituri
- Termen depunere: 25 ale lunii următoare (ex: ianuarie se depune până pe 25 februarie)
- Conținut:
  * Salarii brute plătite
  * Contribuții CAS, CASS, CAM calculate
  * Impozit pe venit reținut (10%)
  * Dividende plătite (dacă există)
- Formular: XML prin SPV sau online ANAF
- Sancțiuni: 500-1.000 RON pentru depunere cu întârziere`,
    relatedQueries: [
      'Cum completez D112 online?',
      'Diferență între D112 și fluturașul de salariu?',
      'Trebuie să depun D112 dacă nu am plătit salarii?',
    ],
    tags: ['D112', 'ANAF', 'salarii', 'lunar', '25 ale lunii'],
  },

  // Business Operations
  {
    id: 'business-expenses-deduction',
    category: 'Business',
    question: 'Ce cheltuieli sunt 100% deductibile fiscal?',
    quickAnswer:
      'Deductibile 100%: materii prime, utilități, chirii, salarii + contribuții, cursuri profesionale, marketing, transport marfă, telefon/internet business.',
    detailedContext: `Cheltuieli 100% deductibile fiscal (conform Art. 25 Cod Fiscal):
1. Aprovizionări: materii prime, mărfuri pentru revânzare, ambalaje
2. Utilități business: electricitate, apă, gaze, gunoi (cu documente)
3. Chirii: spații birouri, depozite (contract înregistrat ANAF)
4. Salarii + contribuții: CAS, CASS, CAM (100% deductibile)
5. Marketing: publicitate Google/Facebook, panouri, broșuri
6. Transport: combustibil (cu foaie de parcurs), leasing auto
7. Servicii profesionale: contabilitate, consultanță, legal
8. Cursuri: formare profesională angajați
9. Telefonie/internet: abonamente business
10. Asigurări: RCA, CASCO pentru mașini firmă, asigurări birouri

Condiții:
- Factură/chitanță pe firmă (CUI)
- Legătură cu activitatea (justificare economică)
- Documente suport (contracte, foi parcurs, PV recepție)`,
    relatedQueries: [
      'Este deductibilă masa cu clienții?',
      'Pot deduce mașina personală folosită pentru firmă?',
      'Ce procent din telefon pot deduce?',
    ],
    tags: [
      'deduceri',
      'cheltuieli',
      'fiscal',
      '100%',
      'Art 25',
      'Cod Fiscal',
    ],
  },

  // Quick Action Templates
  {
    id: 'quick-vat-check',
    category: 'VAT',
    question: 'Verifică rapid statusul de plătitor TVA pentru un CUI',
    quickAnswer:
      'Verificare instant prin API ANAF: introdu CUI → primești: activ/inactiv TVA, data înregistrare, nume firmă, adresă.',
    detailedContext: `Verificare CUI plătitor TVA:
- Serviciu gratuit ANAF: webserviceSPV.anaf.ro
- Informații returnate:
  * Status TVA: DA/NU (plătitor activ)
  * Data înregistrare scop TVA
  * Nume complet firmă
  * Adresă sediu social
  * CUI validat

Folosit pentru:
- Validare parteneri înainte de facturare
- Verificare reverse charge (taxare inversă)
- Conformitate e-Factura B2B
- Evitare erori în facturi (TVA aplicat greșit)`,
    relatedQueries: [
      'Cum verific un CUI online?',
      'De ce trebuie să verific dacă partenerul e plătitor TVA?',
      'Unde văd datele firmei pe ANAF?',
    ],
    tags: ['CUI', 'verificare', 'TVA', 'ANAF', 'webservice', 'API'],
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: TaxTemplate['category'],
): TaxTemplate[] {
  return ROMANIAN_TAX_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): TaxTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return ROMANIAN_TAX_TEMPLATES.filter(
    (t) =>
      t.question.toLowerCase().includes(lowerKeyword) ||
      t.quickAnswer.toLowerCase().includes(lowerKeyword) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword)),
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TaxTemplate | undefined {
  return ROMANIAN_TAX_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all template categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(ROMANIAN_TAX_TEMPLATES.map((t) => t.category)));
}

/**
 * Get quick suggestions for AI assistant
 */
export function getQuickSuggestions(limit = 6): TaxTemplate[] {
  // Most commonly asked questions
  const priorityIds = [
    'vat-rate-2025',
    'efactura-mandatory',
    'saft-d406',
    'pfa-income-tax',
    'payroll-contributions-2025',
    'quick-vat-check',
  ];

  return priorityIds
    .map((id) => getTemplateById(id))
    .filter((t): t is TaxTemplate => t !== undefined)
    .slice(0, limit);
}

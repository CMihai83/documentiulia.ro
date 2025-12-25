/**
 * Sprint 25 - Templates Library
 * Business document templates for Romanian companies
 * Includes: Contracts, Invoices, Declarations, HR Documents
 */

export interface DocumentTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: 'contract' | 'invoice' | 'declaration' | 'hr' | 'legal' | 'financial';
  subcategory: string;
  description: string;
  descriptionEn: string;
  content: string;
  variables: TemplateVariable[];
  tags: string[];
  isFree: boolean;
  downloadCount: number;
  rating: number;
  lastUpdated: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'select' | 'textarea';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export const templatesSprint25: DocumentTemplate[] = [
  // ==================== CONTRACTS ====================
  {
    id: 'contract-individual-munca',
    name: 'Contract Individual de Muncă',
    nameEn: 'Individual Employment Contract',
    category: 'contract',
    subcategory: 'employment',
    description: 'Contract standard de angajare conform Codului Muncii, actualizat 2025. Include toate clauzele obligatorii și opționale.',
    descriptionEn: 'Standard employment contract compliant with Romanian Labor Code, updated 2025.',
    tags: ['angajare', 'munca', 'salariat', 'cod muncii', 'HR'],
    isFree: false,
    downloadCount: 1250,
    rating: 4.8,
    lastUpdated: '2025-01-15',
    variables: [
      { name: 'employer_name', label: 'Denumire Angajator', type: 'text', required: true, placeholder: 'SC Example SRL' },
      { name: 'employer_cui', label: 'CUI Angajator', type: 'text', required: true, placeholder: 'RO12345678' },
      { name: 'employer_address', label: 'Sediu Social Angajator', type: 'text', required: true },
      { name: 'employer_registry', label: 'Nr. Înregistrare Registrul Comerțului', type: 'text', required: true, placeholder: 'J40/123/2020' },
      { name: 'employee_name', label: 'Nume Complet Angajat', type: 'text', required: true },
      { name: 'employee_cnp', label: 'CNP Angajat', type: 'text', required: true },
      { name: 'employee_address', label: 'Domiciliu Angajat', type: 'text', required: true },
      { name: 'employee_id_series', label: 'Serie CI', type: 'text', required: true },
      { name: 'employee_id_number', label: 'Număr CI', type: 'text', required: true },
      { name: 'job_title', label: 'Funcția', type: 'text', required: true, placeholder: 'Programator' },
      { name: 'job_code', label: 'Cod COR', type: 'text', required: true, placeholder: '251201' },
      { name: 'department', label: 'Departament', type: 'text', required: false },
      { name: 'work_location', label: 'Locul Muncii', type: 'text', required: true },
      { name: 'contract_type', label: 'Tip Contract', type: 'select', required: true, options: ['Nedeterminată', 'Determinată'], defaultValue: 'Nedeterminată' },
      { name: 'contract_duration', label: 'Durată (luni)', type: 'number', required: false, placeholder: '12' },
      { name: 'start_date', label: 'Data Începere', type: 'date', required: true },
      { name: 'trial_period', label: 'Perioadă Probă (zile)', type: 'number', required: false, defaultValue: '90' },
      { name: 'work_hours', label: 'Ore/Săptămână', type: 'number', required: true, defaultValue: '40' },
      { name: 'work_schedule', label: 'Program Lucru', type: 'text', required: true, defaultValue: 'Luni-Vineri, 09:00-18:00' },
      { name: 'gross_salary', label: 'Salariu Brut (RON)', type: 'currency', required: true },
      { name: 'payment_day', label: 'Ziua Plății', type: 'number', required: true, defaultValue: '10' },
      { name: 'annual_leave', label: 'Zile Concediu/An', type: 'number', required: true, defaultValue: '21' },
      { name: 'notice_period', label: 'Preaviz (zile)', type: 'number', required: true, defaultValue: '20' },
    ],
    content: `CONTRACT INDIVIDUAL DE MUNCĂ
Nr. _______ din data de _______

PĂRȚILE CONTRACTANTE

1. ANGAJATORUL
{{employer_name}}, cu sediul în {{employer_address}}, înregistrată la Registrul Comerțului sub nr. {{employer_registry}}, CUI {{employer_cui}}, reprezentată legal prin _________________, în calitate de Administrator,

și

2. ANGAJATUL
{{employee_name}}, domiciliat(ă) în {{employee_address}}, posesor/posesoare al/a CI seria {{employee_id_series}} nr. {{employee_id_number}}, CNP {{employee_cnp}},

au încheiat prezentul contract individual de muncă, în conformitate cu prevederile Legii nr. 53/2003 – Codul Muncii, republicat, cu modificările și completările ulterioare.

Art. 1. OBIECTUL CONTRACTULUI
Angajatorul încadrează pe angajat în funcția de {{job_title}}, cod COR {{job_code}}, în cadrul departamentului {{department}}.

Art. 2. DURATA CONTRACTULUI
Prezentul contract se încheie pe durată {{contract_type}}, începând cu data de {{start_date}}.
{{#if contract_duration}}Durata determinată: {{contract_duration}} luni.{{/if}}

Art. 3. LOCUL MUNCII
Activitatea se desfășoară la {{work_location}}.

Art. 4. PERIOADA DE PROBĂ
Perioada de probă este de {{trial_period}} zile calendaristice.

Art. 5. DURATA MUNCII
Durata normală a timpului de muncă este de {{work_hours}} ore/săptămână.
Programul de lucru: {{work_schedule}}.

Art. 6. SALARIZARE
a) Salariul de bază lunar brut: {{gross_salary}} RON
b) Alte elemente constitutive ale salariului: conform regulamentului intern
c) Data plății salariului: {{payment_day}} ale lunii următoare

Art. 7. DREPTURI ȘI OBLIGAȚII ALE PĂRȚILOR

7.1. Drepturile angajatului:
- dreptul la salarizare pentru munca depusă
- dreptul la repaus zilnic și săptămânal
- dreptul la concediu de odihnă anual: {{annual_leave}} zile lucrătoare
- dreptul la egalitate de șanse și de tratament
- dreptul la securitate și sănătate în muncă
- dreptul la formare profesională

7.2. Obligațiile angajatului:
- să îndeplinească atribuțiile ce îi revin conform fișei postului
- să respecte disciplina muncii și regulamentul intern
- să respecte normele de securitate și sănătate în muncă
- să păstreze confidențialitatea datelor și informațiilor

7.3. Drepturile angajatorului:
- să dea dispoziții cu caracter obligatoriu pentru angajat
- să exercite controlul asupra modului de îndeplinire a sarcinilor
- să constate săvârșirea abaterilor disciplinare și să aplice sancțiuni

7.4. Obligațiile angajatorului:
- să asigure condiții corespunzătoare de muncă
- să acorde salariul și drepturile salariale cuvenite
- să asigure formarea profesională a angajatului
- să respecte normele de securitate și sănătate în muncă

Art. 8. ÎNCETAREA CONTRACTULUI
Prezentul contract încetează în condițiile prevăzute de lege.
Termenul de preaviz: {{notice_period}} zile lucrătoare.

Art. 9. DISPOZIȚII FINALE
Prezentul contract s-a încheiat în două exemplare, câte unul pentru fiecare parte.

ANGAJATOR,                                    ANGAJAT,
{{employer_name}}                             {{employee_name}}

_____________________                         _____________________
(semnătura și ștampila)                      (semnătura)

Data: {{start_date}}
`,
  },

  {
    id: 'contract-prestari-servicii',
    name: 'Contract de Prestări Servicii',
    nameEn: 'Service Agreement Contract',
    category: 'contract',
    subcategory: 'services',
    description: 'Contract pentru prestări servicii între persoane juridice sau cu PFA/II. Include clauze de confidențialitate și garanții.',
    descriptionEn: 'Service agreement for B2B or freelancer services with confidentiality and warranty clauses.',
    tags: ['servicii', 'B2B', 'PFA', 'colaborare', 'externalizare'],
    isFree: true,
    downloadCount: 2340,
    rating: 4.7,
    lastUpdated: '2025-01-10',
    variables: [
      { name: 'provider_name', label: 'Denumire Prestator', type: 'text', required: true },
      { name: 'provider_cui', label: 'CUI Prestator', type: 'text', required: true },
      { name: 'provider_address', label: 'Sediu Prestator', type: 'text', required: true },
      { name: 'provider_bank', label: 'Bancă Prestator', type: 'text', required: true },
      { name: 'provider_iban', label: 'IBAN Prestator', type: 'text', required: true },
      { name: 'client_name', label: 'Denumire Beneficiar', type: 'text', required: true },
      { name: 'client_cui', label: 'CUI Beneficiar', type: 'text', required: true },
      { name: 'client_address', label: 'Sediu Beneficiar', type: 'text', required: true },
      { name: 'service_description', label: 'Descriere Servicii', type: 'textarea', required: true },
      { name: 'contract_value', label: 'Valoare Contract (RON)', type: 'currency', required: true },
      { name: 'payment_terms', label: 'Termen Plată (zile)', type: 'number', required: true, defaultValue: '30' },
      { name: 'start_date', label: 'Data Începere', type: 'date', required: true },
      { name: 'end_date', label: 'Data Finalizare', type: 'date', required: true },
      { name: 'warranty_period', label: 'Garanție (luni)', type: 'number', required: false, defaultValue: '12' },
    ],
    content: `CONTRACT DE PRESTĂRI SERVICII
Nr. _______ din data de _______

PĂRȚILE CONTRACTANTE

1. PRESTATORUL
{{provider_name}}, cu sediul în {{provider_address}}, CUI {{provider_cui}}, cont IBAN {{provider_iban}} deschis la {{provider_bank}}, reprezentat legal prin _________________, în calitate de Administrator,

și

2. BENEFICIARUL
{{client_name}}, cu sediul în {{client_address}}, CUI {{client_cui}}, reprezentat legal prin _________________, în calitate de Administrator,

au convenit încheierea prezentului contract de prestări servicii.

Art. 1. OBIECTUL CONTRACTULUI
Prestatorul se obligă să execute pentru Beneficiar următoarele servicii:
{{service_description}}

Art. 2. DURATA CONTRACTULUI
Prezentul contract intră în vigoare la data de {{start_date}} și este valabil până la data de {{end_date}}.

Art. 3. PREȚUL ȘI MODALITATEA DE PLATĂ
3.1. Valoarea totală a contractului: {{contract_value}} RON + TVA
3.2. Plata se efectuează în termen de {{payment_terms}} zile de la emiterea facturii
3.3. Facturarea se face conform prevederilor legale privind e-Factura

Art. 4. OBLIGAȚIILE PRESTATORULUI
a) să execute serviciile cu profesionalism și în termenele stabilite
b) să respecte specificațiile tehnice agreate
c) să păstreze confidențialitatea informațiilor primite
d) să asigure garanție pentru serviciile prestate: {{warranty_period}} luni

Art. 5. OBLIGAȚIILE BENEFICIARULUI
a) să pună la dispoziția Prestatorului informațiile și documentele necesare
b) să efectueze plățile la termenele stabilite
c) să recepționeze serviciile în termen de 5 zile de la finalizare

Art. 6. CONFIDENȚIALITATE
Părțile se obligă să păstreze confidențialitatea tuturor informațiilor obținute pe parcursul derulării contractului, pe o perioadă de 3 ani de la încetarea acestuia.

Art. 7. PROPRIETATE INTELECTUALĂ
Toate drepturile de proprietate intelectuală asupra rezultatelor serviciilor aparțin Beneficiarului, după achitarea integrală a prețului.

Art. 8. RĂSPUNDERE CONTRACTUALĂ
8.1. Pentru neexecutarea sau executarea necorespunzătoare, partea în culpă datorează daune-interese
8.2. Forța majoră exonerează de răspundere partea care o invocă

Art. 9. ÎNCETAREA CONTRACTULUI
Contractul încetează:
a) prin ajungerea la termen
b) prin acordul părților
c) prin reziliere, în caz de neexecutare culpabilă, cu preaviz de 15 zile

Art. 10. LITIGII
Litigiile se soluționează pe cale amiabilă sau, în caz contrar, de instanțele competente din România.

Art. 11. DISPOZIȚII FINALE
Prezentul contract s-a încheiat în 2 exemplare originale, câte unul pentru fiecare parte.

PRESTATOR,                                    BENEFICIAR,
{{provider_name}}                             {{client_name}}

_____________________                         _____________________
(semnătura și ștampila)                      (semnătura și ștampila)

Data: _________________
`,
  },

  {
    id: 'contract-nda',
    name: 'Acord de Confidențialitate (NDA)',
    nameEn: 'Non-Disclosure Agreement (NDA)',
    category: 'contract',
    subcategory: 'legal',
    description: 'Acord de confidențialitate bilateral pentru protejarea informațiilor sensibile în relațiile de afaceri.',
    descriptionEn: 'Bilateral NDA for protecting sensitive information in business relationships.',
    tags: ['confidentialitate', 'NDA', 'secret comercial', 'protectie date'],
    isFree: true,
    downloadCount: 1890,
    rating: 4.9,
    lastUpdated: '2025-01-12',
    variables: [
      { name: 'party1_name', label: 'Denumire Partea 1', type: 'text', required: true },
      { name: 'party1_cui', label: 'CUI Partea 1', type: 'text', required: true },
      { name: 'party1_address', label: 'Sediu Partea 1', type: 'text', required: true },
      { name: 'party1_rep', label: 'Reprezentant Partea 1', type: 'text', required: true },
      { name: 'party2_name', label: 'Denumire Partea 2', type: 'text', required: true },
      { name: 'party2_cui', label: 'CUI Partea 2', type: 'text', required: true },
      { name: 'party2_address', label: 'Sediu Partea 2', type: 'text', required: true },
      { name: 'party2_rep', label: 'Reprezentant Partea 2', type: 'text', required: true },
      { name: 'purpose', label: 'Scopul Colaborării', type: 'textarea', required: true },
      { name: 'confidentiality_period', label: 'Durată Confidențialitate (ani)', type: 'number', required: true, defaultValue: '5' },
      { name: 'penalty_amount', label: 'Penalități Încălcare (EUR)', type: 'currency', required: false, defaultValue: '50000' },
      { name: 'effective_date', label: 'Data Intrării în Vigoare', type: 'date', required: true },
    ],
    content: `ACORD DE CONFIDENȚIALITATE
(Non-Disclosure Agreement)

Nr. _______ din data de {{effective_date}}

PĂRȚILE

1. {{party1_name}}, cu sediul în {{party1_address}}, CUI {{party1_cui}}, reprezentată prin {{party1_rep}}, denumită în continuare "Partea 1",

și

2. {{party2_name}}, cu sediul în {{party2_address}}, CUI {{party2_cui}}, reprezentată prin {{party2_rep}}, denumită în continuare "Partea 2",

denumite împreună "Părțile",

PREAMBUL
Părțile doresc să exploreze posibilitatea unei colaborări privind:
{{purpose}}

Pentru derularea discuțiilor și negocierilor, Părțile vor face schimb de informații confidențiale.

PRIN URMARE, Părțile convin următoarele:

Art. 1. DEFINIȚII
1.1. "Informații Confidențiale" înseamnă orice informație, în orice formă, divulgată de o Parte celeilalte, incluzând dar fără a se limita la:
   - date tehnice, know-how, invenții, procese, proceduri
   - planuri de afaceri, strategii comerciale, liste de clienți
   - informații financiare, prețuri, date despre angajați
   - orice informație marcată ca "confidențială" sau care ar fi în mod rezonabil considerată confidențială

1.2. NU sunt considerate Informații Confidențiale cele care:
   - sunt sau devin publice fără vina Părții primitoare
   - erau cunoscute anterior de Partea primitoare
   - sunt obținute legal de la terți fără obligație de confidențialitate
   - sunt dezvoltate independent fără utilizarea informațiilor divulgate

Art. 2. OBLIGAȚII DE CONFIDENȚIALITATE
2.1. Părțile se obligă:
   a) să păstreze confidențialitatea strictă a Informațiilor Confidențiale
   b) să nu divulge Informațiile Confidențiale către terți
   c) să utilizeze Informațiile Confidențiale exclusiv în scopul descris în preambul
   d) să protejeze Informațiile Confidențiale cu cel puțin același nivel de protecție utilizat pentru propriile informații confidențiale

2.2. Excepții permise:
   - divulgarea către angajați/consultanți care au nevoie să cunoască, sub obligație de confidențialitate similară
   - divulgarea impusă de lege sau ordin judecătoresc, cu notificare prealabilă

Art. 3. DURATA CONFIDENȚIALITĂȚII
Obligațiile de confidențialitate se mențin pe durata de {{confidentiality_period}} ani de la data divulgării ultimei Informații Confidențiale.

Art. 4. PROPRIETATE
Toate Informațiile Confidențiale rămân proprietatea exclusivă a Părții care le divulgă. Acest Acord nu acordă nicio licență sau drept de proprietate intelectuală.

Art. 5. RETURNAREA INFORMAȚIILOR
La cererea Părții divulgatoare sau la încetarea discuțiilor, Partea primitoare va:
   a) returna toate materialele care conțin Informații Confidențiale
   b) distruge toate copiile și va certifica în scris distrugerea

Art. 6. PENALITĂȚI
Încălcarea prezentului Acord atrage:
   a) plata de daune-interese în cuantum de {{penalty_amount}} EUR, fără a aduce atingere dreptului la despăgubiri suplimentare
   b) răspundere penală pentru divulgarea secretului comercial conform legii

Art. 7. DISPOZIȚII FINALE
7.1. Prezentul Acord este guvernat de legea română
7.2. Litigiile se soluționează de instanțele competente din București
7.3. Modificările sunt valabile doar în formă scrisă, semnată de ambele Părți

PARTEA 1,                                     PARTEA 2,
{{party1_name}}                               {{party2_name}}

_____________________                         _____________________
(semnătura și ștampila)                      (semnătura și ștampila)

Data: {{effective_date}}
`,
  },

  // ==================== INVOICES ====================
  {
    id: 'factura-fiscala-standard',
    name: 'Factură Fiscală Standard',
    nameEn: 'Standard Tax Invoice',
    category: 'invoice',
    subcategory: 'standard',
    description: 'Factură fiscală conformă cu legislația 2025, pregătită pentru e-Factura ANAF. Include toate câmpurile obligatorii.',
    descriptionEn: 'Tax invoice compliant with 2025 legislation, e-Factura ready. Includes all mandatory fields.',
    tags: ['factura', 'fiscala', 'TVA', 'e-Factura', 'ANAF'],
    isFree: true,
    downloadCount: 5670,
    rating: 4.9,
    lastUpdated: '2025-01-20',
    variables: [
      { name: 'invoice_series', label: 'Serie Factură', type: 'text', required: true, placeholder: 'DI' },
      { name: 'invoice_number', label: 'Număr Factură', type: 'text', required: true, placeholder: '0001' },
      { name: 'invoice_date', label: 'Data Emiterii', type: 'date', required: true },
      { name: 'due_date', label: 'Data Scadență', type: 'date', required: true },
      { name: 'seller_name', label: 'Denumire Furnizor', type: 'text', required: true },
      { name: 'seller_cui', label: 'CUI Furnizor', type: 'text', required: true },
      { name: 'seller_reg_com', label: 'Reg. Comerț Furnizor', type: 'text', required: true },
      { name: 'seller_address', label: 'Adresă Furnizor', type: 'text', required: true },
      { name: 'seller_bank', label: 'Bancă Furnizor', type: 'text', required: true },
      { name: 'seller_iban', label: 'IBAN Furnizor', type: 'text', required: true },
      { name: 'buyer_name', label: 'Denumire Cumpărător', type: 'text', required: true },
      { name: 'buyer_cui', label: 'CUI Cumpărător', type: 'text', required: true },
      { name: 'buyer_reg_com', label: 'Reg. Comerț Cumpărător', type: 'text', required: false },
      { name: 'buyer_address', label: 'Adresă Cumpărător', type: 'text', required: true },
      { name: 'currency', label: 'Monedă', type: 'select', required: true, options: ['RON', 'EUR', 'USD'], defaultValue: 'RON' },
      { name: 'vat_rate', label: 'Cotă TVA (%)', type: 'select', required: true, options: ['19', '9', '5', '0'], defaultValue: '19' },
    ],
    content: `FACTURĂ FISCALĂ
Serie: {{invoice_series}} Nr: {{invoice_number}}

Data emiterii: {{invoice_date}}
Data scadenței: {{due_date}}

═══════════════════════════════════════════════════════════════

FURNIZOR                              CUMPĂRĂTOR
────────────────────────────          ────────────────────────────
{{seller_name}}                       {{buyer_name}}
CUI: {{seller_cui}}                   CUI: {{buyer_cui}}
Reg. Com.: {{seller_reg_com}}         Reg. Com.: {{buyer_reg_com}}
{{seller_address}}                    {{buyer_address}}

Bancă: {{seller_bank}}
IBAN: {{seller_iban}}

═══════════════════════════════════════════════════════════════

Nr. | Descriere produs/serviciu    | U.M. | Cantitate | Preț unitar | Valoare
────|─────────────────────────────|───---|────────── |─────────────|──────────
 1  | [Completați]                | buc  |     1     |             |
 2  | [Completați]                | buc  |     1     |             |
 3  | [Completați]                | buc  |     1     |             |

═══════════════════════════════════════════════════════════════

                                              TOTAL fără TVA: _________ {{currency}}
                                              TVA {{vat_rate}}%:        _________ {{currency}}
                                              ─────────────────────────────────────
                                              TOTAL de plată: _________ {{currency}}

═══════════════════════════════════════════════════════════════

Termen de plată: {{due_date}}
Modalitate de plată: Transfer bancar

Întocmit de: _____________________     Primit de: _____________________
Semnătura: _____________________       Semnătura: _____________________

──────────────────────────────────────────────────────────────────────────
Factură întocmită conform Legii nr. 227/2015 privind Codul fiscal
e-Factura: Transmisă în sistemul SPV ANAF conform Legii nr. 296/2023
`,
  },

  {
    id: 'factura-proforma',
    name: 'Factură Proforma',
    nameEn: 'Proforma Invoice',
    category: 'invoice',
    subcategory: 'proforma',
    description: 'Factură proforma pentru cotații și avansuri. Nu este document fiscal, ci ofertă comercială.',
    descriptionEn: 'Proforma invoice for quotes and deposits. Commercial offer, not a fiscal document.',
    tags: ['proforma', 'cotatie', 'avans', 'oferta'],
    isFree: true,
    downloadCount: 3210,
    rating: 4.6,
    lastUpdated: '2025-01-18',
    variables: [
      { name: 'proforma_number', label: 'Număr Proforma', type: 'text', required: true },
      { name: 'proforma_date', label: 'Data Emiterii', type: 'date', required: true },
      { name: 'validity_days', label: 'Valabilitate (zile)', type: 'number', required: true, defaultValue: '15' },
      { name: 'seller_name', label: 'Denumire Furnizor', type: 'text', required: true },
      { name: 'seller_cui', label: 'CUI Furnizor', type: 'text', required: true },
      { name: 'seller_address', label: 'Adresă Furnizor', type: 'text', required: true },
      { name: 'seller_iban', label: 'IBAN Furnizor', type: 'text', required: true },
      { name: 'buyer_name', label: 'Denumire Client', type: 'text', required: true },
      { name: 'buyer_address', label: 'Adresă Client', type: 'text', required: true },
      { name: 'currency', label: 'Monedă', type: 'select', required: true, options: ['RON', 'EUR', 'USD'], defaultValue: 'RON' },
    ],
    content: `FACTURĂ PROFORMĂ
Nr: {{proforma_number}}

Data emiterii: {{proforma_date}}
Valabilă până la: [{{proforma_date}} + {{validity_days}} zile]

⚠️ ATENȚIE: Acest document NU este factură fiscală!
   Este o ofertă comercială și nu generează obligații fiscale.

═══════════════════════════════════════════════════════════════

FURNIZOR                              CLIENT
────────────────────────────          ────────────────────────────
{{seller_name}}                       {{buyer_name}}
CUI: {{seller_cui}}                   {{buyer_address}}
{{seller_address}}

IBAN: {{seller_iban}}

═══════════════════════════════════════════════════════════════

Nr. | Descriere produs/serviciu    | U.M. | Cantitate | Preț unitar | Valoare
────|─────────────────────────────|───---|────────── |─────────────|──────────
 1  | [Completați]                | buc  |     1     |             |
 2  | [Completați]                | buc  |     1     |             |

═══════════════════════════════════════════════════════════════

                                              Subtotal:       _________ {{currency}}
                                              TVA estimat:    _________ {{currency}}
                                              ─────────────────────────────────────
                                              TOTAL estimat:  _________ {{currency}}

═══════════════════════════════════════════════════════════════

CONDIȚII DE PLATĂ:
- Avans solicitat: _____% din valoarea totală
- Rest de plată: la livrare / în termen de _____ zile
- Modalitate: Transfer bancar în contul de mai sus

TERMENI DE LIVRARE:
- Termen estimat: _____ zile de la confirmarea comenzii
- Loc livrare: [completați]

Pentru a confirma comanda, vă rugăm să:
1. Semnați și returnați această proformă
2. Efectuați plata avansului

Această ofertă este valabilă {{validity_days}} zile de la data emiterii.

Întocmit de: _____________________

Data: {{proforma_date}}
`,
  },

  // ==================== HR DOCUMENTS ====================
  {
    id: 'act-aditional-salariu',
    name: 'Act Adițional - Modificare Salariu',
    nameEn: 'Salary Amendment Addendum',
    category: 'hr',
    subcategory: 'amendment',
    description: 'Act adițional pentru modificarea salariului, conform Codului Muncii. Include clauzele obligatorii.',
    descriptionEn: 'Salary modification addendum compliant with Labor Code. Includes mandatory clauses.',
    tags: ['act aditional', 'salariu', 'marire', 'modificare', 'HR'],
    isFree: false,
    downloadCount: 980,
    rating: 4.7,
    lastUpdated: '2025-01-15',
    variables: [
      { name: 'employer_name', label: 'Denumire Angajator', type: 'text', required: true },
      { name: 'employer_cui', label: 'CUI Angajator', type: 'text', required: true },
      { name: 'employee_name', label: 'Nume Angajat', type: 'text', required: true },
      { name: 'employee_cnp', label: 'CNP Angajat', type: 'text', required: true },
      { name: 'contract_number', label: 'Nr. Contract Muncă', type: 'text', required: true },
      { name: 'contract_date', label: 'Data Contract Muncă', type: 'date', required: true },
      { name: 'old_salary', label: 'Salariu Brut Vechi (RON)', type: 'currency', required: true },
      { name: 'new_salary', label: 'Salariu Brut Nou (RON)', type: 'currency', required: true },
      { name: 'effective_date', label: 'Data Intrării în Vigoare', type: 'date', required: true },
      { name: 'amendment_date', label: 'Data Semnării', type: 'date', required: true },
    ],
    content: `ACT ADIȚIONAL Nr. _______
la Contractul Individual de Muncă nr. {{contract_number}} din {{contract_date}}

PĂRȚILE

1. ANGAJATORUL
{{employer_name}}, CUI {{employer_cui}}, reprezentat legal prin _________________,

și

2. ANGAJATUL
{{employee_name}}, CNP {{employee_cnp}},

au convenit modificarea contractului individual de muncă astfel:

Art. 1. MODIFICĂRI
Se modifică Art. 6 lit. a) din contractul individual de muncă, privind salariul de bază lunar brut, după cum urmează:

Textul vechi:
"a) Salariul de bază lunar brut: {{old_salary}} RON"

Se înlocuiește cu:
"a) Salariul de bază lunar brut: {{new_salary}} RON"

Art. 2. DATA INTRĂRII ÎN VIGOARE
Prezentul act adițional intră în vigoare începând cu data de {{effective_date}}.

Art. 3. CLAUZE NESCHIMBATE
Toate celelalte clauze ale contractului individual de muncă rămân neschimbate.

Art. 4. ÎNREGISTRARE REVISAL
Angajatorul va înregistra prezenta modificare în Registrul General de Evidență a Salariaților (REVISAL) în termen de 3 zile lucrătoare.

Încheiat astăzi, {{amendment_date}}, în 2 exemplare originale, câte unul pentru fiecare parte.

ANGAJATOR,                                    ANGAJAT,
{{employer_name}}                             {{employee_name}}

_____________________                         _____________________
(semnătura și ștampila)                      (semnătura)
`,
  },

  {
    id: 'cerere-concediu',
    name: 'Cerere Concediu de Odihnă',
    nameEn: 'Annual Leave Request Form',
    category: 'hr',
    subcategory: 'leave',
    description: 'Formular standard pentru solicitarea concediului de odihnă. Include aprobări ierarhice.',
    descriptionEn: 'Standard annual leave request form with hierarchical approvals.',
    tags: ['concediu', 'odihna', 'cerere', 'HR', 'absenta'],
    isFree: true,
    downloadCount: 4560,
    rating: 4.5,
    lastUpdated: '2025-01-08',
    variables: [
      { name: 'employee_name', label: 'Nume Angajat', type: 'text', required: true },
      { name: 'employee_position', label: 'Funcție', type: 'text', required: true },
      { name: 'department', label: 'Departament', type: 'text', required: true },
      { name: 'leave_start', label: 'Data Început Concediu', type: 'date', required: true },
      { name: 'leave_end', label: 'Data Sfârșit Concediu', type: 'date', required: true },
      { name: 'work_days', label: 'Zile Lucrătoare Solicitate', type: 'number', required: true },
      { name: 'remaining_days', label: 'Zile Rămase din Drept', type: 'number', required: true },
      { name: 'request_date', label: 'Data Cererii', type: 'date', required: true },
    ],
    content: `CERERE CONCEDIU DE ODIHNĂ

Către: Departamentul Resurse Umane
De la: {{employee_name}}
Funcția: {{employee_position}}
Departament: {{department}}
Data cererii: {{request_date}}

═══════════════════════════════════════════════════════════════

Subsemnatul/Subsemnata {{employee_name}}, angajat/ă în funcția de {{employee_position}}
în cadrul departamentului {{department}}, solicit aprobarea concediului de odihnă
în următoarea perioadă:

┌─────────────────────────────────────────────────────────────┐
│ PERIOADA SOLICITATĂ                                         │
├─────────────────────────────────────────────────────────────┤
│ De la: {{leave_start}}                                      │
│ Până la: {{leave_end}}                                      │
│ Total zile lucrătoare: {{work_days}}                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SITUAȚIA CONCEDIULUI                                        │
├─────────────────────────────────────────────────────────────┤
│ Zile de concediu rămase înainte de această cerere:          │
│ {{remaining_days}} zile                                     │
│                                                             │
│ Zile rămase după aprobare:                                  │
│ [{{remaining_days}} - {{work_days}}] zile                   │
└─────────────────────────────────────────────────────────────┘

Date de contact în perioada concediului:
Telefon: ____________________
Email: ____________________
Înlocuitor propus: ____________________

Semnătura angajat: _____________________
Data: {{request_date}}

═══════════════════════════════════════════════════════════════

SECȚIUNE APROBĂRI

□ APROBAT    □ RESPINS

Șef departament: _____________________
Semnătura: _____________________
Data: _____________________

Observații: ________________________________________________

═══════════════════════════════════════════════════════════════

HR: _____________________
Semnătura: _____________________
Data: _____________________

Înregistrat în sistem: □ DA
`,
  },

  {
    id: 'fisa-post',
    name: 'Fișa Postului',
    nameEn: 'Job Description Form',
    category: 'hr',
    subcategory: 'job-description',
    description: 'Model complet de fișă a postului conform legislației muncii. Include responsabilități, competențe și ierarhie.',
    descriptionEn: 'Complete job description template per labor legislation with responsibilities and hierarchy.',
    tags: ['fisa post', 'job description', 'atributii', 'HR', 'angajare'],
    isFree: false,
    downloadCount: 2140,
    rating: 4.8,
    lastUpdated: '2025-01-14',
    variables: [
      { name: 'company_name', label: 'Denumire Companie', type: 'text', required: true },
      { name: 'job_title', label: 'Denumirea Postului', type: 'text', required: true },
      { name: 'job_code', label: 'Cod COR', type: 'text', required: true },
      { name: 'department', label: 'Departament', type: 'text', required: true },
      { name: 'reports_to', label: 'Subordonare Directă', type: 'text', required: true },
      { name: 'subordinates', label: 'Subordonați', type: 'text', required: false, defaultValue: 'Nu are' },
      { name: 'education', label: 'Studii Necesare', type: 'text', required: true },
      { name: 'experience', label: 'Experiență Necesară', type: 'text', required: true },
      { name: 'effective_date', label: 'Data Intrării în Vigoare', type: 'date', required: true },
    ],
    content: `FIȘA POSTULUI

{{company_name}}
Data elaborării: {{effective_date}}

═══════════════════════════════════════════════════════════════

1. IDENTIFICAREA POSTULUI

Denumirea postului: {{job_title}}
Cod COR: {{job_code}}
Departament/Compartiment: {{department}}
Nivel ierarhic: [Execuție/Management mediu/Management superior]

2. RELAȚII IERARHICE

Subordonare directă: {{reports_to}}
Subordonați direcți: {{subordinates}}
Relații funcționale: [completați]
Relații de colaborare: [completați]

═══════════════════════════════════════════════════════════════

3. SCOPUL POSTULUI

[Descrieți pe scurt (2-3 propoziții) scopul principal al postului și
contribuția sa la obiectivele organizației]

═══════════════════════════════════════════════════════════════

4. RESPONSABILITĂȚI ȘI ATRIBUȚII PRINCIPALE

4.1. Responsabilități cheie:
• [Responsabilitate 1 - % din timp]
• [Responsabilitate 2 - % din timp]
• [Responsabilitate 3 - % din timp]
• [Responsabilitate 4 - % din timp]
• [Responsabilitate 5 - % din timp]

4.2. Atribuții specifice:
□ [Atribuție 1]
□ [Atribuție 2]
□ [Atribuție 3]
□ [Atribuție 4]
□ [Atribuție 5]

4.3. Decizii pe care le poate lua:
• [Decizie 1]
• [Decizie 2]

4.4. Decizii care necesită aprobare:
• [Decizie care necesită aprobare 1]
• [Decizie care necesită aprobare 2]

═══════════════════════════════════════════════════════════════

5. CERINȚE PENTRU OCUPAREA POSTULUI

5.1. Studii: {{education}}
5.2. Experiență: {{experience}}

5.3. Competențe profesionale:
• [Competență tehnică 1]
• [Competență tehnică 2]
• [Certificări necesare]

5.4. Competențe comportamentale:
• Comunicare
• Lucru în echipă
• Orientare spre rezultate
• [Alte competențe]

5.5. Limbi străine: [completați]
5.6. Cunoștințe IT: [completați]

═══════════════════════════════════════════════════════════════

6. CONDIȚII DE MUNCĂ

Locul muncii: [Birou/Teren/Hibrid]
Program: [Normă întreagă/Parțială]
Deplasări: [Da/Nu - frecvență]
Condiții speciale: [completați]

═══════════════════════════════════════════════════════════════

7. INDICATORI DE PERFORMANȚĂ (KPI)

• [KPI 1 - target]
• [KPI 2 - target]
• [KPI 3 - target]

═══════════════════════════════════════════════════════════════

SEMNĂTURI

Elaborat de HR: _____________________
Data: _____________________

Aprobat de Management: _____________________
Data: _____________________

Am luat la cunoștință:

Titular post: _____________________
Nume: _____________________
Data: _____________________
`,
  },

  // ==================== DECLARATIONS ====================
  {
    id: 'declaratie-propria-raspundere',
    name: 'Declarație pe Propria Răspundere',
    nameEn: 'Sworn Statement',
    category: 'declaration',
    subcategory: 'general',
    description: 'Declarație pe propria răspundere model general, pentru diverse situații administrative și legale.',
    descriptionEn: 'General sworn statement template for various administrative and legal situations.',
    tags: ['declaratie', 'raspundere', 'administrativ', 'legal'],
    isFree: true,
    downloadCount: 8920,
    rating: 4.6,
    lastUpdated: '2025-01-05',
    variables: [
      { name: 'declarant_name', label: 'Nume și Prenume', type: 'text', required: true },
      { name: 'declarant_cnp', label: 'CNP', type: 'text', required: true },
      { name: 'declarant_address', label: 'Domiciliu', type: 'text', required: true },
      { name: 'declarant_id_series', label: 'Serie CI', type: 'text', required: true },
      { name: 'declarant_id_number', label: 'Număr CI', type: 'text', required: true },
      { name: 'declaration_content', label: 'Conținut Declarație', type: 'textarea', required: true },
      { name: 'purpose', label: 'Scopul Declarației', type: 'text', required: true, placeholder: 'a fi prezentată la...' },
      { name: 'declaration_date', label: 'Data', type: 'date', required: true },
    ],
    content: `DECLARAȚIE PE PROPRIA RĂSPUNDERE

Subsemnatul/Subsemnata {{declarant_name}},
domiciliat/ă în {{declarant_address}},
legitimat/ă cu CI seria {{declarant_id_series}} nr. {{declarant_id_number}},
CNP {{declarant_cnp}},

cunoscând dispozițiile art. 326 din Codul Penal privind falsul în declarații,

DECLAR PE PROPRIA RĂSPUNDERE URMĂTOARELE:

═══════════════════════════════════════════════════════════════

{{declaration_content}}

═══════════════════════════════════════════════════════════════

Prezenta declarație este dată pentru {{purpose}}.

Declar că am luat cunoștință de prevederile art. 326 din Codul Penal referitoare
la infracțiunea de fals în declarații:

"Declararea necorespunzătoare adevărului, făcută unei persoane dintre cele
prevăzute în art. 175 sau unei unități în care aceasta își desfășoară
activitatea în vederea producerii unei consecințe juridice, pentru sine sau
pentru altul, atunci când, potrivit legii ori împrejurărilor, declarația
făcută servește la producerea acelei consecințe, se pedepsește cu închisoare
de la 3 luni la 2 ani sau cu amendă."

Data: {{declaration_date}}

Semnătura: _____________________

`,
  },

  {
    id: 'declaratie-beneficiar-real',
    name: 'Declarație Beneficiar Real',
    nameEn: 'Ultimate Beneficial Owner Declaration',
    category: 'declaration',
    subcategory: 'corporate',
    description: 'Declarație privind beneficiarul real conform Legii 129/2019 anti-spălare bani. Obligatorie anual.',
    descriptionEn: 'Ultimate beneficial owner declaration per Law 129/2019 AML. Required annually.',
    tags: ['beneficiar real', 'AML', 'ONRC', 'societate', 'transparenta'],
    isFree: true,
    downloadCount: 1560,
    rating: 4.4,
    lastUpdated: '2025-01-10',
    variables: [
      { name: 'company_name', label: 'Denumire Societate', type: 'text', required: true },
      { name: 'company_cui', label: 'CUI Societate', type: 'text', required: true },
      { name: 'company_registry', label: 'Nr. Registrul Comerțului', type: 'text', required: true },
      { name: 'company_address', label: 'Sediu Social', type: 'text', required: true },
      { name: 'representative_name', label: 'Reprezentant Legal', type: 'text', required: true },
      { name: 'representative_position', label: 'Funcție Reprezentant', type: 'text', required: true, defaultValue: 'Administrator' },
      { name: 'beneficiary_name', label: 'Nume Beneficiar Real', type: 'text', required: true },
      { name: 'beneficiary_cnp', label: 'CNP Beneficiar', type: 'text', required: true },
      { name: 'beneficiary_address', label: 'Domiciliu Beneficiar', type: 'text', required: true },
      { name: 'beneficiary_citizenship', label: 'Cetățenie Beneficiar', type: 'text', required: true, defaultValue: 'Română' },
      { name: 'ownership_percentage', label: 'Procent Deținere (%)', type: 'number', required: true },
      { name: 'declaration_date', label: 'Data Declarației', type: 'date', required: true },
    ],
    content: `DECLARAȚIE PRIVIND BENEFICIARUL REAL
conform Legii nr. 129/2019 pentru prevenirea și combaterea spălării banilor

═══════════════════════════════════════════════════════════════

DATELE SOCIETĂȚII

Denumire: {{company_name}}
CUI: {{company_cui}}
Nr. Reg. Comerțului: {{company_registry}}
Sediu social: {{company_address}}

═══════════════════════════════════════════════════════════════

Subsemnatul/Subsemnata {{representative_name}}, în calitate de {{representative_position}}
al societății {{company_name}},

în conformitate cu prevederile Legii nr. 129/2019 pentru prevenirea și combaterea
spălării banilor și finanțării terorismului, precum și pentru modificarea și
completarea unor acte normative,

DECLAR PE PROPRIA RĂSPUNDERE:

că beneficiarul/beneficiarii real/reali al/ai societății este/sunt:

═══════════════════════════════════════════════════════════════

BENEFICIAR REAL 1:

Nume și prenume: {{beneficiary_name}}
CNP: {{beneficiary_cnp}}
Domiciliu: {{beneficiary_address}}
Cetățenie: {{beneficiary_citizenship}}
Procent deținere/vot: {{ownership_percentage}}%
Modalitatea de exercitare a controlului: Deținere directă de acțiuni/părți sociale

═══════════════════════════════════════════════════════════════

[Pentru beneficiari suplimentari, completați formularele adiționale]

═══════════════════════════════════════════════════════════════

Cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații,
confirm că informațiile furnizate sunt complete și corespund realității.

Mă angajez să notific orice modificare a datelor de identificare a beneficiarului
real în termen de 15 zile de la data la care aceasta a intervenit.

Data: {{declaration_date}}

Reprezentant legal,
{{representative_name}}
{{representative_position}}

Semnătura: _____________________
Ștampila: [loc pentru ștampilă]

═══════════════════════════════════════════════════════════════

Această declarație se depune la Oficiul Registrului Comerțului în termen de
15 zile de la înființarea societății și anual, în termen de 15 zile de la
aprobarea situațiilor financiare anuale.
`,
  },

  // ==================== FINANCIAL ====================
  {
    id: 'nota-contabila',
    name: 'Notă Contabilă',
    nameEn: 'Accounting Note',
    category: 'financial',
    subcategory: 'accounting',
    description: 'Document justificativ pentru înregistrări contabile. Include conturi debit/credit și explicații.',
    descriptionEn: 'Supporting document for accounting entries with debit/credit accounts and explanations.',
    tags: ['nota contabila', 'inregistrare', 'debit', 'credit', 'contabilitate'],
    isFree: true,
    downloadCount: 3450,
    rating: 4.5,
    lastUpdated: '2025-01-12',
    variables: [
      { name: 'company_name', label: 'Denumire Societate', type: 'text', required: true },
      { name: 'note_number', label: 'Număr Notă', type: 'text', required: true },
      { name: 'note_date', label: 'Data', type: 'date', required: true },
      { name: 'description', label: 'Descriere Operațiune', type: 'textarea', required: true },
      { name: 'document_type', label: 'Document Justificativ', type: 'text', required: true, placeholder: 'Factură nr. X din data Y' },
    ],
    content: `{{company_name}}

NOTĂ CONTABILĂ
Nr. {{note_number}} din data {{note_date}}

═══════════════════════════════════════════════════════════════

DESCRIEREA OPERAȚIUNII:
{{description}}

DOCUMENT JUSTIFICATIV:
{{document_type}}

═══════════════════════════════════════════════════════════════

ÎNREGISTRARE CONTABILĂ:

┌──────────────────────────────────────────────────────────────┐
│ CONT DEBITOR    │ CONT CREDITOR   │ SUMĂ (RON)  │ EXPLICAȚIE │
├─────────────────┼─────────────────┼─────────────┼────────────┤
│                 │                 │             │            │
├─────────────────┼─────────────────┼─────────────┼────────────┤
│                 │                 │             │            │
├─────────────────┼─────────────────┼─────────────┼────────────┤
│                 │                 │             │            │
├─────────────────┼─────────────────┼─────────────┼────────────┤
│ TOTAL DEBIT:    │ TOTAL CREDIT:   │             │            │
└─────────────────┴─────────────────┴─────────────┴────────────┘

═══════════════════════════════════════════════════════════════

Întocmit de: _____________________
Funcția: _____________________
Data: {{note_date}}
Semnătura: _____________________

Verificat de: _____________________
Funcția: _____________________
Data: _____________________
Semnătura: _____________________

Aprobat de: _____________________
Funcția: _____________________
Data: _____________________
Semnătura: _____________________
`,
  },

  {
    id: 'raport-cheltuieli',
    name: 'Raport/Decont Cheltuieli',
    nameEn: 'Expense Report',
    category: 'financial',
    subcategory: 'expenses',
    description: 'Decont de cheltuieli pentru deplasări și achiziții. Include aprobare și atașare documente.',
    descriptionEn: 'Expense report for travel and purchases with approval workflow and document attachments.',
    tags: ['decont', 'cheltuieli', 'deplasare', 'diurna', 'rambursare'],
    isFree: true,
    downloadCount: 2780,
    rating: 4.6,
    lastUpdated: '2025-01-08',
    variables: [
      { name: 'employee_name', label: 'Nume Angajat', type: 'text', required: true },
      { name: 'department', label: 'Departament', type: 'text', required: true },
      { name: 'report_period', label: 'Perioada', type: 'text', required: true, placeholder: '01.01.2025 - 31.01.2025' },
      { name: 'purpose', label: 'Scopul Cheltuielilor', type: 'text', required: true },
      { name: 'report_date', label: 'Data Raportului', type: 'date', required: true },
    ],
    content: `RAPORT / DECONT DE CHELTUIELI

═══════════════════════════════════════════════════════════════

INFORMAȚII ANGAJAT

Nume și prenume: {{employee_name}}
Departament: {{department}}
Perioada: {{report_period}}
Scopul: {{purpose}}

═══════════════════════════════════════════════════════════════

DETALIERE CHELTUIELI

┌────┬────────────┬────────────────────────┬───────────┬───────────┬────────┐
│Nr. │ Data       │ Descriere              │ Categoria │ Sumă RON  │ Doc.   │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 1  │            │                        │ Transport │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 2  │            │                        │ Cazare    │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 3  │            │                        │ Masă      │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 4  │            │                        │ Diurnă    │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 5  │            │                        │ Altele    │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 6  │            │                        │           │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 7  │            │                        │           │           │ □      │
├────┼────────────┼────────────────────────┼───────────┼───────────┼────────┤
│ 8  │            │                        │           │           │ □      │
└────┴────────────┴────────────────────────┴───────────┴───────────┴────────┘

═══════════════════════════════════════════════════════════════

SUMAR

Total Transport:    _________ RON
Total Cazare:       _________ RON
Total Masă:         _________ RON
Total Diurnă:       _________ RON
Total Altele:       _________ RON
─────────────────────────────────
TOTAL GENERAL:      _________ RON

Avans primit:       _________ RON
─────────────────────────────────
DIFERENȚĂ DE PLATĂ: _________ RON
(Se restituie / Se încasează)

═══════════════════════════════════════════════════════════════

DOCUMENTE ANEXATE

□ Facturi fiscale: _____ bucăți
□ Bonuri fiscale: _____ bucăți
□ Bilete transport: _____ bucăți
□ Ordine deplasare: _____
□ Alte documente: _____________________

═══════════════════════════════════════════════════════════════

APROBĂRI

Solicitant: {{employee_name}}
Data: {{report_date}}
Semnătura: _____________________

Șef departament: _____________________
Aprobare: □ DA  □ NU  □ PARȚIAL (suma: _____ RON)
Data: _____________________
Semnătura: _____________________

Director financiar: _____________________
Aprobare: □ DA  □ NU
Data: _____________________
Semnătura: _____________________

═══════════════════════════════════════════════════════════════

PROCESARE PLATĂ (completează departamentul financiar)

Suma aprobată: _________ RON
OP/Numerar nr.: _________
Data plății: _________
Procesat de: _____________________
`,
  },

  // ==================== LEGAL ====================
  {
    id: 'proces-verbal-aga',
    name: 'Proces Verbal AGA',
    nameEn: 'General Assembly Minutes',
    category: 'legal',
    subcategory: 'corporate',
    description: 'Proces verbal pentru Adunarea Generală a Asociaților/Acționarilor. Include ordine de zi și decizii.',
    descriptionEn: 'Minutes for General Assembly of Shareholders. Includes agenda and resolutions.',
    tags: ['AGA', 'proces verbal', 'hotarare', 'asociati', 'actionari'],
    isFree: false,
    downloadCount: 1230,
    rating: 4.7,
    lastUpdated: '2025-01-15',
    variables: [
      { name: 'company_name', label: 'Denumire Societate', type: 'text', required: true },
      { name: 'company_cui', label: 'CUI', type: 'text', required: true },
      { name: 'company_registry', label: 'Nr. Reg. Comerțului', type: 'text', required: true },
      { name: 'company_address', label: 'Sediu Social', type: 'text', required: true },
      { name: 'meeting_date', label: 'Data Adunării', type: 'date', required: true },
      { name: 'meeting_time', label: 'Ora Adunării', type: 'text', required: true, placeholder: '10:00' },
      { name: 'meeting_type', label: 'Tip Adunare', type: 'select', required: true, options: ['Ordinară', 'Extraordinară'], defaultValue: 'Ordinară' },
      { name: 'capital_social', label: 'Capital Social (RON)', type: 'currency', required: true },
    ],
    content: `PROCES-VERBAL
al Adunării Generale {{meeting_type}} a Asociaților/Acționarilor

═══════════════════════════════════════════════════════════════

{{company_name}}
CUI: {{company_cui}}
Nr. Reg. Comerțului: {{company_registry}}
Sediu social: {{company_address}}
Capital social: {{capital_social}} RON

═══════════════════════════════════════════════════════════════

DETALII ADUNARE

Data: {{meeting_date}}
Ora: {{meeting_time}}
Locul: {{company_address}}
Tip: Adunare Generală {{meeting_type}}

═══════════════════════════════════════════════════════════════

PARTICIPANȚI

┌────┬────────────────────────┬─────────────┬────────────┬──────────┐
│Nr. │ Nume asociat/acționar  │ Părți soc.  │ % capital  │ Prezent  │
├────┼────────────────────────┼─────────────┼────────────┼──────────┤
│ 1  │                        │             │      %     │ □ DA □ NU│
├────┼────────────────────────┼─────────────┼────────────┼──────────┤
│ 2  │                        │             │      %     │ □ DA □ NU│
├────┼────────────────────────┼─────────────┼────────────┼──────────┤
│ 3  │                        │             │      %     │ □ DA □ NU│
└────┴────────────────────────┴─────────────┴────────────┴──────────┘

Total capital reprezentat: _____%
Cvorumul necesar: _____%
Cvorumul este/nu este întrunit.

═══════════════════════════════════════════════════════════════

ORDINE DE ZI

1. [Punct 1 - descriere]
2. [Punct 2 - descriere]
3. [Punct 3 - descriere]
4. Diverse

═══════════════════════════════════════════════════════════════

DEZBATERI ȘI HOTĂRÂRI

PUNCTUL 1: [Descriere]
Prezentare: [Rezumat discuții]
Vot: Pentru: ___% | Împotrivă: ___% | Abțineri: ___%
HOTĂRÂRE: [Text hotărâre]

───────────────────────────────────────────────────────────────

PUNCTUL 2: [Descriere]
Prezentare: [Rezumat discuții]
Vot: Pentru: ___% | Împotrivă: ___% | Abțineri: ___%
HOTĂRÂRE: [Text hotărâre]

───────────────────────────────────────────────────────────────

PUNCTUL 3: [Descriere]
Prezentare: [Rezumat discuții]
Vot: Pentru: ___% | Împotrivă: ___% | Abțineri: ___%
HOTĂRÂRE: [Text hotărâre]

═══════════════════════════════════════════════════════════════

DISPOZIȚII FINALE

Se împuternicește __________________________ să îndeplinească
formalitățile de publicare și înregistrare a prezentelor hotărâri.

Ședința s-a încheiat la ora _________.

═══════════════════════════════════════════════════════════════

SEMNĂTURI

Președinte de ședință: _____________________
Semnătura: _____________________

Secretar: _____________________
Semnătura: _____________________

ASOCIAȚI/ACȚIONARI:

1. _____________________ - Semnătura: _____________________
2. _____________________ - Semnătura: _____________________
3. _____________________ - Semnătura: _____________________

Data: {{meeting_date}}
`,
  },

  {
    id: 'imputernicire-generala',
    name: 'Împuternicire Generală',
    nameEn: 'General Power of Attorney',
    category: 'legal',
    subcategory: 'authorization',
    description: 'Împuternicire pentru reprezentare la instituții publice și private. Model general adaptabil.',
    descriptionEn: 'Power of attorney for representation at public and private institutions. Adaptable template.',
    tags: ['imputernicire', 'reprezentare', 'delegare', 'procura'],
    isFree: true,
    downloadCount: 4120,
    rating: 4.5,
    lastUpdated: '2025-01-06',
    variables: [
      { name: 'grantor_name', label: 'Nume Mandant (cine dă)', type: 'text', required: true },
      { name: 'grantor_cnp', label: 'CNP Mandant', type: 'text', required: true },
      { name: 'grantor_address', label: 'Domiciliu Mandant', type: 'text', required: true },
      { name: 'grantor_id_series', label: 'Serie CI Mandant', type: 'text', required: true },
      { name: 'grantor_id_number', label: 'Număr CI Mandant', type: 'text', required: true },
      { name: 'agent_name', label: 'Nume Mandatar (cine primește)', type: 'text', required: true },
      { name: 'agent_cnp', label: 'CNP Mandatar', type: 'text', required: true },
      { name: 'agent_address', label: 'Domiciliu Mandatar', type: 'text', required: true },
      { name: 'agent_id_series', label: 'Serie CI Mandatar', type: 'text', required: true },
      { name: 'agent_id_number', label: 'Număr CI Mandatar', type: 'text', required: true },
      { name: 'scope', label: 'Scopul Împuternicirii', type: 'textarea', required: true },
      { name: 'validity_period', label: 'Perioada Valabilitate', type: 'text', required: true, placeholder: '6 luni / până la revocare' },
      { name: 'authorization_date', label: 'Data Împuternicirii', type: 'date', required: true },
    ],
    content: `ÎMPUTERNICIRE

═══════════════════════════════════════════════════════════════

MANDANT (cel care împuternicește)

Subsemnatul/Subsemnata {{grantor_name}},
domiciliat/ă în {{grantor_address}},
identificat/ă cu CI seria {{grantor_id_series}} nr. {{grantor_id_number}},
CNP {{grantor_cnp}},

împuternicesc prin prezenta pe:

═══════════════════════════════════════════════════════════════

MANDATAR (cel împuternicit)

{{agent_name}},
domiciliat/ă în {{agent_address}},
identificat/ă cu CI seria {{agent_id_series}} nr. {{agent_id_number}},
CNP {{agent_cnp}},

să mă reprezinte în fața oricăror autorități, instituții publice sau private,
persoane fizice sau juridice, pentru:

═══════════════════════════════════════════════════════════════

SCOPUL ÎMPUTERNICIRII

{{scope}}

═══════════════════════════════════════════════════════════════

PUTERI CONFERITE

În îndeplinirea mandatului, mandatarul are dreptul:

□ să depună și să ridice documente
□ să semneze în numele meu orice acte necesare
□ să dea declarații și să răspundă la întrebări
□ să plătească taxe și impozite
□ să încaseze sume de bani cuvenite mie
□ să facă orice demersuri legale necesare îndeplinirii mandatului
□ [Alte puteri specifice]: _______________________________________

═══════════════════════════════════════════════════════════════

VALABILITATE

Prezenta împuternicire este valabilă: {{validity_period}}

Poate fi revocată oricând prin notificare scrisă.

═══════════════════════════════════════════════════════════════

DECLARAȚII

Declar că am dat prezenta împuternicire de bunăvoie, în deplină cunoștință
de cauză și că mandatarul va acționa conform instrucțiunilor mele.

Mandatarul nu poate să-și substituie o altă persoană fără acordul meu scris.

═══════════════════════════════════════════════════════════════

Data: {{authorization_date}}

MANDANT,
{{grantor_name}}

Semnătura: _____________________

═══════════════════════════════════════════════════════════════

ACCEPT MANDATUL

Subsemnatul/Subsemnata {{agent_name}} accept mandatul conferit prin
prezenta împuternicire și mă oblig să îndeplinesc cu diligență sarcinile
încredințate.

MANDATAR,
{{agent_name}}

Semnătura: _____________________
Data: {{authorization_date}}
`,
  },
];

// Export summary statistics
export const templatesSummary = {
  total: templatesSprint25.length,
  byCategory: {
    contract: templatesSprint25.filter(t => t.category === 'contract').length,
    invoice: templatesSprint25.filter(t => t.category === 'invoice').length,
    declaration: templatesSprint25.filter(t => t.category === 'declaration').length,
    hr: templatesSprint25.filter(t => t.category === 'hr').length,
    legal: templatesSprint25.filter(t => t.category === 'legal').length,
    financial: templatesSprint25.filter(t => t.category === 'financial').length,
  },
  freeTemplates: templatesSprint25.filter(t => t.isFree).length,
  premiumTemplates: templatesSprint25.filter(t => !t.isFree).length,
};

export default templatesSprint25;

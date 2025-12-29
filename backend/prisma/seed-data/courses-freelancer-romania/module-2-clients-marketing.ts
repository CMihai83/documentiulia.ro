// Freelancer Romania Complete Guide - Module 2: Clienti si Marketing
// Elite-level comprehensive content

export const freelancerModule2 = {
  title: 'Gasirea Clientilor si Marketing Personal',
  description: 'Strategii de marketing, brand personal, platforme si networking pentru freelanceri',
  order: 2,
  lessons: [
    {
      title: 'Construirea Brandului Personal',
      slug: 'construire-brand-personal',
      type: 'TEXT' as const,
      duration: 40,
      order: 1,
      isFree: false,
      content: `# Brandul Personal pentru Freelanceri

## De ce ai nevoie de Brand Personal?

### Beneficii

\`\`\`
1. DIFERENTIERE
   - Te distinge de competitie
   - Justifica preturi premium

2. INCREDERE
   - Clientii cumpara de la oameni, nu firme
   - Reputatia precede pitch-ul

3. ATRAGERE PASIVA
   - Clientii te gasesc
   - Mai putin cold outreach

4. LONGEVITATE
   - Treci de la proiect la proiect
   - Relatii pe termen lung
\`\`\`

---

## Elementele Brandului Personal

### Identitatea

\`\`\`typescript
interface BrandPersonal {
  misiune: string; // De ce faci ce faci
  viziune: string; // Ce vrei sa devii
  valori: string[]; // Ce e important pentru tine

  propunereValoare: {
    pentrucine: string; // Cine e clientul ideal
    problema: string; // Ce problema rezolvi
    solutie: string; // Cum o rezolvi
    diferentiator: string; // De ce tu, nu altcineva
  };

  ton: {
    voce: 'Profesional' | 'Prietenos' | 'Expert' | 'Creativ';
    stilComunicare: string;
  };

  identitateVizuala: {
    culoriPrincipale: string[];
    fonturi: string[];
    stilFotografii: string;
    logo?: string;
  };
}

// Exemplu
const brandExemplu: BrandPersonal = {
  misiune: 'Ajut startup-urile sa lanseze produse digitale rapid si profesional',
  viziune: 'Sa devin consultantul de referinta pentru MVP-uri in Romania',
  valori: ['Transparenta', 'Calitate', 'Viteza', 'Parteneriat'],

  propunereValoare: {
    pentrucine: 'Fondatori de startup-uri tech, non-tehnici',
    problema: 'Nu au echipa tehnica, nu stiu de unde sa inceapa',
    solutie: 'De la idee la MVP functional in 8 saptamani',
    diferentiator: '10 ani experienta, 50+ proiecte lansate, garantie livrare'
  },

  ton: {
    voce: 'Expert',
    stilComunicare: 'Clar, direct, cu exemple practice'
  },

  identitateVizuala: {
    culoriPrincipale: ['#1E3A5F', '#E8B824'],
    fonturi: ['Inter', 'Source Code Pro'],
    stilFotografii: 'Profesional dar accesibil, in context de munca'
  }
};
\`\`\`

---

## Crearea Portofoliului

### Structura Portofoliului Ideal

\`\`\`
WEBSITE PERSONAL:
├── Homepage
│   ├── Headline puternic
│   ├── Propunere valoare clara
│   ├── Social proof (logo-uri clienti)
│   └── CTA clar
│
├── Despre
│   ├── Povestea ta
│   ├── Expertiza si experienta
│   ├── Fotografie profesionala
│   └── Valori si mod de lucru
│
├── Servicii
│   ├── Ce oferi (clar, structurat)
│   ├── Pentru cine
│   ├── Proces de lucru
│   └── Preturi (optional)
│
├── Portofoliu / Case Studies
│   ├── 5-10 proiecte selectate
│   ├── Context si problema
│   ├── Solutia ta
│   ├── Rezultate masurabile
│   └── Testimonial client
│
├── Blog / Resurse
│   ├── Articole de expertiza
│   ├── Ghiduri gratuite
│   └── Pozitionare ca expert
│
├── Contact
│   ├── Formular simplu
│   ├── Email direct
│   ├── Link-uri social media
│   └── Programare call (Calendly)
│
└── Testimoniale
    ├── Citate clienti
    ├── Logo-uri companii
    └── Link-uri LinkedIn
\`\`\`

### Case Study Template

\`\`\`
CASE STUDY: [Nume Proiect]

CLIENT:
[Nume companie] - [Industrie]
[Logo daca ai permisiune]

PROVOCAREA:
"Clientul avea nevoie de... pentru ca..."
- Problema principala
- Context
- Constrangeri (timp, buget)

SOLUTIA:
"Am propus si implementat..."
- Abordarea ta
- Tehnologii/metodologii folosite
- Proces de lucru

REZULTATE:
• Metric 1: [ex: +40% conversii]
• Metric 2: [ex: Lansat in 6 saptamani]
• Metric 3: [ex: 5000 utilizatori in prima luna]

TESTIMONIAL:
"[Citat client]"
- Nume, Functie, Companie

IMAGINI:
[Screenshots, mockups, fotografii]
\`\`\`

---

## LinkedIn pentru Freelanceri

### Optimizarea Profilului

\`\`\`
TITLU (Headline):
Nu: "Freelancer | Web Developer"
Da: "Ajut startup-urile sa lanseze MVP-uri in 8 sapt | 10 ani exp, 50+ proiecte"

DESPRE (Summary):
Paragraf 1: Ce faci si pentru cine
Paragraf 2: Rezultate si diferentiatori
Paragraf 3: Cum lucrez
Paragraf 4: CTA (contact, programare call)

EXPERIENTA:
• Descrie proiecte cheie, nu doar titluri
• Rezultate masurabile
• Skills relevante

RECOMANDARI:
• Solicita de la fiecare client multumit
• Ofera si tu la schimb
• Minim 5-10 pentru credibilitate

CONTINUT:
• Posteaza saptamanal
• Share expertiza, nu doar "caut proiecte"
• Comenteaza la altii
• Construieste relatii
\`\`\`

---

## Content Marketing pentru Freelanceri

### Strategia de Continut

\`\`\`typescript
interface StrategieContent {
  platforme: {
    blog: {
      frecventa: '2-4 articole/luna';
      tipuri: ['How-to', 'Case studies', 'Opinion', 'Trends'];
      lungime: '1500-3000 cuvinte';
    };
    linkedin: {
      frecventa: '3-5 posturi/saptamana';
      tipuri: ['Povesti', 'Tips', 'Behind the scenes', 'Intrebari'];
      lungime: '100-300 cuvinte';
    };
    newsletter: {
      frecventa: 'Saptamanal sau bi-saptamanal';
      continut: 'Curated + original';
      cta: 'Link spre servicii/call';
    };
  };

  calendar: {
    luni: 'Articol lung blog + share';
    marti: 'Tip scurt LinkedIn';
    miercuri: 'Comentarii la altii';
    joi: 'Behind the scenes';
    vineri: 'Newsletter (daca e saptamana)';
  };

  metrici: {
    reach: number;
    engagement: number;
    leadsGenerate: number;
    conversii: number;
  };
}
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Definiti propunerea de valoare pentru serviciile voastre folosind formula: "Ajut [cine] sa [ce] prin [cum]."

**Exercitiul 2:** Scrieti un Case Study pentru cel mai bun proiect realizat pana acum.

**Exercitiul 3:** Optimizati profilul LinkedIn conform checklist-ului de mai sus.

---

*Lectia urmatoare: Platforme si Canale de Achizitie Clienti*`
    },
    {
      title: 'Platforme si Canale de Achizitie Clienti',
      slug: 'platforme-canale-achizitie-clienti',
      type: 'TEXT' as const,
      duration: 45,
      order: 2,
      isFree: false,
      content: `# Unde sa gasesti Clienti ca Freelancer

## Platforme de Freelancing

### Platforme Internationale

\`\`\`typescript
const platformeInternationale = {
  upwork: {
    url: 'upwork.com',
    comision: '5-20%',
    avantaje: ['Volum mare proiecte', 'Escrow sigur', 'Istoric vizibil'],
    dezavantaje: ['Competitie globala', 'Race to bottom pe pret', 'Timp pentru profil'],
    ideal: 'Freelanceri IT, marketing, design',
    tip: '++Premium la proiecte scumpe'
  },

  toptal: {
    url: 'toptal.com',
    comision: 'Inclus in rata',
    avantaje: ['Clienti premium', 'Rate 50-200+ USD/h', 'Selectie stricta'],
    dezavantaje: ['Proces acceptare dificil', 'Doar top 3%'],
    ideal: 'Senior developers, designers, finance',
    tip: 'Aplica doar daca ai 5+ ani experienta solida'
  },

  fiverr: {
    url: 'fiverr.com',
    comision: '20%',
    avantaje: ['Usor de inceput', 'Servicii productizate'],
    dezavantaje: ['Preturi mici', 'Multe revizii', 'Competitie mare'],
    ideal: 'Servicii rapide, repetitive',
    tip: 'Bun pentru inceput sau servicii complementare'
  },

  freelancerCom: {
    url: 'freelancer.com',
    comision: '10%',
    avantaje: ['Varietate proiecte', 'Concursuri'],
    dezavantaje: ['Multe scam-uri', 'Calitate variabila clienti'],
    ideal: 'Proiecte diverse',
    tip: 'Verifica clientii atent'
  }
};
\`\`\`

### Platforme Nisa

\`\`\`
DEZVOLTATORI:
• GitHub Jobs
• Stack Overflow Jobs
• Gun.io (remote premium)
• Turing (AI matching)

DESIGNERI:
• Dribbble
• Behance
• 99designs (concursuri)
• DesignCrowd

SCRIITORI:
• Contently
• Medium Partner
• Substack (newsletter)

CONSULTANTI:
• Expert360
• Catalant
• GLG (cercetare)
\`\`\`

---

## Canale Directe

### Outreach la Rece

\`\`\`typescript
interface StrategieOutreach {
  identificareProspecti: {
    surse: [
      'LinkedIn Sales Navigator',
      'Crunchbase (startup-uri)',
      'AngelList',
      'Product Hunt (lansari recente)',
      'Stiri locale despre finantari'
    ];
    criterii: [
      'Industrie potrivita',
      'Dimensiune companie',
      'Semne de crestere/schimbare'
    ];
  };

  personalizare: {
    cercetare: '15-30 min per prospect';
    elemente: [
      'Referinta la activitatea lor recenta',
      'Problema specifica observata',
      'Cum poti ajuta concret'
    ];
  };

  canalePreferate: {
    email: {
      rataRaspuns: '2-10%';
      lungime: 'Max 150 cuvinte';
      cta: 'Intrebare simpla, nu pitch';
    };
    linkedin: {
      rataRaspuns: '10-25%';
      abordare: 'Connect + mesaj personalizat';
      frecventa: 'Max 20/zi';
    };
  };
}
\`\`\`

### Template Email Outreach

\`\`\`
SUBIECT: [Referinta personalizata] - idee pentru [compania lor]

Buna [Nume],

Am vazut ca [actiune recenta - ex: ati lansat X, ati ridicat finantare].
Felicitari!

Lucrez cu [tipul de companii similar] si am observat ca multi se
confrunta cu [problema specifica]. Recent am ajutat [companie similara]
sa [rezultat concret - ex: creasca conversiile cu 40%].

Mi-ar placea sa imi spui daca [problema] e relevanta pentru voi -
am cateva idei care ar putea ajuta.

Ai 15 minute saptamana asta pentru un call rapid?

Multumesc,
[Nume]

P.S. [Element personalizat - ex: Mi-a placut articolul tau despre X]
\`\`\`

---

## Referinte si Networking

### Sistemul de Referinte

\`\`\`typescript
const sistemReferinte = {
  solicita: {
    cand: 'La finalul proiectului, cand clientul e multumit',
    cum: 'Direct, simplu: "Cunosti pe cineva care ar avea nevoie de..."',
    oferta: 'Comision 10-15% sau servicii gratuite'
  },

  pastreazaRelatia: {
    checkIn: 'Trimestrial, fara pitch',
    valoare: 'Share articole utile, introduceri',
    sarbatori: 'Mesaj personalizat (nu generic)'
  },

  program: {
    formalizat: true,
    structura: {
      niveluri: ['Bronze: 1 referinta', 'Silver: 3', 'Gold: 5+'],
      beneficii: ['Discount servicii', 'Continut exclusiv', 'Prioritate']
    }
  }
};
\`\`\`

### Networking Eficient

\`\`\`
ONLINE:
• Comunitati Slack/Discord de nisa
• Grupuri Facebook profesionale
• Forumuri de industrie
• Twitter/X pentru tech

OFFLINE:
• Meetup-uri locale
• Conferinte de industrie
• Coworking spaces
• Asociatii profesionale

REGULI NETWORKING:
1. Ofera inainte sa ceri
2. Follow-up in 48h
3. Fii consistent (prezent regulat)
4. Ajuta la conectarea altora
\`\`\`

---

## Strategii de Pret

### Modele de Pret

\`\`\`typescript
interface ModelePret {
  orar: {
    avantaje: ['Simplu', 'Flexibil', 'Acoperit la scope creep'];
    dezavantaje: ['Limitat de ore', 'Client vede "costul"'];
    calculRata: 'Target anual / ore facturabile (1200-1600)';
  };

  proiect: {
    avantaje: ['Predictibil pentru client', 'Potential profit mai mare'];
    dezavantaje: ['Risc scope creep', 'Estimari gresite'];
    calculPret: 'Ore estimate x rata orara x 1.3 buffer';
  };

  retainer: {
    avantaje: ['Venit predictibil', 'Relatie pe termen lung'];
    dezavantaje: ['Ore nefacturate pierdute'];
    structura: 'X ore/luna garantate la rata preferentiala';
  };

  bazatPeValoare: {
    avantaje: ['Decuplat de timp', 'Potential mare'];
    dezavantaje: ['Greu de argumentat', 'Necesita incredere'];
    calcul: 'Procent din valoarea livrata clientului';
  };
}

function calculeazaRataOrara(params: {
  venitANUAL: number;
  zileLucru: number;
  oreZi: number;
  utilizare: number; // % din ore facturabile
}): number {
  const oreTotale = params.zileLucru * params.oreZi;
  const oreFacturabile = oreTotale * params.utilizare;
  return params.venitANUAL / oreFacturabile;
}

// Exemplu: 100.000 EUR/an, 220 zile, 8h/zi, 70% utilizare
// = 100.000 / (220 * 8 * 0.7) = 81 EUR/ora
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Alegeti 2 platforme potrivite pentru nisa voastra si creati profilele complete.

**Exercitiul 2:** Scrieti 3 email-uri de outreach personalizate pentru 3 companii target.

**Exercitiul 3:** Calculati rata orara necesara pentru a atinge venitul dorit.

---

*Lectia urmatoare: Gestionarea Relatiilor cu Clientii*`
    },
    {
      title: 'Gestionarea Relatiilor cu Clientii',
      slug: 'gestionare-relatii-clienti',
      type: 'TEXT' as const,
      duration: 40,
      order: 3,
      isFree: false,
      content: `# Gestionarea Relatiilor cu Clientii

## Procesul de Onboarding Client

### Fluxul Complet

\`\`\`
LEAD → CALIFICARE → PROPUNERE → NEGOCIERE → CONTRACT → ONBOARDING → LIVRARE
                                                           ↓
                                                    RELATIONSHIP
\`\`\`

### Calificarea Clientilor

\`\`\`typescript
interface CalificareClient {
  buget: {
    intrebare: 'Care e bugetul pentru acest proiect?';
    raspunsIdeal: 'Peste rata mea minima';
    redFlag: 'Nu stiu / Cat costa?';
  };

  autoritate: {
    intrebare: 'Cine ia decizia finala?';
    raspunsIdeal: 'Eu / Avem aprobare deja';
    redFlag: 'Trebuie sa intreb pe altcineva';
  };

  nevoie: {
    intrebare: 'Ce problema incercati sa rezolvati?';
    raspunsIdeal: 'Problema clara, masurabile';
    redFlag: 'Nu stim exact / totul';
  };

  timeline: {
    intrebare: 'Cand aveti nevoie de solutie?';
    raspunsIdeal: 'Timeline realist pentru scope';
    redFlag: 'Ieri / Nu conteaza';
  };
}

function calculeazaScorClient(raspunsuri: any): number {
  // Scor 1-10 pentru fiecare criteriu
  // Total > 32 = client bun
  // Total 24-32 = cu conditii
  // Total < 24 = evita
}
\`\`\`

---

## Comunicarea Profesionala

### Reguli de Baza

\`\`\`
1. RASPUNS RAPID
   - Email: max 24h in zile lucratoare
   - Urgent: stabileste canal alternativ (Slack, telefon)
   - Out of office: seteaza autoresponder

2. CLARITATE
   - Un subiect per email
   - Actiuni clare cu deadline
   - Sumarizare decizii

3. DOCUMENTARE
   - Confirma verbal in scris
   - Pastreaza istoric
   - Minutes of meeting

4. PROACTIVITATE
   - Update-uri regulate fara sa fie cerute
   - Alerta timpurie pentru probleme
   - Propune solutii, nu doar probleme
\`\`\`

### Template-uri Comunicare

\`\`\`
UPDATE SAPTAMANAL:

Subiect: Update Proiect [Nume] - Saptamana [X]

Buna [Nume],

REALIZAT:
✓ Task 1 finalizat
✓ Task 2 finalizat
→ Task 3 in progres (70%)

PLAN URMATOARE SAPTAMANA:
• Finalizare Task 3
• Incepere Task 4
• Review intermediar joi

BLOCAJE/INTREBARI:
• Am nevoie de [X] pana joi pentru a continua
• Intrebare: [clarificare necesara]

STATUS GENERAL: PE DRUM / ATENTIE / URGENT

Multumesc,
[Nume]

---

ANUNT PROBLEMA:

Subiect: [Proiect] - Problema identificata + Propunere solutie

Buna [Nume],

Am identificat urmatoarea problema: [descriere].

IMPACT:
• Intarziere estimata: X zile
• Cost suplimentar: Y (daca e cazul)

CAUZA:
[Explicatie scurta - fara scuze, fapte]

OPTIUNI PROPUSE:
1. [Optiune A] - [avantaje/dezavantaje]
2. [Optiune B] - [avantaje/dezavantaje]

RECOMANDARE: Optiunea [X] pentru ca [motivatie]

Putem discuta azi la [ora] pentru a decide?

Multumesc pentru intelegere,
[Nume]
\`\`\`

---

## Gestionarea Asteptarilor

### Stabilirea Granitelor

\`\`\`typescript
const graniteSanatoase = {
  programLucru: {
    ore: '9:00-18:00, L-V';
    raspunsuriUrgente: 'Doar daca in contract';
    weekend: 'Exceptii rare, comunicat in avans';
  },

  scopeProiect: {
    definit: 'In contract, detaliat';
    schimbari: 'Prin CR formal, cu impact';
    outOfScope: 'Refuzat politicos sau cotat separat';
  },

  comunicare: {
    canale: 'Email principal, Slack pentru urgente';
    raspuns: '24h zile lucratoare';
    intalniri: 'Programate, nu ad-hoc';
  },

  plati: {
    termene: 'Conform contract, fara exceptii';
    intarzieri: 'Reminder → Avertisment → Stop lucru';
  }
};
\`\`\`

### Cum sa Spui NU

\`\`\`
GRESIT:
"Nu pot face asta."

CORECT:
"Inteleg ca ai nevoie de [X]. In forma actuala a contractului,
acest lucru nu e inclus. Avem doua optiuni:

1. Adaugam ca scope suplimentar cu [cost/timp] aditional
2. Prioritizam [X] in locul altei functionalitati deja agreate

Ce preferati?"

---

GRESIT:
"Nu lucrez in weekend."

CORECT:
"Apreciez urgenta situatiei. Programul meu standard e L-V 9-18.
Pentru urgente de weekend, am o rata suplimentara de 150%.

Alternativ, pot incepe luni dimineata la prima ora.
Ce functioneaza mai bine pentru voi?"
\`\`\`

---

## Rezolvarea Conflictelor

### Tipuri Frecvente

\`\`\`
1. NEINTELEGERI SCOPE
   - Clientul crede ca era inclus
   - Tu stii ca nu era
   → Solutie: Referinta la contract, optiuni de adaugare

2. NEMULTUMIRE CALITATE
   - Clientul nu e multumit de rezultat
   → Solutie: Clarifica criteriile, ofera corectii in scope

3. INTARZIERI
   - Cauza la client (feedback intarziat)
   → Solutie: Documenteaza, ajusteaza timeline formal

4. NEPLATA
   - Clientul nu plateste la timp
   → Solutie: Reminder → Oprire lucru → Masuri legale

5. COMUNICARE
   - Prea multa / prea putina
   → Solutie: Stabileste reguli clare, renegociaza
\`\`\`

### Proces de Escaladare

\`\`\`
NIVEL 1: Discutie directa
         "Am observat [problema]. Cum putem rezolva?"
         ↓ (nu functioneaza)
NIVEL 2: Escaladare la superior
         "Propun sa implicam [manager] pentru aliniere"
         ↓ (nu functioneaza)
NIVEL 3: Formal in scris
         "Conform contractului, articolul X prevede..."
         ↓ (nu functioneaza)
NIVEL 4: Mediere / Legal
         Implicare avocat, mediator
\`\`\`

---

## Retentia Clientilor

### Strategii de Retentie

\`\`\`typescript
const strategiiRetentie = {
  livrareExcelenta: {
    actiuni: [
      'Depaseste asteptarile (under-promise, over-deliver)',
      'Atentie la detalii',
      'Comunicare proactiva'
    ]
  },

  relatie: {
    actiuni: [
      'Check-in post-proiect (1 luna, 3 luni)',
      'Share continut relevant',
      'Felicitari la succese (produs lansat, finantare)'
    ]
  },

  valoareContinua: {
    actiuni: [
      'Propune imbunatatiri proactive',
      'Ofera mentenanta/suport',
      'Extinde scope (upsell natural)'
    ]
  },

  program: {
    discount: '10% clienti recurenti',
    prioritate: 'Slot rezervat in calendar',
    referinte: 'Comision pentru introduceri'
  }
};
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Creati checklist-ul de calificare pentru un nou client potential.

**Exercitiul 2:** Scrieti un email de anunt problema pentru o intarziere de 1 saptamana.

**Exercitiul 3:** Simulati o negociere pentru o cerere out-of-scope.

---

*Urmatorul modul: Finante si Crestere Sustenabila*`
    }
  ]
};

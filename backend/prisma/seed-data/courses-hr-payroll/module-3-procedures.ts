// HR/Payroll Romania - Module 3: Proceduri Administrative HR
// Elite-level comprehensive content

export const hrModule3 = {
  title: 'Proceduri Administrative HR Complete',
  description: 'Angajari, incetari, disciplina si documentatie HR profesionala',
  order: 3,
  lessons: [
    {
      title: 'Procedura de Angajare - De la Recrutare la Onboarding',
      slug: 'procedura-angajare-recrutare-onboarding',
      type: 'TEXT' as const,
      duration: 55,
      order: 1,
      isFree: false,
      content: `# Procedura Completa de Angajare in Romania

## Etapele Procesului de Angajare

### 1. Identificarea Nevoii de Personal

**Analiza necesarului:**
- Evaluarea volumului de munca
- Analiza competentelor existente
- Previziunea dezvoltarii

**Documente necesare:**
- Cerere aprobare post nou
- Fisa postului (draft sau actualizata)
- Buget alocat

---

## 2. Recrutarea Candidatilor

### Metode de Recrutare

| Metoda | Avantaje | Dezavantaje |
|--------|----------|-------------|
| Intern | Cost redus, cunoastere candidati | Talent pool limitat |
| LinkedIn/BestJobs | Reach mare | Cost mare, volum candidaturi |
| Recomandari | Calitate ridicata | Bias potential |
| Agentii | Screening profesional | Cost substantial |
| Universitati | Talente proaspete | Lipsa experienta |

### Anuntul de Angajare Conform Legii

**Elemente OBLIGATORII (GDPR compliant):**

\`\`\`
ANUNT ANGAJARE

Companie: SC Example SRL
Pozitie: Specialist Resurse Umane
Locatie: Cluj-Napoca (+ optiune remote hybrid)

Responsabilitati principale:
- Administrare personal (pontaj, concedii, documente)
- Salarizare lunara pentru 100+ angajati
- Relatia cu ITM, ANAF, Casa de Pensii

Cerinte:
- Studii superioare (preferabil economice/juridice)
- Experienta minim 2 ani in HR/payroll
- Cunostinte Codul Muncii, REVISAL
- Excel avansat

Oferim:
- Salariu competitiv + beneficii
- Training continuu
- Mediu de lucru profesional

NU se discrimineaza pe criterii de varsta, sex,
etnie, religie sau alte criterii protejate de lege.

CV la: hr@example.ro
\`\`\`

**CE SA NU INCLUDETI:**
- Cerinte de varsta
- Sex preferat
- Stare civila
- Fotografii obligatorii

---

## 3. Selectia Candidatilor

### Procesul de Screening

\`\`\`typescript
interface CriteriiSelectie {
  obligatorii: {
    criteriu: string;
    punctajMinim: number;
  }[];
  dezirabile: {
    criteriu: string;
    punctajBonus: number;
  }[];
}

interface EvaluareCandidat {
  candidatId: string;
  punctajTotal: number;
  indeplinesteObligatorii: boolean;
  recomandare: 'RESPINS' | 'REZERVA' | 'INTERVIU';
}

function evalueazaCandidat(
  cv: CV,
  criterii: CriteriiSelectie
): EvaluareCandidat {
  let punctaj = 0;
  let obligatoriiOK = true;

  // Verificare criterii obligatorii
  criterii.obligatorii.forEach(c => {
    const punctajCriteriu = evalueazaCriteriu(cv, c.criteriu);
    if (punctajCriteriu < c.punctajMinim) {
      obligatoriiOK = false;
    }
    punctaj += punctajCriteriu;
  });

  // Adauga punctaj bonus pentru criterii dezirabile
  criterii.dezirabile.forEach(c => {
    punctaj += evalueazaCriteriu(cv, c.criteriu) * c.punctajBonus;
  });

  return {
    candidatId: cv.id,
    punctajTotal: punctaj,
    indeplinesteObligatorii: obligatoriiOK,
    recomandare: obligatoriiOK
      ? (punctaj > 80 ? 'INTERVIU' : 'REZERVA')
      : 'RESPINS'
  };
}
\`\`\`

### Interviul de Angajare

**Structura recomandata (60 minute):**

1. **Introducere** (5 min)
   - Prezentare companie
   - Descriere pozitie

2. **Intrebari comportamentale** (20 min)
   - "Povestiti o situatie dificila si cum ati rezolvat-o"
   - "Dati un exemplu de proiect de succes"

3. **Intrebari tehnice** (20 min)
   - Specifice domeniului
   - Scenarii practice

4. **Intrebari candidat** (10 min)
   - Despre companie/echipa
   - Asteptari

5. **Urmatorii pasi** (5 min)
   - Timeline decizie
   - Etape urmatoare

---

## 4. Oferta de Angajare

### Model Oferta de Angajare

\`\`\`
OFERTA DE ANGAJARE
Data: 15.01.2024

Catre: Ionescu Maria

Stimate/a candidat/a,

In urma procesului de selectie, avem placerea
sa va oferim pozitia de Specialist HR.

CONDITII OFERTA:
- Functie: Specialist Resurse Umane
- Salariu brut: 7.500 RON/luna
- Norma: 8 ore/zi, 40 ore/saptamana
- Contract: Pe durata nedeterminata
- Perioada de proba: 90 zile
- Data incepere: 01.02.2024
- Loc munca: Cluj-Napoca + 2 zile/sapt remote

BENEFICII:
- Tichete masa: 40 RON/zi
- Asigurare medicala privata
- Abonament sport
- 25 zile concediu/an

Oferta valabila pana la: 22.01.2024

Pentru acceptare, va rugam sa semnati si
returnati acest document.

Cu stima,
Director HR
SC Example SRL

ACCEPT OFERTA: _____________ Data: _______
\`\`\`

---

## 5. Documente Necesare pentru Angajare

### Checklist Documente Angajare

\`\`\`typescript
interface ChecklistAngajare {
  documenteObligatorii: {
    document: string;
    obtinut: boolean;
    dataObtinerii?: Date;
  }[];
  documenteOptionale: {
    document: string;
    aplicabil: boolean;
    obtinut: boolean;
  }[];
}

const checklistStandard: ChecklistAngajare = {
  documenteObligatorii: [
    { document: 'Copie CI/BI', obtinut: false },
    { document: 'CV actualizat', obtinut: false },
    { document: 'Diplome studii (copii)', obtinut: false },
    { document: 'Fisa medicala "apt pentru munca"', obtinut: false },
    { document: 'Cazier judiciar (daca e cerut)', obtinut: false },
    { document: 'Declaratie date personale GDPR', obtinut: false },
    { document: 'Extras cont bancar (pentru plata)', obtinut: false },
  ],
  documenteOptionale: [
    { document: 'Carnet de munca (pentru vechime)', aplicabil: true, obtinut: false },
    { document: 'Adeverinta angajator anterior', aplicabil: true, obtinut: false },
    { document: 'Certificate profesionale', aplicabil: false, obtinut: false },
    { document: 'Permis de conducere (daca e cerut)', aplicabil: false, obtinut: false },
  ]
};
\`\`\`

---

## 6. Intocmirea Contractului Individual de Munca

### Pasi de Urmat

1. **Completare CIM** conform model ITM
2. **Anexare fisa postului**
3. **Informare scrisa** (Art. 17 Codul Muncii)
4. **Semnare in 2 exemplare**
5. **Inregistrare REVISAL** - INAINTE de inceperea muncii!

### Termene Critice

| Actiune | Termen |
|---------|--------|
| Inregistrare REVISAL | Cel tarziu in ziua anterioara inceperii |
| Fisa medicala | Inainte de semnare CIM |
| Informare drepturi/obligatii | La semnare |
| Instructaj SSM | Prima zi de munca |

---

## 7. Onboarding - Prima Zi si Prima Luna

### Prima Zi - Checklist

\`\`\`
□ Primire si prezentare echipa
□ Tur al biroului/facilitatilor
□ Configurare acces (badge, email, sisteme)
□ Instructaj SSM general
□ Instructaj PSI
□ Predare echipamente (laptop, telefon)
□ Prezentare regulament intern
□ Programare training-uri initiale
□ Atribuire mentor/buddy
\`\`\`

### Prima Saptamana

\`\`\`
□ Instructaj SSM la locul de munca
□ Training sisteme interne
□ Intalnire cu managerul direct - obiective
□ Prezentare proiecte/clienti
□ Acces la documentatie
□ Integrare in meeting-uri echipa
\`\`\`

### Prima Luna - Obiective

\`\`\`typescript
interface PlanOnboarding30Zile {
  saptamana1: {
    obiective: string[];
    training: string[];
    intalniri: string[];
  };
  saptamana2: {
    obiective: string[];
    proiecte: string[];
    feedback: string;
  };
  saptamana3: {
    obiective: string[];
    responsabilitati: string[];
  };
  saptamana4: {
    evaluare: string;
    planActiune: string[];
    decisPerioadaProba: boolean;
  };
}
\`\`\`

---

## 8. Perioada de Proba

### Durate Maxime Legale

| Categorie | Durata maxima |
|-----------|---------------|
| Functii executie | 90 zile calendaristice |
| Functii conducere | 120 zile calendaristice |
| Muncitori necalificati | 30 zile calendaristice |
| Persoane cu handicap | 30 zile calendaristice |

### Evaluare Perioada de Proba

\`\`\`typescript
interface EvaluarePerioadaProba {
  salariat: string;
  dataStart: Date;
  dataEvaluare: Date;

  criterii: {
    criteriu: string;
    punctaj: number; // 1-5
    comentarii: string;
  }[];

  punctajTotal: number;
  recomandare: 'CONFIRMARE' | 'PRELUNGIRE_PROBA' | 'NECONFIRMARE';
  motivatie: string;

  semnaturiEvaluator: string;
  semnaturaSalariat: string;
  data: Date;
}
\`\`\`

### Incetare in Perioada de Proba

- **Notificare scrisa** obligatorie
- **FARA preaviz** (dar cu 3 zile lucratoare avertizare)
- Poate fi initiata de oricare parte
- Nu se motiveaza (dar se recomanda feedback)

---

## Exercitii Practice

**Exercitiul 1:** Creati un anunt de angajare complet si legal pentru un post de Contabil Senior.

**Exercitiul 2:** Simulati un interviu de 45 minute pentru pozitia de Manager HR, cu intrebari si scor.

**Exercitiul 3:** Elaborati un plan de onboarding de 30 zile pentru un Developer Junior.

---

*Lectia urmatoare: Incetarea Contractului de Munca - Toate Modalitatile*`
    },
    {
      title: 'Incetarea Contractului de Munca - Ghid Complet',
      slug: 'incetare-contract-munca-ghid',
      type: 'TEXT' as const,
      duration: 60,
      order: 2,
      isFree: false,
      content: `# Incetarea Contractului Individual de Munca

## Modalitatile de Incetare (Art. 55-81 Codul Muncii)

### Clasificare Generala

\`\`\`
INCETAREA CIM
├── De drept (Art. 56)
├── Prin acordul partilor (Art. 55 lit. b)
├── Din initiativa salariatului - Demisia (Art. 81)
└── Din initiativa angajatorului - Concedierea
    ├── Disciplinara (Art. 61 lit. a)
    ├── Necorespundere profesionala (Art. 61 lit. d)
    ├── Individuala - motive neimputabile (Art. 65)
    └── Colectiva (Art. 68)
\`\`\`

---

## 1. Incetarea de Drept

### Cazuri Prevazute de Art. 56

| Caz | Efect |
|-----|-------|
| Decesul salariatului | Imediat |
| Decesul angajatorului PF | Imediat |
| Dizolvare angajator PJ | La finalizare procedura |
| Condamnare penala privativa | De la ramanere definitiva |
| Retragere avize/autorizatii | De la retragere |
| Interzicere exercitare profesie | Pe durata interdictiei |
| Expirare CIM determinat | La termen |
| Pensionare limita varsta | La indeplinire conditii |

### Documente Necesare

\`\`\`
Pentru fiecare caz de incetare de drept:
1. Decizie constatare incetare
2. Nota de lichidare
3. Adeverinta de vechime
4. Actualizare REVISAL (in ziua incetarii)
5. Eliberare documente salariat
\`\`\`

---

## 2. Incetarea prin Acordul Partilor

### Procedura

1. **Propunere** de la oricare parte (scrisa recomandat)
2. **Acceptare** de cealalta parte
3. **Stabilire data** incetarii
4. **Redactare act** constatator
5. **Inregistrare REVISAL**

### Model Acord Incetare

\`\`\`
ACORD DE INCETARE A CIM
Nr. ___ din ___

Incheiat intre:
ANGAJATOR: SC Example SRL, CUI RO12345678
si
SALARIAT: Popescu Ion, CNP 1850101123456

Partile, de comun acord, convin urmatoarele:

Art. 1. Contractul individual de munca nr. ___
din ___ inceteaza la data de ___, prin
acordul partilor, conform Art. 55 lit. b)
din Codul Muncii.

Art. 2. Pana la data incetarii, salariatul:
- Va efectua predarea activitatii curente
- Va restitui bunurile angajatorului
- Va semna nota de lichidare

Art. 3. Angajatorul va efectua:
- Plata drepturilor salariale la zi
- Eliberarea documentelor (adeverinte)
- Actualizarea REVISAL

Incheiat in 2 exemplare originale.

ANGAJATOR              SALARIAT
_____________          _____________
\`\`\`

---

## 3. Demisia (Art. 81)

### Definitie si Drepturi

Demisia este actul unilateral de vointa al salariatului prin care acesta comunica angajatorului incetarea CIM.

**Caracteristici:**
- Nu necesita motivare
- Nu necesita acceptare
- Obligatoriu in forma scrisa

### Preavizul

| Categorie | Durata maxima preaviz |
|-----------|----------------------|
| Functii executie | 20 zile lucratoare |
| Functii conducere | 45 zile lucratoare |

**IMPORTANT:** Salariatul poate demisiona FARA preaviz daca angajatorul nu respecta obligatiile (salariu, conditii de munca).

### Model Demisie

\`\`\`
DEMISIE

Catre: SC Example SRL
In atentia: Departament HR / Director General

Subsemnatul/a Ionescu Maria, angajat/a in functia
de Specialist Marketing, va comunic prin prezenta
demisia din functia detinuta.

Conform Art. 81 din Codul Muncii si CIM nr. ___,
voi respecta termenul de preaviz de 20 zile
lucratoare, ultima zi de lucru fiind ___.

Motivele demisiei: [optional - nu e obligatorie]

Solicit eliberarea documentelor legale
(adeverinta vechime, nota lichidare).

Data: ___
Semnatura: ___

Numar inregistrare angajator: ___
Data primirii: ___
Semnatura primire: ___
\`\`\`

---

## 4. Concedierea Disciplinara (Art. 61 lit. a)

### Abateri Disciplinare Grave

Exemple de abateri care pot duce la concediere:
- Absenteism nemotivat repetat
- Furt, frauda
- Violenta la locul de munca
- Consum alcool/droguri
- Incalcare grava norme SSM
- Divulgare secrete comerciale

### Procedura OBLIGATORIE

\`\`\`typescript
interface ProceduraDisciplinara {
  // Pasul 1: Constatare
  actConstatare: {
    data: Date;
    descriereAbatere: string;
    probe: string[];
    martor: string[];
  };

  // Pasul 2: Convocare
  convocareComisie: {
    dataConvocare: Date;
    dataComisie: Date; // minim 5 zile lucratoare
    metodaTranmitere: 'personal' | 'posta' | 'email';
    confirmareOK: boolean;
  };

  // Pasul 3: Cercetare
  cercetare: {
    dataEfectuarii: Date;
    salariatiPrezent: boolean;
    aparareSalariat: string;
    martoriAudiati: string[];
    concluzii: string;
  };

  // Pasul 4: Decizie
  decizie: {
    numar: string;
    data: Date;
    sanctiune: 'AVERTISMENT' | 'SUSPENDARE' | 'RETROGRADARE' | 'CONCEDIERE';
    motivareFaptica: string;
    motivareJuridica: string;
    termenContestatie: string; // 30 zile la Tribunal
  };
}
\`\`\`

### Termene CRITICE

| Etapa | Termen |
|-------|--------|
| Aplicare sanctiune | Max 30 zile de la cunoasterea faptei |
| Emitere decizie | Max 6 luni de la savarsirea faptei |
| Comunicare decizie | 5 zile de la emitere |
| Contestatie | 30 zile de la comunicare |

### Model Decizie Concediere Disciplinara

\`\`\`
DECIZIA NR. ___
privind sanctionarea disciplinara

Angajator: SC Example SRL
Data: ___

In temeiul Art. 247-252 din Codul Muncii,

AVAND IN VEDERE:
- Referatul constatator nr. ___ din ___
- Convocarea la cercetare disciplinara nr. ___
- Procesul-verbal al comisiei de disciplina din ___
- Apararile salariatului [sau lipsa nejustificata]

CONSTATAND ca salariatul POPESCU ION, CNP ___,
angajat in functia de ___, a savarsit urmatoarea
abatere disciplinara grava:
[descriere detaliata a faptei, data, loc, mod]

RETINAND ca prin aceasta fapta s-au incalcat:
- Art. ___ din Regulamentul Intern
- Art. ___ din Contractul Colectiv de Munca
- Art. ___ din CIM

DECIDE:

Art. 1. Se aplica sanctiunea CONCEDIERII
DISCIPLINARE salariatului POPESCU ION.

Art. 2. CIM nr. ___ inceteaza la data de ___
in temeiul Art. 61 lit. a) din Codul Muncii.

Art. 3. Prezenta decizie poate fi contestata
in termen de 30 zile calendaristice de la
comunicare, la Tribunalul Cluj.

DIRECTOR GENERAL
_______________
\`\`\`

---

## 5. Concedierea pentru Necorespundere Profesionala

### Procedura

1. **Evaluare profesionala** prealabila
2. **Identificare necorespundere** documentata
3. **Oferire formare profesionala** / alt post
4. **Cercetare prealabila** (NU disciplinara!)
5. **Emitere decizie** cu preaviz

### Criterii de Necorespundere

\`\`\`typescript
interface EvaluareProfesionala {
  salariat: string;
  perioada: string;

  criterii: {
    denumire: string;
    standard: string;
    realizat: string;
    punctaj: number;
    comentarii: string;
  }[];

  punctajTotal: number;
  punctajMinimNecesar: number;
  concluzie: 'CORESPUNDE' | 'NECORESPUNDE';

  masuriPropuse: string[];
  termenRemediere: Date;
}
\`\`\`

---

## 6. Concedierea Individuala - Motive Economice

### Motive Legale (Art. 65)

- Desfiintare post (reorganizare)
- Dificultati economice
- Transformari tehnologice
- Restructurare

### Conditii de Validitate

1. **Cauza reala** - exista efectiv
2. **Cauza serioasa** - impune desfiintarea
3. **Desfiintare efectiva** - nu se reangajeaza 45 zile
4. **Selectie obiectiva** (daca mai multi pe post similar)

### Criterii de Selectie (daca aplicabil)

\`\`\`
Ordinea de prioritate la disponibilizare:
1. Cei care au alte venituri
2. Cei fara persoane in intretinere
3. Vechime mai mica in unitate
4. Cei care nu sunt unicul intretinator
\`\`\`

---

## 7. Concedierea Colectiva (Art. 68-74)

### Definitie

Concediere colectiva = intr-o perioada de 30 zile:
- Minim **10 salariati** (pt angajatori cu 21-99 salariati)
- Minim **10%** (pt angajatori cu 100-299 salariati)
- Minim **30 salariati** (pt angajatori cu 300+ salariati)

### Procedura Speciala

\`\`\`
Ziua 0: Notificare ITM + sindicat/reprezentanti
        - Motive
        - Nr. si categorii afectate
        - Criterii selectie
        - Masuri atenuare

Ziua 1-30: Consultari cu sindicat
          - Cautare solutii alternative
          - Negociere compensatii

Ziua 31+: Emitere decizii individuale
         - Preaviz 20 zile minim
         - Plati compensatorii (daca e cazul)

Post-concediere:
- Drept prioritate reangajare 45 zile
- Notificare locuri vacante 45 zile
\`\`\`

---

## 8. Formalitati Post-Incetare

### Documente de Eliberat

\`\`\`
□ Adeverinta de vechime
□ Nota de lichidare (semnata de toate departamentele)
□ Copie CIM + acte aditionale
□ Adeverinta pentru somaj (daca aplicabil)
□ Fisa fiscala (pe cerere)
□ Recomandare (optional, la cerere)
\`\`\`

### REVISAL

- Actualizare in ziua incetarii
- Mentionare motiv incetare (cod)
- Pastrare evidenta 75 ani

---

## Exercitii Practice

**Exercitiul 1:** Simulati procedura completa de concediere disciplinara pentru un caz de absenteism (3 absente nemotivate in 30 zile).

**Exercitiul 2:** Redactati toata documentatia pentru o demisie cu preaviz de 20 zile.

**Exercitiul 3:** Analizati un caz de reorganizare cu desfiintarea a 5 posturi si stabiliti procedura corecta.

---

*Lectia urmatoare: Sanatatea si Securitatea in Munca*`
    },
    {
      title: 'Sanatatea si Securitatea in Munca (SSM)',
      slug: 'sanatate-securitate-munca-ssm',
      type: 'TEXT' as const,
      duration: 50,
      order: 3,
      isFree: false,
      content: `# Sanatatea si Securitatea in Munca - Ghid Complet

## Cadrul Legal SSM

### Legislatia Principala

| Act Normativ | Subiect |
|--------------|---------|
| Legea 319/2006 | Legea securitatii si sanatatii in munca |
| HG 1425/2006 | Norme metodologice L. 319 |
| HG 355/2007 | Supravegherea sanatatii lucratorilor |
| HG 1091/2006 | Cerinte minime SSM |

### Obligatiile Angajatorului

1. **Evaluarea riscurilor** - pentru toate posturile
2. **Masuri de prevenire** - tehnice si organizatorice
3. **Instruirea lucratorilor** - la angajare si periodic
4. **Supravegherea sanatatii** - examene medicale
5. **Echipament de protectie** - furnizat gratuit
6. **Investigare accidente** - raportare obligatorie

---

## Organizarea Activitatii SSM

### Structuri Posibile

\`\`\`typescript
type OrganizareSSM =
  | 'ANGAJATOR_DIRECT'      // <9 salariati, risc mic
  | 'LUCRATOR_DESEMNAT'     // 9-49 salariati
  | 'SERVICIU_INTERN'       // 50-249 salariati
  | 'SERVICIU_EXTERN'       // >250 sau risc mare
  | 'COMBINAT';             // intern + extern

interface ServiciuSSM {
  tip: OrganizareSSM;
  responsabil: {
    nume: string;
    calificare: string;
    atestat: string;
  };
  activitati: string[];
  documentatie: string[];
}
\`\`\`

### Documentele Obligatorii

\`\`\`
1. Evaluare de risc
   - Pentru fiecare post/loc de munca
   - Actualizata la modificari

2. Plan de prevenire si protectie
   - Masuri tehnice si organizatorice
   - Responsabili si termene

3. Instructiuni proprii SSM
   - Specifice activitatilor
   - Echipamente utilizate

4. Fise de instruire individuala
   - Semnate de lucrator
   - Cu data si continut instruire

5. Evidenta accidentelor de munca
   - Registru special
   - FIAM pentru fiecare accident
\`\`\`

---

## Evaluarea Riscurilor

### Etapele Evaluarii

\`\`\`typescript
interface EvaluareRisc {
  locMunca: string;
  activitati: string[];

  identificarePericuluri: {
    pericol: string;
    sursa: string;
    consecintaPosibila: string;
  }[];

  evaluareRiscuri: {
    pericol: string;
    probabilitate: 1 | 2 | 3 | 4 | 5;
    gravitate: 1 | 2 | 3 | 4 | 5;
    nivelRisc: number; // P x G
    clasificare: 'ACCEPTABIL' | 'TOLERABIL' | 'INACCEPTABIL';
  }[];

  masuriControl: {
    risc: string;
    masura: string;
    responsabil: string;
    termen: Date;
    verificare: Date;
  }[];
}

function calculeazaNivelRisc(p: number, g: number): string {
  const nivel = p * g;
  if (nivel <= 6) return 'ACCEPTABIL';
  if (nivel <= 12) return 'TOLERABIL';
  return 'INACCEPTABIL';
}
\`\`\`

### Matrice de Risc

\`\`\`
GRAVITATE →
     │ 1  │ 2  │ 3  │ 4  │ 5  │
─────┼────┼────┼────┼────┼────┤
P  5 │ 5  │ 10 │ 15 │ 20 │ 25 │
R  4 │ 4  │ 8  │ 12 │ 16 │ 20 │
O  3 │ 3  │ 6  │ 9  │ 12 │ 15 │
B  2 │ 2  │ 4  │ 6  │ 8  │ 10 │
   1 │ 1  │ 2  │ 3  │ 4  │ 5  │
─────┴────┴────┴────┴────┴────┘

Verde (1-6): ACCEPTABIL
Galben (7-12): TOLERABIL - masuri in timp rezonabil
Rosu (13-25): INACCEPTABIL - actiune imediata
\`\`\`

---

## Instruirea Lucratorilor

### Tipuri de Instruire

| Tip | Moment | Durata minima | Verificare |
|-----|--------|---------------|------------|
| Introductiv-generala | La angajare | 8 ore | Test |
| La locul de munca | Prima zi | 8 ore | Practica |
| Periodica | 1-6 luni | 2 ore | Test |
| La schimbarea locului | La mutare | 8 ore | Practica |
| Suplimentara | Dupa accident | 2 ore | Test |

### Fisa de Instruire Individuala

\`\`\`
FISA DE INSTRUIRE INDIVIDUALA
privind securitatea si sanatatea in munca

Numele si prenumele: POPESCU ION
Functia: Operator calculator
Locul de munca: Departament IT
Data angajarii: 15.01.2024

═══════════════════════════════════════════════════════════
DATA    | TIP INSTRUIRE | DURATA | CONTINUT    | SEMN. | SEMN.
        |               | (ore)  |             | LUCR. | INSTR.
════════╪═══════════════╪════════╪═════════════╪═══════╪══════
15.01.24| Introductiva  |   8    | L319, HG1425|  [s]  |  [s]
15.01.24| Loc munca     |   8    | Instr. IT   |  [s]  |  [s]
15.04.24| Periodica     |   2    | Ergonomie   |  [s]  |  [s]
═══════════════════════════════════════════════════════════
\`\`\`

---

## Supravegherea Sanatatii

### Examenele Medicale Obligatorii

| Tip Examen | Moment | Plata |
|------------|--------|-------|
| La angajare | Inainte de CIM | Angajator |
| Periodic | Anual sau la 6 luni | Angajator |
| La reluarea muncii | Dupa absenta >30 zile | Angajator |
| La schimbarea postului | La mutare | Angajator |

### Fisa de Aptitudine

\`\`\`
FISA DE APTITUDINE
Nr. ___ / Data: ___

Unitate: SC Example SRL
Salariat: Popescu Ion, CNP ___
Functia/Meseria: Operator calculator
Locul de munca: Birou

Tip examen: □ Angajare  ☑ Periodic  □ Adaptare

In urma examenului medical efectuat, salariatul:

☑ APT pentru functia/meseria/locul de munca
□ APT CONDITIONAT (limitari: ___)
□ INAPT TEMPORAR (perioada: ___)
□ INAPT

Observatii: Control oftalmologic anual recomandat

Medic de medicina muncii: ___
Semnatura si parafa: ___
\`\`\`

---

## Accidentele de Munca

### Clasificare

\`\`\`typescript
type TipAccident =
  | 'USOR'              // ITM <3 zile
  | 'CU_ITM'            // ITM 3-180 zile
  | 'INVALIDITATE'      // Incadrare gr. III-I
  | 'MORTAL';           // Deces

interface AccidentMunca {
  data: Date;
  ora: string;
  locul: string;
  victima: {
    nume: string;
    functie: string;
    vechime: number;
  };
  descriere: string;
  cauze: string[];
  consecinte: string;
  tip: TipAccident;
  martori: string[];
}
\`\`\`

### Procedura de Raportare

\`\`\`
ACCIDENT USOR (ITM < 3 zile):
1. Prim ajutor
2. Inregistrare in registrul de accidente
3. Investigare interna
4. Masuri preventive

ACCIDENT CU ITM (>= 3 zile):
1. Anunt ITM in 24 ore
2. Conservare locul accidentului
3. Cercetare de catre angajator
4. Dosar complet in 5 zile
5. FIAM (Fisa de Inregistrare Accident Munca)

ACCIDENT GRAV/MORTAL:
1. Anunt ITM + Parchet IMEDIAT
2. Conservare loc accident
3. Cercetare de catre ITM
4. Masuri imediate de securizare
\`\`\`

---

## Echipamentul Individual de Protectie (EIP)

### Categorii EIP

\`\`\`
1. Protectia capului
   - Casti de protectie
   - Bonete

2. Protectia ochilor/fetei
   - Ochelari de protectie
   - Viziere
   - Ecrane de sudura

3. Protectia cailor respiratorii
   - Masti FFP2/FFP3
   - Aparate de respirat

4. Protectia mainilor
   - Manusi (mecanice, chimice, termice)

5. Protectia picioarelor
   - Bocanci de protectie (S1, S2, S3)

6. Protectia corpului
   - Imbracaminte de lucru
   - Veste reflectorizante
   - Combinezoane
\`\`\`

### Evidenta EIP

\`\`\`typescript
interface FisaEIP {
  salariat: string;
  functie: string;
  locMunca: string;

  echipamenteAlocate: {
    denumire: string;
    dataAcordare: Date;
    cantitate: number;
    durataUtilizare: number; // luni
    semnaturaPrimire: string;
    dataReturnare?: Date;
    stareReturnare?: string;
  }[];
}
\`\`\`

---

## Checklist SSM Periodic

### Verificari Lunare

\`\`\`
□ Fise instruire completate la zi
□ Examenele medicale in termen
□ EIP distribuit si in stare buna
□ Instructiuni SSM afisate
□ Trusa medicala completa
□ Stingatoare verificate
□ Cai de evacuare libere
\`\`\`

### Verificari Anuale

\`\`\`
□ Evaluare de risc actualizata
□ Plan de prevenire revizuit
□ Exercitiu de evacuare efectuat
□ Formari specializate (lucru la inaltime, etc.)
□ Verificari tehnice echipamente
□ Audit intern SSM
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Realizati evaluarea de risc pentru un post de lucru la calculator.

**Exercitiul 2:** Completati o fisa de instruire pentru un angajat nou.

**Exercitiul 3:** Simulati investigarea unui accident de munca (taietura la mana cu cutter).

---

*Lectia urmatoare: Relatii cu Institutiile Statului*`
    },
    {
      title: 'Relatii cu Institutiile Statului - ITM, ANAF, Casa de Pensii',
      slug: 'relatii-institutii-stat-itm-anaf',
      type: 'TEXT' as const,
      duration: 45,
      order: 4,
      isFree: false,
      content: `# Relatiile HR cu Institutiile Statului

## Inspectoratul Teritorial de Munca (ITM)

### Atributii ITM

- Inregistrarea contractelor (REVISAL)
- Control respectare legislatie muncii
- Investigare accidente de munca
- Solutionare sesizari/reclamatii
- Emitere avize si autorizatii

### Interactiuni Frecvente

\`\`\`typescript
interface InteractiuneITM {
  tip: 'REVISAL' | 'CONTROL' | 'ACCIDENT' | 'AUTORIZARE' | 'SESIZARE';
  termen: string;
  documente: string[];
  contact: string;
}

const interactiuniITM: InteractiuneITM[] = [
  {
    tip: 'REVISAL',
    termen: 'Inainte de inceperea muncii',
    documente: ['CIM semnat', 'Fisa medicala'],
    contact: 'Portal online / Ghiseu ITM'
  },
  {
    tip: 'CONTROL',
    termen: 'Imediat la prezentare inspector',
    documente: ['Toate documentele HR', 'Registre', 'CIM-uri'],
    contact: 'Inspector control'
  },
  {
    tip: 'ACCIDENT',
    termen: '24 ore de la producere (pt ITM >= 3 zile)',
    documente: ['Proces verbal constatare', 'Declaratii martori'],
    contact: 'Compartiment accidente munca'
  }
];
\`\`\`

### Pregatirea pentru Control ITM

\`\`\`
DOCUMENTE DE PREGATIT:

□ Registru REVISAL - extras la zi
□ CIM-uri - dosarele complete ale angajatilor
□ Fise de post - pentru toti salariatii
□ State de plata - ultimele 12 luni
□ Pontaje - ultimele 12 luni
□ Regulament intern - semnat de salariati
□ CCM la nivel de unitate (daca exista)
□ Fise instruire SSM - la zi
□ Evaluari risc - actuale
□ Fise de aptitudine - valabile
□ Evidenta concedii - CO, CM
□ Decizii - angajare, modificare, incetare
\`\`\`

### Sanctiuni Frecvente ITM

| Abatere | Amenda (RON) |
|---------|--------------|
| Munca fara CIM | 20.000/persoana |
| Neinregistrare REVISAL | 10.000-20.000 |
| Lipsa fisa post | 2.000-5.000 |
| Lipsa instructaj SSM | 5.000-10.000 |
| Neplata ore suplimentare | 5.000-10.000 |
| Lipsa examen medical | 3.000-6.000 |

---

## ANAF (Administratia Nationala de Administrare Fiscala)

### Obligatii HR fata de ANAF

1. **Declaratia 112** - lunara
2. **Declaratia 205** - anuala
3. **Declaratia 394** - pentru achizitii >1.000 EUR
4. **Retineri la sursa** - impozit pe venit

### Termene ANAF

\`\`\`
D112: 25 ale lunii urmatoare
D205: 28 februarie pentru anul anterior
Plata contributii: 25 ale lunii urmatoare
\`\`\`

### Interfata cu Sistemele ANAF

\`\`\`typescript
interface ConexiuneANAF {
  portal: 'SPV' | 'eFactura' | 'PatrIMon';
  certificatDigital: boolean;
  tipAcces: 'reprezentant' | 'imputernicit';
  operatiuni: string[];
}

const conexiuniANAF: ConexiuneANAF[] = [
  {
    portal: 'SPV',
    certificatDigital: true,
    tipAcces: 'reprezentant',
    operatiuni: ['Depunere D112', 'Depunere D205', 'Vizualizare obligatii']
  },
  {
    portal: 'PatrIMon',
    certificatDigital: true,
    tipAcces: 'imputernicit',
    operatiuni: ['Verificare CIF', 'Consultare dosare fiscale']
  }
];
\`\`\`

---

## Casa Judeteana de Pensii (CJP)

### Servicii CJP

- Stabilire si plata pensii
- Eliberare adeverinte stagiu cotizare
- Recalculare pensii
- Bilete tratament

### Interactiuni HR - CJP

\`\`\`
1. PENSIONARE SALARIAT
   - Adeverinta de vechime
   - Confirmari salariu pentru perioade anterioare
   - Documente justificative conditii speciale

2. CONCEDII MEDICALE (CNAS prin CJP)
   - Certificatele medicale
   - Evidenta zile CM consumate
   - Recuperare sume

3. CONCEDIU CRESTERE COPIL
   - Adeverinta venituri 12 luni
   - Confirmare calitate asigurat
\`\`\`

### Model Adeverinta pentru Pensie

\`\`\`
ADEVERINTA
Nr. ___/Data: ___

SC Example SRL, cu sediul in ___,
CUI RO12345678, certifica prin prezenta ca:

Domnul/Doamna POPESCU ION, CNP 1850101123456,
a fost angajat/a in cadrul societatii noastre
in perioada 01.01.2015 - 31.12.2023.

FUNCTII DETINUTE:
- Specialist IT (01.01.2015 - 30.06.2020)
- Senior Developer (01.07.2020 - 31.12.2023)

VENITURI BRUTE REALIZATE:
An    | Venit anual brut  | Zile lucrate
------|-------------------|-------------
2015  |       48.000 RON  |     250
2016  |       52.000 RON  |     248
...   |                   |

Contributiile CAS au fost retinute si virate
conform legii.

Eliberata pentru: CASA JUDETEANA DE PENSII

Director HR: ___
Semnatura: ___
\`\`\`

---

## CNAS / Casa de Asigurari de Sanatate

### Interactiuni HR - CASS

\`\`\`typescript
interface InteractiuneCASS {
  serviciu: string;
  documente: string[];
  termene: string;
}

const interactiuniCASS: InteractiuneCASS[] = [
  {
    serviciu: 'Inregistrare asigurati',
    documente: ['D112 cu CASS'],
    termene: 'Lunar, automat prin D112'
  },
  {
    serviciu: 'Concedii medicale - recuperare',
    documente: ['Certificate medicale', 'Centralizator CM', 'Cerere recuperare'],
    termene: '90 zile de la plata indemnizatiei'
  },
  {
    serviciu: 'Card european sanatate',
    documente: ['Cerere', 'CI'],
    termene: 'La cererea salariatului'
  }
];
\`\`\`

### Recuperarea Concediilor Medicale

\`\`\`
PROCEDURA RECUPERARE CM:

1. Angajatorul plateste indemnizatia
   (primele 5 zile din fonduri proprii)

2. Pregatire dosar:
   - Certificate medicale originale
   - Centralizator indemnizatii
   - Extras cont bancar

3. Depunere la CASS teritoriala
   - Termen: 90 zile de la plata

4. Verificare si aprobare CASS
   - Termen raspuns: 60 zile

5. Virament in contul angajatorului
\`\`\`

---

## ANOFM (Agentia pentru Ocuparea Fortei de Munca)

### Obligatii catre ANOFM

1. **Raportare disponibilizari** (pentru concedieri colective)
2. **Comunicare locuri vacante** (optional, dar recomandat)
3. **Utilizare servicii mediere** (gratuite)

### Somajul Tehnic

\`\`\`
PROCEDURA SOMAJ TEHNIC:

1. Notificare ANOFM - inainte de aplicare
2. Acordare indemnizatie 75% (din fonduri proprii sau ANOFM)
3. Raportare lunara situatie
4. Reluare activitate sau incetare CIM
\`\`\`

---

## Calendar Obligatii Institutionale

### Obligatii Lunare

\`\`\`
Ziua 1-24: Pregatire state plata, D112
Ziua 25:   Termen D112 + plata contributii
Ziua 1-28: REVISAL actualizat pentru modificari

Pe parcurs:
- CM comunicate la CASS (pentru recuperare)
- Modificari CIM in REVISAL (20 zile de la modificare)
\`\`\`

### Obligatii Anuale

\`\`\`
Ianuarie:     Plan concedii, instructaje periodice SSM
Februarie 28: D205 anuala
Martie:       Evaluari de risc anuale
Aprilie:      Raport SSM anual
Trimestrial:  Verificare truse medicale
Anual:        Exercitiu evacuare
\`\`\`

---

## Digitalizarea Relatiilor cu Institutiile

### Portale si Platforme

\`\`\`typescript
const portaleInstitutii = {
  ITM: {
    portal: 'https://www.inspectiamuncii.ro',
    servicii: ['REVISAL online', 'Programari control'],
    autentificare: 'Certificat digital'
  },
  ANAF: {
    portal: 'https://www.anaf.ro/SPV',
    servicii: ['D112', 'D205', 'Verificari CIF'],
    autentificare: 'Certificat digital'
  },
  CNAS: {
    portal: 'https://www.cnas.ro',
    servicii: ['Verificare calitate asigurat', 'CM online'],
    autentificare: 'Cont + certificat'
  },
  CJP: {
    portal: 'https://www.cnpp.ro',
    servicii: ['Consultare stagiu cotizare'],
    autentificare: 'Cont personal'
  }
};
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Pregatiti dosarul complet pentru un control ITM inopinat.

**Exercitiul 2:** Simulati procedura de recuperare a indemnizatiilor de CM pe 3 luni.

**Exercitiul 3:** Intocmiti adeverinta de vechime pentru un salariat care se pensioneaza.

---

*Urmatorul modul: Digitalizarea HR - Software si Automatizari*`
    }
  ]
};

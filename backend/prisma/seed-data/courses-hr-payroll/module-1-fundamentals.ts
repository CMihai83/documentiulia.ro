// HR/Payroll Romania - Module 1: Fundamentele Legislatiei Muncii
// Elite-level comprehensive content

export const hrModule1 = {
  title: 'Fundamentele Legislatiei Muncii in Romania',
  description: 'Bazele juridice ale relatiilor de munca conform Codului Muncii',
  order: 1,
  lessons: [
    {
      title: 'Codul Muncii 2024-2025 - Structura si Principii Fundamentale',
      slug: 'codul-muncii-structura-principii',
      type: 'TEXT' as const,
      duration: 45,
      order: 1,
      isFree: true,
      content: `# Codul Muncii 2024-2025 - Ghid Complet

## Introducere in Legislatia Muncii din Romania

Codul Muncii (Legea nr. 53/2003, republicata) reprezinta piatra de temelie a relatiilor de munca in Romania. Intelegerea profunda a acestui act normativ este esentiala pentru orice profesionist HR, antreprenor sau manager.

### De ce este crucial Codul Muncii?

Codul Muncii reglementeaza:
- **Relatiile individuale de munca** - contracte, drepturi, obligatii
- **Relatiile colective** - sindicate, negocieri, conflicte
- **Jurisdictia muncii** - solutionarea litigiilor

---

## Structura Codului Muncii

### Titlul I - Dispozitii Generale (Art. 1-9)

**Articolul 1** defineste obiectul: reglementarea domeniului raporturilor de munca, a controlului aplicarii reglementarilor din domeniul raporturilor de munca, precum si a jurisdictiei muncii.

**Principiile fundamentale (Art. 3-9):**

1. **Libertatea muncii** - Dreptul la munca nu poate fi ingradit
2. **Egalitatea de tratament** - Interzicerea discriminarii
3. **Protectia salariatilor** - Drepturile minime garantate
4. **Consensualismul** - Acordul partilor la baza relatiei

\`\`\`
IMPORTANT: Orice clauza contrara dispozitiilor legale
sau contractelor colective este NULA de drept!
\`\`\`

### Titlul II - Contractul Individual de Munca (Art. 10-107)

Acest titlu este cel mai amplu si reglementeaza:

| Capitol | Articole | Tema |
|---------|----------|------|
| I | 10-15 | Incheierea contractului |
| II | 16-29 | Executarea contractului |
| III | 30-36 | Modificarea contractului |
| IV | 37-40 | Suspendarea contractului |
| V | 41-81 | Incetarea contractului |
| VI | 82-107 | Contracte speciale |

### Titlul III - Timpul de Munca si Odihna (Art. 108-158)

Reglementeaza:
- Durata normala: **8 ore/zi, 40 ore/saptamana**
- Ore suplimentare: maxim **8 ore/saptamana**
- Concediul de odihna: minim **20 zile lucratoare/an**
- Sarbatori legale: **15 zile pe an**

---

## Principiile Fundamentale Detaliate

### 1. Principiul Libertatii Muncii

**Articolul 3** garanteaza:
- Dreptul de a alege profesia si locul de munca
- Interdictia muncii fortate
- Libertatea de a negocia conditiile

**Exceptii legale:**
- Serviciul militar (in anumite conditii)
- Obligatii civice stabilite de lege
- Munca in penitenciare (reglementata special)

### 2. Principiul Egalitatii de Tratament

**Articolul 5** interzice discriminarea bazata pe:
- Sex, orientare sexuala
- Caracteristici genetice
- Varsta, nationalitate, rasa
- Origine sociala, handicap
- Situatie familiala, responsabilitati familiale
- Apartenenta sindicala, opinii politice

\`\`\`typescript
// Exemplu verificare nediscriminare in software HR
interface CriteriuAngajare {
  competenteProfesionale: string[];
  experienta: number; // ani
  studii: string;
  // NU include: varsta, sex, stare civila etc.
}

function evalueazaCandidat(candidat: Candidat, criteriu: CriteriuAngajare): boolean {
  // Evaluare DOAR pe criterii obiective
  return candidat.competente.some(c => criteriu.competenteProfesionale.includes(c))
    && candidat.aniExperienta >= criteriu.experienta;
}
\`\`\`

### 3. Principiul Protectiei Salariatilor

Codul garanteaza drepturi minime care **NU POT fi negociate in defavoarea salariatului**:
- Salariu minim pe economie
- Durata maxima a timpului de munca
- Repaus saptamanal si concediu
- Securitate si sanatate in munca

---

## Categorii de Salariati

### Salariati cu Contract pe Durata Nedeterminata

Aceasta este **regula generala**. Contractul pe durata nedeterminata ofera:
- Stabilitate in munca
- Protectie sporita la concediere
- Acces la toate drepturile legale

### Salariati cu Contract pe Durata Determinata

**Conditii stricte (Art. 82-86):**
- Durata maxima: 36 luni
- Maxim 3 contracte succesive
- Cazuri limitative prevazute de lege

**Situatii permise:**
1. Inlocuirea unui salariat cu contract suspendat
2. Cresterea temporara a activitatii
3. Activitati sezoniere
4. Proiecte/programe cu durata determinata

### Munca prin Agent de Munca Temporara

Relatia tripartita:
- **Agentul** - angajatorul formal
- **Utilizatorul** - beneficiarul muncii
- **Salariatul temporar** - presteaza munca

---

## Aplicarea Practica a Codului

### Ierarhia Normelor in Dreptul Muncii

\`\`\`
Constitutia Romaniei
        ↓
Codul Muncii + Legi speciale
        ↓
Hotarari de Guvern
        ↓
Ordine de ministru
        ↓
Contracte Colective (national → ramura → unitate)
        ↓
Regulament Intern
        ↓
Contract Individual de Munca
\`\`\`

### Regula Favorizarii Salariatului

**In dubio pro operario** - In caz de dubiu, se aplica interpretarea mai favorabila salariatului.

**Exemplu practic:**
Daca un contract prevede 22 zile concediu, iar contractul colectiv 25 zile, se aplica **25 zile**.

---

## Institutii si Autoritati Relevante

### Inspectia Muncii

- Controleaza aplicarea legislatiei
- Aplica sanctiuni contraventionale
- Investigheaza accidentele de munca

### ANOFM (Agentia Nationala pentru Ocuparea Fortei de Munca)

- Gestioneaza somajul
- Mediaza pe piata muncii
- Formare profesionala

### ITM (Inspectoratul Teritorial de Munca)

- Inregistreaza contractele in REVISAL
- Emite avize si autorizatii
- Control la nivel judetean

---

## Rezumat si Puncte Cheie

1. **Codul Muncii** este legea cadru pentru relatiile de munca
2. **Libertatea muncii** si **egalitatea** sunt principii fundamentale
3. **Contractul pe durata nedeterminata** este regula
4. **Drepturile minime** nu pot fi negociate in minus
5. **Ierarhia normelor** protejeaza salariatul

---

## Exercitii Practice

**Exercitiul 1:** Identificati 3 situatii din practica companiei dvs. unde se aplica principiul egalitatii de tratament.

**Exercitiul 2:** Analizati un contract de munca existent si verificati conformitatea cu dispozitiile Codului Muncii.

**Exercitiul 3:** Creati o lista de verificare pentru incheierea unui CIM conform legii.

---

*Lectia urmatoare: Contractul Individual de Munca - Elemente Esentiale*`
    },
    {
      title: 'Contractul Individual de Munca - Elemente Esentiale si Clauze',
      slug: 'contract-individual-munca-elemente',
      type: 'TEXT' as const,
      duration: 60,
      order: 2,
      isFree: false,
      content: `# Contractul Individual de Munca - Ghid Exhaustiv

## Definitie si Natura Juridica

**Contractul individual de munca (CIM)** este conventia prin care o persoana fizica, denumita salariat, se obliga sa presteze munca pentru si sub autoritatea unui angajator, persoana fizica sau juridica, in schimbul unei remuneratii denumite salariu.

### Caracteristici Juridice Esentiale

1. **Contract sinalagmatic** - obligatii reciproce
2. **Contract oneros** - prestatie contra prestatie
3. **Contract cu executare succesiva** - in timp
4. **Contract intuitu personae** - legat de persoana salariatului
5. **Contract consensual** - se incheie prin acordul partilor

---

## Conditii de Validitate

### Capacitatea Juridica

**Pentru salariat:**
- Varsta minima: **16 ani** (regula generala)
- Intre **15-16 ani**: cu acordul parintilor, munca usoara
- Sub **15 ani**: INTERZIS (exceptii artistice cu autorizatie)

**Pentru angajator:**
- Persoana juridica: capacitate deplina
- Persoana fizica: cel putin 18 ani

### Consimtamantul

Trebuie sa fie:
- **Liber** - fara constrangere
- **Serios** - intentie reala
- **Expres** - manifestat clar
- **Informat** - cunoasterea conditiilor

### Obiectul Contractului

- **Obligatia salariatului**: prestarea muncii
- **Obligatia angajatorului**: plata salariului
- Trebuie sa fie **licit, posibil si determinat**

### Cauza Contractului

- Pentru salariat: obtinerea salariului
- Pentru angajator: obtinerea fortei de munca
- Trebuie sa fie **licita si morala**

---

## Elementele Obligatorii ale CIM (Art. 17)

### 1. Identitatea Partilor

\`\`\`
ANGAJATOR:
- Denumire/Nume complet
- Sediul/Domiciliul
- CUI/CNP
- Numar inregistrare Registrul Comertului

SALARIAT:
- Nume si prenume complet
- CNP
- Domiciliul/Resedinta
- Act de identitate (serie, numar)
\`\`\`

### 2. Locul de Munca

**Obligatoriu de precizat:**
- Sediul angajatorului SAU
- Locul efectiv al prestarii muncii
- Pentru munca la domiciliu: adresa exacta
- Pentru telemunca: mentiune expresa

**Clauza de mobilitate:**
\`\`\`typescript
interface ClauzaMobilitate {
  locPrincipal: string;
  zonaMobilitate: string; // ex: "judetul Cluj"
  compensatie: {
    diurna: number;
    transport: boolean;
    cazare: boolean;
  };
}
\`\`\`

### 3. Functia/Ocupatia

- Conform **COR** (Clasificarea Ocupatiilor din Romania)
- Fisa postului obligatorie
- Descrierea atributiilor principale

**Exemplu:**
\`\`\`
Functia: Specialist Resurse Umane
Cod COR: 242314
Fisa postului: Anexa 1 la CIM
\`\`\`

### 4. Criteriile de Evaluare

Obligatorii din 2011:
- Criterii obiective si masurabile
- Procedura de evaluare
- Periodicitate
- Consecinte

### 5. Riscurile Specifice Postului

Din evaluarea de risc SSM:
- Riscuri identificate
- Masuri de protectie
- Echipament de protectie furnizat

### 6. Data Inceperii Activitatii

- Zi calendaristica precisa
- Inregistrare REVISAL **INAINTE** de incepere

### 7. Durata Contractului

- **Nedeterminata** (regula)
- **Determinata** (exceptia - max 36 luni)

### 8. Durata Concediului de Odihna

- Minim **20 zile lucratoare**
- Modalitatea de acordare

### 9. Conditiile de Acordare a Preavizului

- Durata pentru fiecare parte
- Minim **20 zile lucratoare** pentru concediere

### 10. Salariul de Baza si Alte Elemente

\`\`\`typescript
interface StructuraSalariala {
  salariuBazaBrut: number; // minim garantat
  sporuri: {
    tip: string;
    procent: number;
    conditii: string;
  }[];
  bonusuri: {
    tip: string;
    valoare: number;
    conditii: string;
  }[];
  periodicitate: 'lunar' | 'saptamanal';
  dataPlata: number; // ziua din luna
  modalitate: 'card' | 'numerar';
}
\`\`\`

### 11. Durata Normala a Muncii

- **8 ore/zi, 40 ore/saptamana** (norma intreaga)
- Pentru timp partial: ore/zi si ore/saptamana

### 12. Indicarea CCM Aplicabil

- Contractul Colectiv de Munca la nivel national
- CCM la nivel de ramura (daca exista)
- CCM la nivel de unitate (daca exista)

---

## Clauze Facultative (Speciale)

### Clauza de Neconcurenta (Art. 21-24)

**Valabilitate dupa incetarea CIM:**
- Durata maxima: **2 ani**
- Teritoriu si activitati precizate
- **Indemnizatie obligatorie**: minim 50% din salariul mediu

\`\`\`typescript
interface ClauzaNeconcurenta {
  durata: number; // luni, max 24
  teritoriu: string[];
  activitatiInterzise: string[];
  indemnizatieLunara: number; // minim 50% din media ultimelor 6 luni
  conditiiIncetare: string[];
}
\`\`\`

**ATENTIE:** Fara indemnizatie, clauza este **NULA**!

### Clauza de Confidentialitate (Art. 26)

Protejeaza:
- Secret comercial
- Know-how
- Date clienti
- Strategii de business

**Poate fi valabila si dupa incetarea CIM**, dar trebuie:
- Informatii clar definite
- Durata rezonabila
- Nu impiedica exercitarea profesiei

### Clauza de Mobilitate (Art. 25)

Permite modificarea locului de munca:
- Geografic (alte localitati)
- Organizational (alte departamente)

**Obligatoriu:** compensatii pentru cheltuieli suplimentare

### Clauza de Formare Profesionala

Cand angajatorul suporta costurile:
- Obligatia de a ramane minim X ani
- Restituirea costurilor proportional la plecare anticipata
- Maximum **3 ani** obligatie

---

## Forma Contractului

### Forma Scrisa - OBLIGATORIE

**Art. 16 alin. (1):** Contractul se incheie **IN SCRIS**, in limba romana.

### Consecinte lipsa forma scrisa:
- Contractul NU este nul
- Se prezuma pe durata nedeterminata
- Dificultati probatorii

### Inregistrarea in REVISAL

**OBLIGATORIU inainte de inceperea activitatii:**
- Transmitere electronica la ITM
- Cel tarziu in ziua anterioara inceperii muncii
- Sanctiune: 10.000 - 20.000 RON per salariat

---

## Modificarea CIM (Art. 41-48)

### Regula: Acordul Partilor

Orice modificare a elementelor esentiale necesita:
- Acord scris
- Act aditional
- Inregistrare REVISAL (pentru elemente obligatorii)

### Exceptii - Modificare Unilaterala

**Delegarea (Art. 43-44):**
- Durata maxima: 60 zile/an
- Prelungire cu acordul salariatului
- Pastrarea drepturilor de la locul de munca

**Detasarea (Art. 45-47):**
- Durata maxima: 1 an
- Prelungire cu acord: inca 1 an
- Drepturile cele mai favorabile

**Modificare temporara a locului/felului muncii:**
- Forta majora
- Sanctiune disciplinara (retrogradare max 60 zile)

---

## Model Act Aditional

\`\`\`
ACT ADITIONAL NR. ___
la Contractul Individual de Munca nr. ___ din ___

Incheiat astazi, ___, intre:

ANGAJATOR: SC Example SRL, CUI RO12345678
si
SALARIAT: Popescu Ion, CNP 1234567890123

Partile convin modificarea CIM astfel:

Art. 1. Incepand cu data de ___, salariul de baza brut
devine ___ RON/luna.

Art. 2. Celelalte prevederi raman neschimbate.

Prezentul act aditional s-a incheiat in 2 exemplare.

ANGAJATOR                    SALARIAT
___________                  ___________
\`\`\`

---

## Exercitii Practice

**Exercitiul 1:** Redactati un CIM complet pentru un Specialist IT cu salariu 8.000 RON brut, incluzand clauza de neconcurenta.

**Exercitiul 2:** Identificati elementele lipsa dintr-un CIM furnizat.

**Exercitiul 3:** Calculati indemnizatia minima de neconcurenta pentru un salariat cu salariu mediu 6.500 RON.

---

*Lectia urmatoare: REVISAL - Registrul Electronic de Evidenta a Salariatilor*`
    },
    {
      title: 'REVISAL - Registrul Electronic de Evidenta',
      slug: 'revisal-registru-electronic',
      type: 'TEXT' as const,
      duration: 45,
      order: 3,
      isFree: false,
      content: `# REVISAL - Ghid Complet 2024-2025

## Ce este REVISAL?

**REVISAL** (Registrul General de Evidenta a Salariatilor) este registrul electronic in care angajatorii sunt obligati sa inregistreze, in ordine cronologica, toti salariatii.

### Baza Legala

- **HG nr. 905/2017** - Registrul general de evidenta a salariatilor
- **Legea nr. 53/2003** - Codul Muncii, Art. 34
- **OUG nr. 53/2017** - Modificari REVISAL

---

## Obligatiile Angajatorului

### Cine trebuie sa tina REVISAL?

**TOTI angajatorii**, indiferent de:
- Forma juridica (SRL, SA, PFA, II, IF, ONG)
- Numarul de salariati
- Domeniul de activitate

### Ce se inregistreaza?

| Element | Termen Inregistrare |
|---------|---------------------|
| Incheiere CIM | Cu cel putin 1 zi inainte de incepere |
| Modificare elemente esentiale | In 20 zile de la producere |
| Suspendare CIM | In 20 zile de la suspendare |
| Incetare CIM | La data incetarii |
| Detasare | La data producerii |

---

## Elementele Inregistrate in REVISAL

### Date Obligatorii

\`\`\`typescript
interface InregistrareREVISAL {
  // Date angajator
  angajator: {
    cui: string;
    denumire: string;
    codCAEN: string;
  };

  // Date salariat
  salariat: {
    cnp: string;
    nume: string;
    prenume: string;
    cetatenie: string;
  };

  // Date contract
  contract: {
    numar: number;
    data: Date;
    tip: 'NEDETERMINAT' | 'DETERMINAT';
    dataIncepere: Date;
    dataIncetare?: Date; // pentru determinat
  };

  // Functia
  functie: {
    codCOR: string;
    denumire: string;
    tipNorma: 'INTREAGA' | 'PARTIALA';
    numarOre: number; // pentru timp partial
  };

  // Salariu
  salariu: {
    bazaBrut: number;
    sporPermanent?: number;
  };

  // Perioada proba
  perioadaProba?: {
    durata: number; // zile
  };
}
\`\`\`

---

## Procedura de Transmitere

### Metode de Transmitere

1. **Online** - Portal ITM (recomandat)
2. **Offline** - Aplicatie REVISAL + export fisier

### Pasi pentru Transmitere Online

\`\`\`
1. Accesare portal: https://www.inspectiamuncii.ro
2. Autentificare cu certificat digital
3. Selectare "Transmitere REVISAL"
4. Incarcare fisier XML generat
5. Validare si confirmare
6. Descarcare numar de inregistrare
\`\`\`

### Termene CRITICE

| Operatiune | Termen | Sanctiune |
|------------|--------|-----------|
| Angajare noua | 1 zi inainte de incepere | 10.000-20.000 RON |
| Modificare salariu | 20 zile | 5.000-8.000 RON |
| Incetare CIM | Ziua incetarii | 5.000-8.000 RON |
| Suspendare | 20 zile | 5.000-8.000 RON |

---

## Aplicatia REVISAL Offline

### Instalare si Configurare

1. Descarcare de pe site-ul ITM
2. Instalare cu drepturi administrator
3. Configurare date angajator
4. Backup regulat al bazei de date

### Functionalitati Principale

- Adaugare/modificare salariati
- Generare rapoarte
- Export pentru transmitere
- Import date

### Structura Fisierului XML

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<REVISAL>
  <ANGAJATOR>
    <CUI>RO12345678</CUI>
    <DENUMIRE>SC Example SRL</DENUMIRE>
    <CAEN>6201</CAEN>
  </ANGAJATOR>
  <SALARIATI>
    <SALARIAT>
      <CNP>1850101123456</CNP>
      <NUME>POPESCU</NUME>
      <PRENUME>ION</PRENUME>
      <CONTRACT>
        <NUMAR>1</NUMAR>
        <DATA>2024-01-15</DATA>
        <TIP>N</TIP>
        <DATA_INCEPERE>2024-01-16</DATA_INCEPERE>
        <FUNCTIE>242314</FUNCTIE>
        <SALARIU_BAZA>5000</SALARIU_BAZA>
      </CONTRACT>
    </SALARIAT>
  </SALARIATI>
</REVISAL>
\`\`\`

---

## Situatii Speciale

### Corectii in REVISAL

Pentru erori materiale:
1. Identificare inregistrare eronata
2. Generare rectificativa
3. Transmitere cu mentiunea "CORECTIE"
4. Pastrare dovada corectiei

### Fuziuni si Divizari

La transfer de salariati:
- Angajatorul cedent: incetare CIM
- Angajatorul cesionar: preluare cu continuitate

### Angajati Detasati in Strainatate

Inregistrare suplimentara:
- Tara de detasare
- Perioada detasarii
- Conditii speciale

---

## Integrare cu Sistemele HR

### API REVISAL (pentru software specializat)

\`\`\`typescript
// Exemplu integrare REVISAL cu sistemul HR
class REVISALIntegration {
  private endpoint = 'https://api.revisal.gov.ro';

  async transmiteAngajare(salariat: Salariat): Promise<Result> {
    const xml = this.genereazaXML(salariat);
    const signed = await this.semneazaDigital(xml);

    const response = await fetch(\`\${this.endpoint}/transmite\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-Certificate': this.certificat
      },
      body: signed
    });

    return this.parseazaRaspuns(response);
  }

  private genereazaXML(salariat: Salariat): string {
    return \`
      <SALARIAT>
        <CNP>\${salariat.cnp}</CNP>
        <NUME>\${salariat.nume}</NUME>
        ...
      </SALARIAT>
    \`;
  }
}
\`\`\`

---

## Sanctiuni si Raspundere

### Sanctiuni Contraventionale

| Fapta | Amenda (RON) |
|-------|--------------|
| Neinregistrare angajare | 10.000 - 20.000 per salariat |
| Inregistrare cu intarziere | 5.000 - 8.000 |
| Date incomplete/eronate | 5.000 - 8.000 |
| Refuz control ITM | 5.000 - 10.000 |

### Prescriptie

- Contraventiile se prescriu in **3 ani**
- De la data savarsirii faptei

---

## Checklist Conformitate REVISAL

- [ ] Toate CIM-urile inregistrate inainte de inceperea activitatii
- [ ] Modificarile transmise in 20 de zile
- [ ] Incetarile inregistrate la zi
- [ ] Backup regulat al datelor
- [ ] Certificat digital valid
- [ ] Acces securizat la portal

---

## Exercitii Practice

**Exercitiul 1:** Simulati inregistrarea unui nou angajat in REVISAL, de la generarea contractului pana la transmiterea electronica.

**Exercitiul 2:** Identificati termenele pentru urmatoarele situatii:
- Angajare de luni
- Majorare salariu
- Demisie cu preaviz 20 zile

**Exercitiul 3:** Analizati un raport REVISAL si identificati eventuale neconformitati.

---

*Lectia urmatoare: Salariul Minim si Structura Veniturilor*`
    },
    {
      title: 'Salariul Minim si Structura Veniturilor',
      slug: 'salariu-minim-structura-venituri',
      type: 'TEXT' as const,
      duration: 50,
      order: 4,
      isFree: false,
      content: `# Salariul in Romania - Ghid Complet 2024-2025

## Salariul Minim Brut pe Economie

### Evolutia Recenta

| An | Salariu Minim Brut | Salariu Net Aproximativ |
|----|-------------------|------------------------|
| 2024 | 3.300 RON | ~1.986 RON |
| 2025 (propus) | 3.700 RON | ~2.220 RON |

### Exceptii de la Salariul Minim Standard

**Studii superioare cu vechime minim 1 an:**
- 2024: 3.436 RON brut
- Se aplica automat dupa 12 luni

**Sectorul constructii:**
- 2024: 4.582 RON brut
- Conditii speciale de aplicare

---

## Structura Salariului

### Componente Obligatorii

\`\`\`typescript
interface StructuraSalariu {
  // Componenta de baza
  salariuBazaBrut: number;

  // Sporuri permanente
  sporuri: {
    vechime: number;      // % din salariu baza
    conditiiGrele: number;
    noapte: number;       // minim 25%
    weekend: number;      // minim 75%
  };

  // Componente variabile
  bonusuri: {
    performanta: number;
    prezenta: number;
    altele: number;
  };

  // Beneficii
  beneficii: {
    ticheteMasa: number;
    ticheteVacanta: number;
    asigurareSanatate: number;
  };
}
\`\`\`

### Sporul de Vechime

**Conform CCM la nivel national:**

| Vechime | Spor Minim |
|---------|------------|
| 3-5 ani | 5% |
| 5-10 ani | 10% |
| 10-15 ani | 15% |
| 15-20 ani | 20% |
| Peste 20 ani | 25% |

### Sporul pentru Conditii Deosebite

- **Conditii grele**: 10-30%
- **Conditii vatamatoare**: 10-30%
- **Conditii periculoase**: 10-30%
- Cumulabil pana la maxim 50%

### Sporul pentru Munca de Noapte

**Definitie munca de noapte:** intre orele 22:00 - 06:00

**Drepturi:**
- Spor minim **25%** din salariul de baza
- SAU reducerea programului cu 1 ora fara diminuarea salariului
- Examen medical obligatoriu

### Sporul pentru Ore Suplimentare

\`\`\`
Prima optiune: Timp liber corespunzator in urmatoarele 60 zile

A doua optiune (doar daca timpul liber nu e posibil):
- Spor minim 75% din salariul de baza
- Pentru ore in weekend/sarbatori: 100%
\`\`\`

---

## Calculul Salariului Net

### Retineri din Salariul Brut (2024)

| Contributie | Procent | Platitor |
|-------------|---------|----------|
| CAS (pensie) | 25% | Salariat |
| CASS (sanatate) | 10% | Salariat |
| Impozit pe venit | 10% | Salariat |
| CAM (asigurari munca) | 2.25% | Angajator |

### Formula de Calcul

\`\`\`typescript
function calculeazaSalariuNet(brut: number, deducere: number = 300): number {
  const cas = brut * 0.25;
  const cass = brut * 0.10;
  const bazaImpozabila = brut - cas - cass - deducere;
  const impozit = bazaImpozabila * 0.10;

  return brut - cas - cass - impozit;
}

// Exemplu
const brutTest = 5000;
const net = calculeazaSalariuNet(brutTest);
// CAS: 1250, CASS: 500, Baza: 2950, Impozit: 295
// Net: 5000 - 1250 - 500 - 295 = 2955 RON
\`\`\`

### Deducerea Personala 2024

| Venit Brut Lunar | Deducere |
|------------------|----------|
| Pana la 2.000 RON | 520 RON |
| 2.001 - 3.500 RON | 460 RON |
| 3.501 - 5.000 RON | 400 RON |
| 5.001 - 6.500 RON | 280 RON |
| 6.501 - 8.000 RON | 120 RON |
| Peste 8.000 RON | 0 RON |

**Se majoreaza pentru persoane in intretinere:**
- +100 RON pentru prima persoana
- +100 RON pentru fiecare persoana suplimentara

---

## Beneficii Extrasalariale

### Tichete de Masa

**Valoare 2024:** maxim **40 RON/tichet**

**Reguli:**
- Se acorda pentru zilele efectiv lucrate
- Maxim 1 tichet/zi
- Nu se acorda in concediu/delegatie cu diurna
- Neimpozabile (scutite CAS/CASS/impozit)

### Tichete de Vacanta

**Valoare 2024:** maxim **1.600 RON/an** per salariat

**Caracteristici:**
- Acordare obligatorie in sectorul public
- Optionala in sectorul privat
- Neimpozabile integral

### Tichete Cadou

- Ocazii speciale (Paste, Craciun, 8 Martie, 1 Iunie)
- Valoare maxima neimpozabila: **300 RON/eveniment**

### Asigurari Private de Sanatate

- Neimpozabile pana la **400 EUR/an/salariat**
- Deduse integral din profitul angajatorului

---

## Plata Salariului

### Obligatii Legale

**Periodicitate:**
- Cel putin o data pe luna
- La data stabilita in CIM/CCM/Regulament Intern

**Modalitate:**
- Card bancar (regula)
- Numerar (doar daca salariatul solicita si angajatorul accepta)

**Documente obligatorii:**
- Stat de plata
- Fluturasi de salariu individuali

### Retineri din Salariu

**Permise doar pentru:**
1. Impozite si contributii legale
2. Popriri judecatoresti (max 1/3 din net)
3. Acorduri exprese cu salariatul

**Limite:**
- Maxim **50%** din salariul net pentru sume datorate angajatorului
- Maxim **33%** pentru popriri

---

## Exemple Practice de Calcul

### Exemplul 1: Salariat Standard

\`\`\`
Salariu brut: 5.000 RON
Tichet masa: 22 zile x 40 RON = 880 RON

CAS (25%): 1.250 RON
CASS (10%): 500 RON
Deducere personala: 400 RON
Baza impozabila: 5.000 - 1.250 - 500 - 400 = 2.850 RON
Impozit (10%): 285 RON

Salariu NET: 5.000 - 1.250 - 500 - 285 = 2.965 RON
Total incasat: 2.965 + 880 = 3.845 RON
\`\`\`

### Exemplul 2: Cu Ore Suplimentare

\`\`\`
Salariu brut baza: 4.000 RON
Ore suplimentare: 10 ore x (4.000/168) x 1.75 = 417 RON
Total brut: 4.417 RON

CAS: 1.104 RON
CASS: 442 RON
Deducere: 400 RON
Baza: 2.471 RON
Impozit: 247 RON

NET: 4.417 - 1.104 - 442 - 247 = 2.624 RON
\`\`\`

---

## Raportari si Declaratii

### Declaratia 112

**Lunar**, pana pe **25 ale lunii urmatoare**:
- Contributii sociale datorate
- Impozit pe venit retinut
- Date identificare salariati

### Declaratia 205

**Anual**, pana pe **28 februarie**:
- Venituri brute anuale per salariat
- Contributii anuale
- Impozit anual

---

## Exercitii Practice

**Exercitiul 1:** Calculati salariul net pentru un angajat cu:
- Brut: 6.500 RON
- 2 persoane in intretinere
- 5 ani vechime (spor 10%)

**Exercitiul 2:** Determinati costul total pentru angajator pentru un salariat cu salariu brut 5.000 RON.

**Exercitiul 3:** Simulati un stat de plata complet pentru 5 salariati cu situatii diferite.

---

*Lectia urmatoare: Concedii si Absente - Tipuri si Calcul*`
    }
  ]
};

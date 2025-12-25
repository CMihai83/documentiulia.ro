/**
 * DocumentIulia.ro - Sprint 25 Business Formation & EU Funds Courses
 * Comprehensive courses for Romanian entrepreneurs
 * Created: December 2025
 */

export const sprint25BusinessCourses = [
  // SRL Formation Complete Course
  {
    title: 'Ghid Complet Infiintare SRL in Romania 2025',
    slug: 'infiintare-srl-romania-2025',
    description: `Cursul definitiv pentru antreprenorii care vor sa infiinteze un SRL in Romania!

Acest curs practic te ghideaza pas cu pas prin intregul proces de infiintare, de la alegerea denumirii pana la primirea certificatului de inregistrare.

Vei invata sa:
• Alegi forma juridica potrivita pentru afacerea ta
• Pregatesti toate documentele necesare
• Navighezi procesul ONRC fara erori
• Intelegi obligatiile fiscale de la inceput
• Eviti cele mai comune greseli ale antreprenorilor

Include template-uri de acte constitutive, checkliste si studii de caz reale.`,
    category: 'BUSINESS',
    level: 'BEGINNER',
    duration: 480,
    price: 0,
    isFree: true,
    language: 'ro',
    tags: ['SRL', 'infiintare', 'antreprenoriat', 'ONRC', 'business', 'startup'],
    modules: [
      {
        title: 'Introducere in Formele Juridice',
        order: 1,
        duration: 90,
        lessons: [
          {
            title: 'SRL vs PFA vs II - Care forma juridica ti se potriveste?',
            type: 'TEXT',
            duration: 30,
            order: 1,
            content: `# SRL vs PFA vs II - Alegerea Formei Juridice

## Introducere

Alegerea formei juridice potrivite este una dintre cele mai importante decizii pe care le vei lua ca antreprenor. Aceasta decizie va influenta modul in care platesti taxe, raspunzi pentru datorii, angajezi personal si dezvolti afacerea.

## Comparatie Detaliata

### Societate cu Raspundere Limitata (SRL)

**Avantaje:**
- **Raspundere limitata**: Patrimoniul personal este protejat
- **Credibilitate**: Mai multa incredere din partea clientilor si furnizorilor
- **Flexibilitate fiscala**: Poti alege intre impozit pe venit (1%/3%) sau profit (16%)
- **Angajati nelimitati**: Poti creste echipa fara restrictii
- **Dividende**: Poti extrage profit prin dividende (8% impozit)

**Dezavantaje:**
- Contabilitate in partida dubla (mai complexa)
- Costuri de infiintare mai mari (~200-500 EUR)
- Obligatii de raportare lunare

**Potrivit pentru:**
- Afaceri cu risc operational
- Planuri de crestere si angajare
- Colaborari cu companii mari
- Atragere investitori

### Persoana Fizica Autorizata (PFA)

**Avantaje:**
- **Simplitate**: Contabilitate in partida simpla
- **Costuri mici**: Infiintare rapida si ieftina (~100 EUR)
- **Flexibilitate**: Trei sisteme de impozitare disponibile

**Dezavantaje:**
- Raspundere nelimitata (raspunzi cu averea personala)
- Nu poti angaja personal
- Limitat la activitati autorizate personal

**Sisteme de impozitare PFA:**
1. **Norma de venit** - Impozit fix bazat pe activitate si localitate
2. **Impozit pe venit 10%** - Pe venitul net realizat
3. **Venit real** - 10% din profit (venituri - cheltuieli)

### Intreprindere Individuala (II)

**Avantaje:**
- Similar cu PFA dar poate angaja pana la 8 persoane
- Contabilitate simplificata
- Flexibilitate in activitati

**Dezavantaje:**
- Raspundere nelimitata
- Limitat la 8 angajati

## Criterii de Decizie

| Criteriu | SRL | PFA | II |
|----------|-----|-----|-----|
| Capital minim | 1 RON | 0 | 0 |
| Raspundere | Limitata | Nelimitata | Nelimitata |
| Angajati | Nelimitat | 0 | Max 8 |
| Contabilitate | Partida dubla | Simpla | Simpla |
| Impozit profit | 1-16% | 10% | 10% |

## Recomandari Practice

**Alege SRL daca:**
- Vrei sa protejezi averea personala
- Planifici sa angajezi echipa
- Lucrezi cu clienti corporate
- Ai nevoie de investitii externe

**Alege PFA daca:**
- Esti freelancer sau consultant
- Activezi singur, fara angajati
- Ai venituri previzibile si stabile
- Vrei simplitate administrativa

## Concluzie

Nu exista o alegere "corecta" universala. Fiecare forma juridica are avantajele si dezavantajele sale. Analizeaza situatia ta specifica: nivelul de risc, planurile de crestere, complexitatea activitatii si resursele disponibile.

In lectia urmatoare vom detalia procesul complet de infiintare SRL.`
          },
          {
            title: 'Capitalul Social - Cat trebuie si cum se varsa',
            type: 'TEXT',
            duration: 25,
            order: 2,
            content: `# Capitalul Social la SRL - Ghid Complet

## Ce este Capitalul Social?

Capitalul social reprezinta contributia initiala a asociatilor la patrimoniul societatii. Este suma cu care asociatii "pornesc" afacerea si care devine garantia pentru creditori.

## Cadrul Legal Actual

### Minimul legal
- **1 RON** - Acesta este minimul legal din 2020
- Inainte era obligatoriu 200 RON

### Recomandari practice
- **200 RON** - Minimum recomandat pentru credibilitate
- **10.000 RON** - Bun pentru afaceri cu furnizori
- **45.000 RON** (echivalent 10.000 EUR) - Pentru anumite activitati reglementate

## Structura Capitalului Social

### Parti Sociale
Capitalul social este impartit in parti sociale:
- Valoare nominala: minim 1 RON per parte sociala
- Exemplu: Capital 1.000 RON = 100 parti sociale x 10 RON

### Impartirea intre asociati
| Asociat | Parti Sociale | Procent | Drepturi de vot |
|---------|---------------|---------|-----------------|
| Ion | 51 | 51% | Majoritar |
| Maria | 49 | 49% | Minoritar |

## Cum se Varsa Capitalul

### Metoda 1: Numerar (cash)
- Se depune la banca
- Se obtine foaie de varsamant
- Se foloseste pentru inregistrare ONRC

**Procedura:**
1. Deschide cont temporar la banca
2. Depune suma capitalului
3. Solicita foaia de varsamant
4. Prezinta la ONRC

### Metoda 2: Aport in natura
- Bunuri, echipamente, proprietati
- Necesita evaluare de catre evaluator autorizat
- Bunurile devin proprietatea societatii

**Bunuri acceptate:**
- Imobile (cladiri, terenuri)
- Echipamente si utilaje
- Vehicule
- Calculatoare si echipamente IT
- Stocuri de marfa

**Bunuri NEACCEPTATE:**
- Munca sau servicii
- Know-how (cu exceptii)
- Bunuri grevate de sarcini

## Majorarea Capitalului Social

### Cand e necesara?
- Pentru activitati reglementate
- Atragere investitori
- Cresterea credibilitatii
- Accesare fonduri europene

### Modalitati de majorare:
1. **Noi aporturi** - Asociatii aduc bani/bunuri noi
2. **Incorporare rezerve** - Transformarea profitului in capital
3. **Emisiune parti sociale noi** - Pentru investitori noi

## Reducerea Capitalului Social

### Cand se face?
- Acoperire pierderi
- Retragere asociat
- Restructurare

### Procedura:
1. Decizie AGA
2. Publicare in Monitorul Oficial
3. Asteptare 30 zile pentru opozitii creditori
4. Inregistrare ONRC

## Implicatii Fiscale

### Aport initial
- Nu este impozabil
- Nu se plateste TVA

### Majorare capital
- Din profit: nu se plateste impozit dividende
- Din aporturi noi: fara impact fiscal

### Dividende
- Se platesc doar din profit
- Impozit dividende: 8%
- Nu poti distribui mai mult decat profitul

## Sfaturi Practice

**DO:**
- Alege un capital realist pentru tipul afacerii
- Documenteaza toate aporturile
- Pastreaza chitantele de varsamant

**DON'T:**
- Nu pune capital prea mic (1 RON) daca lucrezi cu furnizori
- Nu promite aporturi pe care nu le poti face
- Nu amesteca banii personali cu cei ai firmei

## Concluzie

Capitalul social nu este doar o formalitate - este fundatia financiara a afacerii tale. Alege o suma care reflecta seriozitatea intentiilor tale si care iti permite sa operezi fara probleme de la inceput.`
          },
          {
            title: 'Sediul Social - Cum il alegi si ce documente ai nevoie',
            type: 'TEXT',
            duration: 35,
            order: 3,
            content: `# Sediul Social SRL - Ghid Complet

## Ce este Sediul Social?

Sediul social este adresa oficiala a societatii, unde:
- Primesti corespondenta oficiala (ANAF, ONRC, instante)
- Este inregistrata firma in Registrul Comertului
- Poate fi si locul unde desfasori activitatea (dar nu obligatoriu)

## Tipuri de Sedii Sociale

### 1. Sediu in proprietate personala
**Avantaje:**
- Control total
- Fara costuri lunare de chirie
- Stabilitate pe termen lung

**Cerinte documente:**
- Extras de Carte Funciara (max 30 zile)
- Acord proprietar (daca sunt mai multi)
- Declaratie pe proprie raspundere

### 2. Sediu inchiriat
**Avantaje:**
- Flexibilitate
- Fara capital blocat in imobil
- Costuri deductibile fiscal

**Cerinte documente:**
- Contract de inchiriere inregistrat la ANAF
- Extras CF al proprietarului
- Acord scris pentru sediu social

### 3. Contract de comodat (imprumut de folosinta)
**Avantaje:**
- Gratuit
- Ideal pentru apartamentul personal
- Simplu de incheiat

**Cerinte documente:**
- Contract de comodat (poate fi sub semnatura privata)
- Extras CF
- Acord coproprietari (daca exista)

### 4. Sediu virtual / Coworking
**Avantaje:**
- Cost minim (50-200 RON/luna)
- Adresa prestigioasa
- Servicii suplimentare incluse

**Cerinte documente:**
- Contract cu furnizorul
- Dovada legala a spatiului

## Documente Necesare pentru Sediu

### Checklist complet:

**Document** | **De unde?** | **Valabilitate**
--- | --- | ---
Extras CF | ANCPI/Notariat | Max 30 zile
Contract comodat/inchiriere | Parti | Durata contractului
Acord proprietar | Proprietar | La inregistrare
Acord coproprietari | Toti coproprietarii | La inregistrare
Acord asociatie proprietari | Administrator bloc | La inregistrare

### Model Acord Proprietar

\`\`\`
ACORD
pentru stabilirea sediului social

Subsemnatul/Subsemnata [NUME PRENUME], domiciliat(a) in [ADRESA],
legitimat(a) cu CI seria [XX] nr. [XXXXXX], CNP [XXXXXXXXXXXXX],
in calitate de proprietar al imobilului situat in [ADRESA SEDIU],

DECLAR CA SUNT DE ACORD

ca la adresa mentionata sa fie stabilit sediul social al societatii
[DENUMIRE SRL] S.R.L.

Data: ___________
Semnatura: ___________
\`\`\`

## Cerinte Speciale

### Sediu in bloc de apartamente
- Acord asociatie de proprietari (pentru anumite activitati)
- Verificare regulament de condominiu
- Activitati interzise in multe blocuri:
  - Restaurant/bar
  - Productie industriala
  - Activitati cu zgomot

### Sediu in casa/vila
- Mai multa flexibilitate
- Acord vecinilor NU e necesar
- Atentie la reglementarile urbanistice

### Activitati reglementate
Anumite activitati au cerinte speciale:
- Farmacii: autorizatie DSP
- Alimentatie publica: ISU, DSV
- Sanatate: avize speciale

## Schimbarea Sediului Social

### Cand trebuie schimbat?
- Mutare fizica
- Expirare contract
- Restructurare

### Procedura:
1. Decizie AGA pentru schimbare
2. Obtinere documente pentru noul sediu
3. Act aditional la actul constitutiv
4. Inregistrare modificare la ONRC
5. Notificare ANAF (se face automat prin ONRC)

### Costuri:
- Taxa ONRC: ~100 RON
- Publicare Monitor Oficial: inclusa
- Notar (daca e necesar): 100-200 RON

## Sfaturi Practice

### La infiintare:
1. Verifica disponibilitatea imobilului
2. Asigura-te ca activitatea e permisa la acea adresa
3. Obtine toate acordurile inainte de depunere

### Pe parcurs:
1. Monitorizeaza termenul contractului
2. Actualizeaza documentele la expirare
3. Verifica corespondenta regulat

## Greseli Frecvente

**Evita:**
- Sediu la adresa inexistenta
- Lipsa acordurilor necesare
- Contract de comodat pentru sediu comercial intens
- Ignorarea regulamentului de condominiu

## Concluzie

Sediul social este mai mult decat o simpla adresa - este identitatea legala a firmei tale. Alege-l cu grija, asigura-te ca ai toate documentele in regula, si actualizeaza-l prompt cand situatia se schimba.`
          }
        ]
      },
      {
        title: 'Procesul de Inregistrare la ONRC',
        order: 2,
        duration: 120,
        lessons: [
          {
            title: 'Rezervarea Denumirii - Pas cu pas',
            type: 'TEXT',
            duration: 25,
            order: 1,
            content: `# Rezervarea Denumirii Firmei - Ghid Complet

## De ce este importanta denumirea?

Denumirea societatii este:
- Identitatea juridica a firmei
- Prima impresie pentru clienti
- Element de branding important
- Protejata legal dupa inregistrare

## Reguli pentru Denumirea Firmei

### Ce TREBUIE sa contina:
- Minimum 3 caractere
- Sa fie distincta de alte firme existente
- Sa nu contina cuvinte interzise

### Ce NU poate contina:
- Denumiri de institutii publice (Primaria, Ministerul, etc.)
- Cuvinte obscene sau ofensatoare
- Termeni care induc in eroare (Banca, Asigurari - fara autorizatii)
- Nume de persoane fara acord

### Elemente obligatorii:
- Forma juridica: S.R.L., S.A., S.N.C., etc.
- Se adauga la sfarsitul denumirii

## Procedura de Rezervare

### Pas 1: Verifica disponibilitatea
- Online: portal.onrc.ro/ONRCPortalWeb/appmanager/myONRC/public
- Cauta denumirea dorita
- Verifica si variante similare

### Pas 2: Pregateste cererea
- Cerere tip pentru rezervare denumire
- Minim 3 variante de denumire (in ordine de preferinta)
- Date identificare solicitant

### Pas 3: Depune cererea
**Metode:**
1. **Online** - prin portal.onrc.ro (necesita semnatura electronica)
2. **La ghiseu ONRC** - personal sau prin imputernicit
3. **Prin posta** - cu confirmare de primire

### Pas 4: Primeste dovada rezervarii
- Se elibereaza in 24-48 ore
- Valabilitate: 3 luni
- Poate fi prelungita o singura data

## Costuri

| Serviciu | Cost |
|----------|------|
| Rezervare denumire | ~36 RON |
| Prelungire | ~36 RON |
| Verificare (optional) | Gratuit online |

## Sfaturi pentru Alegerea Denumirii

### Bune practici:
1. **Scurt si memorabil** - max 2-3 cuvinte
2. **Usor de pronuntat** - evita combinatii dificile
3. **Relevant pentru activitate** - dar nu prea restrictiv
4. **Verifica domeniul web** - denumire.ro disponibil?
5. **Verifica trademark** - OSIM, EUIPO

### Exemple bune:
- TECH SOLUTIONS S.R.L.
- VERDE NATURAL S.R.L.
- GLOBAL TRADING S.R.L.

### Exemple de evitat:
- ABCXYZ12345 S.R.L. (greu de retinut)
- CEA MAI BUNA FIRMA DIN ROMANIA S.R.L. (exagerat)
- MINISTERUL AFACERILOR S.R.L. (interzis)

## Situatii Speciale

### Denumire respinsa?
Motive frecvente:
- Prea similara cu alta existenta
- Contine termeni interzisi
- Insuficient de distincta

**Solutii:**
- Adauga element distinctiv (locatie, domeniu)
- Foloseste varianta alternativa
- Contesta (rar reuseste)

### Schimbarea denumirii dupa inregistrare
- Posibil prin act aditional
- Procedura similara cu infiintarea
- Costuri: ~200 RON

## Concluzie

Denumirea firmei tale este o decizie importanta. Nu te grabi, verifica bine disponibilitatea, si alege ceva care sa te reprezinte pe termen lung. O denumire buna poate contribui semnificativ la succesul afacerii tale.`
          },
          {
            title: 'Actul Constitutiv - Elementele esentiale',
            type: 'TEXT',
            duration: 35,
            order: 2,
            content: `# Actul Constitutiv SRL - Ghid Complet

## Ce este Actul Constitutiv?

Actul constitutiv este "constitutia" societatii tale. Defineste:
- Cine sunt asociatii
- Cum se imparte capitalul
- Cum se iau deciziile
- Cine administreaza
- Ce activitati desfasoara firma

## Elemente Obligatorii

### 1. Datele de identificare ale asociatilor

**Pentru persoane fizice:**
- Nume si prenume complet
- CNP
- Adresa domiciliului
- Serie si numar CI

**Pentru persoane juridice:**
- Denumirea completa
- CUI/CIF
- Sediul social
- Reprezentant legal

### 2. Denumirea si forma juridica
- Denumirea rezervata
- Forma juridica: S.R.L.

### 3. Sediul social
- Adresa completa
- Poate fi schimbat ulterior prin act aditional

### 4. Obiectul de activitate

**Domeniul principal:**
- Un singur cod CAEN (4 cifre)
- Descrie activitatea principala

**Domenii secundare:**
- Oricati coduri CAEN
- Nu necesita desfasurare efectiva
- Utile pentru flexibilitate viitoare

**Exemple coduri CAEN populare:**
- 6201 - Realizare software la comanda
- 6202 - Consultanta informatica
- 7022 - Consultanta pentru afaceri
- 4711 - Comert cu amanuntul
- 5610 - Restaurante

### 5. Capitalul social

- Valoarea totala (minim 1 RON)
- Impartirea pe parti sociale
- Valoarea nominala a unei parti sociale
- Aportul fiecarui asociat

**Exemplu:**
\`\`\`
Capital social: 1.000 RON
Impartit in: 100 parti sociale
Valoare parte sociala: 10 RON

Asociat Ion: 60 parti sociale (60%) = 600 RON
Asociat Maria: 40 parti sociale (40%) = 400 RON
\`\`\`

### 6. Administratorul/Administratorii

- Cine administreaza societatea
- Durata mandatului (determinat/nedeterminat)
- Puteri (limitate/nelimitate)
- Remuneratie (optional)

### 7. Clauze de functionare

**Adunarea Generala a Asociatilor (AGA):**
- Cvorumul necesar pentru decizii
- Majoritatea pentru decizii ordinare
- Majoritatea pentru decizii extraordinare

**Tipuri de decizii:**

| Decizie | Majoritate necesara |
|---------|-------------------|
| Distribuire dividende | Majoritate simpla |
| Modificare act constitutiv | Unanimitate/3/4 |
| Dizolvare | Unanimitate |
| Numire administrator | Majoritate simpla |

### 8. Durata societatii
- Nedeterminata (recomandat)
- Sau pe perioada determinata

### 9. Modul de dizolvare si lichidare
- Clauze standard
- Procedura legala

## Clauze Optionale Importante

### Clauza de preemtiune
- Dreptul asociatilor de a cumpara primii partile sociale vandute

### Clauza de excludere
- Conditiile in care un asociat poate fi exclus

### Clauza de retragere
- Conditiile de retragere voluntara din societate

### Clauze de non-concurenta
- Interzicerea activitatilor concurente de catre asociati

## Semnarea Actului Constitutiv

### Legalizare la notar
**Obligatorie cand:**
- Aport in natura (imobile, autovehicule)
- Asociat persoana juridica
- Anumite activitati reglementate

**Nu e obligatorie cand:**
- Doar aporturi in numerar
- Toti asociatii persoane fizice
- Activitati obisnuite

### Semnatura electronica
- Acceptata pentru inregistrare online
- Toti asociatii trebuie sa semneze

## Greseli Frecvente de Evitat

1. **Coduri CAEN prea restrictive** - Adauga si domenii secundare
2. **Administrator cu puteri limitate excesiv** - Blocheaza operatiunile
3. **Lipsa clauzei de preemtiune** - Partenerul poate vinde oricui
4. **Unanimitate pentru toate deciziile** - Blocaj in caz de conflict
5. **Capital social prea mic** - Fara credibilitate

## Template Simplificat

Vom furniza un template complet in materialele cursului. Structura de baza:

1. Partile contractante
2. Forma, denumirea, sediul
3. Obiectul de activitate
4. Capitalul social si partile sociale
5. Administratorul
6. AGA - organizare si functionare
7. Dispozitii finale

## Concluzie

Actul constitutiv nu este doar un document formal - este fundamentul juridic al afacerii tale. Redacteaza-l cu atentie, gandeste-te la scenarii viitoare, si consulta un specialist daca ai dubii. Un act constitutiv bine facut previne multe probleme pe viitor.`
          },
          {
            title: 'Depunerea Dosarului la ONRC',
            type: 'TEXT',
            duration: 30,
            order: 3,
            content: `# Depunerea Dosarului la ONRC - Procedura Completa

## Pregatirea Dosarului

### Documente necesare - Checklist complet

**Documente principale:**
1. ☐ Cerere de inregistrare (formular tip)
2. ☐ Dovada rezervarii denumirii
3. ☐ Actul constitutiv (original + copie)
4. ☐ Dovada sediului social
5. ☐ Specimen de semnatura administrator
6. ☐ Declaratie pe proprie raspundere administrator

**Documente pentru asociati:**
7. ☐ Copii CI asociati
8. ☐ Cazier fiscal pentru asociati
9. ☐ Dovada varsarii capitalului social

**Documente optionale:**
10. ☐ Autorizatii speciale (daca activitatea le cere)
11. ☐ Contract comodat/inchiriere pentru sediu
12. ☐ Acord asociatie proprietari (daca e cazul)

### Unde obtii documentele?

| Document | Sursa | Timp | Cost |
|----------|-------|------|------|
| Cazier fiscal | ANAF | 1-3 zile | Gratuit |
| Extras CF | ANCPI | 1-5 zile | ~20 RON |
| Specimen semnatura | Notar/ONRC | Imediat | 0-50 RON |
| Certificat cazier judiciar | Politie | 3-10 zile | ~10 RON |

## Metode de Depunere

### 1. La ghiseu ONRC

**Avantaje:**
- Verificare imediata a documentelor
- Posibilitate corectie pe loc
- Confirmare primire instantanee

**Dezavantaje:**
- Deplasare fizica
- Potential cozi
- Program limitat (9-13, L-V)

**Procedura:**
1. Mergi la ONRC din judetul sediului social
2. Ia numar de ordine
3. Prezinta dosarul complet
4. Primeste numar de inregistrare

### 2. Online (portal.onrc.ro)

**Avantaje:**
- De oriunde, oricand
- Fara cozi
- Notificari automate

**Cerinte:**
- Semnatura electronica (token/card)
- Toate documentele in format PDF
- Cont pe portal.onrc.ro

**Procedura:**
1. Acceseaza portal.onrc.ro
2. Autentificare cu certificat digital
3. Completeaza formularul online
4. Incarca documentele
5. Semneaza electronic
6. Plateste online taxa

### 3. Prin posta/curier

**Avantaje:**
- Fara deplasare
- Pentru zone fara ONRC apropiat

**Dezavantaje:**
- Timp mai lung
- Risc pierdere documente
- Nu poti corecta pe loc

## Taxe si Costuri

### Taxe ONRC standard:

| Serviciu | Cost aproximativ |
|----------|-----------------|
| Inregistrare SRL | ~100-150 RON |
| Publicare MO (inclusa) | 0 RON |
| Extras RC | ~20 RON/buc |
| Urgenta (1 zi) | +50% |

### Alte costuri posibile:
- Notar: 100-300 RON
- Avocat (optional): 200-500 RON
- Transport/deplasare: variabil

## Termenul de Solutionare

### Standard:
- 3-5 zile lucratoare

### Urgenta:
- 1 zi lucratoare (taxa suplimentara)

### Ce poate intarzia:
- Documente lipsa
- Erori in acte
- Cerinte suplimentare
- Activitati cu avize speciale

## Ce se Intampla Dupa Depunere

### Pas 1: Analiza dosar
- Registratorul verifica documentele
- Identifica eventuale lipsuri

### Pas 2: Rezolutie
**Pozitiva:** Aproba inregistrarea
**Negativa:** Respinge cu motivatie
**Amanare:** Cere completari

### Pas 3: Eliberare documente
- Certificat de inregistrare (CUI)
- Certificat constatator
- Incheierea de inregistrare

### Pas 4: Notificare ANAF
- Se face automat de ONRC
- Firma primeste CUI fiscal

## Dupa Inregistrare

### Pasi urmatori obligatorii:
1. **Declara beneficiarul real** - Termen 15 zile
2. **Deschide cont bancar** - Cu certificatul
3. **Inregistreaza angajati** (daca e cazul)
4. **Emite prima factura** (optional TVA)

### Pasi recomandati:
1. Comanda stampila (optional dar util)
2. Creeaza adresa email firma
3. Inregistreaza domeniul web
4. Pregateste contabilitatea

## Probleme Frecvente si Solutii

### "Lipsa acord proprietar"
**Solutie:** Obtine acord scris, eventual legalizat

### "Denumire similara cu alta existenta"
**Solutie:** Rezerva alta denumire sau adauga element distinctiv

### "Cazier fiscal lipsa"
**Solutie:** Obtine online de pe ANAF sau de la ghiseu

### "Activitate necesita autorizatie"
**Solutie:** Obtine avizul inainte sau dupa inregistrare (depinde de activitate)

## Concluzie

Depunerea dosarului este pasul final in procesul de infiintare. Cu pregatire atenta si toate documentele in ordine, procesul este simplu si rapid. Verifica de doua ori lista inainte de a merge la ONRC - corectiile ulterioare costa timp si bani.`
          },
          {
            title: 'Obtinerea CUI si primii pasi dupa inregistrare',
            type: 'TEXT',
            duration: 30,
            order: 4,
            content: `# Dupa Inregistrare - Primii Pasi cu Noul SRL

## Certificatul de Inregistrare si CUI

### Ce primesti de la ONRC:

**1. Certificatul de Inregistrare**
- Contine: CUI (Cod Unic de Identificare)
- Numarul de ordine in Registrul Comertului (J12/123/2025)
- Denumirea si sediul firmei
- Capitalul social

**2. Certificatul Constatator**
- Extras din Registrul Comertului
- Detalii complete despre firma
- Utile pentru contracte, banci

**3. Incheierea Judecatorului Delegat**
- Actul juridic de inregistrare
- Necesara pentru anumite proceduri

### Format CUI:
\`\`\`
RO12345678
  ^       ^
  |       |
  |       +-- Numarul propriu-zis
  +---------- Prefix pentru TVA (daca e platitor)
\`\`\`

## Declaratia Beneficiarului Real

### Ce este?
Obligatie legala de declarare a persoanelor care controleaza efectiv societatea.

### Termen:
- **15 zile** de la inregistrare

### Cine se declara:
- Asociatii cu peste 25% din parti sociale
- Sau persoanele cu control efectiv

### Cum se face:
1. Formular tip la ONRC
2. Poate fi online
3. Se actualizeaza la schimbari

### Sanctiuni pentru nedeclarare:
- Amenda 5.000 - 10.000 RON
- Dizolvare (in cazuri extreme)

## Deschiderea Contului Bancar

### Documente necesare:
- Certificat de inregistrare (original)
- Actul constitutiv
- CI administrator
- Specimen de semnatura
- Dovada sediu (unele banci)

### Alegerea bancii - criterii:
| Criteriu | Intrebare |
|----------|-----------|
| Comisioane | Cat costa operatiunile uzuale? |
| Internet banking | E inclus? Cat costa? |
| Card business | Conditii de emitere? |
| Credite | Oferta pentru firme noi? |
| Proximitate | Ai sucursala aproape? |

### Recomandari:
- Compara minim 3 banci
- Verifica pachete pentru start-up
- Citeste termenii cu atentie
- Intreaba despre costuri ascunse

## Inregistrarea in Scopuri de TVA

### Cand devine obligatorie:
- La depasirea plafonului de 300.000 RON/an

### Cand merita optional:
- Lucrezi cu firme mari (platitoare TVA)
- Importi bunuri frecvent
- Activezi in domenii cu TVA recuperabil mare

### Avantaje inregistrare TVA:
- Recuperezi TVA din achizitii
- Credibilitate fata de furnizori
- Acces la contracte publice

### Dezavantaje:
- Contabilitate mai complexa
- Declaratii lunare (D300)
- Cash-flow: colectezi TVA inainte sa o platesti

### Procedura de inregistrare:
1. Cerere la ANAF (formularul 098)
2. Prezentare documente
3. Verificare eventual
4. Eliberare certificat TVA

## Stampila - Inca necesara?

### Legal:
- NU mai este obligatorie din 2016
- Semnatura are aceeasi valoare

### Practic:
- Multi parteneri o cer inca
- Conventie inca uzuala
- Costa 50-150 RON

### Recomandare:
- Comanda una simpla
- Format rotund, cu: denumire + CUI
- Util pentru: banci, institutii, contracte

## Contabilitatea

### Obligatii:
- Contabilitate in partida dubla
- Lunar: declaratii diverse
- Anual: bilant, cont profit/pierdere

### Optiuni:
1. **Contabil angajat** - pentru firme mari
2. **Contabil extern** - cel mai frecvent
3. **Contabilitate online** - SaaS platforms

### Costuri orientative:
- Micro fara activitate: 100-200 RON/luna
- Micro cu activitate: 200-400 RON/luna
- Firma activa: 400-1.000+ RON/luna

## Obligatii Lunare si Anuale

### Lunar:
| Declaratie | Termen | Conditie |
|------------|--------|----------|
| D300 (TVA) | 25 | Platitori TVA |
| D100 (impozite) | 25 | Cu angajati |
| D112 (contributii) | 25 | Cu angajati |
| SAF-T D406 | 25 | Conform calendar |

### Trimestrial:
- D100 (pentru micro fara angajati)
- Impozit micro (1% sau 3%)

### Anual:
- Bilant contabil: 31 mai
- Declaratie impozit profit: 25 martie
- Declaratie beneficiar real: la schimbari

## Sfaturi pentru Prima Luna

**Saptamana 1:**
- Deschide cont bancar
- Declara beneficiarul real
- Gaseste contabil

**Saptamana 2-4:**
- Stabileste procesele de lucru
- Creaza documentele standard (oferte, facturi)
- Comanda stampila (optional)
- Inregistreaza domeniul web

## Greseli de Evitat la Inceput

1. **Amestecul banilor** - Separa strict banii firmei de cei personali
2. **Lipsa documentelor** - Factura pentru ORICE cheltuiala
3. **Intarzieri declaratii** - Termenele sunt stricte
4. **Subdimensionare contabilitate** - Alege un contabil bun de la inceput
5. **Lipsa planificare fiscala** - Discuta strategia cu contabilul

## Concluzie

Primele zile dupa inregistrare sunt cruciale pentru organizarea corecta a firmei. Trateaza serios fiecare pas - o fundatie solida acum previne probleme mari pe viitor. Investeste timp in procese bune de la inceput si vei beneficia pe termen lung.

Felicitari pentru noul tau SRL! Succes in afaceri!`
          }
        ]
      }
    ]
  },

  // EU Funds Course - PNRR & AFIR
  {
    title: 'Ghid Complet Fonduri Europene 2025 - PNRR, AFIR si Oportunitati',
    slug: 'fonduri-europene-pnrr-afir-2025',
    description: `Descopera toate oportunitatile de finantare europeana disponibile pentru afacerea ta!

Acest curs te invata cum sa accesezi fonduri nerambursabile pentru:
• Digitalizare si echipamente IT
• Agricultura si procesare alimentara
• Energie verde si sustenabilitate
• Turism si HoReCa
• Start-up-uri si scale-up-uri

Include ghiduri de aplicare, modele de planuri de afaceri, si studii de caz de succes.`,
    category: 'BUSINESS',
    level: 'INTERMEDIATE',
    duration: 600,
    price: 149,
    isFree: false,
    language: 'ro',
    tags: ['fonduri europene', 'PNRR', 'AFIR', 'finantare', 'granturi', 'digitalizare'],
    modules: [
      {
        title: 'Introducere in Fondurile Europene',
        order: 1,
        duration: 120,
        lessons: [
          {
            title: 'Peisajul fondurilor europene 2021-2027',
            type: 'TEXT',
            duration: 40,
            order: 1,
            content: `# Fondurile Europene 2021-2027 - Privire Generala

## Cadrul Financiar Multianual UE

Uniunea Europeana aloca resurse masive pentru dezvoltarea statelor membre. Romania beneficiaza de aproximativ **80 miliarde EUR** in perioada 2021-2027.

## Principalele Surse de Finantare

### 1. PNRR (Planul National de Redresare si Rezilienta)

**Buget total Romania:** 29,2 miliarde EUR

**Componentele principale:**
- C1: Digitalizare
- C2: Transport
- C3: Energie
- C6: Sanatate
- C7: Turism
- C9: Educatie
- C10: Fonduri locale

**Caracteristici:**
- Finantare 100% nerambursabila
- Termen strict de utilizare: 2026
- Focus pe reforme si investitii

### 2. Programe Operationale 2021-2027

**POR (Programul Operational Regional)**
- Buget: ~8 miliarde EUR
- Focus: IMM-uri, infrastructura locala, turism

**POEO (Programul pentru Energie)**
- Buget: ~1,6 miliarde EUR
- Focus: Energie regenerabila, eficienta energetica

**POT (Programul pentru Transport)**
- Buget: ~5 miliarde EUR
- Focus: Drumuri, cai ferate, porturi

### 3. AFIR (Agricultura)

**PNDR (Programul National de Dezvoltare Rurala)**
- Buget: ~9 miliarde EUR
- Focus: Ferme, procesare, infrastructura rurala

### 4. Programe Directe UE

**Horizon Europe**
- Cercetare si inovare
- Competitie la nivel european

**Digital Europe**
- Competente digitale
- Inteligenta artificiala

## Tipuri de Beneficiari

### IMM-uri (Intreprinderi Mici si Mijlocii)
- Cele mai multe oportunitati
- Finantari de la 5.000 la 2.000.000 EUR
- Conditii: Minim 1 an vechime, situatie financiara ok

### Start-up-uri
- Masuri dedicate (Start-up Nation, etc.)
- Finantari 10.000 - 200.000 EUR
- Conditii specifice per program

### Ferme si Agricultura
- AFIR exclusiv
- Tineri fermieri: conditii speciale
- Procesare: pana la 2.000.000 EUR

### Autoritati Publice
- Proiecte de infrastructura
- Digitalizare administratie
- Energie institutii publice

## Calendar Orientativ 2025

| Program | Perioada Estimata | Focus |
|---------|-------------------|-------|
| PNRR Digitalizare | Q1-Q2 2025 | IMM-uri |
| AFIR sM6.2 | Q2 2025 | Start-up rural |
| POR IMM | Q2-Q3 2025 | Echipamente |
| Energie Verde | Q3 2025 | Panouri solare |

## De Ce Conteaza Pregatirea

**Greseala #1:** Astepti sa se deschida apelul si apoi incepi
**Realitatea:** Castigatorii se pregatesc cu luni inainte

**Ce trebuie pregatit din timp:**
1. Plan de afaceri solid
2. Situatii financiare curate
3. Autorizatii si avize
4. Oferte de pret pentru echipamente
5. Studii de fezabilitate (pentru proiecte mari)

## Concluzie

Fondurile europene reprezinta o oportunitate uriasa, dar necesita pregatire serioasa. In lectiile urmatoare vom detalia fiecare sursa de finantare si te vom ghida pas cu pas prin procesul de aplicare.`
          }
        ]
      }
    ]
  },

  // Tachograph Compliance Course for Transport Companies
  {
    title: 'Conformitate Tahograf Digital - Ghid pentru Transportatori',
    slug: 'tahograf-digital-transport-conformitate',
    description: `Cursul esential pentru companiile de transport care vor sa respecte legislatia tahografului digital!

Acopera toate aspectele legale si practice:
• Regulamentul UE 165/2014 explicat
• Descarcarea si arhivarea datelor
• Controlul timpilor de condus/odihna
• Inspectii si sanctiuni
• Integrarea cu e-Transport ANAF

Perfect pentru: manageri flota, dispeceri, soferi profesionisti.`,
    category: 'LOGISTICS',
    level: 'INTERMEDIATE',
    duration: 360,
    price: 99,
    isFree: false,
    language: 'ro',
    tags: ['tahograf', 'transport', 'flota', 'conformitate', 'soferi', 'legislatie'],
    modules: [
      {
        title: 'Legislatia Tahografului',
        order: 1,
        duration: 90,
        lessons: [
          {
            title: 'Regulamentul UE 165/2014 - Ce trebuie sa stii',
            type: 'TEXT',
            duration: 45,
            order: 1,
            content: `# Regulamentul UE 165/2014 - Ghid Complet

## Introducere

Regulamentul UE 165/2014 stabileste cadrul legal pentru tahografele din transportul rutier. Acest regulament a fost actualizat prin Pachetul Mobilitate (2020) si este obligatoriu in toate statele membre.

## Domeniu de Aplicare

### Vehicule obligate:
- Vehicule > 3,5 tone (transport marfa)
- Vehicule > 9 locuri (transport persoane)

### Exceptii:
- Vehicule de urgenta
- Forte armate
- Transport propriu < 100 km
- Viteza maxima < 40 km/h

## Tipuri de Tahografe

### 1. Tahograf Analogic
- Foile circulare (discuri)
- Permis doar pentru vehicule vechi
- Inca in uz dar in declin

### 2. Tahograf Digital (Generatia 1)
- Card sofer obligatoriu
- Memorie digitala
- Standard din 2006

### 3. Tahograf Inteligent (Generatia 2)
- Obligatoriu pentru vehicule noi din 2019
- Comunicare wireless (DSRC)
- GNSS integrat
- Detectie automata trecere frontiera

### 4. Tahograf Inteligent V2 (din 2023)
- Obligatoriu pentru vehicule noi din august 2023
- Conectivitate imbunatatita
- Inregistrare pozitie la 3 ore

## Cardul de Sofer

### Obtinere:
- ARR (Autoritatea Rutiera Romana)
- Valabilitate: 5 ani
- Cost: ~150 RON

### Obligatii:
- Cardul este personal si netransferabil
- Introducere la inceputul activitatii
- Selectie manuala pentru activitati
- Scoatere la sfarsitul zilei

## Timpii de Condus si Odihna

### Limita zilnica de conducere:
- **9 ore** - standard
- **10 ore** - de max 2 ori/saptamana

### Limita saptamanala:
- **56 ore** maximum
- **90 ore** in 2 saptamani consecutive

### Pauze obligatorii:
- Dupa **4,5 ore** de condus
- Minim **45 minute** (sau 15+30)

### Odihna zilnica:
- **11 ore** neintrerupte (sau 3+9)
- Reducere la **9 ore** de max 3 ori/saptamana

### Odihna saptamanala:
- **45 ore** regulata
- **24 ore** redusa (o data la 2 saptamani)
- Compensare obligatorie pentru odihna redusa

## Obligatii de Descarcare

### Frecventa:
| Date | Frecventa Maxima |
|------|------------------|
| Card sofer | La 28 zile |
| Unitate vehicul | La 90 zile |

### Arhivare:
- Minim **1 an** dupa descarcare
- Format digital securizat
- Disponibil pentru control

## Sanctiuni

### Pentru soferi:
| Incalcare | Amenda |
|-----------|--------|
| Lipsa card | 1.000-2.500 RON |
| Depasire timp condus | 500-2.000 RON |
| Manipulare tahograf | Penal + retragere permis |

### Pentru operatori:
| Incalcare | Amenda |
|-----------|--------|
| Lipsa descarcare | 2.000-8.000 RON |
| Nepastrare date | 4.000-12.000 RON |
| Planificare neconforma | 5.000-15.000 RON |

## Inspectii si Controale

### Cine efectueaza:
- ISCTR (pe drum)
- ARR (la sediu)
- Politia Rutiera

### Ce verifica:
- Cardul de sofer valid
- Timpii din ultimele 28 zile
- Starea tehnica tahograf
- Arhiva companiei

## Integrare cu e-Transport ANAF

### De la 2024:
- Anumite transporturi necesita si cod UIT
- Tahograful nu inlocuieste e-Transport
- Sisteme complementare

## Sfaturi Practice

1. **Descarcati regulat** - Nu asteptati ultimul moment
2. **Instruiti soferii** - Selectia manuala corecta
3. **Software de analiza** - Identificati problemele inainte de control
4. **Calibrare la timp** - La 2 ani sau dupa reparatii
5. **Documentatie completa** - Atesturi, autorizatii, foi de parcurs

## Concluzie

Conformitatea cu legislatia tahografului nu este optionala - sanctiunile sunt severe si pot afecta grav afacerea. Investeste in sisteme de gestionare, instruire si proceduri clare pentru a evita problemele.`
          }
        ]
      }
    ]
  }
];

export default sprint25BusinessCourses;

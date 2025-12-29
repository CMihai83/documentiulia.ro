/**
 * DocumentIulia.ro - Courses Seed Data Part 1
 * Excel/VBA & Project Management Courses
 */

export const excelCourses = [
  {
    title: 'Excel pentru Începători - Fundamente Complete',
    slug: 'excel-pentru-incepatori',
    description: `Învață Microsoft Excel de la zero! Acest curs complet te ghidează prin toate funcționalitățile de bază ale Excel, de la navigare și formatare până la formule esențiale și grafice. Perfect pentru angajați noi, studenți sau oricine dorește să-și îmbunătățească productivitatea cu Excel.

Vei învăța să:
• Navighezi eficient în interfața Excel
• Creezi și formatezi foi de calcul profesionale
• Folosești formule de bază (SUM, AVERAGE, COUNT, IF)
• Creezi grafice și vizualizări de date
• Gestionezi și organizezi datele eficient

Cursul include exerciții practice cu date reale din mediul de business românesc.`,
    category: 'EXCEL_VBA',
    level: 'BEGINNER',
    duration: 480,
    price: null,
    isFree: true,
    language: 'ro',
    tags: ['excel', 'începători', 'formule', 'grafice', 'productivitate'],
    modules: [
      {
        title: 'Introducere în Microsoft Excel',
        order: 1,
        duration: 60,
        lessons: [
          { title: 'Ce este Excel și de ce este esențial', type: 'VIDEO', duration: 15, order: 1, content: `Microsoft Excel este cel mai utilizat software de calcul tabelar din lume, folosit de peste 750 milioane de utilizatori. În mediul de business românesc, Excel este indispensabil pentru:

**Contabilitate și Finanțe:**
- Întocmirea balanțelor și situațiilor financiare
- Calculul TVA și al altor taxe
- Urmărirea fluxului de numerar

**Resurse Umane:**
- Evidența salariilor și a pontajului
- Calculul concediilor și al sporurilor
- Rapoarte de performanță

**Vânzări și Marketing:**
- Analiza vânzărilor pe produse/regiuni
- Forecast și bugetare
- Dashboards pentru management

**Operațiuni:**
- Gestiune stocuri
- Planificare producție
- Urmărire comenzi și livrări

Excel face parte din suita Microsoft 365 și se integrează perfect cu Word, PowerPoint și Outlook.` },
          { title: 'Interfața Excel 2021/365 - Prezentare completă', type: 'VIDEO', duration: 20, order: 2, content: `Interfața Excel este organizată logic pentru a-ți permite acces rapid la toate funcțiile.

**Ribbon (Panglica de comenzi):**
- **Home**: Clipboard, fonturi, aliniere, numere, stiluri, celule, editare
- **Insert**: Tabele, ilustrații, grafice, sparklines, filtre, linkuri
- **Page Layout**: Teme, setări pagină, scalare, opțiuni foaie
- **Formulas**: Biblioteca de funcții, nume definite, audit formule
- **Data**: Import, transformare, sortare, filtrare, validare, grupare
- **Review**: Verificare ortografică, comentarii, protecție, modificări
- **View**: Vizualizări, afișare, zoom, ferestre, macros

**Bara de formule:**
Afișează conținutul celulei active și permite editarea formulelor.

**Zona de lucru:**
Grila de celule organizată în coloane (A, B, C...) și rânduri (1, 2, 3...).

**Bare de scroll:**
Pentru navigare în foi mari de date.

**Tab-uri foi:**
Sheet1, Sheet2... pentru organizarea datelor în foi multiple.

**Bara de stare:**
Afișează informații contextuale și calcule rapide (sumă, medie, număr).` },
          { title: 'Navigare eficientă cu tastatura și mouse', type: 'VIDEO', duration: 15, order: 3, content: `Scurtături esențiale pentru productivitate maximă:

**Navigare de bază:**
- Ctrl + Home: Salt la celula A1
- Ctrl + End: Salt la ultima celulă cu date
- Ctrl + săgeți: Salt la marginea zonei de date
- Page Up/Down: Deplasare cu un ecran

**Selecție:**
- Shift + săgeți: Extinde selecția
- Ctrl + Shift + End: Selectează până la ultima celulă
- Ctrl + A: Selectează tot (sau zona curentă)
- Ctrl + Space: Selectează coloana
- Shift + Space: Selectează rândul

**Editare rapidă:**
- F2: Editează celula activă
- Ctrl + C/X/V: Copiere/Tăiere/Lipire
- Ctrl + Z/Y: Undo/Redo
- Delete: Șterge conținutul
- Ctrl + D: Copiază în jos
- Ctrl + R: Copiază la dreapta

**Formule:**
- F4: Comută referințe absolute/relative
- Tab: Acceptă sugestia autocompletare
- Ctrl + Shift + Enter: Formule array (versiuni vechi)

Practica zilnică a acestor scurtături poate reduce timpul de lucru cu 30-50%!` },
          { title: 'Tipuri de date în Excel', type: 'TEXT', duration: 10, order: 4, content: `Excel recunoaște automat mai multe tipuri de date:

**1. Numere**
- Întregi: 100, -50, 0
- Zecimale: 3.14, 99.99 (folosim punct sau virgulă în funcție de setări)
- Procente: 15% (stocat ca 0.15)
- Valută: 1,500.00 RON

**2. Text (String)**
- Orice conținut care nu este număr sau formulă
- Aliniat implicit la stânga
- Poate conține cifre tratate ca text: '001234

**3. Date și Ore**
- Date: 15.01.2024, 15/01/2024, 15-Jan-2024
- Ore: 14:30, 2:30 PM
- DateTime: 15.01.2024 14:30
- Intern stocat ca număr serial (zile de la 01.01.1900)

**4. Boolean**
- TRUE sau FALSE
- Rezultat al comparațiilor: =A1>10

**5. Erori**
- #VALUE! - tip de date incorect
- #REF! - referință invalidă
- #DIV/0! - împărțire la zero
- #NAME? - nume nerecunoscut
- #N/A - valoare indisponibilă
- #NUM! - număr invalid
- #NULL! - intersecție vidă

**Conversii:**
- =VALUE("123") → 123
- =TEXT(123, "000") → "123"
- =DATEVALUE("15.01.2024") → număr serial` }
        ]
      },
      {
        title: 'Formule de Bază în Excel',
        order: 2,
        duration: 90,
        lessons: [
          { title: 'Operatori aritmetici și ordinea operațiilor', type: 'VIDEO', duration: 20, order: 1, content: `Formulele Excel încep întotdeauna cu semnul = (egal).

**Operatori aritmetici:**
- + (adunare): =A1+B1
- - (scădere): =A1-B1
- * (înmulțire): =A1*B1
- / (împărțire): =A1/B1
- ^ (ridicare la putere): =A1^2
- % (procent): =A1*15%

**Ordinea operațiilor (PEMDAS):**
1. Paranteze ()
2. Exponenți ^
3. Înmulțire și Împărțire * /
4. Adunare și Scădere + -

**Exemple practice:**
- Calcul TVA: =B2*21% sau =B2*0.21
- Preț cu TVA: =B2*(1+21%) sau =B2*1.21
- Discount: =B2*(1-10%) sau =B2*0.9
- Comision: =Vanzari*Rata_comision

**Erori comune:**
- =10+5*2 rezultă 20 (nu 30) - înmulțirea are prioritate
- Pentru 30, folosiți =(10+5)*2
- Împărțirea la zero generează #DIV/0!` },
          { title: 'SUM, AVERAGE, COUNT - Funcțiile esențiale', type: 'VIDEO', duration: 25, order: 2, content: `Cele trei funcții pe care le vei folosi zilnic:

**SUM - Suma valorilor**
=SUM(A1:A100) - adună toate valorile din interval
=SUM(A1:A10, C1:C10) - adună din mai multe intervale
=SUM(A1, B1, 100) - adună valori individuale

Exemplu real - Total facturi pe lună:
=SUM(E2:E50)

**AVERAGE - Media aritmetică**
=AVERAGE(A1:A100) - calculează media
Ignoră celulele goale și textul!

Exemplu real - Salariu mediu departament:
=AVERAGE(Salarii[Brut])

**COUNT/COUNTA/COUNTBLANK**
=COUNT(A1:A100) - numără celulele cu numere
=COUNTA(A1:A100) - numără celulele ne-goale
=COUNTBLANK(A1:A100) - numără celulele goale

Exemplu real - Câți angajați avem:
=COUNTA(A2:A100)

**Combinații utile:**
- Verificare completitudine: =COUNTBLANK(A2:A100) ar trebui să fie 0
- Procentaj completare: =COUNTA(A2:A100)/ROWS(A2:A100)

**Auto-Sum (Alt + =):**
Scurtătura rapidă pentru inserarea funcției SUM cu detectare automată a intervalului.` },
          { title: 'MIN, MAX și funcții statistice', type: 'VIDEO', duration: 20, order: 3, content: `Funcții pentru analiza datelor numerice:

**MIN și MAX**
=MIN(A1:A100) - valoarea minimă
=MAX(A1:A100) - valoarea maximă

Exemple practice:
- Cel mai mic preț: =MIN(Produse[Pret])
- Cea mai mare vânzare: =MAX(Vanzari[Valoare])
- Interval valori: =MAX(A:A)-MIN(A:A)

**LARGE și SMALL - Top N valori**
=LARGE(A1:A100, 1) - cea mai mare valoare (=MAX)
=LARGE(A1:A100, 2) - a doua cea mai mare
=LARGE(A1:A100, 3) - a treia cea mai mare

=SMALL(A1:A100, 1) - cea mai mică valoare (=MIN)

Exemplu - Top 3 vânzări:
=LARGE(Vanzari, 1) → 150,000
=LARGE(Vanzari, 2) → 125,000
=LARGE(Vanzari, 3) → 98,000

**MEDIAN - Valoarea mediană**
=MEDIAN(A1:A100)
Mai reprezentativă decât AVERAGE când ai outliers.

**MODE - Valoarea cea mai frecventă**
=MODE.SNGL(A1:A100) - un singur mod
=MODE.MULT(A1:A100) - toate modurile (array)

**Deviație standard:**
=STDEV.S(A1:A100) - pentru eșantion
=STDEV.P(A1:A100) - pentru populație` },
          { title: 'IF - Logica condițională de bază', type: 'VIDEO', duration: 25, order: 4, content: `IF este cea mai importantă funcție logică în Excel.

**Sintaxa:**
=IF(test_logic, valoare_dacă_adevărat, valoare_dacă_fals)

**Operatori de comparație:**
= (egal), <> (diferit), < (mai mic), > (mai mare)
<= (mai mic sau egal), >= (mai mare sau egal)

**Exemple practice:**

1. Status plată:
=IF(E2>0, "Restanță", "Plătit")

2. Bonus performanță:
=IF(Vanzari>=100000, Salariu*10%, 0)

3. Categorie vârstă:
=IF(Varsta<18, "Minor", "Adult")

4. Verificare TVA:
=IF(Tara="Romania", 21%, 0%)

**IF-uri imbricate:**
=IF(Nota>=9, "Excelent", IF(Nota>=7, "Bine", IF(Nota>=5, "Suficient", "Insuficient")))

**Alternative moderne (Excel 365):**
=IFS(Nota>=9, "Excelent", Nota>=7, "Bine", Nota>=5, "Suficient", TRUE, "Insuficient")

**Combinație cu AND/OR:**
=IF(AND(Vanzari>=100000, Vechime>=2), "Bonus", "Fără bonus")
=IF(OR(Status="VIP", Achizitii>50000), "Prioritar", "Standard")

**Erori comune:**
- Uiți al treilea argument → returnează FALSE
- Compari text fără ghilimele → eroare #NAME?
- Logică inversată → rezultate greșite` }
        ]
      },
      {
        title: 'Formatare și Prezentare Date',
        order: 3,
        duration: 75,
        lessons: [
          { title: 'Formatare celule - Fonturi, culori, borduri', type: 'VIDEO', duration: 20, order: 1, content: `Formatarea profesională face datele mai ușor de citit și înțeles.

**Fonturi (Home > Font):**
- Familie font: Calibri (implicit), Arial pentru print
- Dimensiune: 11pt standard, 14-18pt pentru titluri
- Stil: Bold (Ctrl+B), Italic (Ctrl+I), Underline (Ctrl+U)
- Culoare font: Albastru închis pentru titluri, negru pentru date

**Culori celule:**
- Albastru deschis pentru header-e
- Galben pentru celule de input
- Verde pentru rezultate pozitive
- Roșu pentru valori negative sau atenționări
- Gri pentru rânduri alternate (ușurează citirea)

**Borduri:**
- Borduri complete pentru tabele de date
- Bordură groasă sub header
- Borduri laterale pentru separare secțiuni
- Evitați bordurile excesive - keep it clean

**Aliniere (Home > Alignment):**
- Text: aliniat stânga
- Numere: aliniat dreapta
- Titluri: centrat
- Wrap Text pentru celule cu text lung
- Merge & Center pentru titluri pe mai multe coloane

**Format Painter (Ctrl+Shift+C / Ctrl+Shift+V):**
Copiază formatarea de la o celulă la alta.
Dublu-click pe Format Painter pentru aplicare multiplă.` },
          { title: 'Formatare condiționată - Evidențiere automată', type: 'VIDEO', duration: 25, order: 2, content: `Formatarea condiționată aplică automat stiluri bazate pe valori.

**Accesare:** Home > Conditional Formatting

**Reguli predefinite:**

1. **Highlight Cells Rules:**
   - Greater Than: evidențiază vânzări > 100,000
   - Less Than: evidențiază stocuri < minim
   - Between: valori în interval
   - Equal To: status = "Urgent"
   - Text Contains: produse cu "Premium"
   - Duplicate Values: găsește duplicate

2. **Top/Bottom Rules:**
   - Top 10 Items: cele mai mari 10 vânzări
   - Top 10%: cei mai buni 10% performeri
   - Bottom 10: cele mai mici valori
   - Above/Below Average: comparație cu media

3. **Data Bars:**
   Bare orizontale proporționale cu valoarea.
   Excelent pentru comparații vizuale rapide.

4. **Color Scales:**
   Gradient de culoare (roșu-galben-verde).
   Perfect pentru heatmaps și matrici.

5. **Icon Sets:**
   Săgeți, semafoare, steluțe, etc.
   Util pentru KPI dashboards.

**Reguli personalizate:**
- New Rule > Use a formula
- =A1>AVERAGE($A:$A) evidențiază peste medie
- =MOD(ROW(),2)=0 colorează rânduri pare
- =$E1="Restanță" colorează întregul rând

**Gestionare reguli:**
Conditional Formatting > Manage Rules
Ordinea regulilor contează - prima potrivire se aplică.` },
          { title: 'Formate de numere personalizate', type: 'VIDEO', duration: 15, order: 3, content: `Formatele personalizate controlează cum sunt afișate valorile.

**Accesare:** Ctrl+1 > Number > Custom

**Structura codului de format:**
Pozitiv;Negativ;Zero;Text

**Coduri uzuale:**
- 0 - cifră obligatorie
- # - cifră opțională
- . sau , - separator zecimal/mii
- % - procent (înmulțește cu 100)

**Exemple practice:**

**Valută românească:**
#,##0.00 " RON" → 1,234.56 RON
#,##0 " lei" → 1,235 lei

**Telefoane:**
0###-###-### → 0721-234-567

**CUI:**
"RO"00000000 → RO12345678

**Procente:**
0.00% → 12.34%
0% → 12%

**Date:**
DD.MM.YYYY → 15.01.2024
DD-MMM-YY → 15-Ian-24
DDDD, D MMMM YYYY → Luni, 15 Ianuarie 2024

**Condiții în format:**
[Red][<0]#,##0;[Green]#,##0 → roșu negativ, verde pozitiv
[>=1000000]#,,"M";[>=1000]#,"K";# → 1.5M, 250K, 500

**Ascundere valori:**
;;; → ascunde tot
0;-0;; → ascunde zero` },
          { title: 'Pregătire pentru imprimare', type: 'VIDEO', duration: 15, order: 4, content: `Setări esențiale pentru documente tipărite profesional.

**Page Layout > Page Setup:**

**Orientare:**
- Portrait pentru liste și rapoarte text
- Landscape pentru tabele late

**Dimensiune hârtie:**
- A4 (standard în România/EU)
- Letter (dacă trimiteți în US)

**Margini:**
- Normal: 2.5 cm pe toate laturile
- Narrow: 1.27 cm pentru mai multe date
- Custom pentru nevoi specifice

**Scalare:**
- Fit Sheet on One Page: comprimă tot pe o pagină
- Fit All Columns on One Page: coloanele pe o pagină, rândurile pe mai multe
- Adjust to: % din dimensiunea normală

**Header și Footer:**
- Insert > Header & Footer
- &[Page] / &[Pages] pentru "Pagina 1 din 5"
- &[Date] pentru data curentă
- Numele companiei, logo, confidențialitate

**Print Area:**
- Selectați zona de imprimat
- Page Layout > Print Area > Set Print Area

**Print Titles:**
- Rânduri de repetat sus: $1:$2 (header pe fiecare pagină)
- Coloane de repetat stânga: $A:$A

**Page Breaks:**
- View > Page Break Preview
- Trageți liniile albastre pentru ajustare
- Insert > Page Break pentru break manual

**Print Preview (Ctrl+P):**
Verificați ÎNTOTDEAUNA înainte de imprimare!` }
        ]
      },
      {
        title: 'Grafice și Vizualizări',
        order: 4,
        duration: 90,
        lessons: [
          { title: 'Tipuri de grafice și când să le folosești', type: 'VIDEO', duration: 20, order: 1, content: `Alegerea corectă a graficului este esențială pentru comunicarea eficientă.

**Column/Bar Chart (Bare):**
- Comparații între categorii
- Evoluție în timp (perioade discrete)
- Exemplu: Vânzări pe regiuni, Buget vs Realizat

**Line Chart (Linii):**
- Tendințe în timp
- Date continue
- Exemplu: Evoluția vânzărilor lunare, Prețul acțiunilor

**Pie Chart (Plăcintă):**
- Părți dintr-un întreg
- Max 5-7 categorii
- Exemplu: Structura costurilor, Cota de piață
- ATENȚIE: Evitați pentru comparații precise!

**Area Chart (Arii):**
- Tendințe cumulate
- Comparații proporționale în timp
- Exemplu: Venituri pe categorii de produse

**Scatter Plot (Dispersie):**
- Relația între două variabile
- Identificare corelații
- Exemplu: Preț vs Cantitate vândută

**Combo Chart (Combinat):**
- Două tipuri de date diferite
- Scale diferite (axă secundară)
- Exemplu: Vânzări (bare) și Marjă % (linie)

**Waterfall Chart (Cascadă):**
- Explicarea variațiilor
- De la valoare inițială la finală
- Exemplu: Reconciliere profit

**Sparklines (Mini-grafice):**
- Tendințe în celule
- Vizualizare compactă
- Exemplu: Tendință vânzări în tabel` },
          { title: 'Creare și personalizare grafice', type: 'VIDEO', duration: 25, order: 2, content: `Pași pentru grafice profesionale:

**1. Pregătirea datelor:**
- Date organizate în tabel
- Prima coloană: categorii/etichete
- Header-e clare pentru serii
- Fără rânduri/coloane goale

**2. Creare grafic:**
- Selectați datele (inclusiv header-e)
- Insert > Charts > selectați tipul
- Sau: Alt + F1 pentru grafic rapid

**3. Elemente grafic (Chart Elements +):**
- Chart Title: titlu descriptiv și concis
- Axis Titles: unități de măsură
- Legend: poziție care nu acoperă datele
- Data Labels: valori pe bare/puncte
- Gridlines: ajută citirea, nu exagerați
- Trendline: tendință și ecuație

**4. Personalizare design:**
- Chart Styles: scheme predefinite
- Change Colors: paletă consistentă
- Format Selection: personalizare individuală

**5. Formatare specifică:**
- Dublu-click pe element pentru Format Pane
- Culori: consistente cu brandul
- Fonturi: lizibile (min 10pt)
- Axe: interval relevant, fără zero dacă nu e necesar

**Best Practices:**
- Titlu informativ, nu generic
- Elimină clutter-ul (gridlines excesive, borduri)
- Ordine logică (cronologică sau descrescătoare)
- Consistență între grafice multiple
- Accesibilitate: contrast suficient` },
          { title: 'Dashboard simplu cu grafice multiple', type: 'EXERCISE', duration: 30, order: 3, content: `Creați un dashboard de vânzări cu următoarele:

**Date de bază (Sheet "Date"):**
- Vânzări lunare pe 12 luni
- 4 regiuni: Nord, Sud, Est, Vest
- 3 categorii produse: Electronice, Mobilă, Textile

**Dashboard (Sheet "Dashboard"):**

1. **KPI Cards (celule formatate):**
   - Total vânzări YTD
   - Creștere vs anul trecut %
   - Cea mai bună regiune
   - Produs campion

2. **Grafic bare - Vânzări pe regiuni:**
   - Bare orizontale
   - Ordonat descrescător
   - Data labels cu valori

3. **Grafic linii - Evoluție lunară:**
   - O linie per regiune
   - Axă X: lunile
   - Legendă jos

4. **Pie chart - Mix produse:**
   - 3 felii pentru categorii
   - Procente ca data labels
   - Legendă integrată

5. **Tabel Top 5 luni:**
   - Formatare condiționată
   - Bara de date pentru vizualizare

**Sfaturi:**
- Folosiți Named Ranges pentru date
- Graficele să se actualizeze automat
- Culori consistente peste tot
- Print pe o singură pagină A4 landscape` },
          { title: 'Quiz Modul 4', type: 'QUIZ', duration: 15, order: 4, content: `Verifică-ți cunoștințele despre grafice:

**1. Ce tip de grafic e potrivit pentru evoluția vânzărilor lunare pe 2 ani?**
a) Pie chart
b) Line chart ✓
c) Scatter plot
d) Treemap

**2. Câte categorii maxim sunt recomandate pentru un pie chart?**
a) 3
b) 5-7 ✓
c) 10
d) Nelimitat

**3. Când folosești o axă secundară (secondary axis)?**
a) Pentru date negative
b) Pentru valori cu unități diferite sau scale foarte diferite ✓
c) Pentru mai mult de 5 serii de date
d) Niciodată

**4. Ce element adaugi pentru a arăta tendința într-un grafic?**
a) Gridlines
b) Data labels
c) Trendline ✓
d) Legend

**5. Sparklines sunt:**
a) Grafice animate
b) Mini-grafice în celule ✓
c) Efecte speciale
d) Tipuri de formatare

**6. Pentru comparația Buget vs Realizat pe departamente, folosești:**
a) Pie chart
b) Line chart
c) Clustered column/bar chart ✓
d) Area chart

**7. Format Painter copiază:**
a) Doar valorile
b) Doar formatarea ✓
c) Valori și formatare
d) Formule

**8. Print Titles permite:**
a) Titlul documentului
b) Repetarea rândurilor header pe fiecare pagină ✓
c) Numerotarea paginilor
d) Watermark

Scor minim pentru promovare: 6/8 (75%)` }
        ]
      }
    ]
  },
  {
    title: 'Excel Intermediar - Funcții Avansate și Pivot Tables',
    slug: 'excel-intermediar',
    description: `Treci la nivelul următor cu Excel! Acest curs acoperă funcțiile avansate de căutare (VLOOKUP, INDEX-MATCH, XLOOKUP), Pivot Tables pentru analiză rapidă, validare date și tehnici de analiză ce-ar-fi-dacă.

Vei învăța să:
• Folosești VLOOKUP și alternative moderne (INDEX-MATCH, XLOOKUP)
• Creezi și manipulezi Pivot Tables și Pivot Charts
• Implementezi validare date pentru formulare
• Faci analize What-If cu Goal Seek și Data Tables
• Protejezi foile și workbook-urile

Cerință: Cunoștințe de bază Excel (sau cursul pentru începători).`,
    category: 'EXCEL_VBA',
    level: 'INTERMEDIATE',
    duration: 600,
    price: 49,
    isFree: false,
    language: 'ro',
    tags: ['excel', 'vlookup', 'pivot', 'validare', 'intermediar'],
    modules: [
      {
        title: 'Funcții de Căutare',
        order: 1,
        duration: 120,
        lessons: [
          { title: 'VLOOKUP - Caută valori în tabele', type: 'VIDEO', duration: 30, order: 1, content: `VLOOKUP (Vertical Lookup) caută o valoare în prima coloană și returnează o valoare din aceeași linie.

**Sintaxa:**
=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])

**Parametri:**
- lookup_value: ce cauți (ex: cod produs, CNP)
- table_array: tabelul unde cauți
- col_index_num: a câta coloană returnezi (1, 2, 3...)
- range_lookup: TRUE/1=potrivire aproximativă, FALSE/0=potrivire exactă

**Exemplu practic - Preluare preț produs:**
Ai un tabel de prețuri (A2:C100) cu Cod, Denumire, Preț.
Pentru a găsi prețul produsului "ABC123":
=VLOOKUP("ABC123", A2:C100, 3, FALSE)

**Exemplu - Calcul salariu pe funcție:**
=VLOOKUP(B2, TabelSalarii, 2, FALSE) * OreLucrate

**Potrivire aproximativă (TRUE):**
Folosită pentru intervale: tranșe impozit, comisioane pe volume.
IMPORTANT: Tabelul TREBUIE sortat crescător!

=VLOOKUP(Vanzari, TabelComisioane, 2, TRUE)
| Prag      | Comision |
|-----------|----------|
| 0         | 5%       |
| 50000     | 7%       |
| 100000    | 10%      |

**Limitări VLOOKUP:**
- Caută doar în prima coloană (stânga)
- Nu poate căuta la stânga
- Lent pe seturi mari de date
- Col_index_num se strică la inserare coloane

**Soluție:** INDEX-MATCH (următoarea lecție)` },
          { title: 'INDEX-MATCH - Alternativa flexibilă', type: 'VIDEO', duration: 35, order: 2, content: `INDEX-MATCH este combinația preferată de profesioniști pentru căutări.

**MATCH - Găsește poziția:**
=MATCH(lookup_value, lookup_array, [match_type])
Returnează poziția (numărul rândului/coloanei) unde s-a găsit valoarea.

match_type: 0=exact, 1=mai mic sau egal, -1=mai mare sau egal

**INDEX - Returnează valoarea de la poziție:**
=INDEX(array, row_num, [col_num])
Returnează valoarea de la intersecția rând/coloană specificată.

**Combinație INDEX-MATCH:**
=INDEX(coloana_rezultat, MATCH(valoare_căutată, coloana_căutare, 0))

**Exemplu - Căutare preț:**
=INDEX(C2:C100, MATCH("ABC123", A2:A100, 0))

**Avantaje față de VLOOKUP:**
1. Poate căuta la stânga
2. Mai rapid pe date mari
3. Nu se strică la inserare coloane
4. Poate căuta după mai multe criterii

**Căutare la stânga (imposibil cu VLOOKUP):**
Tabel: | Preț | Cod | Denumire |
=INDEX(A2:A100, MATCH("ABC123", B2:B100, 0))

**Căutare 2D (rând și coloană):**
=INDEX(DateVanzari, MATCH(Produs, Produse, 0), MATCH(Luna, Luni, 0))

**Cu multiple criterii:**
=INDEX(Valoare, MATCH(1, (Produs=B2)*(Luna=C2), 0))
Sau:
=INDEX(Valoare, MATCH(B2&C2, Produs&Luna, 0))` },
          { title: 'XLOOKUP - Funcția modernă (Excel 365)', type: 'VIDEO', duration: 25, order: 3, content: `XLOOKUP este disponibil în Excel 365 și Excel 2021, combinând ce e mai bun din VLOOKUP și INDEX-MATCH.

**Sintaxa:**
=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])

**Parametri:**
- lookup_value: valoarea căutată
- lookup_array: unde caută
- return_array: de unde returnează
- if_not_found: ce returnează dacă nu găsește (optional)
- match_mode: 0=exact, -1=mai mic, 1=mai mare, 2=wildcard
- search_mode: 1=primul-ultimul, -1=ultimul-primul, 2=binar crescător, -2=binar descrescător

**Exemplu simplu:**
=XLOOKUP("ABC123", CodProduse, Preturi)

**Cu valoare default pentru negăsit:**
=XLOOKUP(B2, CodProduse, Preturi, "Produs inexistent")

**Căutare la stânga (natural):**
=XLOOKUP("Laptop", Denumiri, Coduri)

**Returnare multiple coloane:**
=XLOOKUP(B2, CodAngajat, Nume:Salariu)
Returnează toate coloanele de la Nume la Salariu!

**Căutare aproximativă (intervale):**
=XLOOKUP(Vanzari, PraguriComision, RateComision,, -1)
-1 = găsește cea mai mare valoare mai mică sau egală

**Căutare de la sfârșit:**
=XLOOKUP(Client, ListaClienti, DataUltimaComanda,,, -1)
Găsește ultima apariție a clientului.

**XLOOKUP vs VLOOKUP vs INDEX-MATCH:**
| Criteriu | VLOOKUP | INDEX-MATCH | XLOOKUP |
|----------|---------|-------------|---------|
| Căutare stânga | Nu | Da | Da |
| Valoare default | Nu | Complicat | Da |
| Sintaxă | Medie | Complexă | Simplă |
| Performanță | Lent | Rapid | Rapid |
| Compatibilitate | Toate | Toate | 365/2021 |` },
          { title: 'Exercițiu practic - Sistem de facturare', type: 'EXERCISE', duration: 30, order: 4, content: `Construiește un sistem simplu de facturare folosind funcții de căutare.

**Structura necesară:**

**Sheet "Produse" (baza de date):**
| Cod | Denumire | Unitate | Preț fără TVA | Stoc |
|-----|----------|---------|---------------|------|
| P001 | Laptop Dell | buc | 3500 | 25 |
| P002 | Monitor 27" | buc | 1200 | 40 |
| P003 | Tastatură | buc | 150 | 100 |
| P004 | Mouse wireless | buc | 80 | 150 |
| P005 | Cablu HDMI 2m | buc | 35 | 200 |

**Sheet "Clienți":**
| CUI | Denumire | Adresă | Email |
|-----|----------|--------|-------|
| RO12345678 | Tech SRL | Str. Exemplu 1 | contact@tech.ro |

**Sheet "Factură":**
Celule de input:
- B2: Selectare client (dropdown CUI)
- B3: Data facturii
- B5: Nr. factură (auto-generat)

Date client (populate automat):
- D2: =XLOOKUP(B2, Clienti[CUI], Clienti[Denumire], "Selectați client")
- D3: =XLOOKUP(B2, Clienti[CUI], Clienti[Adresa])

Linii factură:
| Cod | Denumire | UM | Cantitate | Preț | Valoare |
|-----|----------|----|-----------|------|---------|
| [dropdown] | [XLOOKUP] | [XLOOKUP] | [input] | [XLOOKUP] | [calcul] |

**Formule pentru linia 10:**
- B10: dropdown din Produse[Cod]
- C10: =XLOOKUP(B10, Produse[Cod], Produse[Denumire], "")
- D10: =XLOOKUP(B10, Produse[Cod], Produse[Unitate], "")
- E10: input utilizator
- F10: =XLOOKUP(B10, Produse[Cod], Produse[Preț], 0)
- G10: =IF(B10="", "", E10*F10)

**Totaluri:**
- Subtotal: =SUM(G10:G20)
- TVA 21%: =Subtotal*21%
- TOTAL: =Subtotal+TVA

**Bonus - Verificare stoc:**
=IF(E10>XLOOKUP(B10, Produse[Cod], Produse[Stoc], 0), "STOC INSUFICIENT!", "OK")` }
        ]
      },
      {
        title: 'Pivot Tables',
        order: 2,
        duration: 150,
        lessons: [
          { title: 'Introducere în Pivot Tables', type: 'VIDEO', duration: 30, order: 1, content: `Pivot Tables sunt cel mai puternic instrument de analiză în Excel.

**Ce este un Pivot Table?**
Un tabel interactiv care sumarizează, analizează și prezintă date din surse mari, permițând reorganizarea dinamică.

**Când folosești Pivot Tables:**
- Ai sute/mii de rânduri de date
- Vrei să vezi totaluri pe categorii
- Trebuie să compari perioade
- Faci rapoarte recurente
- Explorezi datele pentru insights

**Crearea unui Pivot Table:**
1. Selectează datele sursă (inclusiv header-e)
2. Insert > PivotTable
3. Alege locația (foaie nouă sau existentă)
4. OK

**Interfața Pivot Table:**
- PivotTable Fields panel (dreapta)
- Zones: Filters, Columns, Rows, Values
- Drag & drop câmpuri între zone

**Componentele:**
- **Rows**: Ce apare pe rânduri (ex: Regiune, Produs)
- **Columns**: Ce apare pe coloane (ex: Luna, An)
- **Values**: Ce se calculează (ex: Sum of Vânzări)
- **Filters**: Filtrare globală (ex: doar 2024)

**Exemplu rapid:**
Date: | Data | Regiune | Produs | Vânzări |
Pivot:
- Rows: Regiune
- Columns: (lunar din Data)
- Values: Sum of Vânzări

Rezultat: Tabel cu regiuni pe rânduri, luni pe coloane, totaluri vânzări în celule.

**Avantaje:**
- Sumarizare instantă fără formule
- Restructurare cu drag & drop
- Drill-down în detalii
- Grupare automată date/numere` },
          { title: 'Câmpuri, valori și calcule în Pivot', type: 'VIDEO', duration: 35, order: 2, content: `Configurarea avansată a câmpurilor Pivot Table.

**Value Field Settings:**
Click dreapta pe un câmp din Values > Value Field Settings

**Funcții de sumarizare:**
- Sum: total (default pentru numere)
- Count: număr de înregistrări
- Average: medie
- Max/Min: valori extreme
- Product: produs
- StdDev/Var: statistici

**Show Values As:**
- % of Grand Total: procent din totalul general
- % of Column Total: procent din coloană
- % of Row Total: procent din rând
- % of Parent Row/Column: procent din subtotal părinte
- Difference From: diferență față de referință
- % Difference From: diferență procentuală
- Running Total: total cumulat
- Rank: clasament

**Exemplu - Analiză vânzări:**
Câmp Vânzări adăugat de 2 ori în Values:
1. Sum of Vânzări (valoare absolută)
2. Vânzări ca % of Column Total (cotă de piață)

**Câmpuri calculate:**
PivotTable Analyze > Fields, Items & Sets > Calculated Field

Exemplu - Marjă:
=Vânzări - Costuri

Exemplu - Preț mediu:
=Vânzări / Cantitate

**Gruparea datelor:**
- Date: click dreapta > Group > Luni/Trimestre/Ani
- Numere: click dreapta > Group > interval (ex: 0-1000, 1000-5000)

**Sortare:**
- A-Z sau Z-A pe rânduri
- Sortare după valori (cele mai mari vânzări sus)
- Custom sort order

**Filtrare în Pivot:**
- Report Filter: filtru global
- Row/Column Labels dropdown
- Slicers (vizuale, interactive)
- Timeline (pentru date)` },
          { title: 'Slicers și Timeline pentru filtrare vizuală', type: 'VIDEO', duration: 25, order: 3, content: `Slicers și Timeline fac Pivot Tables interactive și user-friendly.

**Slicers:**
Butoane vizuale pentru filtrare rapidă.

**Creare Slicer:**
1. Click pe Pivot Table
2. PivotTable Analyze > Insert Slicer
3. Selectează câmpurile dorite
4. OK

**Formatare Slicer:**
- Slicer tab > Slicer Styles
- Columns: câte butoane pe linie
- Height/Width: dimensiune
- Settings: header, sortare

**Multi-select:**
- Ctrl + click: selectează multiple
- Buton Multi-Select (colț dreapta sus)

**Clear Filter:**
- Buton cu X sau Alt + C

**Conectare la multiple Pivot Tables:**
1. Click dreapta pe Slicer
2. Report Connections
3. Bifează toate Pivot Tables relevante

**Timeline (pentru date):**
PivotTable Analyze > Insert Timeline

Permite filtrare vizuală pe:
- Zile
- Luni
- Trimestre
- Ani

**Scroll și zoom:**
- Drag pentru selectare interval
- Zoom pentru granularitate

**Dashboard cu Slicers:**
Aranjează Pivot Tables și grafice pe o foaie, adaugă Slicers conectate la toate.

Utilizatorul poate:
- Filtra după regiune
- Selecta perioada
- Vedea toate vizualizările actualizate simultan

**Best practices:**
- Slicers clare și vizibile
- Culori consistente
- Nu prea multe (max 4-5)
- Poziționare logică (sus sau lateral)
- Titluri descriptive` },
          { title: 'Pivot Charts - Vizualizări dinamice', type: 'VIDEO', duration: 30, order: 4, content: `Pivot Charts sunt grafice conectate la Pivot Tables, actualizându-se automat.

**Creare Pivot Chart:**
1. Click pe Pivot Table
2. PivotTable Analyze > PivotChart
3. Selectează tipul de grafic
4. OK

**Sau direct:**
Insert > PivotChart > PivotChart & PivotTable

**Tipuri recomandate:**
- Column/Bar: comparații categorii
- Line: tendințe în timp
- Pie: părți dintr-un întreg (max 5-7)
- Combo: valori și procente

**Interactivitate:**
- Field Buttons pe grafic pentru filtrare
- Se actualizează cu Pivot Table
- Slicers afectează și graficul

**Ascundere Field Buttons:**
PivotChart Analyze > Field Buttons > Hide All

**Formatare:**
- Identică cu graficele normale
- Chart Styles pentru look rapid
- Format individual elements

**Pivot Chart Dashboard:**
1. Creează Pivot Table cu datele
2. Adaugă Pivot Chart
3. Copiază și modifică pentru alt view
4. Adaugă Slicers conectate la toate
5. Aranjează pe foaie "Dashboard"
6. Ascunde Pivot Tables (sau pune pe altă foaie)

**Exemplu Dashboard Vânzări:**
- Pivot Table ascuns pe Sheet "Data"
- Chart 1: Column - Vânzări pe regiuni
- Chart 2: Line - Evoluție lunară
- Chart 3: Pie - Mix produse
- Slicers: An, Trimestru, Regiune

**Export/Partajare:**
- Copy > Paste Special > Picture pentru prezentări
- Print direct
- PDF pentru distribuire` },
          { title: 'Exercițiu - Raport vânzări complet', type: 'EXERCISE', duration: 30, order: 5, content: `Creează un raport complet de vânzări folosind Pivot Tables.

**Date sursă (minim 500 rânduri):**
| Data | Regiune | Oraș | Categorie | Produs | Cantitate | Preț | Vânzări | Cost |

Regiuni: Nord, Sud, Est, Vest, Centru
Categorii: Electronice, Mobilă, Textile, Alimente
Perioada: Jan 2023 - Dec 2024

**Rapoarte de creat:**

**1. Pivot Table - Vânzări pe regiuni și categorii**
- Rows: Regiune
- Columns: Categorie
- Values: Sum of Vânzări
- Adaugă: % of Grand Total

**2. Pivot Table - Evoluție lunară**
- Rows: Data (grupată pe Luni și Ani)
- Values: Sum of Vânzări
- Adaugă: Running Total

**3. Pivot Table - Top 10 produse**
- Rows: Produs
- Values: Sum of Vânzări, Sum of Cantitate
- Filtrare: Top 10 by Sum of Vânzări

**4. Pivot Table - Analiză profitabilitate**
- Rows: Categorie, Produs
- Values: Vânzări, Cost
- Calculated Field: Profit = Vânzări - Cost
- Calculated Field: Marjă % = Profit / Vânzări

**Dashboard final:**
- Toate 4 Pivot Tables pe foi separate
- Foaie "Dashboard" cu:
  - 4 Pivot Charts
  - Slicers: An, Regiune, Categorie
  - KPI boxes: Total Vânzări, Total Profit, Marjă %

**Criterii evaluare:**
- Pivot Tables funcționale: 25%
- Calcule corecte: 25%
- Pivot Charts clare: 25%
- Dashboard interactiv: 25%` }
        ]
      }
    ]
  },
  {
    title: 'Excel Avansat - Power Query și Automatizare',
    slug: 'excel-avansat-power-query',
    description: `Devino expert Excel cu Power Query, Power Pivot și funcții array moderne! Acest curs avansat te învață să automatizezi procesarea datelor, să construiești modele de date complexe și să folosești funcțiile dinamice din Excel 365.

Vei învăța să:
• Importezi și transformi date din multiple surse cu Power Query
• Construiești modele de date relaționale cu Power Pivot
• Folosești funcții array dinamice (FILTER, SORT, UNIQUE, XLOOKUP)
• Creezi funcții personalizate cu LAMBDA
• Automatizezi rapoarte recurente

Cerință: Excel Intermediar sau experiență echivalentă.`,
    category: 'EXCEL_VBA',
    level: 'ADVANCED',
    duration: 720,
    price: 99,
    isFree: false,
    language: 'ro',
    tags: ['excel', 'power query', 'power pivot', 'array', 'automatizare'],
    modules: [
      {
        title: 'Power Query - Transformare Date',
        order: 1,
        duration: 180,
        lessons: [
          { title: 'Introducere Power Query', type: 'VIDEO', duration: 30, order: 1, content: 'Power Query este motorul ETL (Extract, Transform, Load) integrat în Excel, permițând importul și transformarea datelor din aproape orice sursă.' },
          { title: 'Conectare la surse de date', type: 'VIDEO', duration: 35, order: 2, content: 'Conectare la fișiere (CSV, Excel, JSON, XML), baze de date (SQL Server, Oracle, MySQL), servicii web (APIs, SharePoint), și altele.' },
          { title: 'Transformări esențiale', type: 'VIDEO', duration: 40, order: 3, content: 'Filtrare, sortare, pivot/unpivot, merge, append, split columns, replace values, change types, remove duplicates.' },
          { title: 'Funcții M avansate', type: 'VIDEO', duration: 35, order: 4, content: 'Limbajul M pentru transformări custom: Text.Combine, List.Transform, Table.AddColumn cu funcții.' },
          { title: 'Exercițiu - Pipeline date automat', type: 'EXERCISE', duration: 40, order: 5, content: 'Construiește un pipeline care importă date din 3 surse, le curăță și le combină automat.' }
        ]
      },
      {
        title: 'Power Pivot și Modele de Date',
        order: 2,
        duration: 150,
        lessons: [
          { title: 'Ce este Power Pivot', type: 'VIDEO', duration: 25, order: 1, content: 'Power Pivot permite modele de date relaționale în Excel, cu milioane de rânduri și calcule DAX.' },
          { title: 'Relații între tabele', type: 'VIDEO', duration: 30, order: 2, content: 'Crearea și gestionarea relațiilor one-to-many, many-to-many, și bidirecționale.' },
          { title: 'Introducere în DAX', type: 'VIDEO', duration: 35, order: 3, content: 'Data Analysis Expressions: CALCULATE, FILTER, ALL, RELATED, SUMX, AVERAGEX.' },
          { title: 'Măsuri calculate', type: 'VIDEO', duration: 30, order: 4, content: 'Crearea măsurilor pentru KPIs: YTD, QTD, Previous Period, Growth %, Running Total.' },
          { title: 'Exercițiu - Model vânzări complet', type: 'EXERCISE', duration: 30, order: 5, content: 'Construiește un model cu tabele Fact și Dimension, relații și măsuri DAX.' }
        ]
      },
      {
        title: 'Funcții Array Dinamice (Excel 365)',
        order: 3,
        duration: 120,
        lessons: [
          { title: 'FILTER - Filtrare dinamică', type: 'VIDEO', duration: 25, order: 1, content: 'FILTER returnează rânduri care îndeplinesc criterii, fără formule helper.' },
          { title: 'SORT și SORTBY', type: 'VIDEO', duration: 20, order: 2, content: 'Sortare dinamică după una sau mai multe coloane, crescător sau descrescător.' },
          { title: 'UNIQUE și combinații', type: 'VIDEO', duration: 25, order: 3, content: 'Extrage valori unice, combină cu FILTER și SORT pentru liste dinamice.' },
          { title: 'LET și LAMBDA', type: 'VIDEO', duration: 30, order: 4, content: 'LET pentru variabile în formule, LAMBDA pentru funcții personalizate reutilizabile.' },
          { title: 'Exercițiu - Raport dinamic', type: 'EXERCISE', duration: 20, order: 5, content: 'Creează un raport care se actualizează automat cu funcții array.' }
        ]
      }
    ]
  },
  {
    title: 'VBA pentru Excel - De la Zero la Automatizare',
    slug: 'vba-excel-automatizare',
    description: `Învață să programezi în VBA și automatizează sarcinile repetitive în Excel! Acest curs complet acoperă de la bazele programării până la aplicații complexe cu UserForms și integrări externe.

Vei învăța să:
• Înregistrezi și editezi macro-uri
• Programezi în VBA: variabile, bucle, condiții
• Lucrezi cu obiecte Excel (Range, Worksheet, Workbook)
• Creezi interfețe utilizator cu UserForms
• Automatizezi rapoarte și integrezi cu email/fișiere

Cerință: Excel Intermediar. Nu necesită experiență de programare.`,
    category: 'EXCEL_VBA',
    level: 'INTERMEDIATE',
    duration: 900,
    price: 149,
    isFree: false,
    language: 'ro',
    tags: ['vba', 'macro', 'automatizare', 'programare', 'excel'],
    modules: [
      {
        title: 'Introducere în VBA',
        order: 1,
        duration: 120,
        lessons: [
          { title: 'Ce este VBA și Macro Recorder', type: 'VIDEO', duration: 25, order: 1, content: 'VBA (Visual Basic for Applications) și înregistrarea automată a acțiunilor.' },
          { title: 'Visual Basic Editor (VBE)', type: 'VIDEO', duration: 30, order: 2, content: 'Navigare în VBE, module, proceduri, fereastra Immediate.' },
          { title: 'Primul macro - Hello World', type: 'VIDEO', duration: 25, order: 3, content: 'Sub, End Sub, MsgBox, InputBox - primii pași în cod.' },
          { title: 'Debugging basics', type: 'VIDEO', duration: 20, order: 4, content: 'F8 step through, breakpoints, watch, Immediate window.' },
          { title: 'Exercițiu - Macro simplu', type: 'EXERCISE', duration: 20, order: 5, content: 'Creează macro care formatează un raport automat.' }
        ]
      },
      {
        title: 'Programare VBA de Bază',
        order: 2,
        duration: 180,
        lessons: [
          { title: 'Variabile și tipuri de date', type: 'VIDEO', duration: 30, order: 1, content: 'Dim, String, Integer, Long, Double, Boolean, Date, Variant, Option Explicit.' },
          { title: 'Operatori și expresii', type: 'VIDEO', duration: 25, order: 2, content: 'Aritmetici, comparație, logici (And, Or, Not), concatenare (&).' },
          { title: 'Structuri de decizie (If, Select Case)', type: 'VIDEO', duration: 35, order: 3, content: 'If...Then...Else, ElseIf, Select Case pentru multiple condiții.' },
          { title: 'Bucle (For, Do While, For Each)', type: 'VIDEO', duration: 40, order: 4, content: 'Iterare prin date: For...Next, Do While...Loop, For Each...Next.' },
          { title: 'Arrays și Collections', type: 'VIDEO', duration: 30, order: 5, content: 'Array-uri statice și dinamice, Collection, Dictionary.' },
          { title: 'Exercițiu - Procesare date', type: 'EXERCISE', duration: 20, order: 6, content: 'Scrie cod care parcurge și procesează un tabel de date.' }
        ]
      },
      {
        title: 'Obiecte Excel în VBA',
        order: 3,
        duration: 150,
        lessons: [
          { title: 'Range Object', type: 'VIDEO', duration: 35, order: 1, content: 'Cells, Range, Offset, Resize, Value, Formula, End, CurrentRegion.' },
          { title: 'Worksheet și Workbook', type: 'VIDEO', duration: 30, order: 2, content: 'ActiveSheet, ThisWorkbook, Sheets collection, Add, Delete, Copy.' },
          { title: 'Application Object', type: 'VIDEO', duration: 25, order: 3, content: 'ScreenUpdating, Calculation, StatusBar, EnableEvents, FileDialog.' },
          { title: 'Events - Cod care reacționează', type: 'VIDEO', duration: 30, order: 4, content: 'Workbook_Open, Worksheet_Change, Worksheet_SelectionChange.' },
          { title: 'Exercițiu - Aplicație completă', type: 'EXERCISE', duration: 30, order: 5, content: 'Creează sistem de tracking modificări în tabel.' }
        ]
      },
      {
        title: 'UserForms și Interfețe',
        order: 4,
        duration: 150,
        lessons: [
          { title: 'Creare UserForm', type: 'VIDEO', duration: 25, order: 1, content: 'Insert UserForm, proprietăți, controale standard.' },
          { title: 'Controale: TextBox, ComboBox, ListBox', type: 'VIDEO', duration: 35, order: 2, content: 'Adăugare, configurare, populare dinamică.' },
          { title: 'Buttons și Event Handling', type: 'VIDEO', duration: 30, order: 3, content: 'CommandButton_Click, validare input, acțiuni.' },
          { title: 'Forms avansate: MultiPage, Frame', type: 'VIDEO', duration: 30, order: 4, content: 'Organizare complexă, tab-uri, grupuri de controale.' },
          { title: 'Exercițiu - Formular intrare date', type: 'EXERCISE', duration: 30, order: 5, content: 'Creează formular pentru adăugare clienți în baza de date.' }
        ]
      },
      {
        title: 'Automatizare și Integrări',
        order: 5,
        duration: 120,
        lessons: [
          { title: 'File operations', type: 'VIDEO', duration: 25, order: 1, content: 'Dir, FileSystemObject, Open/Close fișiere text, import/export.' },
          { title: 'Automatizare email (Outlook)', type: 'VIDEO', duration: 30, order: 2, content: 'Trimitere email automat cu atașamente din Excel.' },
          { title: 'Error handling robust', type: 'VIDEO', duration: 25, order: 3, content: 'On Error, Resume Next, GoTo, logging, user-friendly errors.' },
          { title: 'Best practices și optimizare', type: 'VIDEO', duration: 20, order: 4, content: 'Cod clean, comentarii, naming, performance (arrays vs cells).' },
          { title: 'Proiect final - Sistem raportare', type: 'EXERCISE', duration: 20, order: 5, content: 'Construiește sistem complet de generare și trimitere rapoarte.' }
        ]
      }
    ]
  }
];

export const pmCourses = [
  {
    title: 'Fundamente Project Management',
    slug: 'fundamente-project-management',
    description: `Intră în lumea managementului de proiecte! Acest curs gratuit îți oferă fundația solidă necesară pentru a gestiona proiecte de orice dimensiune.

Vei învăța să:
• Înțelegi ce definește un proiect și rolul PM-ului
• Creezi documente esențiale (Project Charter, WBS)
• Planifici și estimezi activități
• Gestionezi echipa și stakeholderii
• Monitorizezi și controlezi progresul

Perfect pentru manageri, team leads, sau oricine lucrează în proiecte.`,
    category: 'PROJECT_MANAGEMENT',
    level: 'BEGINNER',
    duration: 600,
    price: null,
    isFree: true,
    language: 'ro',
    tags: ['project management', 'planificare', 'wbs', 'gantt', 'începători'],
    modules: [
      {
        title: 'Introducere în Project Management',
        order: 1,
        duration: 90,
        lessons: [
          { title: 'Ce este un proiect?', type: 'VIDEO', duration: 20, order: 1, content: 'Definiția PMI: efort temporar pentru a crea un produs, serviciu sau rezultat unic. Triple constraint: Scope, Time, Cost.' },
          { title: 'Rolul Project Manager-ului', type: 'VIDEO', duration: 25, order: 2, content: 'Responsabilități, competențe cheie, leadership vs management, stakeholder management.' },
          { title: 'Ciclul de viață al proiectului', type: 'VIDEO', duration: 25, order: 3, content: 'Inițiere, Planificare, Execuție, Monitorizare & Control, Închidere. Phase gates și deliverables.' },
          { title: 'Metodologii overview', type: 'VIDEO', duration: 20, order: 4, content: 'Waterfall vs Agile vs Hybrid. Când să folosești fiecare. Certificări: PMP, PRINCE2, Scrum.' }
        ]
      },
      {
        title: 'Inițierea Proiectului',
        order: 2,
        duration: 75,
        lessons: [
          { title: 'Business Case și ROI', type: 'VIDEO', duration: 20, order: 1, content: 'De ce facem proiectul? Justificare financiară, beneficii, alternative considerate.' },
          { title: 'Project Charter', type: 'VIDEO', duration: 25, order: 2, content: 'Documentul care autorizează formal proiectul. Componente: obiective, scope high-level, stakeholders, PM assignment, buget preliminar.' },
          { title: 'Identificare stakeholders', type: 'VIDEO', duration: 20, order: 3, content: 'Cine e afectat de proiect? Stakeholder register, analiză putere/interes, strategie engagement.' },
          { title: 'Template Project Charter', type: 'DOWNLOAD', duration: 10, order: 4, content: 'Template Word/Excel pentru Project Charter cu exemple completate.' }
        ]
      },
      {
        title: 'Planificarea Proiectului',
        order: 3,
        duration: 150,
        lessons: [
          { title: 'Definirea Scope-ului', type: 'VIDEO', duration: 25, order: 1, content: 'Scope Statement, ce este IN și OUT of scope, requirements gathering.' },
          { title: 'Work Breakdown Structure (WBS)', type: 'VIDEO', duration: 35, order: 2, content: 'Descompunerea livrabilelor în work packages. Regula 100%, nivel de detaliu, WBS Dictionary.' },
          { title: 'Estimări și secvențiere', type: 'VIDEO', duration: 30, order: 3, content: 'Tehnici de estimare: expert judgment, analogous, parametric, three-point. Dependențe: FS, SS, FF, SF.' },
          { title: 'Diagramă Gantt', type: 'VIDEO', duration: 30, order: 4, content: 'Vizualizarea schedule-ului. Critical path, float/slack, milestones, baselines.' },
          { title: 'Planificare resurse și buget', type: 'VIDEO', duration: 20, order: 5, content: 'Resource loading, histogram, leveling. Cost estimation, contingency, S-curve.' },
          { title: 'Exercițiu - Plan proiect', type: 'EXERCISE', duration: 10, order: 6, content: 'Creează WBS și Gantt pentru un proiect de implementare software.' }
        ]
      },
      {
        title: 'Execuție și Control',
        order: 4,
        duration: 120,
        lessons: [
          { title: 'Gestionarea echipei', type: 'VIDEO', duration: 25, order: 1, content: 'Team development stages (Tuckman), motivare, conflict resolution, delegare.' },
          { title: 'Comunicare în proiecte', type: 'VIDEO', duration: 20, order: 2, content: 'Communication plan, status reports, meetings eficiente, escalation.' },
          { title: 'Monitorizare progres', type: 'VIDEO', duration: 25, order: 3, content: 'KPIs, Earned Value Management basics (PV, EV, AC, SPI, CPI), dashboards.' },
          { title: 'Change Management', type: 'VIDEO', duration: 20, order: 4, content: 'Change control board, impact analysis, versioning, scope creep prevention.' },
          { title: 'Risk Management basics', type: 'VIDEO', duration: 20, order: 5, content: 'Risk identification, qualitative analysis (probability x impact), risk register, response strategies.' },
          { title: 'Quiz final', type: 'QUIZ', duration: 10, order: 6, content: '20 întrebări multiple choice din tot cursul.' }
        ]
      },
      {
        title: 'Închiderea Proiectului',
        order: 5,
        duration: 45,
        lessons: [
          { title: 'Activități de închidere', type: 'VIDEO', duration: 15, order: 1, content: 'Acceptance sign-off, administrative closure, contract closure, archive documents.' },
          { title: 'Lessons Learned', type: 'VIDEO', duration: 15, order: 2, content: 'Retrospectivă: ce a mers bine, ce putem îmbunătăți, documentare pentru viitor.' },
          { title: 'Celebration și recunoaștere', type: 'VIDEO', duration: 15, order: 3, content: 'Importanța celebrării succesului, recunoașterea contribuțiilor, team morale.' }
        ]
      }
    ]
  },
  {
    title: 'Agile & Scrum Mastery',
    slug: 'agile-scrum-mastery',
    description: `Stăpânește metodologiile Agile și framework-ul Scrum! Acest curs te pregătește pentru a lucra eficient în echipe Agile și pentru certificarea Professional Scrum Master (PSM I).

Vei învăța să:
• Aplici principiile și valorile Agile
• Implementezi Scrum: roluri, events, artifacts
• Conduci Sprint Planning, Daily Scrum, Reviews și Retrospectives
• Gestionezi Product și Sprint Backlogs
• Scalezi Agile la nivel organizațional

Include simulări de examen PSM I.`,
    category: 'PROJECT_MANAGEMENT',
    level: 'INTERMEDIATE',
    duration: 720,
    price: 99,
    isFree: false,
    language: 'ro',
    tags: ['agile', 'scrum', 'sprint', 'PSM', 'product owner'],
    modules: [
      {
        title: 'Fundamente Agile',
        order: 1,
        duration: 90,
        lessons: [
          { title: 'Istoria și contextul Agile', type: 'VIDEO', duration: 20, order: 1, content: 'De la Waterfall la Agile: problemele adresate, Snowbird 2001, adoptarea în industrie.' },
          { title: 'Agile Manifesto și Principii', type: 'VIDEO', duration: 25, order: 2, content: '4 valori și 12 principii. Individuals > processes, Working software > documentation, Collaboration > negotiation, Responding > following plan.' },
          { title: 'Agile vs Waterfall detaliat', type: 'VIDEO', duration: 25, order: 3, content: 'Comparație pe criterii: predictibilitate, flexibilitate, documentație, client involvement, risk.' },
          { title: 'Framework-uri Agile', type: 'VIDEO', duration: 20, order: 4, content: 'Scrum, Kanban, XP, Lean, Crystal, SAFe - overview și când să folosești fiecare.' }
        ]
      },
      {
        title: 'Scrum Framework',
        order: 2,
        duration: 150,
        lessons: [
          { title: 'Scrum Overview și Piloni', type: 'VIDEO', duration: 20, order: 1, content: 'Transparency, Inspection, Adaptation. Empirical process control.' },
          { title: 'Scrum Team: Product Owner', type: 'VIDEO', duration: 25, order: 2, content: 'Responsabilități, maximizarea valorii, backlog management, stakeholder communication.' },
          { title: 'Scrum Team: Scrum Master', type: 'VIDEO', duration: 25, order: 3, content: 'Servant leader, coach, facilitator, impediment remover, protector al echipei.' },
          { title: 'Scrum Team: Developers', type: 'VIDEO', duration: 20, order: 4, content: 'Cross-functional, self-organizing, commitment la Sprint Goal, quality ownership.' },
          { title: 'Artifacts: Product Backlog', type: 'VIDEO', duration: 25, order: 5, content: 'User stories, INVEST criteria, estimation (story points, T-shirt sizing), prioritization (MoSCoW, WSJF).' },
          { title: 'Artifacts: Sprint Backlog & Increment', type: 'VIDEO', duration: 20, order: 6, content: 'Sprint Backlog composition, Increment și Definition of Done, transparency.' },
          { title: 'Quiz Scrum Framework', type: 'QUIZ', duration: 15, order: 7, content: '15 întrebări în stil PSM I.' }
        ]
      },
      {
        title: 'Scrum Events',
        order: 3,
        duration: 180,
        lessons: [
          { title: 'Sprint - Containerul', type: 'VIDEO', duration: 20, order: 1, content: 'Time-box 1-4 săptămâni, Sprint Goal, no changes that endanger goal, Sprint cancellation.' },
          { title: 'Sprint Planning', type: 'VIDEO', duration: 30, order: 2, content: 'What can be Done? How will it be Done? Input, output, time-box, Sprint Goal crafting.' },
          { title: 'Daily Scrum', type: 'VIDEO', duration: 25, order: 3, content: '15 minute, same time/place, developers only, inspect progress toward Sprint Goal, re-plan.' },
          { title: 'Sprint Review', type: 'VIDEO', duration: 25, order: 4, content: 'Inspect Increment, adapt Product Backlog, stakeholder feedback, demo (not just presentation).' },
          { title: 'Sprint Retrospective', type: 'VIDEO', duration: 30, order: 5, content: 'Inspect Sprint, identify improvements, create actionable plan, team health.' },
          { title: 'Backlog Refinement', type: 'VIDEO', duration: 25, order: 6, content: 'Ongoing activity, break down items, add details, estimate, prepare for future Sprints.' },
          { title: 'Simulare Sprint complet', type: 'SIMULATION', duration: 25, order: 7, content: 'Exercițiu interactiv: parcurge un Sprint cu toate events.' }
        ]
      },
      {
        title: 'Practici și Tehnici Agile',
        order: 4,
        duration: 120,
        lessons: [
          { title: 'User Stories și Acceptance Criteria', type: 'VIDEO', duration: 25, order: 1, content: 'Format: As a... I want... So that... Acceptance criteria, Given-When-Then.' },
          { title: 'Estimation: Story Points', type: 'VIDEO', duration: 25, order: 2, content: 'Relative estimation, Planning Poker, Fibonacci, velocity, capacity planning.' },
          { title: 'Kanban Board și Flow', type: 'VIDEO', duration: 20, order: 3, content: 'Visualize work, limit WIP, manage flow, make policies explicit, improve collaboratively.' },
          { title: 'Metrics în Agile', type: 'VIDEO', duration: 25, order: 4, content: 'Velocity, Burndown/Burnup charts, Cycle Time, Lead Time, Cumulative Flow Diagram.' },
          { title: 'Definition of Done și Quality', type: 'VIDEO', duration: 25, order: 5, content: 'DoD components, technical debt, continuous integration, testing practices.' }
        ]
      },
      {
        title: 'Scaling Agile și Pregătire Examen',
        order: 5,
        duration: 90,
        lessons: [
          { title: 'Scaling Frameworks', type: 'VIDEO', duration: 25, order: 1, content: 'SAFe, LeSS, Nexus - când ai nevoie de scaling, principii comune.' },
          { title: 'Agile Transformation', type: 'VIDEO', duration: 20, order: 2, content: 'Organizational change, cultural shift, management buy-in, common pitfalls.' },
          { title: 'Pregătire PSM I', type: 'VIDEO', duration: 20, order: 3, content: 'Structura examenului, resurse oficiale, sfaturi practice, greșeli comune.' },
          { title: 'Simulare examen PSM I (80 întrebări)', type: 'QUIZ', duration: 25, order: 4, content: 'Simulare completă cu timer și feedback detaliat.' }
        ]
      }
    ]
  },
  {
    title: 'PMP Exam Preparation - Complete Guide',
    slug: 'pmp-exam-preparation',
    description: `Pregătire completă pentru certificarea Project Management Professional (PMP)! Bazat pe PMBOK 7 și ECO (Examination Content Outline), acest curs intensiv te pregătește pentru a trece examenul din prima încercare.

Cursul acoperă:
• Toate domeniile de performanță PMBOK 7
• Abordări predictive, agile și hibride
• 35 contact hours (cerință PMP)
• 500+ întrebări practice
• Strategii de examen dovedite

Rata de succes a absolvenților: 92%`,
    category: 'PROJECT_MANAGEMENT',
    level: 'ADVANCED',
    duration: 2100,
    price: 299,
    isFree: false,
    language: 'ro',
    tags: ['PMP', 'PMBOK', 'certificare', 'project management', 'PMI'],
    modules: [
      {
        title: 'Introducere PMP și PMBOK 7',
        order: 1,
        duration: 180,
        lessons: [
          { title: 'Despre certificarea PMP', type: 'VIDEO', duration: 30, order: 1, content: 'Cerințe eligibilitate, proces aplicare, structura examen (180 întrebări, 230 min), passing score.' },
          { title: 'PMBOK 7 vs PMBOK 6', type: 'VIDEO', duration: 35, order: 2, content: 'Schimbarea paradigmei: de la procese la principii și domenii de performanță.' },
          { title: '12 Principii de Project Management', type: 'VIDEO', duration: 40, order: 3, content: 'Stewardship, Team, Stakeholders, Value, Systems Thinking, Leadership, Tailoring, Quality, Complexity, Risk, Adaptability, Change.' },
          { title: 'Domeniile de performanță (overview)', type: 'VIDEO', duration: 35, order: 4, content: 'Stakeholder, Team, Development Approach, Planning, Project Work, Delivery, Measurement, Uncertainty.' },
          { title: 'ECO și structura examenului', type: 'VIDEO', duration: 25, order: 5, content: 'Examination Content Outline: People (42%), Process (50%), Business Environment (8%).' },
          { title: 'Quiz Capitolul 1', type: 'QUIZ', duration: 15, order: 6, content: '25 întrebări din secțiunea introductivă.' }
        ]
      },
      {
        title: 'People Domain',
        order: 2,
        duration: 300,
        lessons: [
          { title: 'Leadership Skills', type: 'VIDEO', duration: 35, order: 1, content: 'Servant leadership, emotional intelligence, influencing, negotiation, decision making.' },
          { title: 'Team Building și Development', type: 'VIDEO', duration: 40, order: 2, content: 'Tuckman model, motivation theories (Maslow, Herzberg, McGregor), team charter, virtual teams.' },
          { title: 'Conflict Management', type: 'VIDEO', duration: 30, order: 3, content: 'Surse de conflict, Thomas-Kilmann modes (Collaborate, Compromise, Smooth, Force, Withdraw).' },
          { title: 'Communication Essentials', type: 'VIDEO', duration: 35, order: 4, content: 'Communication channels formula, active listening, feedback, nonverbal, cultural awareness.' },
          { title: 'Stakeholder Engagement', type: 'VIDEO', duration: 40, order: 5, content: 'Identification, analysis (power/interest, salience), engagement assessment matrix, strategies.' },
          { title: 'Mentoring și Coaching', type: 'VIDEO', duration: 25, order: 6, content: 'Diferențe, tehnici, dezvoltarea competențelor echipei, knowledge transfer.' },
          { title: 'Agile Leadership', type: 'VIDEO', duration: 30, order: 7, content: 'Servant leadership în Agile, self-organizing teams, impediment removal, psychological safety.' },
          { title: 'Quiz People Domain', type: 'QUIZ', duration: 25, order: 8, content: '40 întrebări din domeniul People.' }
        ]
      },
      {
        title: 'Process Domain - Predictive',
        order: 3,
        duration: 420,
        lessons: [
          { title: 'Project Integration Management', type: 'VIDEO', duration: 45, order: 1, content: 'Project Charter, Project Management Plan, Direct & Manage, Monitor & Control, Perform Integrated Change Control, Close Project.' },
          { title: 'Scope Management', type: 'VIDEO', duration: 40, order: 2, content: 'Plan Scope, Collect Requirements (techniques), Define Scope, Create WBS, Validate & Control Scope.' },
          { title: 'Schedule Management', type: 'VIDEO', duration: 50, order: 3, content: 'Plan Schedule, Define & Sequence Activities, Estimate Durations, Develop & Control Schedule. CPM, PERT, Resource Leveling, Crashing, Fast-tracking.' },
          { title: 'Cost Management', type: 'VIDEO', duration: 45, order: 4, content: 'Plan Cost, Estimate Costs, Determine Budget, Control Costs. EVM în detaliu: PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC, VAC, TCPI.' },
          { title: 'Quality Management', type: 'VIDEO', duration: 35, order: 5, content: 'Plan Quality, Manage Quality, Control Quality. Cost of Quality, 7 QC tools, continuous improvement.' },
          { title: 'Resource Management', type: 'VIDEO', duration: 35, order: 6, content: 'Plan Resource, Estimate Resources, Acquire & Develop Resources, Manage & Control Resources. RACI matrix.' },
          { title: 'Communications Management', type: 'VIDEO', duration: 30, order: 7, content: 'Plan Communications, Manage & Monitor Communications. 5Cs, communication models, technology factors.' },
          { title: 'Risk Management', type: 'VIDEO', duration: 45, order: 8, content: 'Plan Risk, Identify Risks (techniques), Qualitative & Quantitative Analysis, Plan & Implement Responses, Monitor Risks. Risk register, EMV, Monte Carlo.' },
          { title: 'Procurement Management', type: 'VIDEO', duration: 35, order: 9, content: 'Plan Procurement, Conduct & Control Procurements. Contract types (FFP, T&M, CPFF, CPIF), source selection criteria, claims.' },
          { title: 'Stakeholder Management', type: 'VIDEO', duration: 30, order: 10, content: 'Identify Stakeholders, Plan & Manage Engagement, Monitor Engagement. Power/Interest grid.' },
          { title: 'Quiz Process Predictive', type: 'QUIZ', duration: 30, order: 11, content: '50 întrebări din procesele predictive.' }
        ]
      },
      {
        title: 'Process Domain - Agile & Hybrid',
        order: 4,
        duration: 240,
        lessons: [
          { title: 'Agile Principles pe examenul PMP', type: 'VIDEO', duration: 30, order: 1, content: 'Agile Manifesto, principii, mindset - ce trebuie să știi pentru PMP.' },
          { title: 'Scrum în context PMP', type: 'VIDEO', duration: 35, order: 2, content: 'Roles, events, artifacts - mapare pe întrebări PMP.' },
          { title: 'Kanban, XP și alte practici', type: 'VIDEO', duration: 30, order: 3, content: 'Kanban principles, XP practices (TDD, Pair Programming, CI), Lean.' },
          { title: 'Hybrid Approaches', type: 'VIDEO', duration: 35, order: 4, content: 'Când și cum să combini predictive cu agile. Tailoring the approach.' },
          { title: 'Adaptive Planning', type: 'VIDEO', duration: 30, order: 5, content: 'Rolling wave planning, progressive elaboration, iteration planning.' },
          { title: 'Agile Metrics', type: 'VIDEO', duration: 25, order: 6, content: 'Velocity, burndown/burnup, cycle time, lead time - ce măsori în Agile.' },
          { title: 'Value Delivery', type: 'VIDEO', duration: 30, order: 7, content: 'Incremental delivery, MVP, MBI, business value realization.' },
          { title: 'Quiz Agile & Hybrid', type: 'QUIZ', duration: 25, order: 8, content: '40 întrebări Agile și Hybrid.' }
        ]
      },
      {
        title: 'Business Environment Domain',
        order: 5,
        duration: 150,
        lessons: [
          { title: 'Benefits Management', type: 'VIDEO', duration: 30, order: 1, content: 'Benefits realization, business case, ROI, NPV, IRR, payback period.' },
          { title: 'Organizational Change', type: 'VIDEO', duration: 25, order: 2, content: 'Change management (Kotter, ADKAR), resistance, sustaining change.' },
          { title: 'Compliance și Governance', type: 'VIDEO', duration: 25, order: 3, content: 'Regulatory requirements, organizational governance, PMO types.' },
          { title: 'Project Selection', type: 'VIDEO', duration: 20, order: 4, content: 'Portfolio management, project selection criteria, strategic alignment.' },
          { title: 'External Environment', type: 'VIDEO', duration: 20, order: 5, content: 'Market conditions, stakeholder environment, organizational culture.' },
          { title: 'Quiz Business Environment', type: 'QUIZ', duration: 15, order: 6, content: '25 întrebări Business Environment.' }
        ]
      },
      {
        title: 'Exam Preparation',
        order: 6,
        duration: 210,
        lessons: [
          { title: 'Strategii de examen', type: 'VIDEO', duration: 30, order: 1, content: 'Time management (1.2 min/întrebare), process of elimination, situational questions approach.' },
          { title: 'Common Pitfalls', type: 'VIDEO', duration: 25, order: 2, content: 'Greșeli frecvente, "best" vs "should", trap answers, change-related questions.' },
          { title: 'Simulare 1 (90 întrebări)', type: 'QUIZ', duration: 60, order: 3, content: 'Primul mock exam - 90 întrebări în 108 minute.' },
          { title: 'Review Simulare 1', type: 'VIDEO', duration: 25, order: 4, content: 'Analiza răspunsurilor, explicații detaliate.' },
          { title: 'Simulare 2 (90 întrebări)', type: 'QUIZ', duration: 60, order: 5, content: 'Al doilea mock exam - 90 întrebări în 108 minute.' },
          { title: 'Review Simulare 2', type: 'VIDEO', duration: 25, order: 6, content: 'Analiza și consolidare cunoștințe.' },
          { title: 'Final Tips și Next Steps', type: 'VIDEO', duration: 15, order: 7, content: 'Ce să faci în ziua examenului, după examen, menținere certificare (PDUs).' }
        ]
      }
    ]
  }
];

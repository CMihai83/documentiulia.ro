/**
 * DocumentIulia.ro - Excel VBA Masterclass
 * Created with Grok consultation for comprehensive, text-based learning
 * Full educational content for professional automation training
 */

export const excelVBACourse = {
  title: 'Excel VBA Masterclass - Automatizare Completa pentru Business',
  slug: 'excel-vba-masterclass-automatizare',
  description: `Transforma-te din utilizator Excel in expert automatizare cu acest curs complet de VBA!

De la macro-uri simple pana la aplicatii complete de business, vei invata sa automatizezi orice task repetitiv si sa economisesti ore de munca zilnic.

Ce vei invata:
• Fundamentele programarii VBA de la zero
• Automatizarea rapoartelor si formatarii
• Lucrul cu multiple fisiere si foldere
• Crearea de UserForms profesionale
• Conectarea la baze de date si API-uri externe
• Dashboard-uri interactive cu butoane si controale
• Error handling si debugging profesional
• Best practices pentru cod mentenabil

Include 50+ exemple de cod ready-to-use pentru contabilitate, HR, vanzari si operatiuni.`,
  category: 'EXCEL_VBA',
  level: 'INTERMEDIATE',
  duration: 1800,
  price: 199,
  isFree: false,
  language: 'ro',
  tags: ['Excel', 'VBA', 'automatizare', 'macros', 'programare', 'rapoarte', 'productivitate'],
  modules: [
    {
      title: 'Fundamentele VBA - De la Zero la Primul Macro',
      order: 1,
      duration: 360,
      lessons: [
        {
          title: 'Ce este VBA si de ce sa il inveti',
          type: 'TEXT',
          duration: 45,
          order: 1,
          content: `# Ce este VBA si de ce sa il inveti

## Introducere in Visual Basic for Applications

VBA (Visual Basic for Applications) este limbajul de programare integrat in Microsoft Office care iti permite sa automatizezi aproape orice task pe care il faci manual in Excel, Word, Outlook sau Access.

## De ce VBA este ESSENTIAL pentru profesionisti

### 1. Economie de timp masiva

**Exemplu real:** Un contabil care genereaza lunar 50 de rapoarte din multiple surse de date:
- **Manual:** 4-6 ore
- **Cu VBA:** 5 minute (un click pe buton)

**ROI calculat:**
- 5 ore economie/luna × 12 luni = 60 ore/an
- La un cost orar de 100 RON = **6,000 RON economie/an**
- Invatarea VBA: ~40 ore investitie
- **Payback: sub 1 an**, apoi beneficii nete

### 2. Eliminarea erorilor umane

Task-urile repetitive sunt predispuse la erori. Cu cat le faci mai des, cu atat probabilitatea de eroare creste.

**Studiu de caz:** O firma de distributie facea reconcilieri manuale intre ERP si conturi bancare. Rata de eroare: 2-3%. Dupa automatizare cu VBA: 0.01%.

### 3. Scalabilitate

Un macro scris o data poate procesa:
- 10 randuri sau 1 milion de randuri
- 1 fisier sau 1000 de fisiere
- Datele de azi si cele de peste 10 ani

### 4. Career Advancement

Competentele VBA te diferentiaza:
- **Entry level:** Foloseste Excel
- **Mid level:** Foloseste formule avansate
- **Expert level:** Automatizeaza cu VBA

Salariile pentru pozitii care cer VBA sunt cu 15-30% mai mari.

## Ce poti automatiza cu VBA

### Contabilitate si Finante
- Generare facturi din template
- Reconcilieri bancare automate
- Rapoarte financiare lunare
- Calcul dobanzi si penalitati
- Import date din banca/ERP

### Resurse Umane
- Calculul salariilor si contributiilor
- Generare contracte de munca
- Tracking concedii si pontaje
- Rapoarte pentru ITM/ANAF

### Vanzari si Marketing
- Analiza pipeline vanzari
- Rapoarte comisioane
- Segmentare clienti
- Mail merge pentru oferte

### Operatiuni
- Gestiune stocuri
- Planificare productie
- Tracking livrari
- Rapoarte KPI

## Structura limbajului VBA

VBA este un limbaj **procedural** si **orientat pe obiecte**, derivat din Visual Basic.

### Obiecte Excel
\`\`\`
Application (Excel)
  └── Workbooks (colectie de fisiere)
       └── Workbook (un fisier)
            └── Worksheets (colectie de foi)
                 └── Worksheet (o foaie)
                      └── Range (celule)
\`\`\`

### Sintaxa de baza
\`\`\`vba
Sub NumeleMacro()
    ' Acesta este un comentariu
    Range("A1").Value = "Hello World"
    MsgBox "Macro executat cu succes!"
End Sub
\`\`\`

## Mediul de dezvoltare VBA

### Accesarea Editor-ului VBA
1. **Shortcut:** Alt + F11
2. **Ribbon:** Developer tab → Visual Basic
3. **Daca nu vezi Developer tab:** File → Options → Customize Ribbon → bifează Developer

### Componentele Editor-ului
- **Project Explorer** (Ctrl+R): vezi toate modulele
- **Properties Window** (F4): proprietatile obiectului selectat
- **Code Window**: aici scrii codul
- **Immediate Window** (Ctrl+G): testare rapida

## Primul tau macro - pas cu pas

### Metoda 1: Macro Recorder (pentru incepatori)
1. Developer → Record Macro
2. Fa actiunile manual
3. Developer → Stop Recording
4. Alt+F11 sa vezi codul generat

### Metoda 2: Scriere directa (recomandat)
1. Alt + F11
2. Insert → Module
3. Scrie codul:

\`\`\`vba
Sub PrimulMeuMacro()
    Range("A1").Select
    ActiveCell.Value = "Salut din VBA!"
    ActiveCell.Font.Bold = True
    ActiveCell.Interior.Color = RGB(255, 255, 0)
    MsgBox "Macro executat!", vbInformation, "Succes"
End Sub
\`\`\`

4. F5 pentru a rula

## Exercitiu practic

**Task:** Creeaza un macro care:
1. Sterge continutul din A1:D10
2. Scrie "Raport Lunar" in A1
3. Formateaza A1 cu font 16, bold, albastru
4. Adauga data curenta in A2
5. Afiseaza un mesaj de confirmare

---
**Key Takeaway:** VBA nu e programare "grea" - e automatizare practica. Fiecare ora investita in invatare se transforma in zeci de ore economsite.`
        },
        {
          title: 'Variabile, tipuri de date si operatori',
          type: 'TEXT',
          duration: 60,
          order: 2,
          content: `# Variabile, Tipuri de Date si Operatori in VBA

## Ce sunt variabilele

Variabilele sunt "containere" pentru stocarea datelor. Gandeste-te la ele ca la cutii etichetate in care pui informatii.

\`\`\`vba
Dim numeClient As String
numeClient = "SC Exemplu SRL"
\`\`\`

## Declararea variabilelor

### Metoda explicita (RECOMANDATA)
\`\`\`vba
Dim varsta As Integer
Dim nume As String
Dim pret As Double
Dim activ As Boolean
\`\`\`

### De ce sa folosesti Option Explicit

Adauga la inceputul fiecarui modul:
\`\`\`vba
Option Explicit
\`\`\`

**Beneficii:**
- Previne typos in nume de variabile
- Codul e mai clar si documentat
- Debugging mai usor
- Performanta mai buna

## Tipuri de date fundamentale

### Tipuri numerice

| Tip | Range | Utilizare |
|-----|-------|-----------|
| Integer | -32,768 la 32,767 | Contoare mici |
| Long | -2.1 mld la 2.1 mld | ID-uri, randuri Excel |
| Double | ±1.8×10^308 | Calcule financiare |
| Currency | ±922 trilioane | Bani (4 zecimale fix) |

**Recomandari:**
- **Bani:** Currency sau Double
- **Randuri Excel:** Long (Excel are >1 mil randuri)
- **Contoare:** Integer sau Long

### Tipuri text

\`\`\`vba
Dim mesaj As String
Dim cod As String * 10  ' Fix 10 caractere
\`\`\`

**Operatii cu String:**
\`\`\`vba
Len(s)              ' lungime
Left(s, 5)          ' primele 5 caractere
Right(s, 3)         ' ultimele 3 caractere
Mid(s, 7, 3)        ' de la pozitia 7, 3 caractere
UCase(s)            ' majuscule
LCase(s)            ' minuscule
Trim("  text  ")    ' elimina spatii
Replace(s, "a", "b")' inlocuieste
InStr(s, "x")       ' pozitia unde gaseste
\`\`\`

### Tip Date
\`\`\`vba
Dim azi As Date
azi = Date              ' Data curenta
azi = Now               ' Data si ora curenta
azi = DateSerial(2024, 12, 25)

DateAdd("d", 30, azi)   ' Adauga 30 zile
DateDiff("d", data1, data2)  ' Diferenta in zile
Year(azi), Month(azi), Day(azi)
\`\`\`

## Operatori

### Aritmetici
\`\`\`vba
a + b    ' Adunare
a - b    ' Scadere
a * b    ' Inmultire
a / b    ' Impartire
a Mod b  ' Restul impartirii
a ^ b    ' Ridicare la putere
\`\`\`

### Comparatie
\`\`\`vba
a = b    ' Egal
a <> b   ' Diferit
a < b, a > b, a <= b, a >= b
\`\`\`

### Logici
\`\`\`vba
A And B  ' Ambele True
A Or B   ' Cel putin unul True
Not A    ' Inversare
\`\`\`

## Constante

\`\`\`vba
Const TVA_STANDARD As Double = 0.19
Const TVA_REDUS As Double = 0.09
Const COMPANY_NAME As String = "Firma Mea SRL"

totalCuTVA = subtotal * (1 + TVA_STANDARD)
\`\`\`

## Exercitiu practic

\`\`\`vba
Option Explicit

Sub CalculFactura()
    Dim strClient As String
    Dim dblValoare As Double
    Dim dblTVA As Double
    Dim dblTotal As Double
    Const COTA_TVA As Double = 0.19

    strClient = Range("A1").Value
    dblValoare = Range("B1").Value
    dblTVA = dblValoare * COTA_TVA
    dblTotal = dblValoare + dblTVA

    MsgBox "Factura pentru: " & strClient & vbCrLf & _
           "Total: " & Format(dblTotal, "#,##0.00") & " RON"
End Sub
\`\`\`

---
**Key Takeaway:** Foloseste Option Explicit si declara tipuri specifice. Un cod curat economiseste ore de debugging.`
        },
        {
          title: 'Structuri de control - If, Select Case, Loop-uri',
          type: 'TEXT',
          duration: 75,
          order: 3,
          content: `# Structuri de Control in VBA

## Structuri decizionale

### If...Then...Else

\`\`\`vba
If conditie Then
    ' cod daca True
ElseIf alta_conditie Then
    ' cod daca prima e False dar a doua e True
Else
    ' cod daca toate sunt False
End If
\`\`\`

**Exemplu - Clasificare clienti:**
\`\`\`vba
Sub ClasificareClient()
    Dim vanzari As Double
    Dim categorie As String

    vanzari = Range("B2").Value

    If vanzari >= 100000 Then
        categorie = "GOLD"
        Range("C2").Interior.Color = RGB(255, 215, 0)
    ElseIf vanzari >= 50000 Then
        categorie = "SILVER"
        Range("C2").Interior.Color = RGB(192, 192, 192)
    ElseIf vanzari >= 10000 Then
        categorie = "BRONZE"
        Range("C2").Interior.Color = RGB(205, 127, 50)
    Else
        categorie = "STANDARD"
    End If

    Range("C2").Value = categorie
End Sub
\`\`\`

### Select Case

\`\`\`vba
Select Case Left(codProdus, 2)
    Case "AL"  ' Alimente
        cotaTVA = 0.09
    Case "MD"  ' Medicamente
        cotaTVA = 0.09
    Case "CR"  ' Carti
        cotaTVA = 0.05
    Case Else
        cotaTVA = 0.19
End Select
\`\`\`

## Structuri repetitive (Loop-uri)

### For...Next

\`\`\`vba
For i = 1 To 10
    Cells(i, 1).Value = i
Next i

For i = 10 To 1 Step -1  ' Numarare inversa
    Debug.Print i
Next i
\`\`\`

**Exemplu - Procesare facturi:**
\`\`\`vba
Sub ProcesareFacturi()
    Dim i As Long, ultimulRand As Long
    Dim totalFacturi As Double

    ultimulRand = Cells(Rows.Count, 1).End(xlUp).Row
    totalFacturi = 0

    For i = 2 To ultimulRand
        totalFacturi = totalFacturi + Cells(i, 3).Value
        If Cells(i, 3).Value > 10000 Then
            Cells(i, 4).Value = "MARE"
            Cells(i, 4).Font.Color = RGB(255, 0, 0)
        End If
    Next i

    Cells(ultimulRand + 2, 3).Value = totalFacturi
End Sub
\`\`\`

### For Each...Next

\`\`\`vba
Dim celula As Range
For Each celula In Range("A1:A100")
    If celula.Value < 0 Then
        celula.Font.Color = RGB(255, 0, 0)
    End If
Next celula

Dim ws As Worksheet
For Each ws In ThisWorkbook.Worksheets
    MsgBox ws.Name
Next ws
\`\`\`

### Do While / Do Until

\`\`\`vba
Dim rand As Long
rand = 1
Do While Cells(rand, 1).Value <> ""
    ' Proceseaza randul
    rand = rand + 1
Loop
\`\`\`

## Optimizare performanta loop-uri

\`\`\`vba
Sub LoopOptimizat()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual

    ' Loop-ul tau aici
    For i = 1 To 100000
        Cells(i, 1).Value = i
    Next i

    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
End Sub
\`\`\`

**Diferenta:** 100,000 randuri in ~45 sec vs ~2 sec!

---
**Key Takeaway:** Optimizarea loop-urilor cu ScreenUpdating = False poate reduce timpul de 20x.`
        },
        {
          title: 'Lucrul cu Range-uri si Celule',
          type: 'TEXT',
          duration: 70,
          order: 4,
          content: `# Lucrul cu Range-uri si Celule in VBA

## Modalitati de referire la celule

\`\`\`vba
Range("A1")                ' O celula
Range("A1:D10")            ' Un bloc
Range("A1,C1,E1")          ' Celule nesecventiale
Range("A:A")               ' Coloana intreaga
Cells(1, 1)                ' A1 (rand, coloana)
Cells(i, j)                ' Ideal pentru loop-uri
ActiveCell                 ' Celula selectata
ActiveCell.Offset(1, 0)    ' Un rand mai jos
\`\`\`

## Proprietati esentiale ale Range

### Value
\`\`\`vba
x = Range("A1").Value      ' Citire
Range("A1").Value = 100    ' Scriere

' RAPID pentru blocuri
Dim date As Variant
date = Range("A1:D100").Value  ' Array 2D
Range("F1:I100").Value = date  ' Scrie array
\`\`\`

### Formula
\`\`\`vba
Range("C1").Formula = "=A1+B1"
If Range("A1").HasFormula Then MsgBox "E formula"
\`\`\`

## Formatare celule

### Font
\`\`\`vba
With Range("A1").Font
    .Name = "Arial"
    .Size = 12
    .Bold = True
    .Color = RGB(0, 0, 139)
End With
\`\`\`

### Interior (fundal)
\`\`\`vba
Range("A1").Interior.Color = RGB(255, 255, 0)
\`\`\`

### Number Format
\`\`\`vba
Range("A1").NumberFormat = "#,##0.00"
Range("A1").NumberFormat = "#,##0.00 RON"
Range("A1").NumberFormat = "0%"
Range("A1").NumberFormat = "DD.MM.YYYY"
\`\`\`

## Actiuni pe Range

### Copiere
\`\`\`vba
Range("A1:D10").Copy
Range("F1").PasteSpecial xlPasteValues

' Metoda rapida
Range("F1:I10").Value = Range("A1:D10").Value
\`\`\`

### Gasirea ultimei celule
\`\`\`vba
ultimRand = Cells(Rows.Count, 1).End(xlUp).Row
ultimaCol = Cells(1, Columns.Count).End(xlToLeft).Column
\`\`\`

### Find
\`\`\`vba
Dim gasit As Range
Set gasit = Range("A:A").Find(What:="cautare")
If Not gasit Is Nothing Then
    MsgBox "Gasit la: " & gasit.Address
End If
\`\`\`

## Exemplu complet

\`\`\`vba
Sub GeneratorRaport()
    Application.ScreenUpdating = False

    Dim ws As Worksheet
    Set ws = Sheets.Add(After:=Sheets(Sheets.Count))
    ws.Name = "Raport_" & Format(Date, "YYYYMMDD")

    With ws
        .Range("A1").Value = "RAPORT"
        .Range("A1").Font.Size = 18
        .Range("A1").Font.Bold = True

        .Range("A3").Value = "Data:"
        .Range("B3").Value = Now
        .Range("B3").NumberFormat = "DD.MM.YYYY HH:MM"

        .Columns.AutoFit
    End With

    Application.ScreenUpdating = True
End Sub
\`\`\`

---
**Key Takeaway:** Range.Value = Range.Value e cel mai rapid mod de a copia valori. Array-urile sunt de 100x mai rapide decat celula cu celula.`
        }
      ]
    },
    {
      title: 'Automatizari Practice pentru Business',
      order: 2,
      duration: 480,
      lessons: [
        {
          title: 'Automatizarea rapoartelor financiare',
          type: 'TEXT',
          duration: 90,
          order: 1,
          content: `# Automatizarea Rapoartelor Financiare cu VBA

## Tipuri de rapoarte automatizabile

### Rapoarte periodice
- Balanta de verificare
- Situatii financiare
- Rapoarte de cash-flow
- Analiza profitabilitate

### Rapoarte operationale
- Situatia creantelor si datoriilor
- Analiza varste facturi
- Reconcilieri bancare

## Structura unui generator de rapoarte

\`\`\`vba
Sub GeneratorRaportFinanciar()
    ' CONFIGURARE
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual

    ' EXTRAGERE DATE
    ' Citeste din surse

    ' PROCESARE SI CALCULE
    ' Faci calculele

    ' GENERARE OUTPUT
    ' Creezi raportul formatat

    ' FINALIZARE
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
End Sub
\`\`\`

## Exemplu: Raport Situatie Creante

\`\`\`vba
Sub RaportSituatieCreante()
    Application.ScreenUpdating = False

    Dim wsFacturi As Worksheet, wsRaport As Worksheet
    Dim ultimRand As Long, i As Long, randRaport As Long
    Dim dataAzi As Date, zileIntarziere As Long
    Dim rest As Double

    Set wsFacturi = Sheets("Facturi")
    dataAzi = Date
    ultimRand = wsFacturi.Cells(Rows.Count, 1).End(xlUp).Row

    ' Creeaza foaia raport
    On Error Resume Next
    Sheets("Creante").Delete
    On Error GoTo 0

    Set wsRaport = Sheets.Add
    wsRaport.Name = "Creante"

    ' Header
    With wsRaport
        .Range("A1").Value = "SITUATIE CREANTE"
        .Range("A1").Font.Size = 16
        .Range("A1").Font.Bold = True

        .Range("A3:G3") = Array("Nr. Factura", "Client", _
            "Data", "Scadenta", "Rest", "Zile", "Categorie")
        .Range("A3:G3").Font.Bold = True
        .Range("A3:G3").Interior.Color = RGB(0, 51, 102)
        .Range("A3:G3").Font.Color = RGB(255, 255, 255)
    End With

    ' Procesare
    randRaport = 4
    For i = 2 To ultimRand
        rest = wsFacturi.Cells(i, 5) - wsFacturi.Cells(i, 6)

        If rest > 0.01 Then
            zileIntarziere = dataAzi - wsFacturi.Cells(i, 4)
            If zileIntarziere < 0 Then zileIntarziere = 0

            With wsRaport
                .Cells(randRaport, 1) = wsFacturi.Cells(i, 1)
                .Cells(randRaport, 2) = wsFacturi.Cells(i, 2)
                .Cells(randRaport, 3) = wsFacturi.Cells(i, 3)
                .Cells(randRaport, 4) = wsFacturi.Cells(i, 4)
                .Cells(randRaport, 5) = rest
                .Cells(randRaport, 6) = zileIntarziere

                Select Case zileIntarziere
                    Case 0 To 30: .Cells(randRaport, 7) = "0-30"
                    Case 31 To 60
                        .Cells(randRaport, 7) = "31-60"
                        .Cells(randRaport, 7).Interior.Color = RGB(255, 255, 0)
                    Case 61 To 90
                        .Cells(randRaport, 7) = "61-90"
                        .Cells(randRaport, 7).Interior.Color = RGB(255, 165, 0)
                    Case Else
                        .Cells(randRaport, 7) = ">90"
                        .Cells(randRaport, 7).Interior.Color = RGB(255, 0, 0)
                End Select
            End With

            randRaport = randRaport + 1
        End If
    Next i

    ' Formatare finala
    With wsRaport
        .Range("E:E").NumberFormat = "#,##0.00"
        .Range("C:D").NumberFormat = "DD.MM.YYYY"
        .Columns.AutoFit
    End With

    Application.ScreenUpdating = True
    MsgBox "Raport generat!", vbInformation
End Sub
\`\`\`

## Export automat in PDF

\`\`\`vba
Sub ExportPDF()
    Dim numeFisier As String
    numeFisier = ThisWorkbook.Path & "\\Raport_" & Format(Date, "YYYYMMDD") & ".pdf"

    ActiveSheet.ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=numeFisier, _
        Quality:=xlQualityStandard, _
        OpenAfterPublish:=True
End Sub
\`\`\`

---
**Key Takeaway:** Un raport automatizat elimina erorile umane si economiseste ore de munca.`
        },
        {
          title: 'Lucrul cu multiple fisiere si foldere',
          type: 'TEXT',
          duration: 80,
          order: 2,
          content: `# Lucrul cu Multiple Fisiere si Foldere

## Deschiderea fisierelor

\`\`\`vba
' Fisier specific
Dim wb As Workbook
Set wb = Workbooks.Open("C:\\Date\\Raport.xlsx")

' Dialog pentru selectie
Dim cale As Variant
cale = Application.GetOpenFilename("Excel Files,*.xlsx")
If cale <> False Then
    Set wb = Workbooks.Open(cale)
End If
\`\`\`

## Procesarea tuturor fisierelor dintr-un folder

\`\`\`vba
Sub ProcesareFisiereFolderComplet()
    Application.ScreenUpdating = False

    Dim folderPath As String
    Dim fileName As String
    Dim wb As Workbook
    Dim wsMaster As Worksheet
    Dim randMaster As Long

    Set wsMaster = ThisWorkbook.Sheets("Consolidat")
    randMaster = wsMaster.Cells(Rows.Count, 1).End(xlUp).Row + 1

    ' Selecteaza folder
    With Application.FileDialog(msoFileDialogFolderPicker)
        .Title = "Selecteaza folderul cu fisiere"
        If .Show = -1 Then
            folderPath = .SelectedItems(1) & "\\"
        Else
            Exit Sub
        End If
    End With

    ' Parcurge toate fisierele Excel
    fileName = Dir(folderPath & "*.xlsx")

    Do While fileName <> ""
        ' Deschide fisierul
        Set wb = Workbooks.Open(folderPath & fileName, ReadOnly:=True)

        ' Copiaza datele
        Dim ultimRand As Long
        ultimRand = wb.Sheets(1).Cells(Rows.Count, 1).End(xlUp).Row

        wb.Sheets(1).Range("A2:D" & ultimRand).Copy _
            Destination:=wsMaster.Cells(randMaster, 1)

        randMaster = randMaster + ultimRand - 1

        ' Inchide fara salvare
        wb.Close SaveChanges:=False

        ' Urmatorul fisier
        fileName = Dir()
    Loop

    Application.ScreenUpdating = True
    MsgBox "Consolidare completa!"
End Sub
\`\`\`

## Salvarea in formate diferite

\`\`\`vba
' Salvare ca xlsx
wb.SaveAs "C:\\Output\\Raport.xlsx", xlOpenXMLWorkbook

' Salvare ca csv
wb.SaveAs "C:\\Output\\Date.csv", xlCSV

' Salvare ca PDF
ws.ExportAsFixedFormat xlTypePDF, "C:\\Output\\Raport.pdf"
\`\`\`

## Crearea de backup automat

\`\`\`vba
Sub BackupAutomat()
    Dim folderBackup As String
    Dim numeBackup As String

    folderBackup = ThisWorkbook.Path & "\\Backup\\"

    ' Creeaza folder daca nu exista
    If Dir(folderBackup, vbDirectory) = "" Then
        MkDir folderBackup
    End If

    numeBackup = folderBackup & "Backup_" & _
        Format(Now, "YYYYMMDD_HHMMSS") & ".xlsm"

    ThisWorkbook.SaveCopyAs numeBackup
    MsgBox "Backup creat: " & numeBackup
End Sub
\`\`\`

---
**Key Takeaway:** Automatizarea procesarii multiple fisiere poate economisi zile intregi de munca manuala.`
        },
        {
          title: 'Crearea de UserForms profesionale',
          type: 'TEXT',
          duration: 90,
          order: 3,
          content: `# Crearea de UserForms Profesionale

UserForm-urile transforma macro-urile in aplicatii complete cu interfata grafica.

## Crearea unui UserForm

1. Alt + F11 (VBA Editor)
2. Insert → UserForm
3. Foloseste Toolbox pentru a adauga controale

## Controale principale

| Control | Utilizare |
|---------|-----------|
| Label | Text static |
| TextBox | Input text |
| ComboBox | Lista dropdown |
| ListBox | Lista cu selectie |
| CommandButton | Butoane actiuni |
| CheckBox | Bifari Da/Nu |
| OptionButton | Selectie exclusiva |
| Frame | Grupare controale |

## Exemplu: Formular de introducere facturi

\`\`\`vba
' Cod in UserForm
Private Sub UserForm_Initialize()
    ' Initializare la deschidere
    txtData.Value = Format(Date, "DD.MM.YYYY")

    ' Populeaza combobox cu clienti
    Dim ws As Worksheet
    Set ws = Sheets("Clienti")
    Dim i As Long

    For i = 2 To ws.Cells(Rows.Count, 1).End(xlUp).Row
        cboClient.AddItem ws.Cells(i, 1).Value
    Next i
End Sub

Private Sub btnSalveaza_Click()
    ' Validare
    If txtValoare.Value = "" Then
        MsgBox "Introduceti valoarea!", vbExclamation
        txtValoare.SetFocus
        Exit Sub
    End If

    If cboClient.Value = "" Then
        MsgBox "Selectati clientul!", vbExclamation
        Exit Sub
    End If

    ' Salvare in sheet
    Dim ws As Worksheet
    Set ws = Sheets("Facturi")
    Dim ultimRand As Long
    ultimRand = ws.Cells(Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(ultimRand, 1).Value = "FV-" & Format(Date, "YYYYMM") & "-" & ultimRand
    ws.Cells(ultimRand, 2).Value = cboClient.Value
    ws.Cells(ultimRand, 3).Value = CDate(txtData.Value)
    ws.Cells(ultimRand, 4).Value = CDbl(txtValoare.Value)

    MsgBox "Factura salvata!", vbInformation

    ' Reset form
    txtValoare.Value = ""
    cboClient.Value = ""
    txtData.Value = Format(Date, "DD.MM.YYYY")
End Sub

Private Sub btnInchide_Click()
    Unload Me
End Sub
\`\`\`

## Afisarea UserForm-ului

\`\`\`vba
' Din alt modul sau buton
Sub DeschideFormular()
    frmFacturi.Show
End Sub

' Modal vs Modeless
frmFacturi.Show vbModal     ' Blocheaza Excel
frmFacturi.Show vbModeless  ' Excel accesibil
\`\`\`

## Validare input in timp real

\`\`\`vba
Private Sub txtValoare_Change()
    ' Permite doar numere
    If Not IsNumeric(txtValoare.Value) And txtValoare.Value <> "" Then
        txtValoare.Value = Left(txtValoare.Value, Len(txtValoare.Value) - 1)
    End If
End Sub

Private Sub txtValoare_Exit(ByVal Cancel As MSForms.ReturnBoolean)
    If Val(txtValoare.Value) <= 0 Then
        MsgBox "Valoarea trebuie sa fie pozitiva!"
        Cancel = True
    End If
End Sub
\`\`\`

## Design tips

1. **Aliniaza controalele** - foloseste Format → Align
2. **Tab Order logic** - View → Tab Order
3. **Culorile consistente** - foloseste paleta corporativa
4. **Labels clare** - fiecare camp sa fie etichetat
5. **Mesaje de eroare utile** - spune CE e gresit si CUM sa corecteze

---
**Key Takeaway:** UserForms transforma macro-uri complexe in aplicatii user-friendly pe care oricine le poate folosi.`
        },
        {
          title: 'Error Handling si Debugging',
          type: 'TEXT',
          duration: 70,
          order: 4,
          content: `# Error Handling si Debugging in VBA

## De ce e important error handling

Fara error handling, o eroare in VBA:
- Opreste executia complet
- Arata mesaje criptice utilizatorului
- Nu ofera informatii pentru debugging

## Structura On Error

### On Error GoTo
\`\`\`vba
Sub ExempluErrorHandling()
    On Error GoTo ErrorHandler

    ' Codul tau aici
    Dim rezultat As Double
    rezultat = 10 / 0  ' Va genera eroare

    ' Daca totul e OK, sari peste handler
    Exit Sub

ErrorHandler:
    MsgBox "Eroare: " & Err.Description & vbCrLf & _
           "Numar: " & Err.Number, vbCritical, "Eroare"
End Sub
\`\`\`

### On Error Resume Next
\`\`\`vba
' Ignora erori si continua
On Error Resume Next
Sheets("Test").Delete  ' Nu crapa daca nu exista
On Error GoTo 0  ' Reactiveaza erori

' Verifica daca a fost eroare
If Err.Number <> 0 Then
    Debug.Print "A fost o eroare: " & Err.Description
    Err.Clear
End If
\`\`\`

## Template complet error handling

\`\`\`vba
Sub ProcesProfesional()
    On Error GoTo ErrorHandler

    ' Dezactiveaza actualizari pentru performanta
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Application.EnableEvents = False

    ' ====== CODUL TAU AICI ======
    Dim ws As Worksheet
    Set ws = Sheets("Date")

    ' ... procesare ...

    ' ============================

CleanExit:
    ' Reactiveaza tot (INTOTDEAUNA!)
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Application.EnableEvents = True
    Exit Sub

ErrorHandler:
    MsgBox "Eroare in ProcesProfesional:" & vbCrLf & _
           Err.Description, vbCritical
    Resume CleanExit  ' Asigura cleanup
End Sub
\`\`\`

## Tehnici de Debugging

### Debug.Print
\`\`\`vba
Debug.Print "Valoare x: " & x
Debug.Print "Am ajuns aici"
' Output in Immediate Window (Ctrl+G)
\`\`\`

### Breakpoints
- Click pe marginea stanga = punct rosu
- F5 = ruleaza pana la breakpoint
- F8 = pas cu pas (Step Into)
- Shift+F8 = Step Over (sare peste functii)

### Watch Window
- Debug → Add Watch
- Monitorizeaza valori in timp real

### Immediate Window comenzi
\`\`\`vba
?x          ' Afiseaza valoarea lui x
x = 5       ' Seteaza valoarea
?Range("A1").Value
\`\`\`

## Logging pentru productie

\`\`\`vba
Sub LogToFile(mesaj As String)
    Dim fso As Object, ts As Object
    Dim caleLog As String

    caleLog = ThisWorkbook.Path & "\\log.txt"
    Set fso = CreateObject("Scripting.FileSystemObject")

    Set ts = fso.OpenTextFile(caleLog, 8, True)
    ts.WriteLine Format(Now, "YYYY-MM-DD HH:MM:SS") & " - " & mesaj
    ts.Close
End Sub

' Utilizare
LogToFile "Proces inceput"
LogToFile "Eroare: " & Err.Description
LogToFile "Proces finalizat cu succes"
\`\`\`

---
**Key Takeaway:** Error handling profesional e diferenta dintre un macro care crapa si unul care raporteaza elegant problemele.`
        }
      ]
    },
    {
      title: 'Proiecte Complete si Best Practices',
      order: 3,
      duration: 360,
      lessons: [
        {
          title: 'Dashboard interactiv cu butoane',
          type: 'TEXT',
          duration: 90,
          order: 1,
          content: `# Dashboard Interactiv cu Butoane si Controale

## Arhitectura unui dashboard VBA

Un dashboard profesional are:
1. **Pagina principala** - vizualizari si KPI-uri
2. **Date sursa** - foi ascunse cu date brute
3. **Cod VBA** - logica de actualizare si interactiune
4. **Controale** - butoane, filtre, selectii

## Crearea butoanelor

### Metoda 1: Form Controls (simplu)
1. Developer → Insert → Button
2. Click pe sheet pentru a plasa
3. Atribuie macro

### Metoda 2: ActiveX Controls (mai flexibil)
1. Developer → Insert → Command Button (ActiveX)
2. Design Mode ON pentru a edita
3. Double-click pentru cod

### Metoda 3: Shapes ca butoane (cel mai frumos)
\`\`\`vba
Sub CreareButonShape()
    Dim btn As Shape
    Set btn = ActiveSheet.Shapes.AddShape(msoShapeRoundedRectangle, _
        10, 10, 100, 30)

    With btn
        .Name = "btnActualizeaza"
        .TextFrame2.TextRange.Text = "Actualizeaza"
        .Fill.ForeColor.RGB = RGB(0, 120, 215)
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
        .OnAction = "MacroActualizare"
    End With
End Sub
\`\`\`

## Slicers si filtre dinamice

\`\`\`vba
Sub AdaugaSlicer()
    Dim pt As PivotTable
    Dim sc As SlicerCache

    Set pt = Sheets("Dashboard").PivotTables("PivotVanzari")

    Set sc = ThisWorkbook.SlicerCaches.Add2(pt, "Regiune")
    sc.Slicers.Add Sheets("Dashboard"), , "SlicerRegiune", _
        "Regiune", 300, 10, 150, 200
End Sub

Sub FiltrareRapida(criteriu As String)
    Dim pt As PivotTable
    Set pt = Sheets("Dashboard").PivotTables("PivotVanzari")

    pt.PivotFields("Categorie").CurrentPage = criteriu
End Sub
\`\`\`

## Actualizare automata

\`\`\`vba
Sub ActualizeazaDashboard()
    Application.ScreenUpdating = False

    ' Actualizeaza PivotTables
    Dim pt As PivotTable
    For Each pt In ActiveSheet.PivotTables
        pt.RefreshTable
    Next pt

    ' Actualizeaza KPI-uri calculate
    Dim totalVanzari As Double
    totalVanzari = Application.Sum(Sheets("Date").Range("E:E"))
    Sheets("Dashboard").Range("B3").Value = totalVanzari

    ' Data ultimei actualizari
    Sheets("Dashboard").Range("L1").Value = "Actualizat: " & _
        Format(Now, "DD.MM.YYYY HH:MM")

    Application.ScreenUpdating = True
End Sub

' Actualizare la deschidere
Private Sub Workbook_Open()
    ActualizeazaDashboard
End Sub
\`\`\`

## Mini-charts in celule (Sparklines)

\`\`\`vba
Sub AdaugaSparklines()
    Dim rngData As Range, rngSparkline As Range
    Set rngData = Range("B2:M2")
    Set rngSparkline = Range("N2")

    rngSparkline.SparklineGroups.Add Type:=xlSparkLine, _
        SourceData:=rngData.Address

    With rngSparkline.SparklineGroups(1)
        .SeriesColor.Color = RGB(0, 112, 192)
        .Points.Highpoint.Visible = True
        .Points.Highpoint.Color.Color = RGB(0, 176, 80)
    End With
End Sub
\`\`\`

---
**Key Takeaway:** Un dashboard bine facut se actualizeaza singur si ofera interactivitate fara sa fie nevoie de cunostinte tehnice din partea utilizatorului.`
        },
        {
          title: 'Conectarea la baze de date externe',
          type: 'TEXT',
          duration: 80,
          order: 2,
          content: `# Conectarea la Baze de Date Externe

## De ce sa te conectezi la baze de date

- **Volum mare de date** - Excel are limita de 1M randuri
- **Date actualizate** - citesti mereu ultima versiune
- **Securitate** - datele raman in DB, nu in fisiere locale
- **Multi-user** - mai multi utilizeaza aceleasi date

## Conectarea cu ADO (ActiveX Data Objects)

### Setup initial
\`\`\`vba
' Tools → References → Microsoft ActiveX Data Objects 6.1 Library

Dim conn As ADODB.Connection
Dim rs As ADODB.Recordset
Dim strConn As String
\`\`\`

### Conectare la SQL Server
\`\`\`vba
Sub ConectareSQLServer()
    Dim conn As New ADODB.Connection
    Dim rs As New ADODB.Recordset

    conn.Open "Provider=SQLOLEDB;Data Source=ServerName;" & _
              "Initial Catalog=Database;User ID=user;Password=pass;"

    rs.Open "SELECT * FROM Clienti WHERE Activ=1", conn

    ' Copiaza in Excel
    Sheets("Date").Range("A2").CopyFromRecordset rs

    rs.Close
    conn.Close
End Sub
\`\`\`

### Conectare la Access
\`\`\`vba
strConn = "Provider=Microsoft.ACE.OLEDB.12.0;" & _
          "Data Source=C:\\Data\\Database.accdb;"
\`\`\`

### Conectare la MySQL
\`\`\`vba
strConn = "Driver={MySQL ODBC 8.0 Driver};" & _
          "Server=localhost;Database=test;User=root;Password=pass;"
\`\`\`

## Query cu parametri (previne SQL injection)

\`\`\`vba
Sub QueryCuParametri()
    Dim cmd As New ADODB.Command
    Dim rs As ADODB.Recordset

    cmd.ActiveConnection = conn
    cmd.CommandText = "SELECT * FROM Facturi WHERE ClientID = ?"
    cmd.Parameters.Append cmd.CreateParameter(, adInteger, , , clientId)

    Set rs = cmd.Execute
End Sub
\`\`\`

## Insert/Update date

\`\`\`vba
Sub InsertDate()
    Dim sql As String
    sql = "INSERT INTO Facturi (Client, Valoare, Data) VALUES " & _
          "('" & strClient & "', " & dblValoare & ", '" & _
          Format(dtData, "YYYY-MM-DD") & "')"

    conn.Execute sql
End Sub
\`\`\`

## Power Query ca alternativa

Pentru scenarii mai simple, Power Query (Get & Transform) poate fi mai potrivit:
- Nu necesita cod VBA
- Refresh automat programabil
- Interfata vizuala pentru transformari

\`\`\`vba
' Refresh toate conexiunile Power Query
ThisWorkbook.RefreshAll
\`\`\`

---
**Key Takeaway:** ADO ofera control total, Power Query ofera simplitate. Alege in functie de complexitatea nevoilor.`
        },
        {
          title: 'Best practices si cod mentenabil',
          type: 'TEXT',
          duration: 70,
          order: 3,
          content: `# Best Practices si Cod Mentenabil

## Structura proiectului

### Organizare module
\`\`\`
Modules/
├── modMain          ' Proceduri principale
├── modUtilitati     ' Functii helper
├── modConstante     ' Constante globale
├── modDatabase      ' Conexiuni DB
├── modExport        ' Export PDF/CSV
└── modValidare      ' Validari
\`\`\`

### Modul constante
\`\`\`vba
' modConstante
Public Const TVA_STANDARD As Double = 0.19
Public Const TVA_REDUS As Double = 0.09
Public Const PATH_EXPORT As String = "C:\\Export\\"
Public Const SHEET_DATE As String = "DateSursa"
Public Const SHEET_RAPORT As String = "Raport"
\`\`\`

## Conventii de cod

### Naming conventions
\`\`\`vba
' Variabile - camelCase cu prefix tip
strNume As String
intContor As Integer
dblTotal As Double
boolActiv As Boolean
dtData As Date
rngCelule As Range
wsFoaie As Worksheet
wbFisier As Workbook

' Constante - UPPERCASE
Const MAX_ROWS As Long = 1000000

' Proceduri - PascalCase cu verb
Sub CalculeazaTotaluri()
Sub ExportaRaport()
Function ObtineUltimulRand() As Long
\`\`\`

### Comentarii utile
\`\`\`vba
' MAL - comentariu la fiecare linie
x = x + 1  ' Incrementeaza x

' BINE - comentariu care explica DE CE
' Adaugam 1 pentru a include randul header
ultimRand = ultimRand + 1
\`\`\`

## Principii SOLID pentru VBA

### Single Responsibility
\`\`\`vba
' MAL - face prea multe
Sub ProcesRaport()
    ' Citeste date
    ' Calculeaza
    ' Formateaza
    ' Exporta PDF
    ' Trimite email
End Sub

' BINE - fiecare functie face UN lucru
Sub ProcesRaport()
    Call CitesteDateSursa
    Call CalculeazaTotaluri
    Call FormateazaRaport
    Call ExportaPDF
    Call TrimiteNotificare
End Sub
\`\`\`

### DRY (Don't Repeat Yourself)
\`\`\`vba
' MAL - cod duplicat
Range("A1").Font.Bold = True
Range("A1").Font.Size = 14
Range("A1").Interior.Color = RGB(0, 51, 102)

Range("B5").Font.Bold = True
Range("B5").Font.Size = 14
Range("B5").Interior.Color = RGB(0, 51, 102)

' BINE - functie reutilizabila
Sub FormatHeader(rng As Range)
    With rng
        .Font.Bold = True
        .Font.Size = 14
        .Interior.Color = RGB(0, 51, 102)
    End With
End Sub

Call FormatHeader(Range("A1"))
Call FormatHeader(Range("B5"))
\`\`\`

## Documentatie

### Header modul
\`\`\`vba
'===============================================
' Modul: modRapoarte
' Autor: Nume Prenume
' Data: 2024-12-01
' Scop: Generare rapoarte financiare automate
' Dependente: modUtilitati, modConstante
'===============================================
\`\`\`

### Header procedura
\`\`\`vba
'-----------------------------------------------
' Procedura: GenerareRaportLunar
' Scop: Genereaza raportul financiar lunar
' Parametri:
'   - luna: Integer (1-12)
'   - an: Integer (ex: 2024)
' Returneaza: Boolean (succes/esec)
' Ultima modificare: 2024-12-01 - adaugat export PDF
'-----------------------------------------------
Function GenerareRaportLunar(luna As Integer, an As Integer) As Boolean
\`\`\`

## Checklist inainte de "productie"

- [ ] Option Explicit in toate modulele
- [ ] Error handling in toate procedurile publice
- [ ] ScreenUpdating dezactivat in loop-uri mari
- [ ] Toate constantele in modul dedicat
- [ ] Fara valori hardcoded in cod
- [ ] Comentarii pentru logica complexa
- [ ] Testat cu date reale
- [ ] Backup creat inainte de lansare

---
**Key Takeaway:** Codul bun e codul pe care altcineva (sau tu peste 6 luni) il poate intelege si modifica usor.`
        },
        {
          title: 'Proiect final - Sistem complet de facturare',
          type: 'EXERCISE',
          duration: 120,
          order: 4,
          content: `# Proiect Final: Sistem Complet de Facturare

## Obiectiv

Creeaza un sistem de facturare functional cu:
1. Baza de date clienti si produse
2. Formular de creare facturi (UserForm)
3. Generare automata numar factura
4. Calcul TVA diferentiat (19%/9%/5%)
5. Export PDF
6. Dashboard cu statistici

## Structura fisier Excel

### Sheet "Clienti"
| CUI | Denumire | Adresa | Email | Telefon |
|-----|----------|--------|-------|---------|

### Sheet "Produse"
| Cod | Denumire | UM | Pret | Cota TVA |
|-----|----------|-----|------|----------|

### Sheet "Facturi"
| Nr | Data | Client | Subtotal | TVA | Total | Status |
|----|------|--------|----------|-----|-------|--------|

### Sheet "LiniiFactura"
| Nr Factura | Cod Produs | Cantitate | Pret | Valoare |
|------------|------------|-----------|------|---------|

## Cerinte detaliate

### 1. UserForm Factura Noua
- ComboBox pentru selectie client (populat din sheet)
- ListBox pentru selectie produse
- TextBox pentru cantitati
- Buton "Adauga linie"
- Grila cu liniile facturii
- Afisare total in timp real
- Buton "Salveaza"
- Buton "Anuleaza"

### 2. Generare numar factura
Format: FV-YYYYMM-XXXX (ex: FV-202412-0001)
- Verifica ultimul numar din sheet
- Incrementeaza automat
- Verifica unicitate

### 3. Calcul TVA
- Preia cota TVA din sheet Produse
- Calculeaza per linie
- Totalizeaza corect

### 4. Export PDF
- Template profesional
- Antet firma
- Detalii client
- Tabel produse
- Totaluri
- Salvare in folder dedicat

### 5. Dashboard
- Total facturi luna curenta
- Top 5 clienti
- Grafic evolutie lunara
- Facturi neincasate

## Indicatii implementare

### Structura cod
\`\`\`
modConstante    ' TVA rates, paths, etc.
modUtilitati    ' Helper functions
modFacturi      ' CRUD facturi
modExport       ' PDF generation
modDashboard    ' Dashboard refresh
frmFacturaNoua  ' UserForm
\`\`\`

### Validari necesare
- Client selectat obligatoriu
- Cel putin o linie de factura
- Cantitati pozitive
- Pret valid

### Error handling
- Toate procedurile publice cu On Error
- Logging pentru debugging
- Mesaje user-friendly

## Criterii de evaluare

| Criteriu | Punctaj |
|----------|---------|
| Functionalitate completa | 40% |
| Cod curat si organizat | 20% |
| Error handling | 15% |
| UI/UX UserForm | 15% |
| Documentatie cod | 10% |

## Bonus challenge

- Adauga functionalitate de factura proforma
- Implementeaza reminder pentru facturi restante
- Adauga export in format e-Factura XML (CIUS-RO)

---
**Succes!** Acest proiect integreaza toate conceptele invatate si demonstreaza ca poti construi aplicatii business complete in Excel VBA.`
        }
      ]
    }
  ]
};

export default excelVBACourse;

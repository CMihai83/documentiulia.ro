import { Injectable } from '@nestjs/common';
import { LMSService, Course, CourseModule, Lesson, Assessment, Question } from './lms.service';

// Excel & VBA Course Content Service
// Generates comprehensive course curriculum for Excel fundamentals, pivot tables, VBA, and financial modeling

export interface CourseTemplate {
  title: string;
  description: string;
  shortDescription: string;
  category: 'EXCEL_VBA';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  language: string;
  learningOutcomes: string[];
  targetAudience: string[];
  prerequisites: string[];
  price: number;
  currency: string;
  ceuCredits: number;
  hrdaEligible: boolean;
  modules: ModuleTemplate[];
}

export interface ModuleTemplate {
  title: string;
  description: string;
  isFree?: boolean;
  lessons: LessonTemplate[];
  assessment?: AssessmentTemplate;
}

export interface LessonTemplate {
  title: string;
  description: string;
  type: 'VIDEO' | 'TEXT' | 'DOWNLOAD' | 'QUIZ';
  duration: number;
  isFree?: boolean;
  isPreview?: boolean;
  content: {
    videoUrl?: string;
    textContent?: string;
    downloadUrl?: string;
    downloadFilename?: string;
  };
}

export interface AssessmentTemplate {
  title: string;
  description: string;
  type: 'QUIZ' | 'ASSIGNMENT' | 'PRACTICAL';
  passingScore: number;
  timeLimit?: number;
  questions: Question[];
}

export interface SimulationExercise {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'SPREADSHEET' | 'MACRO' | 'FORMULA' | 'DATA_ANALYSIS' | 'CHART' | 'PIVOT_TABLE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  instructions: string[];
  startingData: string; // JSON or CSV data
  expectedResult: string;
  hints: string[];
  solutionSteps: string[];
  timeEstimate: number; // minutes
  points: number;
  skills: string[];
}

export interface CourseBundle {
  id: string;
  title: string;
  description: string;
  courses: string[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  currency: string;
  certificateName: string;
}

@Injectable()
export class ExcelVBACoursesService {
  // In-memory storage
  private simulations = new Map<string, SimulationExercise>();
  private bundles = new Map<string, CourseBundle>();
  private generatedCourses = new Map<string, string>(); // templateName -> courseId

  constructor(private lmsService: LMSService) {}

  resetState(): void {
    this.simulations.clear();
    this.bundles.clear();
    this.generatedCourses.clear();
  }

  // ===== EXCEL FUNDAMENTALS COURSE =====

  getExcelFundamentalsTemplate(): CourseTemplate {
    return {
      title: 'Excel Fundamentals: From Zero to Productive',
      description: `Curs complet de Excel pentru începători și intermediari. Învățați să lucrați eficient cu foi de calcul, formule, funcții și să creați rapoarte profesionale.

      Acest curs acoperă:
      - Navigarea și formatarea în Excel
      - Formule și funcții esențiale
      - Grafice și vizualizări
      - Gestionarea datelor și filtrare
      - Printing și partajare

      La finalul cursului veți putea automatiza sarcinile repetitive și crea rapoarte clare și profesionale.`,
      shortDescription: 'Stăpânește Excel de la zero - formule, funcții, grafice și rapoarte profesionale',
      category: 'EXCEL_VBA',
      level: 'BEGINNER',
      language: 'ro',
      learningOutcomes: [
        'Navighează eficient în interfața Excel',
        'Creează și formatează tabele profesionale',
        'Folosește formule și funcții esențiale (SUM, AVERAGE, IF, VLOOKUP)',
        'Creează grafice clare și informative',
        'Gestionează și filtrează date mari',
        'Imprimă și partajează foi de calcul',
      ],
      targetAudience: [
        'Angajați care lucrează cu date',
        'Contabili și economiști începători',
        'Studenți și absolvenți',
        'Antreprenori și manageri',
        'Oricine dorește să fie mai productiv',
      ],
      prerequisites: ['Cunoștințe de bază de calculator'],
      price: 199,
      currency: 'RON',
      ceuCredits: 2,
      hrdaEligible: true,
      modules: [
        {
          title: 'Modulul 1: Introducere în Excel',
          description: 'Primii pași în Excel - interfața, navigarea și operațiuni de bază',
          isFree: true,
          lessons: [
            {
              title: '1.1 Ce este Excel și de ce să-l înveți',
              description: 'Introducere în Microsoft Excel și beneficiile automatizării',
              type: 'VIDEO',
              duration: 8,
              isFree: true,
              isPreview: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/1-1-intro.mp4' },
            },
            {
              title: '1.2 Interfața Excel - Ribbon, foi, celule',
              description: 'Explorarea interfeței și elementelor principale',
              type: 'VIDEO',
              duration: 12,
              isFree: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/1-2-interface.mp4' },
            },
            {
              title: '1.3 Navigarea rapidă în foi de calcul',
              description: 'Scurtături și tehnici pentru navigare eficientă',
              type: 'VIDEO',
              duration: 10,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/1-3-navigation.mp4' },
            },
            {
              title: '1.4 Introducerea și editarea datelor',
              description: 'Cum să introduci text, numere și date eficient',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/1-4-data-entry.mp4' },
            },
            {
              title: 'Fișă de lucru: Scurtături Excel',
              description: 'PDF cu cele mai importante scurtături de tastatură',
              type: 'DOWNLOAD',
              duration: 5,
              content: {
                downloadUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/shortcuts-cheatsheet.pdf',
                downloadFilename: 'Excel-Shortcuts-Cheatsheet.pdf',
              },
            },
          ],
          assessment: {
            title: 'Test Modulul 1: Bazele Excel',
            description: 'Verifică-ți cunoștințele despre interfața și navigarea în Excel',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 15,
            questions: [
              {
                id: 'q1-1',
                type: 'MULTIPLE_CHOICE',
                text: 'Care este combinația de taste pentru a salva un fișier Excel?',
                points: 10,
                options: [
                  { id: 'a', text: 'Ctrl + S', isCorrect: true },
                  { id: 'b', text: 'Ctrl + N', isCorrect: false },
                  { id: 'c', text: 'Alt + F4', isCorrect: false },
                  { id: 'd', text: 'Ctrl + P', isCorrect: false },
                ],
                correctAnswer: 'a',
                explanation: 'Ctrl + S este scurtătura universală pentru salvare în majoritatea aplicațiilor.',
              },
              {
                id: 'q1-2',
                type: 'MULTIPLE_CHOICE',
                text: 'Cum se numește intersecția dintre o linie și o coloană?',
                points: 10,
                options: [
                  { id: 'a', text: 'Fereastră', isCorrect: false },
                  { id: 'b', text: 'Celulă', isCorrect: true },
                  { id: 'c', text: 'Tabel', isCorrect: false },
                  { id: 'd', text: 'Registru', isCorrect: false },
                ],
                correctAnswer: 'b',
                explanation: 'Celula este unitatea de bază a foii de calcul, identificată prin adresa sa (ex: A1).',
              },
              {
                id: 'q1-3',
                type: 'TRUE_FALSE',
                text: 'Coloanele în Excel sunt identificate prin litere (A, B, C...)',
                points: 10,
                options: [
                  { id: 't', text: 'Adevărat', isCorrect: true },
                  { id: 'f', text: 'Fals', isCorrect: false },
                ],
                correctAnswer: 't',
                explanation: 'Coloanele sunt marcate cu litere, iar rândurile cu numere.',
              },
            ],
          },
        },
        {
          title: 'Modulul 2: Formatarea și Stilizarea',
          description: 'Transformă datele brute în tabele profesionale și atractive',
          lessons: [
            {
              title: '2.1 Formatarea numerelor și textului',
              description: 'Formate pentru numere, valute, procente și date',
              type: 'VIDEO',
              duration: 14,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/2-1-number-formatting.mp4' },
            },
            {
              title: '2.2 Culori, borduri și fundal',
              description: 'Stilizarea vizuală a tabelelor pentru claritate',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/2-2-colors-borders.mp4' },
            },
            {
              title: '2.3 Stiluri predefinite și teme',
              description: 'Folosește stilurile Excel pentru consistență',
              type: 'VIDEO',
              duration: 10,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/2-3-styles.mp4' },
            },
            {
              title: '2.4 Formatare condiționată',
              description: 'Evidențiază automat datele importante',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/2-4-conditional-formatting.mp4' },
            },
            {
              title: '2.5 Exercițiu practic: Raport de vânzări',
              description: 'Aplică formatarea pe un raport real',
              type: 'TEXT',
              duration: 20,
              content: {
                textContent: `# Exercițiu: Formatarea unui Raport de Vânzări

## Obiectiv
Transformați datele brute de vânzări într-un raport profesional.

## Pași:
1. Descărcați fișierul de exercițiu
2. Aplicați formatare pentru valute în coloana Valoare
3. Adăugați borduri la tabel
4. Folosiți formatare condiționată pentru a evidenția:
   - Vânzările peste 10.000 RON (verde)
   - Vânzările sub 1.000 RON (roșu)
5. Aplicați un stil de tabel predefinit
6. Salvați și comparați cu soluția

## Timp estimat: 20 minute`,
              },
            },
          ],
          assessment: {
            title: 'Test Modulul 2: Formatare',
            description: 'Verifică cunoștințele despre formatare și stilizare',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 10,
            questions: [
              {
                id: 'q2-1',
                type: 'MULTIPLE_CHOICE',
                text: 'Ce funcție îți permite să evidențiezi automat celulele bazat pe valoarea lor?',
                points: 10,
                options: [
                  { id: 'a', text: 'Formatare Text', isCorrect: false },
                  { id: 'b', text: 'Formatare Condiționată', isCorrect: true },
                  { id: 'c', text: 'Validare Date', isCorrect: false },
                  { id: 'd', text: 'Sortare', isCorrect: false },
                ],
                correctAnswer: 'b',
              },
              {
                id: 'q2-2',
                type: 'MULTIPLE_SELECT',
                text: 'Care dintre următoarele sunt formate de numere valide în Excel?',
                points: 15,
                options: [
                  { id: 'a', text: 'General', isCorrect: true },
                  { id: 'b', text: 'Monedă', isCorrect: true },
                  { id: 'c', text: 'Procent', isCorrect: true },
                  { id: 'd', text: 'Imagine', isCorrect: false },
                ],
                correctAnswer: ['a', 'b', 'c'],
              },
            ],
          },
        },
        {
          title: 'Modulul 3: Formule Esențiale',
          description: 'Stăpânește formulele de bază care te fac productiv',
          lessons: [
            {
              title: '3.1 Introducere în formule - operatori și referințe',
              description: 'Bazele formulelor: +, -, *, /, referințe relative și absolute',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/3-1-formulas-intro.mp4' },
            },
            {
              title: '3.2 SUM, AVERAGE, COUNT - funcții de agregare',
              description: 'Calculează sume, medii și contorizează date',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/3-2-sum-average-count.mp4' },
            },
            {
              title: '3.3 MIN, MAX, SUMIF, COUNTIF',
              description: 'Funcții pentru analiza datelor cu condiții',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/3-3-min-max-sumif.mp4' },
            },
            {
              title: '3.4 Funcția IF - logica în Excel',
              description: 'Decizii automate cu IF și IF-uri imbricate',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/3-4-if-function.mp4' },
            },
            {
              title: '3.5 VLOOKUP - căutarea datelor',
              description: 'Caută și extrage date din tabele',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/3-5-vlookup.mp4' },
            },
            {
              title: 'Fișă formule: Sintaxă și exemple',
              description: 'Referință rapidă pentru toate formulele învățate',
              type: 'DOWNLOAD',
              duration: 5,
              content: {
                downloadUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/formulas-reference.pdf',
                downloadFilename: 'Excel-Formulas-Reference.pdf',
              },
            },
          ],
          assessment: {
            title: 'Test Modulul 3: Formule',
            description: 'Testează-ți cunoștințele despre formule și funcții',
            type: 'QUIZ',
            passingScore: 70,
            timeLimit: 20,
            questions: [
              {
                id: 'q3-1',
                type: 'MULTIPLE_CHOICE',
                text: 'Ce simbol folosești pentru a face o referință absolută în Excel?',
                points: 10,
                options: [
                  { id: 'a', text: '&', isCorrect: false },
                  { id: 'b', text: '$', isCorrect: true },
                  { id: 'c', text: '#', isCorrect: false },
                  { id: 'd', text: '@', isCorrect: false },
                ],
                correctAnswer: 'b',
              },
              {
                id: 'q3-2',
                type: 'SHORT_ANSWER',
                text: 'Scrie formula pentru a calcula suma valorilor din celulele A1 până la A10:',
                points: 15,
                correctAnswer: '=SUM(A1:A10)',
              },
              {
                id: 'q3-3',
                type: 'MULTIPLE_CHOICE',
                text: 'Care funcție returnează valoarea maximă dintr-un interval?',
                points: 10,
                options: [
                  { id: 'a', text: 'LARGE', isCorrect: false },
                  { id: 'b', text: 'MAXIMUM', isCorrect: false },
                  { id: 'c', text: 'MAX', isCorrect: true },
                  { id: 'd', text: 'TOP', isCorrect: false },
                ],
                correctAnswer: 'c',
              },
            ],
          },
        },
        {
          title: 'Modulul 4: Grafice și Vizualizări',
          description: 'Transformă numerele în grafice clare și convingătoare',
          lessons: [
            {
              title: '4.1 Tipuri de grafice și când să le folosești',
              description: 'Alegerea graficului potrivit pentru datele tale',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/4-1-chart-types.mp4' },
            },
            {
              title: '4.2 Crearea graficelor - pas cu pas',
              description: 'De la date la vizualizare în câteva click-uri',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/4-2-creating-charts.mp4' },
            },
            {
              title: '4.3 Personalizarea graficelor',
              description: 'Titluri, legende, culori și etichete',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/4-3-customizing-charts.mp4' },
            },
            {
              title: '4.4 Sparklines - mini grafice în celule',
              description: 'Vizualizări compacte pentru tendințe rapide',
              type: 'VIDEO',
              duration: 10,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/4-4-sparklines.mp4' },
            },
          ],
          assessment: {
            title: 'Proiect Practic: Dashboard de Vânzări',
            description: 'Creează un dashboard complet cu grafice',
            type: 'PRACTICAL',
            passingScore: 60,
            questions: [
              {
                id: 'p4-1',
                type: 'FILE_UPLOAD',
                text: 'Încarcă fișierul Excel cu dashboard-ul creat conform instrucțiunilor',
                points: 100,
                rubric: `Criterii de evaluare:
- Grafic pie pentru distribuția vânzărilor pe categorii (20p)
- Grafic linie pentru evoluția lunară (20p)
- Grafic bar pentru top 5 produse (20p)
- Formatare și aspect profesional (20p)
- Sparklines pentru tendințe (20p)`,
              },
            ],
          },
        },
        {
          title: 'Modulul 5: Gestionarea Datelor',
          description: 'Sortare, filtrare și organizarea eficientă a datelor',
          lessons: [
            {
              title: '5.1 Sortarea datelor - simplu și multi-nivel',
              description: 'Organizează datele după unul sau mai multe criterii',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/5-1-sorting.mp4' },
            },
            {
              title: '5.2 Filtrarea datelor cu AutoFilter',
              description: 'Afișează doar datele relevante',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/5-2-filtering.mp4' },
            },
            {
              title: '5.3 Eliminarea duplicatelor',
              description: 'Curăță datele de înregistrări duplicate',
              type: 'VIDEO',
              duration: 8,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/5-3-remove-duplicates.mp4' },
            },
            {
              title: '5.4 Text to Columns și Flash Fill',
              description: 'Separă și transformă date automat',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/5-4-text-to-columns.mp4' },
            },
            {
              title: '5.5 Validarea datelor',
              description: 'Previne erorile la introducerea datelor',
              type: 'VIDEO',
              duration: 14,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/excel-fundamentals/5-5-data-validation.mp4' },
            },
          ],
        },
        {
          title: 'Examen Final',
          description: 'Demonstrează ce ai învățat în acest curs',
          lessons: [
            {
              title: 'Recapitulare și pregătire examen',
              description: 'Rezumat al conceptelor cheie',
              type: 'TEXT',
              duration: 30,
              content: {
                textContent: `# Pregătire pentru Examenul Final

## Subiecte acoperite:
1. **Interfața și navigarea** - Ribbon, celule, foi, scurtături
2. **Formatare** - Numere, culori, stiluri, formatare condiționată
3. **Formule** - SUM, AVERAGE, IF, VLOOKUP, referințe
4. **Grafice** - Tipuri, creare, personalizare
5. **Gestionarea datelor** - Sortare, filtrare, validare

## Sfaturi:
- Recitește notițele de la fiecare modul
- Refă exercițiile practice
- Exersează cu date reale
- Timpul: 45 minute pentru 30 întrebări`,
              },
            },
          ],
          assessment: {
            title: 'Examen Final: Excel Fundamentals',
            description: 'Examen comprehensiv pentru certificare',
            type: 'QUIZ',
            passingScore: 75,
            timeLimit: 45,
            questions: this.generateFinalExamQuestions(),
          },
        },
      ],
    };
  }

  private generateFinalExamQuestions(): Question[] {
    return [
      {
        id: 'final-1',
        type: 'MULTIPLE_CHOICE',
        text: 'Care este extensia standard pentru un fișier Excel?',
        points: 5,
        options: [
          { id: 'a', text: '.doc', isCorrect: false },
          { id: 'b', text: '.xlsx', isCorrect: true },
          { id: 'c', text: '.pdf', isCorrect: false },
          { id: 'd', text: '.csv', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'final-2',
        type: 'MULTIPLE_CHOICE',
        text: 'Ce formulă calculează media valorilor din A1:A10?',
        points: 5,
        options: [
          { id: 'a', text: '=MEDIA(A1:A10)', isCorrect: false },
          { id: 'b', text: '=AVG(A1:A10)', isCorrect: false },
          { id: 'c', text: '=AVERAGE(A1:A10)', isCorrect: true },
          { id: 'd', text: '=MEAN(A1:A10)', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
      {
        id: 'final-3',
        type: 'TRUE_FALSE',
        text: 'Referința $A$1 este o referință absolută care nu se schimbă la copiere.',
        points: 5,
        options: [
          { id: 't', text: 'Adevărat', isCorrect: true },
          { id: 'f', text: 'Fals', isCorrect: false },
        ],
        correctAnswer: 't',
      },
      {
        id: 'final-4',
        type: 'MULTIPLE_CHOICE',
        text: 'Care tip de grafic este cel mai potrivit pentru a arăta procentaje dintr-un total?',
        points: 5,
        options: [
          { id: 'a', text: 'Grafic linie', isCorrect: false },
          { id: 'b', text: 'Grafic pie (cerc)', isCorrect: true },
          { id: 'c', text: 'Grafic scatter', isCorrect: false },
          { id: 'd', text: 'Grafic area', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'final-5',
        type: 'MULTIPLE_CHOICE',
        text: 'Ce face funcția VLOOKUP?',
        points: 10,
        options: [
          { id: 'a', text: 'Validează datele introduse', isCorrect: false },
          { id: 'b', text: 'Caută o valoare în prima coloană și returnează o valoare din aceeași linie', isCorrect: true },
          { id: 'c', text: 'Sortează datele vertical', isCorrect: false },
          { id: 'd', text: 'Vizualizează date în grafic', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'final-6',
        type: 'MULTIPLE_CHOICE',
        text: 'Cum poți aplica același format la mai multe celule simultan?',
        points: 5,
        options: [
          { id: 'a', text: 'Nu este posibil', isCorrect: false },
          { id: 'b', text: 'Format Painter', isCorrect: true },
          { id: 'c', text: 'Doar prin macro', isCorrect: false },
          { id: 'd', text: 'Ctrl + F', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'final-7',
        type: 'MULTIPLE_CHOICE',
        text: 'Ce returnează formula =IF(A1>100,"Mare","Mic") dacă A1=50?',
        points: 10,
        options: [
          { id: 'a', text: 'Mare', isCorrect: false },
          { id: 'b', text: 'Mic', isCorrect: true },
          { id: 'c', text: '50', isCorrect: false },
          { id: 'd', text: 'Eroare', isCorrect: false },
        ],
        correctAnswer: 'b',
      },
      {
        id: 'final-8',
        type: 'MULTIPLE_CHOICE',
        text: 'Care funcție numără celulele care îndeplinesc o condiție?',
        points: 5,
        options: [
          { id: 'a', text: 'COUNT', isCorrect: false },
          { id: 'b', text: 'COUNTA', isCorrect: false },
          { id: 'c', text: 'COUNTIF', isCorrect: true },
          { id: 'd', text: 'SUMIF', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
    ];
  }

  // ===== PIVOT TABLES & DATA ANALYSIS COURSE =====

  getPivotTablesTemplate(): CourseTemplate {
    return {
      title: 'Pivot Tables & Data Analysis Masterclass',
      description: `Curs avansat pentru analiza datelor folosind Pivot Tables, Power Query și tehnici de business intelligence în Excel.

      Vei învăța să:
      - Creezi Pivot Tables complexe în minute
      - Analizezi mii de rânduri de date eficient
      - Folosești Power Query pentru curățarea datelor
      - Creezi dashboards interactive
      - Aplici tehnici de BI direct în Excel`,
      shortDescription: 'Analiză de date profesională cu Pivot Tables și Power Query',
      category: 'EXCEL_VBA',
      level: 'INTERMEDIATE',
      language: 'ro',
      learningOutcomes: [
        'Creează Pivot Tables din orice set de date',
        'Folosește câmpuri calculate și elemente',
        'Aplică grupare și filtrare avansată',
        'Conectează date din surse multiple cu Power Query',
        'Creează dashboards interactive cu Slicers',
        'Analizează tendințe și pattern-uri în date',
      ],
      targetAudience: [
        'Analiști de date',
        'Contabili și financiari',
        'Manageri care lucrează cu rapoarte',
        'Business Analysts',
        'Oricine analizează date regulate',
      ],
      prerequisites: [
        'Excel Fundamentals sau cunoștințe echivalente',
        'Experiență cu formule de bază',
      ],
      price: 299,
      currency: 'RON',
      ceuCredits: 3,
      hrdaEligible: true,
      modules: [
        {
          title: 'Modulul 1: Introducere în Pivot Tables',
          description: 'Bazele Pivot Tables - de la date la insight-uri',
          isFree: true,
          lessons: [
            {
              title: '1.1 Ce sunt Pivot Tables și de ce sunt puternice',
              description: 'Introducere conceptuală și exemple reale',
              type: 'VIDEO',
              duration: 12,
              isFree: true,
              isPreview: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/1-1-intro.mp4' },
            },
            {
              title: '1.2 Pregătirea datelor pentru Pivot Table',
              description: 'Structura corectă a datelor sursă',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/1-2-data-prep.mp4' },
            },
            {
              title: '1.3 Crearea primului Pivot Table',
              description: 'Pas cu pas: de la date la tabel',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/1-3-first-pivot.mp4' },
            },
            {
              title: '1.4 Câmpuri și zone: Rows, Columns, Values, Filters',
              description: 'Înțelege structura Pivot Table',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/1-4-fields-areas.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 2: Tehnici Avansate Pivot Table',
          description: 'Calculări, grupări și formate avansate',
          lessons: [
            {
              title: '2.1 Câmpuri calculate',
              description: 'Adaugă calcule personalizate în Pivot',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/2-1-calculated-fields.mp4' },
            },
            {
              title: '2.2 Elemente calculate',
              description: 'Combină și calculează elemente',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/2-2-calculated-items.mp4' },
            },
            {
              title: '2.3 Gruparea datelor',
              description: 'Grupează date, numere și text',
              type: 'VIDEO',
              duration: 16,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/2-3-grouping.mp4' },
            },
            {
              title: '2.4 Show Values As - procente și comparații',
              description: 'Afișează date ca procent din total, diferență, etc.',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/2-4-show-values-as.mp4' },
            },
            {
              title: '2.5 Pivot Charts',
              description: 'Vizualizează Pivot Tables în grafice dinamice',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/2-5-pivot-charts.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 3: Slicers și Dashboards',
          description: 'Creează dashboards interactive profesionale',
          lessons: [
            {
              title: '3.1 Introducere în Slicers',
              description: 'Filtre vizuale pentru Pivot Tables',
              type: 'VIDEO',
              duration: 14,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/3-1-slicers-intro.mp4' },
            },
            {
              title: '3.2 Timeline pentru date',
              description: 'Filtrează intervale de timp interactiv',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/3-2-timelines.mp4' },
            },
            {
              title: '3.3 Conectarea mai multor Pivot Tables',
              description: 'Un Slicer pentru multiple tabele',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/3-3-connecting-pivots.mp4' },
            },
            {
              title: '3.4 Proiect: Dashboard de Vânzări Interactiv',
              description: 'Construiește un dashboard complet',
              type: 'VIDEO',
              duration: 35,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/3-4-dashboard-project.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 4: Power Query Fundamentals',
          description: 'Importă, curăță și transformă date profesionist',
          lessons: [
            {
              title: '4.1 Ce este Power Query',
              description: 'Introducere în ETL cu Excel',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/4-1-power-query-intro.mp4' },
            },
            {
              title: '4.2 Importarea datelor din diverse surse',
              description: 'CSV, Web, Baze de date, Foldere',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/4-2-import-sources.mp4' },
            },
            {
              title: '4.3 Transformări de bază',
              description: 'Curățare, filtrare, redenumire coloane',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/4-3-basic-transforms.mp4' },
            },
            {
              title: '4.4 Merge și Append Queries',
              description: 'Combină date din surse multiple',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/4-4-merge-append.mp4' },
            },
            {
              title: '4.5 Refresh automat și schedule',
              description: 'Automatizează actualizarea datelor',
              type: 'VIDEO',
              duration: 12,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/pivot-tables/4-5-refresh.mp4' },
            },
          ],
        },
      ],
    };
  }

  // ===== VBA PROGRAMMING COURSE =====

  getVBAProgrammingTemplate(): CourseTemplate {
    return {
      title: 'VBA Programming: Excel Automation Mastery',
      description: `Curs complet de programare VBA pentru automatizarea Excel. De la primele macro-uri până la aplicații complete.

      Vei învăța:
      - Să înregistrezi și editezi macro-uri
      - Sintaxa VBA și structuri de control
      - Să creezi UserForms profesionale
      - Să automatizezi rapoarte și procese
      - Să gestionezi erori și să optimizezi codul`,
      shortDescription: 'Automatizează Excel cu programare VBA - de la zero la avansat',
      category: 'EXCEL_VBA',
      level: 'ADVANCED',
      language: 'ro',
      learningOutcomes: [
        'Înregistrează și editează macro-uri',
        'Scrie cod VBA de la zero',
        'Folosește variabile, bucle și condiții',
        'Creează UserForms interactive',
        'Automatizează rapoarte și procese',
        'Gestionează erori profesionist',
        'Interacționează cu alte aplicații Office',
      ],
      targetAudience: [
        'Utilizatori Excel avansați',
        'Analiști care vor să automatizeze',
        'Contabili cu sarcini repetitive',
        'Oricine vrea să programeze în Excel',
      ],
      prerequisites: [
        'Excel Intermediate sau Pivot Tables course',
        'Nu necesită experiență anterioară în programare',
      ],
      price: 449,
      currency: 'RON',
      ceuCredits: 5,
      hrdaEligible: true,
      modules: [
        {
          title: 'Modulul 1: Introducere în Macro și VBA',
          description: 'Primii pași în automatizarea Excel',
          isFree: true,
          lessons: [
            {
              title: '1.1 Ce sunt Macro-urile și VBA',
              description: 'Introducere și posibilități de automatizare',
              type: 'VIDEO',
              duration: 10,
              isFree: true,
              isPreview: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/1-1-intro.mp4' },
            },
            {
              title: '1.2 Activarea Developer Tab',
              description: 'Configurare Excel pentru VBA',
              type: 'VIDEO',
              duration: 8,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/1-2-developer-tab.mp4' },
            },
            {
              title: '1.3 Înregistrarea primului Macro',
              description: 'Macro Recorder - automatizare fără cod',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/1-3-recording.mp4' },
            },
            {
              title: '1.4 Visual Basic Editor (VBE)',
              description: 'Mediul de dezvoltare VBA',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/1-4-vbe.mp4' },
            },
            {
              title: '1.5 Editarea macro-urilor înregistrate',
              description: 'Înțelege și modifică codul generat',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/1-5-editing-macros.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 2: Fundamente VBA',
          description: 'Sintaxa de bază și concepte fundamentale',
          lessons: [
            {
              title: '2.1 Variabile și tipuri de date',
              description: 'Integer, String, Double, Boolean, Variant',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/2-1-variables.mp4' },
            },
            {
              title: '2.2 Operatori și expresii',
              description: 'Aritmetici, comparație, logici',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/2-2-operators.mp4' },
            },
            {
              title: '2.3 Structuri decizionale: If...Then...Else',
              description: 'Logica condițională în VBA',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/2-3-if-then.mp4' },
            },
            {
              title: '2.4 Select Case',
              description: 'Decizii multiple eficiente',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/2-4-select-case.mp4' },
            },
            {
              title: '2.5 Bucle: For...Next',
              description: 'Repetă acțiuni de un număr cunoscut de ori',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/2-5-for-next.mp4' },
            },
            {
              title: '2.6 Bucle: Do...Loop și For Each',
              description: 'Bucle condiționale și iterare colecții',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/2-6-do-loop.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 3: Lucrul cu Excel Objects',
          description: 'Workbooks, Worksheets, Ranges în VBA',
          lessons: [
            {
              title: '3.1 Object Model Excel',
              description: 'Ierarhia obiectelor Excel',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/3-1-object-model.mp4' },
            },
            {
              title: '3.2 Lucrul cu Workbooks',
              description: 'Deschide, creează, salvează, închide',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/3-2-workbooks.mp4' },
            },
            {
              title: '3.3 Lucrul cu Worksheets',
              description: 'Adaugă, șterge, activează foi',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/3-3-worksheets.mp4' },
            },
            {
              title: '3.4 Lucrul cu Ranges - Partea 1',
              description: 'Selectare, citire, scriere celule',
              type: 'VIDEO',
              duration: 28,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/3-4-ranges-1.mp4' },
            },
            {
              title: '3.5 Lucrul cu Ranges - Partea 2',
              description: 'Proprietăți avansate și metode',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/3-5-ranges-2.mp4' },
            },
            {
              title: '3.6 Utilizarea proprietății Cells',
              description: 'Referințe numerice vs alfa-numerice',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/3-6-cells.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 4: Proceduri și Funcții',
          description: 'Organizează codul în module reutilizabile',
          lessons: [
            {
              title: '4.1 Sub Procedures',
              description: 'Macro-uri ca subrutine',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/4-1-subs.mp4' },
            },
            {
              title: '4.2 Function Procedures',
              description: 'Creează funcții personalizate',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/4-2-functions.mp4' },
            },
            {
              title: '4.3 Parametri și argumente',
              description: 'Transmite date către proceduri',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/4-3-parameters.mp4' },
            },
            {
              title: '4.4 Scope: Public vs Private',
              description: 'Vizibilitatea variabilelor și procedurilor',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/4-4-scope.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 5: UserForms',
          description: 'Creează interfețe grafice profesionale',
          lessons: [
            {
              title: '5.1 Introducere în UserForms',
              description: 'Formulare personalizate în Excel',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/5-1-userforms-intro.mp4' },
            },
            {
              title: '5.2 Controale: TextBox, Label, CommandButton',
              description: 'Elemente de bază ale formularelor',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/5-2-basic-controls.mp4' },
            },
            {
              title: '5.3 Controale: ComboBox, ListBox, CheckBox',
              description: 'Elemente de selecție',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/5-3-selection-controls.mp4' },
            },
            {
              title: '5.4 Evenimente UserForm',
              description: 'Initialize, Click, Change, Activate',
              type: 'VIDEO',
              duration: 28,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/5-4-events.mp4' },
            },
            {
              title: '5.5 Proiect: Formular de Introducere Date',
              description: 'Construiește un formular complet',
              type: 'VIDEO',
              duration: 45,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/5-5-form-project.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 6: Error Handling și Debugging',
          description: 'Scrie cod robust și rezolvă probleme',
          lessons: [
            {
              title: '6.1 Tipuri de erori în VBA',
              description: 'Syntax, Runtime, Logic errors',
              type: 'VIDEO',
              duration: 15,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/6-1-error-types.mp4' },
            },
            {
              title: '6.2 On Error statements',
              description: 'GoTo, Resume, Resume Next',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/6-2-on-error.mp4' },
            },
            {
              title: '6.3 Debugging tools',
              description: 'Breakpoints, Watch, Immediate Window',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/6-3-debugging.mp4' },
            },
            {
              title: '6.4 Best practices pentru cod robust',
              description: 'Tehnici pentru cod care nu cade',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/6-4-best-practices.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 7: Proiecte Reale',
          description: 'Aplică tot ce ai învățat în proiecte practice',
          lessons: [
            {
              title: '7.1 Proiect: Automatizare Raport Lunar',
              description: 'Generare automată rapoarte din date',
              type: 'VIDEO',
              duration: 40,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/7-1-monthly-report.mp4' },
            },
            {
              title: '7.2 Proiect: Import Date din Multiple Fișiere',
              description: 'Consolidare date automat',
              type: 'VIDEO',
              duration: 35,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/7-2-file-import.mp4' },
            },
            {
              title: '7.3 Proiect: Sistem de Facturare',
              description: 'Aplicație completă de facturare',
              type: 'VIDEO',
              duration: 50,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/7-3-invoicing.mp4' },
            },
            {
              title: '7.4 Proiect: Dashboard Interactiv cu VBA',
              description: 'Dashboard cu butoane și automatizări',
              type: 'VIDEO',
              duration: 45,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/vba/7-4-dashboard.mp4' },
            },
          ],
        },
      ],
    };
  }

  // ===== FINANCIAL MODELING COURSE =====

  getFinancialModelingTemplate(): CourseTemplate {
    return {
      title: 'Financial Modeling in Excel',
      description: `Curs de modelare financiară pentru profesioniști în finanțe, contabilitate și analiză de afaceri.

      Vei învăța să:
      - Construiești modele financiare de la zero
      - Analizezi scenarii și sensibilitate
      - Creezi modele DCF și evaluare
      - Dezvolți bugete și forecasts
      - Prezinți rezultate profesionist`,
      shortDescription: 'Modelare financiară profesională pentru analiză și decizii de business',
      category: 'EXCEL_VBA',
      level: 'EXPERT',
      language: 'ro',
      learningOutcomes: [
        'Construiește modele financiare de 3 statements',
        'Aplică tehnici de analiză DCF',
        'Creează analize de sensibilitate',
        'Dezvoltă bugete și previziuni',
        'Folosește funcții financiare avansate',
        'Prezintă modele profesionist',
      ],
      targetAudience: [
        'Analiști financiari',
        'Contabili seniori',
        'CFO și manageri financiari',
        'Consultanți de business',
        'Absolvenți economie/finanțe',
      ],
      prerequisites: [
        'Pivot Tables & Data Analysis course',
        'Cunoștințe de bază de contabilitate',
        'Înțelegere a situațiilor financiare',
      ],
      price: 599,
      currency: 'RON',
      ceuCredits: 6,
      hrdaEligible: true,
      modules: [
        {
          title: 'Modulul 1: Fundamente Modelare Financiară',
          description: 'Principii și best practices pentru modele robuste',
          isFree: true,
          lessons: [
            {
              title: '1.1 Ce este modelarea financiară',
              description: 'Introducere și aplicații practice',
              type: 'VIDEO',
              duration: 15,
              isFree: true,
              isPreview: true,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/1-1-intro.mp4' },
            },
            {
              title: '1.2 Structura unui model financiar',
              description: 'Input, Calculation, Output sections',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/1-2-structure.mp4' },
            },
            {
              title: '1.3 Best practices și convenții',
              description: 'Formate, culori, documentație',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/1-3-best-practices.mp4' },
            },
            {
              title: '1.4 Funcții financiare cheie',
              description: 'NPV, IRR, PMT, PV, FV',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/1-4-financial-functions.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 2: Modelul 3 Statements',
          description: 'Income Statement, Balance Sheet, Cash Flow integrat',
          lessons: [
            {
              title: '2.1 Income Statement Model',
              description: 'Construcție pas cu pas',
              type: 'VIDEO',
              duration: 35,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/2-1-income-statement.mp4' },
            },
            {
              title: '2.2 Balance Sheet Model',
              description: 'Active, pasive, capitaluri proprii',
              type: 'VIDEO',
              duration: 40,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/2-2-balance-sheet.mp4' },
            },
            {
              title: '2.3 Cash Flow Statement',
              description: 'Operațional, investiții, finanțare',
              type: 'VIDEO',
              duration: 35,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/2-3-cash-flow.mp4' },
            },
            {
              title: '2.4 Integrarea celor 3 situații',
              description: 'Conectarea și reconcilierea',
              type: 'VIDEO',
              duration: 30,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/2-4-integration.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 3: DCF și Evaluare',
          description: 'Discounted Cash Flow și metode de evaluare',
          lessons: [
            {
              title: '3.1 Fundamentele DCF',
              description: 'Valoarea prezentă a cash flow-urilor viitoare',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/3-1-dcf-basics.mp4' },
            },
            {
              title: '3.2 Calcularea WACC',
              description: 'Weighted Average Cost of Capital',
              type: 'VIDEO',
              duration: 28,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/3-2-wacc.mp4' },
            },
            {
              title: '3.3 Terminal Value',
              description: 'Perpetuity growth și exit multiple',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/3-3-terminal-value.mp4' },
            },
            {
              title: '3.4 Proiect: Model DCF Complet',
              description: 'Construcție end-to-end',
              type: 'VIDEO',
              duration: 50,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/3-4-dcf-project.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 4: Analiză de Scenarii și Sensibilitate',
          description: 'Testează robustețea modelelor tale',
          lessons: [
            {
              title: '4.1 Analiza What-If',
              description: 'Scenario Manager și Goal Seek',
              type: 'VIDEO',
              duration: 20,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/4-1-what-if.mp4' },
            },
            {
              title: '4.2 Data Tables pentru sensibilitate',
              description: 'Analiză uni și bi-variată',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/4-2-data-tables.mp4' },
            },
            {
              title: '4.3 Monte Carlo în Excel',
              description: 'Simulări probabilistice',
              type: 'VIDEO',
              duration: 30,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/4-3-monte-carlo.mp4' },
            },
          ],
        },
        {
          title: 'Modulul 5: Budgetare și Forecasting',
          description: 'Planificare financiară și previziuni',
          lessons: [
            {
              title: '5.1 Principii de budgetare',
              description: 'Top-down vs bottom-up',
              type: 'VIDEO',
              duration: 18,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/5-1-budgeting-principles.mp4' },
            },
            {
              title: '5.2 Model de buget operațional',
              description: 'Venituri, costuri, marje',
              type: 'VIDEO',
              duration: 35,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/5-2-operational-budget.mp4' },
            },
            {
              title: '5.3 Rolling Forecasts',
              description: 'Previziuni dinamice actualizate',
              type: 'VIDEO',
              duration: 25,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/5-3-rolling-forecast.mp4' },
            },
            {
              title: '5.4 Variance Analysis',
              description: 'Analiza abaterilor actual vs buget',
              type: 'VIDEO',
              duration: 22,
              content: { videoUrl: 'https://cdn.documentiulia.ro/courses/financial-modeling/5-4-variance.mp4' },
            },
          ],
        },
      ],
    };
  }

  // ===== COURSE GENERATION =====

  async generateCourse(template: CourseTemplate, instructorId: string): Promise<Course> {
    // Create the course
    const course = await this.lmsService.createCourse({
      title: template.title,
      description: template.description,
      shortDescription: template.shortDescription,
      instructorId,
      category: template.category,
      level: template.level,
      language: template.language,
      learningOutcomes: template.learningOutcomes,
      targetAudience: template.targetAudience,
      prerequisites: template.prerequisites,
      price: template.price,
      currency: template.currency,
      ceuCredits: template.ceuCredits,
      hrdaEligible: template.hrdaEligible,
      certificateEnabled: true,
    });

    // Add modules and lessons
    for (const moduleTemplate of template.modules) {
      const module = await this.lmsService.addModule(course.id, {
        title: moduleTemplate.title,
        description: moduleTemplate.description,
        isFree: moduleTemplate.isFree,
      });

      for (const lessonTemplate of moduleTemplate.lessons) {
        await this.lmsService.addLesson(module.id, {
          title: lessonTemplate.title,
          description: lessonTemplate.description,
          type: lessonTemplate.type,
          content: {
            videoUrl: lessonTemplate.content.videoUrl,
            textContent: lessonTemplate.content.textContent,
            downloadUrl: lessonTemplate.content.downloadUrl,
            downloadFilename: lessonTemplate.content.downloadFilename,
          },
          duration: lessonTemplate.duration,
          isFree: lessonTemplate.isFree,
          isPreview: lessonTemplate.isPreview,
        });
      }

      // Add module assessment if defined
      if (moduleTemplate.assessment) {
        const assessment = await this.lmsService.createAssessment({
          courseId: course.id,
          moduleId: module.id,
          title: moduleTemplate.assessment.title,
          description: moduleTemplate.assessment.description,
          type: moduleTemplate.assessment.type,
          questions: moduleTemplate.assessment.questions,
          passingScore: moduleTemplate.assessment.passingScore,
          maxAttempts: 3,
          timeLimit: moduleTemplate.assessment.timeLimit,
        });

        await this.lmsService.publishAssessment(assessment.id);
      }
    }

    return course;
  }

  async generateAllExcelCourses(instructorId: string): Promise<{
    fundamentals: Course;
    pivotTables: Course;
    vba: Course;
    financialModeling: Course;
  }> {
    const fundamentals = await this.generateCourse(this.getExcelFundamentalsTemplate(), instructorId);
    const pivotTables = await this.generateCourse(this.getPivotTablesTemplate(), instructorId);
    const vba = await this.generateCourse(this.getVBAProgrammingTemplate(), instructorId);
    const financialModeling = await this.generateCourse(this.getFinancialModelingTemplate(), instructorId);

    // Store course IDs
    this.generatedCourses.set('excel-fundamentals', fundamentals.id);
    this.generatedCourses.set('pivot-tables', pivotTables.id);
    this.generatedCourses.set('vba-programming', vba.id);
    this.generatedCourses.set('financial-modeling', financialModeling.id);

    return { fundamentals, pivotTables, vba, financialModeling };
  }

  // ===== SIMULATION EXERCISES =====

  async createSimulationExercise(data: Omit<SimulationExercise, 'id'>): Promise<SimulationExercise> {
    const id = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const exercise: SimulationExercise = { id, ...data };
    this.simulations.set(id, exercise);
    return exercise;
  }

  async getSimulationExercise(id: string): Promise<SimulationExercise | null> {
    return this.simulations.get(id) || null;
  }

  async getSimulationsForModule(moduleId: string): Promise<SimulationExercise[]> {
    return Array.from(this.simulations.values())
      .filter(s => s.moduleId === moduleId);
  }

  async getSimulationsForCourse(courseId: string): Promise<SimulationExercise[]> {
    return Array.from(this.simulations.values())
      .filter(s => s.courseId === courseId);
  }

  // ===== COURSE BUNDLES =====

  async createCourseBundle(data: {
    title: string;
    description: string;
    courses: string[];
    bundlePrice: number;
    currency: string;
    certificateName: string;
  }): Promise<CourseBundle> {
    const id = `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate original price
    let originalPrice = 0;
    for (const courseId of data.courses) {
      const course = await this.lmsService.getCourse(courseId);
      if (course) {
        originalPrice += course.price;
      }
    }

    const bundle: CourseBundle = {
      id,
      title: data.title,
      description: data.description,
      courses: data.courses,
      originalPrice,
      bundlePrice: data.bundlePrice,
      savings: originalPrice - data.bundlePrice,
      currency: data.currency,
      certificateName: data.certificateName,
    };

    this.bundles.set(id, bundle);
    return bundle;
  }

  async getCourseBundle(id: string): Promise<CourseBundle | null> {
    return this.bundles.get(id) || null;
  }

  async listCourseBundles(): Promise<CourseBundle[]> {
    return Array.from(this.bundles.values());
  }

  // ===== REFERENCE DATA =====

  getExcelSkillLevels(): { level: string; description: string; courses: string[] }[] {
    return [
      {
        level: 'Beginner',
        description: 'No prior Excel experience required',
        courses: ['Excel Fundamentals'],
      },
      {
        level: 'Intermediate',
        description: 'Comfortable with basic Excel operations',
        courses: ['Pivot Tables & Data Analysis'],
      },
      {
        level: 'Advanced',
        description: 'Ready to automate and program',
        courses: ['VBA Programming'],
      },
      {
        level: 'Expert',
        description: 'Professional financial analysis',
        courses: ['Financial Modeling'],
      },
    ];
  }

  getCourseRecommendations(userId: string): { courseId: string; reason: string }[] {
    // In production, this would analyze user's completed courses and suggest next steps
    return [
      { courseId: this.generatedCourses.get('excel-fundamentals') || '', reason: 'Start your Excel journey here' },
      { courseId: this.generatedCourses.get('pivot-tables') || '', reason: 'Take your analysis skills to the next level' },
    ];
  }
}

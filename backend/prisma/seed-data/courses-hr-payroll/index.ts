// HR/Payroll Romania Masterclass - Complete Course
// Combines all 4 modules into a comprehensive HR training program

import { hrModule1 } from './module-1-fundamentals';
import { hrModule2 } from './module-2-payroll';
import { hrModule3 } from './module-3-procedures';
import { hrModule4 } from './module-4-digital';

export const hrPayrollRomaniaCourse = {
  title: 'HR & Payroll Romania Masterclass - Ghid Complet 2024-2025',
  slug: 'hr-payroll-romania-masterclass',
  description: `Cursul definitiv de Resurse Umane si Salarizare pentru Romania.

De la Codul Muncii la REVISAL, de la calculul salariilor la declaratii fiscale,
de la proceduri de angajare la digitalizarea HR - tot ce trebuie sa stii pentru
a gestiona profesionist departamentul HR al oricarei companii din Romania.

Acest curs acopera:
- Legislatia muncii (Codul Muncii, HG-uri, OUG-uri)
- Contractul individual de munca - redactare si modificare
- REVISAL - registrul electronic de evidenta
- Salarizare completa - calcul brut-net, contributii, sporuri
- Concedii si absente - toate tipurile
- Declaratii fiscale - D112, D205 pas cu pas
- Proceduri HR - angajare, incetare, disciplina
- SSM - securitate si sanatate in munca
- Relatii cu institutiile statului
- Software HR si automatizari
- People Analytics si raportare
- Tendinte HR 2025 si viitorul muncii

Creat de experti HR cu peste 15 ani experienta in companii romanesti si multinationale.`,

  shortDescription: 'Curs complet de HR si salarizare pentru Romania - legislatie, calcul salarii, REVISAL, declaratii fiscale, proceduri si digitalizare.',

  category: 'HR_COMPLIANCE',
  level: 'INTERMEDIATE',
  duration: 900, // 15 ore total
  price: 249,
  currency: 'RON',

  thumbnail: '/images/courses/hr-payroll-romania.jpg',

  instructor: {
    name: 'Echipa DocumentIulia',
    bio: 'Experti HR si contabilitate cu experienta in companii romanesti si multinationale',
    avatar: '/images/instructors/documentiulia-team.jpg'
  },

  features: [
    '15+ ore de continut educational',
    '16 lectii detaliate cu exemple practice',
    'Modele de documente descarcabile',
    'Formule de calcul in TypeScript/Excel',
    'Exercitii practice dupa fiecare lectie',
    'Actualizat pentru legislatia 2024-2025',
    'Acces pe viata la continut',
    'Certificat de absolvire'
  ],

  targetAudience: [
    'Specialisti HR la inceput de cariera',
    'Contabili care gestioneaza si salarizarea',
    'Antreprenori care vor sa inteleaga HR-ul',
    'Manageri care supervizeaza echipe',
    'Oricine doreste o cariera in HR'
  ],

  prerequisites: [
    'Cunostinte de baza despre mediul de afaceri',
    'Acces la un calculator pentru exercitii',
    'Dorinta de a invata si aplica'
  ],

  modules: [
    {
      ...hrModule1,
      lessons: hrModule1.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    },
    {
      ...hrModule2,
      lessons: hrModule2.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    },
    {
      ...hrModule3,
      lessons: hrModule3.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    },
    {
      ...hrModule4,
      lessons: hrModule4.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    }
  ]
};

// Re-export individual modules for flexibility
export { hrModule1, hrModule2, hrModule3, hrModule4 };

// Export type for the course structure
export type HRPayrollCourse = typeof hrPayrollRomaniaCourse;

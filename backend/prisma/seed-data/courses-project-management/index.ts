// Project Management Masterclass - Complete Course
// Combines all 3 modules into a comprehensive PM training program

import { pmModule1 } from './module-1-fundamentals';
import { pmModule2 } from './module-2-planning';
import { pmModule3 } from './module-3-execution';

export const projectManagementCourse = {
  title: 'Project Management Masterclass - De la Initiere la Inchidere',
  slug: 'project-management-masterclass',
  description: `Cursul complet de Management de Proiecte pentru profesionisti.

De la conceptele fundamentale la tehnici avansate de planificare si executie,
acest curs va transforma modul in care gestionati proiectele. Bazat pe cele
mai respectate metodologii din industrie: PMI/PMBOK, PRINCE2, Agile/Scrum.

Acest curs acopera:
- Fundamentele managementului de proiect
- Ciclul de viata al proiectelor
- Metodologii: Waterfall, Agile, PRINCE2, PMI
- Initierea proiectului si Project Charter
- Analiza stakeholderilor
- WBS (Work Breakdown Structure)
- Tehnici de estimare (Analogica, Parametrica, PERT)
- Grafice Gantt si Drumul Critic (CPM)
- Bugetare si Earned Value Management
- Managementul riscurilor
- Controlul schimbarilor
- Comunicarea si raportarea
- Inchiderea proiectului si Lessons Learned

Include exemple practice, template-uri si exercitii pentru aplicare imediata.`,

  shortDescription: 'Curs complet de Project Management - metodologii PMI, PRINCE2, Agile, planificare, executie si inchidere proiecte.',

  category: 'PROJECT_MANAGEMENT',
  level: 'INTERMEDIATE',
  duration: 720, // 12 ore total
  price: 199,
  currency: 'RON',

  thumbnail: '/images/courses/project-management.jpg',

  instructor: {
    name: 'Echipa DocumentIulia',
    bio: 'Profesionisti certificati PMP si PRINCE2 cu experienta in proiecte complexe',
    avatar: '/images/instructors/documentiulia-team.jpg'
  },

  features: [
    '12+ ore de continut educational',
    '11 lectii detaliate cu exemple practice',
    'Template-uri descarcabile (Charter, WBS, Registru Riscuri)',
    'Exemple de cod TypeScript pentru automatizari',
    'Exercitii practice dupa fiecare lectie',
    'Pregatire pentru certificari PMP, PRINCE2',
    'Acces pe viata la continut',
    'Certificat de absolvire'
  ],

  targetAudience: [
    'Manageri de proiect la inceput de cariera',
    'Team leads care gestioneaza proiecte',
    'Antreprenori care vor sa-si structureze proiectele',
    'Profesionisti IT in tranzitie spre management',
    'Oricine pregateste certificari PM'
  ],

  prerequisites: [
    'Experienta de lucru in echipa',
    'Notiuni de baza despre organizatii',
    'Dorinta de a invata si aplica'
  ],

  modules: [
    {
      ...pmModule1,
      lessons: pmModule1.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    },
    {
      ...pmModule2,
      lessons: pmModule2.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    },
    {
      ...pmModule3,
      lessons: pmModule3.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    }
  ]
};

// Re-export individual modules for flexibility
export { pmModule1, pmModule2, pmModule3 };

// Export type for the course structure
export type ProjectManagementCourse = typeof projectManagementCourse;

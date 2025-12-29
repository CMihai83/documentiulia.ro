// Freelancer Romania Complete Guide
// Combines all modules into a comprehensive freelancing guide

import { freelancerModule1 } from './module-1-getting-started';
import { freelancerModule2 } from './module-2-clients-marketing';

export const freelancerRomaniaCourse = {
  title: 'Freelancer Romania - Ghid Complet 2025',
  slug: 'freelancer-romania-ghid-complet',
  description: `Ghidul definitiv pentru freelanceri in Romania.

Tot ce trebuie sa stii pentru a incepe si a dezvolta o cariera de succes
ca freelancer: de la inregistrarea PFA pana la gasirea clientilor si
scalarea afacerii tale.

Acest curs acopera:
- Forme juridice pentru freelanceri (PFA, II, SRL)
- Inregistrarea PFA pas cu pas
- Taxe si contributii - calcul complet
- Alegerea sistemului de impozitare
- Facturare profesionala si contracte
- e-Factura si relatia cu ANAF
- Construirea brandului personal
- Platforme de freelancing
- Strategii de marketing si outreach
- Gestionarea relatiilor cu clientii
- Stabilirea preturilor
- Finante personale si crestere

Include modele de documente, contracte, facturi si template-uri de comunicare.`,

  shortDescription: 'Ghid complet pentru freelanceri in Romania - PFA, taxe, facturare, gasire clienti si dezvoltare business.',

  category: 'FREELANCER_GUIDE',
  level: 'BEGINNER',
  duration: 480, // 8 ore total
  price: 149,
  currency: 'RON',

  thumbnail: '/images/courses/freelancer-romania.jpg',

  instructor: {
    name: 'Echipa DocumentIulia',
    bio: 'Experti in fiscalitate si antreprenoriat pentru freelanceri',
    avatar: '/images/instructors/documentiulia-team.jpg'
  },

  features: [
    '8+ ore de continut educational',
    '7 lectii detaliate cu exemple practice',
    'Modele de contracte si facturi',
    'Template-uri de comunicare',
    'Calculatoare taxe integrate',
    'Actualizat pentru legislatia 2025',
    'Acces pe viata la continut',
    'Certificat de absolvire'
  ],

  targetAudience: [
    'Persoane care vor sa devina freelanceri',
    'Freelanceri la inceput de drum',
    'Angajati care vor venituri suplimentare',
    'Antreprenori solo',
    'Profesionisti IT, design, marketing'
  ],

  prerequisites: [
    'Dorinta de a lucra independent',
    'Competente profesionale intr-un domeniu',
    'Acces la calculator si internet'
  ],

  modules: [
    {
      ...freelancerModule1,
      lessons: freelancerModule1.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    },
    {
      ...freelancerModule2,
      lessons: freelancerModule2.lessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1
      }))
    }
  ]
};

// Re-export individual modules for flexibility
export { freelancerModule1, freelancerModule2 };

// Export type for the course structure
export type FreelancerRomaniaCourse = typeof freelancerRomaniaCourse;

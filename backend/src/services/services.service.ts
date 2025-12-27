import { Injectable, Logger } from '@nestjs/common';
import { SrlRegistrationService } from './srl-registration.service';
import { PfaRegistrationService } from './pfa-registration.service';

/**
 * Main Services Service
 *
 * Aggregates all business registration services for DocumentIulia.ro
 */
@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private srlRegistration: SrlRegistrationService,
    private pfaRegistration: PfaRegistrationService,
  ) {}

  /**
   * Get available service packages
   */
  getServicePackages() {
    return {
      srl: {
        name: 'Înființare SRL',
        description: 'Societate cu Răspundere Limitată - Pachet complet de înregistrare',
        basePrice: 299, // EUR
        currency: 'EUR',
        features: [
          'Verificare disponibilitate denumire',
          'Generare Act Constitutiv',
          'Generare Act de Înființare',
          'Declarații administrator',
          'Convenție între asociați (dacă e cazul)',
          'Trimitere dosar la ONRC',
          'Urmărire status până la emitere certificat',
          'Suport telefonic și email',
        ],
        requirements: [
          'Minimum 1 asociat (maxim 50)',
          'Capital social minimum 200 RON',
          'Minimum 1 administrator',
          'Sediu social valid',
          'Activități CAEN valide',
        ],
        processingTime: '5-7 zile lucrătoare',
        successRate: '99.2%',
      },
      srlD: {
        name: 'Înființare SRL-D (asociat unic)',
        description: 'SRL cu asociat unic - Ideal pentru antreprenori individuali',
        basePrice: 279, // EUR
        currency: 'EUR',
        features: [
          'Toate beneficiile pachetului SRL',
          'Simplificat pentru un singur asociat',
          'Fără convenție între asociați',
        ],
        requirements: [
          '1 asociat unic',
          'Capital social minimum 200 RON',
          'Minimum 1 administrator',
        ],
        processingTime: '5-7 zile lucrătoare',
        successRate: '99.5%',
      },
      pfa: {
        name: 'Înregistrare PFA',
        description: 'Persoană Fizică Autorizată - Cea mai rapidă formă de business',
        basePrice: 99, // EUR
        currency: 'EUR',
        features: [
          'Completare declarație D020',
          'Verificare date',
          'Trimitere la ANAF',
          'Urmărire status până la alocare CUI',
          'Ghid activități post-înregistrare',
          'Suport telefonic și email',
        ],
        requirements: [
          'Cetățenie română sau permis de ședere valid',
          'Carte de identitate valabilă',
          'Adresă de domiciliu',
          'Activități CAEN valide',
        ],
        processingTime: '1-3 zile lucrătoare',
        successRate: '99.8%',
      },
      addons: [
        {
          name: 'Consultant juridic dedicat',
          price: 150,
          description: '2 ore de consultanță juridică personalizată',
        },
        {
          name: 'Înregistrare spațiu comercial',
          price: 30,
          description: 'Documentație pentru înregistrare spațiu comercial',
        },
        {
          name: 'Asociați adițional (peste 3)',
          price: 20,
          description: 'Per asociat adițional în SRL',
        },
        {
          name: 'Activități CAEN adiționale (peste 3)',
          price: 10,
          description: 'Per activitate CAEN adițională',
        },
      ],
    };
  }

  /**
   * Get testimonials and success stories
   */
  getTestimonials() {
    return [
      {
        name: 'Adrian P.',
        company: 'TechSolutions SRL',
        rating: 5,
        text: 'Am înființat SRL-ul în doar 6 zile! Procesul a fost extrem de simplu și transparent. Recomand cu încredere!',
        date: '2025-12-15',
      },
      {
        name: 'Maria G.',
        company: 'Creative Design PFA',
        rating: 5,
        text: 'Înregistrarea PFA a durat doar 2 zile. Suportul a fost excelent, am primit răspuns la toate întrebările.',
        date: '2025-12-10',
      },
      {
        name: 'Ionuț M.',
        company: 'Consulting Partners SRL',
        rating: 5,
        text: 'Documentele generate automat au fost perfecte, ONRC nu a cerut nicio completare. Mulțumesc echipei DocumentIulia!',
        date: '2025-11-28',
      },
    ];
  }

  /**
   * Get FAQ for services
   */
  getFAQ() {
    return [
      {
        question: 'Cât durează procesul de înregistrare?',
        answer: 'Pentru SRL: 5-7 zile lucrătoare de la trimiterea dosarului la ONRC. Pentru PFA: 1-3 zile lucrătoare de la depunerea declarației D020 la ANAF.',
      },
      {
        question: 'Ce documente am nevoie pentru SRL?',
        answer: 'Aveți nevoie de: CI-uri ale asociaților, CI-uri ale administratorilor, documentul de proprietate/chirie pentru sediul social. Restul documentelor le generăm noi automat.',
      },
      {
        question: 'Pot modifica datele după trimitere?',
        answer: 'Datele pot fi modificate doar dacă dosarul este în status DRAFT (înainte de trimitere). După trimitere, modificările necesită retragerea dosarului.',
      },
      {
        question: 'Ce se întâmplă dacă denumirea nu este disponibilă?',
        answer: 'Sistemul nostru verifică automat disponibilitatea și oferă sugestii alternative. Puteți introduce până la 3 denumiri (principală + 2 alternative).',
      },
      {
        question: 'Includ taxele ONRC/ANAF în preț?',
        answer: 'Nu, taxele statului (ONRC/ANAF) se plătesc separat. Prețurile noastre includ doar serviciile DocumentIulia.ro (generare documente, consultanță, urmărire status).',
      },
    ];
  }
}

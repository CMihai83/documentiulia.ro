import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tier } from '@prisma/client';

// Consulting service types
export type ConsultingServiceType =
  | 'accounting_setup'        // Initial accounting system setup
  | 'tax_planning'           // Tax optimization consulting
  | 'audit_preparation'      // Audit preparation assistance
  | 'financial_review'       // Financial statement review
  | 'compliance_check'       // Regulatory compliance check
  | 'saga_migration'         // SAGA system migration
  | 'anaf_integration'       // ANAF/SPV integration support
  | 'custom_reports'         // Custom reporting setup
  | 'training_session'       // Platform training session
  | 'efactura_setup'         // e-Factura onboarding
  | 'saft_optimization'      // SAF-T D406 optimization
  | 'hr_compliance'          // HR/Revisal compliance
  | 'payroll_setup'          // Payroll system configuration
  | 'vat_analysis';          // VAT optimization analysis

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'partially_refunded';

// Service package definitions
export interface ConsultingPackage {
  id: string;
  type: ConsultingServiceType;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  durationMinutes: number;
  priceRon: number;
  priceEur: number;
  category: 'accounting' | 'tax' | 'compliance' | 'technical' | 'training';
  features: string[];
  featuresRo: string[];
  deliverables: string[];
  deliverablesRo: string[];
  requiredTier: Tier;
  isPopular?: boolean;
  isNew?: boolean;
}

// Booking interface
export interface ConsultingBooking {
  id: string;
  organizationId: string;
  userId: string;
  packageId: string;
  package: ConsultingPackage;
  consultantId?: string;
  consultantName?: string;
  scheduledAt: Date;
  endTime: Date;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  notes?: string;
  meetingLink?: string;
  attachments?: string[];
  feedback?: ConsultingFeedback;
  createdAt: Date;
  updatedAt: Date;
}

// Feedback interface
export interface ConsultingFeedback {
  rating: number;
  comment?: string;
  wouldRecommend: boolean;
  submittedAt: Date;
}

// Invoice for consulting
export interface ConsultingInvoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  issuedAt: Date;
  dueDate: Date;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  pdfUrl?: string;
}

// Consultant availability slot
export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  consultantId?: string;
  consultantName?: string;
}

// Booking statistics
export interface ConsultingStats {
  totalBookings: number;
  completedBookings: number;
  upcomingBookings: number;
  totalRevenue: number;
  averageRating: number;
  popularServices: { type: ConsultingServiceType; count: number }[];
}

@Injectable()
export class ConsultingService {
  private readonly logger = new Logger(ConsultingService.name);

  // In-memory storage for bookings (would be in DB in production)
  private bookings: Map<string, ConsultingBooking> = new Map();
  private bookingCounter = 1000;

  // Consulting packages
  private readonly packages: Map<string, ConsultingPackage> = new Map([
    ['pkg_accounting_setup', {
      id: 'pkg_accounting_setup',
      type: 'accounting_setup',
      name: 'Accounting System Setup',
      nameRo: 'Configurare Sistem Contabil',
      description: 'Complete setup of your accounting system with chart of accounts, templates, and workflows',
      descriptionRo: 'Configurare completă a sistemului contabil cu plan de conturi, șabloane și fluxuri de lucru',
      durationMinutes: 120,
      priceRon: 599,
      priceEur: 120,
      category: 'accounting',
      features: [
        'Chart of accounts configuration',
        'Invoice templates setup',
        'Automated workflow creation',
        'Data import assistance',
      ],
      featuresRo: [
        'Configurare plan de conturi',
        'Configurare șabloane factură',
        'Creare fluxuri automate',
        'Asistență import date',
      ],
      deliverables: [
        'Configured accounting system',
        'Custom invoice templates',
        'Documentation guide',
      ],
      deliverablesRo: [
        'Sistem contabil configurat',
        'Șabloane factură personalizate',
        'Ghid documentație',
      ],
      requiredTier: Tier.FREE,
      isPopular: true,
    }],
    ['pkg_tax_planning', {
      id: 'pkg_tax_planning',
      type: 'tax_planning',
      name: 'Tax Planning Consultation',
      nameRo: 'Consultanță Planificare Fiscală',
      description: 'Strategic tax planning session to optimize your tax position within Romanian regulations',
      descriptionRo: 'Sesiune strategică de planificare fiscală pentru optimizarea poziției fiscale în cadrul reglementărilor românești',
      durationMinutes: 90,
      priceRon: 799,
      priceEur: 160,
      category: 'tax',
      features: [
        'Tax structure analysis',
        'Deduction optimization',
        'VAT strategy review',
        'Compliance check',
      ],
      featuresRo: [
        'Analiză structură fiscală',
        'Optimizare deduceri',
        'Revizuire strategie TVA',
        'Verificare conformitate',
      ],
      deliverables: [
        'Tax optimization report',
        'Action plan',
        'Compliance checklist',
      ],
      deliverablesRo: [
        'Raport optimizare fiscală',
        'Plan de acțiune',
        'Lista conformitate',
      ],
      requiredTier: Tier.PRO,
      isPopular: true,
    }],
    ['pkg_efactura_setup', {
      id: 'pkg_efactura_setup',
      type: 'efactura_setup',
      name: 'e-Factura Onboarding',
      nameRo: 'Configurare e-Factura',
      description: 'Complete e-Factura setup including SPV integration and workflow configuration',
      descriptionRo: 'Configurare completă e-Factura incluzând integrare SPV și configurare flux de lucru',
      durationMinutes: 60,
      priceRon: 399,
      priceEur: 80,
      category: 'compliance',
      features: [
        'SPV account setup',
        'Certificate installation',
        'UBL template configuration',
        'Test submission walkthrough',
      ],
      featuresRo: [
        'Configurare cont SPV',
        'Instalare certificat',
        'Configurare șablon UBL',
        'Ghid trimitere test',
      ],
      deliverables: [
        'Working e-Factura integration',
        'Process documentation',
        'Troubleshooting guide',
      ],
      deliverablesRo: [
        'Integrare e-Factura funcțională',
        'Documentație proces',
        'Ghid depanare',
      ],
      requiredTier: Tier.FREE,
      isNew: true,
    }],
    ['pkg_saft_optimization', {
      id: 'pkg_saft_optimization',
      type: 'saft_optimization',
      name: 'SAF-T D406 Optimization',
      nameRo: 'Optimizare SAF-T D406',
      description: 'Optimize your SAF-T D406 reporting process for ANAF compliance per Order 1783/2021',
      descriptionRo: 'Optimizare proces raportare SAF-T D406 pentru conformitate ANAF conform Ordinului 1783/2021',
      durationMinutes: 90,
      priceRon: 699,
      priceEur: 140,
      category: 'compliance',
      features: [
        'Data mapping review',
        'Validation error resolution',
        'Automated submission setup',
        'Monthly reporting optimization',
      ],
      featuresRo: [
        'Revizuire mapare date',
        'Rezolvare erori validare',
        'Configurare trimitere automată',
        'Optimizare raportare lunară',
      ],
      deliverables: [
        'Validated SAF-T configuration',
        'Error-free test submission',
        'Monthly checklist',
      ],
      deliverablesRo: [
        'Configurare SAF-T validată',
        'Trimitere test fără erori',
        'Lista verificare lunară',
      ],
      requiredTier: Tier.PRO,
    }],
    ['pkg_saga_migration', {
      id: 'pkg_saga_migration',
      type: 'saga_migration',
      name: 'SAGA Migration Support',
      nameRo: 'Asistență Migrare SAGA',
      description: 'Expert assistance for migrating from SAGA v3.2 or integrating SAGA data',
      descriptionRo: 'Asistență expertă pentru migrarea de la SAGA v3.2 sau integrarea datelor SAGA',
      durationMinutes: 180,
      priceRon: 999,
      priceEur: 200,
      category: 'technical',
      features: [
        'Data export from SAGA',
        'Data mapping and transformation',
        'Import validation',
        'Parallel running support',
      ],
      featuresRo: [
        'Export date din SAGA',
        'Mapare și transformare date',
        'Validare import',
        'Suport rulare paralelă',
      ],
      deliverables: [
        'Migrated data',
        'Migration report',
        'Reconciliation documentation',
      ],
      deliverablesRo: [
        'Date migrate',
        'Raport migrare',
        'Documentație reconciliere',
      ],
      requiredTier: Tier.BUSINESS,
    }],
    ['pkg_hr_compliance', {
      id: 'pkg_hr_compliance',
      type: 'hr_compliance',
      name: 'HR & Revisal Compliance',
      nameRo: 'Conformitate HR & Revisal',
      description: 'Ensure full compliance with Romanian labor laws and Revisal reporting requirements',
      descriptionRo: 'Asigurare conformitate deplină cu legislația muncii din România și cerințele raportării Revisal',
      durationMinutes: 120,
      priceRon: 849,
      priceEur: 170,
      category: 'compliance',
      features: [
        'Contract template review',
        'Revisal integration check',
        'Leave policy compliance',
        'Payroll configuration audit',
      ],
      featuresRo: [
        'Revizuire șabloane contracte',
        'Verificare integrare Revisal',
        'Conformitate politică concedii',
        'Audit configurare salarizare',
      ],
      deliverables: [
        'Compliance audit report',
        'Updated contract templates',
        'HR checklist',
      ],
      deliverablesRo: [
        'Raport audit conformitate',
        'Șabloane contracte actualizate',
        'Lista verificare HR',
      ],
      requiredTier: Tier.PRO,
    }],
    ['pkg_training_basic', {
      id: 'pkg_training_basic',
      type: 'training_session',
      name: 'Platform Training - Basic',
      nameRo: 'Training Platformă - Bază',
      description: '1-hour training session covering platform essentials and best practices',
      descriptionRo: 'Sesiune training de 1 oră acoperind esențialele platformei și cele mai bune practici',
      durationMinutes: 60,
      priceRon: 299,
      priceEur: 60,
      category: 'training',
      features: [
        'Platform navigation',
        'Invoice management basics',
        'Document upload and OCR',
        'Q&A session',
      ],
      featuresRo: [
        'Navigare platformă',
        'Baze gestiune facturi',
        'Încărcare documente și OCR',
        'Sesiune întrebări și răspunsuri',
      ],
      deliverables: [
        'Recording of session',
        'Quick reference guide',
      ],
      deliverablesRo: [
        'Înregistrare sesiune',
        'Ghid referință rapidă',
      ],
      requiredTier: Tier.FREE,
    }],
    ['pkg_training_advanced', {
      id: 'pkg_training_advanced',
      type: 'training_session',
      name: 'Platform Training - Advanced',
      nameRo: 'Training Platformă - Avansat',
      description: '2-hour advanced training covering analytics, integrations, and automation',
      descriptionRo: 'Training avansat de 2 ore acoperind analiză, integrări și automatizare',
      durationMinutes: 120,
      priceRon: 499,
      priceEur: 100,
      category: 'training',
      features: [
        'Advanced analytics',
        'API integration setup',
        'Automation workflows',
        'Custom reports creation',
      ],
      featuresRo: [
        'Analiză avansată',
        'Configurare integrare API',
        'Fluxuri automatizare',
        'Creare rapoarte personalizate',
      ],
      deliverables: [
        'Recording of session',
        'Advanced user guide',
        'Sample automation templates',
      ],
      deliverablesRo: [
        'Înregistrare sesiune',
        'Ghid utilizator avansat',
        'Șabloane automatizare exemplu',
      ],
      requiredTier: Tier.PRO,
    }],
    ['pkg_financial_review', {
      id: 'pkg_financial_review',
      type: 'financial_review',
      name: 'Financial Statement Review',
      nameRo: 'Revizuire Situații Financiare',
      description: 'Comprehensive review of your financial statements with improvement recommendations',
      descriptionRo: 'Revizuire comprehensivă a situațiilor financiare cu recomandări de îmbunătățire',
      durationMinutes: 180,
      priceRon: 1499,
      priceEur: 300,
      category: 'accounting',
      features: [
        'Balance sheet analysis',
        'P&L review',
        'Cash flow assessment',
        'Ratio analysis',
      ],
      featuresRo: [
        'Analiză bilanț',
        'Revizuire cont profit și pierdere',
        'Evaluare flux numerar',
        'Analiză indicatori',
      ],
      deliverables: [
        'Financial review report',
        'Key metrics dashboard',
        'Improvement recommendations',
      ],
      deliverablesRo: [
        'Raport revizuire financiară',
        'Tablou indicatori cheie',
        'Recomandări îmbunătățire',
      ],
      requiredTier: Tier.BUSINESS,
      isPopular: true,
    }],
    ['pkg_vat_analysis', {
      id: 'pkg_vat_analysis',
      type: 'vat_analysis',
      name: 'VAT Optimization Analysis',
      nameRo: 'Analiză Optimizare TVA',
      description: 'Detailed VAT analysis per Legea 141/2025 with optimization strategies for 21%/11% rates',
      descriptionRo: 'Analiză detaliată TVA conform Legea 141/2025 cu strategii optimizare pentru cote 21%/11%',
      durationMinutes: 90,
      priceRon: 599,
      priceEur: 120,
      category: 'tax',
      features: [
        'VAT liability review',
        'Rate optimization (21%/11%)',
        'Pro-rata calculation',
        'EU VAT compliance check',
      ],
      featuresRo: [
        'Revizuire obligații TVA',
        'Optimizare cote (21%/11%)',
        'Calcul pro-rata',
        'Verificare conformitate TVA UE',
      ],
      deliverables: [
        'VAT optimization report',
        'Rate application guide',
        'Compliance checklist',
      ],
      deliverablesRo: [
        'Raport optimizare TVA',
        'Ghid aplicare cote',
        'Lista conformitate',
      ],
      requiredTier: Tier.PRO,
      isNew: true,
    }],
    ['pkg_audit_preparation', {
      id: 'pkg_audit_preparation',
      type: 'audit_preparation',
      name: 'Audit Preparation Package',
      nameRo: 'Pachet Pregătire Audit',
      description: 'Complete preparation for financial audit including documentation review and process checks',
      descriptionRo: 'Pregătire completă pentru audit financiar incluzând revizuire documentație și verificări proces',
      durationMinutes: 240,
      priceRon: 1999,
      priceEur: 400,
      category: 'accounting',
      features: [
        'Documentation completeness check',
        'Transaction sampling review',
        'Control testing preparation',
        'Audit trail verification',
      ],
      featuresRo: [
        'Verificare completitudine documentație',
        'Revizuire eșantionare tranzacții',
        'Pregătire testare controale',
        'Verificare trasabilitate audit',
      ],
      deliverables: [
        'Audit readiness report',
        'Documentation checklist',
        'Risk assessment summary',
        'Pre-audit meeting preparation',
      ],
      deliverablesRo: [
        'Raport pregătire audit',
        'Lista verificare documentație',
        'Rezumat evaluare riscuri',
        'Pregătire întâlnire pre-audit',
      ],
      requiredTier: Tier.BUSINESS,
    }],
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all consulting packages
   */
  getAllPackages(): ConsultingPackage[] {
    return Array.from(this.packages.values());
  }

  /**
   * Get packages by category
   */
  getPackagesByCategory(category: string): ConsultingPackage[] {
    return Array.from(this.packages.values()).filter(p => p.category === category);
  }

  /**
   * Get a specific package
   */
  getPackage(packageId: string): ConsultingPackage {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new NotFoundException(`Consulting package ${packageId} not found`);
    }
    return pkg;
  }

  /**
   * Get available packages for a tier
   */
  getPackagesForTier(tier: Tier): ConsultingPackage[] {
    const tierPriority = { [Tier.FREE]: 0, [Tier.PRO]: 1, [Tier.BUSINESS]: 2 };
    const userTierLevel = tierPriority[tier];

    return Array.from(this.packages.values()).filter(pkg => {
      const requiredLevel = tierPriority[pkg.requiredTier];
      return requiredLevel <= userTierLevel;
    });
  }

  /**
   * Check if user can book a package
   */
  async canBookPackage(organizationId: string, packageId: string): Promise<{ canBook: boolean; reason?: string }> {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      return { canBook: false, reason: 'Package not found' };
    }

    // Get organization tier
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { tier: true },
    });

    if (!org) {
      return { canBook: false, reason: 'Organization not found' };
    }

    const tierPriority = { [Tier.FREE]: 0, [Tier.PRO]: 1, [Tier.BUSINESS]: 2 };
    const userTierLevel = tierPriority[org.tier];
    const requiredLevel = tierPriority[pkg.requiredTier];

    if (requiredLevel > userTierLevel) {
      return {
        canBook: false,
        reason: `This package requires ${pkg.requiredTier} tier. Please upgrade your subscription.`
      };
    }

    return { canBook: true };
  }

  /**
   * Get available time slots for booking
   */
  getAvailableSlots(date: string, packageId: string): AvailabilitySlot[] {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new NotFoundException(`Package ${packageId} not found`);
    }

    const slots: AvailabilitySlot[] = [];
    const baseDate = new Date(date);

    // Business hours: 9:00 - 17:00, Mon-Fri
    const dayOfWeek = baseDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return slots; // No slots on weekends
    }

    // Generate hourly slots
    const workStart = 9;
    const workEnd = 17;
    const durationHours = Math.ceil(pkg.durationMinutes / 60);

    for (let hour = workStart; hour <= workEnd - durationHours; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endHour = hour + durationHours;
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;

      // Check if slot is available (mock - would check actual bookings)
      const isBooked = Math.random() > 0.7; // 30% chance of being booked

      slots.push({
        date,
        startTime,
        endTime,
        available: !isBooked,
        consultantId: 'consultant_1',
        consultantName: 'Expert Consultant',
      });
    }

    return slots;
  }

  /**
   * Create a new booking
   */
  async createBooking(
    organizationId: string,
    userId: string,
    packageId: string,
    scheduledAt: Date,
    notes?: string,
    currency: string = 'RON',
  ): Promise<ConsultingBooking> {
    // Validate package access
    const accessCheck = await this.canBookPackage(organizationId, packageId);
    if (!accessCheck.canBook) {
      throw new ForbiddenException(accessCheck.reason);
    }

    const pkg = this.packages.get(packageId)!;
    const amount = currency === 'EUR' ? pkg.priceEur : pkg.priceRon;

    const bookingId = `booking_${++this.bookingCounter}`;
    const endTime = new Date(scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + pkg.durationMinutes);

    const booking: ConsultingBooking = {
      id: bookingId,
      organizationId,
      userId,
      packageId,
      package: pkg,
      scheduledAt,
      endTime,
      status: 'pending',
      paymentStatus: 'pending',
      amount,
      currency,
      notes,
      consultantId: 'consultant_1',
      consultantName: 'Expert Consultant',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bookings.set(bookingId, booking);
    this.logger.log(`Created booking ${bookingId} for org ${organizationId}`);

    return booking;
  }

  /**
   * Get booking by ID
   */
  getBooking(bookingId: string): ConsultingBooking {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    return booking;
  }

  /**
   * Get all bookings for an organization
   */
  getOrganizationBookings(organizationId: string): ConsultingBooking[] {
    return Array.from(this.bookings.values())
      .filter(b => b.organizationId === organizationId)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  /**
   * Get upcoming bookings for an organization
   */
  getUpcomingBookings(organizationId: string): ConsultingBooking[] {
    const now = new Date();
    return this.getOrganizationBookings(organizationId)
      .filter(b => b.scheduledAt > now && b.status !== 'cancelled')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  /**
   * Confirm a booking (after payment)
   */
  confirmBooking(bookingId: string): ConsultingBooking {
    const booking = this.getBooking(bookingId);

    if (booking.status !== 'pending') {
      throw new BadRequestException(`Cannot confirm booking with status ${booking.status}`);
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.meetingLink = `https://meet.documentuilia.ro/consulting/${bookingId}`;
    booking.updatedAt = new Date();

    this.bookings.set(bookingId, booking);
    this.logger.log(`Confirmed booking ${bookingId}`);

    return booking;
  }

  /**
   * Cancel a booking
   */
  cancelBooking(bookingId: string, reason?: string): ConsultingBooking {
    const booking = this.getBooking(bookingId);

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException(`Cannot cancel booking with status ${booking.status}`);
    }

    // Check if cancellation is within 24 hours
    const hoursUntilBooking = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    const canRefund = hoursUntilBooking > 24;

    booking.status = 'cancelled';
    booking.paymentStatus = canRefund && booking.paymentStatus === 'paid' ? 'refunded' : booking.paymentStatus;
    booking.notes = reason ? `${booking.notes || ''}\nCancellation reason: ${reason}` : booking.notes;
    booking.updatedAt = new Date();

    this.bookings.set(bookingId, booking);
    this.logger.log(`Cancelled booking ${bookingId}, refund: ${canRefund}`);

    return booking;
  }

  /**
   * Reschedule a booking
   */
  rescheduleBooking(bookingId: string, newScheduledAt: Date): ConsultingBooking {
    const booking = this.getBooking(bookingId);

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException(`Cannot reschedule booking with status ${booking.status}`);
    }

    const newEndTime = new Date(newScheduledAt);
    newEndTime.setMinutes(newEndTime.getMinutes() + booking.package.durationMinutes);

    booking.scheduledAt = newScheduledAt;
    booking.endTime = newEndTime;
    booking.status = 'rescheduled';
    booking.updatedAt = new Date();

    this.bookings.set(bookingId, booking);
    this.logger.log(`Rescheduled booking ${bookingId} to ${newScheduledAt}`);

    return booking;
  }

  /**
   * Complete a booking
   */
  completeBooking(bookingId: string, deliverables?: string[]): ConsultingBooking {
    const booking = this.getBooking(bookingId);

    if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
      throw new BadRequestException(`Cannot complete booking with status ${booking.status}`);
    }

    booking.status = 'completed';
    if (deliverables) {
      booking.attachments = deliverables;
    }
    booking.updatedAt = new Date();

    this.bookings.set(bookingId, booking);
    this.logger.log(`Completed booking ${bookingId}`);

    return booking;
  }

  /**
   * Submit feedback for a completed booking
   */
  submitFeedback(bookingId: string, rating: number, comment?: string, wouldRecommend: boolean = true): ConsultingBooking {
    const booking = this.getBooking(bookingId);

    if (booking.status !== 'completed') {
      throw new BadRequestException('Can only submit feedback for completed bookings');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    booking.feedback = {
      rating,
      comment,
      wouldRecommend,
      submittedAt: new Date(),
    };
    booking.updatedAt = new Date();

    this.bookings.set(bookingId, booking);
    this.logger.log(`Feedback submitted for booking ${bookingId}: ${rating}/5`);

    return booking;
  }

  /**
   * Generate invoice for a booking
   */
  generateInvoice(bookingId: string): ConsultingInvoice {
    const booking = this.getBooking(bookingId);

    const vatRate = 0.19; // Romanian VAT 19% for services
    const netAmount = booking.amount / (1 + vatRate);
    const vatAmount = booking.amount - netAmount;

    const invoice: ConsultingInvoice = {
      id: `inv_${bookingId}`,
      bookingId,
      invoiceNumber: `CONS-${new Date().getFullYear()}-${bookingId.split('_')[1]}`,
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      amount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: booking.amount,
      currency: booking.currency,
      status: booking.paymentStatus === 'paid' ? 'paid' : 'draft',
    };

    return invoice;
  }

  /**
   * Get consulting statistics for an organization
   */
  getStats(organizationId: string): ConsultingStats {
    const bookings = this.getOrganizationBookings(organizationId);
    const now = new Date();

    const completedBookings = bookings.filter(b => b.status === 'completed');
    const upcomingBookings = bookings.filter(b => b.scheduledAt > now && b.status !== 'cancelled');

    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.amount, 0);
    const ratingsWithFeedback = completedBookings.filter(b => b.feedback);
    const averageRating = ratingsWithFeedback.length > 0
      ? ratingsWithFeedback.reduce((sum, b) => sum + (b.feedback?.rating || 0), 0) / ratingsWithFeedback.length
      : 0;

    // Count by service type
    const serviceCount = new Map<ConsultingServiceType, number>();
    bookings.forEach(b => {
      const current = serviceCount.get(b.package.type) || 0;
      serviceCount.set(b.package.type, current + 1);
    });

    const popularServices = Array.from(serviceCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      upcomingBookings: upcomingBookings.length,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      popularServices,
    };
  }

  /**
   * Get popular packages
   */
  getPopularPackages(): ConsultingPackage[] {
    return Array.from(this.packages.values()).filter(p => p.isPopular);
  }

  /**
   * Get new packages
   */
  getNewPackages(): ConsultingPackage[] {
    return Array.from(this.packages.values()).filter(p => p.isNew);
  }

  /**
   * Get package categories summary
   */
  getCategories(): { category: string; count: number; packages: string[] }[] {
    const categories = new Map<string, ConsultingPackage[]>();

    this.packages.forEach(pkg => {
      const existing = categories.get(pkg.category) || [];
      existing.push(pkg);
      categories.set(pkg.category, existing);
    });

    return Array.from(categories.entries()).map(([category, packages]) => ({
      category,
      count: packages.length,
      packages: packages.map(p => p.id),
    }));
  }
}

/**
 * ANAF TypeScript Types & Interfaces
 *
 * Comprehensive type definitions for all ANAF endpoints:
 * - SPV (Spațiul Privat Virtual)
 * - SAF-T D406 Monthly Reporting
 * - e-Factura B2B/B2C
 * - e-Transport (OUG 41/2022)
 * - Deadline Management
 */

// ============================================
// Common Types
// ============================================

export type SubmissionStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ERROR'
  | 'CANCELLED';

export type CompanyType = 'small' | 'large' | 'non-resident';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================
// ANAF Core Types
// ============================================

export interface CUIValidationResult {
  cui: string;
  valid: boolean;
  companyName?: string;
  address?: string;
  vatPayer?: boolean;
  registrationDate?: string;
}

export interface DeadlineInfo {
  currentPeriod: string;
  nextDeadline: Date;
  daysRemaining: number;
  isOverdue: boolean;
  gracePeriod?: {
    active: boolean;
    start: Date;
    end: Date;
    description: string;
  };
}

// ============================================
// SPV Types
// ============================================

export interface SpvOAuthUrl {
  authUrl: string;
  state: string;
  redirectUri: string;
}

export interface SpvConnectionStatus {
  connected: boolean;
  cui?: string;
  companyName?: string;
  connectedAt?: Date;
  tokenExpiresAt?: Date;
  features: {
    efactura: boolean;
    saft: boolean;
    eTransport: boolean;
  };
}

export interface SpvDashboard {
  connection: SpvConnectionStatus;
  stats: {
    submissionsTotal: number;
    submissionsThisMonth: number;
    pendingActions: number;
    unreadMessages: number;
  };
  recentSubmissions: SpvSubmission[];
  deadlines: DeadlineInfo[];
}

export interface SpvMessage {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  relatedSubmissionId?: string;
}

export interface SpvSubmission {
  id: string;
  type: 'EFACTURA' | 'SAFT' | 'E_TRANSPORT';
  status: SubmissionStatus;
  submittedAt: Date;
  uploadIndex?: string;
  reference?: string;
  errorMessage?: string;
  retryCount: number;
  lastCheckedAt?: Date;
}

export interface SubmissionFilter {
  type?: 'EFACTURA' | 'SAFT' | 'E_TRANSPORT';
  status?: SubmissionStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// SAF-T D406 Types
// ============================================

export interface SaftD406GenerationResult {
  success: boolean;
  xml?: string;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  fileSize?: {
    bytes: number;
    mb: number;
    valid: boolean;
  };
}

export interface SaftD406SubmissionResult {
  success: boolean;
  reference?: string;
  submissionId?: string;
  status: SubmissionStatus;
  submittedAt?: Date;
  errors?: string[];
}

export interface SaftD406ComplianceStatus {
  period: string;
  periodStatus: 'pending' | 'submitted' | 'accepted' | 'overdue';
  daysUntilDeadline: number;
  gracePeriodActive: boolean;
  submissionDate?: Date;
  reference?: string;
  complianceScore: number;
}

export interface SaftD406ChecklistItem {
  item: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  required: boolean;
}

export interface SaftD406Checklist {
  ready: boolean;
  score: number;
  checklist: SaftD406ChecklistItem[];
}

export interface SaftD406Report {
  id: string;
  period: string;
  status: SubmissionStatus;
  generatedAt: Date;
  submittedAt?: Date;
  reference?: string;
  fileSize: number;
}

export interface SaftD406Dashboard {
  currentPeriod: {
    period: string;
    compliance: SaftD406ComplianceStatus;
  };
  previousPeriod: {
    period: string;
    compliance: SaftD406ComplianceStatus;
    checklist: SaftD406Checklist;
  };
  submissionStats: {
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
  recentReports: SaftD406Report[];
  deadlines: DeadlineInfo;
  alerts: Alert[];
}

// ============================================
// e-Factura B2B Types
// ============================================

export interface EfacturaB2BInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  partnerName: string;
  partnerCui?: string;
  grossAmount: number;
  currency: string;
  efacturaStatus?: SubmissionStatus;
  efacturaId?: string;
  spvSubmittedAt?: Date;
}

export interface EfacturaB2BValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: { field: string; message: string }[];
  summary: {
    invoiceNumber: string;
    totalErrors: number;
    totalWarnings: number;
    readyForSubmission: boolean;
  };
}

export interface EfacturaB2BReadiness {
  ready: boolean;
  complianceScore: number;
  recommendations: {
    field: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  user: {
    name?: string;
    cui?: string;
  };
}

export interface EfacturaB2BSubmissionResult {
  success: boolean;
  uploadIndex?: string;
  submissionId?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  message?: string;
  errors?: string[];
}

export interface EfacturaB2BDashboard {
  user: {
    company?: string;
    cui?: string;
  };
  spvConnection: {
    connected: boolean;
    features: any;
  };
  stats: {
    monthlyInvoices: number;
    pendingSubmissions: number;
    currentMonth: string;
  };
  readiness: {
    ready: boolean;
    score: number;
    recommendations: any[];
  };
  compliance: any;
  recentSubmissions: any[];
  alerts: Alert[];
}

export interface CreditNoteRequest {
  originalInvoiceId: string;
  creditNoteNumber: string;
  reason: string;
  userId: string;
  linesToCredit?: number[];
}

// ============================================
// e-Factura B2C Types
// ============================================

export type B2CInvoiceType =
  | 'STANDARD'
  | 'SIMPLIFIED'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'SELF_BILLING';

export type ConsumerType = 'INDIVIDUAL' | 'FOREIGN_INDIVIDUAL' | 'NON_VAT_ENTITY';

export interface B2CInvoiceItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  vatRate: number;
  vatCategory: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  productCode?: string;
  ncCode?: string;
  discount?: number;
}

export interface B2CInvoice {
  id?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceType: B2CInvoiceType;
  seller: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
    postalCode?: string;
    vatPayer: boolean;
    tradeRegister?: string;
    iban?: string;
    bank?: string;
    email?: string;
    phone?: string;
  };
  buyer: {
    type: ConsumerType;
    name: string;
    cnp?: string;
    address?: string;
    city?: string;
    country: string;
    email?: string;
    phone?: string;
  };
  items: B2CInvoiceItem[];
  currency: string;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  paymentMethod?: string;
  paymentTerms?: string;
  dueDate?: Date;
  isPaid: boolean;
  notes?: string;
}

export interface B2CSubmissionResult {
  success: boolean;
  invoiceId?: string;
  uploadIndex?: string;
  status?: SubmissionStatus;
  message?: string;
  errors?: string[];
}

export interface VatRate {
  value: number;
  label: string;
  labelRo: string;
  category: string;
  validFrom?: string;
  validUntil?: string;
}

export interface B2CComplianceStatus {
  phase: 'MANDATORY' | 'PREPARATION';
  phaseRo: string;
  mandatoryFrom: string;
  isMandatory: boolean;
  daysUntilMandatory: number;
  requirements: {
    requirement: string;
    fulfilled: boolean;
  }[];
  nextSteps: string[];
}

// ============================================
// e-Transport Types
// ============================================

export type TransportType =
  | 'NATIONAL'
  | 'INTERNATIONAL_IMPORT'
  | 'INTERNATIONAL_EXPORT'
  | 'INTRA_EU';

export type TransportStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type GoodsCategory =
  | 'FRUITS_VEGETABLES'
  | 'MEAT_PRODUCTS'
  | 'CLOTHING_FOOTWEAR'
  | 'BUILDING_MATERIALS'
  | 'ELECTRONICS'
  | 'FUEL'
  | 'ALCOHOL_TOBACCO'
  | 'OTHER';

export interface TransportGoods {
  description: string;
  category: GoodsCategory;
  quantity: number;
  unit: string;
  weight?: number;
  value?: number;
  ncCode?: string;
}

export interface TransportDeclaration {
  id: string;
  declarationType: TransportType;
  status: TransportStatus;
  uit?: string;
  sender: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
  };
  receiver: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
  };
  transport: {
    vehicleRegistration: string;
    trailerRegistration?: string;
    driverName: string;
    driverCNP?: string;
    driverLicense?: string;
    carrierCui?: string;
    carrierName?: string;
  };
  route: {
    startAddress: string;
    startCity: string;
    startCounty: string;
    startCountry: string;
    endAddress: string;
    endCity: string;
    endCounty: string;
    endCountry: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    distance?: number;
  };
  goods: TransportGoods[];
  createdAt: Date;
  submittedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

export interface TransportStatistics {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  byType: Record<TransportType, number>;
  byCategory: Record<GoodsCategory, number>;
}

// ============================================
// Deadline Types
// ============================================

export type DeadlineType =
  | 'SAFT_D406'
  | 'EFACTURA_B2B'
  | 'EFACTURA_B2C'
  | 'E_TRANSPORT'
  | 'VAT_RETURN'
  | 'CUSTOM';

export interface DeadlineConfig {
  type: DeadlineType;
  name: string;
  nameRo: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  reminderDays: number[];
  description: string;
  law: string;
}

export interface DeadlineReminder {
  id: string;
  type: DeadlineType;
  description: string;
  dueDate: Date;
  reminderDays: number[];
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  completed: boolean;
  completedAt?: Date;
  userId?: string;
}

export interface DeadlineSummary {
  upcoming: DeadlineReminder[];
  dueSoon: DeadlineReminder[];
  overdue: DeadlineReminder[];
  completed: DeadlineReminder[];
  counts: {
    total: number;
    upcoming: number;
    dueSoon: number;
    overdue: number;
    completed: number;
  };
}

// ============================================
// Alert Types
// ============================================

export interface Alert {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  actionLabel?: string;
  actionUrl?: string;
}

// ============================================
// Filter & Search Types
// ============================================

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface InvoiceFilter extends DateRangeFilter {
  status?: SubmissionStatus;
  period?: string;
  partnerName?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TransportFilter extends DateRangeFilter {
  status?: TransportStatus;
  type?: TransportType;
  category?: GoodsCategory;
}

// ============================================
// Export Helper Types
// ============================================

export interface ExportOptions {
  format: 'CSV' | 'XLSX' | 'PDF' | 'XML';
  fields?: string[];
  dateRange?: DateRangeFilter;
}

// ============================================
// XML Generation Types
// ============================================

export interface XmlGenerationOptions {
  includeComments?: boolean;
  prettyPrint?: boolean;
  validate?: boolean;
}

export interface XmlPreview {
  xml: string;
  formatted: string;
  fileSize: {
    bytes: number;
    mb: number;
  };
  validation: ValidationResult;
}

// ============================================
// Compliance Types
// ============================================

export interface ComplianceCalendar {
  currentPhase: string;
  phaseRo: string;
  nextDeadline: string;
  timeline: {
    date: string;
    event: string;
    status: 'active' | 'upcoming' | 'past';
  }[];
}

export interface ComplianceScore {
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    weight: number;
  }[];
}

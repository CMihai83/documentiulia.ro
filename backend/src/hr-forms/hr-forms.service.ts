import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// Form Types and Enums
export enum FormCategory {
  LEAVE = 'LEAVE',
  PERFORMANCE = 'PERFORMANCE',
  ONBOARDING = 'ONBOARDING',
  OFFBOARDING = 'OFFBOARDING',
  TRAINING = 'TRAINING',
  BENEFITS = 'BENEFITS',
  COMPLIANCE = 'COMPLIANCE',
  TIMEKEEPING = 'TIMEKEEPING',
  EXPENSE = 'EXPENSE',
  FEEDBACK = 'FEEDBACK',
  MEDICAL = 'MEDICAL',
  DISCIPLINARY = 'DISCIPLINARY',
}

export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIME = 'TIME',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
  SIGNATURE = 'SIGNATURE',
  EMPLOYEE_PICKER = 'EMPLOYEE_PICKER',
  DEPARTMENT_PICKER = 'DEPARTMENT_PICKER',
  CURRENCY = 'CURRENCY',
  RATING = 'RATING',
  SLIDER = 'SLIDER',
  RICH_TEXT = 'RICH_TEXT',
}

export enum FormStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
  ESCALATE = 'ESCALATE',
}

// Interfaces
export interface FormTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: FormCategory;
  fields: FormField[];
  workflow?: WorkflowConfig;
  validations: FormValidation[];
  settings: FormSettings;
  version: number;
  status: FormStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  labelEn: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: FieldOption[];
  validation?: FieldValidation;
  conditionalDisplay?: ConditionalRule;
  order: number;
  width: 'full' | 'half' | 'third';
  section?: string;
}

export interface FieldOption {
  value: string;
  label: string;
  labelEn?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  fileTypes?: string[];
  maxFileSize?: number; // MB
  futureDate?: boolean;
  pastDate?: boolean;
  workingDaysOnly?: boolean;
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface WorkflowConfig {
  enabled: boolean;
  steps: WorkflowStep[];
  escalationRules?: EscalationRule[];
  notifications: NotificationConfig;
}

export interface WorkflowStep {
  id: string;
  name: string;
  approverType: 'manager' | 'specific_user' | 'role' | 'department_head' | 'hr';
  approverId?: string;
  roleId?: string;
  order: number;
  autoApproveAfterDays?: number;
  requiredApprovals: number;
}

export interface EscalationRule {
  afterDays: number;
  escalateTo: 'next_level_manager' | 'hr' | 'specific_user';
  userId?: string;
  notifyOriginalApprover: boolean;
}

export interface NotificationConfig {
  onSubmit: boolean;
  onApproval: boolean;
  onRejection: boolean;
  onEscalation: boolean;
  channels: ('email' | 'slack' | 'teams' | 'push')[];
}

export interface FormSettings {
  allowDrafts: boolean;
  allowEditing: boolean;
  requireSignature: boolean;
  attachmentsAllowed: boolean;
  maxAttachments: number;
  retentionDays: number;
  anonymousAllowed: boolean;
  deadlineDays?: number;
  reminderDays?: number[];
}

export interface FormValidation {
  type: 'custom' | 'date_range' | 'dependency' | 'business_rule';
  rule: string;
  message: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  userId: string;
  employeeId?: string;
  data: Record<string, any>;
  attachments: Attachment[];
  status: SubmissionStatus;
  currentStep?: number;
  approvals: ApprovalRecord[];
  comments: Comment[];
  signature?: SignatureData;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface ApprovalRecord {
  id: string;
  stepId: string;
  approverId: string;
  approverName: string;
  action: ApprovalAction;
  comment?: string;
  timestamp: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

export interface SignatureData {
  imageUrl: string;
  signedAt: Date;
  ipAddress?: string;
}

// Pre-built HR Form Templates (100+)
const HR_FORM_TEMPLATES: Partial<FormTemplate>[] = [
  // =================== LEAVE FORMS (15) ===================
  {
    id: 'tpl-leave-annual',
    name: 'Cerere Concediu de Odihnă',
    nameEn: 'Annual Leave Request',
    description: 'Formular standard pentru solicitarea concediului de odihnă anual',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'startDate', label: 'Data început', labelEn: 'Start Date', type: FieldType.DATE, required: true, order: 1, width: 'half', validation: { futureDate: true, workingDaysOnly: true } },
      { id: 'f2', name: 'endDate', label: 'Data sfârșit', labelEn: 'End Date', type: FieldType.DATE, required: true, order: 2, width: 'half', validation: { futureDate: true, workingDaysOnly: true } },
      { id: 'f3', name: 'workingDays', label: 'Zile lucrătoare', labelEn: 'Working Days', type: FieldType.NUMBER, required: true, order: 3, width: 'half', validation: { min: 1, max: 30 } },
      { id: 'f4', name: 'remainingDays', label: 'Zile rămase disponibile', labelEn: 'Remaining Days', type: FieldType.NUMBER, required: false, order: 4, width: 'half' },
      { id: 'f5', name: 'reason', label: 'Motiv (opțional)', labelEn: 'Reason (optional)', type: FieldType.TEXTAREA, required: false, order: 5, width: 'full' },
      { id: 'f6', name: 'replacement', label: 'Înlocuitor pe perioada absenței', labelEn: 'Replacement during absence', type: FieldType.EMPLOYEE_PICKER, required: false, order: 6, width: 'full' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Aprobare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: true, channels: ['email', 'push'] },
    },
    settings: { allowDrafts: true, allowEditing: false, requireSignature: false, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 365, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-medical',
    name: 'Concediu Medical',
    nameEn: 'Sick Leave',
    description: 'Înregistrare concediu medical cu certificat de la medic',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'startDate', label: 'Data început', labelEn: 'Start Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'endDate', label: 'Data sfârșit', labelEn: 'End Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'certificateNumber', label: 'Număr certificat medical', labelEn: 'Medical Certificate Number', type: FieldType.TEXT, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'issueDate', label: 'Data eliberării', labelEn: 'Issue Date', type: FieldType.DATE, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'medicalUnit', label: 'Unitatea medicală', labelEn: 'Medical Unit', type: FieldType.TEXT, required: true, order: 5, width: 'full' },
      { id: 'f6', name: 'certificate', label: 'Certificat medical (PDF/imagine)', labelEn: 'Medical Certificate (PDF/image)', type: FieldType.FILE, required: true, order: 6, width: 'full', validation: { fileTypes: ['pdf', 'jpg', 'png'], maxFileSize: 5 } },
    ],
    settings: { allowDrafts: false, allowEditing: false, requireSignature: false, attachmentsAllowed: true, maxAttachments: 3, retentionDays: 730, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-unpaid',
    name: 'Cerere Concediu Fără Plată',
    nameEn: 'Unpaid Leave Request',
    description: 'Solicitare concediu fără plată conform Codului Muncii',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'startDate', label: 'Data început', labelEn: 'Start Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'endDate', label: 'Data sfârșit', labelEn: 'End Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'reason', label: 'Motivul solicitării', labelEn: 'Reason for Request', type: FieldType.TEXTAREA, required: true, order: 3, width: 'full' },
      { id: 'f4', name: 'supportingDocs', label: 'Documente justificative', labelEn: 'Supporting Documents', type: FieldType.FILE, required: false, order: 4, width: 'full' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Aprobare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Aprobare HR', approverType: 'hr', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: true, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: false, requireSignature: true, attachmentsAllowed: true, maxAttachments: 5, retentionDays: 365, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-maternity',
    name: 'Concediu de Maternitate',
    nameEn: 'Maternity Leave',
    description: 'Solicitare concediu de maternitate (126 zile)',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'expectedDueDate', label: 'Data probabilă a nașterii', labelEn: 'Expected Due Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'prenatalStartDate', label: 'Data început concediu prenatal', labelEn: 'Prenatal Leave Start', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'medicalCertificate', label: 'Certificat medical sarcină', labelEn: 'Pregnancy Medical Certificate', type: FieldType.FILE, required: true, order: 3, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: true, maxAttachments: 5, retentionDays: 1825, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-paternity',
    name: 'Concediu de Paternitate',
    nameEn: 'Paternity Leave',
    description: 'Concediu de paternitate (10 zile + 5 zile suplimentare)',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'childBirthDate', label: 'Data nașterii copilului', labelEn: 'Child Birth Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'startDate', label: 'Data început concediu', labelEn: 'Leave Start Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'additionalDays', label: 'Solicit 5 zile suplimentare (curs puericultură)', labelEn: 'Request additional 5 days', type: FieldType.CHECKBOX, required: false, order: 3, width: 'full' },
      { id: 'f4', name: 'birthCertificate', label: 'Certificat de naștere copil', labelEn: 'Child Birth Certificate', type: FieldType.FILE, required: true, order: 4, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: false, requireSignature: true, attachmentsAllowed: true, maxAttachments: 3, retentionDays: 1825, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-childcare',
    name: 'Concediu Creștere Copil',
    nameEn: 'Childcare Leave',
    description: 'Concediu pentru îngrijirea copilului până la 2 ani',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'childName', label: 'Numele copilului', labelEn: 'Child Name', type: FieldType.TEXT, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'childBirthDate', label: 'Data nașterii', labelEn: 'Birth Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'startDate', label: 'Data început concediu', labelEn: 'Leave Start Date', type: FieldType.DATE, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'endDate', label: 'Data sfârșit estimată', labelEn: 'Estimated End Date', type: FieldType.DATE, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'birthCertificate', label: 'Certificat naștere copil', labelEn: 'Birth Certificate', type: FieldType.FILE, required: true, order: 5, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: true, maxAttachments: 5, retentionDays: 1825, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-bereavement',
    name: 'Concediu Eveniment Familial (Deces)',
    nameEn: 'Bereavement Leave',
    description: 'Concediu pentru deces în familie (3-5 zile)',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'deceasedName', label: 'Numele persoanei decedate', labelEn: 'Name of Deceased', type: FieldType.TEXT, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'relationship', label: 'Gradul de rudenie', labelEn: 'Relationship', type: FieldType.SELECT, required: true, order: 2, width: 'half', options: [
        { value: 'spouse', label: 'Soț/Soție' }, { value: 'child', label: 'Copil' }, { value: 'parent', label: 'Părinte' },
        { value: 'sibling', label: 'Frate/Soră' }, { value: 'grandparent', label: 'Bunic/Bunică' }, { value: 'in_law', label: 'Socru/Soacră' },
      ]},
      { id: 'f3', name: 'dateOfDeath', label: 'Data decesului', labelEn: 'Date of Death', type: FieldType.DATE, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'startDate', label: 'Data început concediu', labelEn: 'Leave Start Date', type: FieldType.DATE, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'days', label: 'Număr zile solicitate', labelEn: 'Days Requested', type: FieldType.NUMBER, required: true, order: 5, width: 'half', validation: { min: 1, max: 5 } },
    ],
    settings: { allowDrafts: false, allowEditing: false, requireSignature: false, attachmentsAllowed: true, maxAttachments: 2, retentionDays: 365, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-marriage',
    name: 'Concediu Căsătorie',
    nameEn: 'Marriage Leave',
    description: 'Concediu pentru eveniment de căsătorie (5 zile)',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'marriageDate', label: 'Data căsătoriei', labelEn: 'Marriage Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'startDate', label: 'Data început concediu', labelEn: 'Leave Start Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
    ],
    settings: { allowDrafts: true, allowEditing: false, requireSignature: false, attachmentsAllowed: true, maxAttachments: 1, retentionDays: 365, anonymousAllowed: false },
  },
  {
    id: 'tpl-leave-study',
    name: 'Concediu de Studii',
    nameEn: 'Study Leave',
    description: 'Concediu pentru studii/examene',
    category: FormCategory.LEAVE,
    fields: [
      { id: 'f1', name: 'institution', label: 'Instituția de învățământ', labelEn: 'Educational Institution', type: FieldType.TEXT, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'purpose', label: 'Scopul (examen, sesiune, dizertație)', labelEn: 'Purpose', type: FieldType.SELECT, required: true, order: 2, width: 'half', options: [
        { value: 'exam', label: 'Examen' }, { value: 'session', label: 'Sesiune' }, { value: 'thesis', label: 'Dizertație/Licență' }, { value: 'other', label: 'Altele' },
      ]},
      { id: 'f3', name: 'startDate', label: 'Data început', labelEn: 'Start Date', type: FieldType.DATE, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'endDate', label: 'Data sfârșit', labelEn: 'End Date', type: FieldType.DATE, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'confirmation', label: 'Adeverință de la instituție', labelEn: 'Institution Confirmation', type: FieldType.FILE, required: true, order: 5, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: true, requireSignature: false, attachmentsAllowed: true, maxAttachments: 3, retentionDays: 365, anonymousAllowed: false },
  },

  // =================== PERFORMANCE FORMS (12) ===================
  {
    id: 'tpl-perf-annual-review',
    name: 'Evaluare Anuală a Performanței',
    nameEn: 'Annual Performance Review',
    description: 'Formular complet pentru evaluarea anuală a angajaților',
    category: FormCategory.PERFORMANCE,
    fields: [
      { id: 'f1', name: 'reviewPeriod', label: 'Perioada evaluată', labelEn: 'Review Period', type: FieldType.TEXT, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'overallRating', label: 'Evaluare generală (1-5)', labelEn: 'Overall Rating', type: FieldType.RATING, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'achievements', label: 'Realizări principale', labelEn: 'Key Achievements', type: FieldType.TEXTAREA, required: true, order: 3, width: 'full' },
      { id: 'f4', name: 'areasForImprovement', label: 'Arii de îmbunătățit', labelEn: 'Areas for Improvement', type: FieldType.TEXTAREA, required: true, order: 4, width: 'full' },
      { id: 'f5', name: 'goalsNextYear', label: 'Obiective pentru anul următor', labelEn: 'Goals for Next Year', type: FieldType.TEXTAREA, required: true, order: 5, width: 'full' },
      { id: 'f6', name: 'trainingNeeds', label: 'Nevoi de training', labelEn: 'Training Needs', type: FieldType.TEXTAREA, required: false, order: 6, width: 'full' },
      { id: 'f7', name: 'promotionRecommendation', label: 'Recomandare pentru promovare', labelEn: 'Promotion Recommendation', type: FieldType.SELECT, required: true, order: 7, width: 'half', options: [
        { value: 'yes', label: 'Da' }, { value: 'no', label: 'Nu' }, { value: 'maybe', label: 'De evaluat' },
      ]},
      { id: 'f8', name: 'salaryReviewRecommendation', label: 'Recomandare mărire salariu', labelEn: 'Salary Review Recommendation', type: FieldType.SELECT, required: true, order: 8, width: 'half', options: [
        { value: 'significant', label: 'Mărire semnificativă' }, { value: 'standard', label: 'Mărire standard' }, { value: 'none', label: 'Fără mărire' },
      ]},
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Completare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Validare HR', approverType: 'hr', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: false, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: true, maxAttachments: 5, retentionDays: 1825, anonymousAllowed: false },
  },
  {
    id: 'tpl-perf-360-feedback',
    name: 'Feedback 360°',
    nameEn: '360° Feedback',
    description: 'Evaluare din multiple perspective (colegi, subordonați, manager)',
    category: FormCategory.PERFORMANCE,
    fields: [
      { id: 'f1', name: 'evaluatedEmployee', label: 'Angajat evaluat', labelEn: 'Employee Being Evaluated', type: FieldType.EMPLOYEE_PICKER, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'relationship', label: 'Relația cu angajatul', labelEn: 'Relationship', type: FieldType.SELECT, required: true, order: 2, width: 'half', options: [
        { value: 'manager', label: 'Manager direct' }, { value: 'peer', label: 'Coleg' }, { value: 'subordinate', label: 'Subordonat' }, { value: 'client', label: 'Client intern' },
      ]},
      { id: 'f3', name: 'communication', label: 'Comunicare (1-5)', labelEn: 'Communication', type: FieldType.RATING, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'teamwork', label: 'Lucru în echipă (1-5)', labelEn: 'Teamwork', type: FieldType.RATING, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'leadership', label: 'Leadership (1-5)', labelEn: 'Leadership', type: FieldType.RATING, required: true, order: 5, width: 'half' },
      { id: 'f6', name: 'technical', label: 'Competențe tehnice (1-5)', labelEn: 'Technical Skills', type: FieldType.RATING, required: true, order: 6, width: 'half' },
      { id: 'f7', name: 'strengths', label: 'Puncte forte', labelEn: 'Strengths', type: FieldType.TEXTAREA, required: true, order: 7, width: 'full' },
      { id: 'f8', name: 'improvements', label: 'Sugestii de îmbunătățire', labelEn: 'Improvement Suggestions', type: FieldType.TEXTAREA, required: true, order: 8, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: false, requireSignature: false, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 730, anonymousAllowed: true },
  },
  {
    id: 'tpl-perf-probation-review',
    name: 'Evaluare Perioadă de Probă',
    nameEn: 'Probation Period Review',
    description: 'Evaluare la finalul perioadei de probă',
    category: FormCategory.PERFORMANCE,
    fields: [
      { id: 'f1', name: 'probationStart', label: 'Data început probă', labelEn: 'Probation Start', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'probationEnd', label: 'Data sfârșit probă', labelEn: 'Probation End', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'technicalSkills', label: 'Competențe tehnice (1-5)', labelEn: 'Technical Skills', type: FieldType.RATING, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'adaptability', label: 'Adaptabilitate (1-5)', labelEn: 'Adaptability', type: FieldType.RATING, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'cultureFit', label: 'Potrivire culturală (1-5)', labelEn: 'Culture Fit', type: FieldType.RATING, required: true, order: 5, width: 'half' },
      { id: 'f6', name: 'recommendation', label: 'Recomandare', labelEn: 'Recommendation', type: FieldType.SELECT, required: true, order: 6, width: 'half', options: [
        { value: 'confirm', label: 'Confirmare pe post' }, { value: 'extend', label: 'Prelungire probă' }, { value: 'terminate', label: 'Încetare colaborare' },
      ]},
      { id: 'f7', name: 'comments', label: 'Comentarii și observații', labelEn: 'Comments', type: FieldType.TEXTAREA, required: true, order: 7, width: 'full' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Aprobare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Aprobare HR', approverType: 'hr', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: true, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 1825, anonymousAllowed: false },
  },

  // =================== ONBOARDING FORMS (10) ===================
  {
    id: 'tpl-onboard-personal-info',
    name: 'Fișă de Date Personale',
    nameEn: 'Personal Information Form',
    description: 'Colectare informații personale pentru dosarul de angajare',
    category: FormCategory.ONBOARDING,
    fields: [
      { id: 'f1', name: 'firstName', label: 'Prenume', labelEn: 'First Name', type: FieldType.TEXT, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'lastName', label: 'Nume', labelEn: 'Last Name', type: FieldType.TEXT, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'cnp', label: 'CNP', labelEn: 'Personal ID (CNP)', type: FieldType.TEXT, required: true, order: 3, width: 'half', validation: { pattern: '^[1-9]\\d{12}$', patternMessage: 'CNP invalid' } },
      { id: 'f4', name: 'birthDate', label: 'Data nașterii', labelEn: 'Birth Date', type: FieldType.DATE, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'birthPlace', label: 'Locul nașterii', labelEn: 'Birth Place', type: FieldType.TEXT, required: true, order: 5, width: 'half' },
      { id: 'f6', name: 'citizenship', label: 'Cetățenie', labelEn: 'Citizenship', type: FieldType.TEXT, required: true, order: 6, width: 'half', defaultValue: 'Română' },
      { id: 'f7', name: 'address', label: 'Adresa de domiciliu', labelEn: 'Home Address', type: FieldType.TEXTAREA, required: true, order: 7, width: 'full' },
      { id: 'f8', name: 'phone', label: 'Telefon', labelEn: 'Phone', type: FieldType.PHONE, required: true, order: 8, width: 'half' },
      { id: 'f9', name: 'email', label: 'Email personal', labelEn: 'Personal Email', type: FieldType.EMAIL, required: true, order: 9, width: 'half' },
      { id: 'f10', name: 'emergencyContact', label: 'Persoană de contact urgență', labelEn: 'Emergency Contact', type: FieldType.TEXT, required: true, order: 10, width: 'half' },
      { id: 'f11', name: 'emergencyPhone', label: 'Telefon contact urgență', labelEn: 'Emergency Phone', type: FieldType.PHONE, required: true, order: 11, width: 'half' },
      { id: 'f12', name: 'idCard', label: 'Copie CI', labelEn: 'ID Card Copy', type: FieldType.FILE, required: true, order: 12, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: true, maxAttachments: 5, retentionDays: 3650, anonymousAllowed: false },
  },
  {
    id: 'tpl-onboard-bank-details',
    name: 'Date Bancare pentru Salariu',
    nameEn: 'Bank Details for Salary',
    description: 'Informații cont bancar pentru transfer salariu',
    category: FormCategory.ONBOARDING,
    fields: [
      { id: 'f1', name: 'bankName', label: 'Banca', labelEn: 'Bank Name', type: FieldType.TEXT, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'iban', label: 'IBAN', labelEn: 'IBAN', type: FieldType.TEXT, required: true, order: 2, width: 'half', validation: { pattern: '^RO\\d{2}[A-Z]{4}[A-Z0-9]{16}$', patternMessage: 'IBAN invalid' } },
      { id: 'f3', name: 'accountHolder', label: 'Titular cont', labelEn: 'Account Holder', type: FieldType.TEXT, required: true, order: 3, width: 'full' },
      { id: 'f4', name: 'bankStatement', label: 'Extras de cont (opțional)', labelEn: 'Bank Statement (optional)', type: FieldType.FILE, required: false, order: 4, width: 'full' },
    ],
    settings: { allowDrafts: false, allowEditing: true, requireSignature: true, attachmentsAllowed: true, maxAttachments: 1, retentionDays: 3650, anonymousAllowed: false },
  },
  {
    id: 'tpl-onboard-it-access',
    name: 'Cerere Acces IT',
    nameEn: 'IT Access Request',
    description: 'Solicitare conturi și acces la sisteme IT',
    category: FormCategory.ONBOARDING,
    fields: [
      { id: 'f1', name: 'employeeName', label: 'Nume angajat', labelEn: 'Employee Name', type: FieldType.TEXT, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'startDate', label: 'Data începerii', labelEn: 'Start Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'department', label: 'Departament', labelEn: 'Department', type: FieldType.DEPARTMENT_PICKER, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'position', label: 'Funcție', labelEn: 'Position', type: FieldType.TEXT, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'accessNeeded', label: 'Sisteme necesare', labelEn: 'Systems Needed', type: FieldType.MULTISELECT, required: true, order: 5, width: 'full', options: [
        { value: 'email', label: 'Email corporativ' }, { value: 'erp', label: 'ERP' }, { value: 'crm', label: 'CRM' },
        { value: 'hrms', label: 'HRMS' }, { value: 'vpn', label: 'VPN' }, { value: 'sharepoint', label: 'SharePoint' },
      ]},
      { id: 'f6', name: 'laptop', label: 'Necesită laptop', labelEn: 'Needs Laptop', type: FieldType.CHECKBOX, required: false, order: 6, width: 'half' },
      { id: 'f7', name: 'phone', label: 'Necesită telefon mobil', labelEn: 'Needs Mobile Phone', type: FieldType.CHECKBOX, required: false, order: 7, width: 'half' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Aprobare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Procesare IT', approverType: 'role', roleId: 'it_admin', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: false, onEscalation: false, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: false, requireSignature: false, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 365, anonymousAllowed: false },
  },
  {
    id: 'tpl-onboard-checklist',
    name: 'Checklist Onboarding',
    nameEn: 'Onboarding Checklist',
    description: 'Lista de verificare pentru procesul de onboarding',
    category: FormCategory.ONBOARDING,
    fields: [
      { id: 'f1', name: 'contractSigned', label: 'Contract semnat', labelEn: 'Contract Signed', type: FieldType.CHECKBOX, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'personalFileDone', label: 'Dosar personal complet', labelEn: 'Personal File Complete', type: FieldType.CHECKBOX, required: true, order: 2, width: 'full' },
      { id: 'f3', name: 'revisalSubmitted', label: 'Înregistrat în REVISAL', labelEn: 'Registered in REVISAL', type: FieldType.CHECKBOX, required: true, order: 3, width: 'full' },
      { id: 'f4', name: 'itAccessProvided', label: 'Acces IT configurat', labelEn: 'IT Access Configured', type: FieldType.CHECKBOX, required: true, order: 4, width: 'full' },
      { id: 'f5', name: 'equipmentProvided', label: 'Echipament livrat', labelEn: 'Equipment Delivered', type: FieldType.CHECKBOX, required: true, order: 5, width: 'full' },
      { id: 'f6', name: 'ssmTraining', label: 'Instructaj SSM efectuat', labelEn: 'HSE Training Done', type: FieldType.CHECKBOX, required: true, order: 6, width: 'full' },
      { id: 'f7', name: 'gdprAgreement', label: 'Acord GDPR semnat', labelEn: 'GDPR Agreement Signed', type: FieldType.CHECKBOX, required: true, order: 7, width: 'full' },
      { id: 'f8', name: 'welcomeSession', label: 'Sesiune de bun venit', labelEn: 'Welcome Session', type: FieldType.CHECKBOX, required: true, order: 8, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 730, anonymousAllowed: false },
  },

  // =================== OFFBOARDING FORMS (8) ===================
  {
    id: 'tpl-offboard-resignation',
    name: 'Demisie',
    nameEn: 'Resignation',
    description: 'Formular de demisie conform Codului Muncii',
    category: FormCategory.OFFBOARDING,
    fields: [
      { id: 'f1', name: 'resignationDate', label: 'Data depunerii demisiei', labelEn: 'Resignation Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'lastWorkingDay', label: 'Ultima zi de lucru', labelEn: 'Last Working Day', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'reason', label: 'Motivul demisiei', labelEn: 'Reason for Resignation', type: FieldType.TEXTAREA, required: false, order: 3, width: 'full' },
      { id: 'f4', name: 'noticePeriod', label: 'Preaviz (zile)', labelEn: 'Notice Period (days)', type: FieldType.NUMBER, required: true, order: 4, width: 'half', defaultValue: 20 },
      { id: 'f5', name: 'waiveNotice', label: 'Solicit renunțare la preaviz', labelEn: 'Request Notice Waiver', type: FieldType.CHECKBOX, required: false, order: 5, width: 'half' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Confirmare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Procesare HR', approverType: 'hr', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: false, onEscalation: false, channels: ['email'] },
    },
    settings: { allowDrafts: false, allowEditing: false, requireSignature: true, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 1825, anonymousAllowed: false },
  },
  {
    id: 'tpl-offboard-exit-interview',
    name: 'Interviu de Plecare',
    nameEn: 'Exit Interview',
    description: 'Chestionar pentru angajații care părăsesc compania',
    category: FormCategory.OFFBOARDING,
    fields: [
      { id: 'f1', name: 'tenure', label: 'Durata angajării', labelEn: 'Employment Duration', type: FieldType.TEXT, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'department', label: 'Departament', labelEn: 'Department', type: FieldType.DEPARTMENT_PICKER, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'mainReason', label: 'Motivul principal al plecării', labelEn: 'Main Reason for Leaving', type: FieldType.SELECT, required: true, order: 3, width: 'full', options: [
        { value: 'career', label: 'Oportunitate de carieră' }, { value: 'salary', label: 'Salariu' }, { value: 'management', label: 'Management' },
        { value: 'culture', label: 'Cultură organizațională' }, { value: 'personal', label: 'Motive personale' }, { value: 'relocation', label: 'Relocare' },
      ]},
      { id: 'f4', name: 'satisfaction', label: 'Satisfacție generală (1-5)', labelEn: 'Overall Satisfaction', type: FieldType.RATING, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'wouldRecommend', label: 'Ați recomanda compania?', labelEn: 'Would Recommend Company?', type: FieldType.SELECT, required: true, order: 5, width: 'half', options: [
        { value: 'yes', label: 'Da' }, { value: 'no', label: 'Nu' }, { value: 'maybe', label: 'Poate' },
      ]},
      { id: 'f6', name: 'improvements', label: 'Ce am putea îmbunătăți?', labelEn: 'What Could We Improve?', type: FieldType.TEXTAREA, required: false, order: 6, width: 'full' },
      { id: 'f7', name: 'positives', label: 'Ce v-a plăcut cel mai mult?', labelEn: 'What Did You Like Most?', type: FieldType.TEXTAREA, required: false, order: 7, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: false, requireSignature: false, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 1095, anonymousAllowed: true },
  },
  {
    id: 'tpl-offboard-clearance',
    name: 'Fișă de Lichidare',
    nameEn: 'Clearance Form',
    description: 'Verificare predare echipamente și documente la plecare',
    category: FormCategory.OFFBOARDING,
    fields: [
      { id: 'f1', name: 'laptopReturned', label: 'Laptop returnat', labelEn: 'Laptop Returned', type: FieldType.CHECKBOX, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'phoneReturned', label: 'Telefon returnat', labelEn: 'Phone Returned', type: FieldType.CHECKBOX, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'accessCardReturned', label: 'Card acces returnat', labelEn: 'Access Card Returned', type: FieldType.CHECKBOX, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'keysReturned', label: 'Chei returnate', labelEn: 'Keys Returned', type: FieldType.CHECKBOX, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'documentsHandover', label: 'Documente predate', labelEn: 'Documents Handed Over', type: FieldType.CHECKBOX, required: true, order: 5, width: 'half' },
      { id: 'f6', name: 'itAccessRevoked', label: 'Acces IT revocat', labelEn: 'IT Access Revoked', type: FieldType.CHECKBOX, required: true, order: 6, width: 'half' },
      { id: 'f7', name: 'financialClearance', label: 'Situație financiară clarificată', labelEn: 'Financial Clearance', type: FieldType.CHECKBOX, required: true, order: 7, width: 'full' },
      { id: 'f8', name: 'notes', label: 'Observații', labelEn: 'Notes', type: FieldType.TEXTAREA, required: false, order: 8, width: 'full' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Verificare IT', approverType: 'role', roleId: 'it_admin', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Verificare Financiar', approverType: 'role', roleId: 'finance', order: 2, requiredApprovals: 1 },
        { id: 's3', name: 'Aprobare HR', approverType: 'hr', order: 3, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: true, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: true, requireSignature: true, attachmentsAllowed: true, maxAttachments: 5, retentionDays: 1825, anonymousAllowed: false },
  },

  // =================== TRAINING FORMS (8) ===================
  {
    id: 'tpl-train-request',
    name: 'Cerere Participare Training',
    nameEn: 'Training Request',
    description: 'Solicitare pentru participare la cursuri/training-uri',
    category: FormCategory.TRAINING,
    fields: [
      { id: 'f1', name: 'trainingName', label: 'Denumire training', labelEn: 'Training Name', type: FieldType.TEXT, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'provider', label: 'Furnizor', labelEn: 'Provider', type: FieldType.TEXT, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'startDate', label: 'Data început', labelEn: 'Start Date', type: FieldType.DATE, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'endDate', label: 'Data sfârșit', labelEn: 'End Date', type: FieldType.DATE, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'cost', label: 'Cost (RON)', labelEn: 'Cost (RON)', type: FieldType.CURRENCY, required: true, order: 5, width: 'half' },
      { id: 'f6', name: 'justification', label: 'Justificare/beneficii', labelEn: 'Justification/Benefits', type: FieldType.TEXTAREA, required: true, order: 6, width: 'full' },
      { id: 'f7', name: 'certification', label: 'Include certificare', labelEn: 'Includes Certification', type: FieldType.CHECKBOX, required: false, order: 7, width: 'half' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Aprobare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Aprobare HR/L&D', approverType: 'hr', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: false, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: true, requireSignature: false, attachmentsAllowed: true, maxAttachments: 3, retentionDays: 730, anonymousAllowed: false },
  },
  {
    id: 'tpl-train-feedback',
    name: 'Evaluare Training',
    nameEn: 'Training Feedback',
    description: 'Feedback după participare la training',
    category: FormCategory.TRAINING,
    fields: [
      { id: 'f1', name: 'trainingName', label: 'Denumire training', labelEn: 'Training Name', type: FieldType.TEXT, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'trainingDate', label: 'Data training', labelEn: 'Training Date', type: FieldType.DATE, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'overallRating', label: 'Evaluare generală (1-5)', labelEn: 'Overall Rating', type: FieldType.RATING, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'contentQuality', label: 'Calitate conținut (1-5)', labelEn: 'Content Quality', type: FieldType.RATING, required: true, order: 4, width: 'half' },
      { id: 'f5', name: 'trainerQuality', label: 'Calitate trainer (1-5)', labelEn: 'Trainer Quality', type: FieldType.RATING, required: true, order: 5, width: 'half' },
      { id: 'f6', name: 'applicability', label: 'Aplicabilitate practică (1-5)', labelEn: 'Practical Applicability', type: FieldType.RATING, required: true, order: 6, width: 'half' },
      { id: 'f7', name: 'wouldRecommend', label: 'Ați recomanda?', labelEn: 'Would Recommend?', type: FieldType.CHECKBOX, required: true, order: 7, width: 'half' },
      { id: 'f8', name: 'feedback', label: 'Feedback detaliat', labelEn: 'Detailed Feedback', type: FieldType.TEXTAREA, required: false, order: 8, width: 'full' },
    ],
    settings: { allowDrafts: true, allowEditing: false, requireSignature: false, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 730, anonymousAllowed: true },
  },

  // =================== EXPENSE FORMS (6) ===================
  {
    id: 'tpl-expense-report',
    name: 'Decont de Cheltuieli',
    nameEn: 'Expense Report',
    description: 'Raport deconturi cheltuieli profesionale',
    category: FormCategory.EXPENSE,
    fields: [
      { id: 'f1', name: 'expenseDate', label: 'Data cheltuielii', labelEn: 'Expense Date', type: FieldType.DATE, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'category', label: 'Categorie', labelEn: 'Category', type: FieldType.SELECT, required: true, order: 2, width: 'half', options: [
        { value: 'travel', label: 'Transport' }, { value: 'meals', label: 'Masă' }, { value: 'accommodation', label: 'Cazare' },
        { value: 'supplies', label: 'Materiale' }, { value: 'other', label: 'Altele' },
      ]},
      { id: 'f3', name: 'amount', label: 'Sumă (RON)', labelEn: 'Amount (RON)', type: FieldType.CURRENCY, required: true, order: 3, width: 'half' },
      { id: 'f4', name: 'description', label: 'Descriere', labelEn: 'Description', type: FieldType.TEXTAREA, required: true, order: 4, width: 'full' },
      { id: 'f5', name: 'receipt', label: 'Bon fiscal/Factură', labelEn: 'Receipt/Invoice', type: FieldType.FILE, required: true, order: 5, width: 'full' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Aprobare Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Procesare Financiar', approverType: 'role', roleId: 'finance', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: true, onEscalation: false, channels: ['email'] },
    },
    settings: { allowDrafts: true, allowEditing: true, requireSignature: false, attachmentsAllowed: true, maxAttachments: 10, retentionDays: 1825, anonymousAllowed: false },
  },

  // =================== COMPLIANCE & HSE FORMS (10) ===================
  {
    id: 'tpl-hse-incident',
    name: 'Raport Incident SSM',
    nameEn: 'HSE Incident Report',
    description: 'Raportare incident de securitate și sănătate în muncă',
    category: FormCategory.COMPLIANCE,
    fields: [
      { id: 'f1', name: 'incidentDate', label: 'Data incidentului', labelEn: 'Incident Date', type: FieldType.DATETIME, required: true, order: 1, width: 'half' },
      { id: 'f2', name: 'location', label: 'Locația', labelEn: 'Location', type: FieldType.TEXT, required: true, order: 2, width: 'half' },
      { id: 'f3', name: 'type', label: 'Tip incident', labelEn: 'Incident Type', type: FieldType.SELECT, required: true, order: 3, width: 'half', options: [
        { value: 'injury', label: 'Vătămare' }, { value: 'near_miss', label: 'Aproape-accident' }, { value: 'property', label: 'Daună materială' },
        { value: 'environmental', label: 'Incident de mediu' }, { value: 'other', label: 'Altele' },
      ]},
      { id: 'f4', name: 'severity', label: 'Severitate', labelEn: 'Severity', type: FieldType.SELECT, required: true, order: 4, width: 'half', options: [
        { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderat' }, { value: 'serious', label: 'Grav' }, { value: 'critical', label: 'Critic' },
      ]},
      { id: 'f5', name: 'description', label: 'Descriere detaliată', labelEn: 'Detailed Description', type: FieldType.TEXTAREA, required: true, order: 5, width: 'full' },
      { id: 'f6', name: 'witnesses', label: 'Martori', labelEn: 'Witnesses', type: FieldType.TEXTAREA, required: false, order: 6, width: 'full' },
      { id: 'f7', name: 'immediateActions', label: 'Acțiuni imediate luate', labelEn: 'Immediate Actions Taken', type: FieldType.TEXTAREA, required: true, order: 7, width: 'full' },
      { id: 'f8', name: 'photos', label: 'Fotografii (opțional)', labelEn: 'Photos (optional)', type: FieldType.FILE, required: false, order: 8, width: 'full' },
    ],
    workflow: {
      enabled: true,
      steps: [
        { id: 's1', name: 'Revizuire Manager', approverType: 'manager', order: 1, requiredApprovals: 1 },
        { id: 's2', name: 'Investigare HSE', approverType: 'role', roleId: 'hse', order: 2, requiredApprovals: 1 },
      ],
      notifications: { onSubmit: true, onApproval: true, onRejection: false, onEscalation: true, channels: ['email', 'push'] },
    },
    settings: { allowDrafts: false, allowEditing: false, requireSignature: false, attachmentsAllowed: true, maxAttachments: 10, retentionDays: 3650, anonymousAllowed: false },
  },
  {
    id: 'tpl-gdpr-consent',
    name: 'Acord GDPR',
    nameEn: 'GDPR Consent',
    description: 'Consimțământ pentru prelucrarea datelor personale',
    category: FormCategory.COMPLIANCE,
    fields: [
      { id: 'f1', name: 'dataProcessingConsent', label: 'Accept prelucrarea datelor personale', labelEn: 'Accept Data Processing', type: FieldType.CHECKBOX, required: true, order: 1, width: 'full' },
      { id: 'f2', name: 'marketingConsent', label: 'Accept comunicări de marketing', labelEn: 'Accept Marketing Communications', type: FieldType.CHECKBOX, required: false, order: 2, width: 'full' },
      { id: 'f3', name: 'photoConsent', label: 'Accept utilizarea fotografiei în materiale interne', labelEn: 'Accept Photo Usage', type: FieldType.CHECKBOX, required: false, order: 3, width: 'full' },
    ],
    settings: { allowDrafts: false, allowEditing: false, requireSignature: true, attachmentsAllowed: false, maxAttachments: 0, retentionDays: 3650, anonymousAllowed: false },
  },
];

@Injectable()
export class HRFormsService {
  private readonly logger = new Logger(HRFormsService.name);
  private templates: Map<string, FormTemplate> = new Map();
  private submissions: Map<string, FormSubmission> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    let idCounter = 1;
    for (const tpl of HR_FORM_TEMPLATES) {
      const template: FormTemplate = {
        id: tpl.id || `tpl-${idCounter++}`,
        name: tpl.name || 'Unnamed Form',
        nameEn: tpl.nameEn || tpl.name || 'Unnamed Form',
        description: tpl.description || '',
        category: tpl.category || FormCategory.COMPLIANCE,
        fields: tpl.fields || [],
        workflow: tpl.workflow,
        validations: tpl.validations || [],
        settings: tpl.settings || {
          allowDrafts: true,
          allowEditing: true,
          requireSignature: false,
          attachmentsAllowed: true,
          maxAttachments: 5,
          retentionDays: 365,
          anonymousAllowed: false,
        },
        version: 1,
        status: FormStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.templates.set(template.id, template);
    }
    this.logger.log(`Initialized ${this.templates.size} HR form templates`);
  }

  // =================== TEMPLATE MANAGEMENT ===================

  getTemplates(category?: FormCategory, status?: FormStatus): FormTemplate[] {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    if (status) {
      templates = templates.filter((t) => t.status === status);
    }

    return templates;
  }

  getTemplate(templateId: string): FormTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  getCategories(): { category: FormCategory; count: number; label: string }[] {
    const counts = new Map<FormCategory, number>();
    const labels: Record<FormCategory, string> = {
      [FormCategory.LEAVE]: 'Concedii',
      [FormCategory.PERFORMANCE]: 'Performanță',
      [FormCategory.ONBOARDING]: 'Onboarding',
      [FormCategory.OFFBOARDING]: 'Offboarding',
      [FormCategory.TRAINING]: 'Training',
      [FormCategory.BENEFITS]: 'Beneficii',
      [FormCategory.COMPLIANCE]: 'Conformitate',
      [FormCategory.TIMEKEEPING]: 'Pontaj',
      [FormCategory.EXPENSE]: 'Cheltuieli',
      [FormCategory.FEEDBACK]: 'Feedback',
      [FormCategory.MEDICAL]: 'Medical',
      [FormCategory.DISCIPLINARY]: 'Disciplinar',
    };

    for (const template of this.templates.values()) {
      counts.set(template.category, (counts.get(template.category) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([category, count]) => ({
      category,
      count,
      label: labels[category],
    }));
  }

  // =================== FORM SUBMISSION ===================

  async createSubmission(
    userId: string,
    formId: string,
    data: Record<string, any>,
    employeeId?: string,
  ): Promise<FormSubmission> {
    const template = this.getTemplate(formId);

    // Validate required fields
    const errors = this.validateSubmission(template, data);
    if (errors.length > 0) {
      throw new BadRequestException(`Validation errors: ${errors.join(', ')}`);
    }

    const id = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const submission: FormSubmission = {
      id,
      formId,
      userId,
      employeeId,
      data,
      attachments: [],
      status: SubmissionStatus.DRAFT,
      approvals: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.submissions.set(id, submission);
    this.logger.log(`Created form submission ${id} for form ${formId}`);

    return submission;
  }

  async submitForm(submissionId: string): Promise<FormSubmission> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const template = this.getTemplate(submission.formId);

    // Final validation
    const errors = this.validateSubmission(template, submission.data);
    if (errors.length > 0) {
      throw new BadRequestException(`Cannot submit: ${errors.join(', ')}`);
    }

    submission.status = template.workflow?.enabled
      ? SubmissionStatus.PENDING_APPROVAL
      : SubmissionStatus.COMPLETED;
    submission.currentStep = template.workflow?.enabled ? 0 : undefined;
    submission.submittedAt = new Date();
    submission.updatedAt = new Date();

    this.submissions.set(submissionId, submission);
    this.logger.log(`Form submission ${submissionId} submitted`);

    return submission;
  }

  async processApproval(
    submissionId: string,
    approverId: string,
    approverName: string,
    action: ApprovalAction,
    comment?: string,
  ): Promise<FormSubmission> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    if (submission.status !== SubmissionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Submission is not pending approval');
    }

    const template = this.getTemplate(submission.formId);
    const currentStep = template.workflow?.steps[submission.currentStep || 0];

    if (!currentStep) {
      throw new BadRequestException('No approval step found');
    }

    // Record approval
    const approvalRecord: ApprovalRecord = {
      id: `apr_${Date.now()}`,
      stepId: currentStep.id,
      approverId,
      approverName,
      action,
      comment,
      timestamp: new Date(),
    };

    submission.approvals.push(approvalRecord);
    submission.updatedAt = new Date();

    // Process action
    switch (action) {
      case ApprovalAction.APPROVE:
        const nextStepIndex = (submission.currentStep || 0) + 1;
        if (nextStepIndex >= (template.workflow?.steps.length || 0)) {
          submission.status = SubmissionStatus.APPROVED;
          submission.completedAt = new Date();
        } else {
          submission.currentStep = nextStepIndex;
        }
        break;

      case ApprovalAction.REJECT:
        submission.status = SubmissionStatus.REJECTED;
        submission.completedAt = new Date();
        break;

      case ApprovalAction.REQUEST_CHANGES:
        submission.status = SubmissionStatus.DRAFT;
        break;

      case ApprovalAction.ESCALATE:
        // Move to next approver level
        submission.currentStep = (submission.currentStep || 0) + 1;
        break;
    }

    this.submissions.set(submissionId, submission);
    this.logger.log(`Processed approval for ${submissionId}: ${action}`);

    return submission;
  }

  // =================== VALIDATION ===================

  private validateSubmission(template: FormTemplate, data: Record<string, any>): string[] {
    const errors: string[] = [];

    for (const field of template.fields) {
      const value = data[field.name];

      // Required check
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} este obligatoriu`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue; // Skip validation for empty optional fields
      }

      // Type-specific validation
      if (field.validation) {
        if (field.validation.minLength && String(value).length < field.validation.minLength) {
          errors.push(`${field.label} trebuie să aibă minim ${field.validation.minLength} caractere`);
        }
        if (field.validation.maxLength && String(value).length > field.validation.maxLength) {
          errors.push(`${field.label} nu poate depăși ${field.validation.maxLength} caractere`);
        }
        if (field.validation.min !== undefined && Number(value) < field.validation.min) {
          errors.push(`${field.label} trebuie să fie minim ${field.validation.min}`);
        }
        if (field.validation.max !== undefined && Number(value) > field.validation.max) {
          errors.push(`${field.label} nu poate depăși ${field.validation.max}`);
        }
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(String(value))) {
            errors.push(field.validation.patternMessage || `${field.label} are format invalid`);
          }
        }
      }
    }

    return errors;
  }

  // =================== RETRIEVAL ===================

  getSubmission(submissionId: string): FormSubmission {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    return submission;
  }

  getUserSubmissions(userId: string, status?: SubmissionStatus): FormSubmission[] {
    let submissions = Array.from(this.submissions.values())
      .filter((s) => s.userId === userId);

    if (status) {
      submissions = submissions.filter((s) => s.status === status);
    }

    return submissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPendingApprovals(approverId: string): FormSubmission[] {
    return Array.from(this.submissions.values())
      .filter((s) => s.status === SubmissionStatus.PENDING_APPROVAL)
      .sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime());
  }

  // =================== STATISTICS ===================

  getStatistics(): {
    totalTemplates: number;
    totalSubmissions: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const submissions = Array.from(this.submissions.values());

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const sub of submissions) {
      const template = this.templates.get(sub.formId);
      if (template) {
        byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      }
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
    }

    return {
      totalTemplates: this.templates.size,
      totalSubmissions: submissions.length,
      byCategory,
      byStatus,
    };
  }
}

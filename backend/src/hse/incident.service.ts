import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Incident Reporting & Investigation Service
// Mobile-first incident reporting with AI severity triage, root cause analysis, and CAPA tracking
// Compliant with Romanian SSM (Securitate și Sănătate în Muncă) regulations

// ===== ENUMS =====

export enum IncidentType {
  INJURY = 'INJURY',
  ILLNESS = 'ILLNESS',
  NEAR_MISS = 'NEAR_MISS',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  SECURITY = 'SECURITY',
  FIRE = 'FIRE',
  SPILL = 'SPILL',
  VEHICLE = 'VEHICLE',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  UNSAFE_ACT = 'UNSAFE_ACT',
  UNSAFE_CONDITION = 'UNSAFE_CONDITION',
}

export enum IncidentSeverity {
  MINOR = 'MINOR',           // First aid only, no lost time
  MODERATE = 'MODERATE',     // Medical treatment, <3 days lost
  SERIOUS = 'SERIOUS',       // >3 days lost time, hospitalization
  MAJOR = 'MAJOR',           // Permanent disability, major damage
  FATAL = 'FATAL',           // Death or multiple serious injuries
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  ROOT_CAUSE_IDENTIFIED = 'ROOT_CAUSE_IDENTIFIED',
  CAPA_IN_PROGRESS = 'CAPA_IN_PROGRESS',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export enum InjuryType {
  CUT_LACERATION = 'CUT_LACERATION',
  BRUISE_CONTUSION = 'BRUISE_CONTUSION',
  FRACTURE = 'FRACTURE',
  SPRAIN_STRAIN = 'SPRAIN_STRAIN',
  BURN = 'BURN',
  ELECTRIC_SHOCK = 'ELECTRIC_SHOCK',
  CHEMICAL_EXPOSURE = 'CHEMICAL_EXPOSURE',
  EYE_INJURY = 'EYE_INJURY',
  HEARING_LOSS = 'HEARING_LOSS',
  RESPIRATORY = 'RESPIRATORY',
  BACK_INJURY = 'BACK_INJURY',
  CRUSH = 'CRUSH',
  AMPUTATION = 'AMPUTATION',
  PSYCHOLOGICAL = 'PSYCHOLOGICAL',
  OTHER = 'OTHER',
}

export enum BodyPart {
  HEAD = 'HEAD',
  FACE = 'FACE',
  EYE = 'EYE',
  EAR = 'EAR',
  NECK = 'NECK',
  SHOULDER = 'SHOULDER',
  ARM = 'ARM',
  ELBOW = 'ELBOW',
  WRIST = 'WRIST',
  HAND = 'HAND',
  FINGER = 'FINGER',
  CHEST = 'CHEST',
  BACK = 'BACK',
  ABDOMEN = 'ABDOMEN',
  HIP = 'HIP',
  LEG = 'LEG',
  KNEE = 'KNEE',
  ANKLE = 'ANKLE',
  FOOT = 'FOOT',
  TOE = 'TOE',
  MULTIPLE = 'MULTIPLE',
}

export enum RootCauseCategory {
  // Immediate Causes
  UNSAFE_ACT = 'UNSAFE_ACT',
  UNSAFE_CONDITION = 'UNSAFE_CONDITION',

  // Basic Causes (Personal Factors)
  LACK_OF_KNOWLEDGE = 'LACK_OF_KNOWLEDGE',
  LACK_OF_SKILL = 'LACK_OF_SKILL',
  IMPROPER_MOTIVATION = 'IMPROPER_MOTIVATION',
  PHYSICAL_CAPABILITY = 'PHYSICAL_CAPABILITY',
  MENTAL_CAPABILITY = 'MENTAL_CAPABILITY',
  STRESS = 'STRESS',

  // Basic Causes (Job Factors)
  INADEQUATE_LEADERSHIP = 'INADEQUATE_LEADERSHIP',
  INADEQUATE_ENGINEERING = 'INADEQUATE_ENGINEERING',
  INADEQUATE_PURCHASING = 'INADEQUATE_PURCHASING',
  INADEQUATE_MAINTENANCE = 'INADEQUATE_MAINTENANCE',
  INADEQUATE_TOOLS = 'INADEQUATE_TOOLS',
  INADEQUATE_STANDARDS = 'INADEQUATE_STANDARDS',
  WEAR_AND_ABUSE = 'WEAR_AND_ABUSE',

  // System Causes
  MANAGEMENT_SYSTEM = 'MANAGEMENT_SYSTEM',
  TRAINING_SYSTEM = 'TRAINING_SYSTEM',
  COMMUNICATION = 'COMMUNICATION',
  SUPERVISION = 'SUPERVISION',
}

export enum CAPAType {
  CORRECTIVE = 'CORRECTIVE',   // Fix the immediate problem
  PREVENTIVE = 'PREVENTIVE',   // Prevent recurrence
}

export enum CAPAStatus {
  IDENTIFIED = 'IDENTIFIED',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  OVERDUE = 'OVERDUE',
}

export enum CAPAPriority {
  CRITICAL = 'CRITICAL',   // Immediate action required
  HIGH = 'HIGH',           // Within 7 days
  MEDIUM = 'MEDIUM',       // Within 30 days
  LOW = 'LOW',             // Within 90 days
}

// ===== INTERFACES =====

export interface Incident {
  id: string;
  incidentNumber: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;

  // When & Where
  occurredAt: Date;
  reportedAt: Date;
  locationId?: string;
  locationDescription: string;
  department?: string;
  shift?: string;

  // What happened
  title: string;
  description: string;
  immediateActions: string[];

  // Who was involved
  reportedBy: PersonInfo;
  injuredPersons: InjuredPerson[];
  witnesses: WitnessStatement[];

  // Evidence
  photos: MediaAttachment[];
  videos: MediaAttachment[];
  documents: MediaAttachment[];

  // Investigation
  investigation?: Investigation;
  rootCauses: RootCause[];
  capas: CAPA[];

  // Metrics
  lostWorkDays: number;
  restrictedWorkDays: number;
  medicalTreatmentRequired: boolean;
  recordable: boolean; // OSHA recordable

  // Regulatory
  reportedToAuthorities: boolean;
  authorityReportDate?: Date;
  authorityReference?: string;

  // Timeline
  closedAt?: Date;
  closedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface PersonInfo {
  id: string;
  name: string;
  employeeId?: string;
  department?: string;
  jobTitle?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface InjuredPerson extends PersonInfo {
  injuryType: InjuryType;
  bodyParts: BodyPart[];
  treatmentProvided: string;
  hospitalizedDays: number;
  returnToWorkDate?: Date;
  restrictedDuty: boolean;
  permanentDisability: boolean;
}

export interface WitnessStatement {
  id: string;
  witness: PersonInfo;
  statement: string;
  recordedAt: Date;
  recordedBy: string;
  signature?: string;
}

export interface MediaAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  description?: string;
  aiAnalysis?: {
    detectedHazards: string[];
    severityIndicators: string[];
    confidence: number;
  };
}

export interface Investigation {
  id: string;
  leadInvestigator: PersonInfo;
  team: PersonInfo[];
  startedAt: Date;
  completedAt?: Date;
  methodology: 'FIVE_WHY' | 'FISHBONE' | 'FAULT_TREE' | 'TAPROOT' | 'COMBINED';
  findings: string[];
  timeline: InvestigationEvent[];
  contributingFactors: string[];
  systemFailures: string[];
  recommendations: string[];
}

export interface InvestigationEvent {
  timestamp: Date;
  description: string;
  source: string;
}

export interface RootCause {
  id: string;
  category: RootCauseCategory;
  description: string;
  evidence: string[];
  fiveWhyChain?: string[]; // Array of "why" questions and answers
  fishboneCategory?: 'MANPOWER' | 'MACHINE' | 'METHOD' | 'MATERIAL' | 'MEASUREMENT' | 'ENVIRONMENT';
  contributionPercent?: number; // Relative contribution to incident
}

export interface CAPA {
  id: string;
  type: CAPAType;
  priority: CAPAPriority;
  status: CAPAStatus;
  description: string;
  rootCauseId?: string;
  responsiblePerson: string;
  targetDate: Date;
  completedDate?: Date;
  verifiedDate?: Date;
  verifiedBy?: string;
  effectivenessRating?: number; // 1-5
  evidence: string[];
  cost?: number;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyMetrics {
  period: { start: Date; end: Date };
  totalIncidents: number;
  byType: Record<IncidentType, number>;
  bySeverity: Record<IncidentSeverity, number>;

  // Lagging Indicators
  totalRecordableIncidents: number; // TRI
  lostTimeIncidents: number; // LTI
  totalLostWorkDays: number;
  totalRestrictedDays: number;
  fatalities: number;

  // Rates (per 200,000 hours worked)
  hoursWorked: number;
  LTIR: number;  // Lost Time Incident Rate
  TRIR: number;  // Total Recordable Incident Rate
  DART: number;  // Days Away, Restricted, or Transferred
  severityRate: number; // Lost days per 200,000 hours

  // Leading Indicators
  nearMisses: number;
  unsafeActs: number;
  unsafeConditions: number;

  // Trend
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  previousPeriodComparison: {
    incidentChange: number; // percentage
    ltirChange: number;
    trirChange: number;
  };
}

export interface ISMReport {
  // ISM Code (International Safety Management) format
  reportNumber: string;
  vesselOrFacility: string;
  company: string;
  reportDate: Date;
  incidentDate: Date;
  incidentType: string;
  location: string;
  description: string;
  immediateActions: string;
  casualties: {
    fatalities: number;
    injuries: number;
    illnesses: number;
  };
  damage: string;
  environmentalImpact: string;
  rootCauses: string[];
  correctiveActions: string[];
  preventiveActions: string[];
  lessonsLearned: string[];
  masterSignature?: string;
  dpaSignature?: string;
}

// ===== SERVICE =====

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  // In-memory storage
  private incidents: Map<string, Incident> = new Map();
  private incidentCounter = 1000;

  // Romanian regulatory thresholds (per Legea 319/2006 SSM)
  private readonly REPORTING_THRESHOLDS = {
    FATAL: { reportToITM: true, reportToISCIR: true, reportWithin: '24h' },
    MAJOR: { reportToITM: true, reportToISCIR: false, reportWithin: '24h' },
    SERIOUS: { reportToITM: true, reportToISCIR: false, reportWithin: '3 days' },
    MODERATE: { reportToITM: false, reportToISCIR: false, reportWithin: 'N/A' },
    MINOR: { reportToITM: false, reportToISCIR: false, reportWithin: 'N/A' },
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // For testing - reset all in-memory data
  resetState(): void {
    this.incidents.clear();
    this.incidentCounter = 1000;
  }

  // ===== INCIDENT REPORTING =====

  async reportIncident(data: {
    type: IncidentType;
    severity?: IncidentSeverity;
    occurredAt: Date;
    locationId?: string;
    locationDescription: string;
    department?: string;
    shift?: string;
    title: string;
    description: string;
    immediateActions?: string[];
    reportedBy: PersonInfo;
    injuredPersons?: InjuredPerson[];
  }): Promise<Incident> {
    if (!data.title || !data.description) {
      throw new BadRequestException('Title and description are required');
    }

    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.incidentCounter++;
    const incidentNumber = `INC-${new Date().getFullYear()}-${String(this.incidentCounter).padStart(5, '0')}`;

    // AI-assisted severity classification if not provided
    const severity = data.severity || this.classifySeverity(data);

    const incident: Incident = {
      id: incidentId,
      incidentNumber,
      type: data.type,
      severity,
      status: IncidentStatus.REPORTED,

      occurredAt: data.occurredAt,
      reportedAt: new Date(),
      locationId: data.locationId,
      locationDescription: data.locationDescription,
      department: data.department,
      shift: data.shift,

      title: data.title,
      description: data.description,
      immediateActions: data.immediateActions || [],

      reportedBy: data.reportedBy,
      injuredPersons: data.injuredPersons || [],
      witnesses: [],

      photos: [],
      videos: [],
      documents: [],

      rootCauses: [],
      capas: [],

      lostWorkDays: 0,
      restrictedWorkDays: 0,
      medicalTreatmentRequired: this.requiresMedicalTreatment(data.injuredPersons || []),
      recordable: this.isRecordable(severity, data.injuredPersons || []),

      reportedToAuthorities: false,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.incidents.set(incidentId, incident);
    this.logger.log(`Incident reported: ${incidentNumber} - ${incident.title} (${severity})`);

    // Check if regulatory reporting is required
    const reportingReq = this.REPORTING_THRESHOLDS[severity];
    if (reportingReq.reportToITM) {
      this.logger.warn(`ALERT: Incident ${incidentNumber} requires ITM reporting within ${reportingReq.reportWithin}`);
    }

    return incident;
  }

  async getIncident(incidentId: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident ${incidentId} not found`);
    }
    return incident;
  }

  async getIncidentByNumber(incidentNumber: string): Promise<Incident> {
    const incident = Array.from(this.incidents.values()).find(i => i.incidentNumber === incidentNumber);
    if (!incident) {
      throw new NotFoundException(`Incident ${incidentNumber} not found`);
    }
    return incident;
  }

  async updateIncident(incidentId: string, data: Partial<Incident>): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    const updated: Incident = {
      ...incident,
      ...data,
      id: incidentId,
      incidentNumber: incident.incidentNumber,
      createdAt: incident.createdAt,
      updatedAt: new Date(),
    };

    // Recalculate recordable status if severity or injuries changed
    if (data.severity || data.injuredPersons) {
      updated.recordable = this.isRecordable(
        updated.severity,
        updated.injuredPersons
      );
    }

    this.incidents.set(incidentId, updated);
    return updated;
  }

  async listIncidents(filters?: {
    type?: IncidentType;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    locationId?: string;
    department?: string;
    fromDate?: Date;
    toDate?: Date;
    recordableOnly?: boolean;
  }): Promise<Incident[]> {
    let incidents = Array.from(this.incidents.values());

    if (filters?.type) {
      incidents = incidents.filter(i => i.type === filters.type);
    }
    if (filters?.severity) {
      incidents = incidents.filter(i => i.severity === filters.severity);
    }
    if (filters?.status) {
      incidents = incidents.filter(i => i.status === filters.status);
    }
    if (filters?.locationId) {
      incidents = incidents.filter(i => i.locationId === filters.locationId);
    }
    if (filters?.department) {
      incidents = incidents.filter(i => i.department === filters.department);
    }
    if (filters?.fromDate) {
      incidents = incidents.filter(i => i.occurredAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      incidents = incidents.filter(i => i.occurredAt <= filters.toDate!);
    }
    if (filters?.recordableOnly) {
      incidents = incidents.filter(i => i.recordable);
    }

    return incidents.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  // ===== MEDIA ATTACHMENTS =====

  async addPhoto(incidentId: string, photo: Omit<MediaAttachment, 'id' | 'uploadedAt'>): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attachment: MediaAttachment = {
      id: photoId,
      ...photo,
      uploadedAt: new Date(),
      aiAnalysis: this.analyzeImage(photo.url, photo.description),
    };

    incident.photos.push(attachment);
    incident.updatedAt = new Date();

    // AI severity re-assessment based on image
    if (attachment.aiAnalysis && attachment.aiAnalysis.severityIndicators.length > 0) {
      this.logger.log(`AI detected severity indicators: ${attachment.aiAnalysis.severityIndicators.join(', ')}`);
    }

    this.incidents.set(incidentId, incident);
    return incident;
  }

  async addVideo(incidentId: string, video: Omit<MediaAttachment, 'id' | 'uploadedAt'>): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attachment: MediaAttachment = {
      id: videoId,
      ...video,
      uploadedAt: new Date(),
    };

    incident.videos.push(attachment);
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);
    return incident;
  }

  async addDocument(incidentId: string, document: Omit<MediaAttachment, 'id' | 'uploadedAt'>): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attachment: MediaAttachment = {
      id: docId,
      ...document,
      uploadedAt: new Date(),
    };

    incident.documents.push(attachment);
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);
    return incident;
  }

  // ===== WITNESS STATEMENTS =====

  async addWitnessStatement(incidentId: string, statement: {
    witness: PersonInfo;
    statement: string;
    recordedBy: string;
  }): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    const statementId = `wit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const witnessStatement: WitnessStatement = {
      id: statementId,
      witness: statement.witness,
      statement: statement.statement,
      recordedAt: new Date(),
      recordedBy: statement.recordedBy,
    };

    incident.witnesses.push(witnessStatement);
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Witness statement added for ${incidentId} by ${statement.witness.name}`);
    return incident;
  }

  async signWitnessStatement(incidentId: string, statementId: string, signature: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);
    const statementIndex = incident.witnesses.findIndex(w => w.id === statementId);

    if (statementIndex === -1) {
      throw new NotFoundException(`Witness statement ${statementId} not found`);
    }

    incident.witnesses[statementIndex].signature = signature;
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);
    return incident;
  }

  // ===== INVESTIGATION =====

  async startInvestigation(incidentId: string, data: {
    leadInvestigator: PersonInfo;
    team?: PersonInfo[];
    methodology: Investigation['methodology'];
  }): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    if (incident.investigation) {
      throw new BadRequestException('Investigation already started');
    }

    const investigationId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    incident.investigation = {
      id: investigationId,
      leadInvestigator: data.leadInvestigator,
      team: data.team || [],
      startedAt: new Date(),
      methodology: data.methodology,
      findings: [],
      timeline: [],
      contributingFactors: [],
      systemFailures: [],
      recommendations: [],
    };

    incident.status = IncidentStatus.UNDER_INVESTIGATION;
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Investigation started for ${incident.incidentNumber} by ${data.leadInvestigator.name}`);
    return incident;
  }

  async addInvestigationFinding(incidentId: string, finding: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    if (!incident.investigation) {
      throw new BadRequestException('Investigation not started');
    }

    incident.investigation.findings.push(finding);
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);
    return incident;
  }

  async addTimelineEvent(incidentId: string, event: InvestigationEvent): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    if (!incident.investigation) {
      throw new BadRequestException('Investigation not started');
    }

    incident.investigation.timeline.push(event);
    incident.investigation.timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);
    return incident;
  }

  async completeInvestigation(incidentId: string, data: {
    contributingFactors: string[];
    systemFailures: string[];
    recommendations: string[];
  }): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    if (!incident.investigation) {
      throw new BadRequestException('Investigation not started');
    }

    incident.investigation.completedAt = new Date();
    incident.investigation.contributingFactors = data.contributingFactors;
    incident.investigation.systemFailures = data.systemFailures;
    incident.investigation.recommendations = data.recommendations;

    if (incident.rootCauses.length > 0) {
      incident.status = IncidentStatus.ROOT_CAUSE_IDENTIFIED;
    }

    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Investigation completed for ${incident.incidentNumber}`);
    return incident;
  }

  // ===== ROOT CAUSE ANALYSIS =====

  async addRootCause(incidentId: string, rootCause: Omit<RootCause, 'id'>): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    const rcId = `rc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rc: RootCause = {
      id: rcId,
      ...rootCause,
    };

    incident.rootCauses.push(rc);

    if (incident.status === IncidentStatus.UNDER_INVESTIGATION) {
      incident.status = IncidentStatus.ROOT_CAUSE_IDENTIFIED;
    }

    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Root cause added for ${incident.incidentNumber}: ${rootCause.category}`);
    return incident;
  }

  async performFiveWhyAnalysis(incidentId: string, problem: string, whyChain: string[]): Promise<RootCause> {
    if (whyChain.length < 3 || whyChain.length > 7) {
      throw new BadRequestException('5-Why analysis should have 3-7 "why" iterations');
    }

    const rootCause: Omit<RootCause, 'id'> = {
      category: this.categorizeRootCause(whyChain[whyChain.length - 1]),
      description: `Root cause identified through 5-Why analysis: ${whyChain[whyChain.length - 1]}`,
      evidence: [`5-Why Analysis starting from: "${problem}"`],
      fiveWhyChain: [problem, ...whyChain],
    };

    const incident = await this.addRootCause(incidentId, rootCause);
    return incident.rootCauses[incident.rootCauses.length - 1];
  }

  async performFishboneAnalysis(incidentId: string, causes: {
    manpower?: string[];
    machine?: string[];
    method?: string[];
    material?: string[];
    measurement?: string[];
    environment?: string[];
  }): Promise<RootCause[]> {
    const incident = await this.getIncident(incidentId);
    const addedCauses: RootCause[] = [];

    const categoryMap: Record<string, RootCause['fishboneCategory']> = {
      manpower: 'MANPOWER',
      machine: 'MACHINE',
      method: 'METHOD',
      material: 'MATERIAL',
      measurement: 'MEASUREMENT',
      environment: 'ENVIRONMENT',
    };

    for (const [category, items] of Object.entries(causes)) {
      if (items && items.length > 0) {
        for (const item of items) {
          const rootCause: Omit<RootCause, 'id'> = {
            category: this.mapFishboneToRootCauseCategory(categoryMap[category]!),
            description: item,
            evidence: [],
            fishboneCategory: categoryMap[category],
          };

          await this.addRootCause(incidentId, rootCause);
          const updated = await this.getIncident(incidentId);
          addedCauses.push(updated.rootCauses[updated.rootCauses.length - 1]);
        }
      }
    }

    return addedCauses;
  }

  // ===== CORRECTIVE/PREVENTIVE ACTIONS (CAPA) =====

  async addCAPA(incidentId: string, capa: {
    type: CAPAType;
    priority: CAPAPriority;
    description: string;
    rootCauseId?: string;
    responsiblePerson: string;
    targetDate: Date;
    cost?: number;
    currency?: string;
  }): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    if (capa.rootCauseId) {
      const rootCauseExists = incident.rootCauses.some(rc => rc.id === capa.rootCauseId);
      if (!rootCauseExists) {
        throw new BadRequestException('Root cause not found');
      }
    }

    const capaId = `capa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newCAPA: CAPA = {
      id: capaId,
      type: capa.type,
      priority: capa.priority,
      status: CAPAStatus.IDENTIFIED,
      description: capa.description,
      rootCauseId: capa.rootCauseId,
      responsiblePerson: capa.responsiblePerson,
      targetDate: capa.targetDate,
      cost: capa.cost,
      currency: capa.currency || 'RON',
      evidence: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    incident.capas.push(newCAPA);

    if (incident.status === IncidentStatus.ROOT_CAUSE_IDENTIFIED) {
      incident.status = IncidentStatus.CAPA_IN_PROGRESS;
    }

    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`CAPA added for ${incident.incidentNumber}: ${capa.description}`);
    return incident;
  }

  async updateCAPAStatus(incidentId: string, capaId: string, status: CAPAStatus, verifiedBy?: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);
    const capaIndex = incident.capas.findIndex(c => c.id === capaId);

    if (capaIndex === -1) {
      throw new NotFoundException(`CAPA ${capaId} not found`);
    }

    const capa = incident.capas[capaIndex];
    capa.status = status;
    capa.updatedAt = new Date();

    if (status === CAPAStatus.IMPLEMENTED) {
      capa.completedDate = new Date();
    }
    if (status === CAPAStatus.VERIFIED && verifiedBy) {
      capa.verifiedDate = new Date();
      capa.verifiedBy = verifiedBy;
    }

    incident.capas[capaIndex] = capa;
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    // Check if all CAPAs are closed
    const allClosed = incident.capas.every(c =>
      c.status === CAPAStatus.CLOSED || c.status === CAPAStatus.VERIFIED
    );
    if (allClosed && incident.capas.length > 0) {
      this.logger.log(`All CAPAs completed for ${incident.incidentNumber}, ready for closure`);
    }

    return incident;
  }

  async rateCAPAEffectiveness(incidentId: string, capaId: string, rating: number, evidence: string[]): Promise<Incident> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Effectiveness rating must be between 1 and 5');
    }

    const incident = await this.getIncident(incidentId);
    const capaIndex = incident.capas.findIndex(c => c.id === capaId);

    if (capaIndex === -1) {
      throw new NotFoundException(`CAPA ${capaId} not found`);
    }

    incident.capas[capaIndex].effectivenessRating = rating;
    incident.capas[capaIndex].evidence = evidence;
    incident.capas[capaIndex].updatedAt = new Date();
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    return incident;
  }

  async getOverdueCAPAs(): Promise<{ incident: Incident; capa: CAPA }[]> {
    const overdue: { incident: Incident; capa: CAPA }[] = [];
    const now = new Date();

    for (const incident of this.incidents.values()) {
      for (const capa of incident.capas) {
        if (
          capa.status !== CAPAStatus.CLOSED &&
          capa.status !== CAPAStatus.VERIFIED &&
          capa.targetDate < now
        ) {
          capa.status = CAPAStatus.OVERDUE;
          overdue.push({ incident, capa });
        }
      }
    }

    return overdue.sort((a, b) => a.capa.targetDate.getTime() - b.capa.targetDate.getTime());
  }

  // ===== INCIDENT CLOSURE =====

  async closeIncident(incidentId: string, closedBy: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    // Validate closure requirements
    if (!incident.investigation || !incident.investigation.completedAt) {
      throw new BadRequestException('Investigation must be completed before closing');
    }

    if (incident.rootCauses.length === 0) {
      throw new BadRequestException('At least one root cause must be identified');
    }

    const openCAPAs = incident.capas.filter(c =>
      c.status !== CAPAStatus.CLOSED && c.status !== CAPAStatus.VERIFIED
    );
    if (openCAPAs.length > 0) {
      throw new BadRequestException(`${openCAPAs.length} CAPA(s) still open`);
    }

    incident.status = IncidentStatus.CLOSED;
    incident.closedAt = new Date();
    incident.closedBy = closedBy;
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Incident ${incident.incidentNumber} closed by ${closedBy}`);
    return incident;
  }

  async reopenIncident(incidentId: string, reason: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    if (incident.status !== IncidentStatus.CLOSED) {
      throw new BadRequestException('Only closed incidents can be reopened');
    }

    incident.status = IncidentStatus.REOPENED;
    incident.closedAt = undefined;
    incident.closedBy = undefined;

    // Add a note about reopening
    if (incident.investigation) {
      incident.investigation.findings.push(`REOPENED: ${reason}`);
    }

    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Incident ${incident.incidentNumber} reopened: ${reason}`);
    return incident;
  }

  // ===== LOST TIME & METRICS =====

  async recordLostTime(incidentId: string, data: {
    lostWorkDays: number;
    restrictedWorkDays: number;
  }): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    incident.lostWorkDays = data.lostWorkDays;
    incident.restrictedWorkDays = data.restrictedWorkDays;

    // Update recordable status
    if (data.lostWorkDays > 0 || data.restrictedWorkDays > 0) {
      incident.recordable = true;
    }

    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);
    return incident;
  }

  async calculateSafetyMetrics(startDate: Date, endDate: Date, hoursWorked: number): Promise<SafetyMetrics> {
    const incidents = await this.listIncidents({ fromDate: startDate, toDate: endDate });

    const byType: Record<IncidentType, number> = {} as Record<IncidentType, number>;
    for (const type of Object.values(IncidentType)) {
      byType[type] = 0;
    }

    const bySeverity: Record<IncidentSeverity, number> = {} as Record<IncidentSeverity, number>;
    for (const sev of Object.values(IncidentSeverity)) {
      bySeverity[sev] = 0;
    }

    let totalRecordable = 0;
    let lostTimeIncidents = 0;
    let totalLostDays = 0;
    let totalRestrictedDays = 0;
    let fatalities = 0;
    let nearMisses = 0;
    let unsafeActs = 0;
    let unsafeConditions = 0;

    for (const incident of incidents) {
      byType[incident.type]++;
      bySeverity[incident.severity]++;

      if (incident.recordable) totalRecordable++;
      if (incident.lostWorkDays > 0) lostTimeIncidents++;
      totalLostDays += incident.lostWorkDays;
      totalRestrictedDays += incident.restrictedWorkDays;
      if (incident.severity === IncidentSeverity.FATAL) fatalities++;
      if (incident.type === IncidentType.NEAR_MISS) nearMisses++;
      if (incident.type === IncidentType.UNSAFE_ACT) unsafeActs++;
      if (incident.type === IncidentType.UNSAFE_CONDITION) unsafeConditions++;
    }

    // Calculate rates per 200,000 hours worked (standard OSHA formula)
    const multiplier = 200000;
    const LTIR = hoursWorked > 0 ? (lostTimeIncidents * multiplier) / hoursWorked : 0;
    const TRIR = hoursWorked > 0 ? (totalRecordable * multiplier) / hoursWorked : 0;
    const DART = hoursWorked > 0 ? ((totalLostDays + totalRestrictedDays) * multiplier) / hoursWorked : 0;
    const severityRate = hoursWorked > 0 ? (totalLostDays * multiplier) / hoursWorked : 0;

    return {
      period: { start: startDate, end: endDate },
      totalIncidents: incidents.length,
      byType,
      bySeverity,
      totalRecordableIncidents: totalRecordable,
      lostTimeIncidents,
      totalLostWorkDays: totalLostDays,
      totalRestrictedDays,
      fatalities,
      hoursWorked,
      LTIR: Math.round(LTIR * 100) / 100,
      TRIR: Math.round(TRIR * 100) / 100,
      DART: Math.round(DART * 100) / 100,
      severityRate: Math.round(severityRate * 100) / 100,
      nearMisses,
      unsafeActs,
      unsafeConditions,
      trend: this.calculateTrend(incidents, startDate, endDate),
      previousPeriodComparison: {
        incidentChange: 0, // Would need previous period data
        ltirChange: 0,
        trirChange: 0,
      },
    };
  }

  // ===== REGULATORY REPORTING =====

  async markReportedToAuthorities(incidentId: string, reference: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);

    incident.reportedToAuthorities = true;
    incident.authorityReportDate = new Date();
    incident.authorityReference = reference;
    incident.updatedAt = new Date();
    this.incidents.set(incidentId, incident);

    this.logger.log(`Incident ${incident.incidentNumber} reported to authorities: ${reference}`);
    return incident;
  }

  getReportingRequirements(severity: IncidentSeverity): {
    reportToITM: boolean;
    reportToISCIR: boolean;
    reportWithin: string;
    forms: string[];
  } {
    const requirements = this.REPORTING_THRESHOLDS[severity];

    const forms: string[] = [];
    if (requirements.reportToITM) {
      forms.push('Formular de declarare accident de muncă (ITM)');
      forms.push('Proces-verbal de cercetare');
    }
    if (severity === IncidentSeverity.FATAL || severity === IncidentSeverity.MAJOR) {
      forms.push('Raport către Inspecția Muncii');
    }

    return {
      ...requirements,
      forms,
    };
  }

  // ===== ISM REPORT GENERATION =====

  async generateISMReport(incidentId: string, facilityName: string, companyName: string): Promise<ISMReport> {
    const incident = await this.getIncident(incidentId);

    const report: ISMReport = {
      reportNumber: `ISM-${incident.incidentNumber}`,
      vesselOrFacility: facilityName,
      company: companyName,
      reportDate: new Date(),
      incidentDate: incident.occurredAt,
      incidentType: incident.type,
      location: incident.locationDescription,
      description: incident.description,
      immediateActions: incident.immediateActions.join('; '),
      casualties: {
        fatalities: incident.severity === IncidentSeverity.FATAL ? 1 : 0,
        injuries: incident.injuredPersons.filter(p => !p.permanentDisability).length,
        illnesses: 0,
      },
      damage: incident.type === IncidentType.PROPERTY_DAMAGE ? incident.description : 'N/A',
      environmentalImpact: incident.type === IncidentType.ENVIRONMENTAL ? incident.description : 'N/A',
      rootCauses: incident.rootCauses.map(rc => rc.description),
      correctiveActions: incident.capas.filter(c => c.type === CAPAType.CORRECTIVE).map(c => c.description),
      preventiveActions: incident.capas.filter(c => c.type === CAPAType.PREVENTIVE).map(c => c.description),
      lessonsLearned: incident.investigation?.recommendations || [],
    };

    return report;
  }

  // ===== HELPER METHODS =====

  private classifySeverity(data: {
    type: IncidentType;
    injuredPersons?: InjuredPerson[];
    description: string;
  }): IncidentSeverity {
    // AI-assisted severity classification based on incident data
    const description = data.description.toLowerCase();
    const injuries = data.injuredPersons || [];

    // Fatal indicators
    if (
      description.includes('deces') ||
      description.includes('fatal') ||
      description.includes('death') ||
      injuries.some(i => i.permanentDisability && i.injuryType === InjuryType.AMPUTATION)
    ) {
      return IncidentSeverity.FATAL;
    }

    // Major indicators
    if (
      injuries.some(i => i.permanentDisability) ||
      injuries.some(i => i.hospitalizedDays > 14) ||
      description.includes('amputare') ||
      description.includes('permanent')
    ) {
      return IncidentSeverity.MAJOR;
    }

    // Serious indicators
    if (
      injuries.some(i => i.hospitalizedDays > 3) ||
      injuries.some(i => i.injuryType === InjuryType.FRACTURE) ||
      description.includes('spitalizare') ||
      description.includes('hospitalization')
    ) {
      return IncidentSeverity.SERIOUS;
    }

    // Moderate indicators
    if (
      injuries.length > 0 ||
      data.type === IncidentType.INJURY ||
      description.includes('tratament medical')
    ) {
      return IncidentSeverity.MODERATE;
    }

    // Near misses and unsafe conditions are typically minor
    if (
      data.type === IncidentType.NEAR_MISS ||
      data.type === IncidentType.UNSAFE_CONDITION ||
      data.type === IncidentType.UNSAFE_ACT
    ) {
      return IncidentSeverity.MINOR;
    }

    return IncidentSeverity.MINOR;
  }

  private requiresMedicalTreatment(injuredPersons: InjuredPerson[]): boolean {
    return injuredPersons.some(p =>
      p.hospitalizedDays > 0 ||
      [InjuryType.FRACTURE, InjuryType.BURN, InjuryType.CHEMICAL_EXPOSURE, InjuryType.ELECTRIC_SHOCK].includes(p.injuryType)
    );
  }

  private isRecordable(severity: IncidentSeverity, injuredPersons: InjuredPerson[]): boolean {
    // OSHA recordable criteria
    if (severity === IncidentSeverity.FATAL) return true;
    if (severity === IncidentSeverity.MAJOR) return true;
    if (severity === IncidentSeverity.SERIOUS) return true;
    if (injuredPersons.some(p => p.hospitalizedDays > 0)) return true;
    if (injuredPersons.some(p => p.restrictedDuty)) return true;
    if (injuredPersons.some(p => p.permanentDisability)) return true;
    return false;
  }

  private analyzeImage(url: string, description?: string): MediaAttachment['aiAnalysis'] {
    // Simulated AI image analysis
    // In production, this would call a vision AI model
    const hazards: string[] = [];
    const severityIndicators: string[] = [];

    const desc = (description || '').toLowerCase();

    if (desc.includes('blood') || desc.includes('sânge')) {
      hazards.push('Visible injury');
      severityIndicators.push('Blood visible');
    }
    if (desc.includes('broken') || desc.includes('rupt')) {
      hazards.push('Equipment damage');
      severityIndicators.push('Broken equipment');
    }
    if (desc.includes('fire') || desc.includes('foc') || desc.includes('incendiu')) {
      hazards.push('Fire hazard');
      severityIndicators.push('Fire/smoke visible');
    }
    if (desc.includes('spill') || desc.includes('scurgere')) {
      hazards.push('Chemical spill');
      severityIndicators.push('Liquid spill visible');
    }

    return {
      detectedHazards: hazards,
      severityIndicators,
      confidence: hazards.length > 0 ? 0.75 : 0.5,
    };
  }

  private categorizeRootCause(description: string): RootCauseCategory {
    const desc = description.toLowerCase();

    if (desc.includes('training') || desc.includes('instruire') || desc.includes('knowledge')) {
      return RootCauseCategory.LACK_OF_KNOWLEDGE;
    }
    if (desc.includes('procedure') || desc.includes('procedură') || desc.includes('standard')) {
      return RootCauseCategory.INADEQUATE_STANDARDS;
    }
    if (desc.includes('maintenance') || desc.includes('întreținere')) {
      return RootCauseCategory.INADEQUATE_MAINTENANCE;
    }
    if (desc.includes('supervision') || desc.includes('supraveghere')) {
      return RootCauseCategory.SUPERVISION;
    }
    if (desc.includes('equipment') || desc.includes('echipament') || desc.includes('tool')) {
      return RootCauseCategory.INADEQUATE_TOOLS;
    }
    if (desc.includes('stress') || desc.includes('fatigue') || desc.includes('oboseală')) {
      return RootCauseCategory.STRESS;
    }
    if (desc.includes('communication') || desc.includes('comunicare')) {
      return RootCauseCategory.COMMUNICATION;
    }

    return RootCauseCategory.UNSAFE_ACT;
  }

  private mapFishboneToRootCauseCategory(fishbone: RootCause['fishboneCategory']): RootCauseCategory {
    const mapping: Record<NonNullable<RootCause['fishboneCategory']>, RootCauseCategory> = {
      MANPOWER: RootCauseCategory.LACK_OF_SKILL,
      MACHINE: RootCauseCategory.INADEQUATE_MAINTENANCE,
      METHOD: RootCauseCategory.INADEQUATE_STANDARDS,
      MATERIAL: RootCauseCategory.INADEQUATE_PURCHASING,
      MEASUREMENT: RootCauseCategory.MANAGEMENT_SYSTEM,
      ENVIRONMENT: RootCauseCategory.UNSAFE_CONDITION,
    };
    return mapping[fishbone!] || RootCauseCategory.UNSAFE_ACT;
  }

  private calculateTrend(incidents: Incident[], startDate: Date, endDate: Date): 'IMPROVING' | 'STABLE' | 'WORSENING' {
    if (incidents.length < 2) return 'STABLE';

    const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    const firstHalf = incidents.filter(i => i.occurredAt < midPoint);
    const secondHalf = incidents.filter(i => i.occurredAt >= midPoint);

    const firstHalfScore = firstHalf.reduce((sum, i) => sum + this.severityScore(i.severity), 0);
    const secondHalfScore = secondHalf.reduce((sum, i) => sum + this.severityScore(i.severity), 0);

    if (secondHalfScore < firstHalfScore * 0.8) return 'IMPROVING';
    if (secondHalfScore > firstHalfScore * 1.2) return 'WORSENING';
    return 'STABLE';
  }

  private severityScore(severity: IncidentSeverity): number {
    const scores: Record<IncidentSeverity, number> = {
      [IncidentSeverity.MINOR]: 1,
      [IncidentSeverity.MODERATE]: 2,
      [IncidentSeverity.SERIOUS]: 4,
      [IncidentSeverity.MAJOR]: 8,
      [IncidentSeverity.FATAL]: 16,
    };
    return scores[severity];
  }
}

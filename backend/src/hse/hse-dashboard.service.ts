import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// HSE Dashboard & Audit Service
// ISO 45001:2018 (Occupational Health & Safety) and ISO 14001:2015 (Environmental Management)

// ISO Standard Types
export type ISOStandard = 'ISO_45001' | 'ISO_14001';
export type AuditType = 'INTERNAL' | 'EXTERNAL' | 'SURVEILLANCE' | 'CERTIFICATION' | 'RECERTIFICATION';
export type AuditStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type FindingType = 'MAJOR_NC' | 'MINOR_NC' | 'OBSERVATION' | 'OPPORTUNITY' | 'POSITIVE';
export type NCRStatus = 'OPEN' | 'ROOT_CAUSE_ANALYSIS' | 'CORRECTIVE_ACTION' | 'VERIFICATION' | 'CLOSED' | 'OVERDUE';
export type NCRPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ReviewStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';

// Safety KPI Targets (Industry Standards)
export const SAFETY_KPI_TARGETS = {
  LTIR: 2.0,      // Lost Time Incident Rate target (per 200,000 hours)
  TRIR: 4.0,      // Total Recordable Incident Rate target
  DART: 1.5,      // Days Away, Restricted, or Transferred rate
  SEVERITY_RATE: 50,  // Severity rate target
  NEAR_MISS_RATIO: 10, // Near misses per recordable incident (Heinrich ratio)
  TRAINING_COMPLIANCE: 95, // % employees with valid training
  AUDIT_SCORE: 85,   // Minimum audit score %
};

// Environmental KPI Targets
export const ENVIRONMENTAL_KPI_TARGETS = {
  WASTE_REDUCTION: 10,     // % year-over-year reduction
  ENERGY_EFFICIENCY: 5,    // % improvement target
  WATER_CONSERVATION: 5,   // % reduction target
  CARBON_FOOTPRINT: 10,    // % reduction target
  RECYCLING_RATE: 75,      // % of waste recycled
  SPILL_INCIDENTS: 0,      // Zero spill target
};

export interface SafetyKPIs {
  period: { from: Date; to: Date };
  hoursWorked: number;
  incidents: {
    total: number;
    recordable: number;
    lostTime: number;
    nearMiss: number;
    firstAid: number;
  };
  lostDays: number;
  restrictedDays: number;
  rates: {
    LTIR: number;
    TRIR: number;
    DART: number;
    severityRate: number;
    nearMissRatio: number;
  };
  targets: typeof SAFETY_KPI_TARGETS;
  performance: {
    LTIR: 'EXCEEDS' | 'MEETS' | 'BELOW';
    TRIR: 'EXCEEDS' | 'MEETS' | 'BELOW';
    DART: 'EXCEEDS' | 'MEETS' | 'BELOW';
  };
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
}

export interface EnvironmentalKPIs {
  period: { from: Date; to: Date };
  waste: {
    totalKg: number;
    recycledKg: number;
    recyclingRate: number;
    hazardousKg: number;
  };
  energy: {
    consumptionKWh: number;
    renewableKWh: number;
    efficiencyScore: number;
  };
  water: {
    consumptionM3: number;
    recycledM3: number;
  };
  emissions: {
    co2Tonnes: number;
    scope1: number;
    scope2: number;
    scope3: number;
  };
  spills: {
    count: number;
    volumeLiters: number;
  };
  targets: typeof ENVIRONMENTAL_KPI_TARGETS;
  compliance: {
    wasteReduction: 'MEETS' | 'BELOW';
    energyEfficiency: 'MEETS' | 'BELOW';
    recyclingRate: 'MEETS' | 'BELOW';
  };
}

export interface ISOClause {
  id: string;
  number: string;
  title: string;
  description: string;
  standard: ISOStandard;
  checklistItems: AuditChecklistItem[];
}

export interface AuditChecklistItem {
  id: string;
  clauseNumber: string;
  requirement: string;
  evidenceRequired: string[];
  guidance: string;
  mandatory: boolean;
}

export interface Audit {
  id: string;
  auditNumber: string;
  standard: ISOStandard;
  type: AuditType;
  title: string;
  scope: string;
  scheduledDate: Date;
  endDate: Date;
  location: string;
  status: AuditStatus;
  leadAuditor: AuditorInfo;
  auditTeam: AuditorInfo[];
  auditees: string[];
  checklist: AuditChecklistResult[];
  findings: AuditFinding[];
  overallScore: number;
  recommendation: 'CERTIFY' | 'CONDITIONAL' | 'NOT_CERTIFY' | 'MAINTAIN' | 'SUSPEND' | 'N/A';
  executiveSummary: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AuditorInfo {
  id: string;
  name: string;
  email: string;
  organization: string;
  certifications: string[];
  role: 'LEAD_AUDITOR' | 'AUDITOR' | 'TECHNICAL_EXPERT' | 'OBSERVER';
}

export interface AuditChecklistResult {
  itemId: string;
  clauseNumber: string;
  requirement: string;
  status: 'CONFORMING' | 'MINOR_NC' | 'MAJOR_NC' | 'NOT_APPLICABLE' | 'NOT_AUDITED';
  evidence: string[];
  notes: string;
  auditorId: string;
  auditedAt?: Date;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  type: FindingType;
  clauseNumber: string;
  description: string;
  evidence: string[];
  rootCause?: string;
  correctiveAction?: string;
  dueDate?: Date;
  assignedTo?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'VERIFIED';
  verifiedBy?: string;
  verifiedAt?: Date;
  ncrId?: string;
}

export interface NonConformanceReport {
  id: string;
  ncrNumber: string;
  standard: ISOStandard;
  source: 'AUDIT' | 'INCIDENT' | 'COMPLAINT' | 'INSPECTION' | 'SELF_IDENTIFIED';
  sourceReference?: string;
  title: string;
  description: string;
  clauseNumber: string;
  priority: NCRPriority;
  status: NCRStatus;
  detectedDate: Date;
  detectedBy: string;
  department: string;
  location: string;
  immediateAction?: string;
  rootCauseAnalysis?: RootCauseAnalysis;
  correctiveAction?: CorrectiveActionPlan;
  verification?: VerificationRecord;
  dueDate: Date;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RootCauseAnalysis {
  method: 'FIVE_WHY' | 'FISHBONE' | 'FAULT_TREE' | 'PARETO';
  analysis: string;
  rootCauses: string[];
  contributingFactors: string[];
  completedBy: string;
  completedAt: Date;
}

export interface CorrectiveActionPlan {
  actions: CorrectiveActionItem[];
  preventiveActions: string[];
  resourcesRequired: string;
  estimatedCost?: number;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface CorrectiveActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completedAt?: Date;
  evidence?: string[];
}

export interface VerificationRecord {
  verifiedBy: string;
  verifiedAt: Date;
  effectivenessRating: 1 | 2 | 3 | 4 | 5;
  effectivenessEvidence: string[];
  recurrencePrevented: boolean;
  notes: string;
}

export interface ManagementReview {
  id: string;
  reviewNumber: string;
  standard: ISOStandard;
  period: { from: Date; to: Date };
  scheduledDate: Date;
  status: ReviewStatus;
  chairperson: string;
  attendees: string[];
  agenda: ManagementReviewAgenda;
  inputs: ManagementReviewInputs;
  outputs: ManagementReviewOutputs;
  minutes?: string;
  actionItems: ManagementReviewAction[];
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface ManagementReviewAgenda {
  items: {
    order: number;
    topic: string;
    presenter: string;
    duration: number;
  }[];
}

export interface ManagementReviewInputs {
  previousReviewActions: { action: string; status: string }[];
  auditResults: { audits: number; findings: number; closedNCRs: number };
  customerFeedback: { complaints: number; satisfaction: number };
  processPerformance: { kpis: Record<string, number> };
  incidentSummary: { total: number; recordable: number; trend: string };
  riskAssessmentChanges: string[];
  opportunitiesForImprovement: string[];
  resourceNeeds: string[];
  supplierPerformance: { evaluated: number; approved: number };
  regulatoryChanges: string[];
  trainingStatus: { compliance: number; gaps: string[] };
}

export interface ManagementReviewOutputs {
  decisionsAndActions: string[];
  resourceAllocations: string[];
  objectivesRevisions: string[];
  policyChanges: string[];
  improvementOpportunities: string[];
  nextReviewDate: Date;
}

export interface ManagementReviewAction {
  id: string;
  action: string;
  assignedTo: string;
  dueDate: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completedAt?: Date;
  notes?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'KPI_GAUGE' | 'TREND_CHART' | 'STATUS_CARD' | 'NCR_SUMMARY' | 'AUDIT_CALENDAR' | 'COMPLIANCE_RADAR' | 'INCIDENT_HEATMAP';
  title: string;
  data: any;
  config: Record<string, any>;
}

export interface HSEDashboard {
  generatedAt: Date;
  period: { from: Date; to: Date };
  safetyKPIs: SafetyKPIs;
  environmentalKPIs: EnvironmentalKPIs;
  complianceScore: {
    iso45001: number;
    iso14001: number;
    overall: number;
  };
  openNCRs: {
    total: number;
    critical: number;
    overdue: number;
  };
  upcomingAudits: Audit[];
  recentFindings: AuditFinding[];
  trainingCompliance: number;
  certificationStatus: {
    iso45001: 'CERTIFIED' | 'PENDING' | 'EXPIRED' | 'NOT_CERTIFIED';
    iso14001: 'CERTIFIED' | 'PENDING' | 'EXPIRED' | 'NOT_CERTIFIED';
    expiryDates: { iso45001?: Date; iso14001?: Date };
  };
  alerts: DashboardAlert[];
  widgets: DashboardWidget[];
}

export interface DashboardAlert {
  id: string;
  type: 'NCR_OVERDUE' | 'AUDIT_DUE' | 'CERTIFICATION_EXPIRY' | 'KPI_THRESHOLD' | 'TRAINING_GAP';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  relatedEntityId?: string;
  createdAt: Date;
}

@Injectable()
export class HSEDashboardService {
  // In-memory storage
  private audits: Map<string, Audit> = new Map();
  private ncrs: Map<string, NonConformanceReport> = new Map();
  private managementReviews: Map<string, ManagementReview> = new Map();
  private iso45001Clauses: ISOClause[] = [];
  private iso14001Clauses: ISOClause[] = [];

  constructor(private configService: ConfigService) {
    this.initializeISOClauses();
  }

  private initializeISOClauses(): void {
    // ISO 45001:2018 Main Clauses
    this.iso45001Clauses = [
      {
        id: 'iso45001-4',
        number: '4',
        title: 'Context of the Organization',
        description: 'Understanding the organization and its context, needs and expectations of workers and other interested parties',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '4.1-1', clauseNumber: '4.1', requirement: 'Determine external and internal issues relevant to OH&S', evidenceRequired: ['Context analysis document', 'SWOT analysis'], guidance: 'Review business environment factors', mandatory: true },
          { id: '4.2-1', clauseNumber: '4.2', requirement: 'Determine interested parties and their OH&S requirements', evidenceRequired: ['Stakeholder register', 'Requirements matrix'], guidance: 'Include workers, contractors, regulators', mandatory: true },
          { id: '4.3-1', clauseNumber: '4.3', requirement: 'Determine scope of OH&S management system', evidenceRequired: ['Scope statement', 'Organizational boundaries'], guidance: 'Document activities, products, services covered', mandatory: true },
          { id: '4.4-1', clauseNumber: '4.4', requirement: 'Establish, implement, maintain and improve OH&S management system', evidenceRequired: ['OHSMS manual', 'Process documentation'], guidance: 'Demonstrate PDCA cycle', mandatory: true },
        ],
      },
      {
        id: 'iso45001-5',
        number: '5',
        title: 'Leadership and Worker Participation',
        description: 'Top management commitment, OH&S policy, organizational roles, consultation and participation',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '5.1-1', clauseNumber: '5.1', requirement: 'Top management demonstrates leadership and commitment', evidenceRequired: ['Management review minutes', 'Resource allocation records'], guidance: 'Evidence of visible leadership', mandatory: true },
          { id: '5.2-1', clauseNumber: '5.2', requirement: 'OH&S policy established, communicated, maintained', evidenceRequired: ['OH&S policy document', 'Communication records'], guidance: 'Policy must be appropriate to nature of risks', mandatory: true },
          { id: '5.3-1', clauseNumber: '5.3', requirement: 'Organizational roles, responsibilities and authorities assigned', evidenceRequired: ['Organizational chart', 'Role descriptions'], guidance: 'Include OH&S responsibilities in job descriptions', mandatory: true },
          { id: '5.4-1', clauseNumber: '5.4', requirement: 'Consultation and participation of workers', evidenceRequired: ['Safety committee minutes', 'Worker feedback records'], guidance: 'Document mechanisms for worker involvement', mandatory: true },
        ],
      },
      {
        id: 'iso45001-6',
        number: '6',
        title: 'Planning',
        description: 'Actions to address risks and opportunities, OH&S objectives and planning to achieve them',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '6.1.1-1', clauseNumber: '6.1.1', requirement: 'Determine risks and opportunities to address', evidenceRequired: ['Risk register', 'Opportunity log'], guidance: 'Consider context, interested parties, scope', mandatory: true },
          { id: '6.1.2-1', clauseNumber: '6.1.2', requirement: 'Hazard identification process established', evidenceRequired: ['Hazard identification procedure', 'Hazard register'], guidance: 'Ongoing, proactive identification', mandatory: true },
          { id: '6.1.3-1', clauseNumber: '6.1.3', requirement: 'Legal and other requirements determined', evidenceRequired: ['Legal register', 'Compliance evaluation records'], guidance: 'Include applicable legislation and standards', mandatory: true },
          { id: '6.2-1', clauseNumber: '6.2', requirement: 'OH&S objectives established and plans to achieve them', evidenceRequired: ['OH&S objectives', 'Action plans'], guidance: 'SMART objectives with metrics', mandatory: true },
        ],
      },
      {
        id: 'iso45001-7',
        number: '7',
        title: 'Support',
        description: 'Resources, competence, awareness, communication, documented information',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '7.1-1', clauseNumber: '7.1', requirement: 'Resources determined and provided', evidenceRequired: ['Resource plan', 'Budget allocation'], guidance: 'Include human, financial, infrastructure', mandatory: true },
          { id: '7.2-1', clauseNumber: '7.2', requirement: 'Competence requirements determined and maintained', evidenceRequired: ['Training matrix', 'Competence records'], guidance: 'Based on education, training, experience', mandatory: true },
          { id: '7.3-1', clauseNumber: '7.3', requirement: 'Workers aware of OH&S policy, objectives, contribution', evidenceRequired: ['Awareness training records', 'Communication logs'], guidance: 'Include consequences of not conforming', mandatory: true },
          { id: '7.4-1', clauseNumber: '7.4', requirement: 'Internal and external communication processes established', evidenceRequired: ['Communication procedure', 'Communication records'], guidance: 'What, when, with whom, how to communicate', mandatory: true },
          { id: '7.5-1', clauseNumber: '7.5', requirement: 'Documented information controlled', evidenceRequired: ['Document control procedure', 'Document register'], guidance: 'Creation, update, control of documents', mandatory: true },
        ],
      },
      {
        id: 'iso45001-8',
        number: '8',
        title: 'Operation',
        description: 'Operational planning and control, emergency preparedness and response',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '8.1.1-1', clauseNumber: '8.1.1', requirement: 'Operational controls implemented', evidenceRequired: ['Control procedures', 'Work instructions'], guidance: 'Hierarchy of controls applied', mandatory: true },
          { id: '8.1.2-1', clauseNumber: '8.1.2', requirement: 'Eliminating hazards and reducing OH&S risks', evidenceRequired: ['Risk assessment records', 'Control implementation evidence'], guidance: 'Follow hierarchy of controls', mandatory: true },
          { id: '8.1.3-1', clauseNumber: '8.1.3', requirement: 'Management of change process established', evidenceRequired: ['MOC procedure', 'Change records'], guidance: 'Planned and unplanned changes managed', mandatory: true },
          { id: '8.1.4-1', clauseNumber: '8.1.4', requirement: 'Procurement controls including contractors', evidenceRequired: ['Contractor management procedure', 'Evaluation records'], guidance: 'OH&S requirements in procurement', mandatory: true },
          { id: '8.2-1', clauseNumber: '8.2', requirement: 'Emergency preparedness and response', evidenceRequired: ['Emergency plan', 'Drill records'], guidance: 'Plans tested and reviewed', mandatory: true },
        ],
      },
      {
        id: 'iso45001-9',
        number: '9',
        title: 'Performance Evaluation',
        description: 'Monitoring, measurement, analysis and evaluation, internal audit, management review',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '9.1.1-1', clauseNumber: '9.1.1', requirement: 'Monitoring, measurement and evaluation processes', evidenceRequired: ['Monitoring procedure', 'KPI records'], guidance: 'What, methods, criteria, frequency defined', mandatory: true },
          { id: '9.1.2-1', clauseNumber: '9.1.2', requirement: 'Compliance evaluation performed', evidenceRequired: ['Compliance audit records', 'Legal register updates'], guidance: 'Evaluate compliance with legal requirements', mandatory: true },
          { id: '9.2-1', clauseNumber: '9.2', requirement: 'Internal audit program implemented', evidenceRequired: ['Audit program', 'Audit reports'], guidance: 'Planned intervals, criteria, scope defined', mandatory: true },
          { id: '9.3-1', clauseNumber: '9.3', requirement: 'Management review conducted', evidenceRequired: ['Management review minutes', 'Action records'], guidance: 'Required inputs and outputs addressed', mandatory: true },
        ],
      },
      {
        id: 'iso45001-10',
        number: '10',
        title: 'Improvement',
        description: 'Incident, nonconformity and corrective action, continual improvement',
        standard: 'ISO_45001',
        checklistItems: [
          { id: '10.2-1', clauseNumber: '10.2', requirement: 'Incident investigation and corrective action process', evidenceRequired: ['Incident procedure', 'Investigation records', 'NCR log'], guidance: 'Root cause analysis, effectiveness verification', mandatory: true },
          { id: '10.3-1', clauseNumber: '10.3', requirement: 'Continual improvement demonstrated', evidenceRequired: ['Improvement records', 'Trend analysis'], guidance: 'Enhance OH&S performance continuously', mandatory: true },
        ],
      },
    ];

    // ISO 14001:2015 Main Clauses
    this.iso14001Clauses = [
      {
        id: 'iso14001-4',
        number: '4',
        title: 'Context of the Organization',
        description: 'Understanding the organization and its context, needs of interested parties, EMS scope',
        standard: 'ISO_14001',
        checklistItems: [
          { id: 'e4.1-1', clauseNumber: '4.1', requirement: 'Determine external and internal issues relevant to EMS', evidenceRequired: ['Context analysis', 'Environmental scan'], guidance: 'Include environmental conditions affected by organization', mandatory: true },
          { id: 'e4.2-1', clauseNumber: '4.2', requirement: 'Determine interested parties and their requirements', evidenceRequired: ['Stakeholder analysis', 'Requirements register'], guidance: 'Include regulatory bodies, communities', mandatory: true },
          { id: 'e4.3-1', clauseNumber: '4.3', requirement: 'Determine scope of EMS', evidenceRequired: ['EMS scope statement', 'Site boundaries'], guidance: 'Consider activities, products, services', mandatory: true },
        ],
      },
      {
        id: 'iso14001-6',
        number: '6',
        title: 'Planning',
        description: 'Environmental aspects, compliance obligations, risks and opportunities, objectives',
        standard: 'ISO_14001',
        checklistItems: [
          { id: 'e6.1.2-1', clauseNumber: '6.1.2', requirement: 'Environmental aspects determined', evidenceRequired: ['Aspects register', 'Significance evaluation'], guidance: 'Lifecycle perspective considered', mandatory: true },
          { id: 'e6.1.3-1', clauseNumber: '6.1.3', requirement: 'Compliance obligations determined', evidenceRequired: ['Legal register', 'Permits and licenses'], guidance: 'Include applicable environmental laws', mandatory: true },
          { id: 'e6.2-1', clauseNumber: '6.2', requirement: 'Environmental objectives and plans established', evidenceRequired: ['Environmental objectives', 'Action plans'], guidance: 'Consistent with environmental policy', mandatory: true },
        ],
      },
      {
        id: 'iso14001-8',
        number: '8',
        title: 'Operation',
        description: 'Operational planning and control, emergency preparedness',
        standard: 'ISO_14001',
        checklistItems: [
          { id: 'e8.1-1', clauseNumber: '8.1', requirement: 'Operational controls for significant aspects', evidenceRequired: ['Control procedures', 'Operating criteria'], guidance: 'Lifecycle perspective in design, procurement', mandatory: true },
          { id: 'e8.2-1', clauseNumber: '8.2', requirement: 'Emergency preparedness for environmental incidents', evidenceRequired: ['Emergency response plan', 'Spill procedures'], guidance: 'Plans tested periodically', mandatory: true },
        ],
      },
      {
        id: 'iso14001-9',
        number: '9',
        title: 'Performance Evaluation',
        description: 'Monitoring, measurement, compliance evaluation, internal audit, management review',
        standard: 'ISO_14001',
        checklistItems: [
          { id: 'e9.1.1-1', clauseNumber: '9.1.1', requirement: 'Environmental performance monitored and measured', evidenceRequired: ['Monitoring records', 'Equipment calibration'], guidance: 'Key characteristics of operations monitored', mandatory: true },
          { id: 'e9.1.2-1', clauseNumber: '9.1.2', requirement: 'Compliance evaluated periodically', evidenceRequired: ['Compliance audit reports', 'Permit compliance'], guidance: 'Maintain knowledge of compliance status', mandatory: true },
          { id: 'e9.2-1', clauseNumber: '9.2', requirement: 'Internal audit conducted', evidenceRequired: ['Audit program', 'Audit reports'], guidance: 'Planned intervals, objective auditors', mandatory: true },
          { id: 'e9.3-1', clauseNumber: '9.3', requirement: 'Management review conducted', evidenceRequired: ['Review minutes', 'Decisions recorded'], guidance: 'All required inputs addressed', mandatory: true },
        ],
      },
    ];
  }

  // Reset state for testing
  resetState(): void {
    this.audits.clear();
    this.ncrs.clear();
    this.managementReviews.clear();
  }

  // ===== SAFETY KPIs =====

  async calculateSafetyKPIs(
    period: { from: Date; to: Date },
    data: {
      hoursWorked: number;
      totalIncidents: number;
      recordableIncidents: number;
      lostTimeIncidents: number;
      nearMisses: number;
      firstAidCases: number;
      lostDays: number;
      restrictedDays: number;
    },
  ): Promise<SafetyKPIs> {
    const multiplier = 200000; // OSHA standard per 200,000 hours

    const LTIR = (data.lostTimeIncidents / data.hoursWorked) * multiplier;
    const TRIR = (data.recordableIncidents / data.hoursWorked) * multiplier;
    const DART = ((data.lostTimeIncidents + data.restrictedDays) / data.hoursWorked) * multiplier;
    const severityRate = (data.lostDays / data.hoursWorked) * multiplier;
    const nearMissRatio = data.recordableIncidents > 0 ? data.nearMisses / data.recordableIncidents : data.nearMisses;

    const getPerformance = (actual: number, target: number): 'EXCEEDS' | 'MEETS' | 'BELOW' => {
      if (actual <= target * 0.8) return 'EXCEEDS';
      if (actual <= target) return 'MEETS';
      return 'BELOW';
    };

    return {
      period,
      hoursWorked: data.hoursWorked,
      incidents: {
        total: data.totalIncidents,
        recordable: data.recordableIncidents,
        lostTime: data.lostTimeIncidents,
        nearMiss: data.nearMisses,
        firstAid: data.firstAidCases,
      },
      lostDays: data.lostDays,
      restrictedDays: data.restrictedDays,
      rates: {
        LTIR: Math.round(LTIR * 100) / 100,
        TRIR: Math.round(TRIR * 100) / 100,
        DART: Math.round(DART * 100) / 100,
        severityRate: Math.round(severityRate * 100) / 100,
        nearMissRatio: Math.round(nearMissRatio * 100) / 100,
      },
      targets: SAFETY_KPI_TARGETS,
      performance: {
        LTIR: getPerformance(LTIR, SAFETY_KPI_TARGETS.LTIR),
        TRIR: getPerformance(TRIR, SAFETY_KPI_TARGETS.TRIR),
        DART: getPerformance(DART, SAFETY_KPI_TARGETS.DART),
      },
      trend: LTIR <= SAFETY_KPI_TARGETS.LTIR ? 'IMPROVING' : 'WORSENING',
    };
  }

  async calculateEnvironmentalKPIs(
    period: { from: Date; to: Date },
    data: {
      wasteTotal: number;
      wasteRecycled: number;
      wasteHazardous: number;
      energyConsumption: number;
      energyRenewable: number;
      waterConsumption: number;
      waterRecycled: number;
      co2Total: number;
      co2Scope1: number;
      co2Scope2: number;
      co2Scope3: number;
      spillCount: number;
      spillVolume: number;
    },
  ): Promise<EnvironmentalKPIs> {
    const recyclingRate = data.wasteTotal > 0 ? (data.wasteRecycled / data.wasteTotal) * 100 : 0;
    const efficiencyScore = data.energyConsumption > 0 ? (data.energyRenewable / data.energyConsumption) * 100 : 0;

    return {
      period,
      waste: {
        totalKg: data.wasteTotal,
        recycledKg: data.wasteRecycled,
        recyclingRate: Math.round(recyclingRate * 10) / 10,
        hazardousKg: data.wasteHazardous,
      },
      energy: {
        consumptionKWh: data.energyConsumption,
        renewableKWh: data.energyRenewable,
        efficiencyScore: Math.round(efficiencyScore * 10) / 10,
      },
      water: {
        consumptionM3: data.waterConsumption,
        recycledM3: data.waterRecycled,
      },
      emissions: {
        co2Tonnes: data.co2Total,
        scope1: data.co2Scope1,
        scope2: data.co2Scope2,
        scope3: data.co2Scope3,
      },
      spills: {
        count: data.spillCount,
        volumeLiters: data.spillVolume,
      },
      targets: ENVIRONMENTAL_KPI_TARGETS,
      compliance: {
        wasteReduction: 'MEETS',
        energyEfficiency: efficiencyScore >= ENVIRONMENTAL_KPI_TARGETS.ENERGY_EFFICIENCY ? 'MEETS' : 'BELOW',
        recyclingRate: recyclingRate >= ENVIRONMENTAL_KPI_TARGETS.RECYCLING_RATE ? 'MEETS' : 'BELOW',
      },
    };
  }

  // ===== AUDIT MANAGEMENT =====

  async getISOClauses(standard: ISOStandard): Promise<ISOClause[]> {
    return standard === 'ISO_45001' ? this.iso45001Clauses : this.iso14001Clauses;
  }

  async createAudit(data: {
    standard: ISOStandard;
    type: AuditType;
    title: string;
    scope: string;
    scheduledDate: Date;
    endDate: Date;
    location: string;
    leadAuditor: AuditorInfo;
    auditTeam?: AuditorInfo[];
    auditees: string[];
  }): Promise<Audit> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const auditNumber = `AUD-${data.standard === 'ISO_45001' ? '45' : '14'}-${new Date().getFullYear()}-${String(this.audits.size + 1).padStart(3, '0')}`;

    // Generate checklist from ISO clauses
    const clauses = await this.getISOClauses(data.standard);
    const checklist: AuditChecklistResult[] = [];
    for (const clause of clauses) {
      for (const item of clause.checklistItems) {
        checklist.push({
          itemId: item.id,
          clauseNumber: item.clauseNumber,
          requirement: item.requirement,
          status: 'NOT_AUDITED',
          evidence: [],
          notes: '',
          auditorId: data.leadAuditor.id,
        });
      }
    }

    const audit: Audit = {
      id,
      auditNumber,
      standard: data.standard,
      type: data.type,
      title: data.title,
      scope: data.scope,
      scheduledDate: data.scheduledDate,
      endDate: data.endDate,
      location: data.location,
      status: 'PLANNED',
      leadAuditor: data.leadAuditor,
      auditTeam: data.auditTeam || [],
      auditees: data.auditees,
      checklist,
      findings: [],
      overallScore: 0,
      recommendation: 'N/A',
      executiveSummary: '',
      createdAt: new Date(),
    };

    this.audits.set(id, audit);
    return audit;
  }

  async getAudit(auditId: string): Promise<Audit | null> {
    return this.audits.get(auditId) || null;
  }

  async listAudits(filters?: {
    standard?: ISOStandard;
    type?: AuditType;
    status?: AuditStatus;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Audit[]> {
    let audits = Array.from(this.audits.values());

    if (filters) {
      if (filters.standard) {
        audits = audits.filter(a => a.standard === filters.standard);
      }
      if (filters.type) {
        audits = audits.filter(a => a.type === filters.type);
      }
      if (filters.status) {
        audits = audits.filter(a => a.status === filters.status);
      }
      if (filters.fromDate) {
        audits = audits.filter(a => a.scheduledDate >= filters.fromDate!);
      }
      if (filters.toDate) {
        audits = audits.filter(a => a.scheduledDate <= filters.toDate!);
      }
    }

    return audits.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async startAudit(auditId: string): Promise<Audit> {
    const audit = this.audits.get(auditId);
    if (!audit) throw new Error('Audit not found');

    audit.status = 'IN_PROGRESS';
    return audit;
  }

  async updateChecklistItem(
    auditId: string,
    itemId: string,
    result: {
      status: AuditChecklistResult['status'];
      evidence: string[];
      notes: string;
    },
  ): Promise<Audit> {
    const audit = this.audits.get(auditId);
    if (!audit) throw new Error('Audit not found');

    const item = audit.checklist.find(c => c.itemId === itemId);
    if (!item) throw new Error('Checklist item not found');

    item.status = result.status;
    item.evidence = result.evidence;
    item.notes = result.notes;
    item.auditedAt = new Date();

    return audit;
  }

  async addAuditFinding(
    auditId: string,
    finding: {
      type: FindingType;
      clauseNumber: string;
      description: string;
      evidence: string[];
      correctiveAction?: string;
      dueDate?: Date;
      assignedTo?: string;
    },
  ): Promise<AuditFinding> {
    const audit = this.audits.get(auditId);
    if (!audit) throw new Error('Audit not found');

    const id = `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const auditFinding: AuditFinding = {
      id,
      auditId,
      type: finding.type,
      clauseNumber: finding.clauseNumber,
      description: finding.description,
      evidence: finding.evidence,
      correctiveAction: finding.correctiveAction,
      dueDate: finding.dueDate,
      assignedTo: finding.assignedTo,
      status: 'OPEN',
    };

    audit.findings.push(auditFinding);

    // Auto-create NCR for non-conformities
    if (finding.type === 'MAJOR_NC' || finding.type === 'MINOR_NC') {
      const ncr = await this.createNCR({
        standard: audit.standard,
        source: 'AUDIT',
        sourceReference: auditId,
        title: `Audit Finding: ${finding.description.substring(0, 50)}`,
        description: finding.description,
        clauseNumber: finding.clauseNumber,
        priority: finding.type === 'MAJOR_NC' ? 'HIGH' : 'MEDIUM',
        detectedBy: audit.leadAuditor.name,
        department: 'N/A',
        location: audit.location,
        dueDate: finding.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      auditFinding.ncrId = ncr.id;
    }

    return auditFinding;
  }

  async completeAudit(
    auditId: string,
    data: {
      executiveSummary: string;
      recommendation: Audit['recommendation'];
    },
  ): Promise<Audit> {
    const audit = this.audits.get(auditId);
    if (!audit) throw new Error('Audit not found');

    // Calculate overall score
    const audited = audit.checklist.filter(c => c.status !== 'NOT_AUDITED' && c.status !== 'NOT_APPLICABLE');
    const conforming = audited.filter(c => c.status === 'CONFORMING').length;
    audit.overallScore = audited.length > 0 ? Math.round((conforming / audited.length) * 100) : 0;

    audit.status = 'COMPLETED';
    audit.completedAt = new Date();
    audit.executiveSummary = data.executiveSummary;
    audit.recommendation = data.recommendation;

    return audit;
  }

  // ===== NON-CONFORMANCE REPORTS =====

  async createNCR(data: {
    standard: ISOStandard;
    source: NonConformanceReport['source'];
    sourceReference?: string;
    title: string;
    description: string;
    clauseNumber: string;
    priority: NCRPriority;
    detectedBy: string;
    department: string;
    location: string;
    immediateAction?: string;
    dueDate: Date;
  }): Promise<NonConformanceReport> {
    const id = `ncr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ncrNumber = `NCR-${data.standard === 'ISO_45001' ? '45' : '14'}-${new Date().getFullYear()}-${String(this.ncrs.size + 1).padStart(4, '0')}`;

    const ncr: NonConformanceReport = {
      id,
      ncrNumber,
      standard: data.standard,
      source: data.source,
      sourceReference: data.sourceReference,
      title: data.title,
      description: data.description,
      clauseNumber: data.clauseNumber,
      priority: data.priority,
      status: 'OPEN',
      detectedDate: new Date(),
      detectedBy: data.detectedBy,
      department: data.department,
      location: data.location,
      immediateAction: data.immediateAction,
      dueDate: data.dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.ncrs.set(id, ncr);
    return ncr;
  }

  async getNCR(ncrId: string): Promise<NonConformanceReport | null> {
    return this.ncrs.get(ncrId) || null;
  }

  async listNCRs(filters?: {
    standard?: ISOStandard;
    status?: NCRStatus;
    priority?: NCRPriority;
    source?: NonConformanceReport['source'];
    overdueOnly?: boolean;
  }): Promise<NonConformanceReport[]> {
    let ncrs = Array.from(this.ncrs.values());
    const now = new Date();

    if (filters) {
      if (filters.standard) {
        ncrs = ncrs.filter(n => n.standard === filters.standard);
      }
      if (filters.status) {
        ncrs = ncrs.filter(n => n.status === filters.status);
      }
      if (filters.priority) {
        ncrs = ncrs.filter(n => n.priority === filters.priority);
      }
      if (filters.source) {
        ncrs = ncrs.filter(n => n.source === filters.source);
      }
      if (filters.overdueOnly) {
        ncrs = ncrs.filter(n => n.dueDate < now && n.status !== 'CLOSED');
      }
    }

    return ncrs.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async addRootCauseAnalysis(ncrId: string, rca: RootCauseAnalysis): Promise<NonConformanceReport> {
    const ncr = this.ncrs.get(ncrId);
    if (!ncr) throw new Error('NCR not found');

    ncr.rootCauseAnalysis = rca;
    ncr.status = 'ROOT_CAUSE_ANALYSIS';
    ncr.updatedAt = new Date();

    return ncr;
  }

  async addCorrectiveActionPlan(ncrId: string, plan: CorrectiveActionPlan): Promise<NonConformanceReport> {
    const ncr = this.ncrs.get(ncrId);
    if (!ncr) throw new Error('NCR not found');

    ncr.correctiveAction = plan;
    ncr.status = 'CORRECTIVE_ACTION';
    ncr.updatedAt = new Date();

    return ncr;
  }

  async updateCorrectiveActionStatus(
    ncrId: string,
    actionId: string,
    status: CorrectiveActionItem['status'],
    evidence?: string[],
  ): Promise<NonConformanceReport> {
    const ncr = this.ncrs.get(ncrId);
    if (!ncr || !ncr.correctiveAction) throw new Error('NCR or corrective action not found');

    const action = ncr.correctiveAction.actions.find(a => a.id === actionId);
    if (!action) throw new Error('Action not found');

    action.status = status;
    if (status === 'COMPLETED') {
      action.completedAt = new Date();
      if (evidence) action.evidence = evidence;
    }

    // Check if all actions completed - move to verification
    const allCompleted = ncr.correctiveAction.actions.every(a => a.status === 'COMPLETED');
    if (allCompleted) {
      ncr.status = 'VERIFICATION';
    }

    ncr.updatedAt = new Date();
    return ncr;
  }

  async verifyNCR(ncrId: string, verification: VerificationRecord): Promise<NonConformanceReport> {
    const ncr = this.ncrs.get(ncrId);
    if (!ncr) throw new Error('NCR not found');

    ncr.verification = verification;
    ncr.status = 'CLOSED';
    ncr.closedDate = new Date();
    ncr.updatedAt = new Date();

    return ncr;
  }

  async getNCRStatistics(): Promise<{
    total: number;
    byStatus: Record<NCRStatus, number>;
    byPriority: Record<NCRPriority, number>;
    overdue: number;
    averageClosureTime: number;
  }> {
    const ncrs = Array.from(this.ncrs.values());
    const now = new Date();

    const byStatus: Record<NCRStatus, number> = {
      OPEN: 0,
      ROOT_CAUSE_ANALYSIS: 0,
      CORRECTIVE_ACTION: 0,
      VERIFICATION: 0,
      CLOSED: 0,
      OVERDUE: 0,
    };

    const byPriority: Record<NCRPriority, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    let overdue = 0;
    let totalClosureTime = 0;
    let closedCount = 0;

    for (const ncr of ncrs) {
      byStatus[ncr.status]++;
      byPriority[ncr.priority]++;

      if (ncr.dueDate < now && ncr.status !== 'CLOSED') {
        overdue++;
      }

      if (ncr.closedDate) {
        totalClosureTime += ncr.closedDate.getTime() - ncr.createdAt.getTime();
        closedCount++;
      }
    }

    return {
      total: ncrs.length,
      byStatus,
      byPriority,
      overdue,
      averageClosureTime: closedCount > 0 ? Math.round(totalClosureTime / closedCount / (1000 * 60 * 60 * 24)) : 0,
    };
  }

  // ===== MANAGEMENT REVIEW =====

  async createManagementReview(data: {
    standard: ISOStandard;
    period: { from: Date; to: Date };
    scheduledDate: Date;
    chairperson: string;
    attendees: string[];
    agenda: ManagementReviewAgenda;
  }): Promise<ManagementReview> {
    const id = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const reviewNumber = `MR-${data.standard === 'ISO_45001' ? '45' : '14'}-${new Date().getFullYear()}-${String(this.managementReviews.size + 1).padStart(2, '0')}`;

    const review: ManagementReview = {
      id,
      reviewNumber,
      standard: data.standard,
      period: data.period,
      scheduledDate: data.scheduledDate,
      status: 'SCHEDULED',
      chairperson: data.chairperson,
      attendees: data.attendees,
      agenda: data.agenda,
      inputs: {
        previousReviewActions: [],
        auditResults: { audits: 0, findings: 0, closedNCRs: 0 },
        customerFeedback: { complaints: 0, satisfaction: 0 },
        processPerformance: { kpis: {} },
        incidentSummary: { total: 0, recordable: 0, trend: 'STABLE' },
        riskAssessmentChanges: [],
        opportunitiesForImprovement: [],
        resourceNeeds: [],
        supplierPerformance: { evaluated: 0, approved: 0 },
        regulatoryChanges: [],
        trainingStatus: { compliance: 0, gaps: [] },
      },
      outputs: {
        decisionsAndActions: [],
        resourceAllocations: [],
        objectivesRevisions: [],
        policyChanges: [],
        improvementOpportunities: [],
        nextReviewDate: new Date(data.scheduledDate.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
      actionItems: [],
      createdAt: new Date(),
    };

    this.managementReviews.set(id, review);
    return review;
  }

  async getManagementReview(reviewId: string): Promise<ManagementReview | null> {
    return this.managementReviews.get(reviewId) || null;
  }

  async listManagementReviews(filters?: {
    standard?: ISOStandard;
    status?: ReviewStatus;
    year?: number;
  }): Promise<ManagementReview[]> {
    let reviews = Array.from(this.managementReviews.values());

    if (filters) {
      if (filters.standard) {
        reviews = reviews.filter(r => r.standard === filters.standard);
      }
      if (filters.status) {
        reviews = reviews.filter(r => r.status === filters.status);
      }
      if (filters.year) {
        reviews = reviews.filter(r => r.scheduledDate.getFullYear() === filters.year);
      }
    }

    return reviews.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  async updateManagementReviewInputs(
    reviewId: string,
    inputs: Partial<ManagementReviewInputs>,
  ): Promise<ManagementReview> {
    const review = this.managementReviews.get(reviewId);
    if (!review) throw new Error('Management review not found');

    review.inputs = { ...review.inputs, ...inputs };
    return review;
  }

  async recordManagementReviewOutputs(
    reviewId: string,
    outputs: ManagementReviewOutputs,
    minutes: string,
  ): Promise<ManagementReview> {
    const review = this.managementReviews.get(reviewId);
    if (!review) throw new Error('Management review not found');

    review.outputs = outputs;
    review.minutes = minutes;
    review.status = 'COMPLETED';

    return review;
  }

  async addManagementReviewAction(
    reviewId: string,
    action: Omit<ManagementReviewAction, 'id' | 'status' | 'completedAt'>,
  ): Promise<ManagementReview> {
    const review = this.managementReviews.get(reviewId);
    if (!review) throw new Error('Management review not found');

    const actionItem: ManagementReviewAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      status: 'PENDING',
    };

    review.actionItems.push(actionItem);
    return review;
  }

  async approveManagementReview(reviewId: string, approvedBy: string): Promise<ManagementReview> {
    const review = this.managementReviews.get(reviewId);
    if (!review) throw new Error('Management review not found');

    review.status = 'APPROVED';
    review.approvedBy = approvedBy;
    review.approvedAt = new Date();

    return review;
  }

  // ===== DASHBOARD =====

  async generateHSEDashboard(period: { from: Date; to: Date }): Promise<HSEDashboard> {
    const now = new Date();

    // Get safety KPIs (sample data - would come from incident service)
    const safetyKPIs = await this.calculateSafetyKPIs(period, {
      hoursWorked: 50000,
      totalIncidents: 5,
      recordableIncidents: 2,
      lostTimeIncidents: 1,
      nearMisses: 15,
      firstAidCases: 3,
      lostDays: 5,
      restrictedDays: 3,
    });

    // Get environmental KPIs (sample data)
    const environmentalKPIs = await this.calculateEnvironmentalKPIs(period, {
      wasteTotal: 5000,
      wasteRecycled: 4000,
      wasteHazardous: 100,
      energyConsumption: 100000,
      energyRenewable: 30000,
      waterConsumption: 500,
      waterRecycled: 50,
      co2Total: 150,
      co2Scope1: 50,
      co2Scope2: 80,
      co2Scope3: 20,
      spillCount: 0,
      spillVolume: 0,
    });

    // Calculate compliance scores from audits
    const audits = await this.listAudits({ status: 'COMPLETED' });
    const iso45001Audits = audits.filter(a => a.standard === 'ISO_45001');
    const iso14001Audits = audits.filter(a => a.standard === 'ISO_14001');

    const iso45001Score = iso45001Audits.length > 0
      ? Math.round(iso45001Audits.reduce((sum, a) => sum + a.overallScore, 0) / iso45001Audits.length)
      : 0;
    const iso14001Score = iso14001Audits.length > 0
      ? Math.round(iso14001Audits.reduce((sum, a) => sum + a.overallScore, 0) / iso14001Audits.length)
      : 0;

    // Get NCR stats
    const ncrs = await this.listNCRs();
    const openNCRs = ncrs.filter(n => n.status !== 'CLOSED');
    const criticalNCRs = openNCRs.filter(n => n.priority === 'CRITICAL');
    const overdueNCRs = openNCRs.filter(n => n.dueDate < now);

    // Get upcoming audits
    const upcomingAudits = await this.listAudits({ status: 'PLANNED' });

    // Get recent findings
    const recentFindings: AuditFinding[] = [];
    for (const audit of audits.slice(0, 5)) {
      recentFindings.push(...audit.findings.filter(f => f.status === 'OPEN'));
    }

    // Generate alerts
    const alerts: DashboardAlert[] = [];

    if (overdueNCRs.length > 0) {
      alerts.push({
        id: `alert-${Date.now()}-1`,
        type: 'NCR_OVERDUE',
        severity: 'CRITICAL',
        message: `${overdueNCRs.length} NCR(s) overdue for closure`,
        createdAt: now,
      });
    }

    const nearAudits = upcomingAudits.filter(a => {
      const daysUntil = Math.ceil((a.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 14;
    });
    if (nearAudits.length > 0) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        type: 'AUDIT_DUE',
        severity: 'WARNING',
        message: `${nearAudits.length} audit(s) scheduled within 2 weeks`,
        createdAt: now,
      });
    }

    if (safetyKPIs.performance.LTIR === 'BELOW') {
      alerts.push({
        id: `alert-${Date.now()}-3`,
        type: 'KPI_THRESHOLD',
        severity: 'WARNING',
        message: `LTIR (${safetyKPIs.rates.LTIR}) exceeds target (${SAFETY_KPI_TARGETS.LTIR})`,
        createdAt: now,
      });
    }

    // Generate widgets
    const widgets: DashboardWidget[] = [
      {
        id: 'widget-ltir',
        type: 'KPI_GAUGE',
        title: 'Lost Time Incident Rate',
        data: { value: safetyKPIs.rates.LTIR, target: SAFETY_KPI_TARGETS.LTIR, performance: safetyKPIs.performance.LTIR },
        config: { min: 0, max: 5, thresholds: [1.6, 2.0, 3.0] },
      },
      {
        id: 'widget-trir',
        type: 'KPI_GAUGE',
        title: 'Total Recordable Incident Rate',
        data: { value: safetyKPIs.rates.TRIR, target: SAFETY_KPI_TARGETS.TRIR, performance: safetyKPIs.performance.TRIR },
        config: { min: 0, max: 8, thresholds: [3.2, 4.0, 6.0] },
      },
      {
        id: 'widget-ncr',
        type: 'NCR_SUMMARY',
        title: 'Non-Conformance Status',
        data: { open: openNCRs.length, critical: criticalNCRs.length, overdue: overdueNCRs.length },
        config: {},
      },
      {
        id: 'widget-compliance',
        type: 'COMPLIANCE_RADAR',
        title: 'ISO Compliance Overview',
        data: { iso45001: iso45001Score, iso14001: iso14001Score },
        config: { target: SAFETY_KPI_TARGETS.AUDIT_SCORE },
      },
    ];

    return {
      generatedAt: now,
      period,
      safetyKPIs,
      environmentalKPIs,
      complianceScore: {
        iso45001: iso45001Score,
        iso14001: iso14001Score,
        overall: Math.round((iso45001Score + iso14001Score) / 2),
      },
      openNCRs: {
        total: openNCRs.length,
        critical: criticalNCRs.length,
        overdue: overdueNCRs.length,
      },
      upcomingAudits: upcomingAudits.slice(0, 5),
      recentFindings: recentFindings.slice(0, 10),
      trainingCompliance: SAFETY_KPI_TARGETS.TRAINING_COMPLIANCE,
      certificationStatus: {
        iso45001: iso45001Audits.some(a => a.recommendation === 'CERTIFY' || a.recommendation === 'MAINTAIN') ? 'CERTIFIED' : 'NOT_CERTIFIED',
        iso14001: iso14001Audits.some(a => a.recommendation === 'CERTIFY' || a.recommendation === 'MAINTAIN') ? 'CERTIFIED' : 'NOT_CERTIFIED',
        expiryDates: {},
      },
      alerts,
      widgets,
    };
  }

  // ===== REPORTING =====

  async generateAuditReport(auditId: string): Promise<{
    audit: Audit;
    summary: {
      totalItems: number;
      conforming: number;
      minorNC: number;
      majorNC: number;
      notApplicable: number;
      complianceRate: number;
    };
    findingsByClause: Record<string, AuditFinding[]>;
    recommendations: string[];
  }> {
    const audit = await this.getAudit(auditId);
    if (!audit) throw new Error('Audit not found');

    const conforming = audit.checklist.filter(c => c.status === 'CONFORMING').length;
    const minorNC = audit.checklist.filter(c => c.status === 'MINOR_NC').length;
    const majorNC = audit.checklist.filter(c => c.status === 'MAJOR_NC').length;
    const notApplicable = audit.checklist.filter(c => c.status === 'NOT_APPLICABLE').length;
    const audited = audit.checklist.length - audit.checklist.filter(c => c.status === 'NOT_AUDITED').length - notApplicable;

    const findingsByClause: Record<string, AuditFinding[]> = {};
    for (const finding of audit.findings) {
      if (!findingsByClause[finding.clauseNumber]) {
        findingsByClause[finding.clauseNumber] = [];
      }
      findingsByClause[finding.clauseNumber].push(finding);
    }

    const recommendations: string[] = [];
    if (majorNC > 0) {
      recommendations.push('Address major non-conformities within 30 days');
    }
    if (minorNC > 0) {
      recommendations.push('Implement corrective actions for minor non-conformities');
    }
    if (audit.overallScore < SAFETY_KPI_TARGETS.AUDIT_SCORE) {
      recommendations.push('Focus on improving documentation and evidence collection');
    }

    return {
      audit,
      summary: {
        totalItems: audit.checklist.length,
        conforming,
        minorNC,
        majorNC,
        notApplicable,
        complianceRate: audited > 0 ? Math.round((conforming / audited) * 100) : 0,
      },
      findingsByClause,
      recommendations,
    };
  }

  async generateNCRReport(period: { from: Date; to: Date }): Promise<{
    period: { from: Date; to: Date };
    statistics: Awaited<ReturnType<typeof this.getNCRStatistics>>;
    ncrs: NonConformanceReport[];
    trends: {
      newNCRs: number;
      closedNCRs: number;
      averageAge: number;
    };
  }> {
    const allNCRs = await this.listNCRs();
    const periodNCRs = allNCRs.filter(n =>
      n.createdAt >= period.from && n.createdAt <= period.to
    );

    const closedInPeriod = allNCRs.filter(n =>
      n.closedDate && n.closedDate >= period.from && n.closedDate <= period.to
    );

    const openNCRs = allNCRs.filter(n => n.status !== 'CLOSED');
    const now = new Date();
    const totalAge = openNCRs.reduce((sum, n) =>
      sum + (now.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60 * 24), 0
    );

    return {
      period,
      statistics: await this.getNCRStatistics(),
      ncrs: periodNCRs,
      trends: {
        newNCRs: periodNCRs.length,
        closedNCRs: closedInPeriod.length,
        averageAge: openNCRs.length > 0 ? Math.round(totalAge / openNCRs.length) : 0,
      },
    };
  }
}

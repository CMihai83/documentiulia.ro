import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// HSE (Health, Safety, Environment) Service
// Digital Risk Register with ISO 45001/14001 compliance
// GIS hazard mapping, PSSR evaluation tracking, and control measure effectiveness

// ===== ENUMS =====

export enum RiskCategory {
  PHYSICAL = 'PHYSICAL',
  CHEMICAL = 'CHEMICAL',
  BIOLOGICAL = 'BIOLOGICAL',
  ERGONOMIC = 'ERGONOMIC',
  PSYCHOSOCIAL = 'PSYCHOSOCIAL',
  ELECTRICAL = 'ELECTRICAL',
  MECHANICAL = 'MECHANICAL',
  FIRE = 'FIRE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  TRAFFIC = 'TRAFFIC',
  WORKING_AT_HEIGHT = 'WORKING_AT_HEIGHT',
  CONFINED_SPACE = 'CONFINED_SPACE',
  NOISE = 'NOISE',
  VIBRATION = 'VIBRATION',
  RADIATION = 'RADIATION',
  THERMAL = 'THERMAL',
}

export enum RiskLikelihood {
  RARE = 1,           // Once in 10+ years
  UNLIKELY = 2,       // Once in 5-10 years
  POSSIBLE = 3,       // Once in 1-5 years
  LIKELY = 4,         // Once per year
  ALMOST_CERTAIN = 5, // Multiple times per year
}

export enum RiskSeverity {
  NEGLIGIBLE = 1,     // No injury, minor first aid
  MINOR = 2,          // First aid required, minor injury
  MODERATE = 3,       // Medical treatment, temporary disability
  MAJOR = 4,          // Serious injury, permanent disability
  CATASTROPHIC = 5,   // Death, multiple fatalities
}

export enum RiskLevel {
  LOW = 'LOW',           // 1-4: Acceptable, monitor
  MEDIUM = 'MEDIUM',     // 5-9: Action required
  HIGH = 'HIGH',         // 10-15: Urgent action required
  CRITICAL = 'CRITICAL', // 16-25: Immediate action, stop work
}

export enum ControlHierarchy {
  ELIMINATION = 'ELIMINATION',       // Remove the hazard completely
  SUBSTITUTION = 'SUBSTITUTION',     // Replace with less hazardous
  ENGINEERING = 'ENGINEERING',       // Physical changes to workplace
  ADMINISTRATIVE = 'ADMINISTRATIVE', // Change how people work
  PPE = 'PPE',                       // Personal protective equipment
}

export enum ControlStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  VERIFIED = 'VERIFIED',
  INEFFECTIVE = 'INEFFECTIVE',
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REQUIRES_UPDATE = 'REQUIRES_UPDATE',
  ARCHIVED = 'ARCHIVED',
}

export enum HazardSource {
  WORKPLACE_INSPECTION = 'WORKPLACE_INSPECTION',
  INCIDENT_REPORT = 'INCIDENT_REPORT',
  NEAR_MISS = 'NEAR_MISS',
  EMPLOYEE_REPORT = 'EMPLOYEE_REPORT',
  AUDIT = 'AUDIT',
  REGULATORY = 'REGULATORY',
  CHANGE_MANAGEMENT = 'CHANGE_MANAGEMENT',
  JSA = 'JSA', // Job Safety Analysis
  PSSR = 'PSSR', // Pre-Startup Safety Review
}

export enum PSSRStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

// ===== INTERFACES =====

export interface Hazard {
  id: string;
  name: string;
  description: string;
  category: RiskCategory;
  source: HazardSource;
  locationId?: string;
  location?: GeoLocation;
  potentialConsequences: string[];
  affectedPersons: string[];
  existingControls: string[];
  identifiedBy: string;
  identifiedDate: Date;
  status: 'ACTIVE' | 'CONTROLLED' | 'ELIMINATED';
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoLocation {
  id: string;
  name: string;
  type: 'SITE' | 'BUILDING' | 'FLOOR' | 'ZONE' | 'WORKSTATION';
  parentId?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  metadata?: Record<string, any>;
}

export interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  hazardId: string;
  hazard?: Hazard;
  locationId?: string;
  location?: GeoLocation;
  assessmentDate: Date;
  assessor: AssessorInfo;
  reviewers: AssessorInfo[];

  // Initial Risk (before controls)
  initialLikelihood: RiskLikelihood;
  initialSeverity: RiskSeverity;
  initialRiskScore: number;
  initialRiskLevel: RiskLevel;

  // Residual Risk (after controls)
  residualLikelihood: RiskLikelihood;
  residualSeverity: RiskSeverity;
  residualRiskScore: number;
  residualRiskLevel: RiskLevel;

  controls: ControlMeasure[];
  status: AssessmentStatus;
  reviewDate: Date;
  nextReviewDate: Date;

  // ISO 45001 specific
  isoClause?: string;
  legalRequirements?: string[];
  interestedParties?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface AssessorInfo {
  id: string;
  name: string;
  role: string;
  qualification?: string;
  signedAt?: Date;
}

export interface ControlMeasure {
  id: string;
  description: string;
  hierarchy: ControlHierarchy;
  status: ControlStatus;
  responsiblePerson: string;
  targetDate: Date;
  implementedDate?: Date;
  verifiedDate?: Date;
  verifiedBy?: string;
  effectivenessRating?: number; // 1-5
  effectivenessNotes?: string;
  cost?: number;
  currency?: string;
  evidence?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PSSR {
  id: string;
  title: string;
  description: string;
  locationId: string;
  location?: GeoLocation;
  scheduledDate: Date;
  completedDate?: Date;
  status: PSSRStatus;
  assessor: AssessorInfo;
  checklist: PSSRChecklistItem[];
  findings: PSSRFinding[];
  overallResult?: 'PASS' | 'PASS_WITH_CONDITIONS' | 'FAIL';
  recommendations: string[];
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PSSRChecklistItem {
  id: string;
  category: string;
  question: string;
  response: 'YES' | 'NO' | 'NA' | 'PENDING';
  comments?: string;
  evidence?: string[];
  isoReference?: string;
}

export interface PSSRFinding {
  id: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  actionRequired: string;
  responsiblePerson: string;
  dueDate: Date;
  closedDate?: Date;
  closedBy?: string;
}

export interface RiskMatrix {
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskScore: number;
  riskLevel: RiskLevel;
  color: string;
  action: string;
}

export interface RiskRegisterSummary {
  totalRisks: number;
  byLevel: Record<RiskLevel, number>;
  byCategory: Record<RiskCategory, number>;
  byStatus: Record<AssessmentStatus, number>;
  controlsOverdue: number;
  reviewsOverdue: number;
  topRisks: RiskAssessment[];
}

export interface LocationHazardMap {
  locationId: string;
  location: GeoLocation;
  hazards: Hazard[];
  riskAssessments: RiskAssessment[];
  averageRiskScore: number;
  highestRiskLevel: RiskLevel;
}

export interface ISO45001Compliance {
  clause: string;
  description: string;
  requirement: string;
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
  evidence: string[];
  gaps?: string[];
  actions?: string[];
}

// ===== SERVICE =====

@Injectable()
export class HSEService {
  private readonly logger = new Logger(HSEService.name);

  // In-memory storage (replace with Prisma when tables are created)
  private hazards: Map<string, Hazard> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private locations: Map<string, GeoLocation> = new Map();
  private pssrs: Map<string, PSSR> = new Map();
  private controlMeasures: Map<string, ControlMeasure> = new Map();

  // ISO 45001:2018 clauses for compliance tracking
  private readonly ISO_45001_CLAUSES: ISO45001Compliance[] = [
    { clause: '4.1', description: 'Understanding the organization and its context', requirement: 'Determine external and internal issues', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '4.2', description: 'Understanding the needs of workers and interested parties', requirement: 'Determine relevant interested parties and their requirements', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '4.3', description: 'Determining the scope of the OH&S management system', requirement: 'Define scope considering 4.1 and 4.2', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '5.1', description: 'Leadership and commitment', requirement: 'Top management demonstrate leadership and commitment', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '5.2', description: 'OH&S policy', requirement: 'Establish OH&S policy appropriate to organization', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '5.3', description: 'Organizational roles, responsibilities and authorities', requirement: 'Assign responsibilities and authorities', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '5.4', description: 'Consultation and participation of workers', requirement: 'Establish processes for consultation', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '6.1.1', description: 'General planning', requirement: 'Plan actions to address risks and opportunities', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '6.1.2', description: 'Hazard identification and assessment of risks', requirement: 'Establish processes for hazard identification', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '6.1.3', description: 'Determination of legal requirements', requirement: 'Determine applicable legal requirements', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '6.1.4', description: 'Planning action', requirement: 'Plan actions to address risks', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '6.2', description: 'OH&S objectives and planning', requirement: 'Establish OH&S objectives at relevant functions', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '7.1', description: 'Resources', requirement: 'Determine and provide necessary resources', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '7.2', description: 'Competence', requirement: 'Determine necessary competence', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '7.3', description: 'Awareness', requirement: 'Workers aware of OH&S policy and objectives', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '7.4', description: 'Communication', requirement: 'Determine internal and external communications', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '7.5', description: 'Documented information', requirement: 'OH&S management system includes documented information', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '8.1', description: 'Operational planning and control', requirement: 'Plan, implement and control processes', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '8.1.2', description: 'Eliminating hazards and reducing risks', requirement: 'Establish processes for elimination and reduction', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '8.2', description: 'Emergency preparedness and response', requirement: 'Establish processes for emergency response', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '9.1', description: 'Monitoring, measurement, analysis and evaluation', requirement: 'Determine what needs to be monitored', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '9.2', description: 'Internal audit', requirement: 'Conduct internal audits at planned intervals', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '9.3', description: 'Management review', requirement: 'Top management review OH&S system', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '10.1', description: 'Incident, nonconformity and corrective action', requirement: 'Determine and select opportunities for improvement', status: 'NOT_APPLICABLE', evidence: [] },
    { clause: '10.2', description: 'Continual improvement', requirement: 'Continually improve OH&S performance', status: 'NOT_APPLICABLE', evidence: [] },
  ];

  // Romanian SSM (Securitate și Sănătate în Muncă) hazard categories
  private readonly RO_SSM_HAZARDS: Record<RiskCategory, string[]> = {
    [RiskCategory.PHYSICAL]: ['Zgomot', 'Vibrații', 'Iluminat necorespunzător', 'Temperatură extremă', 'Umiditate'],
    [RiskCategory.CHEMICAL]: ['Substanțe toxice', 'Substanțe corozive', 'Pulberi', 'Gaze', 'Vapori'],
    [RiskCategory.BIOLOGICAL]: ['Bacterii', 'Viruși', 'Fungi', 'Paraziți', 'Alergeni'],
    [RiskCategory.ERGONOMIC]: ['Poziții forțate', 'Mișcări repetitive', 'Manipulare manuală', 'Suprasolicitare'],
    [RiskCategory.PSYCHOSOCIAL]: ['Stres', 'Hărțuire', 'Supraîncărcare', 'Violență la locul de muncă'],
    [RiskCategory.ELECTRICAL]: ['Electrocutare', 'Arc electric', 'Scurtcircuit', 'Suprasarcină'],
    [RiskCategory.MECHANICAL]: ['Organe în mișcare', 'Tăiere', 'Strivire', 'Proiectare obiecte'],
    [RiskCategory.FIRE]: ['Incendiu', 'Explozie', 'Materiale inflamabile'],
    [RiskCategory.ENVIRONMENTAL]: ['Poluare', 'Deșeuri periculoase', 'Emisii'],
    [RiskCategory.TRAFFIC]: ['Accident rutier', 'Lovire de vehicule', 'Transport intern'],
    [RiskCategory.WORKING_AT_HEIGHT]: ['Cădere de la înălțime', 'Cădere obiecte'],
    [RiskCategory.CONFINED_SPACE]: ['Asfixiere', 'Intoxicare', 'Spații închise'],
    [RiskCategory.NOISE]: ['Pierdere auz', 'Zgomot continuu', 'Zgomot de impact'],
    [RiskCategory.VIBRATION]: ['Vibrații mână-braț', 'Vibrații corp întreg'],
    [RiskCategory.RADIATION]: ['Radiații ionizante', 'Radiații neionizante', 'UV', 'Laser'],
    [RiskCategory.THERMAL]: ['Arsuri', 'Degerături', 'Șoc termic'],
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeDefaultLocations();
  }

  // For testing - reset all in-memory data
  resetState(): void {
    this.hazards.clear();
    this.riskAssessments.clear();
    this.locations.clear();
    this.pssrs.clear();
    this.controlMeasures.clear();
    this.initializeDefaultLocations();
  }

  private initializeDefaultLocations(): void {
    // Create default root location
    const hq: GeoLocation = {
      id: 'loc-hq',
      name: 'Sediul Central',
      type: 'SITE',
      address: 'București, România',
      coordinates: { latitude: 44.4268, longitude: 26.1025 },
      metadata: {},
    };
    this.locations.set(hq.id, hq);
  }

  // ===== LOCATIONS / GIS =====

  async createLocation(data: Partial<GeoLocation>): Promise<GeoLocation> {
    if (!data.name) {
      throw new BadRequestException('Location name is required');
    }

    const locationId = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const location: GeoLocation = {
      id: locationId,
      name: data.name,
      type: data.type || 'ZONE',
      parentId: data.parentId,
      coordinates: data.coordinates,
      address: data.address,
      metadata: data.metadata || {},
    };

    this.locations.set(locationId, location);
    this.logger.log(`Location created: ${locationId} - ${location.name}`);
    return location;
  }

  async getLocation(locationId: string): Promise<GeoLocation> {
    const location = this.locations.get(locationId);
    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }
    return location;
  }

  async listLocations(parentId?: string): Promise<GeoLocation[]> {
    let locations = Array.from(this.locations.values());

    if (parentId) {
      locations = locations.filter(l => l.parentId === parentId);
    }

    return locations.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLocationHierarchy(locationId: string): Promise<GeoLocation[]> {
    const hierarchy: GeoLocation[] = [];
    let current = await this.getLocation(locationId);
    hierarchy.push(current);

    while (current.parentId) {
      current = await this.getLocation(current.parentId);
      hierarchy.unshift(current);
    }

    return hierarchy;
  }

  async getLocationChildren(locationId: string): Promise<GeoLocation[]> {
    return Array.from(this.locations.values()).filter(l => l.parentId === locationId);
  }

  // ===== HAZARDS =====

  async createHazard(data: Partial<Hazard>, identifiedBy: string): Promise<Hazard> {
    if (!data.name || !data.category) {
      throw new BadRequestException('Hazard name and category are required');
    }

    const hazardId = `haz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const hazard: Hazard = {
      id: hazardId,
      name: data.name,
      description: data.description || '',
      category: data.category,
      source: data.source || HazardSource.WORKPLACE_INSPECTION,
      locationId: data.locationId,
      location: data.locationId ? await this.getLocation(data.locationId).catch(() => undefined) : undefined,
      potentialConsequences: data.potentialConsequences || [],
      affectedPersons: data.affectedPersons || [],
      existingControls: data.existingControls || [],
      identifiedBy,
      identifiedDate: new Date(),
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.hazards.set(hazardId, hazard);
    this.logger.log(`Hazard created: ${hazardId} - ${hazard.name}`);
    return hazard;
  }

  async getHazard(hazardId: string): Promise<Hazard> {
    const hazard = this.hazards.get(hazardId);
    if (!hazard) {
      throw new NotFoundException(`Hazard ${hazardId} not found`);
    }
    return hazard;
  }

  async updateHazard(hazardId: string, data: Partial<Hazard>): Promise<Hazard> {
    const hazard = await this.getHazard(hazardId);

    const updated: Hazard = {
      ...hazard,
      ...data,
      id: hazardId,
      createdAt: hazard.createdAt,
      updatedAt: new Date(),
    };

    this.hazards.set(hazardId, updated);
    return updated;
  }

  async listHazards(filters?: {
    category?: RiskCategory;
    locationId?: string;
    status?: 'ACTIVE' | 'CONTROLLED' | 'ELIMINATED';
    source?: HazardSource;
  }): Promise<Hazard[]> {
    let hazards = Array.from(this.hazards.values());

    if (filters?.category) {
      hazards = hazards.filter(h => h.category === filters.category);
    }
    if (filters?.locationId) {
      hazards = hazards.filter(h => h.locationId === filters.locationId);
    }
    if (filters?.status) {
      hazards = hazards.filter(h => h.status === filters.status);
    }
    if (filters?.source) {
      hazards = hazards.filter(h => h.source === filters.source);
    }

    return hazards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getHazardsByLocation(locationId: string): Promise<Hazard[]> {
    return this.listHazards({ locationId });
  }

  async getHazardCategories(): Promise<{ category: RiskCategory; examples: string[] }[]> {
    return Object.entries(this.RO_SSM_HAZARDS).map(([category, examples]) => ({
      category: category as RiskCategory,
      examples,
    }));
  }

  // ===== RISK ASSESSMENT =====

  async createRiskAssessment(data: {
    title: string;
    description?: string;
    hazardId: string;
    locationId?: string;
    assessor: AssessorInfo;
    initialLikelihood: RiskLikelihood;
    initialSeverity: RiskSeverity;
    isoClause?: string;
    legalRequirements?: string[];
  }): Promise<RiskAssessment> {
    const hazard = await this.getHazard(data.hazardId);
    const location = data.locationId ? await this.getLocation(data.locationId).catch(() => undefined) : undefined;

    const initialRiskScore = data.initialLikelihood * data.initialSeverity;
    const initialRiskLevel = this.calculateRiskLevel(initialRiskScore);

    const assessmentId = `ra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const assessment: RiskAssessment = {
      id: assessmentId,
      title: data.title,
      description: data.description || '',
      hazardId: data.hazardId,
      hazard,
      locationId: data.locationId,
      location,
      assessmentDate: new Date(),
      assessor: { ...data.assessor, signedAt: new Date() },
      reviewers: [],

      initialLikelihood: data.initialLikelihood,
      initialSeverity: data.initialSeverity,
      initialRiskScore,
      initialRiskLevel,

      // Initially, residual = initial (no controls yet)
      residualLikelihood: data.initialLikelihood,
      residualSeverity: data.initialSeverity,
      residualRiskScore: initialRiskScore,
      residualRiskLevel: initialRiskLevel,

      controls: [],
      status: AssessmentStatus.DRAFT,
      reviewDate: new Date(),
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year

      isoClause: data.isoClause,
      legalRequirements: data.legalRequirements || [],
      interestedParties: [],

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.riskAssessments.set(assessmentId, assessment);
    this.logger.log(`Risk Assessment created: ${assessmentId} - ${assessment.title}`);
    return assessment;
  }

  async getRiskAssessment(assessmentId: string): Promise<RiskAssessment> {
    const assessment = this.riskAssessments.get(assessmentId);
    if (!assessment) {
      throw new NotFoundException(`Risk Assessment ${assessmentId} not found`);
    }
    return assessment;
  }

  async updateRiskAssessment(assessmentId: string, data: Partial<RiskAssessment>): Promise<RiskAssessment> {
    const assessment = await this.getRiskAssessment(assessmentId);

    // Recalculate risk scores if likelihood/severity changed
    let residualRiskScore = assessment.residualRiskScore;
    let residualRiskLevel = assessment.residualRiskLevel;

    if (data.residualLikelihood !== undefined || data.residualSeverity !== undefined) {
      const likelihood = data.residualLikelihood ?? assessment.residualLikelihood;
      const severity = data.residualSeverity ?? assessment.residualSeverity;
      residualRiskScore = likelihood * severity;
      residualRiskLevel = this.calculateRiskLevel(residualRiskScore);
    }

    const updated: RiskAssessment = {
      ...assessment,
      ...data,
      residualRiskScore,
      residualRiskLevel,
      id: assessmentId,
      createdAt: assessment.createdAt,
      updatedAt: new Date(),
    };

    this.riskAssessments.set(assessmentId, updated);
    return updated;
  }

  async listRiskAssessments(filters?: {
    status?: AssessmentStatus;
    riskLevel?: RiskLevel;
    locationId?: string;
    hazardId?: string;
    overdueReview?: boolean;
  }): Promise<RiskAssessment[]> {
    let assessments = Array.from(this.riskAssessments.values());

    if (filters?.status) {
      assessments = assessments.filter(a => a.status === filters.status);
    }
    if (filters?.riskLevel) {
      assessments = assessments.filter(a => a.residualRiskLevel === filters.riskLevel);
    }
    if (filters?.locationId) {
      assessments = assessments.filter(a => a.locationId === filters.locationId);
    }
    if (filters?.hazardId) {
      assessments = assessments.filter(a => a.hazardId === filters.hazardId);
    }
    if (filters?.overdueReview) {
      const now = new Date();
      assessments = assessments.filter(a => a.nextReviewDate < now);
    }

    return assessments.sort((a, b) => b.residualRiskScore - a.residualRiskScore);
  }

  async submitForReview(assessmentId: string): Promise<RiskAssessment> {
    const assessment = await this.getRiskAssessment(assessmentId);

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Only draft assessments can be submitted for review');
    }

    return this.updateRiskAssessment(assessmentId, { status: AssessmentStatus.PENDING_REVIEW });
  }

  async approveAssessment(assessmentId: string, reviewer: AssessorInfo): Promise<RiskAssessment> {
    const assessment = await this.getRiskAssessment(assessmentId);

    if (assessment.status !== AssessmentStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending assessments can be approved');
    }

    const reviewerWithSignature = { ...reviewer, signedAt: new Date() };

    return this.updateRiskAssessment(assessmentId, {
      status: AssessmentStatus.APPROVED,
      reviewers: [...assessment.reviewers, reviewerWithSignature],
    });
  }

  async rejectAssessment(assessmentId: string, reviewer: AssessorInfo, reason: string): Promise<RiskAssessment> {
    const assessment = await this.getRiskAssessment(assessmentId);

    if (assessment.status !== AssessmentStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending assessments can be rejected');
    }

    const reviewerWithSignature = { ...reviewer, signedAt: new Date() };

    return this.updateRiskAssessment(assessmentId, {
      status: AssessmentStatus.REQUIRES_UPDATE,
      reviewers: [...assessment.reviewers, reviewerWithSignature],
      description: `${assessment.description}\n\n[REJECTION REASON: ${reason}]`,
    });
  }

  // ===== CONTROL MEASURES =====

  async addControlMeasure(assessmentId: string, data: {
    description: string;
    hierarchy: ControlHierarchy;
    responsiblePerson: string;
    targetDate: Date;
    cost?: number;
    currency?: string;
  }): Promise<RiskAssessment> {
    const assessment = await this.getRiskAssessment(assessmentId);

    const controlId = `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const control: ControlMeasure = {
      id: controlId,
      description: data.description,
      hierarchy: data.hierarchy,
      status: ControlStatus.PLANNED,
      responsiblePerson: data.responsiblePerson,
      targetDate: data.targetDate,
      cost: data.cost,
      currency: data.currency || 'RON',
      evidence: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.controlMeasures.set(controlId, control);
    assessment.controls.push(control);
    assessment.updatedAt = new Date();
    this.riskAssessments.set(assessmentId, assessment);

    this.logger.log(`Control measure added: ${controlId} to assessment ${assessmentId}`);
    return assessment;
  }

  async updateControlStatus(assessmentId: string, controlId: string, status: ControlStatus, verifiedBy?: string): Promise<RiskAssessment> {
    const assessment = await this.getRiskAssessment(assessmentId);
    const controlIndex = assessment.controls.findIndex(c => c.id === controlId);

    if (controlIndex === -1) {
      throw new NotFoundException(`Control measure ${controlId} not found`);
    }

    const control = assessment.controls[controlIndex];
    control.status = status;
    control.updatedAt = new Date();

    if (status === ControlStatus.IMPLEMENTED) {
      control.implementedDate = new Date();
    }
    if (status === ControlStatus.VERIFIED && verifiedBy) {
      control.verifiedDate = new Date();
      control.verifiedBy = verifiedBy;
    }

    assessment.controls[controlIndex] = control;
    assessment.updatedAt = new Date();
    this.riskAssessments.set(assessmentId, assessment);

    // Recalculate residual risk based on implemented controls
    await this.recalculateResidualRisk(assessmentId);

    return assessment;
  }

  async rateControlEffectiveness(assessmentId: string, controlId: string, rating: number, notes?: string): Promise<RiskAssessment> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const assessment = await this.getRiskAssessment(assessmentId);
    const controlIndex = assessment.controls.findIndex(c => c.id === controlId);

    if (controlIndex === -1) {
      throw new NotFoundException(`Control measure ${controlId} not found`);
    }

    const control = assessment.controls[controlIndex];
    control.effectivenessRating = rating;
    control.effectivenessNotes = notes;
    control.updatedAt = new Date();

    if (rating <= 2) {
      control.status = ControlStatus.INEFFECTIVE;
    }

    assessment.controls[controlIndex] = control;
    assessment.updatedAt = new Date();
    this.riskAssessments.set(assessmentId, assessment);

    return assessment;
  }

  async getOverdueControls(): Promise<{ assessment: RiskAssessment; control: ControlMeasure }[]> {
    const overdue: { assessment: RiskAssessment; control: ControlMeasure }[] = [];
    const now = new Date();

    for (const assessment of this.riskAssessments.values()) {
      for (const control of assessment.controls) {
        if (
          control.status !== ControlStatus.IMPLEMENTED &&
          control.status !== ControlStatus.VERIFIED &&
          control.targetDate < now
        ) {
          overdue.push({ assessment, control });
        }
      }
    }

    return overdue.sort((a, b) => a.control.targetDate.getTime() - b.control.targetDate.getTime());
  }

  private async recalculateResidualRisk(assessmentId: string): Promise<void> {
    const assessment = await this.getRiskAssessment(assessmentId);

    // Calculate risk reduction based on implemented controls
    const implementedControls = assessment.controls.filter(
      c => c.status === ControlStatus.IMPLEMENTED || c.status === ControlStatus.VERIFIED
    );

    if (implementedControls.length === 0) {
      return; // No change
    }

    // Higher hierarchy controls reduce risk more
    const hierarchyWeights: Record<ControlHierarchy, number> = {
      [ControlHierarchy.ELIMINATION]: 0.9,      // Reduces to 10%
      [ControlHierarchy.SUBSTITUTION]: 0.7,     // Reduces to 30%
      [ControlHierarchy.ENGINEERING]: 0.5,      // Reduces to 50%
      [ControlHierarchy.ADMINISTRATIVE]: 0.3,   // Reduces to 70%
      [ControlHierarchy.PPE]: 0.1,              // Reduces to 90%
    };

    let riskReduction = 0;
    for (const control of implementedControls) {
      const weight = hierarchyWeights[control.hierarchy] || 0.1;
      const effectiveness = (control.effectivenessRating || 3) / 5; // Default 60%
      riskReduction += weight * effectiveness;
    }

    // Cap reduction at 80% (can't eliminate all risk with controls alone)
    riskReduction = Math.min(0.8, riskReduction);

    // Apply reduction to initial risk
    const reducedScore = Math.ceil(assessment.initialRiskScore * (1 - riskReduction));

    // Reverse calculate likelihood and severity
    // We reduce likelihood more for higher hierarchy controls
    let newLikelihood = Math.ceil(assessment.initialLikelihood * (1 - riskReduction * 0.6));
    let newSeverity = Math.ceil(assessment.initialSeverity * (1 - riskReduction * 0.4));

    // Clamp to valid ranges
    newLikelihood = Math.max(1, Math.min(5, newLikelihood)) as RiskLikelihood;
    newSeverity = Math.max(1, Math.min(5, newSeverity)) as RiskSeverity;

    const newScore = newLikelihood * newSeverity;
    const newLevel = this.calculateRiskLevel(newScore);

    assessment.residualLikelihood = newLikelihood;
    assessment.residualSeverity = newSeverity;
    assessment.residualRiskScore = newScore;
    assessment.residualRiskLevel = newLevel;
    assessment.updatedAt = new Date();

    this.riskAssessments.set(assessmentId, assessment);
  }

  // ===== PSSR (Pre-Startup Safety Review) =====

  async createPSSR(data: {
    title: string;
    description?: string;
    locationId: string;
    scheduledDate: Date;
    assessor: AssessorInfo;
  }): Promise<PSSR> {
    const location = await this.getLocation(data.locationId);

    const pssrId = `pssr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pssr: PSSR = {
      id: pssrId,
      title: data.title,
      description: data.description || '',
      locationId: data.locationId,
      location,
      scheduledDate: data.scheduledDate,
      status: PSSRStatus.SCHEDULED,
      assessor: data.assessor,
      checklist: this.generatePSSRChecklist(),
      findings: [],
      recommendations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pssrs.set(pssrId, pssr);
    this.logger.log(`PSSR created: ${pssrId} - ${pssr.title}`);
    return pssr;
  }

  async getPSSR(pssrId: string): Promise<PSSR> {
    const pssr = this.pssrs.get(pssrId);
    if (!pssr) {
      throw new NotFoundException(`PSSR ${pssrId} not found`);
    }
    return pssr;
  }

  async updatePSSRChecklist(pssrId: string, itemId: string, response: 'YES' | 'NO' | 'NA', comments?: string): Promise<PSSR> {
    const pssr = await this.getPSSR(pssrId);
    const itemIndex = pssr.checklist.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }

    pssr.checklist[itemIndex].response = response;
    if (comments) {
      pssr.checklist[itemIndex].comments = comments;
    }
    pssr.status = PSSRStatus.IN_PROGRESS;
    pssr.updatedAt = new Date();

    this.pssrs.set(pssrId, pssr);
    return pssr;
  }

  async addPSSRFinding(pssrId: string, finding: Omit<PSSRFinding, 'id' | 'status' | 'closedDate' | 'closedBy'>): Promise<PSSR> {
    const pssr = await this.getPSSR(pssrId);

    const findingId = `find-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newFinding: PSSRFinding = {
      id: findingId,
      ...finding,
      status: 'OPEN',
    };

    pssr.findings.push(newFinding);
    pssr.updatedAt = new Date();

    this.pssrs.set(pssrId, pssr);
    return pssr;
  }

  async completePSSR(pssrId: string, result: 'PASS' | 'PASS_WITH_CONDITIONS' | 'FAIL', recommendations: string[]): Promise<PSSR> {
    const pssr = await this.getPSSR(pssrId);

    // Check if all checklist items are answered
    const unanswered = pssr.checklist.filter(i => i.response === 'PENDING');
    if (unanswered.length > 0) {
      throw new BadRequestException(`${unanswered.length} checklist items are still pending`);
    }

    pssr.status = PSSRStatus.COMPLETED;
    pssr.completedDate = new Date();
    pssr.overallResult = result;
    pssr.recommendations = recommendations;
    pssr.nextReviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    pssr.updatedAt = new Date();

    this.pssrs.set(pssrId, pssr);
    this.logger.log(`PSSR completed: ${pssrId} - Result: ${result}`);
    return pssr;
  }

  async listPSSRs(filters?: {
    locationId?: string;
    status?: PSSRStatus;
    overdue?: boolean;
  }): Promise<PSSR[]> {
    let pssrs = Array.from(this.pssrs.values());

    if (filters?.locationId) {
      pssrs = pssrs.filter(p => p.locationId === filters.locationId);
    }
    if (filters?.status) {
      pssrs = pssrs.filter(p => p.status === filters.status);
    }
    if (filters?.overdue) {
      const now = new Date();
      pssrs = pssrs.filter(p =>
        p.status === PSSRStatus.SCHEDULED && p.scheduledDate < now
      );
      // Update status to overdue
      pssrs.forEach(p => {
        p.status = PSSRStatus.OVERDUE;
        this.pssrs.set(p.id, p);
      });
    }

    return pssrs.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  private generatePSSRChecklist(): PSSRChecklistItem[] {
    const items: PSSRChecklistItem[] = [
      // Safety Equipment
      { id: 'pssr-1', category: 'Safety Equipment', question: 'Are all safety guards in place and functional?', response: 'PENDING', isoReference: '8.1.2' },
      { id: 'pssr-2', category: 'Safety Equipment', question: 'Are emergency stops tested and operational?', response: 'PENDING', isoReference: '8.2' },
      { id: 'pssr-3', category: 'Safety Equipment', question: 'Is PPE available and in good condition?', response: 'PENDING', isoReference: '8.1.2' },
      { id: 'pssr-4', category: 'Safety Equipment', question: 'Are fire extinguishers accessible and inspected?', response: 'PENDING', isoReference: '8.2' },

      // Documentation
      { id: 'pssr-5', category: 'Documentation', question: 'Are operating procedures current and available?', response: 'PENDING', isoReference: '7.5' },
      { id: 'pssr-6', category: 'Documentation', question: 'Are risk assessments completed for all hazards?', response: 'PENDING', isoReference: '6.1.2' },
      { id: 'pssr-7', category: 'Documentation', question: 'Are Material Safety Data Sheets (MSDS) available?', response: 'PENDING', isoReference: '7.5' },
      { id: 'pssr-8', category: 'Documentation', question: 'Is emergency response plan documented and accessible?', response: 'PENDING', isoReference: '8.2' },

      // Training
      { id: 'pssr-9', category: 'Training', question: 'Have all personnel received required safety training?', response: 'PENDING', isoReference: '7.2' },
      { id: 'pssr-10', category: 'Training', question: 'Are training records up to date?', response: 'PENDING', isoReference: '7.2' },
      { id: 'pssr-11', category: 'Training', question: 'Have emergency drills been conducted?', response: 'PENDING', isoReference: '8.2' },

      // Physical Environment
      { id: 'pssr-12', category: 'Physical Environment', question: 'Is housekeeping satisfactory?', response: 'PENDING', isoReference: '8.1' },
      { id: 'pssr-13', category: 'Physical Environment', question: 'Is lighting adequate in all work areas?', response: 'PENDING', isoReference: '8.1' },
      { id: 'pssr-14', category: 'Physical Environment', question: 'Is ventilation adequate?', response: 'PENDING', isoReference: '8.1' },
      { id: 'pssr-15', category: 'Physical Environment', question: 'Are walkways clear and properly marked?', response: 'PENDING', isoReference: '8.1' },

      // Electrical Safety
      { id: 'pssr-16', category: 'Electrical Safety', question: 'Are electrical panels accessible and labeled?', response: 'PENDING', isoReference: '8.1.2' },
      { id: 'pssr-17', category: 'Electrical Safety', question: 'Are cables and wiring in good condition?', response: 'PENDING', isoReference: '8.1.2' },
      { id: 'pssr-18', category: 'Electrical Safety', question: 'Is lockout/tagout equipment available?', response: 'PENDING', isoReference: '8.1.2' },

      // Chemical Safety
      { id: 'pssr-19', category: 'Chemical Safety', question: 'Are chemicals properly stored and labeled?', response: 'PENDING', isoReference: '8.1.2' },
      { id: 'pssr-20', category: 'Chemical Safety', question: 'Is spill containment available?', response: 'PENDING', isoReference: '8.1.2' },
    ];

    return items;
  }

  // ===== RISK MATRIX & CALCULATIONS =====

  getRiskMatrix(): RiskMatrix[][] {
    const matrix: RiskMatrix[][] = [];

    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const row: RiskMatrix[] = [];
      for (let severity = 1; severity <= 5; severity++) {
        const score = likelihood * severity;
        const level = this.calculateRiskLevel(score);
        row.push({
          likelihood: likelihood as RiskLikelihood,
          severity: severity as RiskSeverity,
          riskScore: score,
          riskLevel: level,
          color: this.getRiskColor(level),
          action: this.getRiskAction(level),
        });
      }
      matrix.push(row);
    }

    return matrix;
  }

  calculateRiskLevel(score: number): RiskLevel {
    if (score <= 4) return RiskLevel.LOW;
    if (score <= 9) return RiskLevel.MEDIUM;
    if (score <= 15) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private getRiskColor(level: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
      [RiskLevel.LOW]: '#22c55e',      // Green
      [RiskLevel.MEDIUM]: '#eab308',   // Yellow
      [RiskLevel.HIGH]: '#f97316',     // Orange
      [RiskLevel.CRITICAL]: '#ef4444', // Red
    };
    return colors[level];
  }

  private getRiskAction(level: RiskLevel): string {
    const actions: Record<RiskLevel, string> = {
      [RiskLevel.LOW]: 'Monitor periodically. No immediate action required.',
      [RiskLevel.MEDIUM]: 'Action required within 30 days. Implement additional controls.',
      [RiskLevel.HIGH]: 'Urgent action required within 7 days. Senior management notification.',
      [RiskLevel.CRITICAL]: 'Immediate action required. Stop work until risk is reduced.',
    };
    return actions[level];
  }

  // ===== SUMMARIES & REPORTS =====

  async getRiskRegisterSummary(): Promise<RiskRegisterSummary> {
    const assessments = Array.from(this.riskAssessments.values());
    const now = new Date();

    const byLevel: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
    };

    const byCategory: Record<RiskCategory, number> = {} as Record<RiskCategory, number>;
    for (const cat of Object.values(RiskCategory)) {
      byCategory[cat] = 0;
    }

    const byStatus: Record<AssessmentStatus, number> = {} as Record<AssessmentStatus, number>;
    for (const status of Object.values(AssessmentStatus)) {
      byStatus[status] = 0;
    }

    let controlsOverdue = 0;
    let reviewsOverdue = 0;

    for (const assessment of assessments) {
      byLevel[assessment.residualRiskLevel]++;
      if (assessment.hazard) {
        byCategory[assessment.hazard.category]++;
      }
      byStatus[assessment.status]++;

      if (assessment.nextReviewDate < now) {
        reviewsOverdue++;
      }

      for (const control of assessment.controls) {
        if (
          control.status !== ControlStatus.IMPLEMENTED &&
          control.status !== ControlStatus.VERIFIED &&
          control.targetDate < now
        ) {
          controlsOverdue++;
        }
      }
    }

    const topRisks = assessments
      .filter(a => a.status === AssessmentStatus.APPROVED)
      .sort((a, b) => b.residualRiskScore - a.residualRiskScore)
      .slice(0, 10);

    return {
      totalRisks: assessments.length,
      byLevel,
      byCategory,
      byStatus,
      controlsOverdue,
      reviewsOverdue,
      topRisks,
    };
  }

  async getLocationHazardMap(locationId: string): Promise<LocationHazardMap> {
    const location = await this.getLocation(locationId);
    const hazards = await this.getHazardsByLocation(locationId);
    const assessments = await this.listRiskAssessments({ locationId });

    let totalScore = 0;
    let highestLevel = RiskLevel.LOW;

    for (const assessment of assessments) {
      totalScore += assessment.residualRiskScore;
      if (this.compareRiskLevels(assessment.residualRiskLevel, highestLevel) > 0) {
        highestLevel = assessment.residualRiskLevel;
      }
    }

    return {
      locationId,
      location,
      hazards,
      riskAssessments: assessments,
      averageRiskScore: assessments.length > 0 ? Math.round(totalScore / assessments.length) : 0,
      highestRiskLevel: highestLevel,
    };
  }

  private compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
    const order: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 1,
      [RiskLevel.MEDIUM]: 2,
      [RiskLevel.HIGH]: 3,
      [RiskLevel.CRITICAL]: 4,
    };
    return order[a] - order[b];
  }

  // ===== ISO 45001 COMPLIANCE =====

  getISO45001Clauses(): ISO45001Compliance[] {
    return [...this.ISO_45001_CLAUSES];
  }

  async updateISO45001Compliance(clause: string, status: ISO45001Compliance['status'], evidence: string[], gaps?: string[], actions?: string[]): Promise<ISO45001Compliance> {
    const clauseIndex = this.ISO_45001_CLAUSES.findIndex(c => c.clause === clause);

    if (clauseIndex === -1) {
      throw new NotFoundException(`ISO 45001 clause ${clause} not found`);
    }

    this.ISO_45001_CLAUSES[clauseIndex] = {
      ...this.ISO_45001_CLAUSES[clauseIndex],
      status,
      evidence,
      gaps,
      actions,
    };

    return this.ISO_45001_CLAUSES[clauseIndex];
  }

  async getISO45001ComplianceScore(): Promise<{
    score: number;
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    notApplicable: number;
    recommendations: string[];
  }> {
    let compliant = 0;
    let partiallyCompliant = 0;
    let nonCompliant = 0;
    let notApplicable = 0;
    const recommendations: string[] = [];

    for (const clause of this.ISO_45001_CLAUSES) {
      switch (clause.status) {
        case 'COMPLIANT':
          compliant++;
          break;
        case 'PARTIALLY_COMPLIANT':
          partiallyCompliant++;
          recommendations.push(`${clause.clause}: Complete implementation of ${clause.description}`);
          break;
        case 'NON_COMPLIANT':
          nonCompliant++;
          recommendations.push(`${clause.clause}: Urgent - Implement ${clause.description}`);
          break;
        case 'NOT_APPLICABLE':
          notApplicable++;
          break;
      }
    }

    const applicable = this.ISO_45001_CLAUSES.length - notApplicable;
    const score = applicable > 0
      ? Math.round(((compliant + partiallyCompliant * 0.5) / applicable) * 100)
      : 0;

    return {
      score,
      compliant,
      partiallyCompliant,
      nonCompliant,
      notApplicable,
      recommendations,
    };
  }

  // ===== CONTROL HIERARCHY GUIDANCE =====

  getControlHierarchyGuidance(): { hierarchy: ControlHierarchy; description: string; examples: string[]; effectiveness: string }[] {
    return [
      {
        hierarchy: ControlHierarchy.ELIMINATION,
        description: 'Physically remove the hazard',
        examples: [
          'Automate dangerous manual tasks',
          'Remove hazardous substances from the process',
          'Redesign process to eliminate the hazard',
        ],
        effectiveness: 'Most effective (90% risk reduction potential)',
      },
      {
        hierarchy: ControlHierarchy.SUBSTITUTION,
        description: 'Replace the hazard with something less dangerous',
        examples: [
          'Use less toxic chemicals',
          'Replace heavy equipment with lighter alternatives',
          'Substitute manual processes with mechanical ones',
        ],
        effectiveness: 'Highly effective (70% risk reduction potential)',
      },
      {
        hierarchy: ControlHierarchy.ENGINEERING,
        description: 'Isolate people from the hazard',
        examples: [
          'Install machine guards',
          'Add ventilation systems',
          'Install noise barriers',
          'Use interlocks and safety devices',
        ],
        effectiveness: 'Effective (50% risk reduction potential)',
      },
      {
        hierarchy: ControlHierarchy.ADMINISTRATIVE,
        description: 'Change the way people work',
        examples: [
          'Implement safe work procedures',
          'Provide training and supervision',
          'Rotate workers to reduce exposure',
          'Display warning signs',
        ],
        effectiveness: 'Moderately effective (30% risk reduction potential)',
      },
      {
        hierarchy: ControlHierarchy.PPE,
        description: 'Protect the worker with personal equipment',
        examples: [
          'Safety glasses, helmets, gloves',
          'Respiratory protection',
          'Hearing protection',
          'Fall protection harnesses',
        ],
        effectiveness: 'Least effective (10% risk reduction potential)',
      },
    ];
  }
}

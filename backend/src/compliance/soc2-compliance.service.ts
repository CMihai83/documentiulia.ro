import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SOC 2 Compliance Service
 * Implements SOC 2 Trust Service Criteria controls
 *
 * SOC 2 Trust Service Criteria:
 * - CC1: Control Environment
 * - CC2: Communication and Information
 * - CC3: Risk Assessment
 * - CC4: Monitoring Activities
 * - CC5: Control Activities
 * - CC6: Logical and Physical Access Controls
 * - CC7: System Operations
 * - CC8: Change Management
 * - CC9: Risk Mitigation
 */

// =================== TYPES & INTERFACES ===================

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'partial' | 'not_assessed';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ComplianceControl {
  id: string;
  category: string;
  name: string;
  description: string;
  status: ComplianceStatus;
  lastAssessed: Date;
  evidence?: string[];
  gaps?: string[];
  remediation?: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedSystems: string[];
  affectedUsers?: number;
  detectedAt: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
  rootCause?: string;
  remediation?: string;
  lessonsLearned?: string;
  reportedBy: string;
}

export interface AccessReview {
  id: string;
  userId: string;
  reviewerId: string;
  reviewDate: Date;
  accessLevel: string;
  isAppropriate: boolean;
  notes?: string;
  action?: 'maintain' | 'revoke' | 'modify';
}

export interface RiskAssessment {
  id: string;
  name: string;
  description: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  riskScore: number;
  riskLevel: RiskLevel;
  mitigations: string[];
  residualRisk: RiskLevel;
  owner: string;
  lastReviewed: Date;
  nextReview: Date;
}

export interface ComplianceReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  overallStatus: ComplianceStatus;
  controlsSummary: {
    total: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notAssessed: number;
  };
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  incidentSummary: {
    total: number;
    open: number;
    resolved: number;
    meanTimeToResolve: number;
  };
  controls: ComplianceControl[];
  recommendations: string[];
}

export interface DataAsset {
  id: string;
  name: string;
  description: string;
  classification: DataClassification;
  owner: string;
  location: string;
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  backupRequired: boolean;
  personalData: boolean;
  lastClassified: Date;
}

// =================== SOC 2 CONTROL DEFINITIONS ===================

const SOC2_CONTROLS: Omit<ComplianceControl, 'status' | 'lastAssessed'>[] = [
  // CC1: Control Environment
  {
    id: 'CC1.1',
    category: 'CC1',
    name: 'Commitment to Integrity and Ethics',
    description: 'Organization demonstrates commitment to integrity and ethical values',
  },
  {
    id: 'CC1.2',
    category: 'CC1',
    name: 'Board Oversight',
    description: 'Board of directors demonstrates independence and oversight',
  },
  {
    id: 'CC1.3',
    category: 'CC1',
    name: 'Organizational Structure',
    description: 'Management establishes organizational structure and reporting lines',
  },
  {
    id: 'CC1.4',
    category: 'CC1',
    name: 'Commitment to Competence',
    description: 'Organization demonstrates commitment to attract, develop, and retain competent individuals',
  },
  {
    id: 'CC1.5',
    category: 'CC1',
    name: 'Accountability',
    description: 'Organization holds individuals accountable for internal control responsibilities',
  },

  // CC2: Communication and Information
  {
    id: 'CC2.1',
    category: 'CC2',
    name: 'Information Quality',
    description: 'Organization obtains relevant, quality information to support internal control',
  },
  {
    id: 'CC2.2',
    category: 'CC2',
    name: 'Internal Communication',
    description: 'Organization internally communicates information necessary to support internal control',
  },
  {
    id: 'CC2.3',
    category: 'CC2',
    name: 'External Communication',
    description: 'Organization communicates with external parties regarding internal control matters',
  },

  // CC3: Risk Assessment
  {
    id: 'CC3.1',
    category: 'CC3',
    name: 'Risk Objectives',
    description: 'Organization specifies objectives to identify and assess risks',
  },
  {
    id: 'CC3.2',
    category: 'CC3',
    name: 'Risk Identification',
    description: 'Organization identifies and analyzes risks to achievement of objectives',
  },
  {
    id: 'CC3.3',
    category: 'CC3',
    name: 'Fraud Risk Assessment',
    description: 'Organization considers potential for fraud in assessing risks',
  },
  {
    id: 'CC3.4',
    category: 'CC3',
    name: 'Change Assessment',
    description: 'Organization identifies and assesses changes that could significantly impact controls',
  },

  // CC4: Monitoring Activities
  {
    id: 'CC4.1',
    category: 'CC4',
    name: 'Ongoing Monitoring',
    description: 'Organization selects and develops ongoing and/or separate evaluations',
  },
  {
    id: 'CC4.2',
    category: 'CC4',
    name: 'Deficiency Evaluation',
    description: 'Organization evaluates and communicates internal control deficiencies timely',
  },

  // CC5: Control Activities
  {
    id: 'CC5.1',
    category: 'CC5',
    name: 'Control Selection',
    description: 'Organization selects and develops control activities that mitigate risks',
  },
  {
    id: 'CC5.2',
    category: 'CC5',
    name: 'Technology Controls',
    description: 'Organization selects and develops general control activities over technology',
  },
  {
    id: 'CC5.3',
    category: 'CC5',
    name: 'Policy Deployment',
    description: 'Organization deploys control activities through policies and procedures',
  },

  // CC6: Logical and Physical Access Controls
  {
    id: 'CC6.1',
    category: 'CC6',
    name: 'Access Security',
    description: 'Organization implements logical access security software and infrastructure',
  },
  {
    id: 'CC6.2',
    category: 'CC6',
    name: 'User Registration',
    description: 'Organization registers and authorizes users before granting access',
  },
  {
    id: 'CC6.3',
    category: 'CC6',
    name: 'Access Removal',
    description: 'Organization removes user access credentials when no longer needed',
  },
  {
    id: 'CC6.4',
    category: 'CC6',
    name: 'Access Review',
    description: 'Organization restricts and reviews user access periodically',
  },
  {
    id: 'CC6.5',
    category: 'CC6',
    name: 'Physical Access',
    description: 'Organization restricts physical access to facilities and protected information assets',
  },
  {
    id: 'CC6.6',
    category: 'CC6',
    name: 'System Protection',
    description: 'Organization implements controls to prevent unauthorized logical access',
  },
  {
    id: 'CC6.7',
    category: 'CC6',
    name: 'Data Transmission',
    description: 'Organization restricts transmission and movement of data',
  },
  {
    id: 'CC6.8',
    category: 'CC6',
    name: 'Malicious Software',
    description: 'Organization implements controls against malicious software',
  },

  // CC7: System Operations
  {
    id: 'CC7.1',
    category: 'CC7',
    name: 'Vulnerability Management',
    description: 'Organization detects and monitors for security events and vulnerabilities',
  },
  {
    id: 'CC7.2',
    category: 'CC7',
    name: 'Incident Response',
    description: 'Organization responds to identified security incidents',
  },
  {
    id: 'CC7.3',
    category: 'CC7',
    name: 'Business Continuity',
    description: 'Organization implements business continuity activities',
  },
  {
    id: 'CC7.4',
    category: 'CC7',
    name: 'Backup Recovery',
    description: 'Organization implements backup and recovery procedures',
  },

  // CC8: Change Management
  {
    id: 'CC8.1',
    category: 'CC8',
    name: 'Change Control',
    description: 'Organization authorizes, designs, develops, and implements changes',
  },

  // CC9: Risk Mitigation
  {
    id: 'CC9.1',
    category: 'CC9',
    name: 'Risk Mitigation',
    description: 'Organization identifies, selects, and develops risk mitigation activities',
  },
  {
    id: 'CC9.2',
    category: 'CC9',
    name: 'Vendor Management',
    description: 'Organization assesses and manages risks from vendors and business partners',
  },
];

@Injectable()
export class Soc2ComplianceService {
  private readonly logger = new Logger(Soc2ComplianceService.name);

  // In-memory storage for demo (in production, use database)
  private controls: Map<string, ComplianceControl> = new Map();
  private incidents: Map<string, SecurityIncident> = new Map();
  private accessReviews: Map<string, AccessReview> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private dataAssets: Map<string, DataAsset> = new Map();

  constructor(private readonly prisma: PrismaService) {
    this.initializeControls();
  }

  // =================== INITIALIZATION ===================

  private initializeControls(): void {
    for (const control of SOC2_CONTROLS) {
      this.controls.set(control.id, {
        ...control,
        status: 'not_assessed',
        lastAssessed: new Date(0),
      });
    }
    this.logger.log(`Initialized ${this.controls.size} SOC 2 controls`);
  }

  // =================== COMPLIANCE CONTROLS ===================

  /**
   * Get all SOC 2 controls
   */
  getAllControls(): ComplianceControl[] {
    return Array.from(this.controls.values());
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(category: string): ComplianceControl[] {
    return Array.from(this.controls.values()).filter(
      (c) => c.category === category,
    );
  }

  /**
   * Get control by ID
   */
  getControl(id: string): ComplianceControl | null {
    return this.controls.get(id) || null;
  }

  /**
   * Update control status
   */
  updateControlStatus(
    id: string,
    status: ComplianceStatus,
    evidence?: string[],
    gaps?: string[],
    remediation?: string,
  ): ComplianceControl | null {
    const control = this.controls.get(id);
    if (!control) return null;

    const updated: ComplianceControl = {
      ...control,
      status,
      lastAssessed: new Date(),
      evidence: evidence || control.evidence,
      gaps: gaps || control.gaps,
      remediation: remediation || control.remediation,
    };

    this.controls.set(id, updated);
    this.logger.log(`Control ${id} updated to status: ${status}`);
    return updated;
  }

  /**
   * Get compliance summary by category
   */
  getComplianceSummaryByCategory(): Record<string, {
    total: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notAssessed: number;
    percentage: number;
  }> {
    const categories = ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9'];
    const summary: Record<string, any> = {};

    for (const category of categories) {
      const controls = this.getControlsByCategory(category);
      const compliant = controls.filter((c) => c.status === 'compliant').length;
      const total = controls.length;

      summary[category] = {
        total,
        compliant: controls.filter((c) => c.status === 'compliant').length,
        nonCompliant: controls.filter((c) => c.status === 'non_compliant').length,
        partial: controls.filter((c) => c.status === 'partial').length,
        notAssessed: controls.filter((c) => c.status === 'not_assessed').length,
        percentage: total > 0 ? Math.round((compliant / total) * 100) : 0,
      };
    }

    return summary;
  }

  // =================== SECURITY INCIDENTS ===================

  /**
   * Report a security incident
   */
  reportIncident(
    title: string,
    description: string,
    severity: IncidentSeverity,
    affectedSystems: string[],
    reportedBy: string,
    affectedUsers?: number,
  ): SecurityIncident {
    const id = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const incident: SecurityIncident = {
      id,
      title,
      description,
      severity,
      status: 'open',
      affectedSystems,
      affectedUsers,
      detectedAt: new Date(),
      reportedBy,
    };

    this.incidents.set(id, incident);
    this.logger.warn(`Security incident reported: ${id} - ${title} (${severity})`);
    return incident;
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    updates?: Partial<Pick<SecurityIncident, 'rootCause' | 'remediation' | 'lessonsLearned'>>,
  ): SecurityIncident | null {
    const incident = this.incidents.get(id);
    if (!incident) return null;

    const updated: SecurityIncident = {
      ...incident,
      ...updates,
      status,
    };

    if (status === 'investigating' && !incident.respondedAt) {
      updated.respondedAt = new Date();
    }

    if (status === 'resolved' || status === 'closed') {
      updated.resolvedAt = new Date();
    }

    this.incidents.set(id, updated);
    this.logger.log(`Incident ${id} status updated to: ${status}`);
    return updated;
  }

  /**
   * Get all incidents
   */
  getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
    );
  }

  /**
   * Get open incidents
   */
  getOpenIncidents(): SecurityIncident[] {
    return this.getAllIncidents().filter(
      (i) => i.status !== 'resolved' && i.status !== 'closed',
    );
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): SecurityIncident | null {
    return this.incidents.get(id) || null;
  }

  /**
   * Get incident metrics
   */
  getIncidentMetrics(): {
    total: number;
    open: number;
    resolved: number;
    bySeverity: Record<IncidentSeverity, number>;
    meanTimeToRespond: number;
    meanTimeToResolve: number;
  } {
    const incidents = this.getAllIncidents();
    const resolved = incidents.filter((i) => i.resolvedAt);

    const responseTimes = incidents
      .filter((i) => i.respondedAt)
      .map((i) => i.respondedAt!.getTime() - i.detectedAt.getTime());

    const resolutionTimes = resolved
      .filter((i) => i.resolvedAt)
      .map((i) => i.resolvedAt!.getTime() - i.detectedAt.getTime());

    return {
      total: incidents.length,
      open: incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length,
      resolved: resolved.length,
      bySeverity: {
        critical: incidents.filter((i) => i.severity === 'critical').length,
        high: incidents.filter((i) => i.severity === 'high').length,
        medium: incidents.filter((i) => i.severity === 'medium').length,
        low: incidents.filter((i) => i.severity === 'low').length,
      },
      meanTimeToRespond: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 60000)
        : 0, // minutes
      meanTimeToResolve: resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / 3600000)
        : 0, // hours
    };
  }

  // =================== ACCESS REVIEWS ===================

  /**
   * Create access review
   */
  createAccessReview(
    userId: string,
    reviewerId: string,
    accessLevel: string,
    isAppropriate: boolean,
    action: 'maintain' | 'revoke' | 'modify',
    notes?: string,
  ): AccessReview {
    const id = `AR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const review: AccessReview = {
      id,
      userId,
      reviewerId,
      reviewDate: new Date(),
      accessLevel,
      isAppropriate,
      action,
      notes,
    };

    this.accessReviews.set(id, review);
    this.logger.log(`Access review created: ${id} for user ${userId}`);
    return review;
  }

  /**
   * Get access reviews for user
   */
  getAccessReviewsForUser(userId: string): AccessReview[] {
    return Array.from(this.accessReviews.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.reviewDate.getTime() - a.reviewDate.getTime());
  }

  /**
   * Get all access reviews
   */
  getAllAccessReviews(): AccessReview[] {
    return Array.from(this.accessReviews.values()).sort(
      (a, b) => b.reviewDate.getTime() - a.reviewDate.getTime(),
    );
  }

  /**
   * Get access review statistics
   */
  getAccessReviewStats(): {
    total: number;
    appropriate: number;
    inappropriate: number;
    byAction: Record<string, number>;
    reviewedInLast90Days: number;
  } {
    const reviews = this.getAllAccessReviews();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return {
      total: reviews.length,
      appropriate: reviews.filter((r) => r.isAppropriate).length,
      inappropriate: reviews.filter((r) => !r.isAppropriate).length,
      byAction: {
        maintain: reviews.filter((r) => r.action === 'maintain').length,
        revoke: reviews.filter((r) => r.action === 'revoke').length,
        modify: reviews.filter((r) => r.action === 'modify').length,
      },
      reviewedInLast90Days: reviews.filter((r) => r.reviewDate >= ninetyDaysAgo).length,
    };
  }

  // =================== RISK ASSESSMENT ===================

  /**
   * Create risk assessment
   */
  createRiskAssessment(
    name: string,
    description: string,
    category: string,
    likelihood: 1 | 2 | 3 | 4 | 5,
    impact: 1 | 2 | 3 | 4 | 5,
    mitigations: string[],
    owner: string,
  ): RiskAssessment {
    const id = `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const riskScore = likelihood * impact;

    const riskLevel = this.calculateRiskLevel(riskScore);
    const residualRisk = this.calculateResidualRisk(riskLevel, mitigations.length);

    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + (riskLevel === 'critical' ? 1 : riskLevel === 'high' ? 3 : 6));

    const assessment: RiskAssessment = {
      id,
      name,
      description,
      category,
      likelihood,
      impact,
      riskScore,
      riskLevel,
      mitigations,
      residualRisk,
      owner,
      lastReviewed: new Date(),
      nextReview,
    };

    this.riskAssessments.set(id, assessment);
    this.logger.log(`Risk assessment created: ${id} - ${name} (${riskLevel})`);
    return assessment;
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 20) return 'critical';
    if (score >= 12) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }

  /**
   * Calculate residual risk after mitigations
   */
  private calculateResidualRisk(inherentRisk: RiskLevel, mitigationCount: number): RiskLevel {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(inherentRisk);
    const reduction = Math.min(mitigationCount, currentIndex);
    return levels[currentIndex - reduction];
  }

  /**
   * Get all risk assessments
   */
  getAllRiskAssessments(): RiskAssessment[] {
    return Array.from(this.riskAssessments.values()).sort(
      (a, b) => b.riskScore - a.riskScore,
    );
  }

  /**
   * Get risk assessment by ID
   */
  getRiskAssessment(id: string): RiskAssessment | null {
    return this.riskAssessments.get(id) || null;
  }

  /**
   * Get risk summary
   */
  getRiskSummary(): {
    total: number;
    byLevel: Record<RiskLevel, number>;
    byCategory: Record<string, number>;
    averageScore: number;
    overdueReviews: number;
  } {
    const assessments = this.getAllRiskAssessments();
    const now = new Date();

    const byCategory: Record<string, number> = {};
    for (const assessment of assessments) {
      byCategory[assessment.category] = (byCategory[assessment.category] || 0) + 1;
    }

    return {
      total: assessments.length,
      byLevel: {
        critical: assessments.filter((a) => a.riskLevel === 'critical').length,
        high: assessments.filter((a) => a.riskLevel === 'high').length,
        medium: assessments.filter((a) => a.riskLevel === 'medium').length,
        low: assessments.filter((a) => a.riskLevel === 'low').length,
      },
      byCategory,
      averageScore: assessments.length > 0
        ? Math.round(assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length * 10) / 10
        : 0,
      overdueReviews: assessments.filter((a) => a.nextReview < now).length,
    };
  }

  // =================== DATA CLASSIFICATION ===================

  /**
   * Register data asset
   */
  registerDataAsset(
    name: string,
    description: string,
    classification: DataClassification,
    owner: string,
    location: string,
    retentionPeriod: number,
    personalData: boolean = false,
  ): DataAsset {
    const id = `DATA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const asset: DataAsset = {
      id,
      name,
      description,
      classification,
      owner,
      location,
      retentionPeriod,
      encryptionRequired: classification === 'confidential' || classification === 'restricted',
      backupRequired: classification !== 'public',
      personalData,
      lastClassified: new Date(),
    };

    this.dataAssets.set(id, asset);
    this.logger.log(`Data asset registered: ${id} - ${name} (${classification})`);
    return asset;
  }

  /**
   * Get all data assets
   */
  getAllDataAssets(): DataAsset[] {
    return Array.from(this.dataAssets.values());
  }

  /**
   * Get data assets by classification
   */
  getDataAssetsByClassification(classification: DataClassification): DataAsset[] {
    return this.getAllDataAssets().filter((a) => a.classification === classification);
  }

  /**
   * Get data classification summary
   */
  getDataClassificationSummary(): {
    total: number;
    byClassification: Record<DataClassification, number>;
    personalDataAssets: number;
    encryptionRequired: number;
  } {
    const assets = this.getAllDataAssets();

    return {
      total: assets.length,
      byClassification: {
        public: assets.filter((a) => a.classification === 'public').length,
        internal: assets.filter((a) => a.classification === 'internal').length,
        confidential: assets.filter((a) => a.classification === 'confidential').length,
        restricted: assets.filter((a) => a.classification === 'restricted').length,
      },
      personalDataAssets: assets.filter((a) => a.personalData).length,
      encryptionRequired: assets.filter((a) => a.encryptionRequired).length,
    };
  }

  // =================== COMPLIANCE REPORTING ===================

  /**
   * Generate comprehensive compliance report
   */
  generateComplianceReport(startDate?: Date, endDate?: Date): ComplianceReport {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const controls = this.getAllControls();
    const incidentMetrics = this.getIncidentMetrics();

    const controlsSummary = {
      total: controls.length,
      compliant: controls.filter((c) => c.status === 'compliant').length,
      nonCompliant: controls.filter((c) => c.status === 'non_compliant').length,
      partial: controls.filter((c) => c.status === 'partial').length,
      notAssessed: controls.filter((c) => c.status === 'not_assessed').length,
    };

    const riskSummary = this.getRiskSummary();

    // Determine overall status
    let overallStatus: ComplianceStatus = 'compliant';
    if (controlsSummary.nonCompliant > 0) {
      overallStatus = 'non_compliant';
    } else if (controlsSummary.partial > 0 || controlsSummary.notAssessed > 0) {
      overallStatus = 'partial';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (controlsSummary.notAssessed > 0) {
      recommendations.push(`Complete assessment for ${controlsSummary.notAssessed} unassessed controls`);
    }

    if (controlsSummary.nonCompliant > 0) {
      recommendations.push(`Address ${controlsSummary.nonCompliant} non-compliant controls as priority`);
    }

    if (riskSummary.byLevel.critical > 0) {
      recommendations.push(`Mitigate ${riskSummary.byLevel.critical} critical risks immediately`);
    }

    if (incidentMetrics.open > 0) {
      recommendations.push(`Resolve ${incidentMetrics.open} open security incidents`);
    }

    if (riskSummary.overdueReviews > 0) {
      recommendations.push(`Complete ${riskSummary.overdueReviews} overdue risk reviews`);
    }

    return {
      generatedAt: new Date(),
      period: { start, end },
      overallStatus,
      controlsSummary,
      riskSummary: riskSummary.byLevel,
      incidentSummary: {
        total: incidentMetrics.total,
        open: incidentMetrics.open,
        resolved: incidentMetrics.resolved,
        meanTimeToResolve: incidentMetrics.meanTimeToResolve,
      },
      controls,
      recommendations,
    };
  }

  /**
   * Get compliance dashboard data
   */
  getComplianceDashboard(): {
    overallCompliance: number;
    controlsByCategory: Record<string, { compliant: number; total: number; percentage: number }>;
    riskSummary: ReturnType<typeof this.getRiskSummary>;
    incidentMetrics: ReturnType<typeof this.getIncidentMetrics>;
    accessReviewStats: ReturnType<typeof this.getAccessReviewStats>;
    dataClassification: ReturnType<typeof this.getDataClassificationSummary>;
    recentActivity: Array<{ type: string; description: string; timestamp: Date }>;
  } {
    const controls = this.getAllControls();
    const compliantCount = controls.filter((c) => c.status === 'compliant').length;

    const categoryData = this.getComplianceSummaryByCategory();
    const controlsByCategory: Record<string, { compliant: number; total: number; percentage: number }> = {};

    for (const [category, data] of Object.entries(categoryData)) {
      controlsByCategory[category] = {
        compliant: data.compliant,
        total: data.total,
        percentage: data.percentage,
      };
    }

    // Build recent activity from incidents
    const recentActivity = this.getAllIncidents()
      .slice(0, 10)
      .map((i) => ({
        type: 'incident',
        description: `${i.severity.toUpperCase()}: ${i.title}`,
        timestamp: i.detectedAt,
      }));

    return {
      overallCompliance: controls.length > 0
        ? Math.round((compliantCount / controls.length) * 100)
        : 0,
      controlsByCategory,
      riskSummary: this.getRiskSummary(),
      incidentMetrics: this.getIncidentMetrics(),
      accessReviewStats: this.getAccessReviewStats(),
      dataClassification: this.getDataClassificationSummary(),
      recentActivity,
    };
  }

  // =================== AUDIT LOG INTEGRATION ===================

  /**
   * Log compliance-related audit event
   */
  async logComplianceEvent(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    details: Record<string, any>,
    organizationId?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `COMPLIANCE_${action}`,
          entity,
          entityId,
          details,
          organizationId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log compliance event: ${error}`);
    }
  }

  /**
   * Get compliance-related audit logs
   */
  async getComplianceAuditLogs(
    limit: number = 100,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const where: any = {
      action: { startsWith: 'COMPLIANCE_' },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}

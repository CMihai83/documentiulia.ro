import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface RegulatoryChange {
  id: string;
  title: string;
  description: string;
  summary: string;
  category: 'tax' | 'accounting' | 'labor' | 'data_protection' | 'corporate' | 'other';
  jurisdiction: string;
  authority: string;
  referenceNumber?: string;
  publishedDate: Date;
  effectiveDate: Date;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'enacted' | 'effective' | 'amended' | 'repealed';
  sourceUrl?: string;
  documentUrl?: string;
  affectedModules: string[];
  requiredActions: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantImpactAssessment {
  id: string;
  tenantId: string;
  changeId: string;
  assessedAt: Date;
  assessedBy: string;
  applicability: 'applicable' | 'not_applicable' | 'partially_applicable' | 'under_review';
  impactAreas: string[];
  complianceStatus: 'compliant' | 'non_compliant' | 'in_progress' | 'not_assessed';
  requiredChanges: string[];
  estimatedEffort: 'minimal' | 'moderate' | 'significant' | 'major';
  targetComplianceDate?: Date;
  notes?: string;
}

export interface RegulatoryAlert {
  id: string;
  tenantId: string;
  changeId: string;
  alertType: 'new_regulation' | 'upcoming_effective' | 'compliance_due' | 'amendment';
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
}

@Injectable()
export class RegulatoryTrackerService {
  private readonly logger = new Logger(RegulatoryTrackerService.name);

  // In-memory storage
  private changes: Map<string, RegulatoryChange> = new Map();
  private assessments: Map<string, TenantImpactAssessment[]> = new Map();
  private alerts: Map<string, RegulatoryAlert[]> = new Map();

  // Sample Romanian/EU regulatory changes
  private readonly sampleChanges: Partial<RegulatoryChange>[] = [
    {
      title: 'Legea 141/2025 - VAT Rate Changes',
      description: 'Modification of VAT rates effective August 2025',
      summary: 'Standard VAT rate changes to 21%, reduced rate to 11%',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'Romanian Parliament',
      referenceNumber: 'Legea 141/2025',
      publishedDate: new Date('2025-01-15'),
      effectiveDate: new Date('2025-08-01'),
      impactLevel: 'critical',
      status: 'enacted',
      affectedModules: ['invoices', 'finance', 'vat', 'efactura'],
      requiredActions: [
        'Update VAT calculation logic for new rates',
        'Modify invoice templates to reflect new rates',
        'Update e-Factura XML generation',
        'Review contracts for VAT clauses',
      ],
      tags: ['vat', 'tax', 'romania', '2025'],
    },
    {
      title: 'SAF-T D406 Monthly Reporting',
      description: 'Mandatory monthly SAF-T D406 reporting for all taxpayers',
      summary: 'Monthly SAF-T submission required from January 2025',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      referenceNumber: 'Order 1783/2021',
      publishedDate: new Date('2024-01-01'),
      effectiveDate: new Date('2025-01-01'),
      impactLevel: 'critical',
      status: 'effective',
      affectedModules: ['anaf', 'saft', 'reports'],
      requiredActions: [
        'Implement monthly SAF-T generation',
        'Set up automated submission to ANAF',
        'Configure validation against D406 schema',
      ],
      tags: ['saf-t', 'd406', 'anaf', 'monthly'],
    },
    {
      title: 'e-Factura B2B Mandate',
      description: 'Mandatory e-Invoicing for B2B transactions',
      summary: 'All B2B invoices must be submitted via SPV from mid-2026',
      category: 'tax',
      jurisdiction: 'RO',
      authority: 'ANAF',
      publishedDate: new Date('2024-06-01'),
      effectiveDate: new Date('2026-07-01'),
      impactLevel: 'high',
      status: 'enacted',
      affectedModules: ['invoices', 'efactura', 'anaf'],
      requiredActions: [
        'Ensure SPV integration is complete',
        'Train users on e-Factura workflow',
        'Update client onboarding for e-invoice acceptance',
      ],
      tags: ['efactura', 'b2b', 'spv', 'invoice'],
    },
    {
      title: 'GDPR Data Retention Guidelines Update',
      description: 'Updated guidance on data retention periods under GDPR',
      summary: 'Clarification on retention periods for various data categories',
      category: 'data_protection',
      jurisdiction: 'EU',
      authority: 'European Data Protection Board',
      publishedDate: new Date('2024-09-15'),
      effectiveDate: new Date('2025-03-01'),
      impactLevel: 'medium',
      status: 'enacted',
      affectedModules: ['gdpr', 'documents', 'compliance'],
      requiredActions: [
        'Review data retention policies',
        'Update retention configuration for affected data types',
        'Document compliance with new guidelines',
      ],
      tags: ['gdpr', 'data-protection', 'retention', 'eu'],
    },
    {
      title: 'Minimum Wage Increase 2025',
      description: 'Increase in minimum gross salary',
      summary: 'Minimum wage increased to 4,050 RON from January 2025',
      category: 'labor',
      jurisdiction: 'RO',
      authority: 'Romanian Government',
      referenceNumber: 'HG 2024/2024',
      publishedDate: new Date('2024-12-15'),
      effectiveDate: new Date('2025-01-01'),
      impactLevel: 'high',
      status: 'effective',
      affectedModules: ['hr', 'payroll', 'contracts'],
      requiredActions: [
        'Update payroll configuration',
        'Review employment contracts below threshold',
        'Recalculate contribution bases',
      ],
      tags: ['labor', 'payroll', 'minimum-wage', 'romania'],
    },
  ];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleChanges();
  }

  private initializeSampleChanges(): void {
    for (const sample of this.sampleChanges) {
      const id = `change_${crypto.randomBytes(12).toString('hex')}`;
      const change: RegulatoryChange = {
        id,
        title: sample.title!,
        description: sample.description || '',
        summary: sample.summary || '',
        category: sample.category || 'other',
        jurisdiction: sample.jurisdiction || 'RO',
        authority: sample.authority || 'N/A',
        referenceNumber: sample.referenceNumber,
        publishedDate: sample.publishedDate || new Date(),
        effectiveDate: sample.effectiveDate || new Date(),
        impactLevel: sample.impactLevel || 'medium',
        status: sample.status || 'enacted',
        affectedModules: sample.affectedModules || [],
        requiredActions: sample.requiredActions || [],
        tags: sample.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.changes.set(id, change);
    }
  }

  async addChange(
    params: Omit<RegulatoryChange, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<RegulatoryChange> {
    const id = `change_${crypto.randomBytes(12).toString('hex')}`;

    const change: RegulatoryChange = {
      id,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.changes.set(id, change);

    this.eventEmitter.emit('regulatory.change.added', { change });

    return change;
  }

  async updateChange(
    changeId: string,
    updates: Partial<Omit<RegulatoryChange, 'id' | 'createdAt'>>,
  ): Promise<RegulatoryChange | null> {
    const change = this.changes.get(changeId);
    if (!change) return null;

    const updated = {
      ...change,
      ...updates,
      updatedAt: new Date(),
    };

    this.changes.set(changeId, updated);

    return updated;
  }

  async getChanges(filters?: {
    category?: string;
    jurisdiction?: string;
    status?: string;
    impactLevel?: string;
    effectiveAfter?: Date;
    effectiveBefore?: Date;
  }): Promise<RegulatoryChange[]> {
    let changes = Array.from(this.changes.values());

    if (filters?.category) {
      changes = changes.filter(c => c.category === filters.category);
    }
    if (filters?.jurisdiction) {
      changes = changes.filter(c => c.jurisdiction === filters.jurisdiction);
    }
    if (filters?.status) {
      changes = changes.filter(c => c.status === filters.status);
    }
    if (filters?.impactLevel) {
      changes = changes.filter(c => c.impactLevel === filters.impactLevel);
    }
    if (filters?.effectiveAfter) {
      changes = changes.filter(c => c.effectiveDate >= filters.effectiveAfter!);
    }
    if (filters?.effectiveBefore) {
      changes = changes.filter(c => c.effectiveDate <= filters.effectiveBefore!);
    }

    return changes.sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime());
  }

  async getChange(changeId: string): Promise<RegulatoryChange | null> {
    return this.changes.get(changeId) || null;
  }

  async getUpcomingChanges(days: number = 90): Promise<RegulatoryChange[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.changes.values())
      .filter(c =>
        c.effectiveDate > now &&
        c.effectiveDate <= cutoff &&
        (c.status === 'enacted' || c.status === 'draft')
      )
      .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
  }

  async assessImpact(
    tenantId: string,
    changeId: string,
    params: {
      assessedBy: string;
      applicability: TenantImpactAssessment['applicability'];
      impactAreas: string[];
      complianceStatus: TenantImpactAssessment['complianceStatus'];
      requiredChanges: string[];
      estimatedEffort: TenantImpactAssessment['estimatedEffort'];
      targetComplianceDate?: Date;
      notes?: string;
    },
  ): Promise<TenantImpactAssessment> {
    const id = `assessment_${crypto.randomBytes(12).toString('hex')}`;

    const assessment: TenantImpactAssessment = {
      id,
      tenantId,
      changeId,
      assessedAt: new Date(),
      ...params,
    };

    const tenantAssessments = this.assessments.get(tenantId) || [];
    tenantAssessments.push(assessment);
    this.assessments.set(tenantId, tenantAssessments);

    this.eventEmitter.emit('regulatory.assessment.created', { tenantId, assessment });

    return assessment;
  }

  async getAssessments(tenantId: string): Promise<TenantImpactAssessment[]> {
    return this.assessments.get(tenantId) || [];
  }

  async getAssessmentForChange(
    tenantId: string,
    changeId: string,
  ): Promise<TenantImpactAssessment | null> {
    const assessments = this.assessments.get(tenantId) || [];
    return assessments.find(a => a.changeId === changeId) || null;
  }

  async createAlert(
    tenantId: string,
    changeId: string,
    alertType: RegulatoryAlert['alertType'],
    severity: RegulatoryAlert['severity'],
    message: string,
  ): Promise<RegulatoryAlert> {
    const id = `alert_${crypto.randomBytes(8).toString('hex')}`;

    const alert: RegulatoryAlert = {
      id,
      tenantId,
      changeId,
      alertType,
      severity,
      message,
      acknowledged: false,
      createdAt: new Date(),
    };

    const tenantAlerts = this.alerts.get(tenantId) || [];
    tenantAlerts.push(alert);
    this.alerts.set(tenantId, tenantAlerts);

    this.eventEmitter.emit('regulatory.alert', { tenantId, alert });

    return alert;
  }

  async acknowledgeAlert(
    alertId: string,
    tenantId: string,
    acknowledgedBy: string,
  ): Promise<RegulatoryAlert | null> {
    const tenantAlerts = this.alerts.get(tenantId) || [];
    const alert = tenantAlerts.find(a => a.id === alertId);

    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    return alert;
  }

  async getAlerts(
    tenantId: string,
    unacknowledgedOnly: boolean = false,
  ): Promise<RegulatoryAlert[]> {
    let alerts = this.alerts.get(tenantId) || [];

    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getComplianceGapReport(tenantId: string): Promise<{
    totalChanges: number;
    assessed: number;
    notAssessed: number;
    compliant: number;
    nonCompliant: number;
    inProgress: number;
    criticalGaps: Array<{ change: RegulatoryChange; assessment?: TenantImpactAssessment }>;
    upcomingDeadlines: Array<{ change: RegulatoryChange; daysUntilEffective: number }>;
  }> {
    const changes = await this.getChanges();
    const assessments = await this.getAssessments(tenantId);

    const assessmentMap = new Map(assessments.map(a => [a.changeId, a]));

    const now = new Date();
    const criticalGaps: Array<{ change: RegulatoryChange; assessment?: TenantImpactAssessment }> = [];
    const upcomingDeadlines: Array<{ change: RegulatoryChange; daysUntilEffective: number }> = [];

    let assessed = 0;
    let compliant = 0;
    let nonCompliant = 0;
    let inProgress = 0;

    for (const change of changes) {
      const assessment = assessmentMap.get(change.id);

      if (assessment) {
        assessed++;
        if (assessment.complianceStatus === 'compliant') compliant++;
        else if (assessment.complianceStatus === 'non_compliant') nonCompliant++;
        else if (assessment.complianceStatus === 'in_progress') inProgress++;
      }

      // Check for critical gaps
      if (
        change.impactLevel === 'critical' &&
        (!assessment || assessment.complianceStatus !== 'compliant')
      ) {
        criticalGaps.push({ change, assessment });
      }

      // Check upcoming deadlines
      if (change.effectiveDate > now) {
        const daysUntilEffective = Math.ceil(
          (change.effectiveDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysUntilEffective <= 90) {
          upcomingDeadlines.push({ change, daysUntilEffective });
        }
      }
    }

    return {
      totalChanges: changes.length,
      assessed,
      notAssessed: changes.length - assessed,
      compliant,
      nonCompliant,
      inProgress,
      criticalGaps,
      upcomingDeadlines: upcomingDeadlines.sort((a, b) => a.daysUntilEffective - b.daysUntilEffective),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkForUpcomingEffectiveDates(): Promise<void> {
    this.logger.log('Checking for upcoming regulatory effective dates...');

    const upcomingChanges = await this.getUpcomingChanges(30);

    for (const change of upcomingChanges) {
      const daysUntil = Math.ceil(
        (change.effectiveDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntil === 30 || daysUntil === 14 || daysUntil === 7 || daysUntil === 1) {
        this.eventEmitter.emit('regulatory.upcoming', {
          change,
          daysUntil,
        });

        this.logger.log(`Regulatory change "${change.title}" effective in ${daysUntil} days`);
      }
    }
  }

  async searchChanges(query: string): Promise<RegulatoryChange[]> {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.changes.values())
      .filter(c =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.summary.toLowerCase().includes(lowerQuery) ||
        c.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
        c.referenceNumber?.toLowerCase().includes(lowerQuery)
      );
  }

  async getStatsByJurisdiction(): Promise<Record<string, {
    total: number;
    effective: number;
    upcoming: number;
    byCriticality: Record<string, number>;
  }>> {
    const changes = Array.from(this.changes.values());
    const now = new Date();

    const stats: Record<string, any> = {};

    for (const change of changes) {
      if (!stats[change.jurisdiction]) {
        stats[change.jurisdiction] = {
          total: 0,
          effective: 0,
          upcoming: 0,
          byCriticality: {},
        };
      }

      stats[change.jurisdiction].total++;

      if (change.effectiveDate <= now) {
        stats[change.jurisdiction].effective++;
      } else {
        stats[change.jurisdiction].upcoming++;
      }

      stats[change.jurisdiction].byCriticality[change.impactLevel] =
        (stats[change.jurisdiction].byCriticality[change.impactLevel] || 0) + 1;
    }

    return stats;
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Marketing Automation Service
 * Automate marketing workflows and customer journeys
 *
 * Features:
 * - Customer journeys
 * - Trigger-based automation
 * - Lead scoring
 * - Segmentation
 */

// =================== TYPES ===================

export interface MarketingAutomation {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions?: AutomationCondition[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  stats: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    conversionRate: number;
  };
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: TriggerType;
  config: Record<string, any>;
}

export type TriggerType =
  | 'signup'
  | 'subscription_created'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'form_submitted'
  | 'tag_added'
  | 'segment_entered'
  | 'date_based'
  | 'manual';

export interface AutomationAction {
  id: string;
  type: ActionType;
  config: Record<string, any>;
  delay?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
  };
  order: number;
}

export type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'add_tag'
  | 'remove_tag'
  | 'update_field'
  | 'add_to_segment'
  | 'remove_from_segment'
  | 'create_task'
  | 'send_notification'
  | 'webhook'
  | 'wait'
  | 'condition';

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_not_set';
  value: any;
}

export interface AutomationEnrollment {
  id: string;
  automationId: string;
  contactId: string;
  status: 'active' | 'completed' | 'exited' | 'failed';
  currentActionIndex: number;
  startedAt: Date;
  completedAt?: Date;
  exitReason?: string;
  actionsCompleted: string[];
}

export interface CustomerSegment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  ruleLogic: 'and' | 'or';
  memberCount: number;
  isStatic: boolean;
  staticMembers?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

export interface LeadScore {
  contactId: string;
  tenantId: string;
  totalScore: number;
  behaviorScore: number;
  demographicScore: number;
  engagementScore: number;
  scoreHistory: Array<{
    date: Date;
    score: number;
    reason: string;
  }>;
  lastCalculatedAt: Date;
}

export interface LeadScoringRule {
  id: string;
  tenantId: string;
  name: string;
  category: 'behavior' | 'demographic' | 'engagement';
  condition: {
    type: string;
    field?: string;
    operator?: string;
    value?: any;
  };
  points: number;
  isActive: boolean;
}

// =================== SERVICE ===================

@Injectable()
export class MarketingAutomationService {
  private readonly logger = new Logger(MarketingAutomationService.name);

  // Storage
  private automations = new Map<string, MarketingAutomation>();
  private enrollments = new Map<string, AutomationEnrollment>();
  private segments = new Map<string, CustomerSegment>();
  private leadScores = new Map<string, LeadScore>();
  private scoringRules = new Map<string, LeadScoringRule>();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultScoringRules();
  }

  private initializeDefaultScoringRules(): void {
    const defaultRules: Omit<LeadScoringRule, 'id' | 'tenantId'>[] = [
      // Behavior rules
      { name: 'Visited pricing page', category: 'behavior', condition: { type: 'page_view', field: 'url', operator: 'contains', value: '/pricing' }, points: 10, isActive: true },
      { name: 'Downloaded resource', category: 'behavior', condition: { type: 'download' }, points: 15, isActive: true },
      { name: 'Started trial', category: 'behavior', condition: { type: 'trial_started' }, points: 30, isActive: true },
      // Demographic rules
      { name: 'Company size > 50', category: 'demographic', condition: { type: 'field', field: 'companySize', operator: 'greater_than', value: 50 }, points: 20, isActive: true },
      { name: 'Decision maker role', category: 'demographic', condition: { type: 'field', field: 'role', operator: 'contains', value: 'director' }, points: 25, isActive: true },
      // Engagement rules
      { name: 'Opened email', category: 'engagement', condition: { type: 'email_opened' }, points: 5, isActive: true },
      { name: 'Clicked email link', category: 'engagement', condition: { type: 'email_clicked' }, points: 10, isActive: true },
      { name: 'Replied to email', category: 'engagement', condition: { type: 'email_replied' }, points: 20, isActive: true },
    ];

    defaultRules.forEach((rule, index) => {
      const id = `rule-default-${index}`;
      this.scoringRules.set(id, { ...rule, id, tenantId: 'default' });
    });

    this.logger.log(`Initialized ${this.scoringRules.size} default scoring rules`);
  }

  // =================== AUTOMATIONS ===================

  async createAutomation(params: {
    tenantId: string;
    name: string;
    description?: string;
    trigger: AutomationTrigger;
    actions: AutomationAction[];
    conditions?: AutomationCondition[];
    schedule?: MarketingAutomation['schedule'];
  }): Promise<MarketingAutomation> {
    const id = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const automation: MarketingAutomation = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      trigger: params.trigger,
      actions: params.actions.map((a, i) => ({ ...a, order: i })),
      conditions: params.conditions,
      status: 'draft',
      stats: {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        conversionRate: 0,
      },
      schedule: params.schedule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.automations.set(id, automation);
    this.eventEmitter.emit('automation.created', { automation });

    return automation;
  }

  async updateAutomation(
    id: string,
    updates: Partial<Pick<MarketingAutomation, 'name' | 'description' | 'trigger' | 'actions' | 'conditions' | 'schedule' | 'status'>>,
  ): Promise<MarketingAutomation | null> {
    const automation = this.automations.get(id);
    if (!automation) return null;

    Object.assign(automation, updates, { updatedAt: new Date() });
    this.automations.set(id, automation);

    return automation;
  }

  async activateAutomation(id: string): Promise<MarketingAutomation> {
    const automation = this.automations.get(id);
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    automation.status = 'active';
    automation.updatedAt = new Date();
    this.automations.set(id, automation);

    this.eventEmitter.emit('automation.activated', { automationId: id });

    return automation;
  }

  async pauseAutomation(id: string): Promise<MarketingAutomation> {
    const automation = this.automations.get(id);
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    automation.status = 'paused';
    automation.updatedAt = new Date();
    this.automations.set(id, automation);

    return automation;
  }

  async deleteAutomation(id: string): Promise<void> {
    this.automations.delete(id);
  }

  async getAutomations(tenantId: string): Promise<MarketingAutomation[]> {
    return Array.from(this.automations.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAutomation(id: string): Promise<MarketingAutomation | null> {
    return this.automations.get(id) || null;
  }

  // =================== ENROLLMENTS ===================

  async enrollContact(params: {
    automationId: string;
    contactId: string;
  }): Promise<AutomationEnrollment> {
    const automation = this.automations.get(params.automationId);
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const enrollment: AutomationEnrollment = {
      id: `enroll-${Date.now()}`,
      automationId: params.automationId,
      contactId: params.contactId,
      status: 'active',
      currentActionIndex: 0,
      startedAt: new Date(),
      actionsCompleted: [],
    };

    this.enrollments.set(enrollment.id, enrollment);

    automation.stats.totalEnrollments++;
    automation.stats.activeEnrollments++;
    this.automations.set(params.automationId, automation);

    this.eventEmitter.emit('automation.enrollment.started', { enrollment });

    // Process first action
    this.processEnrollment(enrollment);

    return enrollment;
  }

  private async processEnrollment(enrollment: AutomationEnrollment): Promise<void> {
    const automation = this.automations.get(enrollment.automationId);
    if (!automation || enrollment.status !== 'active') return;

    if (enrollment.currentActionIndex >= automation.actions.length) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      this.enrollments.set(enrollment.id, enrollment);

      automation.stats.activeEnrollments--;
      automation.stats.completedEnrollments++;
      this.automations.set(enrollment.automationId, automation);

      return;
    }

    const action = automation.actions[enrollment.currentActionIndex];

    // Simulate action execution
    this.logger.debug(`Executing action ${action.type} for enrollment ${enrollment.id}`);

    enrollment.actionsCompleted.push(action.id);
    enrollment.currentActionIndex++;
    this.enrollments.set(enrollment.id, enrollment);

    // Schedule next action if there's a delay
    if (action.delay) {
      const delayMs = this.calculateDelayMs(action.delay);
      setTimeout(() => this.processEnrollment(enrollment), Math.min(delayMs, 5000));
    } else {
      this.processEnrollment(enrollment);
    }
  }

  private calculateDelayMs(delay: { value: number; unit: string }): number {
    const multipliers: Record<string, number> = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
    };
    return delay.value * (multipliers[delay.unit] || 1000);
  }

  async getEnrollments(automationId: string): Promise<AutomationEnrollment[]> {
    return Array.from(this.enrollments.values())
      .filter(e => e.automationId === automationId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // =================== SEGMENTS ===================

  async createSegment(params: {
    tenantId: string;
    name: string;
    description?: string;
    rules: SegmentRule[];
    ruleLogic?: 'and' | 'or';
    isStatic?: boolean;
    staticMembers?: string[];
  }): Promise<CustomerSegment> {
    const id = `seg-${Date.now()}`;

    const segment: CustomerSegment = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      rules: params.rules,
      ruleLogic: params.ruleLogic || 'and',
      memberCount: params.staticMembers?.length || 0,
      isStatic: params.isStatic || false,
      staticMembers: params.staticMembers,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.segments.set(id, segment);
    return segment;
  }

  async updateSegment(
    id: string,
    updates: Partial<Pick<CustomerSegment, 'name' | 'description' | 'rules' | 'ruleLogic'>>,
  ): Promise<CustomerSegment | null> {
    const segment = this.segments.get(id);
    if (!segment) return null;

    Object.assign(segment, updates, { updatedAt: new Date() });
    this.segments.set(id, segment);

    return segment;
  }

  async deleteSegment(id: string): Promise<void> {
    this.segments.delete(id);
  }

  async getSegments(tenantId: string): Promise<CustomerSegment[]> {
    return Array.from(this.segments.values())
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async refreshSegmentMembers(id: string): Promise<{ memberCount: number }> {
    const segment = this.segments.get(id);
    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    // In production, would query contacts based on rules
    segment.memberCount = Math.floor(Math.random() * 1000) + 100;
    segment.updatedAt = new Date();
    this.segments.set(id, segment);

    return { memberCount: segment.memberCount };
  }

  // =================== LEAD SCORING ===================

  async calculateLeadScore(params: {
    tenantId: string;
    contactId: string;
    behaviors?: Array<{ type: string; field?: string; value?: any }>;
    demographics?: Record<string, any>;
  }): Promise<LeadScore> {
    let behaviorScore = 0;
    let demographicScore = 0;
    let engagementScore = 0;

    const rules = Array.from(this.scoringRules.values())
      .filter(r => r.tenantId === params.tenantId || r.tenantId === 'default');

    // Calculate behavior score
    if (params.behaviors) {
      for (const behavior of params.behaviors) {
        const matchingRule = rules.find(
          r => r.category === 'behavior' && r.condition.type === behavior.type,
        );
        if (matchingRule) {
          behaviorScore += matchingRule.points;
        }
      }
    }

    // Calculate demographic score
    if (params.demographics) {
      for (const rule of rules.filter(r => r.category === 'demographic')) {
        if (rule.condition.field && params.demographics[rule.condition.field]) {
          demographicScore += rule.points;
        }
      }
    }

    // Engagement score (simulated)
    engagementScore = Math.floor(Math.random() * 30) + 10;

    const totalScore = behaviorScore + demographicScore + engagementScore;

    const leadScore: LeadScore = {
      contactId: params.contactId,
      tenantId: params.tenantId,
      totalScore,
      behaviorScore,
      demographicScore,
      engagementScore,
      scoreHistory: [
        { date: new Date(), score: totalScore, reason: 'Calculated' },
      ],
      lastCalculatedAt: new Date(),
    };

    this.leadScores.set(params.contactId, leadScore);
    return leadScore;
  }

  async getLeadScore(contactId: string): Promise<LeadScore | null> {
    return this.leadScores.get(contactId) || null;
  }

  async getScoringRules(tenantId: string): Promise<LeadScoringRule[]> {
    return Array.from(this.scoringRules.values())
      .filter(r => r.tenantId === tenantId || r.tenantId === 'default');
  }

  async createScoringRule(params: Omit<LeadScoringRule, 'id'>): Promise<LeadScoringRule> {
    const id = `rule-${Date.now()}`;
    const rule: LeadScoringRule = { ...params, id };
    this.scoringRules.set(id, rule);
    return rule;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalAutomations: number;
    activeAutomations: number;
    totalEnrollments: number;
    activeEnrollments: number;
    totalSegments: number;
    avgLeadScore: number;
  }> {
    const automations = Array.from(this.automations.values()).filter(a => a.tenantId === tenantId);
    const segments = Array.from(this.segments.values()).filter(s => s.tenantId === tenantId);
    const scores = Array.from(this.leadScores.values()).filter(s => s.tenantId === tenantId);

    const totalEnrollments = automations.reduce((sum, a) => sum + a.stats.totalEnrollments, 0);
    const activeEnrollments = automations.reduce((sum, a) => sum + a.stats.activeEnrollments, 0);
    const avgLeadScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length
      : 0;

    return {
      totalAutomations: automations.length,
      activeAutomations: automations.filter(a => a.status === 'active').length,
      totalEnrollments,
      activeEnrollments,
      totalSegments: segments.length,
      avgLeadScore: Math.round(avgLeadScore),
    };
  }

  // =================== TEMPLATES ===================

  async getAutomationTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    trigger: AutomationTrigger;
    actions: AutomationAction[];
  }>> {
    return [
      {
        id: 'tpl-welcome',
        name: 'Welcome Series',
        description: 'Send a series of welcome emails to new signups',
        category: 'Onboarding',
        trigger: { type: 'signup', config: {} },
        actions: [
          { id: 'a1', type: 'send_email', config: { templateId: 'welcome-1' }, order: 0 },
          { id: 'a2', type: 'wait', config: {}, delay: { value: 2, unit: 'days' }, order: 1 },
          { id: 'a3', type: 'send_email', config: { templateId: 'welcome-2' }, order: 2 },
          { id: 'a4', type: 'wait', config: {}, delay: { value: 3, unit: 'days' }, order: 3 },
          { id: 'a5', type: 'send_email', config: { templateId: 'welcome-3' }, order: 4 },
        ],
      },
      {
        id: 'tpl-trial-nurture',
        name: 'Trial Nurture',
        description: 'Engage trial users and guide them to conversion',
        category: 'Sales',
        trigger: { type: 'subscription_created', config: { plan: 'trial' } },
        actions: [
          { id: 'a1', type: 'send_email', config: { templateId: 'trial-started' }, order: 0 },
          { id: 'a2', type: 'add_tag', config: { tag: 'trial-user' }, order: 1 },
          { id: 'a3', type: 'wait', config: {}, delay: { value: 3, unit: 'days' }, order: 2 },
          { id: 'a4', type: 'send_email', config: { templateId: 'trial-tips' }, order: 3 },
          { id: 'a5', type: 'wait', config: {}, delay: { value: 7, unit: 'days' }, order: 4 },
          { id: 'a6', type: 'send_email', config: { templateId: 'trial-ending' }, order: 5 },
        ],
      },
      {
        id: 'tpl-invoice-reminder',
        name: 'Invoice Reminder',
        description: 'Send reminders for overdue invoices',
        category: 'Finance',
        trigger: { type: 'invoice_overdue', config: {} },
        actions: [
          { id: 'a1', type: 'send_email', config: { templateId: 'invoice-reminder-1' }, order: 0 },
          { id: 'a2', type: 'wait', config: {}, delay: { value: 3, unit: 'days' }, order: 1 },
          { id: 'a3', type: 'send_email', config: { templateId: 'invoice-reminder-2' }, order: 2 },
          { id: 'a4', type: 'create_task', config: { assignTo: 'account-manager' }, order: 3 },
        ],
      },
    ];
  }
}

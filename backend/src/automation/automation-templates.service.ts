import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type TemplateCategory =
  | 'finance'
  | 'hr'
  | 'sales'
  | 'operations'
  | 'compliance'
  | 'notifications'
  | 'integrations'
  | 'custom';

export type TemplateComplexity = 'simple' | 'moderate' | 'complex';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'select';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
}

export interface TemplateStep {
  id: string;
  name: string;
  description?: string;
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'loop' | 'parallel';
  config: Record<string, any>;
  next?: string[];
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  complexity: TemplateComplexity;
  tags: string[];
  icon?: string;
  variables: TemplateVariable[];
  steps: TemplateStep[];
  estimatedTime?: string;
  usageCount: number;
  rating: number;
  ratingCount: number;
  isSystem: boolean;
  isPublic: boolean;
  tenantId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateInstance {
  id: string;
  templateId: string;
  tenantId: string;
  name: string;
  description?: string;
  variables: Record<string, any>;
  workflowId?: string;
  ruleId?: string;
  triggerId?: string;
  status: 'draft' | 'active' | 'paused' | 'error';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class AutomationTemplatesService {
  private templates: Map<string, AutomationTemplate> = new Map();
  private instances: Map<string, TemplateInstance> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSystemTemplates();
  }

  private initializeSystemTemplates(): void {
    const systemTemplates: Omit<AutomationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Finance Templates
      {
        name: 'Invoice Overdue Reminder',
        description: 'Send automated reminders for overdue invoices with escalation',
        category: 'finance',
        complexity: 'moderate',
        tags: ['invoice', 'reminder', 'accounts-receivable'],
        icon: 'receipt',
        variables: [
          {
            name: 'daysOverdue',
            type: 'number',
            label: 'Days Overdue',
            description: 'Trigger after invoice is overdue by this many days',
            required: true,
            defaultValue: 7,
            validation: { min: 1, max: 90 },
          },
          {
            name: 'reminderTemplate',
            type: 'select',
            label: 'Email Template',
            required: true,
            defaultValue: 'friendly',
            options: [
              { value: 'friendly', label: 'Friendly Reminder' },
              { value: 'formal', label: 'Formal Notice' },
              { value: 'urgent', label: 'Urgent Final Notice' },
            ],
          },
          {
            name: 'escalateAfter',
            type: 'number',
            label: 'Escalate After (days)',
            required: false,
            defaultValue: 14,
          },
          {
            name: 'notifyManager',
            type: 'boolean',
            label: 'Notify Manager on Escalation',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Invoice Overdue Trigger',
            type: 'trigger',
            config: {
              type: 'schedule',
              schedule: { frequency: 'daily', time: '09:00' },
              query: 'invoices.overdue',
            },
            next: ['check-days'],
          },
          {
            id: 'check-days',
            name: 'Check Days Overdue',
            type: 'condition',
            config: {
              field: 'daysOverdue',
              operator: 'gte',
              value: '{{daysOverdue}}',
            },
            next: ['send-reminder', 'check-escalation'],
          },
          {
            id: 'send-reminder',
            name: 'Send Reminder Email',
            type: 'action',
            config: {
              actionId: 'send_email',
              template: '{{reminderTemplate}}',
              to: '{{invoice.customer.email}}',
            },
            next: ['log'],
          },
          {
            id: 'check-escalation',
            name: 'Check Escalation',
            type: 'condition',
            config: {
              field: 'daysOverdue',
              operator: 'gte',
              value: '{{escalateAfter}}',
            },
            next: ['notify-manager'],
          },
          {
            id: 'notify-manager',
            name: 'Notify Manager',
            type: 'action',
            config: {
              actionId: 'send_notification',
              condition: '{{notifyManager}}',
            },
            next: ['log'],
          },
          {
            id: 'log',
            name: 'Log Action',
            type: 'action',
            config: { actionId: 'log' },
          },
        ],
        estimatedTime: '15 min',
        usageCount: 0,
        rating: 4.5,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },
      {
        name: 'Expense Approval Workflow',
        description: 'Multi-level expense approval based on amount thresholds',
        category: 'finance',
        complexity: 'complex',
        tags: ['expense', 'approval', 'workflow'],
        icon: 'wallet',
        variables: [
          {
            name: 'level1Threshold',
            type: 'number',
            label: 'Level 1 Threshold',
            description: 'Expenses below this amount auto-approve',
            required: true,
            defaultValue: 100,
          },
          {
            name: 'level2Threshold',
            type: 'number',
            label: 'Level 2 Threshold',
            description: 'Expenses above this require manager approval',
            required: true,
            defaultValue: 500,
          },
          {
            name: 'level3Threshold',
            type: 'number',
            label: 'Level 3 Threshold',
            description: 'Expenses above this require director approval',
            required: true,
            defaultValue: 2000,
          },
          {
            name: 'autoRejectCategories',
            type: 'array',
            label: 'Auto-Reject Categories',
            required: false,
            defaultValue: [],
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Expense Submitted',
            type: 'trigger',
            config: { type: 'event', event: 'expense.submitted' },
            next: ['check-category'],
          },
          {
            id: 'check-category',
            name: 'Check Category',
            type: 'condition',
            config: {
              field: 'expense.category',
              operator: 'not_in',
              value: '{{autoRejectCategories}}',
            },
            next: ['check-level1', 'auto-reject'],
          },
          {
            id: 'check-level1',
            name: 'Check Level 1',
            type: 'condition',
            config: {
              field: 'expense.amount',
              operator: 'lt',
              value: '{{level1Threshold}}',
            },
            next: ['auto-approve', 'check-level2'],
          },
          {
            id: 'auto-approve',
            name: 'Auto Approve',
            type: 'action',
            config: { actionId: 'update_record', status: 'approved' },
          },
          {
            id: 'auto-reject',
            name: 'Auto Reject',
            type: 'action',
            config: { actionId: 'update_record', status: 'rejected' },
          },
          {
            id: 'check-level2',
            name: 'Check Level 2',
            type: 'condition',
            config: {
              field: 'expense.amount',
              operator: 'lt',
              value: '{{level2Threshold}}',
            },
            next: ['request-manager', 'check-level3'],
          },
          {
            id: 'request-manager',
            name: 'Request Manager Approval',
            type: 'action',
            config: { actionId: 'send_notification', to: 'manager' },
          },
          {
            id: 'check-level3',
            name: 'Check Level 3',
            type: 'condition',
            config: {
              field: 'expense.amount',
              operator: 'lt',
              value: '{{level3Threshold}}',
            },
            next: ['request-director', 'request-cfo'],
          },
          {
            id: 'request-director',
            name: 'Request Director Approval',
            type: 'action',
            config: { actionId: 'send_notification', to: 'director' },
          },
          {
            id: 'request-cfo',
            name: 'Request CFO Approval',
            type: 'action',
            config: { actionId: 'send_notification', to: 'cfo' },
          },
        ],
        estimatedTime: '30 min',
        usageCount: 0,
        rating: 4.7,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },

      // HR Templates
      {
        name: 'Employee Onboarding',
        description: 'Automated onboarding workflow for new employees',
        category: 'hr',
        complexity: 'complex',
        tags: ['onboarding', 'employee', 'welcome'],
        icon: 'user-plus',
        variables: [
          {
            name: 'welcomeEmailTemplate',
            type: 'string',
            label: 'Welcome Email Template ID',
            required: true,
            defaultValue: 'welcome-new-employee',
          },
          {
            name: 'itTicketPriority',
            type: 'select',
            label: 'IT Setup Ticket Priority',
            required: true,
            defaultValue: 'high',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ],
          },
          {
            name: 'daysBefore',
            type: 'number',
            label: 'Days Before Start Date',
            required: true,
            defaultValue: 5,
          },
          {
            name: 'sendSlackInvite',
            type: 'boolean',
            label: 'Send Slack Invite',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Employee Hired',
            type: 'trigger',
            config: { type: 'event', event: 'employee.hired' },
            next: ['parallel-setup'],
          },
          {
            id: 'parallel-setup',
            name: 'Parallel Setup Tasks',
            type: 'parallel',
            config: {},
            next: ['send-welcome', 'create-it-ticket', 'schedule-orientation', 'setup-accounts'],
          },
          {
            id: 'send-welcome',
            name: 'Send Welcome Email',
            type: 'action',
            config: {
              actionId: 'send_email',
              template: '{{welcomeEmailTemplate}}',
            },
          },
          {
            id: 'create-it-ticket',
            name: 'Create IT Setup Ticket',
            type: 'action',
            config: {
              actionId: 'create_record',
              entity: 'ticket',
              priority: '{{itTicketPriority}}',
            },
          },
          {
            id: 'schedule-orientation',
            name: 'Schedule Orientation',
            type: 'action',
            config: {
              actionId: 'create_record',
              entity: 'calendar_event',
            },
          },
          {
            id: 'setup-accounts',
            name: 'Setup System Accounts',
            type: 'action',
            config: {
              actionId: 'http_request',
              method: 'POST',
              url: '/api/users/provision',
            },
          },
          {
            id: 'delay-start',
            name: 'Wait for Start Date',
            type: 'delay',
            config: { until: 'employee.startDate' },
            next: ['first-day-tasks'],
          },
          {
            id: 'first-day-tasks',
            name: 'First Day Tasks',
            type: 'action',
            config: {
              actionId: 'send_notification',
              to: 'manager',
              message: 'New employee starting today',
            },
          },
        ],
        estimatedTime: '45 min',
        usageCount: 0,
        rating: 4.8,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },
      {
        name: 'Leave Request Approval',
        description: 'Automated leave request routing and approval',
        category: 'hr',
        complexity: 'moderate',
        tags: ['leave', 'approval', 'time-off'],
        icon: 'calendar',
        variables: [
          {
            name: 'autoApproveUpTo',
            type: 'number',
            label: 'Auto-Approve Up To (days)',
            required: true,
            defaultValue: 2,
          },
          {
            name: 'requireBackup',
            type: 'boolean',
            label: 'Require Backup Assignment',
            required: false,
            defaultValue: true,
          },
          {
            name: 'notifyTeam',
            type: 'boolean',
            label: 'Notify Team on Approval',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Leave Requested',
            type: 'trigger',
            config: { type: 'event', event: 'leave.requested' },
            next: ['check-balance'],
          },
          {
            id: 'check-balance',
            name: 'Check Leave Balance',
            type: 'condition',
            config: {
              field: 'employee.leaveBalance',
              operator: 'gte',
              value: '{{leave.days}}',
            },
            next: ['check-auto-approve', 'reject-insufficient'],
          },
          {
            id: 'reject-insufficient',
            name: 'Reject - Insufficient Balance',
            type: 'action',
            config: {
              actionId: 'update_record',
              status: 'rejected',
              reason: 'Insufficient leave balance',
            },
          },
          {
            id: 'check-auto-approve',
            name: 'Check Auto Approve',
            type: 'condition',
            config: {
              field: 'leave.days',
              operator: 'lte',
              value: '{{autoApproveUpTo}}',
            },
            next: ['auto-approve', 'request-manager'],
          },
          {
            id: 'auto-approve',
            name: 'Auto Approve',
            type: 'action',
            config: { actionId: 'update_record', status: 'approved' },
            next: ['notify-approved'],
          },
          {
            id: 'request-manager',
            name: 'Request Manager Approval',
            type: 'action',
            config: { actionId: 'send_notification', to: 'manager' },
          },
          {
            id: 'notify-approved',
            name: 'Send Approval Notification',
            type: 'action',
            config: {
              actionId: 'send_email',
              to: 'employee',
              template: 'leave-approved',
            },
          },
        ],
        estimatedTime: '20 min',
        usageCount: 0,
        rating: 4.6,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },

      // Sales Templates
      {
        name: 'Lead Scoring & Assignment',
        description: 'Automatically score and assign leads to sales reps',
        category: 'sales',
        complexity: 'moderate',
        tags: ['lead', 'scoring', 'assignment'],
        icon: 'target',
        variables: [
          {
            name: 'hotLeadThreshold',
            type: 'number',
            label: 'Hot Lead Score Threshold',
            required: true,
            defaultValue: 80,
          },
          {
            name: 'warmLeadThreshold',
            type: 'number',
            label: 'Warm Lead Score Threshold',
            required: true,
            defaultValue: 50,
          },
          {
            name: 'assignmentMethod',
            type: 'select',
            label: 'Assignment Method',
            required: true,
            defaultValue: 'round-robin',
            options: [
              { value: 'round-robin', label: 'Round Robin' },
              { value: 'load-balanced', label: 'Load Balanced' },
              { value: 'territory', label: 'By Territory' },
            ],
          },
          {
            name: 'notifyOnHot',
            type: 'boolean',
            label: 'Slack Alert for Hot Leads',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Lead Created',
            type: 'trigger',
            config: { type: 'event', event: 'lead.created' },
            next: ['calculate-score'],
          },
          {
            id: 'calculate-score',
            name: 'Calculate Lead Score',
            type: 'action',
            config: {
              actionId: 'evaluate_rule',
              ruleSetId: 'lead-scoring-rules',
            },
            next: ['classify-lead'],
          },
          {
            id: 'classify-lead',
            name: 'Classify Lead',
            type: 'condition',
            config: {
              field: 'lead.score',
              operator: 'gte',
              value: '{{hotLeadThreshold}}',
            },
            next: ['hot-lead-flow', 'check-warm'],
          },
          {
            id: 'hot-lead-flow',
            name: 'Hot Lead Flow',
            type: 'parallel',
            config: {},
            next: ['assign-lead', 'notify-slack', 'create-task'],
          },
          {
            id: 'check-warm',
            name: 'Check Warm',
            type: 'condition',
            config: {
              field: 'lead.score',
              operator: 'gte',
              value: '{{warmLeadThreshold}}',
            },
            next: ['assign-lead', 'nurture-campaign'],
          },
          {
            id: 'assign-lead',
            name: 'Assign Lead',
            type: 'action',
            config: {
              actionId: 'update_record',
              method: '{{assignmentMethod}}',
            },
          },
          {
            id: 'notify-slack',
            name: 'Notify Slack',
            type: 'action',
            config: {
              actionId: 'send_slack',
              channel: 'sales-alerts',
              condition: '{{notifyOnHot}}',
            },
          },
          {
            id: 'create-task',
            name: 'Create Follow-up Task',
            type: 'action',
            config: {
              actionId: 'create_record',
              entity: 'task',
              dueIn: '1 hour',
            },
          },
          {
            id: 'nurture-campaign',
            name: 'Add to Nurture Campaign',
            type: 'action',
            config: {
              actionId: 'http_request',
              method: 'POST',
              url: '/api/campaigns/nurture/add',
            },
          },
        ],
        estimatedTime: '25 min',
        usageCount: 0,
        rating: 4.4,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },
      {
        name: 'Deal Stage Automation',
        description: 'Automate actions when deals move through stages',
        category: 'sales',
        complexity: 'simple',
        tags: ['deal', 'pipeline', 'automation'],
        icon: 'trending-up',
        variables: [
          {
            name: 'sendProposalStage',
            type: 'string',
            label: 'Stage to Send Proposal',
            required: true,
            defaultValue: 'proposal',
          },
          {
            name: 'celebrateOnWin',
            type: 'boolean',
            label: 'Celebrate on Win',
            required: false,
            defaultValue: true,
          },
          {
            name: 'lostFeedbackSurvey',
            type: 'boolean',
            label: 'Send Lost Deal Survey',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Deal Stage Changed',
            type: 'trigger',
            config: { type: 'event', event: 'deal.stage.changed' },
            next: ['check-stage'],
          },
          {
            id: 'check-stage',
            name: 'Check New Stage',
            type: 'condition',
            config: {
              field: 'deal.stage',
              operator: 'equals',
              value: '{{sendProposalStage}}',
            },
            next: ['send-proposal', 'check-won'],
          },
          {
            id: 'send-proposal',
            name: 'Send Proposal',
            type: 'action',
            config: {
              actionId: 'send_email',
              template: 'proposal',
            },
          },
          {
            id: 'check-won',
            name: 'Check if Won',
            type: 'condition',
            config: {
              field: 'deal.stage',
              operator: 'equals',
              value: 'won',
            },
            next: ['celebrate', 'check-lost'],
          },
          {
            id: 'celebrate',
            name: 'Celebrate Win',
            type: 'action',
            config: {
              actionId: 'send_slack',
              channel: 'wins',
              condition: '{{celebrateOnWin}}',
            },
          },
          {
            id: 'check-lost',
            name: 'Check if Lost',
            type: 'condition',
            config: {
              field: 'deal.stage',
              operator: 'equals',
              value: 'lost',
            },
            next: ['send-survey'],
          },
          {
            id: 'send-survey',
            name: 'Send Feedback Survey',
            type: 'action',
            config: {
              actionId: 'send_email',
              template: 'lost-deal-survey',
              condition: '{{lostFeedbackSurvey}}',
            },
          },
        ],
        estimatedTime: '15 min',
        usageCount: 0,
        rating: 4.3,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },

      // Compliance Templates
      {
        name: 'ANAF SAF-T D406 Submission',
        description: 'Automated monthly SAF-T D406 declaration preparation and submission',
        category: 'compliance',
        complexity: 'complex',
        tags: ['anaf', 'saf-t', 'd406', 'romania', 'tax'],
        icon: 'file-text',
        variables: [
          {
            name: 'submissionDay',
            type: 'number',
            label: 'Day of Month to Submit',
            required: true,
            defaultValue: 25,
            validation: { min: 1, max: 28 },
          },
          {
            name: 'reminderDays',
            type: 'number',
            label: 'Reminder Days Before',
            required: true,
            defaultValue: 5,
          },
          {
            name: 'validateBeforeSubmit',
            type: 'boolean',
            label: 'Validate XML Before Submit',
            required: false,
            defaultValue: true,
          },
          {
            name: 'notifyAccountant',
            type: 'boolean',
            label: 'Notify Accountant',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Monthly Schedule',
            type: 'trigger',
            config: {
              type: 'schedule',
              schedule: { frequency: 'monthly', dayOfMonth: '{{submissionDay}}' },
            },
            next: ['generate-xml'],
          },
          {
            id: 'generate-xml',
            name: 'Generate SAF-T XML',
            type: 'action',
            config: {
              actionId: 'http_request',
              method: 'POST',
              url: '/api/saft/generate',
            },
            next: ['validate-xml'],
          },
          {
            id: 'validate-xml',
            name: 'Validate XML',
            type: 'condition',
            config: {
              condition: '{{validateBeforeSubmit}}',
              action: 'validate',
            },
            next: ['submit-anaf', 'fix-errors'],
          },
          {
            id: 'fix-errors',
            name: 'Handle Validation Errors',
            type: 'action',
            config: {
              actionId: 'send_notification',
              to: 'accountant',
              priority: 'high',
            },
          },
          {
            id: 'submit-anaf',
            name: 'Submit to ANAF SPV',
            type: 'action',
            config: {
              actionId: 'http_request',
              method: 'POST',
              url: '/api/anaf/spv/submit',
            },
            next: ['notify-success'],
          },
          {
            id: 'notify-success',
            name: 'Notify Success',
            type: 'action',
            config: {
              actionId: 'send_email',
              template: 'saft-submitted',
              condition: '{{notifyAccountant}}',
            },
          },
        ],
        estimatedTime: '30 min',
        usageCount: 0,
        rating: 4.9,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },
      {
        name: 'e-Factura B2B Automation',
        description: 'Automated e-Factura generation and submission for B2B invoices',
        category: 'compliance',
        complexity: 'moderate',
        tags: ['e-factura', 'invoice', 'anaf', 'romania', 'b2b'],
        icon: 'file-invoice',
        variables: [
          {
            name: 'autoSubmit',
            type: 'boolean',
            label: 'Auto-Submit to ANAF',
            required: true,
            defaultValue: true,
          },
          {
            name: 'retryOnFail',
            type: 'number',
            label: 'Retry Attempts on Failure',
            required: false,
            defaultValue: 3,
          },
          {
            name: 'notifyOnError',
            type: 'boolean',
            label: 'Notify on Error',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Invoice Finalized',
            type: 'trigger',
            config: { type: 'event', event: 'invoice.finalized' },
            next: ['check-b2b'],
          },
          {
            id: 'check-b2b',
            name: 'Check if B2B',
            type: 'condition',
            config: {
              field: 'invoice.customer.type',
              operator: 'equals',
              value: 'business',
            },
            next: ['generate-efactura', 'skip'],
          },
          {
            id: 'skip',
            name: 'Skip Non-B2B',
            type: 'action',
            config: { actionId: 'log', message: 'Skipping non-B2B invoice' },
          },
          {
            id: 'generate-efactura',
            name: 'Generate e-Factura XML',
            type: 'action',
            config: {
              actionId: 'http_request',
              method: 'POST',
              url: '/api/efactura/generate',
            },
            next: ['submit-efactura'],
          },
          {
            id: 'submit-efactura',
            name: 'Submit to ANAF',
            type: 'action',
            config: {
              actionId: 'http_request',
              method: 'POST',
              url: '/api/anaf/efactura/submit',
              retry: '{{retryOnFail}}',
              condition: '{{autoSubmit}}',
            },
            next: ['update-invoice'],
          },
          {
            id: 'update-invoice',
            name: 'Update Invoice Status',
            type: 'action',
            config: {
              actionId: 'update_record',
              entity: 'invoice',
              field: 'efacturaStatus',
            },
          },
        ],
        estimatedTime: '20 min',
        usageCount: 0,
        rating: 4.7,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },

      // Notifications Templates
      {
        name: 'Multi-Channel Alert',
        description: 'Send alerts through multiple channels based on severity',
        category: 'notifications',
        complexity: 'simple',
        tags: ['alert', 'notification', 'multi-channel'],
        icon: 'bell',
        variables: [
          {
            name: 'emailEnabled',
            type: 'boolean',
            label: 'Enable Email',
            required: false,
            defaultValue: true,
          },
          {
            name: 'slackEnabled',
            type: 'boolean',
            label: 'Enable Slack',
            required: false,
            defaultValue: true,
          },
          {
            name: 'smsEnabled',
            type: 'boolean',
            label: 'Enable SMS (Critical Only)',
            required: false,
            defaultValue: false,
          },
          {
            name: 'slackChannel',
            type: 'string',
            label: 'Slack Channel',
            required: false,
            defaultValue: 'alerts',
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Alert Triggered',
            type: 'trigger',
            config: { type: 'event', event: 'alert.triggered' },
            next: ['parallel-notify'],
          },
          {
            id: 'parallel-notify',
            name: 'Send Notifications',
            type: 'parallel',
            config: {},
            next: ['send-email', 'send-slack', 'check-critical'],
          },
          {
            id: 'send-email',
            name: 'Send Email',
            type: 'action',
            config: {
              actionId: 'send_email',
              condition: '{{emailEnabled}}',
            },
          },
          {
            id: 'send-slack',
            name: 'Send Slack',
            type: 'action',
            config: {
              actionId: 'send_slack',
              channel: '{{slackChannel}}',
              condition: '{{slackEnabled}}',
            },
          },
          {
            id: 'check-critical',
            name: 'Check if Critical',
            type: 'condition',
            config: {
              field: 'alert.severity',
              operator: 'equals',
              value: 'critical',
            },
            next: ['send-sms'],
          },
          {
            id: 'send-sms',
            name: 'Send SMS',
            type: 'action',
            config: {
              actionId: 'send_sms',
              condition: '{{smsEnabled}}',
            },
          },
        ],
        estimatedTime: '10 min',
        usageCount: 0,
        rating: 4.2,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },

      // Operations Templates
      {
        name: 'Inventory Low Stock Alert',
        description: 'Monitor inventory and alert when stock is low',
        category: 'operations',
        complexity: 'simple',
        tags: ['inventory', 'stock', 'alert'],
        icon: 'package',
        variables: [
          {
            name: 'checkFrequency',
            type: 'select',
            label: 'Check Frequency',
            required: true,
            defaultValue: 'daily',
            options: [
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ],
          },
          {
            name: 'autoReorder',
            type: 'boolean',
            label: 'Auto-Create Reorder',
            required: false,
            defaultValue: false,
          },
          {
            name: 'notifyPurchasing',
            type: 'boolean',
            label: 'Notify Purchasing Team',
            required: false,
            defaultValue: true,
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Scheduled Check',
            type: 'trigger',
            config: {
              type: 'schedule',
              schedule: { frequency: '{{checkFrequency}}' },
            },
            next: ['query-low-stock'],
          },
          {
            id: 'query-low-stock',
            name: 'Query Low Stock Items',
            type: 'action',
            config: {
              actionId: 'query_records',
              entity: 'inventory',
              filter: 'quantity <= reorderPoint',
            },
            next: ['loop-items'],
          },
          {
            id: 'loop-items',
            name: 'Process Each Item',
            type: 'loop',
            config: { collection: 'lowStockItems' },
            next: ['notify-item', 'create-reorder'],
          },
          {
            id: 'notify-item',
            name: 'Send Alert',
            type: 'action',
            config: {
              actionId: 'send_notification',
              condition: '{{notifyPurchasing}}',
            },
          },
          {
            id: 'create-reorder',
            name: 'Create Reorder',
            type: 'action',
            config: {
              actionId: 'create_record',
              entity: 'purchase_order',
              condition: '{{autoReorder}}',
            },
          },
        ],
        estimatedTime: '15 min',
        usageCount: 0,
        rating: 4.5,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },

      // Integration Templates
      {
        name: 'Webhook to Slack',
        description: 'Forward webhook events to Slack with formatting',
        category: 'integrations',
        complexity: 'simple',
        tags: ['webhook', 'slack', 'integration'],
        icon: 'link',
        variables: [
          {
            name: 'slackChannel',
            type: 'string',
            label: 'Slack Channel',
            required: true,
            defaultValue: 'integrations',
          },
          {
            name: 'messageFormat',
            type: 'select',
            label: 'Message Format',
            required: true,
            defaultValue: 'detailed',
            options: [
              { value: 'simple', label: 'Simple' },
              { value: 'detailed', label: 'Detailed' },
              { value: 'raw', label: 'Raw JSON' },
            ],
          },
        ],
        steps: [
          {
            id: 'trigger',
            name: 'Webhook Received',
            type: 'trigger',
            config: { type: 'webhook' },
            next: ['format-message'],
          },
          {
            id: 'format-message',
            name: 'Format Message',
            type: 'action',
            config: {
              actionId: 'transform_data',
              format: '{{messageFormat}}',
            },
            next: ['send-slack'],
          },
          {
            id: 'send-slack',
            name: 'Send to Slack',
            type: 'action',
            config: {
              actionId: 'send_slack',
              channel: '{{slackChannel}}',
            },
          },
        ],
        estimatedTime: '5 min',
        usageCount: 0,
        rating: 4.1,
        ratingCount: 0,
        isSystem: true,
        isPublic: true,
      },
    ];

    for (const template of systemTemplates) {
      const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== TEMPLATE CRUD ===================

  async getTemplates(
    tenantId: string,
    filters?: {
      category?: TemplateCategory;
      complexity?: TemplateComplexity;
      tag?: string;
      search?: string;
      includeSystem?: boolean;
    },
  ): Promise<AutomationTemplate[]> {
    let templates = Array.from(this.templates.values());

    templates = templates.filter(
      (t) => t.isSystem || t.isPublic || t.tenantId === tenantId,
    );

    if (filters?.category) {
      templates = templates.filter((t) => t.category === filters.category);
    }

    if (filters?.complexity) {
      templates = templates.filter((t) => t.complexity === filters.complexity);
    }

    if (filters?.tag) {
      templates = templates.filter((t) => t.tags.includes(filters.tag!));
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.tags.some((tag) => tag.toLowerCase().includes(search)),
      );
    }

    if (filters?.includeSystem === false) {
      templates = templates.filter((t) => !t.isSystem);
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  async getTemplate(id: string): Promise<AutomationTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    createdBy: string;
    name: string;
    description: string;
    category: TemplateCategory;
    complexity?: TemplateComplexity;
    tags?: string[];
    icon?: string;
    variables: TemplateVariable[];
    steps: TemplateStep[];
    estimatedTime?: string;
    isPublic?: boolean;
  }): Promise<AutomationTemplate> {
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: AutomationTemplate = {
      id,
      name: data.name,
      description: data.description,
      category: data.category,
      complexity: data.complexity || 'moderate',
      tags: data.tags || [],
      icon: data.icon,
      variables: data.variables,
      steps: data.steps,
      estimatedTime: data.estimatedTime,
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      isSystem: false,
      isPublic: data.isPublic || false,
      tenantId: data.tenantId,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    this.eventEmitter.emit('automation.template.created', { template });

    return template;
  }

  async updateTemplate(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      category: TemplateCategory;
      complexity: TemplateComplexity;
      tags: string[];
      icon: string;
      variables: TemplateVariable[];
      steps: TemplateStep[];
      estimatedTime: string;
      isPublic: boolean;
    }>,
  ): Promise<AutomationTemplate | null> {
    const template = this.templates.get(id);
    if (!template || template.isSystem) {
      return null;
    }

    const updated: AutomationTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(id, updated);

    this.eventEmitter.emit('automation.template.updated', { template: updated });

    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (template && !template.isSystem) {
      this.templates.delete(id);
      this.eventEmitter.emit('automation.template.deleted', { templateId: id });
    }
  }

  async duplicateTemplate(
    id: string,
    name: string,
    tenantId: string,
    createdBy: string,
  ): Promise<AutomationTemplate | null> {
    const original = this.templates.get(id);
    if (!original) {
      return null;
    }

    return this.createTemplate({
      tenantId,
      createdBy,
      name,
      description: original.description,
      category: original.category,
      complexity: original.complexity,
      tags: [...original.tags],
      icon: original.icon,
      variables: JSON.parse(JSON.stringify(original.variables)),
      steps: JSON.parse(JSON.stringify(original.steps)),
      estimatedTime: original.estimatedTime,
      isPublic: false,
    });
  }

  // =================== TEMPLATE INSTANCES ===================

  async createInstance(data: {
    templateId: string;
    tenantId: string;
    createdBy: string;
    name: string;
    description?: string;
    variables: Record<string, any>;
  }): Promise<TemplateInstance> {
    const template = this.templates.get(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && data.variables[variable.name] === undefined) {
        throw new Error(`Required variable '${variable.name}' is missing`);
      }
    }

    const id = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const instance: TemplateInstance = {
      id,
      templateId: data.templateId,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      variables: data.variables,
      status: 'draft',
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.instances.set(id, instance);

    // Update template usage count
    template.usageCount++;
    this.templates.set(template.id, template);

    this.eventEmitter.emit('automation.template.instance.created', { instance });

    return instance;
  }

  async getInstances(
    tenantId: string,
    filters?: {
      templateId?: string;
      status?: TemplateInstance['status'];
      search?: string;
    },
  ): Promise<TemplateInstance[]> {
    let instances = Array.from(this.instances.values()).filter(
      (i) => i.tenantId === tenantId,
    );

    if (filters?.templateId) {
      instances = instances.filter((i) => i.templateId === filters.templateId);
    }

    if (filters?.status) {
      instances = instances.filter((i) => i.status === filters.status);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      instances = instances.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          (i.description && i.description.toLowerCase().includes(search)),
      );
    }

    return instances.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getInstance(id: string): Promise<TemplateInstance | null> {
    return this.instances.get(id) || null;
  }

  async updateInstance(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      variables: Record<string, any>;
      status: TemplateInstance['status'];
      workflowId: string;
      ruleId: string;
      triggerId: string;
    }>,
  ): Promise<TemplateInstance | null> {
    const instance = this.instances.get(id);
    if (!instance) {
      return null;
    }

    const updated: TemplateInstance = {
      ...instance,
      ...updates,
      updatedAt: new Date(),
    };

    this.instances.set(id, updated);

    this.eventEmitter.emit('automation.template.instance.updated', {
      instance: updated,
    });

    return updated;
  }

  async deleteInstance(id: string): Promise<void> {
    this.instances.delete(id);
    this.eventEmitter.emit('automation.template.instance.deleted', {
      instanceId: id,
    });
  }

  async activateInstance(id: string): Promise<TemplateInstance | null> {
    return this.updateInstance(id, { status: 'active' });
  }

  async deactivateInstance(id: string): Promise<TemplateInstance | null> {
    return this.updateInstance(id, { status: 'paused' });
  }

  // =================== TEMPLATE PREVIEW ===================

  async previewTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): Promise<{
    steps: Array<{
      id: string;
      name: string;
      type: string;
      resolvedConfig: Record<string, any>;
    }>;
    warnings: string[];
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const warnings: string[] = [];

    // Check for missing variables
    for (const variable of template.variables) {
      if (variable.required && variables[variable.name] === undefined) {
        warnings.push(`Missing required variable: ${variable.name}`);
      }
    }

    // Resolve variable placeholders in steps
    const steps = template.steps.map((step) => {
      const resolvedConfig = this.resolveVariables(step.config, variables);
      return {
        id: step.id,
        name: step.name,
        type: step.type,
        resolvedConfig,
      };
    });

    return { steps, warnings };
  }

  private resolveVariables(
    config: Record<string, any>,
    variables: Record<string, any>,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        // Replace {{variable}} placeholders
        resolved[key] = value.replace(
          /\{\{(\w+)\}\}/g,
          (_, varName) => variables[varName] ?? `{{${varName}}}`,
        );
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveVariables(value, variables);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  // =================== RATINGS ===================

  async rateTemplate(
    templateId: string,
    rating: number,
  ): Promise<AutomationTemplate | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const newRatingCount = template.ratingCount + 1;
    const newRating =
      (template.rating * template.ratingCount + rating) / newRatingCount;

    const updated: AutomationTemplate = {
      ...template,
      rating: Math.round(newRating * 10) / 10,
      ratingCount: newRatingCount,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);

    return updated;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalTemplates: number;
    systemTemplates: number;
    customTemplates: number;
    totalInstances: number;
    activeInstances: number;
    byCategory: Record<string, number>;
    topTemplates: Array<{ id: string; name: string; usageCount: number }>;
  }> {
    const templates = await this.getTemplates(tenantId, { includeSystem: true });
    const instances = await this.getInstances(tenantId);

    const byCategory: Record<string, number> = {};
    for (const template of templates) {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
    }

    const topTemplates = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name, usageCount: t.usageCount }));

    return {
      totalTemplates: templates.length,
      systemTemplates: templates.filter((t) => t.isSystem).length,
      customTemplates: templates.filter((t) => !t.isSystem).length,
      totalInstances: instances.length,
      activeInstances: instances.filter((i) => i.status === 'active').length,
      byCategory,
      topTemplates,
    };
  }

  async getCategories(): Promise<
    Array<{
      id: TemplateCategory;
      name: string;
      description: string;
      count: number;
    }>
  > {
    const templates = Array.from(this.templates.values());

    const categories: Array<{
      id: TemplateCategory;
      name: string;
      description: string;
    }> = [
      { id: 'finance', name: 'Finance', description: 'Financial automation workflows' },
      { id: 'hr', name: 'HR', description: 'Human resources workflows' },
      { id: 'sales', name: 'Sales', description: 'Sales and CRM automation' },
      { id: 'operations', name: 'Operations', description: 'Operational workflows' },
      { id: 'compliance', name: 'Compliance', description: 'Regulatory compliance workflows' },
      { id: 'notifications', name: 'Notifications', description: 'Alert and notification workflows' },
      { id: 'integrations', name: 'Integrations', description: 'Third-party integrations' },
      { id: 'custom', name: 'Custom', description: 'Custom user-created templates' },
    ];

    return categories.map((cat) => ({
      ...cat,
      count: templates.filter((t) => t.category === cat.id).length,
    }));
  }
}

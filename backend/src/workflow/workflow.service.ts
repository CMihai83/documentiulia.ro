import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

export type TaskType = 'USER_TASK' | 'SERVICE_TASK' | 'DECISION' | 'PARALLEL' | 'TIMER' | 'NOTIFICATION' | 'APPROVAL';

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'RETURNED';

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  version: string;
  category: string;
  tasks: TaskDefinition[];
  transitions: Transition[];
  variables: VariableDefinition[];
  triggers?: WorkflowTrigger[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDefinition {
  id: string;
  name: string;
  nameRo: string;
  type: TaskType;
  assignee?: string;
  assigneeRole?: string;
  dueInDays?: number;
  form?: FormDefinition;
  serviceAction?: string;
  conditions?: Condition[];
  parallelTasks?: string[];
  timerDuration?: number;
  notificationTemplate?: string;
  approvalSettings?: ApprovalSettings;
}

export interface Transition {
  from: string;
  to: string;
  condition?: string;
  label?: string;
  labelRo?: string;
}

export interface VariableDefinition {
  name: string;
  nameRo: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
}

export interface WorkflowTrigger {
  type: 'EVENT' | 'SCHEDULE' | 'MANUAL';
  event?: string;
  schedule?: string;
}

export interface FormDefinition {
  fields: FormField[];
}

export interface FormField {
  name: string;
  nameRo: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'file' | 'textarea';
  required: boolean;
  options?: Array<{ value: string; label: string; labelRo: string }>;
  validation?: string;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'exists';
  value: any;
}

export interface ApprovalSettings {
  requiredApprovers: number;
  approverRoles: string[];
  escalationDays?: number;
  escalateTo?: string;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  status: WorkflowStatus;
  currentTaskId?: string;
  variables: Record<string, any>;
  history: WorkflowHistoryEntry[];
  tasks: TaskInstance[];
  startedBy: string;
  startedAt: Date;
  completedAt?: Date;
  dueAt?: Date;
  priority: number;
  metadata?: Record<string, any>;
}

export interface TaskInstance {
  id: string;
  definitionId: string;
  name: string;
  nameRo: string;
  type: TaskType;
  status: TaskStatus;
  assignee?: string;
  assigneeRole?: string;
  dueAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  approvals?: Approval[];
  comments?: TaskComment[];
}

export interface WorkflowHistoryEntry {
  timestamp: Date;
  taskId: string;
  taskName: string;
  action: string;
  actionRo: string;
  userId: string;
  details?: Record<string, any>;
}

export interface Approval {
  userId: string;
  userName: string;
  decision: ApprovalDecision;
  comment?: string;
  timestamp: Date;
}

export interface TaskComment {
  userId: string;
  userName: string;
  comment: string;
  timestamp: Date;
}

export interface WorkflowStats {
  totalInstances: number;
  byStatus: Record<WorkflowStatus, number>;
  byTemplate: Record<string, number>;
  averageCompletionTime: number;
  overdueCount: number;
}

@Injectable()
export class WorkflowService implements OnModuleInit {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    await this.initializeDefaultTemplates();
  }

  private async initializeDefaultTemplates(): Promise<void> {
    const templates: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Invoice Approval',
        nameRo: 'Aprobare Factură',
        description: 'Workflow for invoice review and approval',
        descriptionRo: 'Flux de lucru pentru revizuirea și aprobarea facturilor',
        version: '1.0',
        category: 'Finance',
        tasks: [
          {
            id: 'create',
            name: 'Create Invoice',
            nameRo: 'Creare Factură',
            type: 'USER_TASK',
            assigneeRole: 'accountant',
            form: {
              fields: [
                { name: 'customerName', nameRo: 'Nume Client', type: 'text', required: true },
                { name: 'amount', nameRo: 'Sumă', type: 'number', required: true },
                { name: 'dueDate', nameRo: 'Dată Scadentă', type: 'date', required: true },
              ],
            },
          },
          {
            id: 'review',
            name: 'Review Invoice',
            nameRo: 'Revizuire Factură',
            type: 'APPROVAL',
            assigneeRole: 'supervisor',
            approvalSettings: {
              requiredApprovers: 1,
              approverRoles: ['supervisor', 'manager'],
              escalationDays: 3,
            },
          },
          {
            id: 'approve_large',
            name: 'Manager Approval (Large Amount)',
            nameRo: 'Aprobare Manager (Sumă Mare)',
            type: 'APPROVAL',
            assigneeRole: 'manager',
            conditions: [{ field: 'amount', operator: 'gt', value: 10000 }],
            approvalSettings: {
              requiredApprovers: 1,
              approverRoles: ['manager', 'director'],
            },
          },
          {
            id: 'send_efactura',
            name: 'Send to e-Factura',
            nameRo: 'Trimite la e-Factura',
            type: 'SERVICE_TASK',
            serviceAction: 'efactura.submit',
          },
          {
            id: 'notify',
            name: 'Notify Customer',
            nameRo: 'Notificare Client',
            type: 'NOTIFICATION',
            notificationTemplate: 'invoice_sent',
          },
        ],
        transitions: [
          { from: 'create', to: 'review' },
          { from: 'review', to: 'approve_large', condition: 'amount > 10000', label: 'Large Amount', labelRo: 'Sumă Mare' },
          { from: 'review', to: 'send_efactura', condition: 'amount <= 10000', label: 'Standard', labelRo: 'Standard' },
          { from: 'approve_large', to: 'send_efactura' },
          { from: 'send_efactura', to: 'notify' },
        ],
        variables: [
          { name: 'customerName', nameRo: 'Nume Client', type: 'string', required: true },
          { name: 'amount', nameRo: 'Sumă', type: 'number', required: true },
          { name: 'currency', nameRo: 'Monedă', type: 'string', required: false, defaultValue: 'RON' },
          { name: 'dueDate', nameRo: 'Dată Scadentă', type: 'date', required: true },
        ],
        triggers: [{ type: 'MANUAL' }],
      },
      {
        name: 'ANAF Submission',
        nameRo: 'Depunere ANAF',
        description: 'Workflow for ANAF declaration submission (D406 SAF-T)',
        descriptionRo: 'Flux de lucru pentru depunerea declarațiilor ANAF (D406 SAF-T)',
        version: '1.0',
        category: 'Tax',
        tasks: [
          {
            id: 'prepare',
            name: 'Prepare Declaration',
            nameRo: 'Pregătire Declarație',
            type: 'SERVICE_TASK',
            serviceAction: 'anaf.prepare_declaration',
          },
          {
            id: 'validate',
            name: 'Validate Data',
            nameRo: 'Validare Date',
            type: 'SERVICE_TASK',
            serviceAction: 'anaf.validate',
          },
          {
            id: 'review_errors',
            name: 'Review Validation Errors',
            nameRo: 'Revizuire Erori Validare',
            type: 'USER_TASK',
            assigneeRole: 'accountant',
            conditions: [{ field: 'hasErrors', operator: 'eq', value: true }],
          },
          {
            id: 'approve',
            name: 'Approve Submission',
            nameRo: 'Aprobare Depunere',
            type: 'APPROVAL',
            assigneeRole: 'manager',
            approvalSettings: {
              requiredApprovers: 1,
              approverRoles: ['manager', 'director'],
            },
          },
          {
            id: 'submit',
            name: 'Submit to ANAF',
            nameRo: 'Depunere la ANAF',
            type: 'SERVICE_TASK',
            serviceAction: 'anaf.submit',
          },
          {
            id: 'notify_result',
            name: 'Notify Submission Result',
            nameRo: 'Notificare Rezultat Depunere',
            type: 'NOTIFICATION',
            notificationTemplate: 'anaf_submission_result',
          },
        ],
        transitions: [
          { from: 'prepare', to: 'validate' },
          { from: 'validate', to: 'review_errors', condition: 'hasErrors === true' },
          { from: 'validate', to: 'approve', condition: 'hasErrors === false' },
          { from: 'review_errors', to: 'validate' },
          { from: 'approve', to: 'submit' },
          { from: 'submit', to: 'notify_result' },
        ],
        variables: [
          { name: 'declarationType', nameRo: 'Tip Declarație', type: 'string', required: true },
          { name: 'period', nameRo: 'Perioadă', type: 'string', required: true },
          { name: 'hasErrors', nameRo: 'Are Erori', type: 'boolean', required: false, defaultValue: false },
        ],
        triggers: [
          { type: 'SCHEDULE', schedule: '0 9 1 * *' }, // Monthly on 1st at 9 AM
          { type: 'MANUAL' },
        ],
      },
      {
        name: 'Employee Onboarding',
        nameRo: 'Angajare Personal',
        description: 'Workflow for new employee onboarding process',
        descriptionRo: 'Flux de lucru pentru procesul de angajare personal nou',
        version: '1.0',
        category: 'HR',
        tasks: [
          {
            id: 'collect_docs',
            name: 'Collect Documents',
            nameRo: 'Colectare Documente',
            type: 'USER_TASK',
            assigneeRole: 'hr',
            dueInDays: 3,
            form: {
              fields: [
                { name: 'idDocument', nameRo: 'Act Identitate', type: 'file', required: true },
                { name: 'diploma', nameRo: 'Diplomă', type: 'file', required: false },
                { name: 'medicalCert', nameRo: 'Certificat Medical', type: 'file', required: true },
              ],
            },
          },
          {
            id: 'create_contract',
            name: 'Create Employment Contract',
            nameRo: 'Creare Contract Muncă',
            type: 'SERVICE_TASK',
            serviceAction: 'hr.create_contract',
          },
          {
            id: 'sign_contract',
            name: 'Sign Contract',
            nameRo: 'Semnare Contract',
            type: 'USER_TASK',
            assignee: '{{employeeId}}',
            dueInDays: 2,
          },
          {
            id: 'register_revisal',
            name: 'Register in REVISAL',
            nameRo: 'Înregistrare în REVISAL',
            type: 'SERVICE_TASK',
            serviceAction: 'hr.register_revisal',
          },
          {
            id: 'setup_accounts',
            name: 'Setup Accounts & Access',
            nameRo: 'Configurare Conturi și Acces',
            type: 'PARALLEL',
            parallelTasks: ['create_email', 'create_erp_account', 'create_badge'],
          },
          {
            id: 'create_email',
            name: 'Create Email Account',
            nameRo: 'Creare Cont Email',
            type: 'SERVICE_TASK',
            serviceAction: 'it.create_email',
          },
          {
            id: 'create_erp_account',
            name: 'Create ERP Account',
            nameRo: 'Creare Cont ERP',
            type: 'SERVICE_TASK',
            serviceAction: 'it.create_erp_account',
          },
          {
            id: 'create_badge',
            name: 'Create Access Badge',
            nameRo: 'Creare Legitimație Acces',
            type: 'USER_TASK',
            assigneeRole: 'security',
            dueInDays: 1,
          },
          {
            id: 'welcome',
            name: 'Send Welcome Email',
            nameRo: 'Trimite Email Bun Venit',
            type: 'NOTIFICATION',
            notificationTemplate: 'employee_welcome',
          },
        ],
        transitions: [
          { from: 'collect_docs', to: 'create_contract' },
          { from: 'create_contract', to: 'sign_contract' },
          { from: 'sign_contract', to: 'register_revisal' },
          { from: 'register_revisal', to: 'setup_accounts' },
          { from: 'setup_accounts', to: 'welcome' },
        ],
        variables: [
          { name: 'employeeName', nameRo: 'Nume Angajat', type: 'string', required: true },
          { name: 'employeeId', nameRo: 'ID Angajat', type: 'string', required: true },
          { name: 'position', nameRo: 'Funcție', type: 'string', required: true },
          { name: 'department', nameRo: 'Departament', type: 'string', required: true },
          { name: 'startDate', nameRo: 'Data Începere', type: 'date', required: true },
          { name: 'salary', nameRo: 'Salariu', type: 'number', required: true },
        ],
        triggers: [{ type: 'MANUAL' }],
      },
      {
        name: 'Payment Processing',
        nameRo: 'Procesare Plăți',
        description: 'Workflow for processing supplier payments',
        descriptionRo: 'Flux de lucru pentru procesarea plăților furnizori',
        version: '1.0',
        category: 'Finance',
        tasks: [
          {
            id: 'request',
            name: 'Payment Request',
            nameRo: 'Cerere Plată',
            type: 'USER_TASK',
            assigneeRole: 'accountant',
            form: {
              fields: [
                { name: 'supplier', nameRo: 'Furnizor', type: 'text', required: true },
                { name: 'invoiceNumber', nameRo: 'Număr Factură', type: 'text', required: true },
                { name: 'amount', nameRo: 'Sumă', type: 'number', required: true },
                { name: 'paymentMethod', nameRo: 'Metodă Plată', type: 'select', required: true, options: [
                  { value: 'bank_transfer', label: 'Bank Transfer', labelRo: 'Transfer Bancar' },
                  { value: 'cash', label: 'Cash', labelRo: 'Numerar' },
                ] },
              ],
            },
          },
          {
            id: 'verify',
            name: 'Verify Invoice',
            nameRo: 'Verificare Factură',
            type: 'USER_TASK',
            assigneeRole: 'accountant_senior',
          },
          {
            id: 'approve_payment',
            name: 'Approve Payment',
            nameRo: 'Aprobare Plată',
            type: 'APPROVAL',
            assigneeRole: 'finance_manager',
            approvalSettings: {
              requiredApprovers: 1,
              approverRoles: ['finance_manager', 'cfo'],
              escalationDays: 2,
            },
          },
          {
            id: 'execute',
            name: 'Execute Payment',
            nameRo: 'Executare Plată',
            type: 'SERVICE_TASK',
            serviceAction: 'payment.execute',
          },
          {
            id: 'record',
            name: 'Record in Accounting',
            nameRo: 'Înregistrare Contabilitate',
            type: 'SERVICE_TASK',
            serviceAction: 'accounting.record_payment',
          },
          {
            id: 'notify_supplier',
            name: 'Notify Supplier',
            nameRo: 'Notificare Furnizor',
            type: 'NOTIFICATION',
            notificationTemplate: 'payment_sent',
          },
        ],
        transitions: [
          { from: 'request', to: 'verify' },
          { from: 'verify', to: 'approve_payment' },
          { from: 'approve_payment', to: 'execute' },
          { from: 'execute', to: 'record' },
          { from: 'record', to: 'notify_supplier' },
        ],
        variables: [
          { name: 'supplier', nameRo: 'Furnizor', type: 'string', required: true },
          { name: 'invoiceNumber', nameRo: 'Număr Factură', type: 'string', required: true },
          { name: 'amount', nameRo: 'Sumă', type: 'number', required: true },
          { name: 'currency', nameRo: 'Monedă', type: 'string', required: false, defaultValue: 'RON' },
        ],
        triggers: [{ type: 'MANUAL' }, { type: 'EVENT', event: 'invoice.due' }],
      },
      {
        name: 'Document Review',
        nameRo: 'Revizuire Documente',
        description: 'Generic workflow for document review and approval',
        descriptionRo: 'Flux de lucru generic pentru revizuirea și aprobarea documentelor',
        version: '1.0',
        category: 'Documents',
        tasks: [
          {
            id: 'upload',
            name: 'Upload Document',
            nameRo: 'Încărcare Document',
            type: 'USER_TASK',
            form: {
              fields: [
                { name: 'title', nameRo: 'Titlu', type: 'text', required: true },
                { name: 'file', nameRo: 'Fișier', type: 'file', required: true },
                { name: 'description', nameRo: 'Descriere', type: 'textarea', required: false },
              ],
            },
          },
          {
            id: 'review',
            name: 'Review Document',
            nameRo: 'Revizuire Document',
            type: 'APPROVAL',
            approvalSettings: {
              requiredApprovers: 1,
              approverRoles: ['reviewer', 'manager'],
            },
          },
          {
            id: 'finalize',
            name: 'Finalize Document',
            nameRo: 'Finalizare Document',
            type: 'SERVICE_TASK',
            serviceAction: 'document.finalize',
          },
        ],
        transitions: [
          { from: 'upload', to: 'review' },
          { from: 'review', to: 'finalize' },
        ],
        variables: [
          { name: 'title', nameRo: 'Titlu', type: 'string', required: true },
          { name: 'documentType', nameRo: 'Tip Document', type: 'string', required: true },
        ],
        triggers: [{ type: 'MANUAL' }],
      },
    ];

    for (const template of templates) {
      const id = this.generateId();
      this.templates.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Template Management
  async createTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate> {
    const id = this.generateId();
    const newTemplate: WorkflowTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(id, newTemplate);

    this.eventEmitter.emit('workflow.template.created', { templateId: id });
    return newTemplate;
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | undefined> {
    return this.templates.get(id);
  }

  async getTemplateByName(name: string): Promise<WorkflowTemplate | undefined> {
    return Array.from(this.templates.values()).find((t) => t.name === name);
  }

  async listTemplates(category?: string): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values());
    if (category) {
      return templates.filter((t) => t.category === category);
    }
    return templates;
  }

  async updateTemplate(
    id: string,
    updates: Partial<Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<WorkflowTemplate | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;

    const updated: WorkflowTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };
    this.templates.set(id, updated);

    this.eventEmitter.emit('workflow.template.updated', { templateId: id });
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.eventEmitter.emit('workflow.template.deleted', { templateId: id });
    }
    return deleted;
  }

  // Workflow Instance Management
  async startWorkflow(
    templateId: string,
    variables: Record<string, any>,
    startedBy: string,
    priority: number = 0,
  ): Promise<WorkflowInstance> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required variables
    for (const varDef of template.variables) {
      if (varDef.required && variables[varDef.name] === undefined) {
        throw new Error(`Missing required variable: ${varDef.name}`);
      }
    }

    // Apply default values
    const processedVariables: Record<string, any> = {};
    for (const varDef of template.variables) {
      if (variables[varDef.name] !== undefined) {
        processedVariables[varDef.name] = variables[varDef.name];
      } else if (varDef.defaultValue !== undefined) {
        processedVariables[varDef.name] = varDef.defaultValue;
      }
    }

    const firstTask = template.tasks[0];
    const instance: WorkflowInstance = {
      id: this.generateId(),
      templateId,
      templateName: template.name,
      status: 'ACTIVE',
      currentTaskId: firstTask.id,
      variables: processedVariables,
      history: [],
      tasks: template.tasks.map((t) => ({
        id: this.generateId(),
        definitionId: t.id,
        name: t.name,
        nameRo: t.nameRo,
        type: t.type,
        status: t.id === firstTask.id ? 'IN_PROGRESS' : 'PENDING',
        assignee: this.resolveAssignee(t, processedVariables),
        assigneeRole: t.assigneeRole,
        dueAt: t.dueInDays ? new Date(Date.now() + t.dueInDays * 24 * 60 * 60 * 1000) : undefined,
        startedAt: t.id === firstTask.id ? new Date() : undefined,
        approvals: [],
        comments: [],
      })),
      startedBy,
      startedAt: new Date(),
      priority,
    };

    // Add start event to history
    instance.history.push({
      timestamp: new Date(),
      taskId: firstTask.id,
      taskName: firstTask.name,
      action: 'WORKFLOW_STARTED',
      actionRo: 'Flux de lucru pornit',
      userId: startedBy,
    });

    this.instances.set(instance.id, instance);
    this.eventEmitter.emit('workflow.started', {
      instanceId: instance.id,
      templateId,
      templateName: template.name,
    });

    return instance;
  }

  private resolveAssignee(task: TaskDefinition, variables: Record<string, any>): string | undefined {
    if (!task.assignee) return undefined;

    // Handle variable references like {{employeeId}}
    const match = task.assignee.match(/\{\{(\w+)\}\}/);
    if (match) {
      return variables[match[1]];
    }
    return task.assignee;
  }

  async getInstance(id: string): Promise<WorkflowInstance | undefined> {
    return this.instances.get(id);
  }

  async listInstances(
    filters?: { status?: WorkflowStatus; templateId?: string; assignee?: string },
  ): Promise<WorkflowInstance[]> {
    let instances = Array.from(this.instances.values());

    if (filters?.status) {
      instances = instances.filter((i) => i.status === filters.status);
    }
    if (filters?.templateId) {
      instances = instances.filter((i) => i.templateId === filters.templateId);
    }
    if (filters?.assignee) {
      instances = instances.filter((i) =>
        i.tasks.some((t) => t.assignee === filters.assignee && t.status === 'IN_PROGRESS'),
      );
    }

    return instances;
  }

  // Task Operations
  async completeTask(instanceId: string, taskId: string, result: any, userId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const task = instance.tasks.find((t) => t.definitionId === taskId || t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new Error(`Task is not in progress: ${task.status}`);
    }

    task.status = 'COMPLETED';
    task.result = result;
    task.completedAt = new Date();

    instance.history.push({
      timestamp: new Date(),
      taskId: task.definitionId,
      taskName: task.name,
      action: 'TASK_COMPLETED',
      actionRo: 'Sarcină finalizată',
      userId,
      details: result,
    });

    // Update variables with task result
    if (result && typeof result === 'object') {
      instance.variables = { ...instance.variables, ...result };
    }

    // Move to next task
    await this.advanceWorkflow(instance, task.definitionId);

    this.instances.set(instanceId, instance);
    this.eventEmitter.emit('workflow.task.completed', {
      instanceId,
      taskId: task.definitionId,
      taskName: task.name,
    });

    return instance;
  }

  async submitApproval(
    instanceId: string,
    taskId: string,
    decision: ApprovalDecision,
    userId: string,
    userName: string,
    comment?: string,
  ): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const task = instance.tasks.find((t) => t.definitionId === taskId || t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.type !== 'APPROVAL') {
      throw new Error(`Task is not an approval task: ${task.type}`);
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new Error(`Task is not in progress: ${task.status}`);
    }

    const approval: Approval = {
      userId,
      userName,
      decision,
      comment,
      timestamp: new Date(),
    };

    task.approvals = task.approvals || [];
    task.approvals.push(approval);

    // Get approval settings from template
    const template = this.templates.get(instance.templateId);
    const taskDef = template?.tasks.find((t) => t.id === task.definitionId);
    const requiredApprovers = taskDef?.approvalSettings?.requiredApprovers || 1;

    // Check if we have enough approvals
    const approvedCount = task.approvals.filter((a) => a.decision === 'APPROVED').length;
    const rejectedCount = task.approvals.filter((a) => a.decision === 'REJECTED').length;

    instance.history.push({
      timestamp: new Date(),
      taskId: task.definitionId,
      taskName: task.name,
      action: `APPROVAL_${decision}`,
      actionRo: decision === 'APPROVED' ? 'Aprobat' : decision === 'REJECTED' ? 'Respins' : 'Returnat',
      userId,
      details: { decision, comment },
    });

    if (approvedCount >= requiredApprovers) {
      task.status = 'COMPLETED';
      task.completedAt = new Date();
      task.result = { approved: true };
      await this.advanceWorkflow(instance, task.definitionId);
    } else if (rejectedCount > 0) {
      task.status = 'FAILED';
      task.completedAt = new Date();
      task.result = { approved: false, reason: comment };
      instance.status = 'FAILED';
    }

    this.instances.set(instanceId, instance);
    this.eventEmitter.emit('workflow.approval.submitted', {
      instanceId,
      taskId: task.definitionId,
      decision,
    });

    return instance;
  }

  async addTaskComment(
    instanceId: string,
    taskId: string,
    userId: string,
    userName: string,
    comment: string,
  ): Promise<TaskInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const task = instance.tasks.find((t) => t.definitionId === taskId || t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.comments = task.comments || [];
    task.comments.push({
      userId,
      userName,
      comment,
      timestamp: new Date(),
    });

    this.instances.set(instanceId, instance);
    return task;
  }

  async reassignTask(instanceId: string, taskId: string, newAssignee: string, userId: string): Promise<TaskInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const task = instance.tasks.find((t) => t.definitionId === taskId || t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const oldAssignee = task.assignee;
    task.assignee = newAssignee;

    instance.history.push({
      timestamp: new Date(),
      taskId: task.definitionId,
      taskName: task.name,
      action: 'TASK_REASSIGNED',
      actionRo: 'Sarcină reatribuită',
      userId,
      details: { from: oldAssignee, to: newAssignee },
    });

    this.instances.set(instanceId, instance);
    this.eventEmitter.emit('workflow.task.reassigned', {
      instanceId,
      taskId: task.definitionId,
      from: oldAssignee,
      to: newAssignee,
    });

    return task;
  }

  private async advanceWorkflow(instance: WorkflowInstance, completedTaskId: string): Promise<void> {
    const template = this.templates.get(instance.templateId);
    if (!template) return;

    // Find next task based on transitions
    const transitions = template.transitions.filter((t) => t.from === completedTaskId);

    if (transitions.length === 0) {
      // No more transitions - workflow complete
      instance.status = 'COMPLETED';
      instance.completedAt = new Date();
      instance.currentTaskId = undefined;

      instance.history.push({
        timestamp: new Date(),
        taskId: completedTaskId,
        taskName: 'END',
        action: 'WORKFLOW_COMPLETED',
        actionRo: 'Flux de lucru finalizat',
        userId: 'system',
      });

      this.eventEmitter.emit('workflow.completed', { instanceId: instance.id });
      return;
    }

    // Evaluate conditions to find next task
    let nextTaskId: string | undefined;
    for (const transition of transitions) {
      if (!transition.condition || this.evaluateCondition(transition.condition, instance.variables)) {
        nextTaskId = transition.to;
        break;
      }
    }

    if (nextTaskId) {
      instance.currentTaskId = nextTaskId;
      const nextTask = instance.tasks.find((t) => t.definitionId === nextTaskId);
      if (nextTask) {
        nextTask.status = 'IN_PROGRESS';
        nextTask.startedAt = new Date();

        instance.history.push({
          timestamp: new Date(),
          taskId: nextTaskId,
          taskName: nextTask.name,
          action: 'TASK_STARTED',
          actionRo: 'Sarcină începută',
          userId: 'system',
        });

        // Handle automatic tasks
        const taskDef = template.tasks.find((t) => t.id === nextTaskId);
        if (taskDef?.type === 'SERVICE_TASK' || taskDef?.type === 'NOTIFICATION') {
          // Auto-complete service tasks
          nextTask.status = 'COMPLETED';
          nextTask.completedAt = new Date();
          nextTask.result = { autoCompleted: true };

          instance.history.push({
            timestamp: new Date(),
            taskId: nextTaskId,
            taskName: nextTask.name,
            action: 'TASK_AUTO_COMPLETED',
            actionRo: 'Sarcină finalizată automat',
            userId: 'system',
          });

          await this.advanceWorkflow(instance, nextTaskId);
        }
      }
    }
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Simple condition evaluation
      const parts = condition.match(/(\w+)\s*(===|!==|>|<|>=|<=)\s*(.+)/);
      if (!parts) return true;

      const [, field, operator, rawValue] = parts;
      const fieldValue = variables[field];
      let compareValue: any = rawValue.trim();

      // Parse value type
      if (compareValue === 'true') compareValue = true;
      else if (compareValue === 'false') compareValue = false;
      else if (!isNaN(Number(compareValue))) compareValue = Number(compareValue);
      else if (compareValue.startsWith("'") || compareValue.startsWith('"')) {
        compareValue = compareValue.slice(1, -1);
      }

      switch (operator) {
        case '===':
          return fieldValue === compareValue;
        case '!==':
          return fieldValue !== compareValue;
        case '>':
          return fieldValue > compareValue;
        case '<':
          return fieldValue < compareValue;
        case '>=':
          return fieldValue >= compareValue;
        case '<=':
          return fieldValue <= compareValue;
        default:
          return true;
      }
    } catch {
      return true;
    }
  }

  // Workflow Control
  async pauseWorkflow(instanceId: string, userId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.status = 'PAUSED';
    instance.history.push({
      timestamp: new Date(),
      taskId: instance.currentTaskId || '',
      taskName: '',
      action: 'WORKFLOW_PAUSED',
      actionRo: 'Flux de lucru în pauză',
      userId,
    });

    this.instances.set(instanceId, instance);
    this.eventEmitter.emit('workflow.paused', { instanceId });
    return instance;
  }

  async resumeWorkflow(instanceId: string, userId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    if (instance.status !== 'PAUSED') {
      throw new Error(`Workflow is not paused: ${instance.status}`);
    }

    instance.status = 'ACTIVE';
    instance.history.push({
      timestamp: new Date(),
      taskId: instance.currentTaskId || '',
      taskName: '',
      action: 'WORKFLOW_RESUMED',
      actionRo: 'Flux de lucru reluat',
      userId,
    });

    this.instances.set(instanceId, instance);
    this.eventEmitter.emit('workflow.resumed', { instanceId });
    return instance;
  }

  async cancelWorkflow(instanceId: string, userId: string, reason?: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.status = 'CANCELLED';
    instance.completedAt = new Date();

    // Mark current task as cancelled
    const currentTask = instance.tasks.find((t) => t.status === 'IN_PROGRESS');
    if (currentTask) {
      currentTask.status = 'CANCELLED';
    }

    instance.history.push({
      timestamp: new Date(),
      taskId: instance.currentTaskId || '',
      taskName: '',
      action: 'WORKFLOW_CANCELLED',
      actionRo: 'Flux de lucru anulat',
      userId,
      details: { reason },
    });

    this.instances.set(instanceId, instance);
    this.eventEmitter.emit('workflow.cancelled', { instanceId, reason });
    return instance;
  }

  // Statistics
  getStats(): WorkflowStats {
    const instances = Array.from(this.instances.values());
    const byStatus: Record<WorkflowStatus, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      PAUSED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      FAILED: 0,
    };
    const byTemplate: Record<string, number> = {};
    const completionTimes: number[] = [];
    let overdueCount = 0;
    const now = new Date();

    for (const instance of instances) {
      byStatus[instance.status]++;
      byTemplate[instance.templateName] = (byTemplate[instance.templateName] || 0) + 1;

      if (instance.status === 'COMPLETED' && instance.completedAt) {
        completionTimes.push(instance.completedAt.getTime() - instance.startedAt.getTime());
      }

      if (instance.dueAt && instance.dueAt < now && instance.status === 'ACTIVE') {
        overdueCount++;
      }
    }

    return {
      totalInstances: instances.length,
      byStatus,
      byTemplate,
      averageCompletionTime:
        completionTimes.length > 0 ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0,
      overdueCount,
    };
  }

  // My Tasks
  async getMyTasks(userId: string, role?: string): Promise<Array<{ instance: WorkflowInstance; task: TaskInstance }>> {
    const myTasks: Array<{ instance: WorkflowInstance; task: TaskInstance }> = [];

    for (const instance of this.instances.values()) {
      if (instance.status !== 'ACTIVE') continue;

      for (const task of instance.tasks) {
        if (task.status !== 'IN_PROGRESS') continue;

        if (task.assignee === userId || (role && task.assigneeRole === role)) {
          myTasks.push({ instance, task });
        }
      }
    }

    return myTasks.sort((a, b) => {
      // Sort by priority (higher first), then by due date (earlier first)
      if (a.instance.priority !== b.instance.priority) {
        return b.instance.priority - a.instance.priority;
      }
      if (a.task.dueAt && b.task.dueAt) {
        return a.task.dueAt.getTime() - b.task.dueAt.getTime();
      }
      return 0;
    });
  }

  // Utility
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ActionCategory = 'communication' | 'data' | 'integration' | 'workflow' | 'system' | 'custom';
export type ActionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'retry';

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  icon?: string;
  inputSchema: ActionSchema;
  outputSchema: ActionSchema;
  configSchema?: ActionSchema;
  retryable: boolean;
  timeout?: number;
  rateLimit?: RateLimitConfig;
}

export interface ActionSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  format?: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface ActionInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  name: string;
  config: Record<string, any>;
  credentials?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionExecution {
  id: string;
  instanceId: string;
  definitionId: string;
  tenantId: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: ActionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  retryCount: number;
  error?: ActionError;
  logs: ActionLog[];
  context?: ExecutionContext;
}

export interface ActionError {
  code: string;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
}

export interface ActionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

export interface ExecutionContext {
  workflowId?: string;
  ruleId?: string;
  triggerId?: string;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  output?: Record<string, any>;
  error?: ActionError;
  logs: ActionLog[];
}

@Injectable()
export class ActionExecutorService {
  private definitions: Map<string, ActionDefinition> = new Map();
  private instances: Map<string, ActionInstance> = new Map();
  private executions: Map<string, ActionExecution> = new Map();
  private rateLimits: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.registerBuiltInActions();
  }

  private registerBuiltInActions() {
    const builtInActions: ActionDefinition[] = [
      // Communication Actions
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email to one or more recipients',
        category: 'communication',
        icon: 'mail',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'array', items: { type: 'string', format: 'email' }, title: 'Recipients' },
            cc: { type: 'array', items: { type: 'string', format: 'email' }, title: 'CC' },
            bcc: { type: 'array', items: { type: 'string', format: 'email' }, title: 'BCC' },
            subject: { type: 'string', title: 'Subject' },
            body: { type: 'string', title: 'Body' },
            isHtml: { type: 'boolean', title: 'HTML Format', default: false },
            attachments: { type: 'array', items: { type: 'string' }, title: 'Attachments' },
          },
          required: ['to', 'subject', 'body'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            sentAt: { type: 'string', format: 'date-time' },
          },
        },
        retryable: true,
        timeout: 30000,
      },
      {
        id: 'send_sms',
        name: 'Send SMS',
        description: 'Send an SMS message',
        category: 'communication',
        icon: 'message-square',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', title: 'Phone Number' },
            message: { type: 'string', title: 'Message' },
          },
          required: ['to', 'message'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            status: { type: 'string' },
          },
        },
        retryable: true,
        timeout: 15000,
      },
      {
        id: 'send_slack',
        name: 'Send Slack Message',
        description: 'Post a message to a Slack channel',
        category: 'communication',
        icon: 'slack',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', title: 'Channel' },
            message: { type: 'string', title: 'Message' },
            blocks: { type: 'array', items: { type: 'object' }, title: 'Blocks' },
          },
          required: ['channel', 'message'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            ts: { type: 'string' },
            channel: { type: 'string' },
          },
        },
        retryable: true,
        timeout: 10000,
      },
      {
        id: 'send_notification',
        name: 'Send In-App Notification',
        description: 'Send a notification within the application',
        category: 'communication',
        icon: 'bell',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', title: 'User ID' },
            title: { type: 'string', title: 'Title' },
            message: { type: 'string', title: 'Message' },
            type: { type: 'string', enum: ['info', 'success', 'warning', 'error'], title: 'Type' },
            link: { type: 'string', title: 'Action Link' },
          },
          required: ['userId', 'title', 'message'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            notificationId: { type: 'string' },
          },
        },
        retryable: false,
        timeout: 5000,
      },

      // Data Actions
      {
        id: 'create_record',
        name: 'Create Record',
        description: 'Create a new record in a data table',
        category: 'data',
        icon: 'plus',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', title: 'Table Name' },
            data: { type: 'object', title: 'Record Data' },
          },
          required: ['table', 'data'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            record: { type: 'object' },
          },
        },
        retryable: false,
        timeout: 10000,
      },
      {
        id: 'update_record',
        name: 'Update Record',
        description: 'Update an existing record',
        category: 'data',
        icon: 'edit',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', title: 'Table Name' },
            id: { type: 'string', title: 'Record ID' },
            data: { type: 'object', title: 'Update Data' },
          },
          required: ['table', 'id', 'data'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            record: { type: 'object' },
          },
        },
        retryable: false,
        timeout: 10000,
      },
      {
        id: 'delete_record',
        name: 'Delete Record',
        description: 'Delete a record from a data table',
        category: 'data',
        icon: 'trash',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', title: 'Table Name' },
            id: { type: 'string', title: 'Record ID' },
          },
          required: ['table', 'id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            deleted: { type: 'boolean' },
          },
        },
        retryable: false,
        timeout: 10000,
      },
      {
        id: 'query_records',
        name: 'Query Records',
        description: 'Query records from a data table',
        category: 'data',
        icon: 'search',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', title: 'Table Name' },
            filters: { type: 'object', title: 'Filters' },
            sort: { type: 'object', title: 'Sort' },
            limit: { type: 'number', title: 'Limit' },
          },
          required: ['table'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            records: { type: 'array', items: { type: 'object' } },
            total: { type: 'number' },
          },
        },
        retryable: true,
        timeout: 30000,
      },

      // Integration Actions
      {
        id: 'http_request',
        name: 'HTTP Request',
        description: 'Make an HTTP request to an external API',
        category: 'integration',
        icon: 'globe',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri', title: 'URL' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], title: 'Method' },
            headers: { type: 'object', title: 'Headers' },
            body: { type: 'object', title: 'Body' },
            timeout: { type: 'number', title: 'Timeout (ms)' },
          },
          required: ['url', 'method'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            headers: { type: 'object' },
            body: { type: 'object' },
          },
        },
        retryable: true,
        timeout: 60000,
        rateLimit: { maxRequests: 100, windowMs: 60000 },
      },
      {
        id: 'webhook',
        name: 'Call Webhook',
        description: 'Send data to a webhook URL',
        category: 'integration',
        icon: 'zap',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri', title: 'Webhook URL' },
            payload: { type: 'object', title: 'Payload' },
            headers: { type: 'object', title: 'Headers' },
          },
          required: ['url', 'payload'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            response: { type: 'object' },
          },
        },
        retryable: true,
        timeout: 30000,
      },

      // Workflow Actions
      {
        id: 'start_workflow',
        name: 'Start Workflow',
        description: 'Trigger another workflow',
        category: 'workflow',
        icon: 'play',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', title: 'Workflow ID' },
            input: { type: 'object', title: 'Input Data' },
            waitForCompletion: { type: 'boolean', title: 'Wait for Completion', default: false },
          },
          required: ['workflowId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            executionId: { type: 'string' },
            status: { type: 'string' },
            output: { type: 'object' },
          },
        },
        retryable: false,
        timeout: 300000,
      },
      {
        id: 'evaluate_rule',
        name: 'Evaluate Rule',
        description: 'Evaluate a business rule',
        category: 'workflow',
        icon: 'check-circle',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: { type: 'string', title: 'Rule ID' },
            input: { type: 'object', title: 'Input Data' },
          },
          required: ['ruleId', 'input'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            matched: { type: 'boolean' },
            result: { type: 'object' },
          },
        },
        retryable: true,
        timeout: 10000,
      },

      // System Actions
      {
        id: 'log',
        name: 'Log Message',
        description: 'Write a log message',
        category: 'system',
        icon: 'file-text',
        inputSchema: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], title: 'Level' },
            message: { type: 'string', title: 'Message' },
            data: { type: 'object', title: 'Additional Data' },
          },
          required: ['level', 'message'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            logged: { type: 'boolean' },
          },
        },
        retryable: false,
        timeout: 1000,
      },
      {
        id: 'delay',
        name: 'Delay',
        description: 'Pause execution for a specified duration',
        category: 'system',
        icon: 'clock',
        inputSchema: {
          type: 'object',
          properties: {
            duration: { type: 'number', title: 'Duration (ms)' },
          },
          required: ['duration'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            delayed: { type: 'boolean' },
            actualDuration: { type: 'number' },
          },
        },
        retryable: false,
        timeout: 86400000,
      },
      {
        id: 'set_variable',
        name: 'Set Variable',
        description: 'Set a variable value in the execution context',
        category: 'system',
        icon: 'variable',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Variable Name' },
            value: { type: 'string', title: 'Value' },
            scope: { type: 'string', enum: ['execution', 'workflow', 'global'], title: 'Scope' },
          },
          required: ['name', 'value'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            set: { type: 'boolean' },
          },
        },
        retryable: false,
        timeout: 1000,
      },
      {
        id: 'transform_data',
        name: 'Transform Data',
        description: 'Transform data using JSONata or JavaScript',
        category: 'system',
        icon: 'shuffle',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'object', title: 'Input Data' },
            expression: { type: 'string', title: 'Transform Expression' },
            language: { type: 'string', enum: ['jsonata', 'javascript'], title: 'Language' },
          },
          required: ['input', 'expression'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'object' },
          },
        },
        retryable: false,
        timeout: 5000,
      },
    ];

    builtInActions.forEach(action => this.definitions.set(action.id, action));
  }

  // =================== DEFINITIONS ===================

  async getDefinitions(category?: ActionCategory): Promise<ActionDefinition[]> {
    let definitions = Array.from(this.definitions.values());

    if (category) {
      definitions = definitions.filter(d => d.category === category);
    }

    return definitions.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDefinition(id: string): Promise<ActionDefinition | undefined> {
    return this.definitions.get(id);
  }

  async registerCustomAction(definition: ActionDefinition): Promise<ActionDefinition> {
    this.definitions.set(definition.id, definition);
    this.eventEmitter.emit('action.registered', { definition });
    return definition;
  }

  // =================== INSTANCES ===================

  async createInstance(data: {
    tenantId: string;
    definitionId: string;
    name: string;
    config: Record<string, any>;
    credentials?: string;
    createdBy: string;
  }): Promise<ActionInstance> {
    const definition = this.definitions.get(data.definitionId);
    if (!definition) {
      throw new Error('Action definition not found');
    }

    const id = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const instance: ActionInstance = {
      id,
      tenantId: data.tenantId,
      definitionId: data.definitionId,
      name: data.name,
      config: data.config,
      credentials: data.credentials,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.instances.set(id, instance);
    return instance;
  }

  async getInstance(id: string): Promise<ActionInstance | undefined> {
    return this.instances.get(id);
  }

  async getInstances(tenantId: string, definitionId?: string): Promise<ActionInstance[]> {
    let instances = Array.from(this.instances.values()).filter(i => i.tenantId === tenantId);

    if (definitionId) {
      instances = instances.filter(i => i.definitionId === definitionId);
    }

    return instances;
  }

  async updateInstance(id: string, updates: Partial<{
    name: string;
    config: Record<string, any>;
    credentials: string;
    isActive: boolean;
  }>): Promise<ActionInstance | undefined> {
    const instance = this.instances.get(id);
    if (!instance) return undefined;

    Object.assign(instance, updates, { updatedAt: new Date() });
    return instance;
  }

  async deleteInstance(id: string): Promise<void> {
    this.instances.delete(id);
  }

  // =================== EXECUTION ===================

  async execute(data: {
    definitionId: string;
    instanceId?: string;
    tenantId: string;
    input: Record<string, any>;
    context?: ExecutionContext;
  }): Promise<ActionExecution> {
    const definition = this.definitions.get(data.definitionId);
    if (!definition) {
      throw new Error('Action definition not found');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: ActionExecution = {
      id: executionId,
      instanceId: data.instanceId || '',
      definitionId: data.definitionId,
      tenantId: data.tenantId,
      input: data.input,
      status: 'pending',
      startedAt: new Date(),
      retryCount: 0,
      logs: [],
      context: data.context,
    };

    this.executions.set(executionId, execution);

    // Check rate limits
    if (definition.rateLimit && !this.checkRateLimit(data.definitionId, definition.rateLimit)) {
      execution.status = 'failed';
      execution.error = {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
        recoverable: true,
      };
      execution.completedAt = new Date();
      execution.duration = 0;
      return execution;
    }

    // Execute action
    await this.runExecution(execution, definition);

    return execution;
  }

  private async runExecution(execution: ActionExecution, definition: ActionDefinition): Promise<void> {
    execution.status = 'running';
    this.addLog(execution, 'info', `Starting action: ${definition.name}`);

    try {
      // Set timeout
      const timeout = definition.timeout || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Action timeout')), timeout);
      });

      // Execute action
      const resultPromise = this.executeAction(definition.id, execution.input, execution);

      const result = await Promise.race([resultPromise, timeoutPromise]);

      execution.output = result.output;
      execution.status = result.success ? 'success' : 'failed';
      execution.logs.push(...result.logs);

      if (!result.success) {
        execution.error = result.error;
      }

      this.addLog(execution, 'info', `Action completed: ${execution.status}`);

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: error.message,
        recoverable: definition.retryable,
      };
      this.addLog(execution, 'error', `Action failed: ${error.message}`);
    }

    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

    this.eventEmitter.emit('action.executed', { execution, definition });
  }

  private async executeAction(
    actionId: string,
    input: Record<string, any>,
    execution: ActionExecution
  ): Promise<ActionResult> {
    const logs: ActionLog[] = [];

    switch (actionId) {
      case 'send_email':
        this.addLog(execution, 'info', `Sending email to: ${input.to?.join(', ')}`);
        return {
          success: true,
          output: { messageId: `msg_${Date.now()}`, sentAt: new Date().toISOString() },
          logs,
        };

      case 'send_sms':
        this.addLog(execution, 'info', `Sending SMS to: ${input.to}`);
        return {
          success: true,
          output: { messageId: `sms_${Date.now()}`, status: 'sent' },
          logs,
        };

      case 'send_slack':
        this.addLog(execution, 'info', `Posting to Slack channel: ${input.channel}`);
        return {
          success: true,
          output: { ts: Date.now().toString(), channel: input.channel },
          logs,
        };

      case 'send_notification':
        this.addLog(execution, 'info', `Sending notification to user: ${input.userId}`);
        this.eventEmitter.emit('notification.send', {
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type,
        });
        return {
          success: true,
          output: { notificationId: `notif_${Date.now()}` },
          logs,
        };

      case 'create_record':
        this.addLog(execution, 'info', `Creating record in table: ${input.table}`);
        return {
          success: true,
          output: { id: `rec_${Date.now()}`, record: input.data },
          logs,
        };

      case 'update_record':
        this.addLog(execution, 'info', `Updating record ${input.id} in table: ${input.table}`);
        return {
          success: true,
          output: { record: { id: input.id, ...input.data } },
          logs,
        };

      case 'delete_record':
        this.addLog(execution, 'info', `Deleting record ${input.id} from table: ${input.table}`);
        return {
          success: true,
          output: { deleted: true },
          logs,
        };

      case 'query_records':
        this.addLog(execution, 'info', `Querying records from table: ${input.table}`);
        return {
          success: true,
          output: { records: [], total: 0 },
          logs,
        };

      case 'http_request':
        this.addLog(execution, 'info', `Making ${input.method} request to: ${input.url}`);
        // In production, make actual HTTP request
        return {
          success: true,
          output: { status: 200, headers: {}, body: {} },
          logs,
        };

      case 'webhook':
        this.addLog(execution, 'info', `Calling webhook: ${input.url}`);
        return {
          success: true,
          output: { status: 200, response: {} },
          logs,
        };

      case 'start_workflow':
        this.addLog(execution, 'info', `Starting workflow: ${input.workflowId}`);
        this.eventEmitter.emit('workflow.start', {
          workflowId: input.workflowId,
          input: input.input,
        });
        return {
          success: true,
          output: { executionId: `wf_exec_${Date.now()}`, status: 'started' },
          logs,
        };

      case 'evaluate_rule':
        this.addLog(execution, 'info', `Evaluating rule: ${input.ruleId}`);
        this.eventEmitter.emit('rule.evaluate', {
          ruleId: input.ruleId,
          input: input.input,
        });
        return {
          success: true,
          output: { matched: true, result: {} },
          logs,
        };

      case 'log':
        this.addLog(execution, input.level, input.message);
        return {
          success: true,
          output: { logged: true },
          logs,
        };

      case 'delay':
        await new Promise(resolve => setTimeout(resolve, input.duration));
        return {
          success: true,
          output: { delayed: true, actualDuration: input.duration },
          logs,
        };

      case 'set_variable':
        this.addLog(execution, 'info', `Setting variable: ${input.name}`);
        return {
          success: true,
          output: { set: true },
          logs,
        };

      case 'transform_data':
        this.addLog(execution, 'info', 'Transforming data');
        // In production, use JSONata or safe JavaScript evaluation
        return {
          success: true,
          output: { result: input.input },
          logs,
        };

      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`,
            recoverable: false,
          },
          logs,
        };
    }
  }

  private addLog(execution: ActionExecution, level: ActionLog['level'], message: string, data?: Record<string, any>): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      data,
    });
  }

  private checkRateLimit(actionId: string, config: RateLimitConfig): boolean {
    const key = actionId;
    const now = new Date();
    let limit = this.rateLimits.get(key);

    if (!limit || limit.resetAt < now) {
      limit = { count: 0, resetAt: new Date(now.getTime() + config.windowMs) };
    }

    if (limit.count >= config.maxRequests) {
      return false;
    }

    limit.count++;
    this.rateLimits.set(key, limit);
    return true;
  }

  async retryExecution(executionId: string): Promise<ActionExecution | undefined> {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;

    if (execution.status !== 'failed') {
      throw new Error('Only failed executions can be retried');
    }

    const definition = this.definitions.get(execution.definitionId);
    if (!definition || !definition.retryable) {
      throw new Error('Action is not retryable');
    }

    execution.retryCount++;
    execution.status = 'retry';
    execution.startedAt = new Date();
    execution.completedAt = undefined;
    execution.error = undefined;
    execution.output = undefined;

    await this.runExecution(execution, definition);

    return execution;
  }

  async getExecution(id: string): Promise<ActionExecution | undefined> {
    return this.executions.get(id);
  }

  async getExecutions(tenantId: string, options?: {
    definitionId?: string;
    instanceId?: string;
    status?: ActionStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ActionExecution[]> {
    let executions = Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);

    if (options?.definitionId) {
      executions = executions.filter(e => e.definitionId === options.definitionId);
    }
    if (options?.instanceId) {
      executions = executions.filter(e => e.instanceId === options.instanceId);
    }
    if (options?.status) {
      executions = executions.filter(e => e.status === options.status);
    }
    if (options?.startDate) {
      executions = executions.filter(e => e.startedAt >= options.startDate!);
    }
    if (options?.endDate) {
      executions = executions.filter(e => e.startedAt <= options.endDate!);
    }

    executions = executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (options?.limit) {
      executions = executions.slice(0, options.limit);
    }

    return executions;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalExecutions: number;
    byStatus: Record<string, number>;
    byAction: Record<string, number>;
    avgDuration: number;
    successRate: number;
    recentExecutions: ActionExecution[];
  }> {
    const executions = Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);

    const byStatus: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    executions.forEach(e => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      byAction[e.definitionId] = (byAction[e.definitionId] || 0) + 1;
    });

    const completedExecutions = executions.filter(e => e.duration !== undefined);
    const avgDuration = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    const successCount = executions.filter(e => e.status === 'success').length;
    const successRate = executions.length > 0 ? (successCount / executions.length) * 100 : 100;

    return {
      totalExecutions: executions.length,
      byStatus,
      byAction,
      avgDuration,
      successRate,
      recentExecutions: executions
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 10),
    };
  }
}

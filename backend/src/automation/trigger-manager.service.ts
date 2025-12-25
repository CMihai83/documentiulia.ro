import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export type TriggerType = 'event' | 'schedule' | 'webhook' | 'manual' | 'api' | 'email' | 'file' | 'database';
export type TriggerStatus = 'active' | 'inactive' | 'paused' | 'error';

export interface Trigger {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TriggerType;
  config: TriggerConfig;
  filters?: TriggerFilter[];
  transformations?: DataTransformation[];
  targets: TriggerTarget[];
  status: TriggerStatus;
  errorMessage?: string;
  metadata: TriggerMetadata;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TriggerConfig = EventTriggerConfig | ScheduleTriggerConfig | WebhookTriggerConfig |
  ManualTriggerConfig | ApiTriggerConfig | EmailTriggerConfig | FileTriggerConfig | DatabaseTriggerConfig;

export interface EventTriggerConfig {
  type: 'event';
  eventName: string;
  eventSource?: string;
  debounceMs?: number;
  throttleMs?: number;
}

export interface ScheduleTriggerConfig {
  type: 'schedule';
  scheduleType: 'cron' | 'interval' | 'once';
  cron?: string;
  interval?: number;
  intervalUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  runAt?: Date;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WebhookTriggerConfig {
  type: 'webhook';
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: {
    type: 'none' | 'api_key' | 'basic' | 'bearer' | 'hmac';
    config: Record<string, any>;
  };
  headers?: Record<string, string>;
  responseConfig?: {
    successStatus: number;
    successBody?: any;
    errorStatus: number;
    errorBody?: any;
  };
}

export interface ManualTriggerConfig {
  type: 'manual';
  requireConfirmation?: boolean;
  inputSchema?: Record<string, any>;
  allowedUsers?: string[];
  allowedRoles?: string[];
}

export interface ApiTriggerConfig {
  type: 'api';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  pollingInterval?: number;
  authentication?: Record<string, any>;
}

export interface EmailTriggerConfig {
  type: 'email';
  mailbox: string;
  folder?: string;
  filters?: {
    from?: string;
    subject?: string;
    hasAttachment?: boolean;
  };
  pollingInterval?: number;
}

export interface FileTriggerConfig {
  type: 'file';
  path: string;
  events: ('created' | 'modified' | 'deleted')[];
  pattern?: string;
  recursive?: boolean;
}

export interface DatabaseTriggerConfig {
  type: 'database';
  table: string;
  events: ('insert' | 'update' | 'delete')[];
  columns?: string[];
  conditions?: Record<string, any>;
}

export interface TriggerFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'matches';
  value: any;
}

export interface DataTransformation {
  type: 'map' | 'filter' | 'reduce' | 'flatten' | 'pick' | 'omit' | 'rename' | 'default' | 'custom';
  config: Record<string, any>;
}

export interface TriggerTarget {
  id: string;
  type: 'workflow' | 'rule' | 'webhook' | 'function';
  targetId: string;
  enabled: boolean;
  inputMapping?: Record<string, string>;
  condition?: string;
}

export interface TriggerMetadata {
  lastFiredAt?: Date;
  fireCount: number;
  successCount: number;
  errorCount: number;
  avgProcessingTime: number;
}

export interface TriggerExecution {
  id: string;
  triggerId: string;
  tenantId: string;
  timestamp: Date;
  source: string;
  inputData: Record<string, any>;
  transformedData?: Record<string, any>;
  targets: TargetExecution[];
  status: 'success' | 'partial' | 'failed';
  duration: number;
  error?: string;
}

export interface TargetExecution {
  targetId: string;
  targetType: string;
  status: 'success' | 'failed' | 'skipped';
  executionId?: string;
  error?: string;
  duration: number;
}

export interface WebhookRegistration {
  id: string;
  triggerId: string;
  tenantId: string;
  path: string;
  fullUrl: string;
  secret?: string;
  createdAt: Date;
}

@Injectable()
export class TriggerManagerService {
  private triggers: Map<string, Trigger> = new Map();
  private executions: Map<string, TriggerExecution> = new Map();
  private webhooks: Map<string, WebhookRegistration> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private eventSubscriptions: Map<string, string[]> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for all events and check triggers
    this.eventEmitter.on('**', async (data: any, eventName: string) => {
      if (eventName.startsWith('trigger.')) return;
      await this.handleEvent(eventName, data);
    });
  }

  // =================== TRIGGERS ===================

  async createTrigger(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: TriggerType;
    config: TriggerConfig;
    filters?: TriggerFilter[];
    transformations?: DataTransformation[];
    targets: Omit<TriggerTarget, 'id'>[];
    createdBy: string;
  }): Promise<Trigger> {
    const id = `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const trigger: Trigger = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      config: data.config,
      filters: data.filters,
      transformations: data.transformations,
      targets: data.targets.map((t, idx) => ({
        ...t,
        id: `target_${Date.now()}_${idx}`,
      })),
      status: 'inactive',
      metadata: {
        fireCount: 0,
        successCount: 0,
        errorCount: 0,
        avgProcessingTime: 0,
      },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.triggers.set(id, trigger);
    this.eventEmitter.emit('trigger.created', { trigger });
    return trigger;
  }

  async getTrigger(id: string): Promise<Trigger | undefined> {
    return this.triggers.get(id);
  }

  async getTriggers(tenantId: string, options?: {
    type?: TriggerType;
    status?: TriggerStatus;
    search?: string;
  }): Promise<Trigger[]> {
    let triggers = Array.from(this.triggers.values()).filter(t => t.tenantId === tenantId);

    if (options?.type) {
      triggers = triggers.filter(t => t.type === options.type);
    }
    if (options?.status) {
      triggers = triggers.filter(t => t.status === options.status);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      triggers = triggers.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      );
    }

    return triggers.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateTrigger(id: string, updates: Partial<{
    name: string;
    description: string;
    config: TriggerConfig;
    filters: TriggerFilter[];
    transformations: DataTransformation[];
    targets: TriggerTarget[];
  }>): Promise<Trigger | undefined> {
    const trigger = this.triggers.get(id);
    if (!trigger) return undefined;

    const wasActive = trigger.status === 'active';

    // Deactivate if config changed
    if (wasActive && updates.config) {
      await this.deactivateTrigger(id);
    }

    Object.assign(trigger, updates, { updatedAt: new Date() });

    // Reactivate if was active
    if (wasActive && updates.config) {
      await this.activateTrigger(id);
    }

    this.eventEmitter.emit('trigger.updated', { trigger });
    return trigger;
  }

  async deleteTrigger(id: string): Promise<void> {
    const trigger = this.triggers.get(id);
    if (trigger) {
      await this.deactivateTrigger(id);
      this.triggers.delete(id);
      this.eventEmitter.emit('trigger.deleted', { triggerId: id });
    }
  }

  async activateTrigger(id: string): Promise<Trigger | undefined> {
    const trigger = this.triggers.get(id);
    if (!trigger) return undefined;

    try {
      switch (trigger.type) {
        case 'event':
          this.registerEventTrigger(trigger);
          break;
        case 'schedule':
          this.registerScheduleTrigger(trigger);
          break;
        case 'webhook':
          await this.registerWebhookTrigger(trigger);
          break;
      }

      trigger.status = 'active';
      trigger.errorMessage = undefined;
      trigger.updatedAt = new Date();

      this.eventEmitter.emit('trigger.activated', { trigger });
      return trigger;
    } catch (error: any) {
      trigger.status = 'error';
      trigger.errorMessage = error.message;
      return trigger;
    }
  }

  async deactivateTrigger(id: string): Promise<Trigger | undefined> {
    const trigger = this.triggers.get(id);
    if (!trigger) return undefined;

    switch (trigger.type) {
      case 'event':
        this.unregisterEventTrigger(trigger);
        break;
      case 'schedule':
        this.unregisterScheduleTrigger(trigger);
        break;
      case 'webhook':
        this.unregisterWebhookTrigger(trigger);
        break;
    }

    trigger.status = 'inactive';
    trigger.updatedAt = new Date();

    this.eventEmitter.emit('trigger.deactivated', { trigger });
    return trigger;
  }

  // =================== EVENT TRIGGERS ===================

  private registerEventTrigger(trigger: Trigger): void {
    const config = trigger.config as EventTriggerConfig;
    const eventName = config.eventName;

    let subscriptions = this.eventSubscriptions.get(eventName) || [];
    if (!subscriptions.includes(trigger.id)) {
      subscriptions.push(trigger.id);
      this.eventSubscriptions.set(eventName, subscriptions);
    }
  }

  private unregisterEventTrigger(trigger: Trigger): void {
    const config = trigger.config as EventTriggerConfig;
    const eventName = config.eventName;

    let subscriptions = this.eventSubscriptions.get(eventName) || [];
    subscriptions = subscriptions.filter(id => id !== trigger.id);

    if (subscriptions.length === 0) {
      this.eventSubscriptions.delete(eventName);
    } else {
      this.eventSubscriptions.set(eventName, subscriptions);
    }
  }

  private async handleEvent(eventName: string, data: any): Promise<void> {
    const triggerIds = this.eventSubscriptions.get(eventName) || [];

    for (const triggerId of triggerIds) {
      const trigger = this.triggers.get(triggerId);
      if (trigger && trigger.status === 'active') {
        await this.fireTrigger(trigger, { event: eventName, data });
      }
    }
  }

  // =================== SCHEDULE TRIGGERS ===================

  private registerScheduleTrigger(trigger: Trigger): void {
    const config = trigger.config as ScheduleTriggerConfig;

    switch (config.scheduleType) {
      case 'interval':
        const intervalMs = this.calculateIntervalMs(config.interval || 1, config.intervalUnit || 'minutes');
        const intervalJob = setInterval(() => {
          this.fireTrigger(trigger, { scheduledAt: new Date() });
        }, intervalMs);
        this.scheduledJobs.set(trigger.id, intervalJob);
        break;

      case 'once':
        if (config.runAt) {
          const delay = new Date(config.runAt).getTime() - Date.now();
          if (delay > 0) {
            const onceJob = setTimeout(() => {
              this.fireTrigger(trigger, { scheduledAt: new Date() });
              trigger.status = 'inactive';
            }, delay);
            this.scheduledJobs.set(trigger.id, onceJob);
          }
        }
        break;
    }
  }

  private unregisterScheduleTrigger(trigger: Trigger): void {
    const job = this.scheduledJobs.get(trigger.id);
    if (job) {
      clearInterval(job);
      clearTimeout(job);
      this.scheduledJobs.delete(trigger.id);
    }
  }

  private calculateIntervalMs(value: number, unit: string): number {
    const multipliers: Record<string, number> = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
    };
    return value * (multipliers[unit] || 60000);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processCronTriggers(): Promise<void> {
    const now = new Date();

    for (const trigger of this.triggers.values()) {
      if (trigger.status !== 'active' || trigger.type !== 'schedule') continue;

      const config = trigger.config as ScheduleTriggerConfig;
      if (config.scheduleType !== 'cron' || !config.cron) continue;

      // Simple cron check (in production, use a proper cron library)
      if (this.shouldFireCron(config.cron, now)) {
        await this.fireTrigger(trigger, { scheduledAt: now });
      }
    }
  }

  private shouldFireCron(_cron: string, _now: Date): boolean {
    // Simplified cron matching - in production use a proper library
    return false;
  }

  // =================== WEBHOOK TRIGGERS ===================

  private async registerWebhookTrigger(trigger: Trigger): Promise<void> {
    const config = trigger.config as WebhookTriggerConfig;
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const registration: WebhookRegistration = {
      id: webhookId,
      triggerId: trigger.id,
      tenantId: trigger.tenantId,
      path: config.path,
      fullUrl: `/webhooks/${trigger.tenantId}${config.path}`,
      secret: config.authentication?.type === 'hmac'
        ? this.generateSecret()
        : undefined,
      createdAt: new Date(),
    };

    this.webhooks.set(webhookId, registration);
  }

  private unregisterWebhookTrigger(trigger: Trigger): void {
    for (const [id, webhook] of this.webhooks.entries()) {
      if (webhook.triggerId === trigger.id) {
        this.webhooks.delete(id);
      }
    }
  }

  private generateSecret(): string {
    return `whsec_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`;
  }

  async handleWebhook(tenantId: string, path: string, method: string, data: any): Promise<any> {
    const webhook = Array.from(this.webhooks.values()).find(
      w => w.tenantId === tenantId && w.path === path
    );

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const trigger = this.triggers.get(webhook.triggerId);
    if (!trigger || trigger.status !== 'active') {
      throw new Error('Trigger not active');
    }

    const config = trigger.config as WebhookTriggerConfig;
    if (config.method !== method) {
      throw new Error('Method not allowed');
    }

    await this.fireTrigger(trigger, data);

    return config.responseConfig?.successBody || { success: true };
  }

  async getWebhookUrl(triggerId: string): Promise<string | undefined> {
    const webhook = Array.from(this.webhooks.values()).find(w => w.triggerId === triggerId);
    return webhook?.fullUrl;
  }

  // =================== TRIGGER EXECUTION ===================

  async fireTrigger(trigger: Trigger, inputData: Record<string, any>): Promise<TriggerExecution> {
    const executionId = `texec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const execution: TriggerExecution = {
      id: executionId,
      triggerId: trigger.id,
      tenantId: trigger.tenantId,
      timestamp: new Date(),
      source: trigger.type,
      inputData,
      targets: [],
      status: 'success',
      duration: 0,
    };

    try {
      // Apply filters
      if (trigger.filters && !this.applyFilters(trigger.filters, inputData)) {
        execution.status = 'success';
        execution.duration = Date.now() - startTime;
        return execution;
      }

      // Apply transformations
      let transformedData = inputData;
      if (trigger.transformations) {
        transformedData = this.applyTransformations(trigger.transformations, inputData);
      }
      execution.transformedData = transformedData;

      // Execute targets
      let successCount = 0;
      let failCount = 0;

      for (const target of trigger.targets) {
        if (!target.enabled) continue;

        const targetExecution = await this.executeTarget(target, transformedData, trigger.tenantId);
        execution.targets.push(targetExecution);

        if (targetExecution.status === 'success') {
          successCount++;
        } else if (targetExecution.status === 'failed') {
          failCount++;
        }
      }

      // Determine overall status
      if (failCount > 0 && successCount > 0) {
        execution.status = 'partial';
      } else if (failCount > 0) {
        execution.status = 'failed';
      }

      // Update metadata
      trigger.metadata.fireCount++;
      trigger.metadata.lastFiredAt = new Date();
      if (execution.status === 'success') {
        trigger.metadata.successCount++;
      } else {
        trigger.metadata.errorCount++;
      }

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      trigger.metadata.errorCount++;
    }

    execution.duration = Date.now() - startTime;
    trigger.metadata.avgProcessingTime =
      (trigger.metadata.avgProcessingTime * (trigger.metadata.fireCount - 1) + execution.duration) /
      trigger.metadata.fireCount;

    this.executions.set(executionId, execution);
    this.eventEmitter.emit('trigger.fired', { trigger, execution });

    return execution;
  }

  private applyFilters(filters: TriggerFilter[], data: Record<string, any>): boolean {
    return filters.every(filter => {
      const value = this.getFieldValue(filter.field, data);

      switch (filter.operator) {
        case 'eq': return value === filter.value;
        case 'neq': return value !== filter.value;
        case 'gt': return value > filter.value;
        case 'gte': return value >= filter.value;
        case 'lt': return value < filter.value;
        case 'lte': return value <= filter.value;
        case 'contains': return String(value).includes(filter.value);
        case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
        case 'matches': return new RegExp(filter.value).test(String(value));
        default: return true;
      }
    });
  }

  private applyTransformations(transformations: DataTransformation[], data: Record<string, any>): Record<string, any> {
    let result = { ...data };

    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'pick':
          const pickKeys = transformation.config.keys || [];
          result = Object.fromEntries(
            Object.entries(result).filter(([k]) => pickKeys.includes(k))
          );
          break;

        case 'omit':
          const omitKeys = transformation.config.keys || [];
          result = Object.fromEntries(
            Object.entries(result).filter(([k]) => !omitKeys.includes(k))
          );
          break;

        case 'rename':
          const renames = transformation.config.mapping || {};
          for (const [oldKey, newKey] of Object.entries(renames)) {
            if (oldKey in result) {
              result[newKey as string] = result[oldKey];
              delete result[oldKey];
            }
          }
          break;

        case 'default':
          const defaults = transformation.config.defaults || {};
          for (const [key, defaultValue] of Object.entries(defaults)) {
            if (!(key in result) || result[key] === null || result[key] === undefined) {
              result[key] = defaultValue;
            }
          }
          break;
      }
    }

    return result;
  }

  private getFieldValue(path: string, obj: Record<string, any>): any {
    const parts = path.split('.');
    let value: any = obj;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  private async executeTarget(
    target: TriggerTarget,
    data: Record<string, any>,
    tenantId: string
  ): Promise<TargetExecution> {
    const startTime = Date.now();

    try {
      // Apply input mapping
      let mappedData = data;
      if (target.inputMapping) {
        mappedData = {};
        for (const [targetField, sourceField] of Object.entries(target.inputMapping)) {
          mappedData[targetField] = this.getFieldValue(sourceField, data);
        }
      }

      // Execute based on target type
      let executionId: string | undefined;

      switch (target.type) {
        case 'workflow':
          this.eventEmitter.emit('trigger.target.workflow', {
            workflowId: target.targetId,
            tenantId,
            data: mappedData,
          });
          executionId = `wf_exec_${Date.now()}`;
          break;

        case 'rule':
          this.eventEmitter.emit('trigger.target.rule', {
            ruleId: target.targetId,
            tenantId,
            data: mappedData,
          });
          executionId = `rule_exec_${Date.now()}`;
          break;

        case 'webhook':
          // In production, make HTTP request
          break;

        case 'function':
          // Execute custom function
          break;
      }

      return {
        targetId: target.id,
        targetType: target.type,
        status: 'success',
        executionId,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        targetId: target.id,
        targetType: target.type,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  async manualTrigger(triggerId: string, input: Record<string, any>, userId: string): Promise<TriggerExecution> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    if (trigger.type !== 'manual') {
      throw new Error('Trigger is not a manual trigger');
    }

    const config = trigger.config as ManualTriggerConfig;

    // Check permissions
    if (config.allowedUsers && !config.allowedUsers.includes(userId)) {
      throw new Error('User not allowed to fire this trigger');
    }

    return this.fireTrigger(trigger, { ...input, triggeredBy: userId });
  }

  // =================== EXECUTIONS ===================

  async getExecutions(triggerId: string, options?: {
    status?: TriggerExecution['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<TriggerExecution[]> {
    let executions = Array.from(this.executions.values())
      .filter(e => e.triggerId === triggerId);

    if (options?.status) {
      executions = executions.filter(e => e.status === options.status);
    }
    if (options?.startDate) {
      executions = executions.filter(e => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      executions = executions.filter(e => e.timestamp <= options.endDate!);
    }

    executions = executions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      executions = executions.slice(0, options.limit);
    }

    return executions;
  }

  async getExecution(id: string): Promise<TriggerExecution | undefined> {
    return this.executions.get(id);
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalTriggers: number;
    activeTriggers: number;
    byType: Record<string, number>;
    totalExecutions: number;
    successRate: number;
    avgProcessingTime: number;
    recentExecutions: TriggerExecution[];
  }> {
    const triggers = Array.from(this.triggers.values()).filter(t => t.tenantId === tenantId);
    const executions = Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);

    const byType: Record<string, number> = {};
    triggers.forEach(t => {
      byType[t.type] = (byType[t.type] || 0) + 1;
    });

    const successCount = executions.filter(e => e.status === 'success').length;
    const successRate = executions.length > 0 ? (successCount / executions.length) * 100 : 100;

    const avgProcessingTime = executions.length > 0
      ? executions.reduce((sum, e) => sum + e.duration, 0) / executions.length
      : 0;

    return {
      totalTriggers: triggers.length,
      activeTriggers: triggers.filter(t => t.status === 'active').length,
      byType,
      totalExecutions: executions.length,
      successRate,
      avgProcessingTime,
      recentExecutions: executions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10),
    };
  }
}

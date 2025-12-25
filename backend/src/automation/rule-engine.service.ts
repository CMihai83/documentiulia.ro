import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type RuleStatus = 'active' | 'inactive' | 'draft';
export type RulePriority = 'low' | 'medium' | 'high' | 'critical';
export type EvaluationResult = 'matched' | 'not_matched' | 'error' | 'skipped';

export interface Rule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  priority: RulePriority;
  status: RuleStatus;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  schedule?: RuleSchedule;
  limits?: RuleLimits;
  metadata: RuleMetadata;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleConditionGroup {
  operator: 'and' | 'or';
  conditions: (RuleCondition | RuleConditionGroup)[];
}

export interface RuleCondition {
  id: string;
  field: string;
  fieldType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  operator: RuleOperator;
  value: any;
  valueType?: 'static' | 'field' | 'expression';
  caseSensitive?: boolean;
  negate?: boolean;
}

export type RuleOperator =
  | 'equals' | 'notEquals'
  | 'greaterThan' | 'greaterThanOrEquals'
  | 'lessThan' | 'lessThanOrEquals'
  | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith'
  | 'in' | 'notIn'
  | 'between' | 'notBetween'
  | 'isNull' | 'isNotNull'
  | 'isEmpty' | 'isNotEmpty'
  | 'matches' | 'notMatches'
  | 'before' | 'after'
  | 'hasProperty' | 'hasNotProperty';

export interface RuleAction {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  order: number;
  condition?: RuleConditionGroup;
  onError?: 'continue' | 'stop' | 'retry';
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface RuleSchedule {
  type: 'always' | 'timeWindow' | 'cron' | 'dateRange';
  timezone?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  cron?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface RuleLimits {
  maxExecutionsPerDay?: number;
  maxExecutionsPerHour?: number;
  cooldownPeriod?: number;
  maxConcurrentExecutions?: number;
}

export interface RuleMetadata {
  version: number;
  executionCount: number;
  lastExecutedAt?: Date;
  lastMatchedAt?: Date;
  avgExecutionTime: number;
  successRate: number;
}

export interface RuleSet {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  rules: string[];
  executionMode: 'all' | 'first_match' | 'priority';
  stopOnFirstMatch?: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleEvaluation {
  id: string;
  ruleId: string;
  ruleSetId?: string;
  tenantId: string;
  input: Record<string, any>;
  result: EvaluationResult;
  matchedConditions?: string[];
  executedActions?: ActionExecution[];
  duration: number;
  error?: string;
  evaluatedAt: Date;
}

export interface ActionExecution {
  actionId: string;
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  duration: number;
}

export interface RuleContext {
  tenantId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  source?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class RuleEngineService {
  private rules: Map<string, Rule> = new Map();
  private ruleSets: Map<string, RuleSet> = new Map();
  private evaluations: Map<string, RuleEvaluation> = new Map();
  private executionCounts: Map<string, { daily: number; hourly: number; lastReset: Date }> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== RULES ===================

  async createRule(data: {
    tenantId: string;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    priority?: RulePriority;
    conditions: RuleConditionGroup;
    actions: Omit<RuleAction, 'id'>[];
    schedule?: RuleSchedule;
    limits?: RuleLimits;
    createdBy: string;
  }): Promise<Rule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rule: Rule = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      priority: data.priority || 'medium',
      status: 'draft',
      conditions: this.normalizeConditions(data.conditions),
      actions: data.actions.map((a, idx) => ({
        ...a,
        id: `action_${Date.now()}_${idx}`,
        order: a.order ?? idx,
      })),
      schedule: data.schedule,
      limits: data.limits,
      metadata: {
        version: 1,
        executionCount: 0,
        avgExecutionTime: 0,
        successRate: 100,
      },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(id, rule);
    this.eventEmitter.emit('rule.created', { rule });
    return rule;
  }

  private normalizeConditions(group: RuleConditionGroup): RuleConditionGroup {
    return {
      operator: group.operator,
      conditions: group.conditions.map(c => {
        if ('operator' in c && 'conditions' in c) {
          return this.normalizeConditions(c as RuleConditionGroup);
        }
        const condition = c as RuleCondition;
        return {
          ...condition,
          id: condition.id || `cond_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        };
      }),
    };
  }

  async getRule(id: string): Promise<Rule | undefined> {
    return this.rules.get(id);
  }

  async getRules(tenantId: string, options?: {
    status?: RuleStatus;
    category?: string;
    priority?: RulePriority;
    tag?: string;
    search?: string;
  }): Promise<Rule[]> {
    let rules = Array.from(this.rules.values()).filter(r => r.tenantId === tenantId);

    if (options?.status) {
      rules = rules.filter(r => r.status === options.status);
    }
    if (options?.category) {
      rules = rules.filter(r => r.category === options.category);
    }
    if (options?.priority) {
      rules = rules.filter(r => r.priority === options.priority);
    }
    if (options?.tag) {
      rules = rules.filter(r => r.tags?.includes(options.tag!));
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      rules = rules.filter(r =>
        r.name.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search)
      );
    }

    return rules.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async updateRule(id: string, updates: Partial<{
    name: string;
    description: string;
    category: string;
    tags: string[];
    priority: RulePriority;
    conditions: RuleConditionGroup;
    actions: RuleAction[];
    schedule: RuleSchedule;
    limits: RuleLimits;
  }>): Promise<Rule | undefined> {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    if (updates.conditions) {
      updates.conditions = this.normalizeConditions(updates.conditions);
    }

    Object.assign(rule, updates, { updatedAt: new Date() });
    rule.metadata.version++;

    this.eventEmitter.emit('rule.updated', { rule });
    return rule;
  }

  async deleteRule(id: string): Promise<void> {
    this.rules.delete(id);
    this.eventEmitter.emit('rule.deleted', { ruleId: id });
  }

  async activateRule(id: string): Promise<Rule | undefined> {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    rule.status = 'active';
    rule.updatedAt = new Date();

    this.eventEmitter.emit('rule.activated', { rule });
    return rule;
  }

  async deactivateRule(id: string): Promise<Rule | undefined> {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    rule.status = 'inactive';
    rule.updatedAt = new Date();

    this.eventEmitter.emit('rule.deactivated', { rule });
    return rule;
  }

  async duplicateRule(id: string, newName: string, userId: string): Promise<Rule | undefined> {
    const original = this.rules.get(id);
    if (!original) return undefined;

    return this.createRule({
      tenantId: original.tenantId,
      name: newName,
      description: original.description,
      category: original.category,
      tags: original.tags,
      priority: original.priority,
      conditions: JSON.parse(JSON.stringify(original.conditions)),
      actions: original.actions.map(a => ({ ...a })),
      schedule: original.schedule ? { ...original.schedule } : undefined,
      limits: original.limits ? { ...original.limits } : undefined,
      createdBy: userId,
    });
  }

  // =================== RULE SETS ===================

  async createRuleSet(data: {
    tenantId: string;
    name: string;
    description?: string;
    rules: string[];
    executionMode: RuleSet['executionMode'];
    stopOnFirstMatch?: boolean;
    createdBy: string;
  }): Promise<RuleSet> {
    const id = `ruleset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const ruleSet: RuleSet = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      rules: data.rules,
      executionMode: data.executionMode,
      stopOnFirstMatch: data.stopOnFirstMatch,
      isActive: false,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.ruleSets.set(id, ruleSet);
    return ruleSet;
  }

  async getRuleSet(id: string): Promise<RuleSet | undefined> {
    return this.ruleSets.get(id);
  }

  async getRuleSets(tenantId: string): Promise<RuleSet[]> {
    return Array.from(this.ruleSets.values())
      .filter(rs => rs.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateRuleSet(id: string, updates: Partial<{
    name: string;
    description: string;
    rules: string[];
    executionMode: RuleSet['executionMode'];
    stopOnFirstMatch: boolean;
    isActive: boolean;
  }>): Promise<RuleSet | undefined> {
    const ruleSet = this.ruleSets.get(id);
    if (!ruleSet) return undefined;

    Object.assign(ruleSet, updates, { updatedAt: new Date() });
    return ruleSet;
  }

  async deleteRuleSet(id: string): Promise<void> {
    this.ruleSets.delete(id);
  }

  // =================== EVALUATION ===================

  async evaluateRule(ruleId: string, input: Record<string, any>, context: RuleContext): Promise<RuleEvaluation> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const startTime = Date.now();
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const evaluation: RuleEvaluation = {
      id: evaluationId,
      ruleId,
      tenantId: context.tenantId,
      input,
      result: 'not_matched',
      matchedConditions: [],
      executedActions: [],
      duration: 0,
      evaluatedAt: new Date(),
    };

    try {
      // Check if rule is active
      if (rule.status !== 'active') {
        evaluation.result = 'skipped';
        evaluation.duration = Date.now() - startTime;
        return evaluation;
      }

      // Check schedule
      if (!this.isWithinSchedule(rule.schedule)) {
        evaluation.result = 'skipped';
        evaluation.duration = Date.now() - startTime;
        return evaluation;
      }

      // Check limits
      if (!this.checkLimits(rule)) {
        evaluation.result = 'skipped';
        evaluation.duration = Date.now() - startTime;
        return evaluation;
      }

      // Evaluate conditions
      const { matched, matchedConditions } = this.evaluateConditionGroup(rule.conditions, input);
      evaluation.matchedConditions = matchedConditions;

      if (matched) {
        evaluation.result = 'matched';

        // Execute actions
        const sortedActions = [...rule.actions].sort((a, b) => a.order - b.order);

        for (const action of sortedActions) {
          const actionExecution = await this.executeAction(action, input, context);
          evaluation.executedActions!.push(actionExecution);

          if (actionExecution.status === 'failed' && action.onError === 'stop') {
            break;
          }
        }

        // Update rule metadata
        rule.metadata.lastMatchedAt = new Date();
      }

      // Update execution counts
      this.incrementExecutionCount(ruleId);
      rule.metadata.executionCount++;
      rule.metadata.lastExecutedAt = new Date();

    } catch (error: any) {
      evaluation.result = 'error';
      evaluation.error = error.message;
    }

    evaluation.duration = Date.now() - startTime;

    // Update average execution time
    const totalExecutions = rule.metadata.executionCount;
    rule.metadata.avgExecutionTime =
      (rule.metadata.avgExecutionTime * (totalExecutions - 1) + evaluation.duration) / totalExecutions;

    this.evaluations.set(evaluationId, evaluation);
    this.eventEmitter.emit('rule.evaluated', { evaluation, rule });

    return evaluation;
  }

  async evaluateRuleSet(ruleSetId: string, input: Record<string, any>, context: RuleContext): Promise<RuleEvaluation[]> {
    const ruleSet = this.ruleSets.get(ruleSetId);
    if (!ruleSet) {
      throw new Error('Rule set not found');
    }

    if (!ruleSet.isActive) {
      return [];
    }

    const evaluations: RuleEvaluation[] = [];

    // Get rules in order based on execution mode
    let ruleIds = ruleSet.rules;
    if (ruleSet.executionMode === 'priority') {
      const rules = ruleIds.map(id => this.rules.get(id)).filter(Boolean) as Rule[];
      rules.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      ruleIds = rules.map(r => r.id);
    }

    for (const ruleId of ruleIds) {
      const evaluation = await this.evaluateRule(ruleId, input, context);
      evaluation.ruleSetId = ruleSetId;
      evaluations.push(evaluation);

      if (evaluation.result === 'matched' && ruleSet.stopOnFirstMatch) {
        break;
      }

      if (ruleSet.executionMode === 'first_match' && evaluation.result === 'matched') {
        break;
      }
    }

    return evaluations;
  }

  private evaluateConditionGroup(
    group: RuleConditionGroup,
    input: Record<string, any>
  ): { matched: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    const results: boolean[] = [];

    for (const condition of group.conditions) {
      if ('operator' in condition && 'conditions' in condition) {
        const nested = this.evaluateConditionGroup(condition as RuleConditionGroup, input);
        results.push(nested.matched);
        matchedConditions.push(...nested.matchedConditions);
      } else {
        const cond = condition as RuleCondition;
        const matched = this.evaluateCondition(cond, input);
        results.push(matched);
        if (matched) {
          matchedConditions.push(cond.id);
        }
      }
    }

    const matched = group.operator === 'and'
      ? results.every(r => r)
      : results.some(r => r);

    return { matched, matchedConditions: matched ? matchedConditions : [] };
  }

  private evaluateCondition(condition: RuleCondition, input: Record<string, any>): boolean {
    const fieldValue = this.getFieldValue(condition.field, input);
    let compareValue = condition.value;

    // Resolve compare value if it's a field reference
    if (condition.valueType === 'field') {
      compareValue = this.getFieldValue(compareValue, input);
    }

    let result = this.compareValues(fieldValue, condition.operator, compareValue, condition);

    if (condition.negate) {
      result = !result;
    }

    return result;
  }

  private getFieldValue(path: string, obj: Record<string, any>): any {
    const parts = path.split('.');
    let value: any = obj;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;

      // Handle array indexing
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        value = value[arrayMatch[1]];
        if (Array.isArray(value)) {
          value = value[parseInt(arrayMatch[2])];
        }
      } else {
        value = value[part];
      }
    }

    return value;
  }

  private compareValues(
    fieldValue: any,
    operator: RuleOperator,
    compareValue: any,
    condition: RuleCondition
  ): boolean {
    // Handle case sensitivity for strings
    if (typeof fieldValue === 'string' && typeof compareValue === 'string' && !condition.caseSensitive) {
      fieldValue = fieldValue.toLowerCase();
      compareValue = compareValue.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'notEquals':
        return fieldValue !== compareValue;
      case 'greaterThan':
        return fieldValue > compareValue;
      case 'greaterThanOrEquals':
        return fieldValue >= compareValue;
      case 'lessThan':
        return fieldValue < compareValue;
      case 'lessThanOrEquals':
        return fieldValue <= compareValue;
      case 'contains':
        return String(fieldValue).includes(compareValue);
      case 'notContains':
        return !String(fieldValue).includes(compareValue);
      case 'startsWith':
        return String(fieldValue).startsWith(compareValue);
      case 'endsWith':
        return String(fieldValue).endsWith(compareValue);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case 'between':
        return Array.isArray(compareValue) && fieldValue >= compareValue[0] && fieldValue <= compareValue[1];
      case 'notBetween':
        return Array.isArray(compareValue) && (fieldValue < compareValue[0] || fieldValue > compareValue[1]);
      case 'isNull':
        return fieldValue === null || fieldValue === undefined;
      case 'isNotNull':
        return fieldValue !== null && fieldValue !== undefined;
      case 'isEmpty':
        return fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty':
        return fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'matches':
        return new RegExp(compareValue).test(String(fieldValue));
      case 'notMatches':
        return !new RegExp(compareValue).test(String(fieldValue));
      case 'before':
        return new Date(fieldValue) < new Date(compareValue);
      case 'after':
        return new Date(fieldValue) > new Date(compareValue);
      case 'hasProperty':
        return typeof fieldValue === 'object' && fieldValue !== null && compareValue in fieldValue;
      case 'hasNotProperty':
        return typeof fieldValue === 'object' && fieldValue !== null && !(compareValue in fieldValue);
      default:
        return false;
    }
  }

  private async executeAction(
    action: RuleAction,
    input: Record<string, any>,
    context: RuleContext
  ): Promise<ActionExecution> {
    const startTime = Date.now();

    try {
      // Check action condition if present
      if (action.condition) {
        const { matched } = this.evaluateConditionGroup(action.condition, input);
        if (!matched) {
          return {
            actionId: action.id,
            actionType: action.type,
            status: 'skipped',
            duration: Date.now() - startTime,
          };
        }
      }

      // Execute action (simulated)
      await new Promise(resolve => setTimeout(resolve, 50));

      this.eventEmitter.emit('rule.action.executed', {
        action,
        input,
        context,
      });

      return {
        actionId: action.id,
        actionType: action.type,
        status: 'success',
        output: { executed: true, config: action.config },
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  private isWithinSchedule(schedule?: RuleSchedule): boolean {
    if (!schedule || schedule.type === 'always') return true;

    const now = new Date();

    switch (schedule.type) {
      case 'timeWindow':
        if (schedule.startTime && schedule.endTime) {
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
            return false;
          }
        }
        if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(now.getDay())) {
          return false;
        }
        return true;

      case 'dateRange':
        if (schedule.startDate && now < schedule.startDate) return false;
        if (schedule.endDate && now > schedule.endDate) return false;
        return true;

      default:
        return true;
    }
  }

  private checkLimits(rule: Rule): boolean {
    if (!rule.limits) return true;

    const counts = this.executionCounts.get(rule.id);
    if (!counts) return true;

    // Reset counts if needed
    const now = new Date();
    const hoursSinceReset = (now.getTime() - counts.lastReset.getTime()) / 3600000;

    if (hoursSinceReset >= 24) {
      counts.daily = 0;
      counts.hourly = 0;
      counts.lastReset = now;
    } else if (hoursSinceReset >= 1) {
      counts.hourly = 0;
    }

    if (rule.limits.maxExecutionsPerDay && counts.daily >= rule.limits.maxExecutionsPerDay) {
      return false;
    }

    if (rule.limits.maxExecutionsPerHour && counts.hourly >= rule.limits.maxExecutionsPerHour) {
      return false;
    }

    return true;
  }

  private incrementExecutionCount(ruleId: string): void {
    let counts = this.executionCounts.get(ruleId);
    if (!counts) {
      counts = { daily: 0, hourly: 0, lastReset: new Date() };
      this.executionCounts.set(ruleId, counts);
    }

    counts.daily++;
    counts.hourly++;
  }

  // =================== TESTING ===================

  async testRule(ruleId: string, input: Record<string, any>): Promise<{
    matched: boolean;
    matchedConditions: string[];
    conditionDetails: { id: string; field: string; operator: string; expected: any; actual: any; matched: boolean }[];
  }> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const conditionDetails: any[] = [];
    const { matched, matchedConditions } = this.testConditionGroup(rule.conditions, input, conditionDetails);

    return { matched, matchedConditions, conditionDetails };
  }

  private testConditionGroup(
    group: RuleConditionGroup,
    input: Record<string, any>,
    details: any[]
  ): { matched: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    const results: boolean[] = [];

    for (const condition of group.conditions) {
      if ('operator' in condition && 'conditions' in condition) {
        const nested = this.testConditionGroup(condition as RuleConditionGroup, input, details);
        results.push(nested.matched);
        matchedConditions.push(...nested.matchedConditions);
      } else {
        const cond = condition as RuleCondition;
        const fieldValue = this.getFieldValue(cond.field, input);
        const matched = this.evaluateCondition(cond, input);

        details.push({
          id: cond.id,
          field: cond.field,
          operator: cond.operator,
          expected: cond.value,
          actual: fieldValue,
          matched,
        });

        results.push(matched);
        if (matched) {
          matchedConditions.push(cond.id);
        }
      }
    }

    const matched = group.operator === 'and'
      ? results.every(r => r)
      : results.some(r => r);

    return { matched, matchedConditions: matched ? matchedConditions : [] };
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalRules: number;
    activeRules: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    totalEvaluations: number;
    matchRate: number;
    avgExecutionTime: number;
    topRules: { rule: Rule; executionCount: number }[];
  }> {
    const rules = Array.from(this.rules.values()).filter(r => r.tenantId === tenantId);
    const evaluations = Array.from(this.evaluations.values()).filter(e => e.tenantId === tenantId);

    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    rules.forEach(r => {
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      const cat = r.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const matchedCount = evaluations.filter(e => e.result === 'matched').length;
    const matchRate = evaluations.length > 0 ? (matchedCount / evaluations.length) * 100 : 0;

    const avgExecutionTime = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + e.duration, 0) / evaluations.length
      : 0;

    const topRules = rules
      .map(r => ({ rule: r, executionCount: r.metadata.executionCount }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 5);

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.status === 'active').length,
      byPriority,
      byCategory,
      totalEvaluations: evaluations.length,
      matchRate,
      avgExecutionTime,
      topRules,
    };
  }

  async getEvaluations(ruleId: string, limit?: number): Promise<RuleEvaluation[]> {
    let evaluations = Array.from(this.evaluations.values())
      .filter(e => e.ruleId === ruleId)
      .sort((a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime());

    if (limit) {
      evaluations = evaluations.slice(0, limit);
    }

    return evaluations;
  }
}

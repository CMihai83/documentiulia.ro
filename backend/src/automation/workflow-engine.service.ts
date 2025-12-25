import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type NodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'loop' | 'parallel' | 'subworkflow' | 'end';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: number;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  permissions?: WorkflowPermission[];
  stats: WorkflowStats;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  config: NodeConfig;
  inputs?: NodePort[];
  outputs?: NodePort[];
  errorHandling?: ErrorHandlingConfig;
}

export interface NodeConfig {
  triggerType?: string;
  triggerConfig?: Record<string, any>;
  conditionType?: string;
  conditions?: ConditionGroup;
  actionType?: string;
  actionConfig?: Record<string, any>;
  delayType?: 'fixed' | 'until' | 'dynamic';
  delayValue?: number | string;
  delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  loopType?: 'count' | 'collection' | 'while';
  loopConfig?: Record<string, any>;
  subworkflowId?: string;
  parallelBranches?: string[];
  maxConcurrency?: number;
}

export interface NodePort {
  id: string;
  name: string;
  type: 'default' | 'true' | 'false' | 'error' | 'complete' | 'item';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourcePort?: string;
  target: string;
  targetPort?: string;
  condition?: string;
  label?: string;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  defaultValue?: any;
  description?: string;
  scope: 'workflow' | 'execution';
}

export interface WorkflowSettings {
  maxExecutionTime?: number;
  maxRetries?: number;
  retryDelay?: number;
  concurrencyLimit?: number;
  timezone?: string;
  errorNotification?: {
    enabled: boolean;
    recipients: string[];
    channels: string[];
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
  };
}

export interface WorkflowPermission {
  userId?: string;
  roleId?: string;
  permission: 'view' | 'edit' | 'execute' | 'admin';
}

export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  lastExecutedAt?: Date;
}

export interface ConditionGroup {
  operator: 'and' | 'or';
  conditions: (Condition | ConditionGroup)[];
}

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'isNull' | 'isNotNull' | 'matches';
  value: any;
}

export interface ErrorHandlingConfig {
  strategy: 'fail' | 'retry' | 'continue' | 'fallback';
  maxRetries?: number;
  retryDelay?: number;
  fallbackNodeId?: string;
  notifyOnError?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  tenantId: string;
  status: ExecutionStatus;
  trigger: {
    type: string;
    data: Record<string, any>;
  };
  context: ExecutionContext;
  nodeExecutions: NodeExecution[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: ExecutionError;
  initiatedBy?: string;
}

export interface ExecutionContext {
  variables: Record<string, any>;
  input: Record<string, any>;
  output: Record<string, any>;
  metadata: Record<string, any>;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  retryCount?: number;
  error?: ExecutionError;
  logs?: ExecutionLog[];
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class WorkflowEngineService {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private runningExecutions: Map<string, AbortController> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== WORKFLOW DEFINITIONS ===================

  async createWorkflow(data: {
    tenantId: string;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    variables?: WorkflowVariable[];
    settings?: Partial<WorkflowSettings>;
    createdBy: string;
  }): Promise<WorkflowDefinition> {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const workflow: WorkflowDefinition = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      version: 1,
      status: 'draft',
      nodes: data.nodes || [],
      edges: data.edges || [],
      variables: data.variables || [],
      settings: {
        maxExecutionTime: 3600000, // 1 hour
        maxRetries: 3,
        retryDelay: 5000,
        concurrencyLimit: 10,
        timezone: 'Europe/Bucharest',
        logging: { level: 'info', retentionDays: 30 },
        ...data.settings,
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTime: 0,
      },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(id, workflow);
    this.eventEmitter.emit('workflow.created', { workflow });
    return workflow;
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    return this.workflows.get(id);
  }

  async getWorkflows(tenantId: string, options?: {
    status?: WorkflowStatus;
    category?: string;
    tag?: string;
    search?: string;
  }): Promise<WorkflowDefinition[]> {
    let workflows = Array.from(this.workflows.values()).filter(w => w.tenantId === tenantId);

    if (options?.status) {
      workflows = workflows.filter(w => w.status === options.status);
    }
    if (options?.category) {
      workflows = workflows.filter(w => w.category === options.category);
    }
    if (options?.tag) {
      workflows = workflows.filter(w => w.tags?.includes(options.tag!));
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(search) ||
        w.description?.toLowerCase().includes(search)
      );
    }

    return workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateWorkflow(id: string, updates: Partial<{
    name: string;
    description: string;
    category: string;
    tags: string[];
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    variables: WorkflowVariable[];
    settings: WorkflowSettings;
  }>): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;

    // Increment version if nodes/edges changed
    if (updates.nodes || updates.edges) {
      workflow.version++;
    }

    Object.assign(workflow, updates, { updatedAt: new Date() });
    this.eventEmitter.emit('workflow.updated', { workflow });
    return workflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const workflow = this.workflows.get(id);
    if (workflow) {
      // Cancel any running executions
      const runningExecs = Array.from(this.executions.values())
        .filter(e => e.workflowId === id && e.status === 'running');

      for (const exec of runningExecs) {
        await this.cancelExecution(exec.id);
      }

      this.workflows.delete(id);
      this.eventEmitter.emit('workflow.deleted', { workflowId: id });
    }
  }

  async activateWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;

    // Validate workflow before activation
    const validation = this.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    workflow.status = 'active';
    workflow.publishedAt = new Date();
    workflow.updatedAt = new Date();

    this.eventEmitter.emit('workflow.activated', { workflow });
    return workflow;
  }

  async pauseWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;

    workflow.status = 'paused';
    workflow.updatedAt = new Date();

    this.eventEmitter.emit('workflow.paused', { workflow });
    return workflow;
  }

  async archiveWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;

    workflow.status = 'archived';
    workflow.updatedAt = new Date();

    this.eventEmitter.emit('workflow.archived', { workflow });
    return workflow;
  }

  async duplicateWorkflow(id: string, newName: string, userId: string): Promise<WorkflowDefinition | undefined> {
    const original = this.workflows.get(id);
    if (!original) return undefined;

    return this.createWorkflow({
      tenantId: original.tenantId,
      name: newName,
      description: original.description,
      category: original.category,
      tags: original.tags,
      nodes: original.nodes.map(n => ({ ...n, id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })),
      edges: original.edges.map(e => ({ ...e, id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })),
      variables: original.variables.map(v => ({ ...v })),
      settings: { ...original.settings },
      createdBy: userId,
    });
  }

  private validateWorkflow(workflow: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for trigger node
    const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for end node
    const endNodes = workflow.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }

    // Check all nodes are connected
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    const connectedNodes = new Set<string>();

    workflow.edges.forEach(e => {
      connectedNodes.add(e.source);
      connectedNodes.add(e.target);
    });

    // Triggers and ends don't need all connections
    const unconnected = workflow.nodes
      .filter(n => n.type !== 'trigger' && n.type !== 'end')
      .filter(n => !connectedNodes.has(n.id));

    if (unconnected.length > 0) {
      errors.push(`Unconnected nodes: ${unconnected.map(n => n.name).join(', ')}`);
    }

    // Validate edge references
    workflow.edges.forEach(e => {
      if (!nodeIds.has(e.source)) {
        errors.push(`Edge references non-existent source node: ${e.source}`);
      }
      if (!nodeIds.has(e.target)) {
        errors.push(`Edge references non-existent target node: ${e.target}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  // =================== NODES ===================

  async addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const newNode: WorkflowNode = {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    workflow.nodes.push(newNode);
    workflow.version++;
    workflow.updatedAt = new Date();

    return workflow;
  }

  async updateNode(workflowId: string, nodeId: string, updates: Partial<WorkflowNode>): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const nodeIdx = workflow.nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx < 0) return undefined;

    Object.assign(workflow.nodes[nodeIdx], updates);
    workflow.version++;
    workflow.updatedAt = new Date();

    return workflow;
  }

  async removeNode(workflowId: string, nodeId: string): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);
    workflow.edges = workflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    workflow.version++;
    workflow.updatedAt = new Date();

    return workflow;
  }

  // =================== EDGES ===================

  async addEdge(workflowId: string, edge: Omit<WorkflowEdge, 'id'>): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    const newEdge: WorkflowEdge = {
      ...edge,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    workflow.edges.push(newEdge);
    workflow.version++;
    workflow.updatedAt = new Date();

    return workflow;
  }

  async removeEdge(workflowId: string, edgeId: string): Promise<WorkflowDefinition | undefined> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;

    workflow.edges = workflow.edges.filter(e => e.id !== edgeId);
    workflow.version++;
    workflow.updatedAt = new Date();

    return workflow;
  }

  // =================== EXECUTION ===================

  async executeWorkflow(data: {
    workflowId: string;
    tenantId: string;
    trigger: { type: string; data: Record<string, any> };
    input?: Record<string, any>;
    initiatedBy?: string;
  }): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(data.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'active') {
      throw new Error('Workflow is not active');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: data.workflowId,
      workflowVersion: workflow.version,
      tenantId: data.tenantId,
      status: 'pending',
      trigger: data.trigger,
      context: {
        variables: this.initializeVariables(workflow.variables),
        input: data.input || {},
        output: {},
        metadata: {
          workflowName: workflow.name,
          startedAt: new Date().toISOString(),
        },
      },
      nodeExecutions: [],
      startedAt: new Date(),
      initiatedBy: data.initiatedBy,
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    this.runExecution(execution, workflow);

    this.eventEmitter.emit('workflow.execution.started', { execution, workflow });
    return execution;
  }

  private initializeVariables(variables: WorkflowVariable[]): Record<string, any> {
    const result: Record<string, any> = {};
    variables.forEach(v => {
      result[v.name] = v.defaultValue;
    });
    return result;
  }

  private async runExecution(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    const abortController = new AbortController();
    this.runningExecutions.set(execution.id, abortController);

    try {
      execution.status = 'running';

      // Find trigger nodes
      const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');

      // Execute from each trigger
      for (const triggerNode of triggerNodes) {
        if (abortController.signal.aborted) break;
        await this.executeNode(execution, workflow, triggerNode, abortController.signal);
      }

      if (!abortController.signal.aborted) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

        // Update workflow stats
        workflow.stats.totalExecutions++;
        workflow.stats.successfulExecutions++;
        workflow.stats.lastExecutedAt = new Date();
        workflow.stats.avgExecutionTime = this.calculateAvgExecutionTime(workflow);

        this.eventEmitter.emit('workflow.execution.completed', { execution, workflow });
      }
    } catch (error: any) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
      };

      workflow.stats.totalExecutions++;
      workflow.stats.failedExecutions++;
      workflow.stats.lastExecutedAt = new Date();

      this.eventEmitter.emit('workflow.execution.failed', { execution, workflow, error });

      if (workflow.settings.errorNotification?.enabled) {
        this.sendErrorNotification(workflow, execution, error);
      }
    } finally {
      this.runningExecutions.delete(execution.id);
    }
  }

  private async executeNode(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    node: WorkflowNode,
    signal: AbortSignal
  ): Promise<any> {
    if (signal.aborted) return;

    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      startedAt: new Date(),
      logs: [],
    };

    execution.nodeExecutions.push(nodeExecution);

    try {
      let result: any;

      switch (node.type) {
        case 'trigger':
          result = await this.executeTriggerNode(node, execution.context);
          break;
        case 'condition':
          result = await this.executeConditionNode(node, execution.context);
          break;
        case 'action':
          result = await this.executeActionNode(node, execution.context);
          break;
        case 'delay':
          result = await this.executeDelayNode(node, signal);
          break;
        case 'loop':
          result = await this.executeLoopNode(node, execution, workflow, signal);
          break;
        case 'parallel':
          result = await this.executeParallelNode(node, execution, workflow, signal);
          break;
        case 'subworkflow':
          result = await this.executeSubworkflowNode(node, execution);
          break;
        case 'end':
          result = execution.context.output;
          break;
      }

      nodeExecution.output = result;
      nodeExecution.status = 'completed';
      nodeExecution.completedAt = new Date();
      nodeExecution.duration = nodeExecution.completedAt.getTime() - nodeExecution.startedAt.getTime();

      // Update context with node output
      execution.context.variables[`${node.id}_output`] = result;

      // Find and execute next nodes
      const nextEdges = workflow.edges.filter(e => e.source === node.id);

      for (const edge of nextEdges) {
        if (signal.aborted) break;

        // Check edge condition for condition nodes
        if (node.type === 'condition') {
          const expectedPort = result ? 'true' : 'false';
          if (edge.sourcePort && edge.sourcePort !== expectedPort) continue;
        }

        const nextNode = workflow.nodes.find(n => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(execution, workflow, nextNode, signal);
        }
      }

      return result;
    } catch (error: any) {
      nodeExecution.status = 'failed';
      nodeExecution.completedAt = new Date();
      nodeExecution.error = {
        code: 'NODE_ERROR',
        message: error.message,
      };

      // Handle error based on node config
      if (node.errorHandling) {
        switch (node.errorHandling.strategy) {
          case 'retry':
            if ((nodeExecution.retryCount || 0) < (node.errorHandling.maxRetries || 3)) {
              nodeExecution.retryCount = (nodeExecution.retryCount || 0) + 1;
              await this.delay(node.errorHandling.retryDelay || 5000);
              return this.executeNode(execution, workflow, node, signal);
            }
            break;
          case 'continue':
            return null;
          case 'fallback':
            if (node.errorHandling.fallbackNodeId) {
              const fallbackNode = workflow.nodes.find(n => n.id === node.errorHandling!.fallbackNodeId);
              if (fallbackNode) {
                return this.executeNode(execution, workflow, fallbackNode, signal);
              }
            }
            break;
        }
      }

      throw error;
    }
  }

  private async executeTriggerNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Trigger nodes pass through the input data
    return context.input;
  }

  private async executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<boolean> {
    if (!node.config.conditions) return true;
    return this.evaluateConditionGroup(node.config.conditions, context);
  }

  private evaluateConditionGroup(group: ConditionGroup, context: ExecutionContext): boolean {
    const results = group.conditions.map(c => {
      if ('operator' in c && ('conditions' in c)) {
        return this.evaluateConditionGroup(c as ConditionGroup, context);
      }
      return this.evaluateCondition(c as Condition, context);
    });

    return group.operator === 'and'
      ? results.every(r => r)
      : results.some(r => r);
  }

  private evaluateCondition(condition: Condition, context: ExecutionContext): boolean {
    const value = this.resolveValue(condition.field, context);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'eq': return value === compareValue;
      case 'neq': return value !== compareValue;
      case 'gt': return value > compareValue;
      case 'gte': return value >= compareValue;
      case 'lt': return value < compareValue;
      case 'lte': return value <= compareValue;
      case 'contains': return String(value).includes(compareValue);
      case 'startsWith': return String(value).startsWith(compareValue);
      case 'endsWith': return String(value).endsWith(compareValue);
      case 'in': return Array.isArray(compareValue) && compareValue.includes(value);
      case 'notIn': return Array.isArray(compareValue) && !compareValue.includes(value);
      case 'isNull': return value === null || value === undefined;
      case 'isNotNull': return value !== null && value !== undefined;
      case 'matches': return new RegExp(compareValue).test(String(value));
      default: return false;
    }
  }

  private resolveValue(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  private async executeActionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Simulate action execution
    await this.delay(100);

    const actionType = node.config.actionType;
    const actionConfig = node.config.actionConfig || {};

    // Log action execution
    this.eventEmitter.emit('workflow.action.executed', {
      actionType,
      actionConfig,
      context,
    });

    // Return mock result based on action type
    return {
      actionType,
      executedAt: new Date(),
      success: true,
      data: actionConfig,
    };
  }

  private async executeDelayNode(node: WorkflowNode, signal: AbortSignal): Promise<void> {
    let delayMs = 0;

    switch (node.config.delayType) {
      case 'fixed':
        const value = node.config.delayValue as number || 0;
        const unit = node.config.delayUnit || 'seconds';
        const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
        delayMs = value * multipliers[unit];
        break;
      case 'until':
        const targetDate = new Date(node.config.delayValue as string);
        delayMs = Math.max(0, targetDate.getTime() - Date.now());
        break;
    }

    await this.delay(delayMs, signal);
  }

  private async executeLoopNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    signal: AbortSignal
  ): Promise<any[]> {
    const results: any[] = [];
    const loopConfig = node.config.loopConfig || {};

    switch (node.config.loopType) {
      case 'count':
        const count = loopConfig.count || 1;
        for (let i = 0; i < count && !signal.aborted; i++) {
          execution.context.variables['loop_index'] = i;
          const result = await this.executeLoopIteration(node, execution, workflow, signal);
          results.push(result);
        }
        break;
      case 'collection':
        const items = this.resolveValue(loopConfig.collection, execution.context) || [];
        for (let i = 0; i < items.length && !signal.aborted; i++) {
          execution.context.variables['loop_index'] = i;
          execution.context.variables['loop_item'] = items[i];
          const result = await this.executeLoopIteration(node, execution, workflow, signal);
          results.push(result);
        }
        break;
    }

    return results;
  }

  private async executeLoopIteration(
    _node: WorkflowNode,
    _execution: WorkflowExecution,
    _workflow: WorkflowDefinition,
    _signal: AbortSignal
  ): Promise<any> {
    // Execute loop body nodes
    return { iteration: true };
  }

  private async executeParallelNode(
    node: WorkflowNode,
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    signal: AbortSignal
  ): Promise<any[]> {
    const branchIds = node.config.parallelBranches || [];
    const maxConcurrency = node.config.maxConcurrency || branchIds.length;

    const results: any[] = [];
    const chunks = this.chunkArray(branchIds, maxConcurrency);

    for (const chunk of chunks) {
      if (signal.aborted) break;

      const branchPromises = chunk.map(async branchId => {
        const branchNode = workflow.nodes.find(n => n.id === branchId);
        if (branchNode) {
          return this.executeNode(execution, workflow, branchNode, signal);
        }
        return null;
      });

      const chunkResults = await Promise.all(branchPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  private async executeSubworkflowNode(node: WorkflowNode, execution: WorkflowExecution): Promise<any> {
    const subworkflowId = node.config.subworkflowId;
    if (!subworkflowId) return null;

    const subExecution = await this.executeWorkflow({
      workflowId: subworkflowId,
      tenantId: execution.tenantId,
      trigger: { type: 'subworkflow', data: { parentExecutionId: execution.id } },
      input: execution.context.output,
    });

    // Wait for subworkflow completion (simplified)
    return { subworkflowExecutionId: subExecution.id };
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      }
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateAvgExecutionTime(workflow: WorkflowDefinition): number {
    const executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflow.id && e.duration);

    if (executions.length === 0) return 0;

    const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalDuration / executions.length;
  }

  private sendErrorNotification(_workflow: WorkflowDefinition, _execution: WorkflowExecution, _error: any): void {
    this.eventEmitter.emit('workflow.error.notification', {
      workflow: _workflow,
      execution: _execution,
      error: _error,
    });
  }

  async cancelExecution(executionId: string): Promise<WorkflowExecution | undefined> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return undefined;

    const abortController = this.runningExecutions.get(executionId);
    if (abortController) {
      abortController.abort();
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

    this.eventEmitter.emit('workflow.execution.cancelled', { execution });
    return execution;
  }

  async getExecution(id: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(id);
  }

  async getExecutions(workflowId: string, options?: {
    status?: ExecutionStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId);

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
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    executionsByStatus: Record<string, number>;
    avgExecutionTime: number;
    topWorkflows: { workflow: WorkflowDefinition; executionCount: number }[];
  }> {
    const workflows = Array.from(this.workflows.values()).filter(w => w.tenantId === tenantId);
    const executions = Array.from(this.executions.values()).filter(e => e.tenantId === tenantId);

    const executionsByStatus: Record<string, number> = {};
    executions.forEach(e => {
      executionsByStatus[e.status] = (executionsByStatus[e.status] || 0) + 1;
    });

    const workflowExecutionCounts = new Map<string, number>();
    executions.forEach(e => {
      workflowExecutionCounts.set(e.workflowId, (workflowExecutionCounts.get(e.workflowId) || 0) + 1);
    });

    const topWorkflows = workflows
      .map(w => ({ workflow: w, executionCount: workflowExecutionCounts.get(w.id) || 0 }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 5);

    const completedExecutions = executions.filter(e => e.duration);
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.status === 'active').length,
      totalExecutions: executions.length,
      executionsByStatus,
      avgExecutionTime,
      topWorkflows,
    };
  }
}

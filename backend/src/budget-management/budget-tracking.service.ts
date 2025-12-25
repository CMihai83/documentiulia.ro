import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BudgetPlanningService, Budget, BudgetLineItem } from './budget-planning.service';

// =================== TYPES ===================

export type TransactionType = 'expense' | 'commitment' | 'transfer' | 'adjustment' | 'reversal';
export type TransactionStatus = 'pending' | 'approved' | 'posted' | 'rejected' | 'reversed';

export interface BudgetTransaction {
  id: string;
  tenantId: string;
  budgetId: string;
  lineItemId: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string;
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  poNumber?: string;
  transactionDate: Date;
  postingDate?: Date;
  period: string;
  costCenterId?: string;
  costCenterName?: string;
  projectId?: string;
  projectName?: string;
  glAccountCode?: string;
  attachments?: string[];
  notes?: string;
  status: TransactionStatus;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetAllocation {
  id: string;
  tenantId: string;
  sourceBudgetId: string;
  sourceBudgetName: string;
  sourceLineItemId?: string;
  targetBudgetId?: string;
  targetBudgetName?: string;
  targetLineItemId?: string;
  amount: number;
  reason: string;
  effectiveDate: Date;
  expiryDate?: Date;
  status: 'pending' | 'approved' | 'active' | 'expired' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface BudgetTransfer {
  id: string;
  tenantId: string;
  fromBudgetId: string;
  fromBudgetName: string;
  fromLineItemId: string;
  fromLineItemName: string;
  toBudgetId: string;
  toBudgetName: string;
  toLineItemId: string;
  toLineItemName: string;
  amount: number;
  reason: string;
  transferDate: Date;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface CommitmentRecord {
  id: string;
  tenantId: string;
  budgetId: string;
  lineItemId: string;
  type: 'purchase_order' | 'contract' | 'requisition' | 'other';
  reference: string;
  description: string;
  vendorId?: string;
  vendorName?: string;
  amount: number;
  committedDate: Date;
  expectedDate?: Date;
  actualAmount?: number;
  actualDate?: Date;
  status: 'open' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpendingLimit {
  id: string;
  tenantId: string;
  budgetId?: string;
  lineItemId?: string;
  userId?: string;
  departmentId?: string;
  limitType: 'per_transaction' | 'daily' | 'weekly' | 'monthly' | 'total';
  amount: number;
  warningThreshold: number; // percentage
  isActive: boolean;
  createdAt: Date;
}

export interface SpendingAlert {
  id: string;
  tenantId: string;
  budgetId: string;
  lineItemId?: string;
  alertType: 'threshold_warning' | 'threshold_exceeded' | 'limit_exceeded' | 'unusual_spending' | 'budget_exhausted';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentAmount: number;
  limitAmount: number;
  percentage: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class BudgetTrackingService {
  private transactions: Map<string, BudgetTransaction> = new Map();
  private allocations: Map<string, BudgetAllocation> = new Map();
  private transfers: Map<string, BudgetTransfer> = new Map();
  private commitments: Map<string, CommitmentRecord> = new Map();
  private spendingLimits: Map<string, SpendingLimit> = new Map();
  private alerts: Map<string, SpendingAlert> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private budgetService: BudgetPlanningService,
  ) {}

  // =================== TRANSACTIONS ===================

  async recordTransaction(data: {
    tenantId: string;
    budgetId: string;
    lineItemId: string;
    type: TransactionType;
    amount: number;
    description: string;
    reference?: string;
    vendorId?: string;
    vendorName?: string;
    invoiceNumber?: string;
    poNumber?: string;
    transactionDate: Date;
    costCenterId?: string;
    costCenterName?: string;
    projectId?: string;
    projectName?: string;
    glAccountCode?: string;
    attachments?: string[];
    notes?: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<BudgetTransaction> {
    const id = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Calculate period from transaction date
    const period = `${data.transactionDate.getFullYear()}-${String(data.transactionDate.getMonth() + 1).padStart(2, '0')}`;

    const transaction: BudgetTransaction = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      lineItemId: data.lineItemId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      invoiceNumber: data.invoiceNumber,
      poNumber: data.poNumber,
      transactionDate: data.transactionDate,
      period,
      costCenterId: data.costCenterId,
      costCenterName: data.costCenterName,
      projectId: data.projectId,
      projectName: data.projectName,
      glAccountCode: data.glAccountCode,
      attachments: data.attachments,
      notes: data.notes,
      status: 'pending',
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(id, transaction);

    // Check spending limits
    await this.checkSpendingLimits(transaction);

    this.eventEmitter.emit('budget.transaction_recorded', { transaction });

    return transaction;
  }

  async approveTransaction(
    transactionId: string,
    approvedBy: string,
    approvedByName?: string,
  ): Promise<BudgetTransaction | null> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'pending') return null;

    transaction.status = 'approved';
    transaction.approvedBy = approvedBy;
    transaction.approvedByName = approvedByName;
    transaction.approvedAt = new Date();
    transaction.updatedAt = new Date();

    this.transactions.set(transactionId, transaction);

    this.eventEmitter.emit('budget.transaction_approved', { transaction });

    return transaction;
  }

  async postTransaction(transactionId: string): Promise<BudgetTransaction | null> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'approved') return null;

    // Update budget line item
    const lineItems = await this.budgetService.getLineItems(transaction.budgetId);
    const lineItem = lineItems.find((l) => l.id === transaction.lineItemId);

    if (lineItem) {
      if (transaction.type === 'expense') {
        await this.budgetService.updateLineItem(lineItem.id, {
          spentAmount: lineItem.spentAmount + transaction.amount,
        });
      } else if (transaction.type === 'commitment') {
        await this.budgetService.updateLineItem(lineItem.id, {
          committedAmount: lineItem.committedAmount + transaction.amount,
        });
      }

      // Update budget totals
      const budget = await this.budgetService.getBudget(transaction.budgetId);
      if (budget) {
        await this.budgetService.updateBudget(budget.id, {
          spentAmount: budget.spentAmount + (transaction.type === 'expense' ? transaction.amount : 0),
        });
      }
    }

    transaction.status = 'posted';
    transaction.postingDate = new Date();
    transaction.updatedAt = new Date();

    this.transactions.set(transactionId, transaction);

    // Check for alerts
    await this.checkBudgetUtilization(transaction.budgetId, transaction.lineItemId);

    this.eventEmitter.emit('budget.transaction_posted', { transaction });

    return transaction;
  }

  async reverseTransaction(
    transactionId: string,
    reason: string,
    reversedBy: string,
  ): Promise<BudgetTransaction | null> {
    const original = this.transactions.get(transactionId);
    if (!original || original.status !== 'posted') return null;

    // Create reversal transaction
    const reversalId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const reversal: BudgetTransaction = {
      ...original,
      id: reversalId,
      type: 'reversal',
      amount: -original.amount,
      description: `Reversal of ${original.id}: ${reason}`,
      reference: original.id,
      transactionDate: now,
      postingDate: now,
      status: 'posted',
      createdBy: reversedBy,
      approvedBy: reversedBy,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(reversalId, reversal);

    // Update original transaction status
    original.status = 'reversed';
    original.updatedAt = now;
    this.transactions.set(transactionId, original);

    // Update budget line item
    const lineItems = await this.budgetService.getLineItems(original.budgetId);
    const lineItem = lineItems.find((l) => l.id === original.lineItemId);

    if (lineItem) {
      if (original.type === 'expense') {
        await this.budgetService.updateLineItem(lineItem.id, {
          spentAmount: Math.max(0, lineItem.spentAmount - original.amount),
        });
      } else if (original.type === 'commitment') {
        await this.budgetService.updateLineItem(lineItem.id, {
          committedAmount: Math.max(0, lineItem.committedAmount - original.amount),
        });
      }
    }

    this.eventEmitter.emit('budget.transaction_reversed', { original, reversal });

    return reversal;
  }

  async getTransactions(
    tenantId: string,
    filters?: {
      budgetId?: string;
      lineItemId?: string;
      type?: TransactionType;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
      vendorId?: string;
      limit?: number;
    },
  ): Promise<BudgetTransaction[]> {
    let transactions = Array.from(this.transactions.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    if (filters?.budgetId) {
      transactions = transactions.filter((t) => t.budgetId === filters.budgetId);
    }

    if (filters?.lineItemId) {
      transactions = transactions.filter((t) => t.lineItemId === filters.lineItemId);
    }

    if (filters?.type) {
      transactions = transactions.filter((t) => t.type === filters.type);
    }

    if (filters?.status) {
      transactions = transactions.filter((t) => t.status === filters.status);
    }

    if (filters?.startDate) {
      transactions = transactions.filter((t) => t.transactionDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      transactions = transactions.filter((t) => t.transactionDate <= filters.endDate!);
    }

    if (filters?.vendorId) {
      transactions = transactions.filter((t) => t.vendorId === filters.vendorId);
    }

    transactions = transactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

    if (filters?.limit) {
      transactions = transactions.slice(0, filters.limit);
    }

    return transactions;
  }

  // =================== BUDGET TRANSFERS ===================

  async requestTransfer(data: {
    tenantId: string;
    fromBudgetId: string;
    fromLineItemId: string;
    toBudgetId: string;
    toLineItemId: string;
    amount: number;
    reason: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<BudgetTransfer> {
    const fromBudget = await this.budgetService.getBudget(data.fromBudgetId);
    const toBudget = await this.budgetService.getBudget(data.toBudgetId);
    const fromLineItems = await this.budgetService.getLineItems(data.fromBudgetId);
    const toLineItems = await this.budgetService.getLineItems(data.toBudgetId);

    const fromLineItem = fromLineItems.find((l) => l.id === data.fromLineItemId);
    const toLineItem = toLineItems.find((l) => l.id === data.toLineItemId);

    if (!fromBudget || !toBudget || !fromLineItem || !toLineItem) {
      throw new Error('Invalid budget or line item');
    }

    if (fromLineItem.remainingAmount < data.amount) {
      throw new Error('Insufficient budget in source line item');
    }

    const id = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const transfer: BudgetTransfer = {
      id,
      tenantId: data.tenantId,
      fromBudgetId: data.fromBudgetId,
      fromBudgetName: fromBudget.name,
      fromLineItemId: data.fromLineItemId,
      fromLineItemName: fromLineItem.categoryName,
      toBudgetId: data.toBudgetId,
      toBudgetName: toBudget.name,
      toLineItemId: data.toLineItemId,
      toLineItemName: toLineItem.categoryName,
      amount: data.amount,
      reason: data.reason,
      transferDate: new Date(),
      status: 'pending',
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: new Date(),
    };

    this.transfers.set(id, transfer);

    this.eventEmitter.emit('budget.transfer_requested', { transfer });

    return transfer;
  }

  async approveTransfer(
    transferId: string,
    approvedBy: string,
    approvedByName?: string,
  ): Promise<BudgetTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'pending') return null;

    transfer.status = 'approved';
    transfer.approvedBy = approvedBy;
    transfer.approvedByName = approvedByName;
    transfer.approvedAt = new Date();

    this.transfers.set(transferId, transfer);

    return transfer;
  }

  async executeTransfer(transferId: string): Promise<BudgetTransfer | null> {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'approved') return null;

    // Update source line item
    const fromLineItems = await this.budgetService.getLineItems(transfer.fromBudgetId);
    const fromLineItem = fromLineItems.find((l) => l.id === transfer.fromLineItemId);
    if (fromLineItem) {
      await this.budgetService.updateLineItem(fromLineItem.id, {
        plannedAmount: fromLineItem.plannedAmount - transfer.amount,
      });
    }

    // Update target line item
    const toLineItems = await this.budgetService.getLineItems(transfer.toBudgetId);
    const toLineItem = toLineItems.find((l) => l.id === transfer.toLineItemId);
    if (toLineItem) {
      await this.budgetService.updateLineItem(toLineItem.id, {
        plannedAmount: toLineItem.plannedAmount + transfer.amount,
      });
    }

    transfer.status = 'completed';
    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('budget.transfer_completed', { transfer });

    return transfer;
  }

  async getTransfers(
    tenantId: string,
    filters?: {
      budgetId?: string;
      status?: BudgetTransfer['status'];
      limit?: number;
    },
  ): Promise<BudgetTransfer[]> {
    let transfers = Array.from(this.transfers.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    if (filters?.budgetId) {
      transfers = transfers.filter(
        (t) => t.fromBudgetId === filters.budgetId || t.toBudgetId === filters.budgetId,
      );
    }

    if (filters?.status) {
      transfers = transfers.filter((t) => t.status === filters.status);
    }

    transfers = transfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      transfers = transfers.slice(0, filters.limit);
    }

    return transfers;
  }

  // =================== COMMITMENTS ===================

  async createCommitment(data: {
    tenantId: string;
    budgetId: string;
    lineItemId: string;
    type: CommitmentRecord['type'];
    reference: string;
    description: string;
    vendorId?: string;
    vendorName?: string;
    amount: number;
    expectedDate?: Date;
    createdBy: string;
  }): Promise<CommitmentRecord> {
    const id = `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const commitment: CommitmentRecord = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      lineItemId: data.lineItemId,
      type: data.type,
      reference: data.reference,
      description: data.description,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      amount: data.amount,
      committedDate: now,
      expectedDate: data.expectedDate,
      status: 'open',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.commitments.set(id, commitment);

    // Update line item committed amount
    const lineItems = await this.budgetService.getLineItems(data.budgetId);
    const lineItem = lineItems.find((l) => l.id === data.lineItemId);
    if (lineItem) {
      await this.budgetService.updateLineItem(lineItem.id, {
        committedAmount: lineItem.committedAmount + data.amount,
      });
    }

    this.eventEmitter.emit('budget.commitment_created', { commitment });

    return commitment;
  }

  async fulfillCommitment(
    commitmentId: string,
    actualAmount: number,
  ): Promise<CommitmentRecord | null> {
    const commitment = this.commitments.get(commitmentId);
    if (!commitment || commitment.status === 'fulfilled') return null;

    const now = new Date();

    commitment.actualAmount = actualAmount;
    commitment.actualDate = now;
    commitment.status = actualAmount >= commitment.amount ? 'fulfilled' : 'partially_fulfilled';
    commitment.updatedAt = now;

    this.commitments.set(commitmentId, commitment);

    // Update line item - move from committed to spent
    const lineItems = await this.budgetService.getLineItems(commitment.budgetId);
    const lineItem = lineItems.find((l) => l.id === commitment.lineItemId);
    if (lineItem) {
      await this.budgetService.updateLineItem(lineItem.id, {
        committedAmount: Math.max(0, lineItem.committedAmount - commitment.amount),
        spentAmount: lineItem.spentAmount + actualAmount,
      });
    }

    this.eventEmitter.emit('budget.commitment_fulfilled', { commitment });

    return commitment;
  }

  async getCommitments(
    tenantId: string,
    filters?: {
      budgetId?: string;
      lineItemId?: string;
      status?: CommitmentRecord['status'];
      limit?: number;
    },
  ): Promise<CommitmentRecord[]> {
    let commitments = Array.from(this.commitments.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters?.budgetId) {
      commitments = commitments.filter((c) => c.budgetId === filters.budgetId);
    }

    if (filters?.lineItemId) {
      commitments = commitments.filter((c) => c.lineItemId === filters.lineItemId);
    }

    if (filters?.status) {
      commitments = commitments.filter((c) => c.status === filters.status);
    }

    commitments = commitments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      commitments = commitments.slice(0, filters.limit);
    }

    return commitments;
  }

  // =================== SPENDING LIMITS ===================

  async setSpendingLimit(data: {
    tenantId: string;
    budgetId?: string;
    lineItemId?: string;
    userId?: string;
    departmentId?: string;
    limitType: SpendingLimit['limitType'];
    amount: number;
    warningThreshold?: number;
  }): Promise<SpendingLimit> {
    const id = `limit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const limit: SpendingLimit = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      lineItemId: data.lineItemId,
      userId: data.userId,
      departmentId: data.departmentId,
      limitType: data.limitType,
      amount: data.amount,
      warningThreshold: data.warningThreshold || 80,
      isActive: true,
      createdAt: new Date(),
    };

    this.spendingLimits.set(id, limit);

    return limit;
  }

  async getSpendingLimits(
    tenantId: string,
    filters?: {
      budgetId?: string;
      userId?: string;
      departmentId?: string;
    },
  ): Promise<SpendingLimit[]> {
    let limits = Array.from(this.spendingLimits.values()).filter(
      (l) => l.tenantId === tenantId && l.isActive,
    );

    if (filters?.budgetId) {
      limits = limits.filter((l) => l.budgetId === filters.budgetId);
    }

    if (filters?.userId) {
      limits = limits.filter((l) => l.userId === filters.userId);
    }

    if (filters?.departmentId) {
      limits = limits.filter((l) => l.departmentId === filters.departmentId);
    }

    return limits;
  }

  private async checkSpendingLimits(transaction: BudgetTransaction): Promise<void> {
    const limits = await this.getSpendingLimits(transaction.tenantId, {
      budgetId: transaction.budgetId,
    });

    for (const limit of limits) {
      if (limit.limitType === 'per_transaction' && transaction.amount > limit.amount) {
        await this.createAlert({
          tenantId: transaction.tenantId,
          budgetId: transaction.budgetId,
          lineItemId: transaction.lineItemId,
          alertType: 'limit_exceeded',
          severity: 'critical',
          message: `Transaction amount ${transaction.amount} exceeds limit of ${limit.amount}`,
          currentAmount: transaction.amount,
          limitAmount: limit.amount,
          percentage: Math.round((transaction.amount / limit.amount) * 100),
        });
      }
    }
  }

  private async checkBudgetUtilization(budgetId: string, lineItemId?: string): Promise<void> {
    const budget = await this.budgetService.getBudget(budgetId);
    if (!budget) return;

    const utilization = budget.allocatedAmount > 0
      ? (budget.spentAmount / budget.allocatedAmount) * 100
      : 0;

    if (utilization >= 100) {
      await this.createAlert({
        tenantId: budget.tenantId,
        budgetId,
        alertType: 'budget_exhausted',
        severity: 'critical',
        message: `Budget "${budget.name}" has been exhausted`,
        currentAmount: budget.spentAmount,
        limitAmount: budget.allocatedAmount,
        percentage: Math.round(utilization),
      });
    } else if (utilization >= 90) {
      await this.createAlert({
        tenantId: budget.tenantId,
        budgetId,
        alertType: 'threshold_exceeded',
        severity: 'warning',
        message: `Budget "${budget.name}" is at ${Math.round(utilization)}% utilization`,
        currentAmount: budget.spentAmount,
        limitAmount: budget.allocatedAmount,
        percentage: Math.round(utilization),
      });
    } else if (utilization >= 75) {
      await this.createAlert({
        tenantId: budget.tenantId,
        budgetId,
        alertType: 'threshold_warning',
        severity: 'info',
        message: `Budget "${budget.name}" is at ${Math.round(utilization)}% utilization`,
        currentAmount: budget.spentAmount,
        limitAmount: budget.allocatedAmount,
        percentage: Math.round(utilization),
      });
    }
  }

  // =================== ALERTS ===================

  private async createAlert(data: {
    tenantId: string;
    budgetId: string;
    lineItemId?: string;
    alertType: SpendingAlert['alertType'];
    severity: SpendingAlert['severity'];
    message: string;
    currentAmount: number;
    limitAmount: number;
    percentage: number;
  }): Promise<SpendingAlert> {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: SpendingAlert = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      lineItemId: data.lineItemId,
      alertType: data.alertType,
      severity: data.severity,
      message: data.message,
      currentAmount: data.currentAmount,
      limitAmount: data.limitAmount,
      percentage: data.percentage,
      acknowledged: false,
      createdAt: new Date(),
    };

    this.alerts.set(id, alert);

    this.eventEmitter.emit('budget.alert_created', { alert });

    return alert;
  }

  async getAlerts(
    tenantId: string,
    filters?: {
      budgetId?: string;
      severity?: SpendingAlert['severity'];
      acknowledged?: boolean;
    },
  ): Promise<SpendingAlert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (filters?.budgetId) {
      alerts = alerts.filter((a) => a.budgetId === filters.budgetId);
    }

    if (filters?.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }

    if (filters?.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === filters.acknowledged);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<SpendingAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.alerts.set(alertId, alert);

    return alert;
  }

  // =================== STATISTICS ===================

  async getTrackingStatistics(tenantId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    pendingApproval: number;
    pendingTransfers: number;
    openCommitments: number;
    committedAmount: number;
    activeAlerts: number;
    criticalAlerts: number;
  }> {
    const transactions = Array.from(this.transactions.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    const transfers = Array.from(this.transfers.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    const commitments = Array.from(this.commitments.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    const alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId && !a.acknowledged,
    );

    return {
      totalTransactions: transactions.length,
      totalAmount: transactions
        .filter((t) => t.status === 'posted' && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
      pendingApproval: transactions.filter((t) => t.status === 'pending').length,
      pendingTransfers: transfers.filter((t) => t.status === 'pending').length,
      openCommitments: commitments.filter((c) => c.status === 'open').length,
      committedAmount: commitments
        .filter((c) => c.status === 'open')
        .reduce((sum, c) => sum + c.amount, 0),
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
    };
  }
}

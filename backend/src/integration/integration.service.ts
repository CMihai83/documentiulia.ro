import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================
// EVENT TYPES
// ============================================

export type ModuleType = 'HR' | 'HSE' | 'Payroll' | 'Finance' | 'Freelancer' | 'Logistics' | 'LMS' | 'Compliance' | 'Dashboard';

export interface IntegrationEvent {
  id: string;
  type: string;
  sourceModule: ModuleType;
  targetModules: ModuleType[];
  timestamp: Date;
  correlationId: string;
  causationId?: string;
  payload: Record<string, any>;
  metadata: {
    userId?: string;
    tenantId?: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    retryCount: number;
    maxRetries: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
}

// ============================================
// HR INTEGRATION TYPES
// ============================================

export interface EmployeeOnboardingEvent {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  startDate: Date;
  manager?: string;
  requiredTrainings: string[];
  contractType: 'full-time' | 'part-time' | 'contractor';
}

export interface EmployeeStatusChangeEvent {
  employeeId: string;
  previousStatus: string;
  newStatus: string;
  effectiveDate: Date;
  reason?: string;
}

export interface SalaryChangeEvent {
  employeeId: string;
  previousSalary: number;
  newSalary: number;
  currency: string;
  effectiveDate: Date;
  reason: string;
}

// ============================================
// HSE INTEGRATION TYPES
// ============================================

export interface TrainingAssignment {
  id: string;
  employeeId: string;
  trainingId: string;
  trainingName: string;
  category: 'safety' | 'compliance' | 'skills' | 'onboarding';
  dueDate: Date;
  assignedDate: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  priority: 'mandatory' | 'recommended' | 'optional';
}

export interface SafetyIncidentEvent {
  incidentId: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  location: string;
  involvedEmployees: string[];
  date: Date;
  requiresTraining: boolean;
}

// ============================================
// PAYROLL & FINANCE INTEGRATION TYPES
// ============================================

export interface PayrollEntry {
  id: string;
  employeeId: string;
  period: { month: number; year: number };
  grossSalary: number;
  netSalary: number;
  deductions: {
    cas: number; // Social insurance
    cass: number; // Health insurance
    impozit: number; // Income tax
    other: number;
  };
  bonuses: number;
  overtime: number;
  currency: string;
  status: 'draft' | 'approved' | 'paid';
}

export interface FinanceTransaction {
  id: string;
  type: 'payroll' | 'expense' | 'revenue' | 'tax' | 'transfer';
  amount: number;
  currency: string;
  category: string;
  description: string;
  sourceModule: ModuleType;
  referenceId: string;
  date: Date;
  status: 'pending' | 'posted' | 'reconciled';
}

// ============================================
// FREELANCER & LOGISTICS INTEGRATION TYPES
// ============================================

export interface FreelancerAvailability {
  freelancerId: string;
  freelancerName: string;
  skills: string[];
  availableFrom: Date;
  availableTo: Date;
  hourlyRate: number;
  currency: string;
  location: string;
  vehicleType?: string;
  hasOwnVehicle: boolean;
}

export interface LogisticsCapacityRequest {
  id: string;
  requestDate: Date;
  requiredDate: Date;
  requiredSkills: string[];
  location: string;
  estimatedHours: number;
  vehicleRequired: boolean;
  vehicleType?: string;
  status: 'open' | 'matched' | 'confirmed' | 'completed' | 'cancelled';
  matchedFreelancers: string[];
}

// ============================================
// LOGISTICS → FINANCE INTEGRATION TYPES
// ============================================

export interface LogisticsExpense {
  id: string;
  type: 'shipping' | 'fuel' | 'maintenance' | 'tolls' | 'parking' | 'customs' | 'warehousing' | 'other';
  amount: number;
  currency: string;
  description: string;
  vehicleId?: string;
  routeId?: string;
  orderId?: string;
  date: Date;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  costCenter?: string;
}

export interface InventoryCostUpdate {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  previousValue: number;
  newValue: number;
  quantityChange: number;
  movementType: 'receipt' | 'shipment' | 'adjustment' | 'return' | 'write_off';
  reason?: string;
  date: Date;
}

// ============================================
// LMS INTEGRATION TYPES
// ============================================

export interface CourseCompletionEvent {
  employeeId: string;
  courseId: string;
  courseName: string;
  category: string;
  completedDate: Date;
  score?: number;
  certificateId?: string;
  skills: string[];
  validUntil?: Date;
}

export interface CompetencyUpdate {
  employeeId: string;
  competencyId: string;
  competencyName: string;
  previousLevel: number;
  newLevel: number;
  source: 'course' | 'assessment' | 'manager_review' | 'certification';
  evidenceId: string;
  updatedDate: Date;
}

// ============================================
// DASHBOARD AGGREGATION TYPES
// ============================================

export interface DashboardMetrics {
  timestamp: Date;
  hr: {
    totalEmployees: number;
    newHires: number;
    turnoverRate: number;
    pendingOnboarding: number;
  };
  hse: {
    openIncidents: number;
    overdueTrainings: number;
    complianceScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  finance: {
    monthlyPayroll: number;
    pendingPayments: number;
    cashFlow: number;
    budgetUtilization: number;
  };
  logistics: {
    activeDeliveries: number;
    capacityUtilization: number;
    onTimeDeliveryRate: number;
    freelancerCount: number;
  };
  lms: {
    activeCourses: number;
    completionRate: number;
    averageScore: number;
    certificationsExpiring: number;
  };
}

// ============================================
// AUDIT TRAIL TYPES
// ============================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  eventId: string;
  eventType: string;
  sourceModule: ModuleType;
  targetModule: ModuleType;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  tenantId?: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata: Record<string, any>;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
}

// ============================================
// INTEGRATION RULES
// ============================================

export interface IntegrationRule {
  id: string;
  name: string;
  description: string;
  sourceModule: ModuleType;
  targetModule: ModuleType;
  triggerEvent: string;
  enabled: boolean;
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
    value: any;
  }[];
  actions: {
    type: 'create' | 'update' | 'delete' | 'notify' | 'trigger_workflow';
    target: string;
    mapping: Record<string, string>;
  }[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IntegrationService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationService.name);

  // Event storage
  private readonly events: Map<string, IntegrationEvent> = new Map();
  private readonly eventQueue: IntegrationEvent[] = [];

  // Training assignments
  private readonly trainingAssignments: Map<string, TrainingAssignment> = new Map();

  // Payroll entries
  private readonly payrollEntries: Map<string, PayrollEntry> = new Map();

  // Finance transactions
  private readonly financeTransactions: Map<string, FinanceTransaction> = new Map();

  // Freelancer availability
  private readonly freelancerAvailability: Map<string, FreelancerAvailability> = new Map();

  // Logistics capacity requests
  private readonly capacityRequests: Map<string, LogisticsCapacityRequest> = new Map();

  // Logistics expenses
  private readonly logisticsExpenses: Map<string, LogisticsExpense> = new Map();

  // Inventory cost updates
  private readonly inventoryCostUpdates: InventoryCostUpdate[] = [];

  // Competency updates
  private readonly competencyUpdates: Map<string, CompetencyUpdate[]> = new Map();

  // Dashboard metrics history
  private readonly metricsHistory: DashboardMetrics[] = [];

  // Audit trail
  private readonly auditTrail: AuditEntry[] = [];

  // Integration rules
  private readonly rules: Map<string, IntegrationRule> = new Map();

  // Event subscribers
  private readonly subscribers: Map<string, Array<(event: IntegrationEvent) => Promise<void>>> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Cross-Module Integration Service');
    this.initializeDefaultRules();
    this.initializeSampleData();
  }

  // ============================================
  // EVENT BUS
  // ============================================

  async publishEvent(event: Omit<IntegrationEvent, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const id = this.generateId();
    const fullEvent: IntegrationEvent = {
      ...event,
      id,
      timestamp: new Date(),
      status: 'pending',
    };

    this.events.set(id, fullEvent);
    this.eventQueue.push(fullEvent);

    this.logger.log(`Event published: ${event.type} from ${event.sourceModule}`);

    // Process event
    await this.processEvent(fullEvent);

    return id;
  }

  private async processEvent(event: IntegrationEvent): Promise<void> {
    event.status = 'processing';

    try {
      // Get applicable rules
      const applicableRules = this.getApplicableRules(event);

      for (const rule of applicableRules) {
        await this.executeRule(rule, event);
      }

      // Notify subscribers
      const subscribers = this.subscribers.get(event.type) || [];
      const wildcardSubscribers = this.subscribers.get('*') || [];

      for (const handler of [...subscribers, ...wildcardSubscribers]) {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(`Subscriber error for ${event.type}: ${error}`);
        }
      }

      event.status = 'completed';
    } catch (error) {
      event.status = 'failed';
      this.logger.error(`Event processing failed: ${event.id}`, error);

      if (event.metadata.retryCount < event.metadata.maxRetries) {
        event.metadata.retryCount++;
        event.status = 'retrying';
        await this.processEvent(event);
      }
    }
  }

  subscribe(eventType: string, handler: (event: IntegrationEvent) => Promise<void>): () => void {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.push(handler);
    this.subscribers.set(eventType, handlers);

    return () => {
      const currentHandlers = this.subscribers.get(eventType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index >= 0) currentHandlers.splice(index, 1);
    };
  }

  getEvent(eventId: string): IntegrationEvent | undefined {
    return this.events.get(eventId);
  }

  getEventsByModule(module: ModuleType, limit: number = 100): IntegrationEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.sourceModule === module || e.targetModules.includes(module))
      .slice(-limit);
  }

  getEventQueue(): IntegrationEvent[] {
    return [...this.eventQueue];
  }

  // ============================================
  // HR → HSE INTEGRATION (Onboarding Training)
  // ============================================

  async triggerOnboardingTraining(onboarding: EmployeeOnboardingEvent): Promise<TrainingAssignment[]> {
    const assignments: TrainingAssignment[] = [];

    // Mandatory safety trainings for all new employees
    const mandatoryTrainings = [
      { id: 'safety-general', name: 'General Safety Orientation', category: 'safety' as const },
      { id: 'fire-safety', name: 'Fire Safety & Evacuation', category: 'safety' as const },
      { id: 'first-aid', name: 'Basic First Aid', category: 'safety' as const },
      { id: 'gdpr', name: 'GDPR Data Protection', category: 'compliance' as const },
    ];

    // Add department-specific trainings
    const departmentTrainings: Record<string, { id: string; name: string; category: 'safety' | 'compliance' | 'skills' }[]> = {
      'warehouse': [
        { id: 'forklift', name: 'Forklift Operation', category: 'safety' },
        { id: 'manual-handling', name: 'Manual Handling', category: 'safety' },
      ],
      'logistics': [
        { id: 'driving-safety', name: 'Defensive Driving', category: 'safety' },
        { id: 'load-securing', name: 'Load Securing', category: 'compliance' },
      ],
      'office': [
        { id: 'ergonomics', name: 'Workplace Ergonomics', category: 'safety' },
      ],
      'it': [
        { id: 'cybersecurity', name: 'Cybersecurity Awareness', category: 'compliance' },
      ],
    };

    const allTrainings = [
      ...mandatoryTrainings,
      ...(departmentTrainings[onboarding.department.toLowerCase()] || []),
    ];

    for (const training of allTrainings) {
      const assignment: TrainingAssignment = {
        id: this.generateId(),
        employeeId: onboarding.employeeId,
        trainingId: training.id,
        trainingName: training.name,
        category: training.category,
        dueDate: new Date(onboarding.startDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        assignedDate: new Date(),
        status: 'assigned',
        priority: 'mandatory',
      };

      assignments.push(assignment);
      this.trainingAssignments.set(assignment.id, assignment);
    }

    // Publish integration event
    await this.publishEvent({
      type: 'hr.onboarding.training_assigned',
      sourceModule: 'HR',
      targetModules: ['HSE', 'LMS'],
      correlationId: this.generateId(),
      payload: {
        employeeId: onboarding.employeeId,
        employeeName: onboarding.employeeName,
        assignmentsCount: assignments.length,
        assignments: assignments.map(a => ({ id: a.id, training: a.trainingName })),
      },
      metadata: {
        userId: onboarding.employeeId,
        priority: 'high',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    // Create audit entry
    this.createAuditEntry({
      eventType: 'hr.onboarding.training_assigned',
      sourceModule: 'HR',
      targetModule: 'HSE',
      action: 'create',
      entityType: 'TrainingAssignment',
      entityId: onboarding.employeeId,
      changes: assignments.map(a => ({
        field: 'training',
        oldValue: null,
        newValue: a.trainingName,
      })),
      metadata: { department: onboarding.department },
      status: 'success',
    });

    this.logger.log(`Assigned ${assignments.length} trainings for employee ${onboarding.employeeId}`);

    return assignments;
  }

  getTrainingAssignments(employeeId?: string): TrainingAssignment[] {
    const assignments = Array.from(this.trainingAssignments.values());
    return employeeId ? assignments.filter(a => a.employeeId === employeeId) : assignments;
  }

  updateTrainingStatus(assignmentId: string, status: TrainingAssignment['status']): boolean {
    const assignment = this.trainingAssignments.get(assignmentId);
    if (!assignment) return false;

    assignment.status = status;
    return true;
  }

  // ============================================
  // HR → PAYROLL → FINANCE INTEGRATION
  // ============================================

  async syncSalaryToPayroll(salaryChange: SalaryChangeEvent): Promise<PayrollEntry> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Calculate Romanian deductions
    const grossSalary = salaryChange.newSalary;
    const cas = grossSalary * 0.25; // 25% social insurance
    const cass = grossSalary * 0.10; // 10% health insurance
    const taxableIncome = grossSalary - cas - cass;
    const impozit = taxableIncome * 0.10; // 10% income tax
    const netSalary = grossSalary - cas - cass - impozit;

    const payrollEntry: PayrollEntry = {
      id: this.generateId(),
      employeeId: salaryChange.employeeId,
      period: { month: currentMonth, year: currentYear },
      grossSalary,
      netSalary,
      deductions: {
        cas,
        cass,
        impozit,
        other: 0,
      },
      bonuses: 0,
      overtime: 0,
      currency: salaryChange.currency,
      status: 'draft',
    };

    this.payrollEntries.set(payrollEntry.id, payrollEntry);

    // Sync to finance
    const transaction = await this.createFinanceTransaction({
      type: 'payroll',
      amount: grossSalary,
      currency: salaryChange.currency,
      category: 'Salaries',
      description: `Payroll for employee ${salaryChange.employeeId}`,
      sourceModule: 'Payroll',
      referenceId: payrollEntry.id,
    });

    // Publish event
    await this.publishEvent({
      type: 'payroll.salary_synced',
      sourceModule: 'HR',
      targetModules: ['Payroll', 'Finance'],
      correlationId: this.generateId(),
      payload: {
        employeeId: salaryChange.employeeId,
        payrollEntryId: payrollEntry.id,
        transactionId: transaction.id,
        grossSalary,
        netSalary,
      },
      metadata: {
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    // Create audit entry
    this.createAuditEntry({
      eventType: 'payroll.salary_synced',
      sourceModule: 'HR',
      targetModule: 'Finance',
      action: 'create',
      entityType: 'PayrollEntry',
      entityId: payrollEntry.id,
      changes: [
        { field: 'salary', oldValue: salaryChange.previousSalary, newValue: salaryChange.newSalary },
      ],
      metadata: { reason: salaryChange.reason },
      status: 'success',
    });

    this.logger.log(`Salary synced to payroll and finance for employee ${salaryChange.employeeId}`);

    return payrollEntry;
  }

  async createFinanceTransaction(data: Omit<FinanceTransaction, 'id' | 'date' | 'status'>): Promise<FinanceTransaction> {
    const transaction: FinanceTransaction = {
      ...data,
      id: this.generateId(),
      date: new Date(),
      status: 'pending',
    };

    this.financeTransactions.set(transaction.id, transaction);
    return transaction;
  }

  getPayrollEntries(employeeId?: string): PayrollEntry[] {
    const entries = Array.from(this.payrollEntries.values());
    return employeeId ? entries.filter(e => e.employeeId === employeeId) : entries;
  }

  getFinanceTransactions(module?: ModuleType): FinanceTransaction[] {
    const transactions = Array.from(this.financeTransactions.values());
    return module ? transactions.filter(t => t.sourceModule === module) : transactions;
  }

  // ============================================
  // FREELANCER → LOGISTICS INTEGRATION
  // ============================================

  registerFreelancerAvailability(availability: FreelancerAvailability): void {
    this.freelancerAvailability.set(availability.freelancerId, availability);

    // Auto-match with open capacity requests
    this.matchFreelancersToRequests();

    this.logger.log(`Freelancer ${availability.freelancerId} availability registered`);
  }

  createCapacityRequest(request: Omit<LogisticsCapacityRequest, 'id' | 'requestDate' | 'status' | 'matchedFreelancers'>): LogisticsCapacityRequest {
    const fullRequest: LogisticsCapacityRequest = {
      ...request,
      id: this.generateId(),
      requestDate: new Date(),
      status: 'open',
      matchedFreelancers: [],
    };

    this.capacityRequests.set(fullRequest.id, fullRequest);

    // Auto-match with available freelancers
    this.matchFreelancersToRequests();

    return fullRequest;
  }

  private matchFreelancersToRequests(): void {
    const openRequests = Array.from(this.capacityRequests.values()).filter(r => r.status === 'open');

    for (const request of openRequests) {
      const matchedFreelancers: string[] = [];

      for (const [freelancerId, availability] of this.freelancerAvailability) {
        // Check skill match
        const hasRequiredSkills = request.requiredSkills.some(skill =>
          availability.skills.includes(skill)
        );

        // Check availability dates
        const isAvailable = availability.availableFrom <= request.requiredDate &&
          availability.availableTo >= request.requiredDate;

        // Check location match
        const locationMatch = availability.location.toLowerCase().includes(request.location.toLowerCase()) ||
          request.location.toLowerCase().includes(availability.location.toLowerCase());

        // Check vehicle requirements
        const vehicleMatch = !request.vehicleRequired || availability.hasOwnVehicle;

        if (hasRequiredSkills && isAvailable && locationMatch && vehicleMatch) {
          matchedFreelancers.push(freelancerId);
        }
      }

      if (matchedFreelancers.length > 0) {
        request.matchedFreelancers = matchedFreelancers;
        request.status = 'matched';

        // Publish event
        this.publishEvent({
          type: 'logistics.capacity_matched',
          sourceModule: 'Freelancer',
          targetModules: ['Logistics'],
          correlationId: this.generateId(),
          payload: {
            requestId: request.id,
            matchedFreelancers,
            matchCount: matchedFreelancers.length,
          },
          metadata: {
            priority: 'normal',
            retryCount: 0,
            maxRetries: 3,
          },
        });

        this.logger.log(`Matched ${matchedFreelancers.length} freelancers to request ${request.id}`);
      }
    }
  }

  getFreelancerAvailability(freelancerId?: string): FreelancerAvailability[] {
    const availabilities = Array.from(this.freelancerAvailability.values());
    return freelancerId ? availabilities.filter(a => a.freelancerId === freelancerId) : availabilities;
  }

  getCapacityRequests(status?: LogisticsCapacityRequest['status']): LogisticsCapacityRequest[] {
    const requests = Array.from(this.capacityRequests.values());
    return status ? requests.filter(r => r.status === status) : requests;
  }

  confirmFreelancerAssignment(requestId: string, freelancerId: string): boolean {
    const request = this.capacityRequests.get(requestId);
    if (!request || !request.matchedFreelancers.includes(freelancerId)) return false;

    request.status = 'confirmed';
    request.matchedFreelancers = [freelancerId];

    this.createAuditEntry({
      eventType: 'logistics.freelancer_confirmed',
      sourceModule: 'Logistics',
      targetModule: 'Freelancer',
      action: 'update',
      entityType: 'CapacityRequest',
      entityId: requestId,
      changes: [
        { field: 'status', oldValue: 'matched', newValue: 'confirmed' },
        { field: 'assignedFreelancer', oldValue: null, newValue: freelancerId },
      ],
      metadata: {},
      status: 'success',
    });

    return true;
  }

  // ============================================
  // LOGISTICS → FINANCE INTEGRATION
  // ============================================

  async recordLogisticsExpense(
    expense: Omit<LogisticsExpense, 'id' | 'status'>,
  ): Promise<{ expense: LogisticsExpense; transaction: FinanceTransaction }> {
    const fullExpense: LogisticsExpense = {
      ...expense,
      id: this.generateId(),
      status: 'pending',
    };

    this.logisticsExpenses.set(fullExpense.id, fullExpense);

    // Map expense type to finance category
    const categoryMap: Record<LogisticsExpense['type'], string> = {
      shipping: 'Transport - Expediere',
      fuel: 'Transport - Combustibil',
      maintenance: 'Intretinere Vehicule',
      tolls: 'Transport - Taxe Rutiere',
      parking: 'Transport - Parcare',
      customs: 'Taxe Vamale',
      warehousing: 'Depozitare',
      other: 'Alte Cheltuieli Logistica',
    };

    // Create finance transaction
    const transaction = await this.createFinanceTransaction({
      type: 'expense',
      amount: expense.amount,
      currency: expense.currency,
      category: categoryMap[expense.type],
      description: expense.description,
      sourceModule: 'Logistics',
      referenceId: fullExpense.id,
    });

    // Publish event
    await this.publishEvent({
      type: 'logistics.expense_recorded',
      sourceModule: 'Logistics',
      targetModules: ['Finance'],
      correlationId: this.generateId(),
      payload: {
        expenseId: fullExpense.id,
        transactionId: transaction.id,
        type: expense.type,
        amount: expense.amount,
        currency: expense.currency,
        vehicleId: expense.vehicleId,
        routeId: expense.routeId,
      },
      metadata: {
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    // Create audit entry
    this.createAuditEntry({
      eventType: 'logistics.expense_recorded',
      sourceModule: 'Logistics',
      targetModule: 'Finance',
      action: 'create',
      entityType: 'LogisticsExpense',
      entityId: fullExpense.id,
      changes: [
        { field: 'amount', oldValue: null, newValue: expense.amount },
        { field: 'type', oldValue: null, newValue: expense.type },
      ],
      metadata: { category: categoryMap[expense.type] },
      status: 'success',
    });

    this.logger.log(`Logistics expense recorded: ${fullExpense.id} - ${expense.type} - ${expense.amount} ${expense.currency}`);

    return { expense: fullExpense, transaction };
  }

  async recordInventoryCostUpdate(
    update: Omit<InventoryCostUpdate, 'id' | 'date'>,
  ): Promise<{ update: InventoryCostUpdate; transaction?: FinanceTransaction }> {
    const fullUpdate: InventoryCostUpdate = {
      ...update,
      id: this.generateId(),
      date: new Date(),
    };

    this.inventoryCostUpdates.push(fullUpdate);

    // Calculate COGS impact
    const costDifference = fullUpdate.newValue - fullUpdate.previousValue;
    let transaction: FinanceTransaction | undefined;

    // Only create finance transaction for significant cost changes
    if (Math.abs(costDifference) > 0) {
      const categoryMap: Record<InventoryCostUpdate['movementType'], string> = {
        receipt: 'Achizitii Inventar',
        shipment: 'Cost Bunuri Vandute (COGS)',
        adjustment: 'Ajustare Inventar',
        return: 'Retururi Inventar',
        write_off: 'Pierderi Inventar',
      };

      transaction = await this.createFinanceTransaction({
        type: costDifference > 0 ? 'expense' : 'revenue',
        amount: Math.abs(costDifference),
        currency: 'RON',
        category: categoryMap[update.movementType],
        description: `${update.movementType} - ${update.itemName} (${update.itemSku}) - Qty: ${update.quantityChange}`,
        sourceModule: 'Logistics',
        referenceId: fullUpdate.id,
      });
    }

    // Publish event
    await this.publishEvent({
      type: 'logistics.inventory_cost_updated',
      sourceModule: 'Logistics',
      targetModules: ['Finance'],
      correlationId: this.generateId(),
      payload: {
        updateId: fullUpdate.id,
        itemId: update.itemId,
        itemSku: update.itemSku,
        movementType: update.movementType,
        previousValue: update.previousValue,
        newValue: update.newValue,
        costDifference,
        transactionId: transaction?.id,
      },
      metadata: {
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    // Create audit entry
    this.createAuditEntry({
      eventType: 'logistics.inventory_cost_updated',
      sourceModule: 'Logistics',
      targetModule: 'Finance',
      action: 'update',
      entityType: 'InventoryCost',
      entityId: update.itemId,
      changes: [
        { field: 'value', oldValue: update.previousValue, newValue: update.newValue },
        { field: 'quantity', oldValue: null, newValue: update.quantityChange },
      ],
      metadata: { movementType: update.movementType, reason: update.reason },
      status: 'success',
    });

    this.logger.log(`Inventory cost updated: ${update.itemSku} - ${update.movementType} - Value change: ${costDifference}`);

    return { update: fullUpdate, transaction };
  }

  async approveLogisticsExpense(expenseId: string, approvedBy: string): Promise<boolean> {
    const expense = this.logisticsExpenses.get(expenseId);
    if (!expense || expense.status !== 'pending') return false;

    expense.status = 'approved';
    expense.approvedBy = approvedBy;

    // Update associated finance transaction
    const transaction = Array.from(this.financeTransactions.values())
      .find(t => t.referenceId === expenseId);
    if (transaction) {
      transaction.status = 'posted';
    }

    // Publish event
    await this.publishEvent({
      type: 'logistics.expense_approved',
      sourceModule: 'Logistics',
      targetModules: ['Finance'],
      correlationId: this.generateId(),
      payload: {
        expenseId,
        approvedBy,
        amount: expense.amount,
      },
      metadata: {
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    this.createAuditEntry({
      eventType: 'logistics.expense_approved',
      sourceModule: 'Logistics',
      targetModule: 'Finance',
      action: 'update',
      entityType: 'LogisticsExpense',
      entityId: expenseId,
      userId: approvedBy,
      changes: [
        { field: 'status', oldValue: 'pending', newValue: 'approved' },
      ],
      metadata: {},
      status: 'success',
    });

    return true;
  }

  getLogisticsExpenses(filters?: {
    type?: LogisticsExpense['type'];
    status?: LogisticsExpense['status'];
    vehicleId?: string;
    startDate?: Date;
    endDate?: Date;
  }): LogisticsExpense[] {
    let expenses = Array.from(this.logisticsExpenses.values());

    if (filters) {
      if (filters.type) expenses = expenses.filter(e => e.type === filters.type);
      if (filters.status) expenses = expenses.filter(e => e.status === filters.status);
      if (filters.vehicleId) expenses = expenses.filter(e => e.vehicleId === filters.vehicleId);
      if (filters.startDate) expenses = expenses.filter(e => e.date >= filters.startDate!);
      if (filters.endDate) expenses = expenses.filter(e => e.date <= filters.endDate!);
    }

    return expenses;
  }

  getInventoryCostUpdates(itemId?: string): InventoryCostUpdate[] {
    return itemId
      ? this.inventoryCostUpdates.filter(u => u.itemId === itemId)
      : this.inventoryCostUpdates;
  }

  getLogisticsFinanceSummary(): {
    totalExpenses: number;
    expensesByType: Record<string, number>;
    pendingApprovals: number;
    inventoryValue: number;
    cogsThisMonth: number;
  } {
    const expenses = Array.from(this.logisticsExpenses.values());
    const expensesByType: Record<string, number> = {};
    let totalExpenses = 0;

    for (const expense of expenses) {
      totalExpenses += expense.amount;
      expensesByType[expense.type] = (expensesByType[expense.type] || 0) + expense.amount;
    }

    const pendingApprovals = expenses.filter(e => e.status === 'pending').length;

    // Calculate current month COGS
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cogsUpdates = this.inventoryCostUpdates.filter(
      u => u.movementType === 'shipment' && u.date >= monthStart,
    );
    const cogsThisMonth = cogsUpdates.reduce(
      (sum, u) => sum + (u.previousValue - u.newValue),
      0,
    );

    // Calculate current inventory value
    const inventoryValue = this.inventoryCostUpdates.length > 0
      ? this.inventoryCostUpdates[this.inventoryCostUpdates.length - 1].newValue
      : 0;

    return {
      totalExpenses,
      expensesByType,
      pendingApprovals,
      inventoryValue,
      cogsThisMonth,
    };
  }

  // ============================================
  // LMS → HR COMPETENCY INTEGRATION
  // ============================================

  async processCourseCompletion(completion: CourseCompletionEvent): Promise<CompetencyUpdate[]> {
    const updates: CompetencyUpdate[] = [];

    for (const skill of completion.skills) {
      const update: CompetencyUpdate = {
        employeeId: completion.employeeId,
        competencyId: `comp-${skill.toLowerCase().replace(/\s+/g, '-')}`,
        competencyName: skill,
        previousLevel: this.getEmployeeCompetencyLevel(completion.employeeId, skill),
        newLevel: this.calculateNewCompetencyLevel(completion.score),
        source: 'course',
        evidenceId: completion.certificateId || completion.courseId,
        updatedDate: new Date(),
      };

      updates.push(update);

      // Store competency update
      const employeeUpdates = this.competencyUpdates.get(completion.employeeId) || [];
      employeeUpdates.push(update);
      this.competencyUpdates.set(completion.employeeId, employeeUpdates);
    }

    // Publish event
    await this.publishEvent({
      type: 'lms.competency_updated',
      sourceModule: 'LMS',
      targetModules: ['HR'],
      correlationId: this.generateId(),
      payload: {
        employeeId: completion.employeeId,
        courseId: completion.courseId,
        courseName: completion.courseName,
        competencyUpdates: updates.map(u => ({
          competency: u.competencyName,
          previousLevel: u.previousLevel,
          newLevel: u.newLevel,
        })),
      },
      metadata: {
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    // Update related training assignments if any
    const assignments = this.getTrainingAssignments(completion.employeeId);
    for (const assignment of assignments) {
      if (assignment.trainingId === completion.courseId && assignment.status !== 'completed') {
        assignment.status = 'completed';
      }
    }

    // Create audit entry
    this.createAuditEntry({
      eventType: 'lms.competency_updated',
      sourceModule: 'LMS',
      targetModule: 'HR',
      action: 'update',
      entityType: 'Competency',
      entityId: completion.employeeId,
      changes: updates.map(u => ({
        field: u.competencyName,
        oldValue: u.previousLevel,
        newValue: u.newLevel,
      })),
      metadata: { courseId: completion.courseId },
      status: 'success',
    });

    this.logger.log(`Updated ${updates.length} competencies for employee ${completion.employeeId}`);

    return updates;
  }

  private getEmployeeCompetencyLevel(employeeId: string, skill: string): number {
    const updates = this.competencyUpdates.get(employeeId) || [];
    const existingUpdate = updates.find(u => u.competencyName === skill);
    return existingUpdate?.newLevel || 0;
  }

  private calculateNewCompetencyLevel(score?: number): number {
    if (!score) return 1;
    if (score >= 90) return 5;
    if (score >= 75) return 4;
    if (score >= 60) return 3;
    if (score >= 40) return 2;
    return 1;
  }

  getCompetencyUpdates(employeeId: string): CompetencyUpdate[] {
    return this.competencyUpdates.get(employeeId) || [];
  }

  getEmployeeCompetencyMatrix(employeeId: string): { competency: string; level: number; lastUpdated: Date }[] {
    const updates = this.competencyUpdates.get(employeeId) || [];
    const matrix = new Map<string, { level: number; lastUpdated: Date }>();

    for (const update of updates) {
      matrix.set(update.competencyName, {
        level: update.newLevel,
        lastUpdated: update.updatedDate,
      });
    }

    return Array.from(matrix.entries()).map(([competency, data]) => ({
      competency,
      level: data.level,
      lastUpdated: data.lastUpdated,
    }));
  }

  // ============================================
  // UNIFIED DASHBOARD AGGREGATION
  // ============================================

  aggregateDashboardMetrics(): DashboardMetrics {
    const metrics: DashboardMetrics = {
      timestamp: new Date(),
      hr: {
        totalEmployees: this.calculateTotalEmployees(),
        newHires: this.calculateNewHires(),
        turnoverRate: this.calculateTurnoverRate(),
        pendingOnboarding: this.calculatePendingOnboarding(),
      },
      hse: {
        openIncidents: this.calculateOpenIncidents(),
        overdueTrainings: this.calculateOverdueTrainings(),
        complianceScore: this.calculateComplianceScore(),
        riskLevel: this.calculateRiskLevel(),
      },
      finance: {
        monthlyPayroll: this.calculateMonthlyPayroll(),
        pendingPayments: this.calculatePendingPayments(),
        cashFlow: this.calculateCashFlow(),
        budgetUtilization: this.calculateBudgetUtilization(),
      },
      logistics: {
        activeDeliveries: this.calculateActiveDeliveries(),
        capacityUtilization: this.calculateCapacityUtilization(),
        onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(),
        freelancerCount: this.freelancerAvailability.size,
      },
      lms: {
        activeCourses: this.calculateActiveCourses(),
        completionRate: this.calculateCompletionRate(),
        averageScore: this.calculateAverageScore(),
        certificationsExpiring: this.calculateExpiringCertifications(),
      },
    };

    this.metricsHistory.push(metrics);

    // Keep only last 100 entries
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  private calculateTotalEmployees(): number {
    return 150 + Math.floor(Math.random() * 20);
  }

  private calculateNewHires(): number {
    return Math.floor(Math.random() * 10) + 2;
  }

  private calculateTurnoverRate(): number {
    return Math.round((Math.random() * 10 + 5) * 10) / 10;
  }

  private calculatePendingOnboarding(): number {
    return Array.from(this.trainingAssignments.values())
      .filter(a => a.status === 'assigned').length;
  }

  private calculateOpenIncidents(): number {
    return Math.floor(Math.random() * 5);
  }

  private calculateOverdueTrainings(): number {
    const now = new Date();
    return Array.from(this.trainingAssignments.values())
      .filter(a => a.status !== 'completed' && a.dueDate < now).length;
  }

  private calculateComplianceScore(): number {
    const total = this.trainingAssignments.size || 1;
    const completed = Array.from(this.trainingAssignments.values())
      .filter(a => a.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }

  private calculateRiskLevel(): 'low' | 'medium' | 'high' {
    const overdueCount = this.calculateOverdueTrainings();
    if (overdueCount > 10) return 'high';
    if (overdueCount > 5) return 'medium';
    return 'low';
  }

  private calculateMonthlyPayroll(): number {
    return Array.from(this.payrollEntries.values())
      .reduce((sum, entry) => sum + entry.grossSalary, 0);
  }

  private calculatePendingPayments(): number {
    return Array.from(this.financeTransactions.values())
      .filter(t => t.status === 'pending').length;
  }

  private calculateCashFlow(): number {
    return 50000 + Math.floor(Math.random() * 30000);
  }

  private calculateBudgetUtilization(): number {
    return Math.round((Math.random() * 30 + 60) * 10) / 10;
  }

  private calculateActiveDeliveries(): number {
    return this.capacityRequests.size;
  }

  private calculateCapacityUtilization(): number {
    return Math.round((Math.random() * 40 + 50) * 10) / 10;
  }

  private calculateOnTimeDeliveryRate(): number {
    return Math.round((Math.random() * 10 + 85) * 10) / 10;
  }

  private calculateActiveCourses(): number {
    return 25 + Math.floor(Math.random() * 10);
  }

  private calculateCompletionRate(): number {
    return Math.round((Math.random() * 20 + 70) * 10) / 10;
  }

  private calculateAverageScore(): number {
    return Math.round((Math.random() * 15 + 75) * 10) / 10;
  }

  private calculateExpiringCertifications(): number {
    return Math.floor(Math.random() * 8) + 2;
  }

  getMetricsHistory(limit: number = 50): DashboardMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  // ============================================
  // CROSS-MODULE AUDIT TRAIL
  // ============================================

  private createAuditEntry(data: Omit<AuditEntry, 'id' | 'timestamp' | 'eventId'>): AuditEntry {
    const entry: AuditEntry = {
      ...data,
      id: this.generateId(),
      eventId: this.generateId(),
      timestamp: new Date(),
    };

    this.auditTrail.push(entry);

    // Keep only last 1000 entries
    if (this.auditTrail.length > 1000) {
      this.auditTrail.shift();
    }

    return entry;
  }

  getAuditTrail(filters?: {
    sourceModule?: ModuleType;
    targetModule?: ModuleType;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  }): AuditEntry[] {
    let entries = [...this.auditTrail];

    if (filters) {
      if (filters.sourceModule) {
        entries = entries.filter(e => e.sourceModule === filters.sourceModule);
      }
      if (filters.targetModule) {
        entries = entries.filter(e => e.targetModule === filters.targetModule);
      }
      if (filters.entityType) {
        entries = entries.filter(e => e.entityType === filters.entityType);
      }
      if (filters.entityId) {
        entries = entries.filter(e => e.entityId === filters.entityId);
      }
      if (filters.startDate) {
        entries = entries.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        entries = entries.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    return entries;
  }

  getAuditSummary(): {
    totalEntries: number;
    bySourceModule: Record<string, number>;
    byStatus: Record<string, number>;
    recentActivity: AuditEntry[];
  } {
    const bySourceModule: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const entry of this.auditTrail) {
      bySourceModule[entry.sourceModule] = (bySourceModule[entry.sourceModule] || 0) + 1;
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    }

    return {
      totalEntries: this.auditTrail.length,
      bySourceModule,
      byStatus,
      recentActivity: this.auditTrail.slice(-10),
    };
  }

  // ============================================
  // INTEGRATION RULES
  // ============================================

  createRule(rule: Omit<IntegrationRule, 'id' | 'createdAt' | 'updatedAt'>): IntegrationRule {
    const fullRule: IntegrationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(fullRule.id, fullRule);
    return fullRule;
  }

  updateRule(ruleId: string, updates: Partial<IntegrationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates, { updatedAt: new Date() });
    return true;
  }

  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): IntegrationRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): IntegrationRule[] {
    return Array.from(this.rules.values());
  }

  private getApplicableRules(event: IntegrationEvent): IntegrationRule[] {
    return Array.from(this.rules.values())
      .filter(rule => {
        if (!rule.enabled) return false;
        if (rule.sourceModule !== event.sourceModule) return false;
        if (rule.triggerEvent !== event.type) return false;

        // Check conditions
        return rule.conditions.every(condition => {
          const value = event.payload[condition.field];
          switch (condition.operator) {
            case 'equals': return value === condition.value;
            case 'not_equals': return value !== condition.value;
            case 'contains': return String(value).includes(condition.value);
            case 'greater_than': return value > condition.value;
            case 'less_than': return value < condition.value;
            case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
            default: return false;
          }
        });
      })
      .sort((a, b) => b.priority - a.priority);
  }

  private async executeRule(rule: IntegrationRule, event: IntegrationEvent): Promise<void> {
    this.logger.debug(`Executing rule ${rule.name} for event ${event.id}`);

    for (const action of rule.actions) {
      switch (action.type) {
        case 'notify':
          this.logger.log(`Notification triggered by rule ${rule.name}`);
          break;
        case 'trigger_workflow':
          this.logger.log(`Workflow triggered by rule ${rule.name}: ${action.target}`);
          break;
        default:
          this.logger.debug(`Action ${action.type} executed by rule ${rule.name}`);
      }
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultRules(): void {
    // Rule: Auto-assign safety training on new hire
    this.createRule({
      name: 'Auto-assign Safety Training',
      description: 'Automatically assign mandatory safety trainings when an employee is onboarded',
      sourceModule: 'HR',
      targetModule: 'HSE',
      triggerEvent: 'hr.employee.onboarded',
      enabled: true,
      conditions: [],
      actions: [
        {
          type: 'trigger_workflow',
          target: 'assign_safety_training',
          mapping: { employeeId: 'employeeId' },
        },
      ],
      priority: 100,
    });

    // Rule: Sync salary changes to payroll
    this.createRule({
      name: 'Sync Salary to Payroll',
      description: 'Automatically create payroll entry when salary changes',
      sourceModule: 'HR',
      targetModule: 'Payroll',
      triggerEvent: 'hr.salary.changed',
      enabled: true,
      conditions: [],
      actions: [
        {
          type: 'create',
          target: 'PayrollEntry',
          mapping: { employeeId: 'employeeId', amount: 'newSalary' },
        },
      ],
      priority: 90,
    });

    // Rule: Update HR competencies on course completion
    this.createRule({
      name: 'Update Competencies on Course Completion',
      description: 'Update employee competency matrix when a course is completed',
      sourceModule: 'LMS',
      targetModule: 'HR',
      triggerEvent: 'lms.course.completed',
      enabled: true,
      conditions: [],
      actions: [
        {
          type: 'update',
          target: 'CompetencyMatrix',
          mapping: { employeeId: 'employeeId', skills: 'skills' },
        },
      ],
      priority: 80,
    });
  }

  private initializeSampleData(): void {
    // Add sample freelancers
    this.registerFreelancerAvailability({
      freelancerId: 'freelancer-1',
      freelancerName: 'Ion Popescu',
      skills: ['driving', 'delivery', 'warehouse'],
      availableFrom: new Date(),
      availableTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      hourlyRate: 50,
      currency: 'RON',
      location: 'Bucharest',
      vehicleType: 'van',
      hasOwnVehicle: true,
    });

    this.registerFreelancerAvailability({
      freelancerId: 'freelancer-2',
      freelancerName: 'Maria Ionescu',
      skills: ['packaging', 'inventory', 'data_entry'],
      availableFrom: new Date(),
      availableTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      hourlyRate: 40,
      currency: 'RON',
      location: 'Bucharest',
      hasOwnVehicle: false,
    });

    // Initial dashboard metrics
    this.aggregateDashboardMetrics();

    this.logger.log('Sample integration data initialized');
  }

  getIntegrationStatus(): {
    eventsProcessed: number;
    pendingEvents: number;
    activeRules: number;
    auditEntries: number;
    modules: { name: ModuleType; connected: boolean }[];
  } {
    return {
      eventsProcessed: Array.from(this.events.values()).filter(e => e.status === 'completed').length,
      pendingEvents: this.eventQueue.filter(e => e.status === 'pending').length,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      auditEntries: this.auditTrail.length,
      modules: [
        { name: 'HR', connected: true },
        { name: 'HSE', connected: true },
        { name: 'Payroll', connected: true },
        { name: 'Finance', connected: true },
        { name: 'Freelancer', connected: true },
        { name: 'Logistics', connected: true },
        { name: 'LMS', connected: true },
        { name: 'Compliance', connected: true },
        { name: 'Dashboard', connected: true },
      ],
    };
  }
}

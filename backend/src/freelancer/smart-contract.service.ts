import { Injectable } from '@nestjs/common';

// Smart Contracts & Escrow Payments Service
// Milestone-based payments with escrow, smart contract execution, and automated disbursement

// ===== TYPES =====

export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'TERMINATED';
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID';
export type PaymentStatus = 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'REFUNDED' | 'DISPUTED' | 'CANCELLED';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'MEDIATION' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
export type DisputeResolution = 'FAVOR_CLIENT' | 'FAVOR_FREELANCER' | 'SPLIT' | 'MUTUAL_AGREEMENT' | 'CANCELLED';

export interface ContractParty {
  id: string;
  type: 'CLIENT' | 'FREELANCER';
  name: string;
  email: string;
  companyName?: string;
  taxId?: string; // CUI/CIF for Romanian entities
  address?: string;
  signedAt?: Date;
  signatureHash?: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description: string;
  deliverables: string[];

  // Timeline
  dueDate: Date;
  startedAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;

  // Payment
  amount: number;
  currency: string;

  // Status
  status: MilestoneStatus;
  order: number;

  // Review
  revisionCount: number;
  maxRevisions: number;
  reviewNotes?: string;

  // Deliverable uploads
  attachments: {
    id: string;
    filename: string;
    url: string;
    uploadedAt: Date;
  }[];
}

export interface EscrowPayment {
  id: string;
  contractId: string;
  milestoneId?: string;

  // Payment details
  amount: number;
  currency: string;

  // Stripe
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  stripeChargeId?: string;

  // Status
  status: PaymentStatus;

  // Parties
  payerId: string;
  payeeId: string;

  // Fees
  platformFee: number;
  platformFeePercent: number;
  stripeFee: number;
  netAmount: number;

  // Timestamps
  createdAt: Date;
  heldAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
}

export interface SmartContract {
  id: string;
  projectId: string;

  // Parties
  client: ContractParty;
  freelancer: ContractParty;

  // Contract details
  title: string;
  description: string;
  scope: string;

  // Terms
  paymentType: 'FIXED' | 'HOURLY' | 'MILESTONE';
  totalAmount: number;
  currency: string;
  hourlyRate?: number;
  estimatedHours?: number;

  // Timeline
  startDate: Date;
  endDate: Date;

  // Milestones
  milestones: Milestone[];

  // Status
  status: ContractStatus;

  // Legal
  termsAccepted: boolean;
  ndaRequired: boolean;
  ndaSigned: boolean;
  ipClause: 'CLIENT_OWNS_ALL' | 'FREELANCER_RETAINS_RIGHTS' | 'SHARED' | 'CUSTOM';
  customIpTerms?: string;

  // Jurisdiction
  governingLaw: string; // Country code
  disputeResolution: 'MEDIATION' | 'ARBITRATION' | 'COURT';

  // Auto-release settings
  autoReleaseEnabled: boolean;
  autoReleaseDelayDays: number; // Days after approval before auto-release

  // Cancellation
  cancellationPolicy: 'FLEXIBLE' | 'MODERATE' | 'STRICT';
  cancellationFee: number; // Percentage

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  completedAt?: Date;
}

export interface Dispute {
  id: string;
  contractId: string;
  milestoneId?: string;

  // Parties
  initiatedBy: 'CLIENT' | 'FREELANCER';
  initiatorId: string;

  // Details
  reason: 'QUALITY' | 'DEADLINE' | 'SCOPE_CHANGE' | 'NON_PAYMENT' | 'NON_DELIVERY' | 'COMMUNICATION' | 'OTHER';
  description: string;

  // Evidence
  evidence: {
    id: string;
    type: 'DOCUMENT' | 'IMAGE' | 'MESSAGE' | 'SCREENSHOT';
    description: string;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
  }[];

  // Amount in dispute
  disputedAmount: number;
  currency: string;

  // Status
  status: DisputeStatus;

  // Resolution
  resolution?: DisputeResolution;
  resolutionDetails?: string;
  clientRefund?: number;
  freelancerPayment?: number;

  // Mediator
  mediatorId?: string;
  mediatorAssignedAt?: Date;

  // Timeline
  responseDeadline: Date;

  // Messages
  messages: {
    id: string;
    senderId: string;
    senderType: 'CLIENT' | 'FREELANCER' | 'MEDIATOR' | 'SYSTEM';
    message: string;
    attachments: string[];
    sentAt: Date;
  }[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface Invoice {
  id: string;
  contractId: string;
  milestoneId?: string;

  // Invoice details
  invoiceNumber: string;
  series: string;

  // Parties
  issuerId: string;
  issuerName: string;
  issuerTaxId?: string;
  issuerAddress?: string;

  recipientId: string;
  recipientName: string;
  recipientTaxId?: string;
  recipientAddress?: string;

  // Line items
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    vatRate: number;
    vatAmount: number;
  }[];

  // Totals
  subtotal: number;
  vatTotal: number;
  total: number;
  currency: string;

  // VAT
  vatApplicable: boolean;
  reverseCharge: boolean; // For EU cross-border B2B

  // Payment
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: Date;
  paidAt?: Date;

  // Romanian compliance
  eFacturaId?: string; // ANAF e-Factura ID
  eFacturaStatus?: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

  // Timestamps
  issuedAt: Date;
  createdAt: Date;
}

// Platform fee structure
const PLATFORM_FEES = {
  'STANDARD': 0.10, // 10%
  'PREMIUM': 0.05, // 5% for premium accounts
  'ENTERPRISE': 0.03, // 3% for enterprise
};

// Stripe fees (simplified)
const STRIPE_FEES = {
  'EU': { percent: 0.014, fixed: 0.25 }, // 1.4% + €0.25
  'NON_EU': { percent: 0.029, fixed: 0.25 }, // 2.9% + €0.25
};

// Romanian VAT rates
const VAT_RATES = {
  'STANDARD': 0.19, // 19% standard (will be 21% from Aug 2025)
  'REDUCED': 0.09, // 9% reduced
  'SUPER_REDUCED': 0.05, // 5% super reduced
};

@Injectable()
export class SmartContractService {
  // In-memory storage
  private contracts = new Map<string, SmartContract>();
  private milestones = new Map<string, Milestone>();
  private escrowPayments = new Map<string, EscrowPayment>();
  private disputes = new Map<string, Dispute>();
  private invoices = new Map<string, Invoice>();

  private invoiceCounter = 1000;

  constructor() {}

  // Reset for testing
  resetState(): void {
    this.contracts.clear();
    this.milestones.clear();
    this.escrowPayments.clear();
    this.disputes.clear();
    this.invoices.clear();
    this.invoiceCounter = 1000;
  }

  // ===== CONTRACT MANAGEMENT =====

  async createContract(data: {
    projectId: string;
    client: Omit<ContractParty, 'signedAt' | 'signatureHash'>;
    freelancer: Omit<ContractParty, 'signedAt' | 'signatureHash'>;
    title: string;
    description: string;
    scope: string;
    paymentType: SmartContract['paymentType'];
    totalAmount: number;
    currency: string;
    hourlyRate?: number;
    estimatedHours?: number;
    startDate: Date;
    endDate: Date;
    ndaRequired: boolean;
    ipClause: SmartContract['ipClause'];
    customIpTerms?: string;
    governingLaw: string;
    disputeResolution: SmartContract['disputeResolution'];
    autoReleaseEnabled: boolean;
    autoReleaseDelayDays: number;
    cancellationPolicy: SmartContract['cancellationPolicy'];
    cancellationFee: number;
    milestones: Omit<Milestone, 'id' | 'contractId' | 'status' | 'revisionCount' | 'attachments' | 'startedAt' | 'submittedAt' | 'approvedAt'>[];
  }): Promise<SmartContract> {
    const contractId = `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create milestones
    const contractMilestones: Milestone[] = data.milestones.map((m, index) => {
      const milestone: Milestone = {
        id: `milestone-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        contractId,
        title: m.title,
        description: m.description,
        deliverables: m.deliverables,
        dueDate: m.dueDate,
        amount: m.amount,
        currency: m.currency,
        status: 'PENDING',
        order: m.order,
        revisionCount: 0,
        maxRevisions: m.maxRevisions,
        attachments: [],
      };
      this.milestones.set(milestone.id, milestone);
      return milestone;
    });

    const contract: SmartContract = {
      id: contractId,
      projectId: data.projectId,
      client: { ...data.client },
      freelancer: { ...data.freelancer },
      title: data.title,
      description: data.description,
      scope: data.scope,
      paymentType: data.paymentType,
      totalAmount: data.totalAmount,
      currency: data.currency,
      hourlyRate: data.hourlyRate,
      estimatedHours: data.estimatedHours,
      startDate: data.startDate,
      endDate: data.endDate,
      milestones: contractMilestones,
      status: 'DRAFT',
      termsAccepted: false,
      ndaRequired: data.ndaRequired,
      ndaSigned: false,
      ipClause: data.ipClause,
      customIpTerms: data.customIpTerms,
      governingLaw: data.governingLaw,
      disputeResolution: data.disputeResolution,
      autoReleaseEnabled: data.autoReleaseEnabled,
      autoReleaseDelayDays: data.autoReleaseDelayDays,
      cancellationPolicy: data.cancellationPolicy,
      cancellationFee: data.cancellationFee,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.contracts.set(contractId, contract);
    return contract;
  }

  async getContract(contractId: string): Promise<SmartContract | null> {
    return this.contracts.get(contractId) || null;
  }

  async signContract(contractId: string, partyType: 'CLIENT' | 'FREELANCER', signatureHash: string): Promise<SmartContract> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    const party = partyType === 'CLIENT' ? contract.client : contract.freelancer;
    party.signedAt = new Date();
    party.signatureHash = signatureHash;

    // Check if both parties have signed
    if (contract.client.signedAt && contract.freelancer.signedAt) {
      contract.status = 'ACTIVE';
      contract.activatedAt = new Date();
      contract.termsAccepted = true;

      if (contract.ndaRequired) {
        contract.ndaSigned = true;
      }
    } else {
      contract.status = 'PENDING_SIGNATURE';
    }

    contract.updatedAt = new Date();
    return contract;
  }

  async activateContract(contractId: string): Promise<SmartContract> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    if (!contract.client.signedAt || !contract.freelancer.signedAt) {
      throw new Error('Both parties must sign before activation');
    }

    contract.status = 'ACTIVE';
    contract.activatedAt = new Date();
    contract.updatedAt = new Date();

    // Set first milestone to IN_PROGRESS
    const firstMilestone = contract.milestones.find(m => m.order === 1);
    if (firstMilestone) {
      firstMilestone.status = 'IN_PROGRESS';
      firstMilestone.startedAt = new Date();
    }

    return contract;
  }

  async cancelContract(contractId: string, cancelledBy: 'CLIENT' | 'FREELANCER', reason: string): Promise<{
    contract: SmartContract;
    refundAmount: number;
    cancellationFee: number;
  }> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    // Calculate cancellation fee based on policy
    let cancellationFeePercent = contract.cancellationFee / 100;

    // Calculate work completed
    const completedMilestones = contract.milestones.filter(m =>
      m.status === 'APPROVED' || m.status === 'PAID'
    );
    const completedAmount = completedMilestones.reduce((sum, m) => sum + m.amount, 0);

    // Remaining amount
    const remainingAmount = contract.totalAmount - completedAmount;

    // Cancellation fee
    const cancellationFee = remainingAmount * cancellationFeePercent;

    // Refund amount (what client gets back from escrow)
    const escrowedPending = contract.milestones
      .filter(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS')
      .reduce((sum, m) => sum + m.amount, 0);

    const refundAmount = escrowedPending - cancellationFee;

    contract.status = 'CANCELLED';
    contract.updatedAt = new Date();

    return {
      contract,
      refundAmount: Math.max(0, refundAmount),
      cancellationFee,
    };
  }

  // ===== MILESTONE MANAGEMENT =====

  async getMilestone(milestoneId: string): Promise<Milestone | null> {
    return this.milestones.get(milestoneId) || null;
  }

  async startMilestone(milestoneId: string): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.status !== 'PENDING') {
      throw new Error('Milestone cannot be started - invalid status');
    }

    milestone.status = 'IN_PROGRESS';
    milestone.startedAt = new Date();

    // Update contract
    const contract = this.contracts.get(milestone.contractId);
    if (contract) {
      const idx = contract.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) contract.milestones[idx] = milestone;
    }

    return milestone;
  }

  async submitMilestone(milestoneId: string, attachments: { filename: string; url: string }[]): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.status !== 'IN_PROGRESS' && milestone.status !== 'REVISION_REQUESTED') {
      throw new Error('Milestone cannot be submitted - invalid status');
    }

    milestone.status = 'SUBMITTED';
    milestone.submittedAt = new Date();
    milestone.attachments = attachments.map(a => ({
      id: `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename: a.filename,
      url: a.url,
      uploadedAt: new Date(),
    }));

    // Update contract
    const contract = this.contracts.get(milestone.contractId);
    if (contract) {
      const idx = contract.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) contract.milestones[idx] = milestone;
    }

    return milestone;
  }

  async reviewMilestone(milestoneId: string): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.status !== 'SUBMITTED') {
      throw new Error('Milestone is not in submitted status');
    }

    milestone.status = 'UNDER_REVIEW';

    // Update contract
    const contract = this.contracts.get(milestone.contractId);
    if (contract) {
      const idx = contract.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) contract.milestones[idx] = milestone;
    }

    return milestone;
  }

  async approveMilestone(milestoneId: string, notes?: string): Promise<{
    milestone: Milestone;
    payment?: EscrowPayment;
  }> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.status !== 'SUBMITTED' && milestone.status !== 'UNDER_REVIEW') {
      throw new Error('Milestone cannot be approved - invalid status');
    }

    milestone.status = 'APPROVED';
    milestone.approvedAt = new Date();
    milestone.reviewNotes = notes;

    // Update contract
    const contract = this.contracts.get(milestone.contractId);
    if (contract) {
      const idx = contract.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) contract.milestones[idx] = milestone;
      contract.updatedAt = new Date();

      // Check if contract is complete
      const allApproved = contract.milestones.every(m =>
        m.status === 'APPROVED' || m.status === 'PAID'
      );
      if (allApproved) {
        contract.status = 'COMPLETED';
        contract.completedAt = new Date();
      }

      // Start next milestone automatically
      const nextMilestone = contract.milestones.find(m =>
        m.order === milestone.order + 1 && m.status === 'PENDING'
      );
      if (nextMilestone) {
        nextMilestone.status = 'IN_PROGRESS';
        nextMilestone.startedAt = new Date();
        this.milestones.set(nextMilestone.id, nextMilestone);
      }
    }

    // Auto-release payment if enabled
    let payment: EscrowPayment | undefined;
    if (contract?.autoReleaseEnabled) {
      payment = await this.releaseEscrow(milestone.contractId, milestone.id);
    }

    return { milestone, payment };
  }

  async requestRevision(milestoneId: string, notes: string): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.status !== 'SUBMITTED' && milestone.status !== 'UNDER_REVIEW') {
      throw new Error('Cannot request revision - invalid status');
    }

    if (milestone.revisionCount >= milestone.maxRevisions) {
      throw new Error(`Maximum revisions (${milestone.maxRevisions}) exceeded`);
    }

    milestone.status = 'REVISION_REQUESTED';
    milestone.revisionCount++;
    milestone.reviewNotes = notes;

    // Update contract
    const contract = this.contracts.get(milestone.contractId);
    if (contract) {
      const idx = contract.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) contract.milestones[idx] = milestone;
    }

    return milestone;
  }

  async rejectMilestone(milestoneId: string, reason: string): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    milestone.status = 'REJECTED';
    milestone.reviewNotes = reason;

    // Update contract
    const contract = this.contracts.get(milestone.contractId);
    if (contract) {
      const idx = contract.milestones.findIndex(m => m.id === milestoneId);
      if (idx >= 0) contract.milestones[idx] = milestone;
    }

    return milestone;
  }

  // ===== ESCROW PAYMENTS =====

  async createEscrowPayment(data: {
    contractId: string;
    milestoneId?: string;
    amount: number;
    currency: string;
    payerId: string;
    payeeId: string;
    tierType?: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
    region?: 'EU' | 'NON_EU';
  }): Promise<EscrowPayment> {
    const tierType = data.tierType || 'STANDARD';
    const region = data.region || 'EU';

    // Calculate fees
    const platformFeePercent = PLATFORM_FEES[tierType];
    const platformFee = data.amount * platformFeePercent;

    const stripeFees = STRIPE_FEES[region];
    const stripeFee = data.amount * stripeFees.percent + stripeFees.fixed;

    const netAmount = data.amount - platformFee - stripeFee;

    const payment: EscrowPayment = {
      id: `escrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId: data.contractId,
      milestoneId: data.milestoneId,
      amount: data.amount,
      currency: data.currency,
      status: 'PENDING',
      payerId: data.payerId,
      payeeId: data.payeeId,
      platformFee,
      platformFeePercent,
      stripeFee,
      netAmount,
      createdAt: new Date(),
    };

    this.escrowPayments.set(payment.id, payment);
    return payment;
  }

  async holdInEscrow(paymentId: string, stripePaymentIntentId: string): Promise<EscrowPayment> {
    const payment = this.escrowPayments.get(paymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'HELD_IN_ESCROW';
    payment.stripePaymentIntentId = stripePaymentIntentId;
    payment.heldAt = new Date();

    return payment;
  }

  async releaseEscrow(contractId: string, milestoneId: string): Promise<EscrowPayment> {
    // Find the escrow payment for this milestone
    let payment = Array.from(this.escrowPayments.values())
      .find(p => p.contractId === contractId && p.milestoneId === milestoneId);

    if (!payment) {
      // Create a new payment if not found (for auto-release scenarios)
      const contract = this.contracts.get(contractId);
      const milestone = this.milestones.get(milestoneId);

      if (!contract || !milestone) {
        throw new Error('Contract or milestone not found');
      }

      payment = await this.createEscrowPayment({
        contractId,
        milestoneId,
        amount: milestone.amount,
        currency: milestone.currency,
        payerId: contract.client.id,
        payeeId: contract.freelancer.id,
      });
    }

    payment.status = 'RELEASED';
    payment.releasedAt = new Date();
    payment.stripeTransferId = `tr_${Date.now()}`;

    // Update milestone status
    const milestone = this.milestones.get(milestoneId);
    if (milestone) {
      milestone.status = 'PAID';

      // Update contract milestone
      const contract = this.contracts.get(contractId);
      if (contract) {
        const idx = contract.milestones.findIndex(m => m.id === milestoneId);
        if (idx >= 0) contract.milestones[idx] = milestone;
      }
    }

    return payment;
  }

  async refundEscrow(paymentId: string, reason: string): Promise<EscrowPayment> {
    const payment = this.escrowPayments.get(paymentId);
    if (!payment) throw new Error('Payment not found');

    if (payment.status !== 'HELD_IN_ESCROW') {
      throw new Error('Payment is not in escrow');
    }

    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();

    return payment;
  }

  async getEscrowPayments(contractId: string): Promise<EscrowPayment[]> {
    return Array.from(this.escrowPayments.values())
      .filter(p => p.contractId === contractId);
  }

  async getPaymentSummary(contractId: string): Promise<{
    totalAmount: number;
    heldInEscrow: number;
    released: number;
    pending: number;
    refunded: number;
    totalFees: number;
    currency: string;
  }> {
    const payments = await this.getEscrowPayments(contractId);
    const contract = this.contracts.get(contractId);

    return {
      totalAmount: contract?.totalAmount || 0,
      heldInEscrow: payments.filter(p => p.status === 'HELD_IN_ESCROW').reduce((sum, p) => sum + p.amount, 0),
      released: payments.filter(p => p.status === 'RELEASED').reduce((sum, p) => sum + p.amount, 0),
      pending: payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
      refunded: payments.filter(p => p.status === 'REFUNDED').reduce((sum, p) => sum + p.amount, 0),
      totalFees: payments.reduce((sum, p) => sum + p.platformFee + p.stripeFee, 0),
      currency: contract?.currency || 'EUR',
    };
  }

  // ===== DISPUTES =====

  async openDispute(data: {
    contractId: string;
    milestoneId?: string;
    initiatedBy: 'CLIENT' | 'FREELANCER';
    initiatorId: string;
    reason: Dispute['reason'];
    description: string;
    disputedAmount: number;
    currency: string;
  }): Promise<Dispute> {
    const contract = this.contracts.get(data.contractId);
    if (!contract) throw new Error('Contract not found');

    const dispute: Dispute = {
      id: `dispute-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId: data.contractId,
      milestoneId: data.milestoneId,
      initiatedBy: data.initiatedBy,
      initiatorId: data.initiatorId,
      reason: data.reason,
      description: data.description,
      evidence: [],
      disputedAmount: data.disputedAmount,
      currency: data.currency,
      status: 'OPEN',
      responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      messages: [{
        id: `msg-${Date.now()}`,
        senderId: 'SYSTEM',
        senderType: 'SYSTEM',
        message: `Dispute opened by ${data.initiatedBy.toLowerCase()}. Reason: ${data.reason}`,
        attachments: [],
        sentAt: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.disputes.set(dispute.id, dispute);

    // Update contract status
    contract.status = 'DISPUTED';
    contract.updatedAt = new Date();

    // Freeze related escrow payments
    const payments = Array.from(this.escrowPayments.values())
      .filter(p => p.contractId === data.contractId);
    for (const payment of payments) {
      if (payment.status === 'HELD_IN_ESCROW') {
        payment.status = 'DISPUTED';
      }
    }

    return dispute;
  }

  async getDispute(disputeId: string): Promise<Dispute | null> {
    return this.disputes.get(disputeId) || null;
  }

  async addDisputeEvidence(disputeId: string, evidence: {
    type: 'DOCUMENT' | 'IMAGE' | 'MESSAGE' | 'SCREENSHOT';
    description: string;
    url: string;
    uploadedBy: string;
  }): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    dispute.evidence.push({
      id: `evidence-${Date.now()}`,
      ...evidence,
      uploadedAt: new Date(),
    });
    dispute.updatedAt = new Date();

    return dispute;
  }

  async addDisputeMessage(disputeId: string, message: {
    senderId: string;
    senderType: 'CLIENT' | 'FREELANCER' | 'MEDIATOR';
    message: string;
    attachments?: string[];
  }): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    dispute.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: message.senderId,
      senderType: message.senderType,
      message: message.message,
      attachments: message.attachments || [],
      sentAt: new Date(),
    });
    dispute.updatedAt = new Date();

    return dispute;
  }

  async assignMediator(disputeId: string, mediatorId: string): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    dispute.mediatorId = mediatorId;
    dispute.mediatorAssignedAt = new Date();
    dispute.status = 'MEDIATION';
    dispute.updatedAt = new Date();

    dispute.messages.push({
      id: `msg-${Date.now()}`,
      senderId: 'SYSTEM',
      senderType: 'SYSTEM',
      message: `Mediator assigned to dispute`,
      attachments: [],
      sentAt: new Date(),
    });

    return dispute;
  }

  async resolveDispute(disputeId: string, resolution: {
    resolution: DisputeResolution;
    details: string;
    clientRefund: number;
    freelancerPayment: number;
  }): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    dispute.resolution = resolution.resolution;
    dispute.resolutionDetails = resolution.details;
    dispute.clientRefund = resolution.clientRefund;
    dispute.freelancerPayment = resolution.freelancerPayment;
    dispute.status = 'RESOLVED';
    dispute.resolvedAt = new Date();
    dispute.updatedAt = new Date();

    dispute.messages.push({
      id: `msg-${Date.now()}`,
      senderId: 'SYSTEM',
      senderType: 'SYSTEM',
      message: `Dispute resolved: ${resolution.resolution}. ${resolution.details}`,
      attachments: [],
      sentAt: new Date(),
    });

    // Update contract status
    const contract = this.contracts.get(dispute.contractId);
    if (contract) {
      contract.status = 'ACTIVE';
      contract.updatedAt = new Date();
    }

    // Process payments based on resolution
    const payments = Array.from(this.escrowPayments.values())
      .filter(p => p.contractId === dispute.contractId && p.status === 'DISPUTED');

    for (const payment of payments) {
      if (resolution.resolution === 'FAVOR_CLIENT') {
        payment.status = 'REFUNDED';
        payment.refundedAt = new Date();
      } else if (resolution.resolution === 'FAVOR_FREELANCER') {
        payment.status = 'RELEASED';
        payment.releasedAt = new Date();
      }
      // SPLIT and MUTUAL_AGREEMENT would require more complex handling
    }

    return dispute;
  }

  async getDisputesForContract(contractId: string): Promise<Dispute[]> {
    return Array.from(this.disputes.values())
      .filter(d => d.contractId === contractId);
  }

  // ===== INVOICE GENERATION =====

  async generateInvoiceFromMilestone(milestoneId: string, issuerDetails: {
    taxId?: string;
    address?: string;
    vatApplicable: boolean;
    vatRate?: number;
  }): Promise<Invoice> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    const contract = this.contracts.get(milestone.contractId);
    if (!contract) throw new Error('Contract not found');

    const vatRate = issuerDetails.vatApplicable ? (issuerDetails.vatRate || VAT_RATES.STANDARD) : 0;
    const subtotal = milestone.amount;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    // Check for reverse charge (EU B2B cross-border)
    const reverseCharge = !!(issuerDetails.vatApplicable &&
      contract.freelancer.taxId &&
      contract.client.taxId &&
      contract.governingLaw !== 'RO');

    this.invoiceCounter++;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(this.invoiceCounter).padStart(6, '0')}`;

    const invoice: Invoice = {
      id: `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId: contract.id,
      milestoneId: milestone.id,
      invoiceNumber,
      series: `DI${new Date().getFullYear()}`,
      issuerId: contract.freelancer.id,
      issuerName: contract.freelancer.companyName || contract.freelancer.name,
      issuerTaxId: issuerDetails.taxId || contract.freelancer.taxId,
      issuerAddress: issuerDetails.address || contract.freelancer.address,
      recipientId: contract.client.id,
      recipientName: contract.client.companyName || contract.client.name,
      recipientTaxId: contract.client.taxId,
      recipientAddress: contract.client.address,
      items: [{
        description: `${milestone.title} - ${contract.title}`,
        quantity: 1,
        unitPrice: subtotal,
        amount: subtotal,
        vatRate: reverseCharge ? 0 : vatRate,
        vatAmount: reverseCharge ? 0 : vatAmount,
      }],
      subtotal,
      vatTotal: reverseCharge ? 0 : vatAmount,
      total: reverseCharge ? subtotal : total,
      currency: milestone.currency,
      vatApplicable: issuerDetails.vatApplicable,
      reverseCharge,
      paymentStatus: milestone.status === 'PAID' ? 'PAID' : 'PENDING',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paidAt: milestone.status === 'PAID' ? new Date() : undefined,
      issuedAt: new Date(),
      createdAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async generateContractInvoice(contractId: string, issuerDetails: {
    taxId?: string;
    address?: string;
    vatApplicable: boolean;
    vatRate?: number;
  }): Promise<Invoice> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    const vatRate = issuerDetails.vatApplicable ? (issuerDetails.vatRate || VAT_RATES.STANDARD) : 0;

    // Create line items from completed/paid milestones
    const completedMilestones = contract.milestones.filter(m =>
      m.status === 'APPROVED' || m.status === 'PAID'
    );

    if (completedMilestones.length === 0) {
      throw new Error('No completed milestones to invoice');
    }

    const items = completedMilestones.map(m => ({
      description: m.title,
      quantity: 1,
      unitPrice: m.amount,
      amount: m.amount,
      vatRate,
      vatAmount: m.amount * vatRate,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const vatTotal = items.reduce((sum, i) => sum + i.vatAmount, 0);
    const total = subtotal + vatTotal;

    // Check for reverse charge
    const reverseCharge = !!(issuerDetails.vatApplicable &&
      contract.freelancer.taxId &&
      contract.client.taxId &&
      contract.governingLaw !== 'RO');

    this.invoiceCounter++;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(this.invoiceCounter).padStart(6, '0')}`;

    const invoice: Invoice = {
      id: `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId: contract.id,
      invoiceNumber,
      series: `DI${new Date().getFullYear()}`,
      issuerId: contract.freelancer.id,
      issuerName: contract.freelancer.companyName || contract.freelancer.name,
      issuerTaxId: issuerDetails.taxId || contract.freelancer.taxId,
      issuerAddress: issuerDetails.address || contract.freelancer.address,
      recipientId: contract.client.id,
      recipientName: contract.client.companyName || contract.client.name,
      recipientTaxId: contract.client.taxId,
      recipientAddress: contract.client.address,
      items: reverseCharge ? items.map(i => ({ ...i, vatRate: 0, vatAmount: 0 })) : items,
      subtotal,
      vatTotal: reverseCharge ? 0 : vatTotal,
      total: reverseCharge ? subtotal : total,
      currency: contract.currency,
      vatApplicable: issuerDetails.vatApplicable,
      reverseCharge,
      paymentStatus: 'PENDING',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(),
      createdAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.invoices.get(invoiceId) || null;
  }

  async getInvoicesForContract(contractId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(i => i.contractId === contractId);
  }

  async markInvoicePaid(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    invoice.paymentStatus = 'PAID';
    invoice.paidAt = new Date();

    return invoice;
  }

  async submitToEFactura(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // Simulate e-Factura submission
    invoice.eFacturaId = `EF-${Date.now()}`;
    invoice.eFacturaStatus = 'SUBMITTED';

    return invoice;
  }

  // ===== CONTRACT ANALYTICS =====

  async getContractAnalytics(contractId: string): Promise<{
    contract: SmartContract;
    progress: {
      totalMilestones: number;
      completed: number;
      inProgress: number;
      pending: number;
      progressPercent: number;
    };
    financials: {
      totalValue: number;
      paid: number;
      inEscrow: number;
      pending: number;
      fees: number;
    };
    timeline: {
      daysElapsed: number;
      daysRemaining: number;
      onSchedule: boolean;
      delayedMilestones: number;
    };
    disputes: {
      total: number;
      open: number;
      resolved: number;
    };
  }> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    // Progress
    const totalMilestones = contract.milestones.length;
    const completed = contract.milestones.filter(m => m.status === 'APPROVED' || m.status === 'PAID').length;
    const inProgress = contract.milestones.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SUBMITTED' || m.status === 'UNDER_REVIEW').length;
    const pending = contract.milestones.filter(m => m.status === 'PENDING').length;

    // Financials
    const payments = await this.getEscrowPayments(contractId);
    const paid = payments.filter(p => p.status === 'RELEASED').reduce((sum, p) => sum + p.netAmount, 0);
    const inEscrow = payments.filter(p => p.status === 'HELD_IN_ESCROW').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = contract.milestones.filter(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS').reduce((sum, m) => sum + m.amount, 0);
    const fees = payments.reduce((sum, p) => sum + p.platformFee + p.stripeFee, 0);

    // Timeline
    const now = new Date();
    const startDate = contract.activatedAt || contract.startDate;
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(0, Math.floor((contract.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    const delayedMilestones = contract.milestones.filter(m =>
      (m.status === 'PENDING' || m.status === 'IN_PROGRESS') && m.dueDate < now
    ).length;

    // Disputes
    const disputes = await this.getDisputesForContract(contractId);

    return {
      contract,
      progress: {
        totalMilestones,
        completed,
        inProgress,
        pending,
        progressPercent: totalMilestones > 0 ? Math.round((completed / totalMilestones) * 100) : 0,
      },
      financials: {
        totalValue: contract.totalAmount,
        paid,
        inEscrow,
        pending: pendingAmount,
        fees,
      },
      timeline: {
        daysElapsed,
        daysRemaining,
        onSchedule: delayedMilestones === 0,
        delayedMilestones,
      },
      disputes: {
        total: disputes.length,
        open: disputes.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW' || d.status === 'MEDIATION').length,
        resolved: disputes.filter(d => d.status === 'RESOLVED' || d.status === 'CLOSED').length,
      },
    };
  }

  // ===== REFERENCE DATA =====

  getPlatformFees(): typeof PLATFORM_FEES {
    return PLATFORM_FEES;
  }

  getStripeFees(): typeof STRIPE_FEES {
    return STRIPE_FEES;
  }

  getVatRates(): typeof VAT_RATES {
    return VAT_RATES;
  }
}

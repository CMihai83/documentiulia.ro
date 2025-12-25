import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  SmartContractService,
  ContractParty,
  SmartContract,
  Dispute,
} from './smart-contract.service';

// Smart Contracts & Escrow Payments Controller
// Milestone-based payments with escrow, smart contract execution, and automated disbursement

@Controller('contracts')
@UseGuards(ThrottlerGuard)
export class SmartContractController {
  constructor(private readonly contractService: SmartContractService) {}

  // ===== CONTRACTS =====

  @Post()
  async createContract(
    @Body('projectId') projectId: string,
    @Body('client') client: Omit<ContractParty, 'signedAt' | 'signatureHash'>,
    @Body('freelancer') freelancer: Omit<ContractParty, 'signedAt' | 'signatureHash'>,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('scope') scope: string,
    @Body('paymentType') paymentType: SmartContract['paymentType'],
    @Body('totalAmount') totalAmount: number,
    @Body('currency') currency: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('ndaRequired') ndaRequired: boolean,
    @Body('ipClause') ipClause: SmartContract['ipClause'],
    @Body('governingLaw') governingLaw: string,
    @Body('disputeResolution') disputeResolution: SmartContract['disputeResolution'],
    @Body('autoReleaseEnabled') autoReleaseEnabled: boolean,
    @Body('autoReleaseDelayDays') autoReleaseDelayDays: number,
    @Body('cancellationPolicy') cancellationPolicy: SmartContract['cancellationPolicy'],
    @Body('cancellationFee') cancellationFee: number,
    @Body('milestones') milestones: any[],
    @Body('hourlyRate') hourlyRate?: number,
    @Body('estimatedHours') estimatedHours?: number,
    @Body('customIpTerms') customIpTerms?: string,
  ) {
    return this.contractService.createContract({
      projectId,
      client,
      freelancer,
      title,
      description,
      scope,
      paymentType,
      totalAmount,
      currency,
      hourlyRate,
      estimatedHours,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ndaRequired,
      ipClause,
      customIpTerms,
      governingLaw,
      disputeResolution,
      autoReleaseEnabled,
      autoReleaseDelayDays,
      cancellationPolicy,
      cancellationFee,
      milestones: milestones.map(m => ({
        ...m,
        dueDate: new Date(m.dueDate),
      })),
    });
  }

  @Get(':contractId')
  async getContract(@Param('contractId') contractId: string) {
    return this.contractService.getContract(contractId);
  }

  @Post(':contractId/sign')
  async signContract(
    @Param('contractId') contractId: string,
    @Body('partyType') partyType: 'CLIENT' | 'FREELANCER',
    @Body('signatureHash') signatureHash: string,
  ) {
    return this.contractService.signContract(contractId, partyType, signatureHash);
  }

  @Post(':contractId/activate')
  async activateContract(@Param('contractId') contractId: string) {
    return this.contractService.activateContract(contractId);
  }

  @Post(':contractId/cancel')
  async cancelContract(
    @Param('contractId') contractId: string,
    @Body('cancelledBy') cancelledBy: 'CLIENT' | 'FREELANCER',
    @Body('reason') reason: string,
  ) {
    return this.contractService.cancelContract(contractId, cancelledBy, reason);
  }

  @Get(':contractId/analytics')
  async getContractAnalytics(@Param('contractId') contractId: string) {
    return this.contractService.getContractAnalytics(contractId);
  }

  // ===== MILESTONES =====

  @Get('milestones/:milestoneId')
  async getMilestone(@Param('milestoneId') milestoneId: string) {
    return this.contractService.getMilestone(milestoneId);
  }

  @Post('milestones/:milestoneId/start')
  async startMilestone(@Param('milestoneId') milestoneId: string) {
    return this.contractService.startMilestone(milestoneId);
  }

  @Post('milestones/:milestoneId/submit')
  async submitMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body('attachments') attachments: { filename: string; url: string }[],
  ) {
    return this.contractService.submitMilestone(milestoneId, attachments);
  }

  @Post('milestones/:milestoneId/review')
  async reviewMilestone(@Param('milestoneId') milestoneId: string) {
    return this.contractService.reviewMilestone(milestoneId);
  }

  @Post('milestones/:milestoneId/approve')
  async approveMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body('notes') notes?: string,
  ) {
    return this.contractService.approveMilestone(milestoneId, notes);
  }

  @Post('milestones/:milestoneId/revision')
  async requestRevision(
    @Param('milestoneId') milestoneId: string,
    @Body('notes') notes: string,
  ) {
    return this.contractService.requestRevision(milestoneId, notes);
  }

  @Post('milestones/:milestoneId/reject')
  async rejectMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body('reason') reason: string,
  ) {
    return this.contractService.rejectMilestone(milestoneId, reason);
  }

  // ===== ESCROW PAYMENTS =====

  @Post('payments/escrow')
  async createEscrowPayment(
    @Body('contractId') contractId: string,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
    @Body('payerId') payerId: string,
    @Body('payeeId') payeeId: string,
    @Body('milestoneId') milestoneId?: string,
    @Body('tierType') tierType?: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE',
    @Body('region') region?: 'EU' | 'NON_EU',
  ) {
    return this.contractService.createEscrowPayment({
      contractId,
      milestoneId,
      amount,
      currency,
      payerId,
      payeeId,
      tierType,
      region,
    });
  }

  @Post('payments/:paymentId/hold')
  async holdInEscrow(
    @Param('paymentId') paymentId: string,
    @Body('stripePaymentIntentId') stripePaymentIntentId: string,
  ) {
    return this.contractService.holdInEscrow(paymentId, stripePaymentIntentId);
  }

  @Post('payments/release')
  async releaseEscrow(
    @Body('contractId') contractId: string,
    @Body('milestoneId') milestoneId: string,
  ) {
    return this.contractService.releaseEscrow(contractId, milestoneId);
  }

  @Post('payments/:paymentId/refund')
  async refundEscrow(
    @Param('paymentId') paymentId: string,
    @Body('reason') reason: string,
  ) {
    return this.contractService.refundEscrow(paymentId, reason);
  }

  @Get(':contractId/payments')
  async getEscrowPayments(@Param('contractId') contractId: string) {
    return this.contractService.getEscrowPayments(contractId);
  }

  @Get(':contractId/payments/summary')
  async getPaymentSummary(@Param('contractId') contractId: string) {
    return this.contractService.getPaymentSummary(contractId);
  }

  // ===== DISPUTES =====

  @Post('disputes')
  async openDispute(
    @Body('contractId') contractId: string,
    @Body('initiatedBy') initiatedBy: 'CLIENT' | 'FREELANCER',
    @Body('initiatorId') initiatorId: string,
    @Body('reason') reason: Dispute['reason'],
    @Body('description') description: string,
    @Body('disputedAmount') disputedAmount: number,
    @Body('currency') currency: string,
    @Body('milestoneId') milestoneId?: string,
  ) {
    return this.contractService.openDispute({
      contractId,
      milestoneId,
      initiatedBy,
      initiatorId,
      reason,
      description,
      disputedAmount,
      currency,
    });
  }

  @Get('disputes/:disputeId')
  async getDispute(@Param('disputeId') disputeId: string) {
    return this.contractService.getDispute(disputeId);
  }

  @Post('disputes/:disputeId/evidence')
  async addDisputeEvidence(
    @Param('disputeId') disputeId: string,
    @Body('type') type: 'DOCUMENT' | 'IMAGE' | 'MESSAGE' | 'SCREENSHOT',
    @Body('description') description: string,
    @Body('url') url: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.contractService.addDisputeEvidence(disputeId, {
      type,
      description,
      url,
      uploadedBy,
    });
  }

  @Post('disputes/:disputeId/message')
  async addDisputeMessage(
    @Param('disputeId') disputeId: string,
    @Body('senderId') senderId: string,
    @Body('senderType') senderType: 'CLIENT' | 'FREELANCER' | 'MEDIATOR',
    @Body('message') message: string,
    @Body('attachments') attachments?: string[],
  ) {
    return this.contractService.addDisputeMessage(disputeId, {
      senderId,
      senderType,
      message,
      attachments,
    });
  }

  @Post('disputes/:disputeId/mediator')
  async assignMediator(
    @Param('disputeId') disputeId: string,
    @Body('mediatorId') mediatorId: string,
  ) {
    return this.contractService.assignMediator(disputeId, mediatorId);
  }

  @Post('disputes/:disputeId/resolve')
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body('resolution') resolution: Dispute['resolution'],
    @Body('details') details: string,
    @Body('clientRefund') clientRefund: number,
    @Body('freelancerPayment') freelancerPayment: number,
  ) {
    return this.contractService.resolveDispute(disputeId, {
      resolution: resolution!,
      details,
      clientRefund,
      freelancerPayment,
    });
  }

  @Get(':contractId/disputes')
  async getDisputesForContract(@Param('contractId') contractId: string) {
    return this.contractService.getDisputesForContract(contractId);
  }

  // ===== INVOICES =====

  @Post('milestones/:milestoneId/invoice')
  async generateMilestoneInvoice(
    @Param('milestoneId') milestoneId: string,
    @Body('vatApplicable') vatApplicable: boolean,
    @Body('taxId') taxId?: string,
    @Body('address') address?: string,
    @Body('vatRate') vatRate?: number,
  ) {
    return this.contractService.generateInvoiceFromMilestone(milestoneId, {
      taxId,
      address,
      vatApplicable,
      vatRate,
    });
  }

  @Post(':contractId/invoice')
  async generateContractInvoice(
    @Param('contractId') contractId: string,
    @Body('vatApplicable') vatApplicable: boolean,
    @Body('taxId') taxId?: string,
    @Body('address') address?: string,
    @Body('vatRate') vatRate?: number,
  ) {
    return this.contractService.generateContractInvoice(contractId, {
      taxId,
      address,
      vatApplicable,
      vatRate,
    });
  }

  @Get('invoices/:invoiceId')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    return this.contractService.getInvoice(invoiceId);
  }

  @Get(':contractId/invoices')
  async getInvoicesForContract(@Param('contractId') contractId: string) {
    return this.contractService.getInvoicesForContract(contractId);
  }

  @Post('invoices/:invoiceId/paid')
  async markInvoicePaid(@Param('invoiceId') invoiceId: string) {
    return this.contractService.markInvoicePaid(invoiceId);
  }

  @Post('invoices/:invoiceId/efactura')
  async submitToEFactura(@Param('invoiceId') invoiceId: string) {
    return this.contractService.submitToEFactura(invoiceId);
  }

  // ===== REFERENCE DATA =====

  @Get('reference/platform-fees')
  getPlatformFees() {
    return this.contractService.getPlatformFees();
  }

  @Get('reference/stripe-fees')
  getStripeFees() {
    return this.contractService.getStripeFees();
  }

  @Get('reference/vat-rates')
  getVatRates() {
    return this.contractService.getVatRates();
  }
}

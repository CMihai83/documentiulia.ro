import { Test, TestingModule } from '@nestjs/testing';
import { SmartContractService } from './smart-contract.service';

describe('SmartContractService', () => {
  let service: SmartContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartContractService],
    }).compile();

    service = module.get<SmartContractService>(SmartContractService);
    service.resetState();
  });

  const createTestContract = async () => {
    return service.createContract({
      projectId: 'project-1',
      client: {
        id: 'client-1',
        type: 'CLIENT',
        name: 'ACME Corp',
        email: 'client@acme.com',
        companyName: 'ACME Corporation SRL',
        taxId: 'RO12345678',
        address: 'București, Romania',
      },
      freelancer: {
        id: 'freelancer-1',
        type: 'FREELANCER',
        name: 'Ion Popescu',
        email: 'ion@freelancer.com',
        companyName: 'Ion Popescu PFA',
        taxId: 'RO87654321',
        address: 'Cluj, Romania',
      },
      title: 'E-commerce Website Development',
      description: 'Build a modern e-commerce platform',
      scope: 'Full-stack development with React and Node.js',
      paymentType: 'MILESTONE',
      totalAmount: 10000,
      currency: 'EUR',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      ndaRequired: true,
      ipClause: 'CLIENT_OWNS_ALL',
      governingLaw: 'RO',
      disputeResolution: 'MEDIATION',
      autoReleaseEnabled: true,
      autoReleaseDelayDays: 3,
      cancellationPolicy: 'MODERATE',
      cancellationFee: 10,
      milestones: [
        {
          title: 'Design Phase',
          description: 'UI/UX design mockups',
          deliverables: ['Wireframes', 'High-fidelity mockups', 'Design system'],
          dueDate: new Date('2025-01-31'),
          amount: 2000,
          currency: 'EUR',
          order: 1,
          maxRevisions: 3,
        },
        {
          title: 'Frontend Development',
          description: 'React frontend implementation',
          deliverables: ['React components', 'State management', 'Responsive design'],
          dueDate: new Date('2025-02-28'),
          amount: 4000,
          currency: 'EUR',
          order: 2,
          maxRevisions: 2,
        },
        {
          title: 'Backend & Integration',
          description: 'Node.js backend and API integration',
          deliverables: ['REST API', 'Database setup', 'Payment integration'],
          dueDate: new Date('2025-03-31'),
          amount: 4000,
          currency: 'EUR',
          order: 3,
          maxRevisions: 2,
        },
      ],
    });
  };

  describe('Contract Management', () => {
    it('should create a contract with milestones', async () => {
      const contract = await createTestContract();

      expect(contract.id).toBeDefined();
      expect(contract.status).toBe('DRAFT');
      expect(contract.milestones.length).toBe(3);
      expect(contract.totalAmount).toBe(10000);
      expect(contract.ndaRequired).toBe(true);
    });

    it('should get contract by ID', async () => {
      const created = await createTestContract();
      const contract = await service.getContract(created.id);

      expect(contract).not.toBeNull();
      expect(contract!.id).toBe(created.id);
    });

    it('should sign contract by client', async () => {
      const contract = await createTestContract();
      const signed = await service.signContract(contract.id, 'CLIENT', 'hash-client-123');

      expect(signed.client.signedAt).toBeDefined();
      expect(signed.client.signatureHash).toBe('hash-client-123');
      expect(signed.status).toBe('PENDING_SIGNATURE');
    });

    it('should sign contract by freelancer', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash-client-123');
      const signed = await service.signContract(contract.id, 'FREELANCER', 'hash-freelancer-456');

      expect(signed.freelancer.signedAt).toBeDefined();
      expect(signed.status).toBe('ACTIVE');
      expect(signed.termsAccepted).toBe(true);
      expect(signed.ndaSigned).toBe(true);
    });

    it('should activate contract and start first milestone', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash-client');
      await service.signContract(contract.id, 'FREELANCER', 'hash-freelancer');

      const activated = await service.activateContract(contract.id);

      expect(activated.status).toBe('ACTIVE');
      expect(activated.activatedAt).toBeDefined();
      expect(activated.milestones[0].status).toBe('IN_PROGRESS');
    });

    it('should cancel contract and calculate fees', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash-client');
      await service.signContract(contract.id, 'FREELANCER', 'hash-freelancer');

      const result = await service.cancelContract(contract.id, 'CLIENT', 'Project scope changed');

      expect(result.contract.status).toBe('CANCELLED');
      expect(result.cancellationFee).toBe(1000); // 10% of 10000
    });

    it('should throw error when activating unsigned contract', async () => {
      const contract = await createTestContract();

      await expect(service.activateContract(contract.id))
        .rejects.toThrow('Both parties must sign before activation');
    });
  });

  describe('Milestone Management', () => {
    it('should start a milestone', async () => {
      const contract = await createTestContract();
      const milestone = contract.milestones[0];

      const started = await service.startMilestone(milestone.id);

      expect(started.status).toBe('IN_PROGRESS');
      expect(started.startedAt).toBeDefined();
    });

    it('should submit milestone with attachments', async () => {
      const contract = await createTestContract();
      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);

      const submitted = await service.submitMilestone(milestone.id, [
        { filename: 'wireframes.pdf', url: 'https://storage/wireframes.pdf' },
        { filename: 'mockups.fig', url: 'https://storage/mockups.fig' },
      ]);

      expect(submitted.status).toBe('SUBMITTED');
      expect(submitted.submittedAt).toBeDefined();
      expect(submitted.attachments.length).toBe(2);
    });

    it('should review submitted milestone', async () => {
      const contract = await createTestContract();
      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);

      const reviewed = await service.reviewMilestone(milestone.id);

      expect(reviewed.status).toBe('UNDER_REVIEW');
    });

    it('should approve milestone and auto-release payment', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);

      const result = await service.approveMilestone(milestone.id, 'Great work!');

      // When auto-release is enabled, milestone status becomes PAID
      expect(result.milestone.status).toBe('PAID');
      expect(result.milestone.approvedAt).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(result.payment!.status).toBe('RELEASED');
    });

    it('should request revision', async () => {
      const contract = await createTestContract();
      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);

      const revised = await service.requestRevision(milestone.id, 'Please update the color scheme');

      expect(revised.status).toBe('REVISION_REQUESTED');
      expect(revised.revisionCount).toBe(1);
      expect(revised.reviewNotes).toBe('Please update the color scheme');
    });

    it('should reject milestone', async () => {
      const contract = await createTestContract();
      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);

      const rejected = await service.rejectMilestone(milestone.id, 'Does not meet requirements');

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.reviewNotes).toBe('Does not meet requirements');
    });

    it('should throw error when max revisions exceeded', async () => {
      const contract = await createTestContract();
      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);

      // Use up all revisions
      await service.requestRevision(milestone.id, 'Revision 1');
      await service.submitMilestone(milestone.id, []);
      await service.requestRevision(milestone.id, 'Revision 2');
      await service.submitMilestone(milestone.id, []);
      await service.requestRevision(milestone.id, 'Revision 3');
      await service.submitMilestone(milestone.id, []);

      await expect(service.requestRevision(milestone.id, 'Revision 4'))
        .rejects.toThrow('Maximum revisions (3) exceeded');
    });

    it('should start next milestone after approval', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone1 = contract.milestones[0];
      await service.startMilestone(milestone1.id);
      await service.submitMilestone(milestone1.id, []);
      await service.approveMilestone(milestone1.id);

      const updatedContract = await service.getContract(contract.id);
      const milestone2 = updatedContract!.milestones.find(m => m.order === 2);

      expect(milestone2!.status).toBe('IN_PROGRESS');
    });

    it('should complete contract when all milestones approved', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      // First milestone gets auto-started on activation, subsequent ones auto-start after previous approval
      // So we just submit and approve each one (next milestone auto-starts after approval)
      for (const milestone of contract.milestones) {
        // Get fresh milestone data (status may have changed)
        const currentMilestone = await service.getMilestone(milestone.id);
        if (currentMilestone!.status === 'PENDING') {
          await service.startMilestone(milestone.id);
        }
        await service.submitMilestone(milestone.id, []);
        await service.approveMilestone(milestone.id);
      }

      const completed = await service.getContract(contract.id);
      expect(completed!.status).toBe('COMPLETED');
      expect(completed!.completedAt).toBeDefined();
    });
  });

  describe('Escrow Payments', () => {
    it('should create escrow payment with fees', async () => {
      const contract = await createTestContract();

      const payment = await service.createEscrowPayment({
        contractId: contract.id,
        milestoneId: contract.milestones[0].id,
        amount: 2000,
        currency: 'EUR',
        payerId: 'client-1',
        payeeId: 'freelancer-1',
        tierType: 'STANDARD',
        region: 'EU',
      });

      expect(payment.id).toBeDefined();
      expect(payment.status).toBe('PENDING');
      expect(payment.platformFee).toBe(200); // 10%
      expect(payment.platformFeePercent).toBe(0.10);
      expect(payment.stripeFee).toBeCloseTo(28.25, 2); // 1.4% + €0.25
      expect(payment.netAmount).toBeCloseTo(1771.75, 2);
    });

    it('should hold payment in escrow', async () => {
      const contract = await createTestContract();
      const payment = await service.createEscrowPayment({
        contractId: contract.id,
        amount: 2000,
        currency: 'EUR',
        payerId: 'client-1',
        payeeId: 'freelancer-1',
      });

      const held = await service.holdInEscrow(payment.id, 'pi_test_123');

      expect(held.status).toBe('HELD_IN_ESCROW');
      expect(held.stripePaymentIntentId).toBe('pi_test_123');
      expect(held.heldAt).toBeDefined();
    });

    it('should release escrow payment', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone = contract.milestones[0];
      const released = await service.releaseEscrow(contract.id, milestone.id);

      expect(released.status).toBe('RELEASED');
      expect(released.releasedAt).toBeDefined();
      expect(released.stripeTransferId).toBeDefined();
    });

    it('should refund escrow payment', async () => {
      const contract = await createTestContract();
      const payment = await service.createEscrowPayment({
        contractId: contract.id,
        amount: 2000,
        currency: 'EUR',
        payerId: 'client-1',
        payeeId: 'freelancer-1',
      });
      await service.holdInEscrow(payment.id, 'pi_test_123');

      const refunded = await service.refundEscrow(payment.id, 'Project cancelled');

      expect(refunded.status).toBe('REFUNDED');
      expect(refunded.refundedAt).toBeDefined();
    });

    it('should get payment summary', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      // Release first milestone payment
      await service.releaseEscrow(contract.id, contract.milestones[0].id);

      const summary = await service.getPaymentSummary(contract.id);

      expect(summary.totalAmount).toBe(10000);
      expect(summary.released).toBeGreaterThan(0);
      expect(summary.currency).toBe('EUR');
    });

    it('should calculate premium tier fees', async () => {
      const contract = await createTestContract();

      const payment = await service.createEscrowPayment({
        contractId: contract.id,
        amount: 5000,
        currency: 'EUR',
        payerId: 'client-1',
        payeeId: 'freelancer-1',
        tierType: 'PREMIUM',
        region: 'EU',
      });

      expect(payment.platformFeePercent).toBe(0.05); // 5% for premium
      expect(payment.platformFee).toBe(250); // 5% of 5000
    });
  });

  describe('Dispute Resolution', () => {
    it('should open a dispute', async () => {
      const contract = await createTestContract();

      const dispute = await service.openDispute({
        contractId: contract.id,
        milestoneId: contract.milestones[0].id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Deliverables do not match requirements',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      expect(dispute.id).toBeDefined();
      expect(dispute.status).toBe('OPEN');
      expect(dispute.reason).toBe('QUALITY');
      expect(dispute.messages.length).toBe(1);
    });

    it('should update contract status when dispute opened', async () => {
      const contract = await createTestContract();

      await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'FREELANCER',
        initiatorId: 'freelancer-1',
        reason: 'NON_PAYMENT',
        description: 'Payment not received',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const updated = await service.getContract(contract.id);
      expect(updated!.status).toBe('DISPUTED');
    });

    it('should add evidence to dispute', async () => {
      const contract = await createTestContract();
      const dispute = await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Quality issues',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const updated = await service.addDisputeEvidence(dispute.id, {
        type: 'SCREENSHOT',
        description: 'Screenshot of bugs',
        url: 'https://storage/evidence.png',
        uploadedBy: 'client-1',
      });

      expect(updated.evidence.length).toBe(1);
      expect(updated.evidence[0].type).toBe('SCREENSHOT');
    });

    it('should add message to dispute', async () => {
      const contract = await createTestContract();
      const dispute = await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Quality issues',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const updated = await service.addDisputeMessage(dispute.id, {
        senderId: 'freelancer-1',
        senderType: 'FREELANCER',
        message: 'I disagree with this assessment',
      });

      expect(updated.messages.length).toBe(2); // System message + freelancer message
    });

    it('should assign mediator to dispute', async () => {
      const contract = await createTestContract();
      const dispute = await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Quality issues',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const updated = await service.assignMediator(dispute.id, 'mediator-1');

      expect(updated.status).toBe('MEDIATION');
      expect(updated.mediatorId).toBe('mediator-1');
      expect(updated.mediatorAssignedAt).toBeDefined();
    });

    it('should resolve dispute in favor of client', async () => {
      const contract = await createTestContract();
      const dispute = await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Quality issues',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const resolved = await service.resolveDispute(dispute.id, {
        resolution: 'FAVOR_CLIENT',
        details: 'Deliverables did not meet specifications',
        clientRefund: 2000,
        freelancerPayment: 0,
      });

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolution).toBe('FAVOR_CLIENT');
      expect(resolved.clientRefund).toBe(2000);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should resolve dispute in favor of freelancer', async () => {
      const contract = await createTestContract();
      const dispute = await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'FREELANCER',
        initiatorId: 'freelancer-1',
        reason: 'NON_PAYMENT',
        description: 'Work completed but not paid',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const resolved = await service.resolveDispute(dispute.id, {
        resolution: 'FAVOR_FREELANCER',
        details: 'Work was completed as specified',
        clientRefund: 0,
        freelancerPayment: 2000,
      });

      expect(resolved.resolution).toBe('FAVOR_FREELANCER');
      expect(resolved.freelancerPayment).toBe(2000);
    });

    it('should update contract status after dispute resolution', async () => {
      const contract = await createTestContract();
      const dispute = await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Issues',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      await service.resolveDispute(dispute.id, {
        resolution: 'MUTUAL_AGREEMENT',
        details: 'Parties agreed to revise work',
        clientRefund: 500,
        freelancerPayment: 1500,
      });

      const updated = await service.getContract(contract.id);
      expect(updated!.status).toBe('ACTIVE');
    });
  });

  describe('Invoice Generation', () => {
    it('should generate invoice from milestone', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);
      await service.approveMilestone(milestone.id);

      const invoice = await service.generateInvoiceFromMilestone(milestone.id, {
        taxId: 'RO87654321',
        address: 'Cluj, Romania',
        vatApplicable: true,
        vatRate: 0.19,
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/INV-\d{4}-\d{6}/);
      expect(invoice.subtotal).toBe(2000);
      expect(invoice.vatTotal).toBe(380); // 19% of 2000
      expect(invoice.total).toBe(2380);
    });

    it('should generate invoice with reverse charge for cross-border', async () => {
      const contract = await service.createContract({
        projectId: 'project-1',
        client: {
          id: 'client-1',
          type: 'CLIENT',
          name: 'German Corp',
          email: 'client@german.de',
          companyName: 'German Corp GmbH',
          taxId: 'DE123456789',
        },
        freelancer: {
          id: 'freelancer-1',
          type: 'FREELANCER',
          name: 'Ion Popescu',
          email: 'ion@freelancer.com',
          companyName: 'Ion Popescu PFA',
          taxId: 'RO87654321',
        },
        title: 'Project',
        description: 'Description',
        scope: 'Scope',
        paymentType: 'MILESTONE',
        totalAmount: 5000,
        currency: 'EUR',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        ndaRequired: false,
        ipClause: 'CLIENT_OWNS_ALL',
        governingLaw: 'DE', // German law - cross-border
        disputeResolution: 'MEDIATION',
        autoReleaseEnabled: true,
        autoReleaseDelayDays: 3,
        cancellationPolicy: 'MODERATE',
        cancellationFee: 10,
        milestones: [{
          title: 'Milestone 1',
          description: 'Work',
          deliverables: ['Deliverable'],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 5000,
          currency: 'EUR',
          order: 1,
          maxRevisions: 2,
        }],
      });

      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);
      await service.approveMilestone(milestone.id);

      const invoice = await service.generateInvoiceFromMilestone(milestone.id, {
        vatApplicable: true,
      });

      expect(invoice.reverseCharge).toBe(true);
      expect(invoice.vatTotal).toBe(0); // No VAT for reverse charge
      expect(invoice.total).toBe(5000);
    });

    it('should generate contract invoice from completed milestones', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      // Complete first two milestones (first one auto-starts on activation)
      for (let i = 0; i < 2; i++) {
        const milestone = contract.milestones[i];
        const currentMilestone = await service.getMilestone(milestone.id);
        if (currentMilestone!.status === 'PENDING') {
          await service.startMilestone(milestone.id);
        }
        await service.submitMilestone(milestone.id, []);
        await service.approveMilestone(milestone.id);
      }

      const invoice = await service.generateContractInvoice(contract.id, {
        vatApplicable: true,
        vatRate: 0.19,
      });

      expect(invoice.items.length).toBe(2);
      expect(invoice.subtotal).toBe(6000); // 2000 + 4000
      expect(invoice.vatTotal).toBe(1140); // 19% of 6000
      expect(invoice.total).toBe(7140);
    });

    it('should mark invoice as paid', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);
      await service.approveMilestone(milestone.id);

      const invoice = await service.generateInvoiceFromMilestone(milestone.id, {
        vatApplicable: false,
      });

      const paid = await service.markInvoicePaid(invoice.id);

      expect(paid.paymentStatus).toBe('PAID');
      expect(paid.paidAt).toBeDefined();
    });

    it('should submit invoice to e-Factura', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);
      await service.approveMilestone(milestone.id);

      const invoice = await service.generateInvoiceFromMilestone(milestone.id, {
        vatApplicable: true,
      });

      const submitted = await service.submitToEFactura(invoice.id);

      expect(submitted.eFacturaId).toBeDefined();
      expect(submitted.eFacturaStatus).toBe('SUBMITTED');
    });
  });

  describe('Contract Analytics', () => {
    it('should get contract analytics', async () => {
      const contract = await createTestContract();
      await service.signContract(contract.id, 'CLIENT', 'hash');
      await service.signContract(contract.id, 'FREELANCER', 'hash');

      // Complete first milestone
      const milestone = contract.milestones[0];
      await service.startMilestone(milestone.id);
      await service.submitMilestone(milestone.id, []);
      await service.approveMilestone(milestone.id);

      const analytics = await service.getContractAnalytics(contract.id);

      expect(analytics.progress.totalMilestones).toBe(3);
      expect(analytics.progress.completed).toBe(1);
      expect(analytics.progress.progressPercent).toBe(33);
      expect(analytics.financials.totalValue).toBe(10000);
      expect(analytics.timeline.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should track disputes in analytics', async () => {
      const contract = await createTestContract();

      await service.openDispute({
        contractId: contract.id,
        initiatedBy: 'CLIENT',
        initiatorId: 'client-1',
        reason: 'QUALITY',
        description: 'Issues',
        disputedAmount: 2000,
        currency: 'EUR',
      });

      const analytics = await service.getContractAnalytics(contract.id);

      expect(analytics.disputes.total).toBe(1);
      expect(analytics.disputes.open).toBe(1);
    });
  });

  describe('Reference Data', () => {
    it('should return platform fees', () => {
      const fees = service.getPlatformFees();

      expect(fees['STANDARD']).toBe(0.10);
      expect(fees['PREMIUM']).toBe(0.05);
      expect(fees['ENTERPRISE']).toBe(0.03);
    });

    it('should return Stripe fees', () => {
      const fees = service.getStripeFees();

      expect(fees['EU'].percent).toBe(0.014);
      expect(fees['NON_EU'].percent).toBe(0.029);
    });

    it('should return VAT rates', () => {
      const rates = service.getVatRates();

      expect(rates['STANDARD']).toBe(0.19);
      expect(rates['REDUCED']).toBe(0.09);
    });
  });
});

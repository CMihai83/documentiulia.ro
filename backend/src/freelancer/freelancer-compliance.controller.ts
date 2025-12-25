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
  FreelancerComplianceService,
  FreelancerTaxProfile,
  IncomeDeclaration,
  CrossBorderTransaction,
  MisclassificationRisk,
  InternationalTaxDocument,
  ComplianceAuditReport,
} from './freelancer-compliance.service';

// Freelancer Compliance & Tax Forms Controller
// PFA tax form generation, cross-border VAT, misclassification risk, international tax docs

@Controller('freelancer-compliance')
@UseGuards(ThrottlerGuard)
export class FreelancerComplianceController {
  constructor(private readonly complianceService: FreelancerComplianceService) {}

  // ===== TAX PROFILE =====

  @Post('tax-profile')
  async createTaxProfile(
    @Body() data: Omit<FreelancerTaxProfile, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    return this.complianceService.createTaxProfile(data);
  }

  @Get('tax-profile/:profileId')
  async getTaxProfile(@Param('profileId') profileId: string) {
    return this.complianceService.getTaxProfile(profileId);
  }

  @Get('tax-profile/freelancer/:freelancerId')
  async getTaxProfileByFreelancer(@Param('freelancerId') freelancerId: string) {
    return this.complianceService.getTaxProfileByFreelancer(freelancerId);
  }

  @Put('tax-profile/:profileId')
  async updateTaxProfile(
    @Param('profileId') profileId: string,
    @Body() updates: Partial<FreelancerTaxProfile>,
  ) {
    return this.complianceService.updateTaxProfile(profileId, updates);
  }

  // ===== INCOME DECLARATIONS =====

  @Post('declarations')
  async generateIncomeDeclaration(
    @Body('freelancerId') freelancerId: string,
    @Body('declarationType') declarationType: IncomeDeclaration['declarationType'],
    @Body('fiscalYear') fiscalYear: number,
    @Body('incomeSources') incomeSources: Array<{
      clientId: string;
      clientName: string;
      clientCountry: string;
      clientVatNumber?: string;
      amount: number;
      currency: string;
      invoiceCount: number;
      withholdingTax?: number;
    }>,
    @Body('deductions') deductions: Array<{
      category: string;
      description: string;
      amount: number;
      documentRef?: string;
      deductiblePercent: number;
    }>,
    @Body('quarter') quarter?: number,
    @Body('exchangeRates') exchangeRates?: Record<string, number>,
  ) {
    return this.complianceService.generateIncomeDeclaration({
      freelancerId,
      declarationType,
      fiscalYear,
      quarter,
      incomeSources,
      deductions: deductions as any,
      exchangeRates,
    });
  }

  @Get('declarations/:declarationId')
  async getDeclaration(@Param('declarationId') declarationId: string) {
    return this.complianceService.getIncomeDeclaration(declarationId);
  }

  @Get('declarations/freelancer/:freelancerId')
  async getDeclarationsForFreelancer(
    @Param('freelancerId') freelancerId: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    return this.complianceService.getDeclarationsForFreelancer(
      freelancerId,
      fiscalYear ? parseInt(fiscalYear, 10) : undefined,
    );
  }

  @Post('declarations/:declarationId/validate')
  async validateDeclaration(@Param('declarationId') declarationId: string) {
    return this.complianceService.validateDeclaration(declarationId);
  }

  @Post('declarations/:declarationId/submit')
  async submitDeclaration(@Param('declarationId') declarationId: string) {
    return this.complianceService.submitDeclaration(declarationId);
  }

  // ===== CROSS-BORDER TRANSACTIONS =====

  @Post('transactions')
  async recordTransaction(
    @Body('freelancerId') freelancerId: string,
    @Body('transactionType') transactionType: CrossBorderTransaction['transactionType'],
    @Body('clientId') clientId: string,
    @Body('clientCountry') clientCountry: string,
    @Body('isB2B') isB2B: boolean,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
    @Body('invoiceNumber') invoiceNumber: string,
    @Body('invoiceDate') invoiceDate: string,
    @Body('clientVatNumber') clientVatNumber?: string,
    @Body('exchangeRate') exchangeRate?: number,
  ) {
    return this.complianceService.recordCrossBorderTransaction({
      freelancerId,
      transactionType,
      clientId,
      clientCountry,
      clientVatNumber,
      isB2B,
      amount,
      currency,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      exchangeRate,
    });
  }

  @Get('transactions/freelancer/:freelancerId')
  async getTransactions(@Param('freelancerId') freelancerId: string) {
    return this.complianceService.getTransactionsForFreelancer(freelancerId);
  }

  // ===== VAT RETURNS =====

  @Post('vat-returns')
  async generateVATReturn(
    @Body('freelancerId') freelancerId: string,
    @Body('period') period: string,
    @Body('periodType') periodType: 'MONTHLY' | 'QUARTERLY',
  ) {
    return this.complianceService.generateVATReturn(freelancerId, period, periodType);
  }

  // ===== MISCLASSIFICATION RISK =====

  @Post('misclassification/assess')
  async assessMisclassificationRisk(
    @Body('freelancerId') freelancerId: string,
    @Body('clientId') clientId: string,
    @Body('workArrangement') workArrangement: {
      hasFixedSchedule: boolean;
      worksOnClientPremises: boolean;
      usesClientTools: boolean;
      hasMultipleClients: boolean;
      clientPercentageOfIncome: number;
      contractDuration: number;
      canRefuseWork: boolean;
      setsOwnRates: boolean;
      bearsBusinesRisk: boolean;
      hasOwnBrand: boolean;
      hasSubstitutionRight: boolean;
      receivesTraining: boolean;
      hasPerformanceReviews: boolean;
      integratedIntoOrg: boolean;
      exclusivityClause: boolean;
      paidByHour: boolean;
    },
  ) {
    return this.complianceService.assessMisclassificationRisk({
      freelancerId,
      clientId,
      workArrangement,
    });
  }

  @Get('misclassification/:riskId')
  async getMisclassificationRisk(@Param('riskId') riskId: string) {
    return this.complianceService.getMisclassificationRisk(riskId);
  }

  @Get('misclassification/freelancer/:freelancerId')
  async getRisksForFreelancer(@Param('freelancerId') freelancerId: string) {
    return this.complianceService.getRisksForFreelancer(freelancerId);
  }

  // ===== INTERNATIONAL TAX DOCUMENTS =====

  @Post('international-docs/w8ben')
  async generateW8BEN(
    @Body('freelancerId') freelancerId: string,
    @Body('clientId') clientId: string,
    @Body('clientCountry') clientCountry: string,
    @Body('beneficialOwner') beneficialOwner: string,
    @Body('countryOfResidence') countryOfResidence: string,
    @Body('taxIdNumber') taxIdNumber: string,
    @Body('taxIdType') taxIdType: string,
    @Body('address') address: {
      street: string;
      city: string;
      county: string;
      postalCode: string;
      country: string;
    },
    @Body('claimsTreatyBenefits') claimsTreatyBenefits: boolean,
  ) {
    return this.complianceService.generateW8BEN({
      freelancerId,
      clientId,
      clientCountry,
      beneficialOwner,
      countryOfResidence,
      taxIdNumber,
      taxIdType,
      address,
      claimsTreatyBenefits,
    });
  }

  @Post('international-docs/tax-residency')
  async generateTaxResidencyCertificate(
    @Body('freelancerId') freelancerId: string,
    @Body('fiscalYear') fiscalYear: number,
    @Body('purpose') purpose: string,
    @Body('requestingCountry') requestingCountry: string,
  ) {
    return this.complianceService.generateTaxResidencyCertificate({
      freelancerId,
      fiscalYear,
      purpose,
      requestingCountry,
    });
  }

  @Post('international-docs/:docId/sign')
  async signDocument(
    @Param('docId') docId: string,
    @Body('signatureHash') signatureHash: string,
  ) {
    return this.complianceService.signInternationalDocument(docId, signatureHash);
  }

  @Get('international-docs/:docId')
  async getInternationalDocument(@Param('docId') docId: string) {
    return this.complianceService.getInternationalDocument(docId);
  }

  @Get('international-docs/freelancer/:freelancerId')
  async getDocumentsForFreelancer(@Param('freelancerId') freelancerId: string) {
    return this.complianceService.getDocumentsForFreelancer(freelancerId);
  }

  // ===== COMPLIANCE AUDIT =====

  @Post('audit')
  async generateAuditReport(
    @Body('freelancerId') freelancerId: string,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string,
    @Body('auditType') auditType: ComplianceAuditReport['auditType'],
  ) {
    return this.complianceService.generateComplianceAuditReport({
      freelancerId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      auditType,
    });
  }

  @Get('audit/:reportId')
  async getAuditReport(@Param('reportId') reportId: string) {
    return this.complianceService.getAuditReport(reportId);
  }

  @Get('audit/freelancer/:freelancerId')
  async getAuditReportsForFreelancer(@Param('freelancerId') freelancerId: string) {
    return this.complianceService.getAuditReportsForFreelancer(freelancerId);
  }

  // ===== REFERENCE DATA =====

  @Get('reference/tax-constants')
  getTaxConstants() {
    return this.complianceService.getTaxConstants();
  }

  @Get('reference/eu-vat-rates')
  getEUVATRates() {
    return this.complianceService.getEUVATRates();
  }

  @Get('reference/tax-treaty-rates')
  getTaxTreatyRates() {
    return this.complianceService.getTaxTreatyRates();
  }

  @Get('reference/declaration-types')
  getDeclarationTypes() {
    return this.complianceService.getDeclarationTypes();
  }

  @Get('reference/deduction-categories')
  getDeductionCategories() {
    return this.complianceService.getDeductionCategories();
  }
}

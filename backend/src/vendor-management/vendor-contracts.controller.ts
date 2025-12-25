import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  VendorContractsService,
  ContractType,
  ContractStatus,
  RenewalType,
  ContractTerm,
  ContractDeliverable,
  SLAMetric,
  ContractSignatory,
  AmendmentChange,
  ContractDocument,
  TemplateVariable,
} from './vendor-contracts.service';

@ApiTags('Vendor Management - Contracts')
@Controller('vendors/contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorContractsController {
  constructor(private readonly contractsService: VendorContractsService) {}

  // =================== CONTRACTS ===================

  @Post()
  @ApiOperation({ summary: 'Create vendor contract' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  async createContract(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      name: string;
      description?: string;
      type: ContractType;
      parentContractId?: string;
      effectiveDate: string;
      expirationDate: string;
      value?: number;
      currency?: string;
      paymentTerms?: string;
      renewalType?: RenewalType;
      renewalNoticeDays?: number;
      autoRenewalPeriodMonths?: number;
      terms?: Omit<ContractTerm, 'id'>[];
      deliverables?: Omit<ContractDeliverable, 'id'>[];
      slaMetrics?: Omit<SLAMetric, 'id'>[];
      signatories?: Omit<ContractSignatory, 'id'>[];
      tags?: string[];
      notes?: string;
    },
  ) {
    try {
      return await this.contractsService.createContract({
        tenantId: req.user.tenantId,
        vendorId: body.vendorId,
        name: body.name,
        description: body.description,
        type: body.type,
        parentContractId: body.parentContractId,
        effectiveDate: new Date(body.effectiveDate),
        expirationDate: new Date(body.expirationDate),
        value: body.value,
        currency: body.currency,
        paymentTerms: body.paymentTerms,
        renewalType: body.renewalType,
        renewalNoticeDays: body.renewalNoticeDays,
        autoRenewalPeriodMonths: body.autoRenewalPeriodMonths,
        terms: body.terms,
        deliverables: body.deliverables,
        slaMetrics: body.slaMetrics,
        signatories: body.signatories,
        tags: body.tags,
        notes: body.notes,
        createdBy: req.user.id,
        createdByName: req.user.name || req.user.email,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get contracts' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Contracts list' })
  async getContracts(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('type') type?: ContractType,
    @Query('status') status?: ContractStatus,
    @Query('expiringWithinDays') expiringWithinDays?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractsService.getContracts(req.user.tenantId, {
      vendorId,
      type,
      status,
      expiringWithinDays: expiringWithinDays ? parseInt(expiringWithinDays) : undefined,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get contract statistics' })
  @ApiResponse({ status: 200, description: 'Contract statistics' })
  async getStatistics(@Request() req: any) {
    return this.contractsService.getContractStatistics(req.user.tenantId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring contracts' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expiring contracts list' })
  async getExpiringContracts(
    @Request() req: any,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const contracts = await this.contractsService.getExpiringContracts(
      req.user.tenantId,
      daysAhead ? parseInt(daysAhead) : 30,
    );
    return { contracts, total: contracts.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  async getContract(@Param('id') id: string) {
    const contract = await this.contractsService.getContract(id);
    if (!contract) {
      return { error: 'Contract not found' };
    }
    return contract;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contract' })
  @ApiResponse({ status: 200, description: 'Contract updated' })
  async updateContract(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      value?: number;
      paymentTerms?: string;
      renewalType?: RenewalType;
      renewalNoticeDays?: number;
      tags?: string[];
      notes?: string;
    },
  ) {
    try {
      const contract = await this.contractsService.updateContract(id, body);
      if (!contract) {
        return { error: 'Contract not found' };
      }
      return contract;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit contract for approval' })
  @ApiResponse({ status: 200, description: 'Contract submitted' })
  async submitForApproval(@Request() req: any, @Param('id') id: string) {
    const contract = await this.contractsService.submitForApproval(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!contract) {
      return { error: 'Contract not found or not in draft status' };
    }
    return contract;
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve contract' })
  @ApiResponse({ status: 200, description: 'Contract approved' })
  async approveContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { comments?: string },
  ) {
    const contract = await this.contractsService.approveContract(
      id,
      req.user.id,
      req.user.name || req.user.email,
      body.comments,
    );
    if (!contract) {
      return { error: 'Contract not found or not pending approval' };
    }
    return contract;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject contract' })
  @ApiResponse({ status: 200, description: 'Contract rejected' })
  async rejectContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const contract = await this.contractsService.rejectContract(
      id,
      req.user.id,
      req.user.name || req.user.email,
      body.reason,
    );
    if (!contract) {
      return { error: 'Contract not found or not pending approval' };
    }
    return contract;
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate contract' })
  @ApiResponse({ status: 200, description: 'Contract terminated' })
  async terminateContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { terminationDate: string; reason: string },
  ) {
    const contract = await this.contractsService.terminateContract(
      id,
      new Date(body.terminationDate),
      body.reason,
      req.user.id,
    );
    if (!contract) {
      return { error: 'Contract not found or not active' };
    }
    return contract;
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew contract' })
  @ApiResponse({ status: 200, description: 'Contract renewed' })
  async renewContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { newExpirationDate: string },
  ) {
    const contract = await this.contractsService.renewContract(
      id,
      new Date(body.newExpirationDate),
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!contract) {
      return { error: 'Contract not found or not active' };
    }
    return contract;
  }

  // =================== DELIVERABLES ===================

  @Put(':id/deliverables/:deliverableId')
  @ApiOperation({ summary: 'Update deliverable' })
  @ApiResponse({ status: 200, description: 'Deliverable updated' })
  async updateDeliverable(
    @Request() req: any,
    @Param('id') id: string,
    @Param('deliverableId') deliverableId: string,
    @Body() body: Partial<ContractDeliverable>,
  ) {
    const contract = await this.contractsService.updateDeliverable(
      id,
      deliverableId,
      body,
      req.user.id,
    );
    if (!contract) {
      return { error: 'Contract or deliverable not found' };
    }
    return contract;
  }

  // =================== AMENDMENTS ===================

  @Post(':id/amendments')
  @ApiOperation({ summary: 'Create contract amendment' })
  @ApiResponse({ status: 201, description: 'Amendment created' })
  async createAmendment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      description: string;
      effectiveDate: string;
      changes: AmendmentChange[];
    },
  ) {
    const amendment = await this.contractsService.createAmendment(id, {
      description: body.description,
      effectiveDate: new Date(body.effectiveDate),
      changes: body.changes,
      createdBy: req.user.id,
    });
    if (!amendment) {
      return { error: 'Contract not found or not active' };
    }
    return amendment;
  }

  @Post(':id/amendments/:amendmentId/approve')
  @ApiOperation({ summary: 'Approve amendment' })
  @ApiResponse({ status: 200, description: 'Amendment approved' })
  async approveAmendment(
    @Request() req: any,
    @Param('id') id: string,
    @Param('amendmentId') amendmentId: string,
  ) {
    const amendment = await this.contractsService.approveAmendment(
      id,
      amendmentId,
      req.user.id,
    );
    if (!amendment) {
      return { error: 'Amendment not found or not pending' };
    }
    return amendment;
  }

  // =================== DOCUMENTS ===================

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add contract document' })
  @ApiResponse({ status: 201, description: 'Document added' })
  async addDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      name: string;
      type: ContractDocument['type'];
      version: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
    },
  ) {
    const document = await this.contractsService.addDocument(id, {
      name: body.name,
      type: body.type,
      version: body.version,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileSize: body.fileSize,
      uploadedBy: req.user.id,
    });
    if (!document) {
      return { error: 'Contract not found' };
    }
    return document;
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create contract template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: ContractType;
      content: string;
      variables?: TemplateVariable[];
      defaultTerms?: Omit<ContractTerm, 'id'>[];
    },
  ) {
    return this.contractsService.createTemplate({
      tenantId: req.user.tenantId,
      name: body.name,
      description: body.description,
      type: body.type,
      content: body.content,
      variables: body.variables,
      defaultTerms: body.defaultTerms,
      createdBy: req.user.id,
    });
  }

  @Get('templates/list')
  @ApiOperation({ summary: 'Get contract templates' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('type') type?: ContractType,
  ) {
    const templates = await this.contractsService.getTemplates(req.user.tenantId, type);
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.contractsService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }
}

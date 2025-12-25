import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HRContractsService } from './hr-contracts.service';
import { ContractGeneratorService, ContractTemplateCategory } from './contract-generator.service';
import { RevisalService, RevisalOperationType, RevisalSubmissionStatus } from './revisal.service';
import { CreateHRContractDto } from './dto/create-hr-contract.dto';
import { UpdateHRContractDto, SignContractDto } from './dto/update-hr-contract.dto';
import { HRContractStatus, HRContractType } from '@prisma/client';

@ApiTags('HR Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr-contracts')
export class HRContractsController {
  constructor(
    private readonly hrContractsService: HRContractsService,
    private readonly contractGenerator: ContractGeneratorService,
    private readonly revisalService: RevisalService,
  ) {}

  // =================== CONTRACT CRUD ===================

  @Post()
  @ApiOperation({ summary: 'Create a new HR contract' })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or duplicate contract' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async create(@Request() req: any, @Body() dto: CreateHRContractDto) {
    return this.hrContractsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all HR contracts' })
  @ApiQuery({ name: 'status', required: false, enum: HRContractStatus })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of contracts with pagination' })
  async findAll(
    @Request() req: any,
    @Query('status') status?: HRContractStatus,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrContractsService.findAll(req.user.sub, {
      status,
      employeeId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get contract statistics' })
  @ApiResponse({ status: 200, description: 'Contract statistics and expiring contracts' })
  async getStatistics(@Request() req: any) {
    return this.hrContractsService.getStatistics(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single HR contract by ID' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.hrContractsService.findOne(req.user.sub, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an HR contract' })
  @ApiResponse({ status: 200, description: 'Contract updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify active contracts directly' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHRContractDto,
  ) {
    return this.hrContractsService.update(req.user.sub, id, dto);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign an HR contract (employee or employer)' })
  @ApiResponse({ status: 200, description: 'Contract signed successfully' })
  @ApiResponse({ status: 400, description: 'Contract not in signable state' })
  async signContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SignContractDto,
  ) {
    return this.hrContractsService.signContract(req.user.sub, id, dto);
  }

  @Post(':id/submit-revisal')
  @ApiOperation({ summary: 'Submit contract to REVISAL (ITM registry)' })
  @ApiResponse({ status: 200, description: 'Contract submitted to REVISAL' })
  @ApiResponse({ status: 400, description: 'Contract must be active to submit' })
  async submitToRevisal(@Request() req: any, @Param('id') id: string) {
    return this.hrContractsService.submitToRevisal(req.user.sub, id);
  }

  @Post(':id/amendments')
  @ApiOperation({ summary: 'Create a contract amendment' })
  @ApiResponse({ status: 201, description: 'Amendment created successfully' })
  @ApiResponse({ status: 400, description: 'Contract must be active for amendments' })
  async createAmendment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string; changes: Record<string, any>; effectiveDate: string },
  ) {
    return this.hrContractsService.createAmendment(req.user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate an HR contract' })
  @ApiResponse({ status: 200, description: 'Contract terminated' })
  @ApiResponse({ status: 400, description: 'Contract already terminated' })
  async terminate(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.hrContractsService.terminate(req.user.sub, id, reason);
  }

  // =================== CONTRACT GENERATOR ===================

  @Get('generator/templates')
  @ApiOperation({ summary: 'Get all contract templates' })
  @ApiQuery({ name: 'category', enum: ContractTemplateCategory, required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiResponse({ status: 200, description: 'List of available contract templates' })
  async getTemplates(
    @Query('category') category?: ContractTemplateCategory,
    @Query('locale') locale?: string,
  ) {
    return this.contractGenerator.getTemplates(category, locale);
  }

  @Get('generator/templates/:templateId')
  @ApiOperation({ summary: 'Get specific contract template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details with clauses' })
  async getTemplate(@Param('templateId') templateId: string) {
    return this.contractGenerator.getTemplate(templateId);
  }

  @Post('generator/suggest-clauses')
  @ApiOperation({ summary: 'Get AI-powered clause suggestions for contract' })
  @ApiResponse({ status: 200, description: 'List of suggested clauses with confidence scores' })
  async suggestClauses(
    @Body() data: {
      contractType: HRContractType;
      position: string;
      department?: string;
      salary: number;
      isManager?: boolean;
      hasAccessToConfidential?: boolean;
      workRemotely?: boolean;
    },
  ) {
    return this.contractGenerator.suggestClauses(data.contractType, {
      position: data.position,
      department: data.department,
      salary: data.salary,
      isManager: data.isManager,
      hasAccessToConfidential: data.hasAccessToConfidential,
      workRemotely: data.workRemotely,
    });
  }

  @Post('generator/generate')
  @ApiOperation({ summary: 'Generate a contract from template with AI clause engine' })
  @ApiResponse({ status: 201, description: 'Generated contract with HTML/text content' })
  @ApiResponse({ status: 400, description: 'Missing required fields or validation error' })
  async generateContract(
    @Request() req: any,
    @Body() data: {
      templateId: string;
      employeeId: string;
      employerName: string;
      employerCui: string;
      employerAddress: string;
      employerRepresentative: string;
      employeeName: string;
      employeeCnp: string;
      employeeAddress: string;
      position: string;
      department?: string;
      salary: number;
      currency?: string;
      workHours?: number;
      startDate: string;
      endDate?: string;
      probationDays?: number;
      workLocation: string;
      workSchedule?: string;
      telework?: {
        enabled: boolean;
        daysPerWeek: number;
        equipment: string[];
        expenses: number;
        schedule: string;
      };
      nonCompete?: {
        enabled: boolean;
        durationMonths: number;
        geographicScope: string;
        compensation: number;
        activities: string[];
      };
    },
  ) {
    return this.contractGenerator.generateContract(
      req.user.sub,
      data.templateId,
      data.employeeId,
      {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    );
  }

  @Get('generator/contracts/:contractId')
  @ApiOperation({ summary: 'Get a generated contract by ID' })
  @ApiParam({ name: 'contractId', description: 'Generated contract ID' })
  @ApiResponse({ status: 200, description: 'Generated contract details' })
  async getGeneratedContract(@Param('contractId') contractId: string) {
    return this.contractGenerator.getGeneratedContract(contractId);
  }

  @Post('generator/contracts/:contractId/validate')
  @ApiOperation({ summary: 'Validate a generated contract against Romanian labor law' })
  @ApiResponse({ status: 200, description: 'Validation results with errors and warnings' })
  async validateContract(@Param('contractId') contractId: string) {
    const contract = this.contractGenerator.getGeneratedContract(contractId);
    return this.contractGenerator.validateContract(contract);
  }

  @Post('generator/contracts/:contractId/signature')
  @ApiOperation({ summary: 'Request e-signature for a contract (DocuSign/Adobe Sign/Internal)' })
  @ApiResponse({ status: 201, description: 'Signature request created' })
  async requestSignature(
    @Param('contractId') contractId: string,
    @Body() data: {
      signerType: 'employer' | 'employee';
      signerEmail: string;
      provider?: 'docusign' | 'adobesign' | 'internal';
    },
  ) {
    return this.contractGenerator.requestSignature(
      contractId,
      data.signerType,
      data.signerEmail,
      data.provider || 'internal',
    );
  }

  @Post('generator/contracts/:contractId/signature/:signatureId/record')
  @ApiOperation({ summary: 'Record a completed signature' })
  @ApiResponse({ status: 200, description: 'Signature recorded, contract status updated' })
  async recordSignature(
    @Param('contractId') contractId: string,
    @Param('signatureId') signatureId: string,
    @Body() data: { signatureUrl: string; ipAddress?: string },
  ) {
    return this.contractGenerator.recordSignature(contractId, signatureId, data);
  }

  @Get('generator/statistics')
  @ApiOperation({ summary: 'Get contract generator statistics' })
  @ApiResponse({ status: 200, description: 'Statistics on templates and generated contracts' })
  async getGeneratorStatistics() {
    return this.contractGenerator.getStatistics();
  }

  // =================== REVISAL INTEGRATION ===================

  @Post('revisal/submissions')
  @ApiOperation({ summary: 'Create a REVISAL submission for ITM' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  async createRevisalSubmission(
    @Request() req: any,
    @Body() data: {
      employeeId: string;
      contractId: string;
      operationType: RevisalOperationType;
      employeeData: {
        cnp: string;
        nume: string;
        prenume: string;
        dataNastere: string;
        locNastere: string;
        cetatenie: string;
        adresa: string;
        actIdentitate: {
          tip: 'CI' | 'BI' | 'PASAPORT';
          serie: string;
          numar: string;
          dataEliberare: string;
          dataExpirare: string;
        };
        studii: {
          nivel: string;
          specializare?: string;
        };
      };
      contractData: {
        numarContract: string;
        dataContract: string;
        tipContract: string;
        dataInceput: string;
        dataSfarsit?: string;
        perioadaProba?: number;
        functie: string;
        codCOR: string;
        salariu: number;
        norma: number;
        locMunca: string;
        conditiiMunca: string;
      };
      changes?: Record<string, { old: any; new: any }>;
    },
  ) {
    return this.revisalService.createSubmission(
      req.user.sub,
      data.employeeId,
      data.contractId,
      data.operationType,
      {
        ...data.employeeData,
        dataNastere: new Date(data.employeeData.dataNastere),
        actIdentitate: {
          ...data.employeeData.actIdentitate,
          dataEliberare: new Date(data.employeeData.actIdentitate.dataEliberare),
          dataExpirare: new Date(data.employeeData.actIdentitate.dataExpirare),
        },
        studii: data.employeeData.studii as any,
      },
      {
        ...data.contractData,
        dataContract: new Date(data.contractData.dataContract),
        dataInceput: new Date(data.contractData.dataInceput),
        dataSfarsit: data.contractData.dataSfarsit ? new Date(data.contractData.dataSfarsit) : undefined,
        tipContract: data.contractData.tipContract as any,
        conditiiMunca: data.contractData.conditiiMunca as any,
      },
      data.changes,
    );
  }

  @Get('revisal/submissions')
  @ApiOperation({ summary: 'Get all REVISAL submissions' })
  @ApiQuery({ name: 'status', enum: RevisalSubmissionStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of REVISAL submissions' })
  async getRevisalSubmissions(
    @Request() req: any,
    @Query('status') status?: RevisalSubmissionStatus,
  ) {
    return this.revisalService.getUserSubmissions(req.user.sub, status);
  }

  @Get('revisal/submissions/:submissionId')
  @ApiOperation({ summary: 'Get specific REVISAL submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Submission details with XML content' })
  async getRevisalSubmission(@Param('submissionId') submissionId: string) {
    return this.revisalService.getSubmission(submissionId);
  }

  @Post('revisal/submissions/:submissionId/validate')
  @ApiOperation({ summary: 'Validate REVISAL submission against ITM requirements' })
  @ApiResponse({ status: 200, description: 'Validation results' })
  async validateRevisalSubmission(@Param('submissionId') submissionId: string) {
    return this.revisalService.validateSubmission(submissionId);
  }

  @Post('revisal/submissions/:submissionId/submit')
  @ApiOperation({ summary: 'Submit to REVISAL/ITM system' })
  @ApiResponse({ status: 200, description: 'Submission sent to ITM' })
  @ApiResponse({ status: 400, description: 'Submission must be validated first' })
  async submitToRevisalApi(@Param('submissionId') submissionId: string) {
    return this.revisalService.submitToRevisal(submissionId);
  }

  @Get('revisal/submissions/:submissionId/status')
  @ApiOperation({ summary: 'Check REVISAL submission status' })
  @ApiResponse({ status: 200, description: 'Current submission status' })
  async checkRevisalStatus(@Param('submissionId') submissionId: string) {
    return this.revisalService.checkSubmissionStatus(submissionId);
  }

  @Get('revisal/cor-codes')
  @ApiOperation({ summary: 'Get all COR (Clasificarea Ocupatiilor din Romania) codes' })
  @ApiResponse({ status: 200, description: 'Map of positions to COR codes' })
  async getCORCodes() {
    return this.revisalService.getCORCodes();
  }

  @Get('revisal/cor-codes/:position')
  @ApiOperation({ summary: 'Get COR code for a specific position' })
  @ApiParam({ name: 'position', description: 'Job position/title' })
  @ApiResponse({ status: 200, description: 'Position with corresponding COR code' })
  async getCORCode(@Param('position') position: string) {
    return { position, codCOR: this.revisalService.getCORCode(position) };
  }

  @Get('revisal/statistics')
  @ApiOperation({ summary: 'Get REVISAL submission statistics' })
  @ApiResponse({ status: 200, description: 'Statistics on submissions by status and operation type' })
  async getRevisalStatistics(@Request() req: any) {
    return this.revisalService.getStatistics(req.user.sub);
  }

  // =================== D112 DECLARATIONS ===================

  @Post('revisal/d112/generate')
  @ApiOperation({ summary: 'Generate D112 payroll declaration for ANAF' })
  @ApiResponse({ status: 201, description: 'D112 declaration generated with XML' })
  async generateD112(
    @Request() req: any,
    @Body() data: { month: number; year: number },
  ) {
    return this.revisalService.generateD112(req.user.sub, data.month, data.year);
  }

  @Get('revisal/d112/:declarationId')
  @ApiOperation({ summary: 'Get D112 declaration by ID' })
  @ApiParam({ name: 'declarationId', description: 'D112 Declaration ID' })
  @ApiResponse({ status: 200, description: 'D112 declaration details' })
  async getD112Declaration(@Param('declarationId') declarationId: string) {
    return this.revisalService.getD112Declaration(declarationId);
  }

  @Post('revisal/d112/:declarationId/submit')
  @ApiOperation({ summary: 'Submit D112 declaration to ANAF' })
  @ApiResponse({ status: 200, description: 'D112 submitted to ANAF' })
  async submitD112(@Param('declarationId') declarationId: string) {
    return this.revisalService.submitD112(declarationId);
  }
}

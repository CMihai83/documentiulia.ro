import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  HSEService,
  RiskCategory,
  RiskLikelihood,
  RiskSeverity,
  RiskLevel,
  ControlHierarchy,
  ControlStatus,
  AssessmentStatus,
  HazardSource,
  PSSRStatus,
  GeoLocation,
  Hazard,
  RiskAssessment,
  AssessorInfo,
  PSSR,
  PSSRFinding,
} from './hse.service';

// HSE (Health, Safety, Environment) Controller
// API endpoints for digital risk register, hazard mapping, and ISO 45001 compliance

@Controller('hse')
@UseGuards(ThrottlerGuard)
export class HSEController {
  constructor(private readonly hseService: HSEService) {}

  // ===== LOCATIONS / GIS =====

  @Post('locations')
  async createLocation(@Body() data: Partial<GeoLocation>) {
    return this.hseService.createLocation(data);
  }

  @Get('locations')
  async listLocations(@Query('parentId') parentId?: string) {
    return this.hseService.listLocations(parentId);
  }

  @Get('locations/:locationId')
  async getLocation(@Param('locationId') locationId: string) {
    return this.hseService.getLocation(locationId);
  }

  @Get('locations/:locationId/hierarchy')
  async getLocationHierarchy(@Param('locationId') locationId: string) {
    return this.hseService.getLocationHierarchy(locationId);
  }

  @Get('locations/:locationId/children')
  async getLocationChildren(@Param('locationId') locationId: string) {
    return this.hseService.getLocationChildren(locationId);
  }

  @Get('locations/:locationId/hazard-map')
  async getLocationHazardMap(@Param('locationId') locationId: string) {
    return this.hseService.getLocationHazardMap(locationId);
  }

  // ===== HAZARDS =====

  @Post('hazards')
  async createHazard(
    @Body() data: Partial<Hazard>,
    @Body('identifiedBy') identifiedBy: string,
  ) {
    return this.hseService.createHazard(data, identifiedBy || 'system');
  }

  @Get('hazards')
  async listHazards(
    @Query('category') category?: RiskCategory,
    @Query('locationId') locationId?: string,
    @Query('status') status?: 'ACTIVE' | 'CONTROLLED' | 'ELIMINATED',
    @Query('source') source?: HazardSource,
  ) {
    return this.hseService.listHazards({ category, locationId, status, source });
  }

  @Get('hazards/categories')
  async getHazardCategories() {
    return this.hseService.getHazardCategories();
  }

  @Get('hazards/:hazardId')
  async getHazard(@Param('hazardId') hazardId: string) {
    return this.hseService.getHazard(hazardId);
  }

  @Put('hazards/:hazardId')
  async updateHazard(
    @Param('hazardId') hazardId: string,
    @Body() data: Partial<Hazard>,
  ) {
    return this.hseService.updateHazard(hazardId, data);
  }

  // ===== RISK ASSESSMENTS =====

  @Post('risk-assessments')
  async createRiskAssessment(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('hazardId') hazardId: string,
    @Body('locationId') locationId: string,
    @Body('assessor') assessor: AssessorInfo,
    @Body('initialLikelihood') initialLikelihood: RiskLikelihood,
    @Body('initialSeverity') initialSeverity: RiskSeverity,
    @Body('isoClause') isoClause?: string,
    @Body('legalRequirements') legalRequirements?: string[],
  ) {
    return this.hseService.createRiskAssessment({
      title,
      description,
      hazardId,
      locationId,
      assessor,
      initialLikelihood,
      initialSeverity,
      isoClause,
      legalRequirements,
    });
  }

  @Get('risk-assessments')
  async listRiskAssessments(
    @Query('status') status?: AssessmentStatus,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('locationId') locationId?: string,
    @Query('hazardId') hazardId?: string,
    @Query('overdueReview') overdueReview?: string,
  ) {
    return this.hseService.listRiskAssessments({
      status,
      riskLevel,
      locationId,
      hazardId,
      overdueReview: overdueReview === 'true',
    });
  }

  @Get('risk-assessments/:assessmentId')
  async getRiskAssessment(@Param('assessmentId') assessmentId: string) {
    return this.hseService.getRiskAssessment(assessmentId);
  }

  @Put('risk-assessments/:assessmentId')
  async updateRiskAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body() data: Partial<RiskAssessment>,
  ) {
    return this.hseService.updateRiskAssessment(assessmentId, data);
  }

  @Post('risk-assessments/:assessmentId/submit')
  async submitForReview(@Param('assessmentId') assessmentId: string) {
    return this.hseService.submitForReview(assessmentId);
  }

  @Post('risk-assessments/:assessmentId/approve')
  async approveAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body('reviewer') reviewer: AssessorInfo,
  ) {
    return this.hseService.approveAssessment(assessmentId, reviewer);
  }

  @Post('risk-assessments/:assessmentId/reject')
  async rejectAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body('reviewer') reviewer: AssessorInfo,
    @Body('reason') reason: string,
  ) {
    return this.hseService.rejectAssessment(assessmentId, reviewer, reason);
  }

  // ===== CONTROL MEASURES =====

  @Post('risk-assessments/:assessmentId/controls')
  async addControlMeasure(
    @Param('assessmentId') assessmentId: string,
    @Body('description') description: string,
    @Body('hierarchy') hierarchy: ControlHierarchy,
    @Body('responsiblePerson') responsiblePerson: string,
    @Body('targetDate') targetDate: string,
    @Body('cost') cost?: number,
    @Body('currency') currency?: string,
  ) {
    return this.hseService.addControlMeasure(assessmentId, {
      description,
      hierarchy,
      responsiblePerson,
      targetDate: new Date(targetDate),
      cost,
      currency,
    });
  }

  @Put('risk-assessments/:assessmentId/controls/:controlId/status')
  async updateControlStatus(
    @Param('assessmentId') assessmentId: string,
    @Param('controlId') controlId: string,
    @Body('status') status: ControlStatus,
    @Body('verifiedBy') verifiedBy?: string,
  ) {
    return this.hseService.updateControlStatus(assessmentId, controlId, status, verifiedBy);
  }

  @Post('risk-assessments/:assessmentId/controls/:controlId/effectiveness')
  async rateControlEffectiveness(
    @Param('assessmentId') assessmentId: string,
    @Param('controlId') controlId: string,
    @Body('rating', ParseIntPipe) rating: number,
    @Body('notes') notes?: string,
  ) {
    return this.hseService.rateControlEffectiveness(assessmentId, controlId, rating, notes);
  }

  @Get('controls/overdue')
  async getOverdueControls() {
    return this.hseService.getOverdueControls();
  }

  // ===== PSSR (Pre-Startup Safety Review) =====

  @Post('pssr')
  async createPSSR(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('locationId') locationId: string,
    @Body('scheduledDate') scheduledDate: string,
    @Body('assessor') assessor: AssessorInfo,
  ) {
    return this.hseService.createPSSR({
      title,
      description,
      locationId,
      scheduledDate: new Date(scheduledDate),
      assessor,
    });
  }

  @Get('pssr')
  async listPSSRs(
    @Query('locationId') locationId?: string,
    @Query('status') status?: PSSRStatus,
    @Query('overdue') overdue?: string,
  ) {
    return this.hseService.listPSSRs({
      locationId,
      status,
      overdue: overdue === 'true',
    });
  }

  @Get('pssr/:pssrId')
  async getPSSR(@Param('pssrId') pssrId: string) {
    return this.hseService.getPSSR(pssrId);
  }

  @Put('pssr/:pssrId/checklist/:itemId')
  async updatePSSRChecklist(
    @Param('pssrId') pssrId: string,
    @Param('itemId') itemId: string,
    @Body('response') response: 'YES' | 'NO' | 'NA',
    @Body('comments') comments?: string,
  ) {
    return this.hseService.updatePSSRChecklist(pssrId, itemId, response, comments);
  }

  @Post('pssr/:pssrId/findings')
  async addPSSRFinding(
    @Param('pssrId') pssrId: string,
    @Body() finding: Omit<PSSRFinding, 'id' | 'status' | 'closedDate' | 'closedBy'>,
  ) {
    return this.hseService.addPSSRFinding(pssrId, finding);
  }

  @Post('pssr/:pssrId/complete')
  async completePSSR(
    @Param('pssrId') pssrId: string,
    @Body('result') result: 'PASS' | 'PASS_WITH_CONDITIONS' | 'FAIL',
    @Body('recommendations') recommendations: string[],
  ) {
    return this.hseService.completePSSR(pssrId, result, recommendations);
  }

  // ===== RISK MATRIX & REFERENCES =====

  @Get('risk-matrix')
  async getRiskMatrix() {
    return this.hseService.getRiskMatrix();
  }

  @Get('control-hierarchy')
  async getControlHierarchyGuidance() {
    return this.hseService.getControlHierarchyGuidance();
  }

  // ===== REPORTS & DASHBOARDS =====

  @Get('summary')
  async getRiskRegisterSummary() {
    return this.hseService.getRiskRegisterSummary();
  }

  // ===== ISO 45001 COMPLIANCE =====

  @Get('iso45001/clauses')
  async getISO45001Clauses() {
    return this.hseService.getISO45001Clauses();
  }

  @Put('iso45001/clauses/:clause')
  async updateISO45001Compliance(
    @Param('clause') clause: string,
    @Body('status') status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE',
    @Body('evidence') evidence: string[],
    @Body('gaps') gaps?: string[],
    @Body('actions') actions?: string[],
  ) {
    return this.hseService.updateISO45001Compliance(clause, status, evidence, gaps, actions);
  }

  @Get('iso45001/score')
  async getISO45001ComplianceScore() {
    return this.hseService.getISO45001ComplianceScore();
  }
}

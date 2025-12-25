import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FinanceOpsCoursesService } from './finance-ops-courses.service';

// Finance for Operations & RO GAAP Courses Controller
// Budgeting, cash flow, RO GAAP, IFRS, cost accounting, financial analysis
// Practical exercises, regulations, credentials

@Controller('lms/finance-courses')
@UseGuards(ThrottlerGuard)
export class FinanceOpsCoursesController {
  constructor(private readonly coursesService: FinanceOpsCoursesService) {}

  // ===== COURSE TEMPLATES =====

  @Get('templates/budgeting')
  getBudgetingTemplate() {
    return this.coursesService.getBudgetingFundamentalsTemplate();
  }

  @Get('templates/cash-flow')
  getCashFlowTemplate() {
    return this.coursesService.getCashFlowForecastingTemplate();
  }

  @Get('templates/ro-gaap')
  getROGAAPTemplate() {
    return this.coursesService.getROGAAPComplianceTemplate();
  }

  @Get('templates/ifrs')
  getIFRSTemplate() {
    return this.coursesService.getIFRSFundamentalsTemplate();
  }

  @Get('templates/cost-accounting')
  getCostAccountingTemplate() {
    return this.coursesService.getCostAccountingTemplate();
  }

  @Get('templates/financial-analysis')
  getFinancialAnalysisTemplate() {
    return this.coursesService.getFinancialAnalysisTemplate();
  }

  // ===== COURSE GENERATION =====

  @Post('generate/budgeting')
  async generateBudgeting(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getBudgetingFundamentalsTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/cash-flow')
  async generateCashFlow(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getCashFlowForecastingTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/ro-gaap')
  async generateROGAAP(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getROGAAPComplianceTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/ifrs')
  async generateIFRS(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getIFRSFundamentalsTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/cost-accounting')
  async generateCostAccounting(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getCostAccountingTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/financial-analysis')
  async generateFinancialAnalysis(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getFinancialAnalysisTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/all')
  async generateAllCourses(@Body('instructorId') instructorId: string) {
    return this.coursesService.generateAllFinanceCourses(instructorId);
  }

  // ===== PRACTICAL EXERCISES =====

  @Get('exercises')
  async getExercises(@Query('difficulty') difficulty?: string) {
    if (difficulty) {
      return this.coursesService.getExercisesByDifficulty(difficulty);
    }
    return this.coursesService.getExercises();
  }

  @Get('exercises/:id')
  async getExercise(@Param('id') id: string) {
    return this.coursesService.getExercise(id);
  }

  // ===== REGULATIONS =====

  @Get('regulations')
  async getRegulations(@Query('courseSlug') courseSlug?: string) {
    if (courseSlug) {
      return this.coursesService.getRegulationsByCourse(courseSlug);
    }
    return this.coursesService.getRegulations();
  }

  @Get('regulations/:id')
  async getRegulation(@Param('id') id: string) {
    return this.coursesService.getRegulation(id);
  }

  // ===== ACCOUNTING STANDARDS =====

  @Get('standards')
  async getStandards(@Query('framework') framework?: string) {
    if (framework) {
      return this.coursesService.getStandardsByFramework(framework);
    }
    return this.coursesService.getStandards();
  }

  @Get('standards/:id')
  async getStandard(@Param('id') id: string) {
    return this.coursesService.getStandard(id);
  }

  // ===== CREDENTIALS =====

  @Get('credentials')
  async getCredentials() {
    return this.coursesService.getCredentials();
  }

  @Get('credentials/:id')
  async getCredential(@Param('id') id: string) {
    return this.coursesService.getCredential(id);
  }

  @Get('credentials/:credentialId/eligibility/:userId')
  async checkEligibility(
    @Param('credentialId') credentialId: string,
    @Param('userId') userId: string,
  ) {
    return this.coursesService.checkCredentialEligibility(userId, credentialId);
  }

  @Post('credentials/:credentialId/award')
  async awardCredential(
    @Param('credentialId') credentialId: string,
    @Body('userId') userId: string,
  ) {
    return this.coursesService.awardCredential(userId, credentialId);
  }

  @Get('credentials/user/:userId')
  async getUserCredentials(@Param('userId') userId: string) {
    return this.coursesService.getUserCredentials(userId);
  }

  @Get('credentials/verify/:code')
  async verifyCredential(@Param('code') code: string) {
    return this.coursesService.verifyCredential(code);
  }

  // ===== LEARNING PATHS =====

  @Get('learning-paths')
  getLearningPaths() {
    return this.coursesService.getLearningPaths();
  }

  // ===== CORPORATE TRAINING =====

  @Get('corporate-packages')
  getCorporatePackages() {
    return this.coursesService.getCorporateTrainingPackages();
  }
}

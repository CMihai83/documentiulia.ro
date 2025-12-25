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
import { ExcelVBACoursesService } from './excel-vba-courses.service';

// Excel & VBA Course Content Controller
// Manages course templates, simulation exercises, and course bundles

@Controller('lms/excel-courses')
@UseGuards(ThrottlerGuard)
export class ExcelVBACoursesController {
  constructor(private readonly coursesService: ExcelVBACoursesService) {}

  // ===== COURSE TEMPLATES =====

  @Get('templates/excel-fundamentals')
  getExcelFundamentalsTemplate() {
    return this.coursesService.getExcelFundamentalsTemplate();
  }

  @Get('templates/pivot-tables')
  getPivotTablesTemplate() {
    return this.coursesService.getPivotTablesTemplate();
  }

  @Get('templates/vba-programming')
  getVBAProgrammingTemplate() {
    return this.coursesService.getVBAProgrammingTemplate();
  }

  @Get('templates/financial-modeling')
  getFinancialModelingTemplate() {
    return this.coursesService.getFinancialModelingTemplate();
  }

  // ===== COURSE GENERATION =====

  @Post('generate/excel-fundamentals')
  async generateExcelFundamentals(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getExcelFundamentalsTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/pivot-tables')
  async generatePivotTablesCourse(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getPivotTablesTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/vba-programming')
  async generateVBACourse(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getVBAProgrammingTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/financial-modeling')
  async generateFinancialModelingCourse(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getFinancialModelingTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/all')
  async generateAllCourses(@Body('instructorId') instructorId: string) {
    return this.coursesService.generateAllExcelCourses(instructorId);
  }

  // ===== SIMULATION EXERCISES =====

  @Post('simulations')
  async createSimulation(
    @Body('courseId') courseId: string,
    @Body('moduleId') moduleId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('type') type: 'SPREADSHEET' | 'MACRO' | 'FORMULA' | 'DATA_ANALYSIS' | 'CHART' | 'PIVOT_TABLE',
    @Body('difficulty') difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    @Body('instructions') instructions: string[],
    @Body('startingData') startingData: string,
    @Body('expectedResult') expectedResult: string,
    @Body('hints') hints: string[],
    @Body('solutionSteps') solutionSteps: string[],
    @Body('timeEstimate') timeEstimate: number,
    @Body('points') points: number,
    @Body('skills') skills: string[],
  ) {
    return this.coursesService.createSimulationExercise({
      courseId,
      moduleId,
      title,
      description,
      type,
      difficulty,
      instructions,
      startingData,
      expectedResult,
      hints,
      solutionSteps,
      timeEstimate,
      points,
      skills,
    });
  }

  @Get('simulations/:id')
  async getSimulation(@Param('id') id: string) {
    return this.coursesService.getSimulationExercise(id);
  }

  @Get('simulations/module/:moduleId')
  async getModuleSimulations(@Param('moduleId') moduleId: string) {
    return this.coursesService.getSimulationsForModule(moduleId);
  }

  @Get('simulations/course/:courseId')
  async getCourseSimulations(@Param('courseId') courseId: string) {
    return this.coursesService.getSimulationsForCourse(courseId);
  }

  // ===== COURSE BUNDLES =====

  @Post('bundles')
  async createBundle(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('courses') courses: string[],
    @Body('bundlePrice') bundlePrice: number,
    @Body('currency') currency: string,
    @Body('certificateName') certificateName: string,
  ) {
    return this.coursesService.createCourseBundle({
      title,
      description,
      courses,
      bundlePrice,
      currency,
      certificateName,
    });
  }

  @Get('bundles')
  async listBundles() {
    return this.coursesService.listCourseBundles();
  }

  @Get('bundles/:id')
  async getBundle(@Param('id') id: string) {
    return this.coursesService.getCourseBundle(id);
  }

  // ===== REFERENCE DATA =====

  @Get('skill-levels')
  getSkillLevels() {
    return this.coursesService.getExcelSkillLevels();
  }

  @Get('recommendations/:userId')
  getRecommendations(@Param('userId') userId: string) {
    return this.coursesService.getCourseRecommendations(userId);
  }
}

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
import { PMAgileCoursesService, ExamAttempt } from './pm-agile-courses.service';

// Project Management & Agile Certification Controller
// PMP courses, Agile/Scrum courses, practice exams, micro-credentials

@Controller('lms/pm-courses')
@UseGuards(ThrottlerGuard)
export class PMAgileCoursesController {
  constructor(private readonly coursesService: PMAgileCoursesService) {}

  // ===== COURSE TEMPLATES =====

  @Get('templates/pm-fundamentals')
  getPMFundamentalsTemplate() {
    return this.coursesService.getPMPFundamentalsTemplate();
  }

  @Get('templates/agile-scrum')
  getAgileScrumTemplate() {
    return this.coursesService.getAgileScrumTemplate();
  }

  // ===== COURSE GENERATION =====

  @Post('generate/pm-fundamentals')
  async generatePMFundamentals(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getPMPFundamentalsTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/agile-scrum')
  async generateAgileScrum(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getAgileScrumTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/all')
  async generateAllCourses(@Body('instructorId') instructorId: string) {
    return this.coursesService.generateAllPMCourses(instructorId);
  }

  // ===== PRACTICE EXAMS =====

  @Post('practice-exams')
  async createPracticeExam(
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('examType') examType: 'PMP' | 'CAPM' | 'PSM' | 'CSM' | 'PMI_ACP' | 'PRINCE2',
    @Body('questions') questions: any[],
    @Body('passingScore') passingScore: number,
    @Body('timeLimit') timeLimit: number,
    @Body('difficulty') difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXAM_LEVEL',
    @Body('domain') domain?: string,
  ) {
    return this.coursesService.createPracticeExam({
      title,
      description,
      examType,
      questions,
      totalQuestions: questions.length,
      passingScore,
      timeLimit,
      difficulty,
      domain,
    });
  }

  @Get('practice-exams')
  async listPracticeExams(@Query('examType') examType?: string) {
    return this.coursesService.listPracticeExams(examType);
  }

  @Get('practice-exams/:id')
  async getPracticeExam(@Param('id') id: string) {
    return this.coursesService.getPracticeExam(id);
  }

  @Post('practice-exams/:examId/attempts')
  async startExamAttempt(
    @Param('examId') examId: string,
    @Body('userId') userId: string,
  ) {
    return this.coursesService.startExamAttempt(examId, userId);
  }

  @Post('attempts/:attemptId/submit')
  async submitExamAttempt(
    @Param('attemptId') attemptId: string,
    @Body('answers') answers: ExamAttempt['answers'],
  ) {
    return this.coursesService.submitExamAttempt(attemptId, answers);
  }

  @Get('attempts/user/:userId')
  async getUserExamAttempts(@Param('userId') userId: string) {
    return this.coursesService.getUserExamAttempts(userId);
  }

  // ===== MICRO-CREDENTIALS =====

  @Get('micro-credentials')
  async getMicroCredentials() {
    return this.coursesService.getMicroCredentials();
  }

  @Get('micro-credentials/:id')
  async getMicroCredential(@Param('id') id: string) {
    return this.coursesService.getMicroCredential(id);
  }

  @Post('micro-credentials/award')
  async awardMicroCredential(
    @Body('userId') userId: string,
    @Body('credentialId') credentialId: string,
  ) {
    return this.coursesService.awardMicroCredential(userId, credentialId);
  }

  @Get('micro-credentials/user/:userId')
  async getUserMicroCredentials(@Param('userId') userId: string) {
    return this.coursesService.getUserMicroCredentials(userId);
  }

  @Get('micro-credentials/verify/:verificationCode')
  async verifyMicroCredential(@Param('verificationCode') verificationCode: string) {
    return this.coursesService.verifyMicroCredential(verificationCode);
  }

  // ===== PROJECT TEMPLATES =====

  @Get('project-templates')
  async getProjectTemplates() {
    return this.coursesService.getProjectTemplates();
  }

  @Get('project-templates/:id')
  async getProjectTemplate(@Param('id') id: string) {
    return this.coursesService.getProjectTemplate(id);
  }

  @Get('project-templates/methodology/:methodology')
  async getTemplatesByMethodology(@Param('methodology') methodology: string) {
    return this.coursesService.getTemplatesByMethodology(methodology);
  }

  // ===== REFERENCE DATA =====

  @Get('certification-paths')
  getCertificationPaths() {
    return this.coursesService.getCertificationPaths();
  }

  @Get('pdu-categories')
  getPDUCategories() {
    return this.coursesService.getPDUCategories();
  }
}

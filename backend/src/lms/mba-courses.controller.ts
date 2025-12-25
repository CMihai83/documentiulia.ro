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
import { MBACoursesService } from './mba-courses.service';

// MBA Strategy & Leadership Micro-Credentials Controller
// Business strategy, leadership, finance fundamentals, operations management
// Case studies, discussion forums, executive coaching, corporate training

@Controller('lms/mba-courses')
@UseGuards(ThrottlerGuard)
export class MBACoursesController {
  constructor(private readonly coursesService: MBACoursesService) {}

  // ===== COURSE TEMPLATES =====

  @Get('templates/strategy')
  getStrategyTemplate() {
    return this.coursesService.getStrategyFundamentalsTemplate();
  }

  @Get('templates/leadership')
  getLeadershipTemplate() {
    return this.coursesService.getLeadershipManagementTemplate();
  }

  @Get('templates/finance')
  getFinanceTemplate() {
    return this.coursesService.getFinanceForManagersTemplate();
  }

  @Get('templates/operations')
  getOperationsTemplate() {
    return this.coursesService.getOperationsExcellenceTemplate();
  }

  // ===== COURSE GENERATION =====

  @Post('generate/strategy')
  async generateStrategy(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getStrategyFundamentalsTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/leadership')
  async generateLeadership(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getLeadershipManagementTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/finance')
  async generateFinance(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getFinanceForManagersTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/operations')
  async generateOperations(@Body('instructorId') instructorId: string) {
    const template = this.coursesService.getOperationsExcellenceTemplate();
    return this.coursesService.generateCourse(template, instructorId);
  }

  @Post('generate/all')
  async generateAllCourses(@Body('instructorId') instructorId: string) {
    return this.coursesService.generateAllMBACourses(instructorId);
  }

  // ===== CASE STUDIES =====

  @Get('case-studies')
  async getCaseStudies(
    @Query('industry') industry?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    if (industry) {
      return this.coursesService.getCaseStudiesByIndustry(industry);
    }
    if (difficulty) {
      return this.coursesService.getCaseStudiesByDifficulty(difficulty);
    }
    return this.coursesService.getCaseStudies();
  }

  @Get('case-studies/:id')
  async getCaseStudy(@Param('id') id: string) {
    return this.coursesService.getCaseStudy(id);
  }

  @Post('case-studies')
  async createCaseStudy(
    @Body() data: {
      title: string;
      company: string;
      industry: string;
      country: string;
      yearPublished: number;
      difficulty: 'INTRODUCTORY' | 'INTERMEDIATE' | 'ADVANCED';
      type: 'DECISION' | 'DESCRIPTIVE' | 'PROBLEM_SOLVING' | 'EVALUATIVE';
      synopsis: string;
      learningObjectives: string[];
      discussionQuestions: string[];
      teachingNotes: string;
      duration: number;
      pages: number;
      tags: string[];
    },
  ) {
    return this.coursesService.createCaseStudy(data);
  }

  // ===== DISCUSSION FORUMS =====

  @Post('forums')
  async createForum(
    @Body() data: {
      courseId: string;
      moduleId?: string;
      title: string;
      description: string;
      type: 'GENERAL' | 'CASE_DISCUSSION' | 'PEER_LEARNING' | 'Q_AND_A' | 'NETWORKING';
      isModerated: boolean;
    },
  ) {
    return this.coursesService.createForum(data);
  }

  @Get('forums/course/:courseId')
  async getForumsByCourse(@Param('courseId') courseId: string) {
    return this.coursesService.getForumsByCourse(courseId);
  }

  @Get('forums/:id')
  async getForum(@Param('id') id: string) {
    return this.coursesService.getForum(id);
  }

  @Post('forums/:forumId/posts')
  async createPost(
    @Param('forumId') forumId: string,
    @Body() data: {
      authorId: string;
      authorName: string;
      title?: string;
      content: string;
      parentId?: string;
    },
  ) {
    return this.coursesService.createPost(forumId, data);
  }

  @Post('posts/:postId/like')
  async likePost(@Param('postId') postId: string) {
    return this.coursesService.likePost(postId);
  }

  // ===== MBA MICRO-CREDENTIALS =====

  @Get('credentials')
  async getMBACredentials() {
    return this.coursesService.getMBACredentials();
  }

  @Get('credentials/:id')
  async getMBACredential(@Param('id') id: string) {
    return this.coursesService.getMBACredential(id);
  }

  @Get('credentials/:credentialId/eligibility/:userId')
  async checkEligibility(
    @Param('credentialId') credentialId: string,
    @Param('userId') userId: string,
  ) {
    return this.coursesService.checkCredentialEligibility(userId, credentialId);
  }

  @Post('credentials/:credentialId/capstone/start')
  async startCapstone(
    @Param('credentialId') credentialId: string,
    @Body('userId') userId: string,
  ) {
    return this.coursesService.startCapstoneProject(userId, credentialId);
  }

  @Post('credentials/:credentialId/capstone/submit')
  async submitCapstone(
    @Param('credentialId') credentialId: string,
    @Body('userId') userId: string,
    @Body('documentUrl') documentUrl: string,
  ) {
    return this.coursesService.submitCapstone(userId, credentialId, documentUrl);
  }

  @Post('credentials/:credentialId/award')
  async awardCredential(
    @Param('credentialId') credentialId: string,
    @Body('userId') userId: string,
  ) {
    return this.coursesService.awardMBACredential(userId, credentialId);
  }

  @Get('credentials/user/:userId')
  async getUserCredentials(@Param('userId') userId: string) {
    return this.coursesService.getUserMBACredentials(userId);
  }

  @Get('credentials/verify/:code')
  async verifyCredential(@Param('code') code: string) {
    return this.coursesService.verifyMBACredential(code);
  }

  // ===== EXECUTIVE COACHING =====

  @Get('coaches')
  async getCoaches(@Query('expertise') expertise?: string) {
    if (expertise) {
      return this.coursesService.getCoachesByExpertise(expertise);
    }
    return this.coursesService.getCoaches();
  }

  @Get('coaches/:id')
  async getCoach(@Param('id') id: string) {
    return this.coursesService.getCoach(id);
  }

  @Post('coaching-sessions')
  async bookSession(
    @Body() data: {
      coachId: string;
      userId: string;
      courseId?: string;
      scheduledAt: string;
      duration: number;
      type: 'ONE_ON_ONE' | 'GROUP' | 'CAREER' | 'CAPSTONE_REVIEW';
    },
  ) {
    return this.coursesService.bookCoachingSession({
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    });
  }

  @Get('coaching-sessions/user/:userId')
  async getUserSessions(@Param('userId') userId: string) {
    return this.coursesService.getUserCoachingSessions(userId);
  }

  @Post('coaching-sessions/:sessionId/complete')
  async completeSession(
    @Param('sessionId') sessionId: string,
    @Body('notes') notes: string,
    @Body('feedback') feedback?: { rating: number; comment: string },
  ) {
    return this.coursesService.completeCoachingSession(sessionId, notes, feedback);
  }

  // ===== LEARNING PATHS =====

  @Get('learning-paths')
  getLearningPaths() {
    return this.coursesService.getMBALearningPaths();
  }

  // ===== CORPORATE TRAINING =====

  @Get('corporate-packages')
  getCorporatePackages() {
    return this.coursesService.getCorporatePackages();
  }
}

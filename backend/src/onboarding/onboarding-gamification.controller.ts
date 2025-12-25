import {
  Controller,
  Post,
  Get,
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
import { OnboardingGamificationService } from './onboarding-gamification.service';

@ApiTags('Onboarding Gamification')
@Controller('onboarding/gamification')
export class OnboardingGamificationController {
  constructor(
    private readonly gamificationService: OnboardingGamificationService,
  ) {}

  // =================== USER PROGRESS ===================

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start onboarding with gamification' })
  @ApiResponse({ status: 201, description: 'Onboarding started' })
  async startOnboarding(@Request() req: any) {
    const progress = await this.gamificationService.startOnboarding(
      req.user.id,
      req.user.tenantId || req.user.id,
    );
    return { progress };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get onboarding status with gamification' })
  @ApiResponse({ status: 200, description: 'Onboarding status' })
  async getStatus(@Request() req: any) {
    return this.gamificationService.getOnboardingStatus(req.user.id);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user progress' })
  @ApiResponse({ status: 200, description: 'User progress' })
  async getProgress(@Request() req: any) {
    const progress = await this.gamificationService.getUserProgress(req.user.id);
    return { progress };
  }

  @Post('step/:stepId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete an onboarding step' })
  @ApiResponse({ status: 200, description: 'Step completed' })
  async completeStep(@Request() req: any, @Param('stepId') stepId: string) {
    return this.gamificationService.completeStep(req.user.id, stepId);
  }

  // =================== ACHIEVEMENTS ===================

  @Get('achievements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user achievements' })
  @ApiResponse({ status: 200, description: 'User achievements' })
  async getAchievements(@Request() req: any) {
    const achievements = await this.gamificationService.getUserAchievements(
      req.user.id,
    );
    return { achievements, total: achievements.length };
  }

  @Get('achievements/available')
  @ApiOperation({ summary: 'Get all available achievements' })
  @ApiResponse({ status: 200, description: 'Available achievements' })
  async getAvailableAchievements() {
    const achievements = await this.gamificationService.getAllAchievements();
    return { achievements, total: achievements.length };
  }

  // =================== STEPS ===================

  @Get('steps')
  @ApiOperation({ summary: 'Get all onboarding steps' })
  @ApiResponse({ status: 200, description: 'Onboarding steps' })
  async getSteps() {
    const steps = await this.gamificationService.getAllSteps();
    return { steps, total: steps.length };
  }

  // =================== LEADERBOARD ===================

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get onboarding leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard' })
  async getLeaderboard(@Query('limit') limit?: string) {
    const leaderboard = await this.gamificationService.getLeaderboard(
      limit ? parseInt(limit) : 10,
    );
    return { leaderboard };
  }

  // =================== STATS ===================

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get onboarding statistics' })
  @ApiResponse({ status: 200, description: 'Onboarding stats' })
  async getStats() {
    return this.gamificationService.getStats();
  }

  // =================== SUMMARY ===================

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete gamification summary' })
  @ApiResponse({ status: 200, description: 'Complete summary' })
  async getSummary(@Request() req: any) {
    const [status, achievements] = await Promise.all([
      this.gamificationService.getOnboardingStatus(req.user.id),
      this.gamificationService.getUserAchievements(req.user.id),
    ]);

    return {
      status,
      achievements: {
        earned: achievements,
        count: achievements.length,
      },
    };
  }
}

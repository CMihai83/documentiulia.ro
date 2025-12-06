import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Get current user gamification profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  async getProfile(@CurrentUser() user: any) {
    return this.gamificationService.getUserProfile(user.id);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get user gamification profile by ID' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  async getUserProfile(@Param('userId') userId: string) {
    return this.gamificationService.getUserProfile(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get community leaderboard' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'alltime'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard returned' })
  async getLeaderboard(
    @Query('timeframe') timeframe?: 'daily' | 'weekly' | 'monthly' | 'alltime',
    @Query('limit') limit?: number,
  ) {
    return this.gamificationService.getLeaderboard(
      timeframe || 'monthly',
      limit || 50,
    );
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get all available badges' })
  @ApiResponse({ status: 200, description: 'Badges returned' })
  async getAllBadges() {
    const badges = this.gamificationService.getAllBadges();
    return {
      total: badges.length,
      categories: {
        learning: badges.filter(b => b.category === 'learning'),
        community: badges.filter(b => b.category === 'community'),
        accounting: badges.filter(b => b.category === 'accounting'),
        special: badges.filter(b => b.category === 'special'),
      },
    };
  }

  @Get('levels')
  @ApiOperation({ summary: 'Get all levels and perks' })
  @ApiResponse({ status: 200, description: 'Levels returned' })
  async getAllLevels() {
    return {
      levels: this.gamificationService.getAllLevels(),
      xpActions: this.gamificationService.getXpActions(),
    };
  }

  @Post('award-xp')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Award XP to current user (internal use)' })
  async awardXp(
    @CurrentUser() user: any,
    @Query('action') action: string,
    @Query('multiplier') multiplier?: number,
  ) {
    return this.gamificationService.awardXp(
      user.id,
      action,
      multiplier || 1,
    );
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Get user stats summary' })
  async getUserStats(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserProfile(user.id);
    return {
      xp: profile.xp,
      level: profile.level,
      badgesEarned: profile.badges.filter(b => b.earnedAt).length,
      totalBadges: profile.badges.length,
      stats: profile.stats,
      nextLevelProgress: profile.nextLevelProgress,
    };
  }

  @Get('achievements')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Get user achievements and progress' })
  async getAchievements(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserProfile(user.id);

    const earned = profile.badges.filter(b => b.earnedAt);
    const inProgress = profile.badges
      .filter(b => !b.earnedAt && b.progress > 0)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    return {
      earned: {
        count: earned.length,
        badges: earned,
      },
      inProgress: {
        count: inProgress.length,
        badges: inProgress,
      },
      locked: {
        count: profile.badges.filter(b => !b.earnedAt && b.progress === 0).length,
      },
    };
  }
}

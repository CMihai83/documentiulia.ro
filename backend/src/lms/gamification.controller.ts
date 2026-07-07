import { Controller, Get, Post, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamificationService, LeaderboardPeriod } from './gamification.service';

/**
 * S-47/F-2 — read/engagement API over the persisted gamification engine.
 * Award paths (awardPoints/awardBadge/updateAchievementProgress) are internal —
 * they are triggered by learning events, not exposed as raw endpoints.
 */
@Controller('lms/gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  private userId(req: any): string {
    return req?.user?.id || req?.user?.sub || req?.user?.userId;
  }

  @Get('points')
  @UseGuards(JwtAuthGuard)
  getPoints(@Request() req: any) {
    return this.gamification.getUserPoints(this.userId(req));
  }

  @Get('points/history')
  @UseGuards(JwtAuthGuard)
  getPointsHistory(@Request() req: any, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.gamification.getPointsHistory(this.userId(req), Number.isFinite(parsed) ? parsed : 50);
  }

  @Get('badges')
  @UseGuards(JwtAuthGuard)
  getBadges(@Request() req: any) {
    return this.gamification.getUserBadges(this.userId(req));
  }

  @Get('badges/all')
  @UseGuards(JwtAuthGuard)
  getAllBadges() {
    return this.gamification.getAllBadges();
  }

  @Get('achievements')
  @UseGuards(JwtAuthGuard)
  getAchievements(@Request() req: any) {
    return this.gamification.getUserAchievements(this.userId(req));
  }

  @Get('streak')
  @UseGuards(JwtAuthGuard)
  getStreak(@Request() req: any) {
    return this.gamification.getStreak(this.userId(req));
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  getLeaderboard(@Query('period') period?: LeaderboardPeriod, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.gamification.getLeaderboard(period || 'ALL_TIME', Number.isFinite(parsed) ? parsed : 50);
  }

  @Get('rank')
  @UseGuards(JwtAuthGuard)
  getRank(@Request() req: any, @Query('period') period?: LeaderboardPeriod) {
    return this.gamification.getUserRank(this.userId(req), period || 'ALL_TIME');
  }

  /** Record daily learning activity for the current user (drives streaks). */
  @Post('activity')
  @UseGuards(JwtAuthGuard)
  recordActivity(@Request() req: any) {
    return this.gamification.recordActivity(this.userId(req));
  }

  @Post('badges/:badgeId/seen')
  @UseGuards(JwtAuthGuard)
  async markBadgeSeen(@Request() req: any, @Param('badgeId') badgeId: string) {
    await this.gamification.markBadgeSeen(this.userId(req), badgeId);
    return { ok: true };
  }
}

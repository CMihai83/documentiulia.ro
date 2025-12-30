/**
 * Simulation Controller
 * REST API endpoints for the business simulation module
 * Sprint 25 - World-Class Simulation
 */

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { SimulationService, GameSummary, ScenarioInfo } from './simulation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

// DTOs
class StartGameDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  scenarioId?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  industryScenarioId?: string;
}

class MakeDecisionDto {
  @IsString()
  decisionType: string;

  @IsOptional()
  parameters?: Record<string, unknown>;
}

class EventResponseDto {
  @IsString()
  responseId: string;
}

@ApiTags('Simulation')
@Controller('simulation')
// @UseGuards(JwtAuthGuard) // Removed - using @Public() on individual routes for guest access
// @ApiBearerAuth()
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  // =====================================================
  // SCENARIOS
  // =====================================================

  @Public()
  @Get('scenarios')
  @ApiOperation({ summary: 'Get all available simulation scenarios' })
  @ApiResponse({ status: 200, description: 'List of scenarios' })
  async getScenarios(): Promise<ScenarioInfo[]> {
    return this.simulationService.getScenarios();
  }

  @Public()
  @Get('presets/what-if')
  @ApiOperation({ summary: 'Get what-if scenario presets for company data' })
  @ApiResponse({ status: 200, description: 'List of what-if presets' })
  getWhatIfPresets() {
    return this.simulationService.getWhatIfPresets();
  }

  @Public()
  @Get('presets/industry')
  @ApiOperation({ summary: 'Get industry-specific scenario templates' })
  @ApiResponse({ status: 200, description: 'List of industry scenarios' })
  getIndustryScenarios() {
    return this.simulationService.getIndustryScenarios();
  }

  // =====================================================
  // GAME MANAGEMENT
  // =====================================================

  @Public() // Allow guest users for demo mode
  @Post('games')
  @ApiOperation({ summary: 'Start a new simulation game' })
  @ApiBody({ type: StartGameDto })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  async startGame(
    @Request() req: { user?: { userId: string } },
    @Body() dto: StartGameDto
  ): Promise<GameSummary> {
    // Support both authenticated and guest users
    const userId = req.user?.userId || 'guest';
    return this.simulationService.startGame(userId, {
      name: dto.name,
      scenarioId: dto.scenarioId,
      industryScenarioId: dto.industryScenarioId,
    });
  }

  @Public() // Allow guest users
  @Get('games')
  @ApiOperation({ summary: 'Get all games for current user' })
  @ApiResponse({ status: 200, description: 'List of user games' })
  async getUserGames(
    @Request() req: { user?: { userId: string } }
  ): Promise<GameSummary[]> {
    const userId = req.user?.userId || 'guest';
    return this.simulationService.getUserGames(userId);
  }

  @Public() // Allow guest users
  @Get('games/:gameId')
  @ApiOperation({ summary: 'Get detailed game information' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'Game details' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGameDetails(
    @Param('gameId') gameId: string
  ) {
    return this.simulationService.getGameDetails(gameId);
  }

  @Public() // Allow guest users
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('games/:gameId')
  @ApiOperation({ summary: 'Delete a game' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 204, description: 'Game deleted' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async deleteGame(
    @Request() req: { user?: { userId: string } },
    @Param('gameId') gameId: string
  ): Promise<void> {
    const userId = req.user?.userId || 'guest';
    return this.simulationService.deleteGame(gameId, userId);
  }

  // =====================================================
  // SIMULATION ACTIONS
  // =====================================================

  @Public() // Allow guest users
  @Post('games/:gameId/advance')
  @ApiOperation({ summary: 'Advance simulation by one month' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'Month advanced successfully' })
  async advanceMonth(@Param('gameId') gameId: string) {
    return this.simulationService.advanceMonth(gameId);
  }

  @Public() // Allow guest users
  @Post('games/:gameId/decisions')
  @ApiOperation({ summary: 'Make a business decision' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiBody({ type: MakeDecisionDto })
  @ApiResponse({ status: 200, description: 'Decision applied' })
  async makeDecision(
    @Param('gameId') gameId: string,
    @Body() dto: MakeDecisionDto
  ) {
    return this.simulationService.makeDecision(
      gameId,
      dto.decisionType,
      dto.parameters
    );
  }

  @Public() // Allow guest users
  @Get('games/:gameId/decisions')
  @ApiOperation({ summary: 'Get available decisions for current state' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'List of available decisions' })
  async getAvailableDecisions(@Param('gameId') gameId: string) {
    return this.simulationService.getAvailableDecisions(gameId);
  }

  @Public() // Allow guest users
  @Post('games/:gameId/events/:eventId/respond')
  @ApiOperation({ summary: 'Respond to an event' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiBody({ type: EventResponseDto })
  @ApiResponse({ status: 200, description: 'Event response recorded' })
  async respondToEvent(
    @Param('gameId') gameId: string,
    @Param('eventId') eventId: string,
    @Body() dto: EventResponseDto
  ) {
    return this.simulationService.respondToEvent(gameId, eventId, dto.responseId);
  }

  @Public() // Allow guest users
  @Get('games/:gameId/events/pending')
  @ApiOperation({ summary: 'Get pending events requiring response' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'List of pending events' })
  async getPendingEvents(@Param('gameId') gameId: string) {
    return this.simulationService.getPendingEvents(gameId);
  }

  // =====================================================
  // GAME LIFECYCLE
  // =====================================================

  @Public() // Allow guest users
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put('games/:gameId/pause')
  @ApiOperation({ summary: 'Pause a game' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 204, description: 'Game paused' })
  async pauseGame(@Param('gameId') gameId: string): Promise<void> {
    return this.simulationService.pauseGame(gameId);
  }

  @Public() // Allow guest users
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put('games/:gameId/resume')
  @ApiOperation({ summary: 'Resume a paused game' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 204, description: 'Game resumed' })
  async resumeGame(@Param('gameId') gameId: string): Promise<void> {
    return this.simulationService.resumeGame(gameId);
  }

  @Public() // Allow guest users
  @Post('games/:gameId/end')
  @ApiOperation({ summary: 'End a game and get final results' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'Final game results' })
  async endGame(@Param('gameId') gameId: string) {
    return this.simulationService.endGame(gameId);
  }

  // =====================================================
  // ANALYTICS & LEADERBOARD
  // =====================================================

  @Public()
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get simulation leaderboard' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of entries (default 10)' })
  @ApiResponse({ status: 200, description: 'Leaderboard entries' })
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.simulationService.getLeaderboard(limit ? parseInt(limit) : 10);
  }

  @Public() // Allow guest users
  @Get('stats')
  @ApiOperation({ summary: 'Get user simulation statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getUserStats(@Request() req: { user?: { userId: string } }) {
    const userId = req.user?.userId || 'guest';
    return this.simulationService.getUserStats(userId);
  }

  // =====================================================
  // MARKET DATA (Read-only reference)
  // =====================================================

  @Public()
  @Get('market-data')
  @ApiOperation({ summary: 'Get current Romanian market model data' })
  @ApiResponse({ status: 200, description: 'Romanian market parameters' })
  getMarketData() {
    // Import the model - this is read-only reference data
    const { ROMANIAN_MARKET_2025 } = require('./romanian-market.model');
    return {
      vatRates: ROMANIAN_MARKET_2025.vatRates,
      employeeContributions: ROMANIAN_MARKET_2025.employeeContributions,
      corporateTax: ROMANIAN_MARKET_2025.corporateTax,
      minimumWage: ROMANIAN_MARKET_2025.minimumWage,
      industries: Object.keys(ROMANIAN_MARKET_2025.industryMargins),
      effectiveDate: '2025-01-01',
      vatChangeDate: '2025-08-01',
    };
  }

  // =====================================================
  // AI RECOMMENDATIONS
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get(':gameId/recommendations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI recommendations for current game state' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'AI recommendations with course links' })
  async getAIRecommendations(@Param('gameId') gameId: string) {
    return this.simulationService.getAIRecommendations(gameId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':gameId/learning-path')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized learning path recommendations' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'Recommended learning path' })
  async getLearningPath(@Param('gameId') gameId: string) {
    return this.simulationService.getLearningPath(gameId);
  }
}

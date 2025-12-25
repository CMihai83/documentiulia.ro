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
import { SimulationService, GameSummary, ScenarioInfo } from './simulation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

// DTOs
class StartGameDto {
  name?: string;
  scenarioId?: string;
  difficulty?: string;
  industryScenarioId?: string;
}

class MakeDecisionDto {
  decisionType: string;
  parameters: Record<string, unknown>;
}

class EventResponseDto {
  responseId: string;
}

@ApiTags('Simulation')
@Controller('simulation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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

  @Post('games')
  @ApiOperation({ summary: 'Start a new simulation game' })
  @ApiBody({ type: StartGameDto })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  async startGame(
    @Request() req: { user: { userId: string } },
    @Body() dto: StartGameDto
  ): Promise<GameSummary> {
    return this.simulationService.startGame(req.user.userId, {
      name: dto.name,
      scenarioId: dto.scenarioId,
      industryScenarioId: dto.industryScenarioId,
    });
  }

  @Get('games')
  @ApiOperation({ summary: 'Get all games for current user' })
  @ApiResponse({ status: 200, description: 'List of user games' })
  async getUserGames(
    @Request() req: { user: { userId: string } }
  ): Promise<GameSummary[]> {
    return this.simulationService.getUserGames(req.user.userId);
  }

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

  @Delete('games/:gameId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a game' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 204, description: 'Game deleted' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async deleteGame(
    @Request() req: { user: { userId: string } },
    @Param('gameId') gameId: string
  ): Promise<void> {
    return this.simulationService.deleteGame(gameId, req.user.userId);
  }

  // =====================================================
  // SIMULATION ACTIONS
  // =====================================================

  @Post('games/:gameId/advance')
  @ApiOperation({ summary: 'Advance simulation by one month' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'Month advanced successfully' })
  async advanceMonth(@Param('gameId') gameId: string) {
    return this.simulationService.advanceMonth(gameId);
  }

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

  @Get('games/:gameId/decisions')
  @ApiOperation({ summary: 'Get available decisions for current state' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 200, description: 'List of available decisions' })
  async getAvailableDecisions(@Param('gameId') gameId: string) {
    return this.simulationService.getAvailableDecisions(gameId);
  }

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

  @Put('games/:gameId/pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Pause a game' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 204, description: 'Game paused' })
  async pauseGame(@Param('gameId') gameId: string): Promise<void> {
    return this.simulationService.pauseGame(gameId);
  }

  @Put('games/:gameId/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resume a paused game' })
  @ApiParam({ name: 'gameId', description: 'Game ID' })
  @ApiResponse({ status: 204, description: 'Game resumed' })
  async resumeGame(@Param('gameId') gameId: string): Promise<void> {
    return this.simulationService.resumeGame(gameId);
  }

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

  @Get('stats')
  @ApiOperation({ summary: 'Get user simulation statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getUserStats(@Request() req: { user: { userId: string } }) {
    return this.simulationService.getUserStats(req.user.userId);
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
}

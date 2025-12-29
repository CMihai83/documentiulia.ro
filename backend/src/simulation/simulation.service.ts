/**
 * Simulation Service
 * NestJS service for the business simulation module
 * Sprint 25 - World-Class Simulation
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SimulationStatus, SimulationDifficulty, SimDecisionCategory, SimEventType, SimEventSeverity, SimScenarioType } from '@prisma/client';
import {
  SimulationState as EngineState,
  calculateMonthlyRevenue,
  calculateMonthlyExpenses,
  calculateCashFlow,
  calculateHealthScores,
  calculateEmployeeProductivity,
  processSimulationMonth,
  HealthScores,
} from './business-logic.engine';
import { DECISIONS, Decision, applyDecision } from './decision-matrix';
import { SIMULATION_EVENTS, SimulationEvent as EngineEvent, triggerEvents, processEventResponse } from './events.system';
import { ACHIEVEMENTS, checkAchievements, PLAYER_LEVELS } from './achievements.system';
import {
  WHAT_IF_PRESETS,
  INDUSTRY_SCENARIOS,
} from './company-data-import';
import { ROMANIAN_MARKET_2025, getIndustryMargin } from './romanian-market.model';
import { AIRecommendationsService, AIRecommendation } from './ai-recommendations.service';

// Convert Prisma Decimal to number
function toNumber(val: Prisma.Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString());
}

// Response types
export interface GameSummary {
  id: string;
  userId: string;
  name: string;
  scenarioId: string | null;
  scenarioTitle: string | null;
  status: SimulationStatus;
  currentMonth: number;
  currentYear: number;
  healthScore: number;
  financialScore: number;
  operationsScore: number;
  complianceScore: number;
  growthScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioInfo {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: SimulationDifficulty;
  timeLimit: number | null;
  type: SimScenarioType;
  xpReward: number;
  initialState: Record<string, unknown>;
  objectives: unknown[];
}

@Injectable()
export class SimulationService {
  constructor(
    private prisma: PrismaService,
    private aiRecommendations: AIRecommendationsService
  ) {}

  // =====================================================
  // SCENARIO MANAGEMENT
  // =====================================================

  async getScenarios(): Promise<ScenarioInfo[]> {
    const scenarios = await this.prisma.simulationScenario.findMany({
      where: { isActive: true },
      orderBy: [
        { difficulty: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    return scenarios.map(s => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      difficulty: s.difficulty,
      timeLimit: s.timeLimit,
      type: s.type,
      xpReward: s.xpReward,
      initialState: s.initialState as Record<string, unknown>,
      objectives: s.objectives as unknown[],
    }));
  }

  getWhatIfPresets() {
    return WHAT_IF_PRESETS;
  }

  /**
   * Get AI recommendations for current game state
   */
  async getAIRecommendations(gameId: string): Promise<AIRecommendation[]> {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
      include: { states: { orderBy: { month: 'desc' }, take: 1 } },
    });

    if (!game || !game.states[0]) {
      throw new NotFoundException('Game or game state not found');
    }

    const latestState = game.states[0];
    const engineState: SimulationState = {
      cash: toNumber(latestState.cash),
      revenue: toNumber(latestState.revenue),
      expenses: toNumber(latestState.expenses),
      profit: toNumber(latestState.profit),
      receivables: toNumber(latestState.receivables),
      payables: toNumber(latestState.payables),
      inventory: toNumber(latestState.inventory),
      equipment: toNumber(latestState.equipment),
      loans: toNumber(latestState.loans),
      employees: latestState.employees,
      averageSalary: 5000, // Estimate
      capacity: latestState.capacity,
      utilization: latestState.utilization,
      quality: latestState.quality,
      morale: 70, // Estimate
      price: 100, // Estimate
      basePrice: 100,
      marketSize: 1000, // Estimate
      marketShare: latestState.marketShare,
      customerCount: latestState.customerCount,
      reputation: latestState.reputation,
      customerSatisfaction: 70, // Estimate
      taxOwed: toNumber(latestState.taxOwed),
      vatBalance: toNumber(latestState.vatBalance),
      penaltiesRisk: latestState.penaltiesRisk,
      auditRisk: latestState.auditRisk,
      complianceScore: 70, // Estimate
      month: game.currentMonth,
      year: game.currentYear,
      industry: 'Services', // Estimate
      isMicro: true,
      hasEmployees: latestState.employees > 0,
      loanPayments: toNumber(latestState.loans) * 0.01, // Estimate
    };

    const healthScores: HealthScores = {
      overall: game.healthScore,
      financial: game.financialScore,
      operations: game.operationsScore,
      compliance: game.complianceScore,
      growth: game.growthScore,
    };

    return this.aiRecommendations.generateRecommendations(gameId, engineState, healthScores);
  }

  /**
   * Get learning path recommendations
   */
  async getLearningPath(gameId: string) {
    return this.aiRecommendations.getLearningPath(gameId);
  }
  }

  getIndustryScenarios() {
    return INDUSTRY_SCENARIOS;
  }

  // =====================================================
  // GAME MANAGEMENT
  // =====================================================

  async startGame(
    userId: string,
    options: {
      name?: string;
      scenarioId?: string;
      difficulty?: SimulationDifficulty;
      industryScenarioId?: string;
    }
  ): Promise<GameSummary> {
    // Get initial state from scenario or create default
    let initialState: Record<string, unknown> = {};

    if (options.scenarioId) {
      const scenario = await this.prisma.simulationScenario.findUnique({
        where: { id: options.scenarioId },
      });
      if (scenario) {
        initialState = scenario.initialState as Record<string, unknown>;
      }
    } else if (options.industryScenarioId) {
      const industry = INDUSTRY_SCENARIOS.find(s => s.id === options.industryScenarioId);
      if (industry) {
        initialState = this.getDefaultState(industry.industry);
      }
    }

    const defaultState = this.getDefaultState('Services');
    const mergedState = { ...defaultState, ...initialState };

    // Create game
    const game = await this.prisma.simulationGame.create({
      data: {
        userId,
        name: options.name || 'Noua mea simulare',
        status: SimulationStatus.SIM_ACTIVE,
        difficulty: options.difficulty || SimulationDifficulty.SIM_NORMAL,
        scenarioId: options.scenarioId,
        currentMonth: 1,
        currentYear: 2025,
        healthScore: 100,
        financialScore: 100,
        operationsScore: 100,
        complianceScore: 100,
        growthScore: 100,
      },
      include: { scenario: true },
    });

    // Create initial state
    const cashValue = typeof mergedState.cash === 'number' ? mergedState.cash : 50000;
    const inventoryValue = typeof mergedState.inventory === 'number' ? mergedState.inventory : 10000;
    const equipmentValue = typeof mergedState.equipment === 'number' ? mergedState.equipment : 25000;
    const employeesValue = typeof mergedState.employees === 'number' ? mergedState.employees : 1;
    const customerCountValue = typeof mergedState.customerCount === 'number' ? mergedState.customerCount : 10;

    await this.prisma.simulationState.create({
      data: {
        gameId: game.id,
        month: 1,
        year: 2025,
        cash: cashValue,
        revenue: 0,
        expenses: 0,
        profit: 0,
        receivables: 0,
        payables: 0,
        inventory: inventoryValue,
        equipment: equipmentValue,
        loans: 0,
        employees: employeesValue,
        capacity: 100,
        utilization: 50,
        quality: 80,
        marketShare: 0.1,
        customerCount: customerCountValue,
        reputation: 50,
        taxOwed: 0,
        vatBalance: 0,
        penaltiesRisk: 0,
        auditRisk: 5,
        metricsSnapshot: mergedState as Prisma.InputJsonValue,
      },
    });

    return this.formatGameSummary(game);
  }

  async getUserGames(userId: string): Promise<GameSummary[]> {
    const games = await this.prisma.simulationGame.findMany({
      where: { userId },
      include: { scenario: true },
      orderBy: { updatedAt: 'desc' },
    });

    return games.map(g => this.formatGameSummary(g));
  }

  async getGameDetails(gameId: string) {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
      include: {
        scenario: true,
        states: { orderBy: { createdAt: 'desc' }, take: 1 },
        decisions: { orderBy: { createdAt: 'desc' }, take: 20 },
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
        achievements: true,
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const currentState = game.states[0];
    const xpTotal = game.achievements.reduce((sum, a) => sum + a.xpReward, 0);
    const playerLevel = this.calculatePlayerLevel(xpTotal);

    return {
      ...this.formatGameSummary(game),
      state: currentState ? this.formatState(currentState) : null,
      decisions: game.decisions.map(d => ({
        id: d.id,
        month: d.month,
        year: d.year,
        category: d.category,
        type: d.type,
        parameters: d.parameters,
        impactMetrics: d.impactMetrics,
        wasSuccessful: d.wasSuccessful,
        createdAt: d.createdAt,
      })),
      events: game.events.map(e => ({
        id: e.id,
        month: e.month,
        year: e.year,
        type: e.type,
        severity: e.severity,
        title: e.title,
        description: e.description,
        playerChoice: e.playerChoice,
        outcome: e.outcome,
        createdAt: e.createdAt,
      })),
      achievements: game.achievements.map(a => ({
        id: a.id,
        achievementId: a.achievementId,
        title: a.title,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
        unlockedAt: a.unlockedAt,
      })),
      xpTotal,
      playerLevel,
      playerTitle: PLAYER_LEVELS.find(l => l.level === playerLevel)?.title || 'Antreprenor',
    };
  }

  // =====================================================
  // SIMULATION ACTIONS
  // =====================================================

  async advanceMonth(gameId: string) {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== SimulationStatus.SIM_ACTIVE) {
      throw new BadRequestException('Game is not active');
    }

    // Get current state
    const currentState = await this.prisma.simulationState.findFirst({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentState) {
      throw new BadRequestException('No state found');
    }

    // Convert to engine state
    const engineState = this.toEngineState(currentState, game);

    // Process month
    const newEngineState = processSimulationMonth(engineState);
    const healthScores = calculateHealthScores(newEngineState);

    // Trigger events
    const totalMonths = (game.currentYear - 2025) * 12 + game.currentMonth;
    const triggeredEvents = triggerEvents(newEngineState, totalMonths);

    // Calculate new month/year
    const newMonth = game.currentMonth === 12 ? 1 : game.currentMonth + 1;
    const newYear = game.currentMonth === 12 ? game.currentYear + 1 : game.currentYear;

    // Save new state
    await this.prisma.simulationState.create({
      data: {
        gameId,
        month: newMonth,
        year: newYear,
        cash: newEngineState.cash,
        revenue: newEngineState.revenue,
        expenses: newEngineState.expenses,
        profit: newEngineState.profit,
        receivables: newEngineState.receivables,
        payables: newEngineState.payables,
        inventory: newEngineState.inventory,
        equipment: newEngineState.equipment,
        loans: newEngineState.loans,
        employees: newEngineState.employees,
        capacity: newEngineState.capacity,
        utilization: newEngineState.utilization,
        quality: newEngineState.quality,
        marketShare: newEngineState.marketShare,
        customerCount: newEngineState.customerCount,
        reputation: newEngineState.reputation,
        taxOwed: newEngineState.taxOwed,
        vatBalance: newEngineState.vatBalance,
        penaltiesRisk: newEngineState.penaltiesRisk,
        auditRisk: newEngineState.auditRisk,
        metricsSnapshot: newEngineState as unknown as Prisma.JsonObject,
      },
    });

    // Save events
    for (const event of triggeredEvents) {
      await this.prisma.simulationEvent.create({
        data: {
          gameId,
          month: newMonth,
          year: newYear,
          type: this.mapEventType(event.type),
          severity: this.mapSeverity(event.severity),
          title: event.titleRo || event.title,
          description: event.descriptionRo || event.description,
          impact: event.responses?.[0]?.impacts as unknown as Prisma.JsonObject || {},
          responseOptions: event.responses as unknown as Prisma.JsonArray,
        },
      });
    }

    // Update game
    await this.prisma.simulationGame.update({
      where: { id: gameId },
      data: {
        currentMonth: newMonth,
        currentYear: newYear,
        healthScore: healthScores.overall,
        financialScore: healthScores.financial,
        operationsScore: healthScores.operations,
        complianceScore: healthScores.compliance,
        growthScore: healthScores.growth,
      },
    });

    // Check achievements
    const newAchievements = await this.checkAndUnlockAchievements(gameId, newEngineState, totalMonths + 1);

    return {
      newMonth,
      newYear,
      healthScores,
      events: triggeredEvents.map(e => ({
        id: e.id,
        title: e.titleRo || e.title,
        description: e.descriptionRo || e.description,
        severity: e.severity,
        responses: e.responses,
      })),
      achievements: newAchievements,
    };
  }

  async makeDecision(
    gameId: string,
    decisionType: string,
    parameters: Record<string, unknown>
  ) {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
    });

    if (!game || game.status !== SimulationStatus.SIM_ACTIVE) {
      throw new BadRequestException('Game not found or not active');
    }

    const currentState = await this.prisma.simulationState.findFirst({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentState) {
      throw new BadRequestException('No state found');
    }

    const decision = DECISIONS.find(d => d.id === decisionType);
    if (!decision) {
      throw new BadRequestException('Invalid decision type');
    }

    const engineState = this.toEngineState(currentState, game);
    const { newState, impacts } = applyDecision(engineState, decision, parameters);

    // Update current state
    await this.prisma.simulationState.update({
      where: { id: currentState.id },
      data: {
        cash: newState.cash,
        revenue: newState.revenue,
        expenses: newState.expenses,
        profit: newState.profit,
        employees: newState.employees,
        capacity: newState.capacity,
        utilization: newState.utilization,
        quality: newState.quality,
        reputation: newState.reputation,
        metricsSnapshot: newState as unknown as Prisma.JsonObject,
      },
    });

    // Record decision
    await this.prisma.simulationDecision.create({
      data: {
        gameId,
        month: game.currentMonth,
        year: game.currentYear,
        category: this.mapDecisionCategory(decision.category),
        type: decisionType,
        parameters: parameters as unknown as Prisma.JsonObject,
        impactMetrics: impacts as unknown as Prisma.JsonObject,
        relatedCourseId: decision.relatedCourseId,
        wasSuccessful: true,
      },
    });

    return {
      success: true,
      impacts,
      message: `${decision.nameRo} aplicat cu succes`,
    };
  }

  async respondToEvent(gameId: string, eventId: string, responseId: string) {
    const event = await this.prisma.simulationEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.gameId !== gameId) {
      throw new NotFoundException('Event not found');
    }

    const responseOptions = event.responseOptions as unknown as Array<{ id: string; labelRo: string; impacts: Record<string, number> }>;
    const response = responseOptions?.find(r => r.id === responseId);

    if (!response) {
      throw new BadRequestException('Invalid response');
    }

    // Apply impacts
    const currentState = await this.prisma.simulationState.findFirst({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });

    if (currentState && response.impacts) {
      const updates: Record<string, number> = {};
      for (const [key, value] of Object.entries(response.impacts)) {
        const currentValue = toNumber((currentState as Record<string, unknown>)[key] as Prisma.Decimal);
        updates[key] = currentValue + value;
      }

      await this.prisma.simulationState.update({
        where: { id: currentState.id },
        data: updates as unknown as Prisma.SimulationStateUpdateInput,
      });
    }

    // Update event
    await this.prisma.simulationEvent.update({
      where: { id: eventId },
      data: {
        playerChoice: responseId,
        outcome: response.labelRo,
        outcomeImpact: response.impacts as unknown as Prisma.JsonObject,
      },
    });

    return { success: true, impacts: response.impacts };
  }

  async getAvailableDecisions(gameId: string) {
    return DECISIONS.map(d => ({
      id: d.id,
      name: d.name,
      nameRo: d.nameRo,
      description: d.description,
      descriptionRo: d.descriptionRo,
      category: d.category,
      icon: d.icon,
      parameters: d.parameters,
    }));
  }

  async getPendingEvents(gameId: string) {
    return this.prisma.simulationEvent.findMany({
      where: {
        gameId,
        playerChoice: null,
        responseOptions: { not: Prisma.JsonNull },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // =====================================================
  // GAME LIFECYCLE
  // =====================================================

  async pauseGame(gameId: string): Promise<void> {
    await this.prisma.simulationGame.update({
      where: { id: gameId },
      data: { status: SimulationStatus.SIM_PAUSED },
    });
  }

  async resumeGame(gameId: string): Promise<void> {
    await this.prisma.simulationGame.update({
      where: { id: gameId },
      data: { status: SimulationStatus.SIM_ACTIVE },
    });
  }

  async endGame(gameId: string) {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
      include: { achievements: true },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    await this.prisma.simulationGame.update({
      where: { id: gameId },
      data: { status: SimulationStatus.SIM_COMPLETED },
    });

    return {
      finalScores: {
        health: game.healthScore,
        financial: game.financialScore,
        operations: game.operationsScore,
        compliance: game.complianceScore,
        growth: game.growthScore,
      },
      achievementsCount: game.achievements.length,
      totalXP: game.achievements.reduce((sum, a) => sum + a.xpReward, 0),
    };
  }

  async deleteGame(gameId: string, userId: string): Promise<void> {
    const game = await this.prisma.simulationGame.findUnique({
      where: { id: gameId },
    });

    if (!game || game.userId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    await this.prisma.simulationGame.delete({ where: { id: gameId } });
  }

  // =====================================================
  // ANALYTICS
  // =====================================================

  async getLeaderboard(limit: number = 10) {
    const games = await this.prisma.simulationGame.findMany({
      where: { status: SimulationStatus.SIM_COMPLETED },
      orderBy: { healthScore: 'desc' },
      take: limit,
      include: { achievements: true },
    });

    return games.map((g, index) => ({
      rank: index + 1,
      userId: g.userId,
      gameName: g.name,
      healthScore: g.healthScore,
      achievementsCount: g.achievements.length,
    }));
  }

  async getUserStats(userId: string) {
    const games = await this.prisma.simulationGame.findMany({
      where: { userId },
      include: { achievements: true },
    });

    const completedGames = games.filter(g => g.status === SimulationStatus.SIM_COMPLETED);
    const totalXP = games.reduce(
      (sum, g) => sum + g.achievements.reduce((aSum, a) => aSum + a.xpReward, 0),
      0
    );

    return {
      gamesPlayed: games.length,
      gamesCompleted: completedGames.length,
      totalXP,
      playerLevel: this.calculatePlayerLevel(totalXP),
      playerTitle: PLAYER_LEVELS.find(l => l.level === this.calculatePlayerLevel(totalXP))?.title,
      averageHealthScore: games.length > 0
        ? games.reduce((sum, g) => sum + g.healthScore, 0) / games.length
        : 0,
    };
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  private formatGameSummary(game: {
    id: string;
    userId: string;
    name: string;
    scenarioId: string | null;
    scenario?: { title: string } | null;
    status: SimulationStatus;
    currentMonth: number;
    currentYear: number;
    healthScore: number;
    financialScore: number;
    operationsScore: number;
    complianceScore: number;
    growthScore: number;
    createdAt: Date;
    updatedAt: Date;
  }): GameSummary {
    return {
      id: game.id,
      userId: game.userId,
      name: game.name,
      scenarioId: game.scenarioId,
      scenarioTitle: game.scenario?.title || null,
      status: game.status,
      currentMonth: game.currentMonth,
      currentYear: game.currentYear,
      healthScore: game.healthScore,
      financialScore: game.financialScore,
      operationsScore: game.operationsScore,
      complianceScore: game.complianceScore,
      growthScore: game.growthScore,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  private formatState(state: {
    cash: Prisma.Decimal;
    revenue: Prisma.Decimal;
    expenses: Prisma.Decimal;
    profit: Prisma.Decimal;
    receivables: Prisma.Decimal;
    payables: Prisma.Decimal;
    inventory: Prisma.Decimal;
    equipment: Prisma.Decimal;
    loans: Prisma.Decimal;
    employees: number;
    capacity: number;
    utilization: number;
    quality: number;
    marketShare: number;
    customerCount: number;
    reputation: number;
    taxOwed: Prisma.Decimal;
    vatBalance: Prisma.Decimal;
    penaltiesRisk: number;
    auditRisk: number;
  }) {
    return {
      cash: toNumber(state.cash),
      revenue: toNumber(state.revenue),
      expenses: toNumber(state.expenses),
      profit: toNumber(state.profit),
      receivables: toNumber(state.receivables),
      payables: toNumber(state.payables),
      inventory: toNumber(state.inventory),
      equipment: toNumber(state.equipment),
      loans: toNumber(state.loans),
      employees: state.employees,
      capacity: state.capacity,
      utilization: state.utilization,
      quality: state.quality,
      marketShare: state.marketShare,
      customerCount: state.customerCount,
      reputation: state.reputation,
      taxOwed: toNumber(state.taxOwed),
      vatBalance: toNumber(state.vatBalance),
      penaltiesRisk: state.penaltiesRisk,
      auditRisk: state.auditRisk,
    };
  }

  private toEngineState(state: {
    cash: Prisma.Decimal;
    revenue: Prisma.Decimal;
    expenses: Prisma.Decimal;
    profit: Prisma.Decimal;
    receivables: Prisma.Decimal;
    payables: Prisma.Decimal;
    inventory: Prisma.Decimal;
    equipment: Prisma.Decimal;
    loans: Prisma.Decimal;
    employees: number;
    capacity: number;
    utilization: number;
    quality: number;
    marketShare: number;
    customerCount: number;
    reputation: number;
    taxOwed: Prisma.Decimal;
    vatBalance: Prisma.Decimal;
    penaltiesRisk: number;
    auditRisk: number;
    month: number;
    year: number;
  }, game: { currentMonth: number; currentYear: number }): EngineState {
    return {
      cash: toNumber(state.cash),
      revenue: toNumber(state.revenue),
      expenses: toNumber(state.expenses),
      profit: toNumber(state.profit),
      receivables: toNumber(state.receivables),
      payables: toNumber(state.payables),
      inventory: toNumber(state.inventory),
      equipment: toNumber(state.equipment),
      loans: toNumber(state.loans),
      loanPayments: 0,
      employees: state.employees,
      averageSalary: 5000,
      capacity: state.capacity,
      utilization: state.utilization,
      quality: state.quality,
      morale: 70,
      price: 100,
      basePrice: 100,
      marketSize: 1000,
      marketShare: state.marketShare,
      customerCount: state.customerCount,
      reputation: state.reputation,
      customerSatisfaction: 70,
      taxOwed: toNumber(state.taxOwed),
      vatBalance: toNumber(state.vatBalance),
      penaltiesRisk: state.penaltiesRisk,
      auditRisk: state.auditRisk,
      complianceScore: 70,
      month: state.month,
      year: state.year,
      industry: 'Services',
      isMicro: true,
      hasEmployees: state.employees > 1,
    };
  }

  private getDefaultState(industry: string): Record<string, unknown> {
    return {
      cash: 50000,
      revenue: 0,
      expenses: 0,
      profit: 0,
      receivables: 0,
      payables: 0,
      inventory: 10000,
      equipment: 25000,
      loans: 0,
      employees: 1,
      capacity: 100,
      utilization: 50,
      quality: 80,
      marketShare: 0.1,
      customerCount: 10,
      reputation: 50,
      taxOwed: 0,
      vatBalance: 0,
      penaltiesRisk: 0,
      auditRisk: 5,
      industry,
    };
  }

  private mapEventType(type: string): SimEventType {
    const mapping: Record<string, SimEventType> = {
      'MARKET_CHANGE': SimEventType.SIM_MARKET_CHANGE,
      'REGULATION_CHANGE': SimEventType.SIM_REGULATION_CHANGE,
      'ECONOMIC_SHOCK': SimEventType.SIM_ECONOMIC_SHOCK,
      'OPPORTUNITY': SimEventType.SIM_OPPORTUNITY,
      'CRISIS': SimEventType.SIM_CRISIS,
      'AUDIT': SimEventType.SIM_AUDIT,
      'CUSTOMER_EVENT': SimEventType.SIM_CUSTOMER_EVENT,
      'EMPLOYEE_EVENT': SimEventType.SIM_EMPLOYEE_EVENT,
      'SUPPLIER_EVENT': SimEventType.SIM_SUPPLIER_EVENT,
      'COMPETITION': SimEventType.SIM_COMPETITION,
    };
    return mapping[type] || SimEventType.SIM_MARKET_CHANGE;
  }

  private mapSeverity(severity: string): SimEventSeverity {
    const mapping: Record<string, SimEventSeverity> = {
      'LOW': SimEventSeverity.SEVERITY_LOW,
      'MEDIUM': SimEventSeverity.SEVERITY_MEDIUM,
      'HIGH': SimEventSeverity.SEVERITY_HIGH,
      'CRITICAL': SimEventSeverity.SEVERITY_CRITICAL,
    };
    return mapping[severity] || SimEventSeverity.SEVERITY_MEDIUM;
  }

  private mapDecisionCategory(category: string): SimDecisionCategory {
    const mapping: Record<string, SimDecisionCategory> = {
      'FINANCIAL': SimDecisionCategory.SIM_FINANCIAL,
      'OPERATIONS': SimDecisionCategory.SIM_OPERATIONS,
      'HR': SimDecisionCategory.SIM_HR,
      'MARKETING': SimDecisionCategory.SIM_MARKETING,
      'COMPLIANCE': SimDecisionCategory.SIM_COMPLIANCE,
      'GROWTH': SimDecisionCategory.SIM_GROWTH,
      'RISK': SimDecisionCategory.SIM_RISK,
    };
    return mapping[category] || SimDecisionCategory.SIM_FINANCIAL;
  }

  private async checkAndUnlockAchievements(
    gameId: string,
    state: EngineState,
    totalMonths: number
  ): Promise<string[]> {
    const existing = await this.prisma.simulationAchievement.findMany({
      where: { gameId },
      select: { achievementId: true },
    });

    const alreadyUnlockedIds = existing.map(a => a.achievementId);

    // Combine state and game stats for achievement checking
    const stats = {
      ...state,
      totalMonths,
      totalRevenue: state.revenue * totalMonths,
      totalProfit: state.profit * totalMonths,
      maxCash: state.cash,
      decisionsCount: 0,
    };

    const unlocked = checkAchievements(stats, alreadyUnlockedIds);
    const newlyUnlocked: string[] = [];

    for (const achievement of unlocked) {
      await this.prisma.simulationAchievement.create({
        data: {
          gameId,
          achievementId: achievement.id,
          title: achievement.name,
          description: achievement.description,
          icon: achievement.icon || '🏆',
          xpReward: achievement.xpReward,
        },
      });
      newlyUnlocked.push(achievement.name);
    }

    return newlyUnlocked;
  }

  private calculatePlayerLevel(xp: number): number {
    for (let i = PLAYER_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= PLAYER_LEVELS[i].xpRequired) {
        return PLAYER_LEVELS[i].level;
      }
    }
    return 1;
  }
}

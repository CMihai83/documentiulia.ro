/**
 * Simulation API Client
 * Sprint 25 - World-Class Business Simulation
 */

import { apiRequest } from '../api';

// Types
export interface SimulationScenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: 'SIM_TUTORIAL' | 'SIM_EASY' | 'SIM_NORMAL' | 'SIM_HARD' | 'SIM_EXPERT';
  timeLimit: number | null;
  type: string;
  xpReward: number;
  initialState: Record<string, unknown>;
  objectives: Array<{ id: string; description: string; target: number }>;
}

export interface SimulationGame {
  id: string;
  userId: string;
  name: string;
  scenarioId: string | null;
  scenarioTitle: string | null;
  status: 'SIM_ACTIVE' | 'SIM_PAUSED' | 'SIM_COMPLETED' | 'SIM_FAILED' | 'SIM_ABANDONED';
  currentMonth: number;
  currentYear: number;
  healthScore: number;
  financialScore: number;
  operationsScore: number;
  complianceScore: number;
  growthScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIRecommendation {
  decision: {
    id: string;
    name: string;
    nameRo: string;
    description: string;
    category: string;
    icon: string;
  };
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  expectedImpact: {
    shortTerm: Record<string, number>;
    longTerm: Record<string, number>;
  };
  relatedCourses: Array<{
    id: string;
    title: string;
    relevance: number;
    keyLessons: string[];
  }>;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

export interface LearningPathItem {
  courseId: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface SimulationState {
  cash: number;
  revenue: number;
  expenses: number;
  profit: number;
  receivables: number;
  payables: number;
  inventory: number;
  equipment: number;
  loans: number;
  employees: number;
  capacity: number;
  utilization: number;
  quality: number;
  marketShare: number;
  customerCount: number;
  reputation: number;
  taxOwed: number;
  vatBalance: number;
  penaltiesRisk: number;
  auditRisk: number;
}

export interface SimulationDecision {
  id: string;
  month: number;
  year: number;
  category: string;
  type: string;
  parameters: Record<string, unknown>;
  impactMetrics: Record<string, number>;
  wasSuccessful: boolean;
  createdAt: string;
}

export interface SimulationEvent {
  id: string;
  month: number;
  year: number;
  type: string;
  severity: string;
  title: string;
  description: string;
  playerChoice: string | null;
  outcome: string | null;
  responseOptions?: Array<{
    id: string;
    label: string;
    labelRo: string;
    impacts: Record<string, number>;
  }>;
  createdAt: string;
}

export interface SimulationAchievement {
  id: string;
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string;
}

export interface GameDetails extends SimulationGame {
  state: SimulationState | null;
  decisions: SimulationDecision[];
  events: SimulationEvent[];
  achievements: SimulationAchievement[];
  xpTotal: number;
  playerLevel: number;
  playerTitle: string;
}

export interface HealthScores {
  overall: number;
  financial: number;
  operations: number;
  compliance: number;
  growth: number;
}

export interface AdvanceMonthResult {
  newMonth: number;
  newYear: number;
  healthScores: HealthScores;
  events: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    responses?: Array<{ id: string; labelRo: string; impacts: Record<string, number> }>;
  }>;
  achievements: string[];
}

export interface DecisionResult {
  success: boolean;
  impacts: Record<string, number>;
  message: string;
}

export interface UserStats {
  gamesPlayed: number;
  gamesCompleted: number;
  totalXP: number;
  playerLevel: number;
  playerTitle: string;
  averageHealthScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  gameName: string;
  healthScore: number;
  achievementsCount: number;
}

export interface WhatIfPreset {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  config: Record<string, unknown>;
}

export interface IndustryScenario {
  id: string;
  name: string;
  nameRo: string;
  industry: string;
  description: string;
}

export interface AvailableDecision {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: string;
  icon: string;
  parameters: Array<{
    name: string;
    type: string;
    min?: number;
    max?: number;
    default?: unknown;
    unit?: string;
    options?: string[];
  }>;
}

// API Functions

/**
 * Get all available simulation scenarios
 */
export async function getScenarios(): Promise<SimulationScenario[]> {
  const response = await apiRequest<SimulationScenario[]>('/simulation/scenarios');
  return response.data || [];
}

/**
 * Get what-if presets for company data simulation
 */
export async function getWhatIfPresets(): Promise<WhatIfPreset[]> {
  const response = await apiRequest<WhatIfPreset[]>('/simulation/presets/what-if');
  return response.data || [];
}

/**
 * Get industry-specific scenario templates
 */
export async function getIndustryScenarios(): Promise<IndustryScenario[]> {
  const response = await apiRequest<IndustryScenario[]>('/simulation/presets/industry');
  return response.data || [];
}

/**
 * Start a new simulation game
 */
export async function startGame(options: {
  name?: string;
  scenarioId?: string;
  difficulty?: string;
  industryScenarioId?: string;
}): Promise<SimulationGame> {
  const response = await apiRequest<SimulationGame>('/simulation/games', {
    method: 'POST',
    body: JSON.stringify(options),
  });
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Get user's simulation games
 */
export async function getUserGames(): Promise<SimulationGame[]> {
  const response = await apiRequest<SimulationGame[]>('/simulation/games');
  return response.data || [];
}

/**
 * Get detailed game information
 */
export async function getGameDetails(gameId: string): Promise<GameDetails> {
  const response = await apiRequest<GameDetails>(`/simulation/games/${gameId}`);
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Delete a game
 */
export async function deleteGame(gameId: string): Promise<void> {
  const response = await apiRequest(`/simulation/games/${gameId}`, {
    method: 'DELETE',
  });
  if (response.error) throw new Error(response.error);
}

/**
 * Advance simulation by one month
 */
export async function advanceMonth(gameId: string): Promise<AdvanceMonthResult> {
  const response = await apiRequest<AdvanceMonthResult>(`/simulation/games/${gameId}/advance`, {
    method: 'POST',
  });
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Make a business decision
 */
export async function makeDecision(
  gameId: string,
  decisionType: string,
  parameters: Record<string, unknown>
): Promise<DecisionResult> {
  const response = await apiRequest<DecisionResult>(`/simulation/games/${gameId}/decisions`, {
    method: 'POST',
    body: JSON.stringify({ decisionType, parameters }),
  });
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Get available decisions for a game
 */
export async function getAvailableDecisions(gameId: string): Promise<AvailableDecision[]> {
  const response = await apiRequest<AvailableDecision[]>(`/simulation/games/${gameId}/decisions`);
  return response.data || [];
}

/**
 * Get pending events requiring response
 */
export async function getPendingEvents(gameId: string): Promise<SimulationEvent[]> {
  const response = await apiRequest<SimulationEvent[]>(`/simulation/games/${gameId}/events/pending`);
  return response.data || [];
}

/**
 * Respond to an event
 */
export async function respondToEvent(
  gameId: string,
  eventId: string,
  responseId: string
): Promise<{ success: boolean; impacts: Record<string, number> }> {
  const response = await apiRequest<{ success: boolean; impacts: Record<string, number> }>(
    `/simulation/games/${gameId}/events/${eventId}/respond`,
    {
      method: 'POST',
      body: JSON.stringify({ responseId }),
    }
  );
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Pause a game
 */
export async function pauseGame(gameId: string): Promise<void> {
  const response = await apiRequest(`/simulation/games/${gameId}/pause`, {
    method: 'PUT',
  });
  if (response.error) throw new Error(response.error);
}

/**
 * Resume a game
 */
export async function resumeGame(gameId: string): Promise<void> {
  const response = await apiRequest(`/simulation/games/${gameId}/resume`, {
    method: 'PUT',
  });
  if (response.error) throw new Error(response.error);
}

/**
 * End a game
 */
export async function endGame(gameId: string): Promise<{
  finalScores: { health: number; financial: number; operations: number; compliance: number; growth: number };
  achievementsCount: number;
  totalXP: number;
}> {
  const response = await apiRequest<{
    finalScores: { health: number; financial: number; operations: number; compliance: number; growth: number };
    achievementsCount: number;
    totalXP: number;
  }>(`/simulation/games/${gameId}/end`, {
    method: 'POST',
  });
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Get simulation leaderboard
 */
export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const response = await apiRequest<LeaderboardEntry[]>('/simulation/leaderboard', {
    params: { limit },
  });
  return response.data || [];
}

/**
 * Get user simulation statistics
 */
export async function getUserStats(): Promise<UserStats> {
  const response = await apiRequest<UserStats>('/simulation/stats');
  if (response.error) throw new Error(response.error);
  return response.data!;
}

/**
 * Get Romanian market data
 */
export async function getMarketData(): Promise<{
  vatRates: { standard: number; reduced: number; special: number; standard2025: number; reduced2025: number };
  employeeContributions: { cas: { employee: number }; cass: { employee: number }; cam: number };
  corporateTax: { micro1: number; micro3: number; standard: number };
  minimumWage: { current: number; construction: number };
  industries: string[];
  effectiveDate: string;
  vatChangeDate: string;
}> {
  const response = await apiRequest('/simulation/market-data');
  return response.data as any;
}

/**
 * Get AI recommendations for current game state
 */
export async function getAIRecommendations(gameId: string): Promise<AIRecommendation[]> {
  const response = await apiRequest<AIRecommendation[]>(`/simulation/games/${gameId}/recommendations`);
  if (response.error) throw new Error(response.error);
  return response.data || [];
}

/**
 * Get personalized learning path recommendations
 */
export async function getLearningPath(gameId: string): Promise<LearningPathItem[]> {
  const response = await apiRequest<LearningPathItem[]>(`/simulation/games/${gameId}/learning-path`);
  if (response.error) throw new Error(response.error);
  return response.data || [];
}

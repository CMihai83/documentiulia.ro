/**
 * Achievement System
 * 30 Achievements with unlock conditions and rewards
 * Based on Grok AI recommendations - Sprint 25
 */

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type AchievementCategory = 'FINANCIAL' | 'OPERATIONS' | 'GROWTH' | 'COMPLIANCE' | 'SURVIVAL' | 'SPECIAL';

export interface Achievement {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  xpReward: number;
  unlockConditions: string[];
  relatedCourseId?: string;
  hidden?: boolean;
}

// =====================================================
// FINANCIAL ACHIEVEMENTS
// =====================================================

export const FINANCIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_profit',
    name: 'First Profit',
    nameRo: 'Primul Profit',
    description: 'Achieve your first profitable month',
    descriptionRo: 'Atinge prima lună profitabilă',
    category: 'FINANCIAL',
    tier: 'BRONZE',
    icon: '💰',
    xpReward: 100,
    unlockConditions: ['profit > 0'],
    relatedCourseId: 'plan-afaceri-complet-2025',
  },
  {
    id: 'cash_flow_master',
    name: 'Cash Flow Master',
    nameRo: 'Maestru Cash Flow',
    description: 'Maintain positive cash flow for 6 consecutive months',
    descriptionRo: 'Menține cash flow pozitiv 6 luni consecutive',
    category: 'FINANCIAL',
    tier: 'SILVER',
    icon: '💵',
    xpReward: 300,
    unlockConditions: ['consecutivePositiveCashFlow >= 6'],
    relatedCourseId: 'finantare-startup-romania-2025',
  },
  {
    id: 'debt_free',
    name: 'Debt Free',
    nameRo: 'Fără Datorii',
    description: 'Pay off all loans while maintaining profitability',
    descriptionRo: 'Achită toate împrumuturile menținând profitabilitatea',
    category: 'FINANCIAL',
    tier: 'GOLD',
    icon: '🏆',
    xpReward: 500,
    unlockConditions: ['loans === 0', 'profit > 0', 'totalLoansRepaid > 50000'],
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    nameRo: 'Milionar',
    description: 'Accumulate 1,000,000 RON in cash',
    descriptionRo: 'Acumulează 1.000.000 RON în numerar',
    category: 'FINANCIAL',
    tier: 'PLATINUM',
    icon: '💎',
    xpReward: 1000,
    unlockConditions: ['cash >= 1000000'],
  },
  {
    id: 'profit_margin_king',
    name: 'Profit Margin King',
    nameRo: 'Regele Marjei de Profit',
    description: 'Achieve a profit margin above 30%',
    descriptionRo: 'Atinge o marjă de profit peste 30%',
    category: 'FINANCIAL',
    tier: 'GOLD',
    icon: '👑',
    xpReward: 500,
    unlockConditions: ['profitMargin >= 30'],
  },
  {
    id: 'investor_ready',
    name: 'Investor Ready',
    nameRo: 'Pregătit pentru Investitori',
    description: 'Achieve metrics attractive to investors',
    descriptionRo: 'Atinge metrici atractive pentru investitori',
    category: 'FINANCIAL',
    tier: 'PLATINUM',
    icon: '📈',
    xpReward: 750,
    unlockConditions: ['revenue > 100000', 'profit > 20000', 'reputation > 80'],
  },
];

// =====================================================
// OPERATIONS ACHIEVEMENTS
// =====================================================

export const OPERATIONS_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_employee',
    name: 'First Employee',
    nameRo: 'Primul Angajat',
    description: 'Hire your first employee',
    descriptionRo: 'Angajează primul tău angajat',
    category: 'OPERATIONS',
    tier: 'BRONZE',
    icon: '👤',
    xpReward: 100,
    unlockConditions: ['employees >= 2'],
    relatedCourseId: 'ghid-complet-infiintare-afacere-romania',
  },
  {
    id: 'team_of_10',
    name: 'Team of 10',
    nameRo: 'Echipă de 10',
    description: 'Grow your team to 10 employees',
    descriptionRo: 'Crește echipa la 10 angajați',
    category: 'OPERATIONS',
    tier: 'SILVER',
    icon: '👥',
    xpReward: 300,
    unlockConditions: ['employees >= 10'],
  },
  {
    id: 'corporate_size',
    name: 'Corporate Size',
    nameRo: 'Dimensiune Corporativă',
    description: 'Reach 50 employees',
    descriptionRo: 'Ajunge la 50 de angajați',
    category: 'OPERATIONS',
    tier: 'GOLD',
    icon: '🏢',
    xpReward: 500,
    unlockConditions: ['employees >= 50'],
  },
  {
    id: 'quality_champion',
    name: 'Quality Champion',
    nameRo: 'Campion al Calității',
    description: 'Maintain quality above 90% for 12 months',
    descriptionRo: 'Menține calitatea peste 90% timp de 12 luni',
    category: 'OPERATIONS',
    tier: 'GOLD',
    icon: '⭐',
    xpReward: 500,
    unlockConditions: ['quality >= 90', 'monthsAtHighQuality >= 12'],
  },
  {
    id: 'efficiency_expert',
    name: 'Efficiency Expert',
    nameRo: 'Expert în Eficiență',
    description: 'Achieve 85%+ capacity utilization with 85%+ quality',
    descriptionRo: 'Atinge 85%+ utilizare capacitate cu 85%+ calitate',
    category: 'OPERATIONS',
    tier: 'SILVER',
    icon: '⚡',
    xpReward: 350,
    unlockConditions: ['utilization >= 85', 'quality >= 85'],
  },
  {
    id: 'happy_team',
    name: 'Happy Team',
    nameRo: 'Echipă Fericită',
    description: 'Maintain morale above 80% with 10+ employees',
    descriptionRo: 'Menține moralul peste 80% cu 10+ angajați',
    category: 'OPERATIONS',
    tier: 'SILVER',
    icon: '😊',
    xpReward: 300,
    unlockConditions: ['morale >= 80', 'employees >= 10'],
  },
];

// =====================================================
// GROWTH ACHIEVEMENTS
// =====================================================

export const GROWTH_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'market_entry',
    name: 'Market Entry',
    nameRo: 'Intrare pe Piață',
    description: 'Achieve 1% market share',
    descriptionRo: 'Atinge 1% cotă de piață',
    category: 'GROWTH',
    tier: 'BRONZE',
    icon: '🎯',
    xpReward: 100,
    unlockConditions: ['marketShare >= 1'],
  },
  {
    id: 'market_player',
    name: 'Market Player',
    nameRo: 'Jucător pe Piață',
    description: 'Achieve 10% market share',
    descriptionRo: 'Atinge 10% cotă de piață',
    category: 'GROWTH',
    tier: 'SILVER',
    icon: '📊',
    xpReward: 300,
    unlockConditions: ['marketShare >= 10'],
  },
  {
    id: 'market_leader',
    name: 'Market Leader',
    nameRo: 'Lider de Piață',
    description: 'Achieve 30% market share',
    descriptionRo: 'Atinge 30% cotă de piață',
    category: 'GROWTH',
    tier: 'GOLD',
    icon: '🥇',
    xpReward: 500,
    unlockConditions: ['marketShare >= 30'],
  },
  {
    id: 'market_dominator',
    name: 'Market Dominator',
    nameRo: 'Dominator de Piață',
    description: 'Achieve 50% market share',
    descriptionRo: 'Atinge 50% cotă de piață',
    category: 'GROWTH',
    tier: 'PLATINUM',
    icon: '👑',
    xpReward: 1000,
    unlockConditions: ['marketShare >= 50'],
  },
  {
    id: 'customer_100',
    name: 'Century Club',
    nameRo: 'Clubul Centenar',
    description: 'Reach 100 customers',
    descriptionRo: 'Ajunge la 100 de clienți',
    category: 'GROWTH',
    tier: 'BRONZE',
    icon: '💯',
    xpReward: 150,
    unlockConditions: ['customerCount >= 100'],
  },
  {
    id: 'reputation_star',
    name: 'Rising Star',
    nameRo: 'Steaua în Ascensiune',
    description: 'Achieve reputation above 80',
    descriptionRo: 'Atinge reputație peste 80',
    category: 'GROWTH',
    tier: 'SILVER',
    icon: '🌟',
    xpReward: 300,
    unlockConditions: ['reputation >= 80'],
  },
  {
    id: 'reputation_legend',
    name: 'Industry Legend',
    nameRo: 'Legendă în Industrie',
    description: 'Achieve reputation of 95+',
    descriptionRo: 'Atinge reputație de 95+',
    category: 'GROWTH',
    tier: 'DIAMOND',
    icon: '🏆',
    xpReward: 1500,
    unlockConditions: ['reputation >= 95'],
  },
];

// =====================================================
// COMPLIANCE ACHIEVEMENTS
// =====================================================

export const COMPLIANCE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'tax_compliant',
    name: 'Tax Compliant',
    nameRo: 'Conformitate Fiscală',
    description: 'Pay all taxes on time for 12 months',
    descriptionRo: 'Plătește toate taxele la timp 12 luni',
    category: 'COMPLIANCE',
    tier: 'BRONZE',
    icon: '✅',
    xpReward: 200,
    unlockConditions: ['monthsFullTaxCompliance >= 12'],
    relatedCourseId: 'conformitate-legala-firme-noi',
  },
  {
    id: 'audit_survivor',
    name: 'Audit Survivor',
    nameRo: 'Supraviețuitor Audit',
    description: 'Successfully pass an ANAF audit with minimal penalties',
    descriptionRo: 'Treci cu succes un audit ANAF cu penalități minime',
    category: 'COMPLIANCE',
    tier: 'SILVER',
    icon: '🛡️',
    xpReward: 400,
    unlockConditions: ['auditsPassed >= 1', 'lastAuditPenalties < 5'],
    relatedCourseId: 'conformitate-legala-firme-noi',
  },
  {
    id: 'compliance_master',
    name: 'Compliance Master',
    nameRo: 'Maestru Conformitate',
    description: 'Maintain compliance score above 90 for 12 months',
    descriptionRo: 'Menține scorul de conformitate peste 90 timp de 12 luni',
    category: 'COMPLIANCE',
    tier: 'GOLD',
    icon: '📋',
    xpReward: 600,
    unlockConditions: ['complianceScore >= 90', 'monthsHighCompliance >= 12'],
  },
  {
    id: 'saft_champion',
    name: 'SAF-T Champion',
    nameRo: 'Campion SAF-T',
    description: 'Submit SAF-T D406 reports on time for 12 months',
    descriptionRo: 'Depune rapoarte SAF-T D406 la timp 12 luni',
    category: 'COMPLIANCE',
    tier: 'SILVER',
    icon: '📊',
    xpReward: 350,
    unlockConditions: ['saftSubmissions >= 12'],
  },
  {
    id: 'zero_penalties',
    name: 'Clean Record',
    nameRo: 'Cazier Curat',
    description: 'Operate for 24 months with zero penalties',
    descriptionRo: 'Operează 24 luni cu zero penalități',
    category: 'COMPLIANCE',
    tier: 'GOLD',
    icon: '🏅',
    xpReward: 600,
    unlockConditions: ['monthsWithoutPenalties >= 24'],
  },
];

// =====================================================
// SURVIVAL ACHIEVEMENTS
// =====================================================

export const SURVIVAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'survivor_1_year',
    name: 'One Year Survivor',
    nameRo: 'Supraviețuitor 1 An',
    description: 'Survive your first year in business',
    descriptionRo: 'Supraviețuiește primul an în afaceri',
    category: 'SURVIVAL',
    tier: 'BRONZE',
    icon: '🎂',
    xpReward: 200,
    unlockConditions: ['monthsPlayed >= 12'],
  },
  {
    id: 'survivor_3_years',
    name: 'Three Year Veteran',
    nameRo: 'Veteran 3 Ani',
    description: 'Successfully operate for 3 years',
    descriptionRo: 'Operează cu succes 3 ani',
    category: 'SURVIVAL',
    tier: 'SILVER',
    icon: '🎖️',
    xpReward: 400,
    unlockConditions: ['monthsPlayed >= 36'],
  },
  {
    id: 'survivor_5_years',
    name: 'Five Year Legend',
    nameRo: 'Legendă 5 Ani',
    description: 'Build a business that lasts 5 years',
    descriptionRo: 'Construiește o afacere care durează 5 ani',
    category: 'SURVIVAL',
    tier: 'GOLD',
    icon: '🏛️',
    xpReward: 750,
    unlockConditions: ['monthsPlayed >= 60'],
  },
  {
    id: 'crisis_survivor',
    name: 'Crisis Survivor',
    nameRo: 'Supraviețuitor Criză',
    description: 'Survive an economic crisis scenario',
    descriptionRo: 'Supraviețuiește un scenariu de criză economică',
    category: 'SURVIVAL',
    tier: 'GOLD',
    icon: '🌪️',
    xpReward: 600,
    unlockConditions: ['crisisScenariosCompleted >= 1'],
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    nameRo: 'Revenirea',
    description: 'Recover from negative cash to 100k+ cash',
    descriptionRo: 'Recuperează din cash negativ la 100k+ cash',
    category: 'SURVIVAL',
    tier: 'PLATINUM',
    icon: '🔄',
    xpReward: 800,
    unlockConditions: ['hadNegativeCash === true', 'cash >= 100000'],
  },
];

// =====================================================
// SPECIAL ACHIEVEMENTS
// =====================================================

export const SPECIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'tutorial_complete',
    name: 'Tutorial Graduate',
    nameRo: 'Absolvent Tutorial',
    description: 'Complete the tutorial scenario',
    descriptionRo: 'Finalizează scenariul tutorial',
    category: 'SPECIAL',
    tier: 'BRONZE',
    icon: '🎓',
    xpReward: 150,
    unlockConditions: ['tutorialCompleted === true'],
  },
  {
    id: 'scenario_master',
    name: 'Scenario Master',
    nameRo: 'Maestru Scenarii',
    description: 'Complete all available scenarios',
    descriptionRo: 'Finalizează toate scenariile disponibile',
    category: 'SPECIAL',
    tier: 'DIAMOND',
    icon: '🌟',
    xpReward: 2000,
    unlockConditions: ['scenariosCompleted >= 6'],
  },
  {
    id: 'perfect_month',
    name: 'Perfect Month',
    nameRo: 'Luna Perfectă',
    description: 'Achieve 90+ in all health scores in a single month',
    descriptionRo: 'Atinge 90+ în toate scorurile de sănătate într-o lună',
    category: 'SPECIAL',
    tier: 'PLATINUM',
    icon: '💎',
    xpReward: 1000,
    unlockConditions: ['healthScore >= 90', 'financialScore >= 90', 'operationsScore >= 90', 'complianceScore >= 90', 'growthScore >= 90'],
  },
  {
    id: 'decision_maker',
    name: 'Decision Maker',
    nameRo: 'Decident',
    description: 'Make 100 strategic decisions',
    descriptionRo: 'Ia 100 de decizii strategice',
    category: 'SPECIAL',
    tier: 'SILVER',
    icon: '🎯',
    xpReward: 300,
    unlockConditions: ['totalDecisions >= 100'],
  },
  {
    id: 'event_handler',
    name: 'Event Handler',
    nameRo: 'Gestionarul Evenimentelor',
    description: 'Successfully handle 50 random events',
    descriptionRo: 'Gestionează cu succes 50 de evenimente aleatorii',
    category: 'SPECIAL',
    tier: 'SILVER',
    icon: '⚡',
    xpReward: 350,
    unlockConditions: ['eventsHandled >= 50'],
  },
  {
    id: 'course_applier',
    name: 'Knowledge in Action',
    nameRo: 'Cunoștințe în Acțiune',
    description: 'Make decisions linked to 10 different courses',
    descriptionRo: 'Ia decizii legate de 10 cursuri diferite',
    category: 'SPECIAL',
    tier: 'GOLD',
    icon: '📚',
    xpReward: 500,
    unlockConditions: ['coursesApplied >= 10'],
  },
  {
    id: 'perfect_compliance',
    name: 'Romanian Compliance Expert',
    nameRo: 'Expert Conformitate Românească',
    description: 'Perfect compliance for 24 months with e-Factura and SAF-T',
    descriptionRo: 'Conformitate perfectă 24 luni cu e-Factura și SAF-T',
    category: 'SPECIAL',
    tier: 'DIAMOND',
    icon: '🇷🇴',
    xpReward: 1500,
    unlockConditions: ['monthsWithoutPenalties >= 24', 'saftSubmissions >= 24', 'eFacturaSubmissions >= 24'],
    relatedCourseId: 'conformitate-legala-firme-noi',
  },
];

// =====================================================
// ALL ACHIEVEMENTS
// =====================================================

export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...FINANCIAL_ACHIEVEMENTS,
  ...OPERATIONS_ACHIEVEMENTS,
  ...GROWTH_ACHIEVEMENTS,
  ...COMPLIANCE_ACHIEVEMENTS,
  ...SURVIVAL_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
];

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => a.category === category);
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: AchievementTier): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => a.tier === tier);
}

/**
 * Check if achievement is unlocked
 */
export function isAchievementUnlocked(achievement: Achievement, stats: Record<string, any>): boolean {
  for (const condition of achievement.unlockConditions) {
    try {
      let expr = condition;
      for (const [key, value] of Object.entries(stats)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        expr = expr.replace(regex, JSON.stringify(value));
      }
      const result = Function(`"use strict"; return (${expr})`)();
      if (!result) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Check all achievements and return newly unlocked ones
 */
export function checkAchievements(
  stats: Record<string, any>,
  alreadyUnlocked: string[]
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ALL_ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(achievement.id)) continue;
    if (isAchievementUnlocked(achievement, stats)) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/**
 * Get total XP from achievements
 */
export function calculateTotalXP(unlockedIds: string[]): number {
  return ALL_ACHIEVEMENTS
    .filter(a => unlockedIds.includes(a.id))
    .reduce((sum, a) => sum + a.xpReward, 0);
}

/**
 * Get player level from XP
 */
export function getPlayerLevel(totalXP: number): { level: number; title: string; nextLevelXP: number } {
  const levels = [
    { level: 1, title: 'Antreprenor Începător', xp: 0 },
    { level: 2, title: 'Antreprenor', xp: 500 },
    { level: 3, title: 'Manager', xp: 1500 },
    { level: 4, title: 'Director', xp: 3500 },
    { level: 5, title: 'CEO', xp: 6500 },
    { level: 6, title: 'Mogul', xp: 10000 },
    { level: 7, title: 'Titan al Afacerilor', xp: 15000 },
    { level: 8, title: 'Legendă', xp: 22000 },
    { level: 9, title: 'Maestru', xp: 30000 },
    { level: 10, title: 'Guru al Afacerilor', xp: 50000 },
  ];

  let currentLevel = levels[0];
  let nextLevelXP = levels[1].xp;

  for (let i = 0; i < levels.length; i++) {
    if (totalXP >= levels[i].xp) {
      currentLevel = levels[i];
      nextLevelXP = i < levels.length - 1 ? levels[i + 1].xp : levels[i].xp;
    }
  }

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextLevelXP,
  };
}

// Alias for service compatibility
export const ACHIEVEMENTS = ALL_ACHIEVEMENTS;
export const calculateXP = calculateTotalXP;

// Player levels as exportable constant
export const PLAYER_LEVELS = [
  { level: 1, title: 'Antreprenor Începător', xpRequired: 0 },
  { level: 2, title: 'Antreprenor', xpRequired: 500 },
  { level: 3, title: 'Manager', xpRequired: 1500 },
  { level: 4, title: 'Director', xpRequired: 3500 },
  { level: 5, title: 'CEO', xpRequired: 6500 },
  { level: 6, title: 'Mogul', xpRequired: 10000 },
  { level: 7, title: 'Titan al Afacerilor', xpRequired: 15000 },
  { level: 8, title: 'Legendă', xpRequired: 22000 },
  { level: 9, title: 'Maestru', xpRequired: 30000 },
  { level: 10, title: 'Guru al Afacerilor', xpRequired: 50000 },
];

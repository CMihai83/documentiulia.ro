import { PrismaService } from '../../common/prisma/prisma.service';
export interface BadgeDefinition {
    id: string;
    name: string;
    nameRo: string;
    description: string;
    descriptionRo: string;
    icon: string;
    category: 'learning' | 'community' | 'accounting' | 'special';
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    xpReward: number;
    criteria: {
        type: string;
        threshold: number;
    };
}
export interface XpConfig {
    action: string;
    baseXp: number;
    description: string;
}
export interface Level {
    level: number;
    name: string;
    nameRo: string;
    minXp: number;
    maxXp: number;
    perks: string[];
}
export declare class GamificationService {
    private prisma;
    private readonly logger;
    private readonly badges;
    private readonly xpActions;
    private readonly levels;
    constructor(prisma: PrismaService);
    getUserProfile(userId: string): Promise<{
        xp: number;
        level: Level;
        badges: any[];
        stats: any;
        recentActivity: any[];
        nextLevelProgress: number;
    }>;
    awardXp(userId: string, action: string, multiplier?: number): Promise<{
        xpAwarded: number;
        newTotal: number;
        leveledUp: boolean;
        newLevel?: Level;
    }>;
    checkEarnedBadges(userId: string, stats: Record<string, number>): Promise<any[]>;
    getLeaderboard(timeframe?: 'daily' | 'weekly' | 'monthly' | 'alltime', limit?: number): Promise<any[]>;
    getAllBadges(): BadgeDefinition[];
    getXpActions(): XpConfig[];
    getAllLevels(): Level[];
    private getLevelForXp;
    private calculateLevelProgress;
    private getStatForCriteria;
}
//# sourceMappingURL=gamification.service.d.ts.map
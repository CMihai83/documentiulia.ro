import { GamificationService } from './gamification.service';
export declare class GamificationController {
    private readonly gamificationService;
    constructor(gamificationService: GamificationService);
    getProfile(user: any): Promise<{
        xp: number;
        level: import("./gamification.service").Level;
        badges: any[];
        stats: any;
        recentActivity: any[];
        nextLevelProgress: number;
    }>;
    getUserProfile(userId: string): Promise<{
        xp: number;
        level: import("./gamification.service").Level;
        badges: any[];
        stats: any;
        recentActivity: any[];
        nextLevelProgress: number;
    }>;
    getLeaderboard(timeframe?: 'daily' | 'weekly' | 'monthly' | 'alltime', limit?: number): Promise<any[]>;
    getAllBadges(): Promise<{
        total: number;
        categories: {
            learning: import("./gamification.service").BadgeDefinition[];
            community: import("./gamification.service").BadgeDefinition[];
            accounting: import("./gamification.service").BadgeDefinition[];
            special: import("./gamification.service").BadgeDefinition[];
        };
    }>;
    getAllLevels(): Promise<{
        levels: import("./gamification.service").Level[];
        xpActions: import("./gamification.service").XpConfig[];
    }>;
    awardXp(user: any, action: string, multiplier?: number): Promise<{
        xpAwarded: number;
        newTotal: number;
        leveledUp: boolean;
        newLevel?: import("./gamification.service").Level;
    }>;
    getUserStats(user: any): Promise<{
        xp: number;
        level: import("./gamification.service").Level;
        badgesEarned: number;
        totalBadges: number;
        stats: any;
        nextLevelProgress: number;
    }>;
    getAchievements(user: any): Promise<{
        earned: {
            count: number;
            badges: any[];
        };
        inProgress: {
            count: number;
            badges: any[];
        };
        locked: {
            count: number;
        };
    }>;
}
//# sourceMappingURL=gamification.controller.d.ts.map
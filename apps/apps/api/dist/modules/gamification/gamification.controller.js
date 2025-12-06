"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const gamification_service_1 = require("./gamification.service");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let GamificationController = class GamificationController {
    gamificationService;
    constructor(gamificationService) {
        this.gamificationService = gamificationService;
    }
    async getProfile(user) {
        return this.gamificationService.getUserProfile(user.id);
    }
    async getUserProfile(userId) {
        return this.gamificationService.getUserProfile(userId);
    }
    async getLeaderboard(timeframe, limit) {
        return this.gamificationService.getLeaderboard(timeframe || 'monthly', limit || 50);
    }
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
    async getAllLevels() {
        return {
            levels: this.gamificationService.getAllLevels(),
            xpActions: this.gamificationService.getXpActions(),
        };
    }
    async awardXp(user, action, multiplier) {
        return this.gamificationService.awardXp(user.id, action, multiplier || 1);
    }
    async getUserStats(user) {
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
    async getAchievements(user) {
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
};
exports.GamificationController = GamificationController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user gamification profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('profile/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user gamification profile by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getUserProfile", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get community leaderboard' }),
    (0, swagger_1.ApiQuery)({
        name: 'timeframe',
        required: false,
        enum: ['daily', 'weekly', 'monthly', 'alltime'],
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leaderboard returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)('timeframe')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('badges'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all available badges' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Badges returned' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getAllBadges", null);
__decorate([
    (0, common_1.Get)('levels'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all levels and perks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Levels returned' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getAllLevels", null);
__decorate([
    (0, common_1.Post)('award-xp'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Award XP to current user (internal use)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('action')),
    __param(2, (0, common_1.Query)('multiplier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "awardXp", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user stats summary' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getUserStats", null);
__decorate([
    (0, common_1.Get)('achievements'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user achievements and progress' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getAchievements", null);
exports.GamificationController = GamificationController = __decorate([
    (0, swagger_1.ApiTags)('Gamification'),
    (0, common_1.Controller)('gamification'),
    __metadata("design:paramtypes", [gamification_service_1.GamificationService])
], GamificationController);
//# sourceMappingURL=gamification.controller.js.map
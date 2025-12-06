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
var ClerkAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
let ClerkAuthGuard = ClerkAuthGuard_1 = class ClerkAuthGuard {
    config;
    logger = new common_1.Logger(ClerkAuthGuard_1.name);
    clerk = null;
    constructor(config) {
        this.config = config;
        const secretKey = this.config.get('CLERK_SECRET_KEY');
        if (secretKey && secretKey !== 'test_secret') {
            this.clerk = (0, backend_1.createClerkClient)({ secretKey });
        }
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (process.env.NODE_ENV !== 'production' &&
            authHeader === 'Bearer dev_test_token') {
            request.user = {
                clerkId: 'user_test_admin',
                email: 'admin@documentiulia.ro',
                firstName: 'Admin',
                lastName: 'Test',
            };
            return true;
        }
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing authorization header');
        }
        const token = authHeader.split(' ')[1];
        try {
            if (this.clerk && process.env.NODE_ENV === 'production') {
                return await this.verifyWithClerk(request, token);
            }
            const payload = this.decodeAndValidateToken(token);
            request.user = payload;
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Authentication failed: ${message}`);
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async verifyWithClerk(request, token) {
        try {
            const { isSignedIn, toAuth } = await this.clerk.authenticateRequest(request, {
                jwtKey: this.config.get('CLERK_JWT_KEY'),
                authorizedParties: this.config
                    .get('CLERK_AUTHORIZED_PARTIES')
                    ?.split(','),
            });
            if (!isSignedIn) {
                throw new common_1.UnauthorizedException('Not signed in');
            }
            const auth = toAuth();
            const userId = auth.userId;
            const user = await this.clerk.users.getUser(userId);
            request.user = {
                clerkId: user.id,
                email: user.emailAddresses[0]?.emailAddress,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phoneNumbers[0]?.phoneNumber,
                imageUrl: user.imageUrl,
                metadata: user.publicMetadata,
            };
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Clerk verification failed: ${message}`);
            throw new common_1.UnauthorizedException('Clerk authentication failed');
        }
    }
    decodeAndValidateToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token format');
            }
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                throw new Error('Token expired');
            }
            const issuer = payload.iss;
            if (issuer && !issuer.includes('clerk')) {
                this.logger.warn(`Unexpected issuer: ${issuer}`);
            }
            return {
                clerkId: payload.sub || payload.user_id,
                email: payload.email || payload.primary_email,
                firstName: payload.first_name || payload.firstName,
                lastName: payload.last_name || payload.lastName,
                sessionId: payload.sid,
                organizationId: payload.org_id,
                metadata: payload.public_metadata || payload.metadata,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new common_1.UnauthorizedException(`Failed to decode token: ${message}`);
        }
    }
};
exports.ClerkAuthGuard = ClerkAuthGuard;
exports.ClerkAuthGuard = ClerkAuthGuard = ClerkAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClerkAuthGuard);
//# sourceMappingURL=clerk.guard.js.map
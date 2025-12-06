import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class ClerkAuthGuard implements CanActivate {
    private readonly config;
    private readonly logger;
    private clerk;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private verifyWithClerk;
    private decodeAndValidateToken;
}
//# sourceMappingURL=clerk.guard.d.ts.map
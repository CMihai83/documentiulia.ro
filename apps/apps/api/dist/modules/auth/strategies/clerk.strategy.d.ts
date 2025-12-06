import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
declare const ClerkStrategy_base: new (...args: any[]) => Strategy;
export declare class ClerkStrategy extends ClerkStrategy_base {
    private readonly config;
    private readonly authService;
    constructor(config: ConfigService, authService: AuthService);
    validate(payload: any): Promise<{
        clerkId: any;
        email: any;
    }>;
}
export {};
//# sourceMappingURL=clerk.strategy.d.ts.map
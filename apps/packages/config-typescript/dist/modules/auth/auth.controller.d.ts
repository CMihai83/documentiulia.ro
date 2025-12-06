import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getProfile(req: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            locale: string;
        };
        companies: {
            id: string;
            name: string;
            cui: string;
            role: import(".prisma/client").$Enums.CompanyRole;
        }[];
        defaultCompanyId: string | undefined;
    }>;
    handleClerkWebhook(body: any, req: any): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=auth.controller.d.ts.map
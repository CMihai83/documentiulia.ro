import { PrismaService } from '../../common/prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        status: string;
        timestamp: string;
        services: {
            api: string;
            database: string;
        };
        version: string;
    }>;
    private checkDatabase;
}
//# sourceMappingURL=health.controller.d.ts.map
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    softDelete<T>(model: string, where: object): Promise<T>;
    cleanDatabase(): Promise<void>;
}
//# sourceMappingURL=prisma.service.d.ts.map
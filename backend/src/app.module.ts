import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { FinanceModule } from './finance/finance.module';
import { SagaModule } from './saga/saga.module';
import { AnafModule } from './anaf/anaf.module';
import { HrModule } from './hr/hr.module';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    FinanceModule,
    SagaModule,
    AnafModule,
    HrModule,
    AiModule,
    DocumentsModule,
  ],
})
export class AppModule {}

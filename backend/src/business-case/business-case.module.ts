import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessCaseController } from './business-case.controller';
import { BusinessCaseService } from './business-case.service';

/** BC-101/102/103 — Business-Case studio module. */
@Module({
  imports: [PrismaModule],
  controllers: [BusinessCaseController],
  providers: [BusinessCaseService],
  exports: [BusinessCaseService],
})
export class BusinessCaseModule {}

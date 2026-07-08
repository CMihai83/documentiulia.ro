import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { DeMinimisService } from './deminimis.service';

/** FND-1/2/3/4 — Funds & Financing Advisory (catalog, 7-filter match, de minimis, pre-check). */
@Module({
  imports: [PrismaModule],
  controllers: [FundsController],
  providers: [FundsService, DeMinimisService],
  exports: [FundsService, DeMinimisService],
})
export class FundsModule {}

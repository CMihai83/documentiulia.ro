/**
 * Banking Module - PSD2 Integration
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';

@Module({
  imports: [ConfigModule],
  controllers: [BankingController],
  providers: [BankingService],
  exports: [BankingService],
})
export class BankingModule {}

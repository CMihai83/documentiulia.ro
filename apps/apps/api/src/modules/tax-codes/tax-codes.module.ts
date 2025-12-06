import { Module } from '@nestjs/common';
import { TaxCodesController } from './tax-codes.controller';
import { TaxCodesService } from './tax-codes.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaxCodesController],
  providers: [TaxCodesService],
  exports: [TaxCodesService],
})
export class TaxCodesModule {}

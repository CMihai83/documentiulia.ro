import { Module } from '@nestjs/common';
import { EtransportService } from './etransport.service';
import { EtransportController } from './etransport.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EtransportController],
  providers: [EtransportService],
  exports: [EtransportService],
})
export class EtransportModule {}

import { Module } from '@nestjs/common';
import { EfacturaService } from './efactura.service';
import { EfacturaController } from './efactura.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EfacturaController],
  providers: [EfacturaService],
  exports: [EfacturaService],
})
export class EfacturaModule {}

import { Module } from '@nestjs/common';
import { AnafService } from './anaf.service';
import { AnafController } from './anaf.controller';
import { SaftService } from './saft.service';
import { EfacturaService } from './efactura.service';

@Module({
  controllers: [AnafController],
  providers: [AnafService, SaftService, EfacturaService],
  exports: [AnafService, SaftService, EfacturaService],
})
export class AnafModule {}

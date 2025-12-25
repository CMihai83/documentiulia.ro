import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnafService } from './anaf.service';
import { AnafController } from './anaf.controller';
import { SaftService } from './saft.service';
import { SaftValidatorService } from './saft-validator.service';
import { SaftD406MonthlyService } from './saft-d406-monthly.service';
import { SaftD406Controller } from './saft-d406.controller';
import { SaftController } from './saft.controller';
import { EfacturaService } from './efactura.service';
import { EfacturaSyncService } from './efactura-sync.service';
import { EfacturaValidatorService } from './efactura-validator.service';
import { EfacturaB2BController } from './efactura-b2b.controller';
import { SpvService } from './spv.service';
import { SpvController } from './spv.controller';
import { ETransportService } from './e-transport.service';
import { ETransportController } from './e-transport.controller';
import { DeadlineReminderService } from './deadline-reminder.service';
import { DeadlineReminderController } from './deadline-reminder.controller';
import { ANAFResilientService } from './anaf-resilient.service';
import { EFacturaB2CService } from './efactura-b2c.service';
import { EfacturaB2CController } from './efactura-b2c.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), EventEmitterModule.forRoot(), PrismaModule],
  controllers: [
    AnafController,
    SpvController,
    ETransportController,
    SaftD406Controller,
    SaftController,
    EfacturaB2BController,
    EfacturaB2CController,
    DeadlineReminderController,
  ],
  providers: [
    AnafService,
    ANAFResilientService,
    SaftService,
    SaftValidatorService,
    SaftD406MonthlyService,
    EfacturaService,
    EfacturaSyncService,
    EfacturaValidatorService,
    EFacturaB2CService,
    SpvService,
    ETransportService,
    DeadlineReminderService,
  ],
  exports: [
    AnafService,
    ANAFResilientService,
    SaftService,
    SaftValidatorService,
    SaftD406MonthlyService,
    EfacturaService,
    EfacturaSyncService,
    EfacturaValidatorService,
    EFacturaB2CService,
    SpvService,
    ETransportService,
    DeadlineReminderService,
  ],
})
export class AnafModule {}

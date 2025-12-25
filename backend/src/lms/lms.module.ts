import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';
import { ExcelVBACoursesController } from './excel-vba-courses.controller';
import { ExcelVBACoursesService } from './excel-vba-courses.service';
import { PMAgileCoursesController } from './pm-agile-courses.controller';
import { PMAgileCoursesService } from './pm-agile-courses.service';
import { MBACoursesController } from './mba-courses.controller';
import { MBACoursesService } from './mba-courses.service';
import { FinanceOpsCoursesController } from './finance-ops-courses.controller';
import { FinanceOpsCoursesService } from './finance-ops-courses.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    LMSController,
    ExcelVBACoursesController,
    PMAgileCoursesController,
    MBACoursesController,
    FinanceOpsCoursesController,
  ],
  providers: [
    LMSService,
    ExcelVBACoursesService,
    PMAgileCoursesService,
    MBACoursesService,
    FinanceOpsCoursesService,
  ],
  exports: [
    LMSService,
    ExcelVBACoursesService,
    PMAgileCoursesService,
    MBACoursesService,
    FinanceOpsCoursesService,
  ],
})
export class LMSModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
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
    GamificationController,
    ExcelVBACoursesController,
    PMAgileCoursesController,
    MBACoursesController,
    FinanceOpsCoursesController,
  ],
  providers: [
    LMSService,
    GamificationService,
    ExcelVBACoursesService,
    PMAgileCoursesService,
    MBACoursesService,
    FinanceOpsCoursesService,
  ],
  exports: [
    LMSService,
    GamificationService,
    ExcelVBACoursesService,
    PMAgileCoursesService,
    MBACoursesService,
    FinanceOpsCoursesService,
  ],
})
export class LMSModule {}

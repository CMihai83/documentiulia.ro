/**
 * Users Module
 * User management and preferences
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardPreferencesService } from './dashboard-preferences.service';
import { DashboardPreferencesController } from './dashboard-preferences.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardPreferencesController],
  providers: [DashboardPreferencesService],
  exports: [DashboardPreferencesService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmployeePortalController } from './employee-portal.controller';
import { EmployeePortalService } from './employee-portal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [EmployeePortalController],
  providers: [EmployeePortalService],
  exports: [EmployeePortalService],
})
export class EmployeePortalModule {}

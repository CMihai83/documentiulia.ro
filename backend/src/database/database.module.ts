import { Module } from '@nestjs/common';
import { DatabaseController } from './database.controller';
import { DatabaseOptimizationController } from './database-optimization.controller';
import { DatabaseOptimizationService } from './database-optimization.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DatabaseController, DatabaseOptimizationController],
  providers: [DatabaseOptimizationService],
  exports: [DatabaseOptimizationService],
})
export class DatabaseModule {}

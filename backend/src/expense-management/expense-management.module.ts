import { Module } from '@nestjs/common';
import { ExpenseManagementService } from './expense-management.service';
import { ExpenseManagementController } from './expense-management.controller';

@Module({
  controllers: [ExpenseManagementController],
  providers: [ExpenseManagementService],
  exports: [ExpenseManagementService],
})
export class ExpenseManagementModule {}

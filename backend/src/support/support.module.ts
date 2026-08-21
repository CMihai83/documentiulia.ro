import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminTicketsController } from './admin-tickets.controller';

/** REQ-049 — client requests: client endpoints + staff inbox. */
@Module({
  imports: [PrismaModule],
  controllers: [SupportController, AdminTicketsController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}

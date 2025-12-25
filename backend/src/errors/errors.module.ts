import { Module } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { ErrorsController } from './errors.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ErrorsService],
  controllers: [ErrorsController],
  exports: [ErrorsService],
})
export class ErrorsModule {}

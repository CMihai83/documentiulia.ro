import { Module } from '@nestjs/common';
import { SaftController } from './saft.controller';
import { SaftService } from './saft.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaftController],
  providers: [SaftService],
  exports: [SaftService],
})
export class SaftModule {}

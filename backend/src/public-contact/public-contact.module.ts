import { Module } from '@nestjs/common';
import { SupportModule } from '../support/support.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicContactController } from './public-contact.controller';
import { PublicContactService } from './public-contact.service';

@Module({
  imports: [SupportModule, PrismaModule],
  controllers: [PublicContactController],
  providers: [PublicContactService],
  exports: [PublicContactService],
})
export class PublicContactModule {}

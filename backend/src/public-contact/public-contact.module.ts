import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicContactController } from './public-contact.controller';
import { PublicContactService } from './public-contact.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicContactController],
  providers: [PublicContactService],
  exports: [PublicContactService],
})
export class PublicContactModule {}

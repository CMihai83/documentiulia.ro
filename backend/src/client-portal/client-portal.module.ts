import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientPortalMeController } from './client-portal-me.controller';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClientPortalMeController, ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}

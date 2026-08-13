import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientPortalMeController } from './client-portal-me.controller';
import { ClientPortalService } from './client-portal.service';

@Module({
  imports: [PrismaModule],
  // REQ-048/REQ-042: the legacy ClientPortalController (unauthenticated,
  // keyed only by a :clientId path param — anyone could read any client's
  // invoices/documents) is retired in favour of the JWT-scoped me/* controller.
  controllers: [ClientPortalMeController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}

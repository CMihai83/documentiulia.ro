import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantService } from './tenant.service';
import { TenantGuard, OrgRolesGuard } from './tenant.guard';
import { TenantController } from './tenant.controller';
import { DataIsolationService } from './data-isolation.service';
import { DataIsolationController } from './data-isolation.controller';
import { TenantConfigService } from './tenant-config.service';
import { TenantConfigController } from './tenant-config.controller';
import { TenantContextService } from './tenant-context.service';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [TenantController, DataIsolationController, TenantConfigController],
  providers: [
    TenantService,
    TenantGuard,
    OrgRolesGuard,
    DataIsolationService,
    TenantConfigService,
    TenantContextService,
    StripeConnectService,
  ],
  exports: [
    TenantService,
    TenantGuard,
    OrgRolesGuard,
    DataIsolationService,
    TenantConfigService,
    TenantContextService,
    StripeConnectService,
  ],
})
export class TenantModule {}

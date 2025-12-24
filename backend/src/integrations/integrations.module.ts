import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { IntegrationsHubService } from './integrations-hub.service';
import { IntegrationsHubController } from './integrations-hub.controller';
import { OAuth2ProviderService } from './oauth2-provider.service';
import { OAuth2ProviderController } from './oauth2-provider.controller';
import { DataPipelineService } from './data-pipeline.service';
import { DataPipelineController } from './data-pipeline.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SagaModule } from './saga/saga.module';
import { SmartBillModule } from './smartbill/smartbill.module';
import { QuickBooksModule } from './quickbooks/quickbooks.module';

@Module({
  imports: [PrismaModule, ConfigModule, EventEmitterModule.forRoot(), SagaModule, SmartBillModule, QuickBooksModule],
  controllers: [
    WebhookController,
    IntegrationsHubController,
    OAuth2ProviderController,
    DataPipelineController,
  ],
  providers: [
    WebhookService,
    IntegrationsHubService,
    OAuth2ProviderService,
    DataPipelineService,
  ],
  exports: [
    WebhookService,
    IntegrationsHubService,
    OAuth2ProviderService,
    DataPipelineService,
    SagaModule,
    SmartBillModule,
    QuickBooksModule,
  ],
})
export class IntegrationsModule {}

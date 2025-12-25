import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MicroservicesController } from './microservices.controller';
import { MicroservicesService } from './microservices.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  controllers: [MicroservicesController],
  providers: [MicroservicesService],
  exports: [MicroservicesService],
})
export class MicroservicesModule {}

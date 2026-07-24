import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MicroservicesController } from './microservices.controller';
import { MicroservicesService } from './microservices.service';

@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [MicroservicesController],
  providers: [MicroservicesService],
  exports: [MicroservicesService],
})
export class MicroservicesModule {}

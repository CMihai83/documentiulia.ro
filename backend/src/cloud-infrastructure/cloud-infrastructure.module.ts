import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudInfrastructureController } from './cloud-infrastructure.controller';
import { CloudInfrastructureService } from './cloud-infrastructure.service';

@Module({
  imports: [ConfigModule],
  controllers: [CloudInfrastructureController],
  providers: [CloudInfrastructureService],
  exports: [CloudInfrastructureService],
})
export class CloudInfrastructureModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiPlatformService } from './api-platform.service';
import { ApiPlatformController } from './api-platform.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ApiPlatformController],
  providers: [ApiPlatformService],
  exports: [ApiPlatformService],
})
export class ApiPlatformModule {}

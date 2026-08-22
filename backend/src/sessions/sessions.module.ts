import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}

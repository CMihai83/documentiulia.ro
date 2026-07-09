import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { MockDriver } from './drivers/mock.driver';
import { LocalDockerDriver } from './drivers/local-docker.driver';
import { RunPodDriver } from './drivers/runpod.driver';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, MockDriver, LocalDockerDriver, RunPodDriver],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}

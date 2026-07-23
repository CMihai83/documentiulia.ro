import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { ProjectsWorkAppModule } from './standalone/projects-work-app.module';

/** Bootstrap for the standalone projects-work slice (see projects-work-app.module.ts). */
async function bootstrap() {
  const app = await NestFactory.create(ProjectsWorkAppModule, { bufferLogs: true });

  app.getHttpAdapter().getInstance().set('trust proxy', ['loopback', 'uniquelocal']);
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(helmet());
  app.use(compression({ threshold: 1024 }));
  app.use(cookieParser());

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.setGlobalPrefix('api/v1');

  const port = parseInt(process.env.PROJECTS_PORT || process.env.PORT || '3109', 10);
  await app.listen(port);
  console.log(`projects-work standalone slice listening on :${port}`);
}

bootstrap();

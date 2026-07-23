import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { ComplianceHubAppModule } from './standalone/compliance-hub-app.module';

/** Bootstrap for the standalone compliance-hub slice (see compliance-hub-app.module.ts). */
async function bootstrap() {
  const app = await NestFactory.create(ComplianceHubAppModule, { bufferLogs: true });

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

  const port = parseInt(process.env.COMPLIANCE_PORT || process.env.PORT || '3104', 10);
  await app.listen(port);
  console.log(`compliance-hub standalone slice listening on :${port}`);
}

bootstrap();

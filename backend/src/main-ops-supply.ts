import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { OpsSupplyAppModule } from './standalone/ops-supply-app.module';

/** Bootstrap for the standalone ops-supply slice (see ops-supply-app.module.ts). */
async function bootstrap() {
  const app = await NestFactory.create(OpsSupplyAppModule, { bufferLogs: true });

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

  const port = parseInt(process.env.OPS_PORT || process.env.PORT || '3107', 10);
  await app.listen(port);
  console.log(`ops-supply standalone slice listening on :${port}`);
}

bootstrap();

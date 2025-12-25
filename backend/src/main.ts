import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Starting DocumentIulia backend...');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  console.log('App created successfully');

  // Use Winston logger
  console.log('Skipping Winston logger for debugging...');
  // const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  // app.useLogger(logger);
  console.log('Logger setup skipped');

  // Request size limits (protection against large payload attacks)
  console.log('Setting up middleware...');
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security headers
  console.log('Setting up security headers...');
  app.use(helmet());
  console.log('Helmet setup complete');

  // Response compression (gzip) for improved performance
  console.log('Setting up compression...');
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is good balance of speed/compression)
    threshold: 1024, // Only compress responses > 1KB
  }));
  console.log('Compression setup complete');

  // Cookie parser for CSRF tokens
  console.log('Setting up cookie parser...');
  app.use(cookieParser());
  console.log('Cookie parser setup complete');

  // CORS configuration
  console.log('Setting up CORS...');
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  });
  console.log('CORS setup complete');

  // Validation
  console.log('Setting up validation...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  console.log('Validation setup complete');

  // API prefix
  console.log('Setting API prefix...');
  app.setGlobalPrefix('api/v1');
  console.log('API prefix set');

  // Swagger - Comprehensive API Documentation
  console.log('Setting up Swagger...');
  const config = new DocumentBuilder()
    .setTitle('DocumentIulia.ro API')
    .setDescription('Business management platform API for Romanian compliance')
    .setVersion('1.0')
    .addTag('ANAF', 'Tax compliance and ANAF integration')
    .addTag('SAGA', 'SAGA v3.2 accounting integration')
    .addTag('Finance', 'Financial operations and VAT management')
    .addTag('Documents', 'Document management and OCR')
    .addTag('AI', 'AI-powered insights and automation')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  console.log('Swagger setup complete');

  const port = process.env.PORT || 3001;
  console.log(`About to listen on port ${port}...`);
  await app.listen(port);
  console.log(`App is listening on port ${port}`);

  console.log(`DocumentIulia API running on port ${port}`);
  console.log(`Health check at http://localhost:${port}/api/v1/health`);
}
bootstrap();

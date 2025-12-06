import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // API Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('DocumentIulia API')
      .setDescription('Romanian Accounting Platform API - Platformă completă de contabilitate cu integrare e-Factura, SAF-T, și funcții de comunitate')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Companies', 'Company management')
      .addTag('Clients', 'Client management')
      .addTag('Products', 'Product catalog')
      .addTag('Invoices', 'Invoice operations')
      .addTag('Expenses', 'Expense tracking')
      .addTag('Receipts', 'Receipt processing with OCR')
      .addTag('Reports', 'Financial reports and analytics')
      .addTag('Bank Accounts', 'Bank account management')
      .addTag('e-Factura', 'e-Factura ANAF integration')
      .addTag('SAF-T', 'SAF-T reporting')
      .addTag('Tax Codes', 'Romanian tax codes (TVA)')
      .addTag('Projects', 'Project management')
      .addTag('Documents', 'Document storage')
      .addTag('Notifications', 'User notifications')
      .addTag('Activity', 'Activity logs')
      .addTag('Forum', 'Community forum - categorii, subiecte, răspunsuri')
      .addTag('Courses', 'Cursuri online - învățare contabilitate și fiscalitate')
      .addTag('Health', 'API health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 DocumentIulia API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();

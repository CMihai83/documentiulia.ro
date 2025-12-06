import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('DocumentIulia.ro API')
    .setDescription('API for Romanian ERP/Accounting platform with AI')
    .setVersion('1.0')
    .addTag('finance', 'VAT calculation, invoices, reports')
    .addTag('saga', 'SAGA v3.2 integration')
    .addTag('anaf', 'ANAF SPV/e-Factura/SAF-T')
    .addTag('hr', 'Human resources, payroll')
    .addTag('ai', 'Grok AI assistant')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`DocumentIulia API running on port ${port}`);
}
bootstrap();

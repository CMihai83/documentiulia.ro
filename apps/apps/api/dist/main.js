"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    if (process.env.NODE_ENV !== 'production') {
        const config = new swagger_1.DocumentBuilder()
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
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 DocumentIulia API running on http://localhost:${port}`);
    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map
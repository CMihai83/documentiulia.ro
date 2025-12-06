import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProductsModule } from './modules/products/products.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EfacturaModule } from './modules/efactura/efactura.module';
import { SaftModule } from './modules/saft/saft.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { TaxCodesModule } from './modules/tax-codes/tax-codes.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ForumModule } from './modules/forum/forum.module';
import { CoursesModule } from './modules/courses/courses.module';
import { EtransportModule } from './modules/etransport/etransport.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BlogModule } from './modules/blog/blog.module';
import { SagaModule } from './modules/integrations/saga/saga.module';
import { BankingModule } from './modules/integrations/banking/banking.module';
import { HrModule } from './modules/hr/hr.module';
import { EuFundsModule } from './modules/eu-funds/eu-funds.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),

    // Database
    PrismaModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    CompaniesModule,
    ClientsModule,
    ProductsModule,
    InvoicesModule,
    ExpensesModule,
    ReceiptsModule,
    ReportsModule,
    EfacturaModule,
    SaftModule,
    BankAccountsModule,
    NotificationsModule,
    TaxCodesModule,
    ProjectsModule,
    DocumentsModule,
    ActivityModule,
    ForumModule,
    CoursesModule,
    EtransportModule,
    GamificationModule,
    WebhooksModule,
    BlogModule,
    SagaModule,
    BankingModule,
    HrModule,
    EuFundsModule,
    HealthModule,
  ],
})
export class AppModule {}

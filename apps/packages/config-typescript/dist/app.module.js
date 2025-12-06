"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./common/prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const companies_module_1 = require("./modules/companies/companies.module");
const clients_module_1 = require("./modules/clients/clients.module");
const products_module_1 = require("./modules/products/products.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const expenses_module_1 = require("./modules/expenses/expenses.module");
const receipts_module_1 = require("./modules/receipts/receipts.module");
const reports_module_1 = require("./modules/reports/reports.module");
const efactura_module_1 = require("./modules/efactura/efactura.module");
const saft_module_1 = require("./modules/saft/saft.module");
const bank_accounts_module_1 = require("./modules/bank-accounts/bank-accounts.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const health_module_1 = require("./modules/health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            throttler_1.ThrottlerModule.forRoot([
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
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            companies_module_1.CompaniesModule,
            clients_module_1.ClientsModule,
            products_module_1.ProductsModule,
            invoices_module_1.InvoicesModule,
            expenses_module_1.ExpensesModule,
            receipts_module_1.ReceiptsModule,
            reports_module_1.ReportsModule,
            efactura_module_1.EfacturaModule,
            saft_module_1.SaftModule,
            bank_accounts_module_1.BankAccountsModule,
            notifications_module_1.NotificationsModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
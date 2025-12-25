import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { VatService } from './vat.service';
import { VatController } from './vat.controller';
import { DynamicVATService } from './dynamic-vat.service';
import { DynamicVATController } from './dynamic-vat.controller';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AnomalyDetectionController } from './anomaly-detection.controller';
import { TaxComplianceService } from './tax-compliance.service';
import { TaxComplianceController } from './tax-compliance.controller';
import { MultiCurrencyService } from './multi-currency.service';
import { MultiCurrencyController } from './multi-currency.controller';
import { EuVatService } from './eu-vat.service';
import { EuVatController } from './eu-vat.controller';
import { EuVatConfigService } from '../config/eu-vat-config.service';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { InvoiceAnalyticsService } from './invoice-analytics.service';
import { InvoiceAnalyticsController } from './invoice-analytics.controller';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';
import { VatSimulatorService } from './vat-simulator.service';
import { VatSimulatorController } from './vat-simulator.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot(), AuthModule],
  controllers: [
    FinanceController,
    VatController,
    DynamicVATController,
    PredictiveAnalyticsController,
    CurrencyController,
    AnomalyDetectionController,
    TaxComplianceController,
    MultiCurrencyController,
    EuVatController,
    ReconciliationController,
    InvoiceAnalyticsController,
    ExchangeRateController,
    VatSimulatorController,
  ],
  providers: [
    FinanceService,
    VatService,
    DynamicVATService,
    PredictiveAnalyticsService,
    CurrencyService,
    AnomalyDetectionService,
    TaxComplianceService,
    MultiCurrencyService,
    EuVatService,
    EuVatConfigService,
    ReconciliationService,
    InvoiceAnalyticsService,
    ExchangeRateService,
    VatSimulatorService,
  ],
  exports: [
    FinanceService,
    VatService,
    DynamicVATService,
    PredictiveAnalyticsService,
    CurrencyService,
    AnomalyDetectionService,
    TaxComplianceService,
    MultiCurrencyService,
    EuVatService,
    EuVatConfigService,
    ReconciliationService,
    InvoiceAnalyticsService,
    ExchangeRateService,
    VatSimulatorService,
  ],
})
export class FinanceModule {}

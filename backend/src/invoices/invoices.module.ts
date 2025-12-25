import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { RecurringInvoiceService } from './recurring-invoice.service';
import { RecurringInvoiceController } from './recurring-invoice.controller';
import { InvoiceReminderService } from './invoice-reminder.service';
import { InvoiceReminderController } from './invoice-reminder.controller';
import { BulkInvoiceEmailService } from './bulk-invoice-email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnafModule } from '../anaf/anaf.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SagaModule } from '../saga/saga.module';
import { CommunicationModule } from '../communication/communication.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, AnafModule, NotificationsModule, SagaModule, CommunicationModule, FinanceModule],
  controllers: [InvoicesController, RecurringInvoiceController, InvoiceReminderController],
  providers: [InvoicesService, PdfService, RecurringInvoiceService, InvoiceReminderService, BulkInvoiceEmailService],
  exports: [InvoicesService, PdfService, RecurringInvoiceService, InvoiceReminderService, BulkInvoiceEmailService],
})
export class InvoicesModule {}

import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SaftD406Service {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateSaftXml(companyId: string, startDate: Date, endDate: Date, options?: {
        includeCustomers?: boolean;
        includeSuppliers?: boolean;
        includeProducts?: boolean;
        includeInvoices?: boolean;
        includePayments?: boolean;
    }): Promise<string>;
    generateMonthlySaft(companyId: string, year: number, month: number): Promise<string>;
    generateQuarterlySaft(companyId: string, year: number, quarter: number): Promise<string>;
    private buildHeader;
    private getCustomers;
    private getSuppliers;
    private getProducts;
    private getTaxTable;
    private getInvoices;
    private getPayments;
    private mapInvoiceType;
    private getTaxCode;
    private mapPaymentMethod;
    private aggregateTaxTotals;
    private calculateTotalDebit;
    private calculateTotalCredit;
    private calculatePaymentDebit;
    private calculatePaymentCredit;
    validateSaftXml(xml: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
}
//# sourceMappingURL=saft-d406.service.d.ts.map
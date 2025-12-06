import { ReportsService } from './reports.service';
import { ReportQueryDto, CashFlowQueryDto } from './dto/report-query.dto';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboard(companyId: string, user: any): Promise<{
        revenue: {
            thisMonth: number;
        };
        expenses: {
            thisMonth: number;
        };
        profit: {
            thisMonth: number;
        };
        outstanding: {
            total: number;
            count: number;
        };
        overdue: {
            total: number;
            count: number;
        };
        recentInvoices: ({
            client: {
                name: string;
            };
        } & {
            number: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            currency: string;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            type: import(".prisma/client").$Enums.InvoiceType;
            total: import("@prisma/client/runtime/library").Decimal;
            exchangeRate: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            vatAmount: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            subtotalRon: import("@prisma/client/runtime/library").Decimal;
            vatAmountRon: import("@prisma/client/runtime/library").Decimal;
            totalRon: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            issueDate: Date;
            clientId: string;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            series: string;
            invoiceNumber: string;
            dueDate: Date;
            deliveryDate: Date | null;
            paymentMethod: string | null;
            paidAt: Date | null;
            internalNotes: string | null;
            termsConditions: string | null;
            efacturaStatus: import(".prisma/client").$Enums.EfacturaStatus | null;
            efacturaIndexId: string | null;
            efacturaUploadId: string | null;
            efacturaXml: string | null;
            efacturaSentAt: Date | null;
        })[];
        recentExpenses: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            vatRate: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            tags: string[];
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            vatAmount: import("@prisma/client/runtime/library").Decimal;
            deductiblePercent: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
            invoiceNumber: string | null;
            paymentMethod: string | null;
            category: import(".prisma/client").$Enums.ExpenseCategory;
            vendorName: string | null;
            vendorCui: string | null;
            isDeductible: boolean;
            expenseDate: Date;
            isPaid: boolean;
        }[];
    }>;
    getRevenue(companyId: string, query: ReportQueryDto, user: any): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
        };
        totals: {
            invoiced: number;
            subtotal: number;
            vat: number;
            count: number;
        };
        monthly: {
            invoiced: number;
            paid: number;
            count: number;
            month: string;
        }[];
        byClient: {
            name: string;
            total: number;
            count: number;
        }[];
    }>;
    getExpenses(companyId: string, query: ReportQueryDto, user: any): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
        };
        totals: {
            total: number;
            net: number;
            vat: number;
            count: number;
        };
        byCategory: {
            category: import(".prisma/client").$Enums.ExpenseCategory;
            total: number;
            net: number;
            vat: number;
            count: number;
            percentage: number;
        }[];
        monthly: {
            total: number;
            count: number;
            month: string;
        }[];
    }>;
    getProfitLoss(companyId: string, query: ReportQueryDto, user: any): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
        };
        summary: {
            grossRevenue: number;
            totalExpenses: number;
            netProfit: number;
            profitMargin: number;
            vatCollected: number;
            vatPaid: number;
            vatBalance: number;
        };
        monthly: {
            month: string;
            revenue: number;
            expenses: number;
            profit: number;
        }[];
    }>;
    getCashFlow(companyId: string, query: CashFlowQueryDto, user: any): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
        };
        summary: {
            totalInflow: number;
            totalOutflow: number;
            netCashFlow: number;
            currentCash: number;
        };
        bankAccounts: {
            id: string;
            name: string;
            bankName: string;
            currency: string;
            balance: import("@prisma/client/runtime/library").Decimal;
        }[];
        monthly: {
            month: string;
            inflow: number;
            outflow: number;
            net: number;
        }[];
    }>;
    getVat(companyId: string, query: ReportQueryDto, user: any): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
        };
        vatCollected: number;
        vatDeductible: number;
        vatBalance: number;
        vatDue: number;
        vatRefund: number;
    }>;
    getAging(companyId: string, user: any): Promise<{
        summary: {
            current: number;
            days30: number;
            days60: number;
            days90: number;
            total: number;
        };
        byClient: {
            name: string;
            current: number;
            days30: number;
            days60: number;
            days90: number;
            total: number;
        }[];
    }>;
}
//# sourceMappingURL=reports.controller.d.ts.map
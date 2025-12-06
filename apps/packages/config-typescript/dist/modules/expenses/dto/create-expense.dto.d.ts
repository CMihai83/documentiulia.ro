import { ExpenseCategory } from '@prisma/client';
export declare class CreateExpenseDto {
    description: string;
    category: ExpenseCategory;
    vendorName?: string;
    vendorCui?: string;
    amount: number;
    vatAmount?: number;
    vatRate?: number;
    currency?: string;
    isDeductible?: boolean;
    deductiblePercent?: number;
    expenseDate: string;
    paymentMethod?: string;
    isPaid?: boolean;
    invoiceNumber?: string;
    notes?: string;
    tags?: string[];
}
//# sourceMappingURL=create-expense.dto.d.ts.map
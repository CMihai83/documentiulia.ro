import { TransactionType } from '@prisma/client';
export declare class CreateBankAccountDto {
    name: string;
    bankName: string;
    iban: string;
    swift?: string;
    currency?: string;
    balance?: number;
    isDefault?: boolean;
}
declare const UpdateBankAccountDto_base: import("@nestjs/common").Type<Partial<CreateBankAccountDto>>;
export declare class UpdateBankAccountDto extends UpdateBankAccountDto_base {
}
export declare class CreateTransactionDto {
    transactionDate: string;
    valueDate?: string;
    description: string;
    reference?: string;
    amount: number;
    currency?: string;
    type: TransactionType;
    category?: string;
}
declare const UpdateTransactionDto_base: import("@nestjs/common").Type<Partial<CreateTransactionDto>>;
export declare class UpdateTransactionDto extends UpdateTransactionDto_base {
    isReconciled?: boolean;
}
export declare class TransactionFilterDto {
    type?: TransactionType;
    isReconciled?: boolean;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export {};
//# sourceMappingURL=bank-account.dto.d.ts.map
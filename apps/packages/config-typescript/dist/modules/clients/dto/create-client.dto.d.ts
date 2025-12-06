import { ClientType } from '@prisma/client';
export declare class CreateClientDto {
    type: ClientType;
    name: string;
    cui?: string;
    regCom?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    county?: string;
    country?: string;
    postalCode?: string;
    bankName?: string;
    iban?: string;
    defaultPaymentTerms?: number;
    creditLimit?: number;
    notes?: string;
    tags?: string[];
}
//# sourceMappingURL=create-client.dto.d.ts.map
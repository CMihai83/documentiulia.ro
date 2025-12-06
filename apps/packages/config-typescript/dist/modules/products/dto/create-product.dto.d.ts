import { ProductType } from '@prisma/client';
export declare class CreateProductDto {
    type: ProductType;
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    unitPrice: number;
    currency?: string;
    unit?: string;
    vatRate?: number;
    vatExempt?: boolean;
    trackInventory?: boolean;
    stockQuantity?: number;
    lowStockAlert?: number;
    ncCode?: string;
    isActive?: boolean;
}
//# sourceMappingURL=create-product.dto.d.ts.map
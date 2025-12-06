import { Injectable } from '@nestjs/common';

export interface VATCalculation {
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  law: string;
}

@Injectable()
export class VatService {
  // VAT rates per Legea 141/2025 (effective Aug 2025)
  private readonly VAT_RATES = {
    STANDARD: 21, // General rate
    REDUCED_1: 11, // Food, medicine, books
    REDUCED_2: 5, // Social housing
    ZERO: 0, // Exports, intra-community
  };

  calculateVAT(amount: number, rate: number, isGross: boolean = false): VATCalculation {
    let netAmount: number;
    let vatAmount: number;
    let grossAmount: number;

    if (isGross) {
      grossAmount = amount;
      netAmount = amount / (1 + rate / 100);
      vatAmount = grossAmount - netAmount;
    } else {
      netAmount = amount;
      vatAmount = netAmount * (rate / 100);
      grossAmount = netAmount + vatAmount;
    }

    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate: rate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      law: 'Legea 141/2025',
    };
  }

  getApplicableRate(category: string): number {
    const reducedCategories = [
      'food', 'alimente',
      'medicine', 'medicamente',
      'books', 'carti',
      'newspapers', 'ziare',
    ];

    if (reducedCategories.includes(category.toLowerCase())) {
      return this.VAT_RATES.REDUCED_1;
    }

    return this.VAT_RATES.STANDARD;
  }

  calculateVATPayable(collected: number, deductible: number): {
    vatPayable: number;
    isRefund: boolean;
  } {
    const vatPayable = collected - deductible;
    return {
      vatPayable: Math.round(vatPayable * 100) / 100,
      isRefund: vatPayable < 0,
    };
  }
}

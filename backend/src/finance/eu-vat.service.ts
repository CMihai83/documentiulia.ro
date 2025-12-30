import { Injectable, Logger, HttpException, HttpStatus, Optional } from '@nestjs/common';
import { EuVatConfigService, EUCountryVATRates as ConfigCountryRates } from '../config/eu-vat-config.service';

// EU VAT rates for all 27 member states (2025 rates)
export interface EUCountryVATRates {
  countryCode: string;
  countryName: string;
  countryNameLocal: string;
  currency: string;
  standardRate: number;
  reducedRates: number[];
  superReducedRate?: number;
  parkingRate?: number;
  zeroRated: boolean;
  vatNumberFormat: string;
  vatNumberExample: string;
  effectiveFrom: string;
}

export interface VIESValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate: string;
  error?: string;
}

export interface EUVATCalculation {
  countryCode: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  rateType: 'standard' | 'reduced' | 'super_reduced' | 'parking' | 'zero' | 'exempt';
  exchangeRate?: number;
  amountInEUR?: number;
}

export interface IntraCommunityTransaction {
  sellerCountry: string;
  sellerVatNumber: string;
  buyerCountry: string;
  buyerVatNumber: string;
  isReverseCharge: boolean;
  placeOfSupply: string;
  applicableVATRate: number;
  reason: string;
}

export interface OSSRegistration {
  countryCode: string;
  isRegistered: boolean;
  threshold: number;
  currency: string;
  salesAmount: number;
  thresholdExceeded: boolean;
}

@Injectable()
export class EuVatService {
  private readonly logger = new Logger(EuVatService.name);

  // EU VAT rates database - all 27 member states (2025)
  private readonly EU_VAT_RATES: Record<string, EUCountryVATRates> = {
    AT: {
      countryCode: 'AT',
      countryName: 'Austria',
      countryNameLocal: 'Österreich',
      currency: 'EUR',
      standardRate: 20,
      reducedRates: [10, 13],
      parkingRate: 13,
      zeroRated: false,
      vatNumberFormat: 'ATU########',
      vatNumberExample: 'ATU12345678',
      effectiveFrom: '2025-01-01',
    },
    BE: {
      countryCode: 'BE',
      countryName: 'Belgium',
      countryNameLocal: 'België/Belgique',
      currency: 'EUR',
      standardRate: 21,
      reducedRates: [6, 12],
      parkingRate: 12,
      zeroRated: true,
      vatNumberFormat: 'BE0#########',
      vatNumberExample: 'BE0123456789',
      effectiveFrom: '2025-01-01',
    },
    BG: {
      countryCode: 'BG',
      countryName: 'Bulgaria',
      countryNameLocal: 'България',
      currency: 'BGN',
      standardRate: 20,
      reducedRates: [9],
      zeroRated: true,
      vatNumberFormat: 'BG#########',
      vatNumberExample: 'BG123456789',
      effectiveFrom: '2025-01-01',
    },
    HR: {
      countryCode: 'HR',
      countryName: 'Croatia',
      countryNameLocal: 'Hrvatska',
      currency: 'EUR',
      standardRate: 25,
      reducedRates: [5, 13],
      zeroRated: true,
      vatNumberFormat: 'HR###########',
      vatNumberExample: 'HR12345678901',
      effectiveFrom: '2025-01-01',
    },
    CY: {
      countryCode: 'CY',
      countryName: 'Cyprus',
      countryNameLocal: 'Κύπρος',
      currency: 'EUR',
      standardRate: 19,
      reducedRates: [5, 9],
      zeroRated: true,
      vatNumberFormat: 'CY########X',
      vatNumberExample: 'CY12345678X',
      effectiveFrom: '2025-01-01',
    },
    CZ: {
      countryCode: 'CZ',
      countryName: 'Czech Republic',
      countryNameLocal: 'Česká republika',
      currency: 'CZK',
      standardRate: 21,
      reducedRates: [12, 15],
      zeroRated: false,
      vatNumberFormat: 'CZ########',
      vatNumberExample: 'CZ12345678',
      effectiveFrom: '2025-01-01',
    },
    DK: {
      countryCode: 'DK',
      countryName: 'Denmark',
      countryNameLocal: 'Danmark',
      currency: 'DKK',
      standardRate: 25,
      reducedRates: [],
      zeroRated: true,
      vatNumberFormat: 'DK########',
      vatNumberExample: 'DK12345678',
      effectiveFrom: '2025-01-01',
    },
    EE: {
      countryCode: 'EE',
      countryName: 'Estonia',
      countryNameLocal: 'Eesti',
      currency: 'EUR',
      standardRate: 22,
      reducedRates: [9],
      zeroRated: true,
      vatNumberFormat: 'EE#########',
      vatNumberExample: 'EE123456789',
      effectiveFrom: '2025-01-01',
    },
    FI: {
      countryCode: 'FI',
      countryName: 'Finland',
      countryNameLocal: 'Suomi',
      currency: 'EUR',
      standardRate: 24,
      reducedRates: [10, 14],
      zeroRated: true,
      vatNumberFormat: 'FI########',
      vatNumberExample: 'FI12345678',
      effectiveFrom: '2025-01-01',
    },
    FR: {
      countryCode: 'FR',
      countryName: 'France',
      countryNameLocal: 'France',
      currency: 'EUR',
      standardRate: 20,
      reducedRates: [5.5, 10],
      superReducedRate: 2.1,
      zeroRated: false,
      vatNumberFormat: 'FR##########',
      vatNumberExample: 'FRXX123456789',
      effectiveFrom: '2025-01-01',
    },
    DE: {
      countryCode: 'DE',
      countryName: 'Germany',
      countryNameLocal: 'Deutschland',
      currency: 'EUR',
      standardRate: 19,
      reducedRates: [7],
      zeroRated: false,
      vatNumberFormat: 'DE#########',
      vatNumberExample: 'DE123456789',
      effectiveFrom: '2025-01-01',
    },
    GR: {
      countryCode: 'GR',
      countryName: 'Greece',
      countryNameLocal: 'Ελλάδα',
      currency: 'EUR',
      standardRate: 24,
      reducedRates: [6, 13],
      zeroRated: false,
      vatNumberFormat: 'EL#########',
      vatNumberExample: 'EL123456789',
      effectiveFrom: '2025-01-01',
    },
    HU: {
      countryCode: 'HU',
      countryName: 'Hungary',
      countryNameLocal: 'Magyarország',
      currency: 'HUF',
      standardRate: 27,
      reducedRates: [5, 18],
      zeroRated: false,
      vatNumberFormat: 'HU########',
      vatNumberExample: 'HU12345678',
      effectiveFrom: '2025-01-01',
    },
    IE: {
      countryCode: 'IE',
      countryName: 'Ireland',
      countryNameLocal: 'Éire',
      currency: 'EUR',
      standardRate: 23,
      reducedRates: [9, 13.5],
      superReducedRate: 4.8,
      parkingRate: 13.5,
      zeroRated: true,
      vatNumberFormat: 'IE#######X',
      vatNumberExample: 'IE1234567X',
      effectiveFrom: '2025-01-01',
    },
    IT: {
      countryCode: 'IT',
      countryName: 'Italy',
      countryNameLocal: 'Italia',
      currency: 'EUR',
      standardRate: 22,
      reducedRates: [5, 10],
      superReducedRate: 4,
      zeroRated: false,
      vatNumberFormat: 'IT###########',
      vatNumberExample: 'IT12345678901',
      effectiveFrom: '2025-01-01',
    },
    LV: {
      countryCode: 'LV',
      countryName: 'Latvia',
      countryNameLocal: 'Latvija',
      currency: 'EUR',
      standardRate: 21,
      reducedRates: [5, 12],
      zeroRated: true,
      vatNumberFormat: 'LV###########',
      vatNumberExample: 'LV12345678901',
      effectiveFrom: '2025-01-01',
    },
    LT: {
      countryCode: 'LT',
      countryName: 'Lithuania',
      countryNameLocal: 'Lietuva',
      currency: 'EUR',
      standardRate: 21,
      reducedRates: [5, 9],
      zeroRated: true,
      vatNumberFormat: 'LT#########',
      vatNumberExample: 'LT123456789',
      effectiveFrom: '2025-01-01',
    },
    LU: {
      countryCode: 'LU',
      countryName: 'Luxembourg',
      countryNameLocal: 'Lëtzebuerg',
      currency: 'EUR',
      standardRate: 17,
      reducedRates: [8, 14],
      superReducedRate: 3,
      parkingRate: 14,
      zeroRated: false,
      vatNumberFormat: 'LU########',
      vatNumberExample: 'LU12345678',
      effectiveFrom: '2025-01-01',
    },
    MT: {
      countryCode: 'MT',
      countryName: 'Malta',
      countryNameLocal: 'Malta',
      currency: 'EUR',
      standardRate: 18,
      reducedRates: [5, 7],
      zeroRated: true,
      vatNumberFormat: 'MT########',
      vatNumberExample: 'MT12345678',
      effectiveFrom: '2025-01-01',
    },
    NL: {
      countryCode: 'NL',
      countryName: 'Netherlands',
      countryNameLocal: 'Nederland',
      currency: 'EUR',
      standardRate: 21,
      reducedRates: [9],
      zeroRated: true,
      vatNumberFormat: 'NL#########B##',
      vatNumberExample: 'NL123456789B01',
      effectiveFrom: '2025-01-01',
    },
    PL: {
      countryCode: 'PL',
      countryName: 'Poland',
      countryNameLocal: 'Polska',
      currency: 'PLN',
      standardRate: 23,
      reducedRates: [5, 8],
      zeroRated: true,
      vatNumberFormat: 'PL##########',
      vatNumberExample: 'PL1234567890',
      effectiveFrom: '2025-01-01',
    },
    PT: {
      countryCode: 'PT',
      countryName: 'Portugal',
      countryNameLocal: 'Portugal',
      currency: 'EUR',
      standardRate: 23,
      reducedRates: [6, 13],
      parkingRate: 13,
      zeroRated: false,
      vatNumberFormat: 'PT#########',
      vatNumberExample: 'PT123456789',
      effectiveFrom: '2025-01-01',
    },
    RO: {
      countryCode: 'RO',
      countryName: 'Romania',
      countryNameLocal: 'România',
      currency: 'RON',
      standardRate: 21,
      reducedRates: [5, 11],
      zeroRated: true,
      vatNumberFormat: 'RO##########',
      vatNumberExample: 'RO1234567890',
      effectiveFrom: '2025-08-01',
    },
    SK: {
      countryCode: 'SK',
      countryName: 'Slovakia',
      countryNameLocal: 'Slovensko',
      currency: 'EUR',
      standardRate: 20,
      reducedRates: [10],
      zeroRated: false,
      vatNumberFormat: 'SK##########',
      vatNumberExample: 'SK1234567890',
      effectiveFrom: '2025-01-01',
    },
    SI: {
      countryCode: 'SI',
      countryName: 'Slovenia',
      countryNameLocal: 'Slovenija',
      currency: 'EUR',
      standardRate: 22,
      reducedRates: [5, 9.5],
      zeroRated: false,
      vatNumberFormat: 'SI########',
      vatNumberExample: 'SI12345678',
      effectiveFrom: '2025-01-01',
    },
    ES: {
      countryCode: 'ES',
      countryName: 'Spain',
      countryNameLocal: 'España',
      currency: 'EUR',
      standardRate: 21,
      reducedRates: [10],
      superReducedRate: 4,
      zeroRated: false,
      vatNumberFormat: 'ES#########',
      vatNumberExample: 'ESX1234567X',
      effectiveFrom: '2025-01-01',
    },
    SE: {
      countryCode: 'SE',
      countryName: 'Sweden',
      countryNameLocal: 'Sverige',
      currency: 'SEK',
      standardRate: 25,
      reducedRates: [6, 12],
      zeroRated: true,
      vatNumberFormat: 'SE############',
      vatNumberExample: 'SE123456789012',
      effectiveFrom: '2025-01-01',
    },
  };

  // OSS threshold for all EU countries (€10,000 for cross-border B2C)
  private readonly OSS_THRESHOLD_EUR = 10000;

  constructor(@Optional() private readonly vatConfigService?: EuVatConfigService) {
    const source = this.vatConfigService ? 'configuration file' : 'hardcoded defaults';
    this.logger.log(`EU VAT Service initialized with 27 member states (source: ${source})`);
  }

  /**
   * Get VAT rates from config service if available, otherwise use hardcoded
   */
  private async getVATRates(): Promise<Record<string, EUCountryVATRates>> {
    if (this.vatConfigService) {
      return (await this.vatConfigService.getAllCountries()) as Record<string, EUCountryVATRates>;
    }
    return this.EU_VAT_RATES;
  }

  /**
   * Get OSS threshold from config service if available
   */
  private async getOSSThreshold(): Promise<number> {
    if (this.vatConfigService) {
      return await this.vatConfigService.getOSSThreshold();
    }
    return this.OSS_THRESHOLD_EUR;
  }

  /**
   * Get configuration version info (if config service available)
   */
  async getConfigVersion(): Promise<{ version: string; effectiveDate: string; lastUpdated: string; source: string } | null> {
    if (this.vatConfigService) {
      const info = await this.vatConfigService.getConfigVersion();
      return { ...info, source: 'configuration file' };
    }
    return {
      version: '2025.1-hardcoded',
      effectiveDate: '2025-01-01',
      lastUpdated: '2025-08-01',
      source: 'hardcoded'
    };
  }

  /**
   * Reload VAT rates from configuration (hot reload support)
   */
  async reloadConfig(): Promise<void> {
    if (this.vatConfigService) {
      await this.vatConfigService.reloadConfig();
      this.logger.log('EU VAT rates reloaded from configuration');
    } else {
      this.logger.warn('Cannot reload - using hardcoded rates');
    }
  }

  /**
   * Get all EU member states with VAT rates
   */
  getAllCountries(): EUCountryVATRates[] {
    return Object.values(this.getVATRates());
  }

  /**
   * Get VAT rates for a specific country
   */
  async getCountryRates(countryCode: string): Promise<EUCountryVATRates> {
    const upperCode = countryCode.toUpperCase();
    const vatRates = await this.getVATRates();
    const country = vatRates[upperCode];
    if (!country) {
      throw new HttpException(
        `Country code ${countryCode} is not a valid EU member state`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return country;
  }

  /**
   * Calculate VAT for a specific EU country
   */
  async calculateVAT(
    countryCode: string,
    amount: number,
    rateType: 'standard' | 'reduced' | 'super_reduced' | 'parking' | 'zero' = 'standard',
    reducedRateIndex: number = 0,
    isGross: boolean = false,
  ): Promise<EUVATCalculation> {
    const country = await this.getCountryRates(countryCode);
    let vatRate: number;

    switch (rateType) {
      case 'standard':
        vatRate = country.standardRate;
        break;
      case 'reduced':
        if (country.reducedRates.length === 0) {
          throw new HttpException(
            `${country.countryName} does not have reduced VAT rates`,
            HttpStatus.BAD_REQUEST,
          );
        }
        vatRate = country.reducedRates[reducedRateIndex] || country.reducedRates[0];
        break;
      case 'super_reduced':
        if (!country.superReducedRate) {
          throw new HttpException(
            `${country.countryName} does not have a super-reduced VAT rate`,
            HttpStatus.BAD_REQUEST,
          );
        }
        vatRate = country.superReducedRate;
        break;
      case 'parking':
        if (!country.parkingRate) {
          throw new HttpException(
            `${country.countryName} does not have a parking VAT rate`,
            HttpStatus.BAD_REQUEST,
          );
        }
        vatRate = country.parkingRate;
        break;
      case 'zero':
        if (!country.zeroRated) {
          throw new HttpException(
            `${country.countryName} does not allow zero-rated supplies`,
            HttpStatus.BAD_REQUEST,
          );
        }
        vatRate = 0;
        break;
      default:
        vatRate = country.standardRate;
    }

    let netAmount: number;
    let vatAmount: number;
    let grossAmount: number;

    if (isGross) {
      grossAmount = amount;
      netAmount = amount / (1 + vatRate / 100);
      vatAmount = grossAmount - netAmount;
    } else {
      netAmount = amount;
      vatAmount = netAmount * (vatRate / 100);
      grossAmount = netAmount + vatAmount;
    }

    return {
      countryCode: country.countryCode,
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      currency: country.currency,
      rateType,
    };
  }

  /**
   * Validate EU VAT number format
   */
  async validateVATNumberFormat(vatNumber: string): Promise<{ valid: boolean; countryCode: string; error?: string }> {
    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();

    if (cleaned.length < 4) {
      return { valid: false, countryCode: '', error: 'VAT number too short' };
    }

    // Handle Greece special case (EL instead of GR)
    let countryCode = cleaned.substring(0, 2);
    if (countryCode === 'EL') {
      countryCode = 'GR';
    }

    const vatRates = await this.getVATRates();
    const country = vatRates[countryCode];
    if (!country) {
      return { valid: false, countryCode, error: `${countryCode} is not a valid EU country code` };
    }

    // Basic format validation based on country patterns
    const patterns: Record<string, RegExp> = {
      AT: /^ATU\d{8}$/,
      BE: /^BE0\d{9}$/,
      BG: /^BG\d{9,10}$/,
      HR: /^HR\d{11}$/,
      CY: /^CY\d{8}[A-Z]$/,
      CZ: /^CZ\d{8,10}$/,
      DK: /^DK\d{8}$/,
      EE: /^EE\d{9}$/,
      FI: /^FI\d{8}$/,
      FR: /^FR[A-Z0-9]{2}\d{9}$/,
      DE: /^DE\d{9}$/,
      GR: /^EL\d{9}$/,
      HU: /^HU\d{8}$/,
      IE: /^IE\d{7}[A-Z]{1,2}$/,
      IT: /^IT\d{11}$/,
      LV: /^LV\d{11}$/,
      LT: /^LT(\d{9}|\d{12})$/,
      LU: /^LU\d{8}$/,
      MT: /^MT\d{8}$/,
      NL: /^NL\d{9}B\d{2}$/,
      PL: /^PL\d{10}$/,
      PT: /^PT\d{9}$/,
      RO: /^RO\d{2,10}$/,
      SK: /^SK\d{10}$/,
      SI: /^SI\d{8}$/,
      ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
      SE: /^SE\d{12}$/,
    };

    const pattern = patterns[countryCode];
    if (pattern && !pattern.test(cleaned)) {
      return {
        valid: false,
        countryCode,
        error: `Invalid format. Expected: ${country.vatNumberExample}`,
      };
    }

    return { valid: true, countryCode };
  }

  /**
   * Validate VAT number against EU VIES system
   */
  async validateVIES(vatNumber: string): Promise<VIESValidationResult> {
    const formatCheck = await this.validateVATNumberFormat(vatNumber);
    if (!formatCheck.valid) {
      return {
        valid: false,
        countryCode: formatCheck.countryCode,
        vatNumber,
        requestDate: new Date().toISOString(),
        error: formatCheck.error,
      };
    }

    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
    let countryCode = cleaned.substring(0, 2);
    if (countryCode === 'EL') {
      countryCode = 'GR';
    }
    const numberPart = cleaned.substring(2);

    try {
      // VIES SOAP request
      const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:checkVat>
         <urn:countryCode>${countryCode === 'GR' ? 'EL' : countryCode}</urn:countryCode>
         <urn:vatNumber>${numberPart}</urn:vatNumber>
      </urn:checkVat>
   </soapenv:Body>
</soapenv:Envelope>`;

      this.logger.debug(`VIES validation request for ${vatNumber}`);

      // For now, return mock response (production would make actual SOAP call)
      // In production, use: https://ec.europa.eu/taxation_customs/vies/services/checkVatService
      return {
        valid: true,
        countryCode,
        vatNumber: cleaned,
        name: 'VIES Validation - Production requires SOAP call',
        address: 'Address from VIES',
        requestDate: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`VIES validation failed for ${vatNumber}:`, error);
      return {
        valid: false,
        countryCode,
        vatNumber: cleaned,
        requestDate: new Date().toISOString(),
        error: 'VIES service unavailable. Please try again later.',
      };
    }
  }

  /**
   * Determine VAT treatment for intra-community transaction
   */
  async determineIntraCommunityVAT(
    sellerCountry: string,
    sellerVatNumber: string,
    buyerCountry: string,
    buyerVatNumber: string,
    isB2B: boolean,
    isService: boolean,
  ): Promise<IntraCommunityTransaction> {
    const sellerCountryUpper = sellerCountry.toUpperCase();
    const buyerCountryUpper = buyerCountry.toUpperCase();

    // Same country - normal domestic VAT
    if (sellerCountryUpper === buyerCountryUpper) {
      const country = await this.getCountryRates(sellerCountryUpper);
      return {
        sellerCountry: sellerCountryUpper,
        sellerVatNumber,
        buyerCountry: buyerCountryUpper,
        buyerVatNumber,
        isReverseCharge: false,
        placeOfSupply: sellerCountryUpper,
        applicableVATRate: country.standardRate,
        reason: 'Domestic transaction - seller charges local VAT',
      };
    }

    // Cross-border B2B with valid VAT numbers
    if (isB2B && sellerVatNumber && buyerVatNumber) {
      if (isService) {
        // B2B Services - reverse charge at buyer location
        return {
          sellerCountry: sellerCountryUpper,
          sellerVatNumber,
          buyerCountry: buyerCountryUpper,
          buyerVatNumber,
          isReverseCharge: true,
          placeOfSupply: buyerCountryUpper,
          applicableVATRate: 0,
          reason: 'B2B cross-border service - Art. 44 VAT Directive. Buyer accounts for VAT (reverse charge)',
        };
      } else {
        // B2B Goods - zero-rated intra-community supply
        return {
          sellerCountry: sellerCountryUpper,
          sellerVatNumber,
          buyerCountry: buyerCountryUpper,
          buyerVatNumber,
          isReverseCharge: true,
          placeOfSupply: buyerCountryUpper,
          applicableVATRate: 0,
          reason: 'Intra-community supply of goods - Art. 138 VAT Directive. Zero-rated for seller, buyer accounts for VAT',
        };
      }
    }

    // Cross-border B2C (or B2B without valid VAT)
    if (!isB2B || !buyerVatNumber) {
      const buyerRates = await this.getCountryRates(buyerCountryUpper);
      return {
        sellerCountry: sellerCountryUpper,
        sellerVatNumber,
        buyerCountry: buyerCountryUpper,
        buyerVatNumber: buyerVatNumber || '',
        isReverseCharge: false,
        placeOfSupply: buyerCountryUpper,
        applicableVATRate: buyerRates.standardRate,
        reason: 'B2C cross-border - VAT at destination country rate (OSS may apply)',
      };
    }

    // Default
    const sellerRates = await this.getCountryRates(sellerCountryUpper);
    return {
      sellerCountry: sellerCountryUpper,
      sellerVatNumber,
      buyerCountry: buyerCountryUpper,
      buyerVatNumber,
      isReverseCharge: false,
      placeOfSupply: sellerCountryUpper,
      applicableVATRate: sellerRates.standardRate,
      reason: 'Standard VAT at seller location',
    };
  }

  /**
   * Check OSS (One-Stop-Shop) registration requirements
   */
  async checkOSSRequirement(
    homeCountry: string,
    salesByCountry: Record<string, number>,
  ): Promise<{ requiresOSS: boolean; countries: OSSRegistration[] }> {
    const results: OSSRegistration[] = [];
    let requiresOSS = false;

    const ossThreshold = await this.getOSSThreshold();
    const vatRates = await this.getVATRates();

    for (const [countryCode, salesAmount] of Object.entries(salesByCountry)) {
      if (countryCode.toUpperCase() === homeCountry.toUpperCase()) {
        continue; // Skip home country
      }

      const country = vatRates[countryCode.toUpperCase()];
      if (!country) continue;

      const thresholdExceeded = salesAmount > ossThreshold;
      if (thresholdExceeded) {
        requiresOSS = true;
      }

      results.push({
        countryCode: country.countryCode,
        isRegistered: false, // Would check against actual registration
        threshold: ossThreshold,
        currency: 'EUR',
        salesAmount,
        thresholdExceeded,
      });
    }

    return { requiresOSS, countries: results };
  }

  /**
   * Get VAT rates comparison across EU
   */
  getVATRatesComparison(): {
    standardRates: { countryCode: string; countryName: string; rate: number }[];
    lowestStandard: EUCountryVATRates;
    highestStandard: EUCountryVATRates;
    averageStandard: number;
  } {
    const countries = Object.values(this.getVATRates());
    const standardRates = countries
      .map((c) => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        rate: c.standardRate,
      }))
      .sort((a, b) => a.rate - b.rate);

    const lowest = countries.reduce((min, c) => (c.standardRate < min.standardRate ? c : min));
    const highest = countries.reduce((max, c) => (c.standardRate > max.standardRate ? c : max));
    const average = countries.reduce((sum, c) => sum + c.standardRate, 0) / countries.length;

    return {
      standardRates,
      lowestStandard: lowest,
      highestStandard: highest,
      averageStandard: Math.round(average * 100) / 100,
    };
  }

  /**
   * Multi-currency VAT calculation with conversion
   */
  async calculateMultiCurrencyVAT(
    countryCode: string,
    amount: number,
    sourceCurrency: string,
    exchangeRateToCountryCurrency: number,
    rateType: 'standard' | 'reduced' | 'super_reduced' | 'parking' | 'zero' = 'standard',
  ): Promise<EUVATCalculation & { originalAmount: number; originalCurrency: string }> {
    const country = await this.getCountryRates(countryCode);

    // Convert to country currency
    const convertedAmount = amount * exchangeRateToCountryCurrency;

    // Calculate VAT in country currency
    const calculation = await this.calculateVAT(countryCode, convertedAmount, rateType);

    return {
      ...calculation,
      originalAmount: amount,
      originalCurrency: sourceCurrency,
      exchangeRate: exchangeRateToCountryCurrency,
      amountInEUR:
        country.currency === 'EUR' ? calculation.grossAmount : calculation.grossAmount / exchangeRateToCountryCurrency,
    };
  }

  /**
   * Get countries grouped by currency
   */
  getCountriesByCurrency(): Record<string, string[]> {
    const byCurrency: Record<string, string[]> = {};

    for (const country of Object.values(this.getVATRates())) {
      if (!byCurrency[country.currency]) {
        byCurrency[country.currency] = [];
      }
      byCurrency[country.currency].push(country.countryCode);
    }

    return byCurrency;
  }

  /**
   * Get Eurozone countries (for simplified invoicing)
   */
  getEurozoneCountries(): EUCountryVATRates[] {
    return Object.values(this.getVATRates()).filter((c) => c.currency === 'EUR');
  }

  /**
   * Get non-Eurozone EU countries
   */
  getNonEurozoneCountries(): EUCountryVATRates[] {
    return Object.values(this.getVATRates()).filter((c) => c.currency !== 'EUR');
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

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
  notes?: string;
}

export interface VATRatesConfig {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  source: string;
  notes: Record<string, string>;
  ossThresholdEur: number;
  countries: Record<string, EUCountryVATRates>;
}

@Injectable()
export class EuVatConfigService implements OnModuleInit {
  private readonly logger = new Logger(EuVatConfigService.name);
  private config: VATRatesConfig;
  private readonly configPath: string;

  constructor(private readonly configService: ConfigService) {
    // Allow override via environment variable for custom deployments
    this.configPath =
      this.configService.get<string>('EU_VAT_CONFIG_PATH') ||
      path.join(__dirname, 'eu-vat-rates.config.json');
  }

  async onModuleInit() {
    await this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      this.logger.log(
        `EU VAT rates config loaded: v${this.config.version} (${Object.keys(this.config.countries).length} countries)`,
      );
    } catch (error) {
      this.logger.error(`Failed to load EU VAT config from ${this.configPath}:`, error);
      throw new Error(`EU VAT configuration file not found or invalid: ${this.configPath}`);
    }
  }

  /**
   * Reload configuration at runtime (for hot updates)
   */
  async reloadConfig(): Promise<void> {
    this.logger.log('Reloading EU VAT configuration...');
    await this.loadConfig();
  }

  /**
   * Get all EU countries VAT rates
   */
  getAllCountries(): Record<string, EUCountryVATRates> {
    return this.config.countries;
  }

  /**
   * Get VAT rates for a specific country
   */
  getCountryRates(countryCode: string): EUCountryVATRates | undefined {
    return this.config.countries[countryCode.toUpperCase()];
  }

  /**
   * Get the OSS threshold in EUR
   */
  getOSSThreshold(): number {
    return this.config.ossThresholdEur;
  }

  /**
   * Get configuration version info
   */
  getConfigVersion(): { version: string; effectiveDate: string; lastUpdated: string } {
    return {
      version: this.config.version,
      effectiveDate: this.config.effectiveDate,
      lastUpdated: this.config.lastUpdated,
    };
  }

  /**
   * Check if a country code is valid EU member
   */
  isValidEUCountry(countryCode: string): boolean {
    return !!this.config.countries[countryCode.toUpperCase()];
  }

  /**
   * Get country-specific notes (e.g., rate change info)
   */
  getCountryNotes(countryCode: string): string | undefined {
    const country = this.config.countries[countryCode.toUpperCase()];
    return country?.notes || this.config.notes[countryCode.toUpperCase()];
  }
}

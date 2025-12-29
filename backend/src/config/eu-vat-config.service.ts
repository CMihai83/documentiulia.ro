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
    try {
      await this.loadConfig();
    } catch (error) {
      this.logger.warn('EU VAT config failed to load, using defaults');
      // Set default config
      this.config = {
        version: 'default',
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        source: 'default',
        countries: {},
        euWideRules: {
          vatThreshold: 10000,
          smallEntrepreneurRules: true,
          digitalServicesRules: true
        },
        ossThresholdEur: 10000
      };
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      this.logger.log(`Loading EU VAT config from: ${this.configPath}`);
      this.logger.log(`__dirname: ${__dirname}`);
      this.logger.log(`File exists: ${fs.existsSync(this.configPath)}`);

      if (!fs.existsSync(this.configPath)) {
        this.logger.warn(`EU VAT config file not found at ${this.configPath}, using default config`);
        // Use a minimal default config
        this.config = {
          version: 'default',
          effectiveDate: '2025-01-01',
          lastUpdated: new Date().toISOString(),
          source: 'Default fallback',
          countries: {},
          euWideRules: {
            vatThreshold: 10000,
            smallEntrepreneurRules: true,
            digitalServicesRules: true
          }
        };
        return;
      }

      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      this.logger.log(
        `EU VAT rates config loaded: v${this.config.version} (${Object.keys(this.config.countries).length} countries)`,
      );
    } catch (error) {
      this.logger.error(`Failed to load EU VAT config from ${this.configPath}:`, error);
      // Don't throw error, use default config
      this.config = {
        version: 'error-fallback',
        effectiveDate: '2025-01-01',
        lastUpdated: new Date().toISOString(),
        source: 'Error fallback',
        countries: {},
        euWideRules: {
          vatThreshold: 10000,
          smallEntrepreneurRules: true,
          digitalServicesRules: true
        }
      };
    }
  }

  /**
   * Ensure config is loaded (lazy loading)
   */
  private async ensureConfigLoaded(): Promise<void> {
    if (!this.config) {
      try {
        await this.loadConfig();
      } catch (error) {
        // Config already set in onModuleInit if loadConfig fails
        this.logger.debug('Config already set to defaults');
      }
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
  async getAllCountries(): Promise<Record<string, EUCountryVATRates>> {
    await this.ensureConfigLoaded();
    return this.config?.countries || {};
  }

  /**
   * Get VAT rates for a specific country
   */
  async getCountryRates(countryCode: string): Promise<EUCountryVATRates | undefined> {
    await this.ensureConfigLoaded();
    return this.config?.countries?.[countryCode.toUpperCase()];
  }

  /**
   * Get the OSS threshold in EUR
   */
  async getOSSThreshold(): Promise<number> {
    await this.ensureConfigLoaded();
    return this.config?.ossThresholdEur || 10000;
  }

  /**
   * Get configuration version info
   */
  async getConfigVersion(): Promise<{ version: string; effectiveDate: string; lastUpdated: string }> {
    await this.ensureConfigLoaded();
    return {
      version: this.config?.version || 'unknown',
      effectiveDate: this.config?.effectiveDate || '2025-01-01',
      lastUpdated: this.config?.lastUpdated || new Date().toISOString(),
    };
  }

  /**
   * Check if a country code is valid EU member
   */
  async isValidEUCountry(countryCode: string): Promise<boolean> {
    await this.ensureConfigLoaded();
    return !!this.config?.countries?.[countryCode.toUpperCase()];
  }

  /**
   * Get country-specific notes (e.g., rate change info)
   */
  async getCountryNotes(countryCode: string): Promise<string | undefined> {
    await this.ensureConfigLoaded();
    const country = this.config?.countries?.[countryCode.toUpperCase()];
    return country?.notes || this.config?.notes?.[countryCode.toUpperCase()];
  }
}

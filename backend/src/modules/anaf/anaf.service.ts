/**
 * ANAF Integration Service
 * SPV e-Factura submission (B2B mid-2026)
 * D406 monthly XML validation per Order 1783/2021
 * Pilot reconciliation Sept 2025 - Aug 2026 with 6-month grace
 * PDF/XML upload <500MB
 *
 * @author DocumentIulia Team
 * @version 1.0.0
 * @since 2025-12-05
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ANAF API Types
interface AnafAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface EFacturaSubmissionResult {
  indexIncarcare: string;
  dateResponse: string;
  executionStatus: number;
  message: string;
}

interface D406ValidationResult {
  valid: boolean;
  errors: AnafValidationError[];
  warnings: AnafValidationWarning[];
  schema: string;
  period: string;
}

interface AnafValidationError {
  code: string;
  message: string;
  location: string;
  severity: 'ERROR' | 'FATAL';
}

interface AnafValidationWarning {
  code: string;
  message: string;
  location: string;
}

interface PilotReconciliationStatus {
  inPilot: boolean;
  startDate: string;
  endDate: string;
  graceEndDate: string;
  companyType: 'small' | 'non-resident' | 'quarterly' | 'exempt';
  mandatory: boolean;
}

// Constants per Order 1783/2021
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const PILOT_START = new Date('2025-09-01');
const PILOT_END = new Date('2026-08-31');
const GRACE_PERIOD_MONTHS = 6;

@Injectable()
export class AnafService {
  private readonly logger = new Logger(AnafService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // ANAF API endpoints
  private readonly ANAF_API_URL = 'https://api.anaf.ro';
  private readonly SPV_URL = 'https://www.anaf.ro/spv';
  private readonly EFACTURA_URL = 'https://api.anaf.ro/prod/FCTEL/rest';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth 2.0 Authentication with ANAF SPV
   * Required for e-Factura submission
   */
  async authenticate(): Promise<AnafAuthResponse> {
    const clientId = this.configService.get<string>('ANAF_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ANAF_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('ANAF_REDIRECT_URI');

    try {
      const response = await firstValueFrom(
        this.httpService.post<AnafAuthResponse>(
          `${this.ANAF_API_URL}/oauth/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId || '',
            client_secret: clientSecret || '',
            scope: 'efactura saft d406',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      this.logger.log('ANAF OAuth authentication successful');
      return response.data;
    } catch (error) {
      this.logger.error('ANAF OAuth authentication failed', error);
      throw new HttpException(
        'ANAF authentication failed. Check credentials.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Ensure valid access token
   */
  private async ensureAuthenticated(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      await this.authenticate();
    }
    return this.accessToken!;
  }

  /**
   * Submit e-Factura to ANAF SPV
   * POST /api/anaf/submit-efactura
   *
   * B2B submission mandatory mid-2026
   * Supports PDF/XML <500MB
   */
  async submitEFactura(
    xmlContent: string,
    cui: string,
    standard: 'FACT1' | 'FCN' = 'FACT1',
  ): Promise<EFacturaSubmissionResult> {
    const token = await this.ensureAuthenticated();

    // Validate file size
    const contentSize = Buffer.byteLength(xmlContent, 'utf8');
    if (contentSize > MAX_FILE_SIZE) {
      throw new HttpException(
        `File size ${(contentSize / 1024 / 1024).toFixed(2)}MB exceeds maximum 500MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Pre-validate XML before submission
    const validation = await this.validateD406(xmlContent, 'EFACTURA');
    if (!validation.valid && validation.errors.some(e => e.severity === 'FATAL')) {
      throw new HttpException(
        {
          message: 'e-Factura validation failed',
          errors: validation.errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<EFacturaSubmissionResult>(
          `${this.EFACTURA_URL}/upload`,
          xmlContent,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/xml',
              'X-CUI': cui,
              'X-Standard': standard,
            },
            params: {
              standard,
              cif: cui,
            },
          },
        ),
      );

      this.logger.log(`e-Factura submitted successfully: ${response.data.indexIncarcare}`);
      return response.data;
    } catch (error) {
      this.logger.error('e-Factura submission failed', error);
      throw new HttpException(
        `e-Factura submission failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate D406 XML per Order 1783/2021
   * POST /api/anaf/validate-d406
   *
   * Monthly XML for small/non-residents from Jan 2025
   * Quarterly for others
   */
  async validateD406(
    xmlContent: string,
    schema: 'SAF-T' | 'EFACTURA' | 'D406' = 'D406',
  ): Promise<D406ValidationResult> {
    const errors: AnafValidationError[] = [];
    const warnings: AnafValidationWarning[] = [];

    // Basic XML structure validation
    if (!xmlContent.includes('<?xml')) {
      errors.push({
        code: 'XML_HEADER_MISSING',
        message: 'XML declaration missing',
        location: 'line 1',
        severity: 'FATAL',
      });
    }

    // Schema-specific validation
    switch (schema) {
      case 'SAF-T':
        this.validateSAFTSchema(xmlContent, errors, warnings);
        break;
      case 'EFACTURA':
        this.validateEFacturaSchema(xmlContent, errors, warnings);
        break;
      case 'D406':
        this.validateD406Schema(xmlContent, errors, warnings);
        break;
    }

    // Validate against ANAF schema if online
    try {
      const token = await this.ensureAuthenticated();
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.ANAF_API_URL}/validate/${schema.toLowerCase()}`,
          xmlContent,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/xml',
            },
          },
        ),
      );

      // Merge ANAF validation results
      if (response.data.errors) {
        errors.push(...response.data.errors);
      }
      if (response.data.warnings) {
        warnings.push(...response.data.warnings);
      }
    } catch (error) {
      warnings.push({
        code: 'ANAF_OFFLINE',
        message: 'ANAF validation service unavailable, using local validation only',
        location: 'system',
      });
    }

    const period = this.extractPeriodFromXml(xmlContent);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema: `OPANAF_1783_2021_${schema}`, // Correct year reference
      period,
    };
  }

  /**
   * SAF-T schema validation per Order 1783/2021
   */
  private validateSAFTSchema(
    xml: string,
    errors: AnafValidationError[],
    warnings: AnafValidationWarning[],
  ): void {
    // Required elements per Order 1783/2021
    const requiredElements = [
      'Header',
      'CompanyID',
      'TaxRegistrationNumber',
      'FiscalYear',
      'StartDate',
      'EndDate',
      'CurrencyCode',
      'GeneralLedgerEntries',
    ];

    for (const element of requiredElements) {
      if (!xml.includes(`<${element}`) && !xml.includes(`<n1:${element}`)) {
        errors.push({
          code: `MISSING_${element.toUpperCase()}`,
          message: `Required element <${element}> missing per OPANAF 1783/2021`,
          location: 'document',
          severity: 'ERROR',
        });
      }
    }

    // Check for RON currency
    if (!xml.includes('RON') && !xml.includes('CurrencyCode')) {
      warnings.push({
        code: 'CURRENCY_WARNING',
        message: 'CurrencyCode should be RON for Romanian fiscal reports',
        location: 'Header/CurrencyCode',
      });
    }
  }

  /**
   * e-Factura schema validation
   */
  private validateEFacturaSchema(
    xml: string,
    errors: AnafValidationError[],
    warnings: AnafValidationWarning[],
  ): void {
    // UBL 2.1 required elements
    const requiredElements = [
      'Invoice',
      'ID',
      'IssueDate',
      'InvoiceTypeCode',
      'AccountingSupplierParty',
      'AccountingCustomerParty',
      'LegalMonetaryTotal',
      'InvoiceLine',
    ];

    for (const element of requiredElements) {
      if (!xml.includes(`<cbc:${element}`) && !xml.includes(`<cac:${element}`) && !xml.includes(`<${element}`)) {
        errors.push({
          code: `MISSING_${element.toUpperCase()}`,
          message: `Required UBL 2.1 element <${element}> missing`,
          location: 'Invoice',
          severity: 'ERROR',
        });
      }
    }

    // VAT validation per Law 141/2025
    const validVatRates = ['21', '11', '5', '0'];
    const vatMatch = xml.match(/Percent[>"'](\d+)/g);
    if (vatMatch) {
      vatMatch.forEach((match) => {
        const rate = match.replace(/\D/g, '');
        if (!validVatRates.includes(rate)) {
          errors.push({
            code: 'INVALID_VAT_RATE',
            message: `VAT rate ${rate}% invalid per Law 141/2025. Valid rates: 21%, 11%, 5%, 0%`,
            location: 'TaxTotal/TaxSubtotal/Percent',
            severity: 'ERROR',
          });
        }
      });
    }
  }

  /**
   * D406 declaration validation
   */
  private validateD406Schema(
    xml: string,
    errors: AnafValidationError[],
    warnings: AnafValidationWarning[],
  ): void {
    // D406 specific requirements
    if (!xml.includes('d406') && !xml.includes('D406')) {
      warnings.push({
        code: 'D406_NAMESPACE',
        message: 'D406 namespace not detected, ensure correct schema',
        location: 'root',
      });
    }
  }

  /**
   * Extract period from XML
   */
  private extractPeriodFromXml(xml: string): string {
    const periodMatch = xml.match(/<FiscalYear>(\d{4})<\/FiscalYear>/);
    const monthMatch = xml.match(/<StartDate>(\d{4}-\d{2})/);

    if (monthMatch) {
      return monthMatch[1];
    }
    if (periodMatch) {
      return periodMatch[1];
    }
    return 'Unknown';
  }

  /**
   * Check pilot reconciliation status
   * Sept 2025 - Aug 2026 with 6-month grace period
   */
  checkPilotStatus(cui: string, companyType: 'small' | 'non-resident' | 'quarterly' | 'exempt'): PilotReconciliationStatus {
    const now = new Date();
    const graceEnd = new Date(PILOT_END);
    graceEnd.setMonth(graceEnd.getMonth() + GRACE_PERIOD_MONTHS);

    const inPilot = now >= PILOT_START && now <= PILOT_END;
    const inGrace = now > PILOT_END && now <= graceEnd;

    // Mandatory timeline per ANAF:
    // - Small/Non-residents: Monthly from Jan 2025
    // - Others: Quarterly, pilot Sept 2025
    let mandatory = false;
    if (companyType === 'small' || companyType === 'non-resident') {
      mandatory = now >= new Date('2025-01-01');
    } else if (companyType === 'quarterly') {
      mandatory = now >= PILOT_END; // After pilot period
    }

    return {
      inPilot,
      startDate: PILOT_START.toISOString(),
      endDate: PILOT_END.toISOString(),
      graceEndDate: graceEnd.toISOString(),
      companyType,
      mandatory,
    };
  }

  /**
   * Upload PDF/XML to ANAF
   * Supports files <500MB
   */
  async uploadDocument(
    filePath: string,
    documentType: 'efactura' | 'saft' | 'd406',
    cui: string,
  ): Promise<{ uploadId: string; status: string }> {
    const token = await this.ensureAuthenticated();

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new HttpException(
        `File size ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds maximum 500MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const fileContent = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    const fileName = path.basename(filePath);
    const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/xml';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.ANAF_API_URL}/${documentType}/upload`,
          fileContent,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': contentType,
              'X-CUI': cui,
              'X-File-Hash': fileHash,
              'X-File-Name': fileName,
            },
          },
        ),
      );

      this.logger.log(`Document uploaded: ${response.data.uploadId}`);
      return {
        uploadId: response.data.uploadId || fileHash.substring(0, 16),
        status: 'uploaded',
      };
    } catch (error) {
      this.logger.error('Document upload failed', error);
      throw new HttpException(
        `Upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get submission status from ANAF
   */
  async getSubmissionStatus(indexIncarcare: string): Promise<{ status: string; details: object }> {
    const token = await this.ensureAuthenticated();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.EFACTURA_URL}/stareMesaj`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            id_incarcare: indexIncarcare,
          },
        }),
      );

      return {
        status: response.data.stare,
        details: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get submission status', error);
      throw new HttpException(
        `Failed to get status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

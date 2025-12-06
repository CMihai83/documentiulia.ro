/**
 * ANAF SPV (Spațiul Privat Virtual) API Service
 * Real integration with Romanian National Agency for Fiscal Administration
 *
 * Documentation: https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/informatii_publice/api
 *
 * Endpoints:
 * - Production: https://api.anaf.ro/prod/FCTEL/rest
 * - Test: https://api.anaf.ro/test/FCTEL/rest
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EfacturaStatus } from '@prisma/client';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface AnafUploadResponse {
  dateResponse: string;
  ExecutionStatus: number;
  index_incarcare?: string;
  Errors?: Array<{
    errorMessage: string;
  }>;
}

interface AnafStatusResponse {
  dateResponse: string;
  ExecutionStatus: number;
  stare: 'in procesare' | 'ok' | 'nok' | 'XML cu erori nepreluat';
  id_descarcare?: string;
  Errors?: Array<{
    errorMessage: string;
  }>;
}

interface AnafDownloadResponse {
  dateResponse: string;
  ExecutionStatus: number;
  mesaj?: string;
  Errors?: Array<{
    errorMessage: string;
  }>;
}

interface MessageListItem {
  data_creare: string;
  cif: string;
  id_solicitare: string;
  detalii: string;
  tip: string;
  id: string;
}

interface AnafMessagesResponse {
  dateResponse: string;
  ExecutionStatus: number;
  mesaje?: MessageListItem[];
  titlu?: string;
  Errors?: Array<{
    errorMessage: string;
  }>;
}

@Injectable()
export class AnafSpvService {
  private readonly logger = new Logger(AnafSpvService.name);
  private readonly baseUrl: string;
  private readonly isProduction: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.isProduction = this.configService.get('ANAF_ENV') === 'production';
    this.baseUrl = this.isProduction
      ? 'https://api.anaf.ro/prod/FCTEL/rest'
      : 'https://api.anaf.ro/test/FCTEL/rest';
  }

  /**
   * Create HTTPS agent with client certificate authentication
   */
  private async createHttpsAgent(companyId: string): Promise<https.Agent> {
    const config = await this.prisma.efacturaConfig.findUnique({
      where: { companyId },
    });

    if (!config?.certificateFile || !config?.certificatePassword) {
      throw new BadRequestException(
        'Certificate not configured. Please upload your ANAF digital certificate.',
      );
    }

    const certPath = path.resolve(config.certificateFile);

    if (!fs.existsSync(certPath)) {
      throw new BadRequestException(
        'Certificate file not found. Please re-upload your certificate.',
      );
    }

    const pfxBuffer = fs.readFileSync(certPath);
    const passphrase = this.decryptPassword(config.certificatePassword);

    return new https.Agent({
      pfx: pfxBuffer,
      passphrase,
      rejectUnauthorized: true,
    });
  }

  /**
   * Decrypt stored certificate password
   */
  private decryptPassword(encryptedPassword: string): string {
    const key = this.configService.get('ENCRYPTION_KEY');
    if (!key) {
      return encryptedPassword; // Fallback if no encryption configured
    }

    try {
      const [ivHex, encrypted] = encryptedPassword.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key, 'hex'),
        iv,
      );
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encryptedPassword;
    }
  }

  /**
   * Encrypt password for storage
   */
  encryptPassword(password: string): string {
    const key = this.configService.get('ENCRYPTION_KEY');
    if (!key) {
      return password;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv,
    );
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Upload e-Factura XML to ANAF SPV
   * POST /upload?standard=UBL&cif={cif}
   */
  async uploadInvoice(
    companyId: string,
    invoiceId: string,
    xml: string,
    cif: string,
  ): Promise<{ uploadId: string; message: string }> {
    this.logger.log(`Uploading invoice ${invoiceId} for CIF ${cif}`);

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/upload?standard=UBL&cif=${cif}`;

      const response = await this.makeRequest<AnafUploadResponse>(
        url,
        'POST',
        xml,
        agent,
        {
          'Content-Type': 'text/plain',
        },
      );

      if (response.ExecutionStatus === 0 && response.index_incarcare) {
        // Update invoice with upload ID
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            efacturaStatus: EfacturaStatus.PENDING,
            efacturaUploadId: response.index_incarcare,
            efacturaSentAt: new Date(),
          },
        });

        this.logger.log(
          `Invoice uploaded successfully. Upload ID: ${response.index_incarcare}`,
        );

        return {
          uploadId: response.index_incarcare,
          message: 'Factura a fost încărcată cu succes în SPV ANAF',
        };
      } else {
        const errorMsg =
          response.Errors?.map((e) => e.errorMessage).join('; ') ||
          'Eroare necunoscută la încărcare';

        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            efacturaStatus: EfacturaStatus.ERROR,
            efacturaXml: xml,
          },
        });

        throw new BadRequestException(errorMsg);
      }
    } catch (error) {
      this.logger.error(`Upload failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Check upload status
   * GET /stareMesaj?id_incarcare={upload_id}
   */
  async checkStatus(
    companyId: string,
    uploadId: string,
  ): Promise<{
    status: EfacturaStatus;
    downloadId?: string;
    message: string;
  }> {
    this.logger.log(`Checking status for upload ${uploadId}`);

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/stareMesaj?id_incarcare=${uploadId}`;

      const response = await this.makeRequest<AnafStatusResponse>(
        url,
        'GET',
        null,
        agent,
      );

      let status: EfacturaStatus;
      let message: string;

      switch (response.stare) {
        case 'in procesare':
          status = EfacturaStatus.PROCESSING;
          message = 'Factura este în procesare la ANAF';
          break;
        case 'ok':
          status = EfacturaStatus.VALIDATED;
          message = 'Factura a fost validată de ANAF';
          break;
        case 'nok':
        case 'XML cu erori nepreluat':
          status = EfacturaStatus.REJECTED;
          message =
            response.Errors?.map((e) => e.errorMessage).join('; ') ||
            'Factura a fost respinsă de ANAF';
          break;
        default:
          status = EfacturaStatus.PENDING;
          message = 'Status necunoscut';
      }

      // Update invoice status
      const invoice = await this.prisma.invoice.findFirst({
        where: { efacturaUploadId: uploadId },
      });

      if (invoice) {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            efacturaStatus: status,
            efacturaIndexId: response.id_descarcare || null,
          },
        });
      }

      return {
        status,
        downloadId: response.id_descarcare,
        message,
      };
    } catch (error) {
      this.logger.error(`Status check failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Download response/receipt from ANAF
   * GET /descarcare?id={download_id}
   */
  async downloadResponse(
    companyId: string,
    downloadId: string,
  ): Promise<{ content: string; type: string }> {
    this.logger.log(`Downloading response ${downloadId}`);

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/descarcare?id=${downloadId}`;

      const response = await this.makeRequest<string>(url, 'GET', null, agent);

      return {
        content: response,
        type: 'application/zip', // ANAF returns ZIP with XML
      };
    } catch (error) {
      this.logger.error(`Download failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get messages list from ANAF SPV
   * GET /listaMesajeFactura?zile={days}&cif={cif}
   */
  async getMessagesList(
    companyId: string,
    cif: string,
    days: number = 60,
  ): Promise<MessageListItem[]> {
    this.logger.log(`Getting messages for CIF ${cif}, last ${days} days`);

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/listaMesajeFactura?zile=${days}&cif=${cif}`;

      const response = await this.makeRequest<AnafMessagesResponse>(
        url,
        'GET',
        null,
        agent,
      );

      if (response.ExecutionStatus === 0 && response.mesaje) {
        return response.mesaje;
      }

      return [];
    } catch (error) {
      this.logger.error(`Get messages failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get paginated messages
   * GET /listaMesajePaginworkaround?zile={days}&cif={cif}&pagina={page}
   */
  async getMessagesPaginated(
    companyId: string,
    cif: string,
    page: number = 1,
    days: number = 60,
  ): Promise<{ messages: MessageListItem[]; hasMore: boolean }> {
    this.logger.log(
      `Getting paginated messages for CIF ${cif}, page ${page}`,
    );

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/listaMesajePaginworkaround?zile=${days}&cif=${cif}&pagina=${page}`;

      const response = await this.makeRequest<AnafMessagesResponse>(
        url,
        'GET',
        null,
        agent,
      );

      if (response.ExecutionStatus === 0) {
        const messages = response.mesaje || [];
        return {
          messages,
          hasMore: messages.length === 500, // ANAF returns max 500 per page
        };
      }

      return { messages: [], hasMore: false };
    } catch (error) {
      this.logger.error(`Get paginated messages failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Validate XML against ANAF schema
   * POST /validare/UBL
   */
  async validateXml(
    companyId: string,
    xml: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    this.logger.log('Validating XML against ANAF schema');

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/validare/UBL`;

      const response = await this.makeRequest<AnafUploadResponse>(
        url,
        'POST',
        xml,
        agent,
        {
          'Content-Type': 'text/plain',
        },
      );

      if (response.ExecutionStatus === 0) {
        return { valid: true, errors: [] };
      }

      return {
        valid: false,
        errors: response.Errors?.map((e) => e.errorMessage) || ['Eroare necunoscută'],
      };
    } catch (error) {
      this.logger.error(`Validation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Convert PDF to e-Factura XML using ANAF service
   * POST /transformare/FCN
   */
  async convertPdfToXml(
    companyId: string,
    pdfBase64: string,
  ): Promise<string> {
    this.logger.log('Converting PDF to e-Factura XML');

    try {
      const agent = await this.createHttpsAgent(companyId);
      const url = `${this.baseUrl}/transformare/FCN`;

      const response = await this.makeRequest<string>(
        url,
        'POST',
        pdfBase64,
        agent,
        {
          'Content-Type': 'text/plain',
        },
      );

      return response;
    } catch (error) {
      this.logger.error(`PDF conversion failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Generic HTTP request helper
   */
  private async makeRequest<T>(
    url: string,
    method: 'GET' | 'POST',
    body: string | null,
    agent: https.Agent,
    headers: Record<string, string> = {},
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        agent,
        headers: {
          Accept: 'application/json',
          ...headers,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(
                new InternalServerErrorException(
                  `ANAF API error: ${res.statusCode} - ${data}`,
                ),
              );
              return;
            }

            // Try to parse as JSON, otherwise return raw string
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              resolve(data as unknown as T);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(`Request error: ${(error as Error).message}`);
        reject(
          new InternalServerErrorException(
            `Failed to connect to ANAF: ${(error as Error).message}`,
          ),
        );
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Sync all pending invoices with ANAF
   */
  async syncPendingInvoices(companyId: string): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const pendingInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        efacturaStatus: {
          in: [EfacturaStatus.PENDING, EfacturaStatus.PROCESSING],
        },
        efacturaUploadId: { not: null },
      },
    });

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const invoice of pendingInvoices) {
      try {
        await this.checkStatus(companyId, invoice.efacturaUploadId!);
        synced++;
      } catch (error) {
        failed++;
        errors.push(`${invoice.invoiceNumber}: ${(error as Error).message}`);
      }
    }

    return { synced, failed, errors };
  }
}

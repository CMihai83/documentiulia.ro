"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnafSpvService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnafSpvService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const https = __importStar(require("https"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
let AnafSpvService = AnafSpvService_1 = class AnafSpvService {
    configService;
    prisma;
    logger = new common_1.Logger(AnafSpvService_1.name);
    baseUrl;
    isProduction;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.isProduction = this.configService.get('ANAF_ENV') === 'production';
        this.baseUrl = this.isProduction
            ? 'https://api.anaf.ro/prod/FCTEL/rest'
            : 'https://api.anaf.ro/test/FCTEL/rest';
    }
    async createHttpsAgent(companyId) {
        const config = await this.prisma.efacturaConfig.findUnique({
            where: { companyId },
        });
        if (!config?.certificateFile || !config?.certificatePassword) {
            throw new common_1.BadRequestException('Certificate not configured. Please upload your ANAF digital certificate.');
        }
        const certPath = path.resolve(config.certificateFile);
        if (!fs.existsSync(certPath)) {
            throw new common_1.BadRequestException('Certificate file not found. Please re-upload your certificate.');
        }
        const pfxBuffer = fs.readFileSync(certPath);
        const passphrase = this.decryptPassword(config.certificatePassword);
        return new https.Agent({
            pfx: pfxBuffer,
            passphrase,
            rejectUnauthorized: true,
        });
    }
    decryptPassword(encryptedPassword) {
        const key = this.configService.get('ENCRYPTION_KEY');
        if (!key) {
            return encryptedPassword;
        }
        try {
            const [ivHex, encrypted] = encryptedPassword.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch {
            return encryptedPassword;
        }
    }
    encryptPassword(password) {
        const key = this.configService.get('ENCRYPTION_KEY');
        if (!key) {
            return password;
        }
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    async uploadInvoice(companyId, invoiceId, xml, cif) {
        this.logger.log(`Uploading invoice ${invoiceId} for CIF ${cif}`);
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/upload?standard=UBL&cif=${cif}`;
            const response = await this.makeRequest(url, 'POST', xml, agent, {
                'Content-Type': 'text/plain',
            });
            if (response.ExecutionStatus === 0 && response.index_incarcare) {
                await this.prisma.invoice.update({
                    where: { id: invoiceId },
                    data: {
                        efacturaStatus: client_1.EfacturaStatus.PENDING,
                        efacturaUploadId: response.index_incarcare,
                        efacturaSentAt: new Date(),
                    },
                });
                this.logger.log(`Invoice uploaded successfully. Upload ID: ${response.index_incarcare}`);
                return {
                    uploadId: response.index_incarcare,
                    message: 'Factura a fost încărcată cu succes în SPV ANAF',
                };
            }
            else {
                const errorMsg = response.Errors?.map((e) => e.errorMessage).join('; ') ||
                    'Eroare necunoscută la încărcare';
                await this.prisma.invoice.update({
                    where: { id: invoiceId },
                    data: {
                        efacturaStatus: client_1.EfacturaStatus.ERROR,
                        efacturaXml: xml,
                    },
                });
                throw new common_1.BadRequestException(errorMsg);
            }
        }
        catch (error) {
            this.logger.error(`Upload failed: ${error.message}`);
            throw error;
        }
    }
    async checkStatus(companyId, uploadId) {
        this.logger.log(`Checking status for upload ${uploadId}`);
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/stareMesaj?id_incarcare=${uploadId}`;
            const response = await this.makeRequest(url, 'GET', null, agent);
            let status;
            let message;
            switch (response.stare) {
                case 'in procesare':
                    status = client_1.EfacturaStatus.PROCESSING;
                    message = 'Factura este în procesare la ANAF';
                    break;
                case 'ok':
                    status = client_1.EfacturaStatus.VALIDATED;
                    message = 'Factura a fost validată de ANAF';
                    break;
                case 'nok':
                case 'XML cu erori nepreluat':
                    status = client_1.EfacturaStatus.REJECTED;
                    message =
                        response.Errors?.map((e) => e.errorMessage).join('; ') ||
                            'Factura a fost respinsă de ANAF';
                    break;
                default:
                    status = client_1.EfacturaStatus.PENDING;
                    message = 'Status necunoscut';
            }
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
        }
        catch (error) {
            this.logger.error(`Status check failed: ${error.message}`);
            throw error;
        }
    }
    async downloadResponse(companyId, downloadId) {
        this.logger.log(`Downloading response ${downloadId}`);
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/descarcare?id=${downloadId}`;
            const response = await this.makeRequest(url, 'GET', null, agent);
            return {
                content: response,
                type: 'application/zip',
            };
        }
        catch (error) {
            this.logger.error(`Download failed: ${error.message}`);
            throw error;
        }
    }
    async getMessagesList(companyId, cif, days = 60) {
        this.logger.log(`Getting messages for CIF ${cif}, last ${days} days`);
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/listaMesajeFactura?zile=${days}&cif=${cif}`;
            const response = await this.makeRequest(url, 'GET', null, agent);
            if (response.ExecutionStatus === 0 && response.mesaje) {
                return response.mesaje;
            }
            return [];
        }
        catch (error) {
            this.logger.error(`Get messages failed: ${error.message}`);
            throw error;
        }
    }
    async getMessagesPaginated(companyId, cif, page = 1, days = 60) {
        this.logger.log(`Getting paginated messages for CIF ${cif}, page ${page}`);
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/listaMesajePaginworkaround?zile=${days}&cif=${cif}&pagina=${page}`;
            const response = await this.makeRequest(url, 'GET', null, agent);
            if (response.ExecutionStatus === 0) {
                const messages = response.mesaje || [];
                return {
                    messages,
                    hasMore: messages.length === 500,
                };
            }
            return { messages: [], hasMore: false };
        }
        catch (error) {
            this.logger.error(`Get paginated messages failed: ${error.message}`);
            throw error;
        }
    }
    async validateXml(companyId, xml) {
        this.logger.log('Validating XML against ANAF schema');
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/validare/UBL`;
            const response = await this.makeRequest(url, 'POST', xml, agent, {
                'Content-Type': 'text/plain',
            });
            if (response.ExecutionStatus === 0) {
                return { valid: true, errors: [] };
            }
            return {
                valid: false,
                errors: response.Errors?.map((e) => e.errorMessage) || ['Eroare necunoscută'],
            };
        }
        catch (error) {
            this.logger.error(`Validation failed: ${error.message}`);
            throw error;
        }
    }
    async convertPdfToXml(companyId, pdfBase64) {
        this.logger.log('Converting PDF to e-Factura XML');
        try {
            const agent = await this.createHttpsAgent(companyId);
            const url = `${this.baseUrl}/transformare/FCN`;
            const response = await this.makeRequest(url, 'POST', pdfBase64, agent, {
                'Content-Type': 'text/plain',
            });
            return response;
        }
        catch (error) {
            this.logger.error(`PDF conversion failed: ${error.message}`);
            throw error;
        }
    }
    async makeRequest(url, method, body, agent, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
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
                            reject(new common_1.InternalServerErrorException(`ANAF API error: ${res.statusCode} - ${data}`));
                            return;
                        }
                        try {
                            resolve(JSON.parse(data));
                        }
                        catch {
                            resolve(data);
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
            req.on('error', (error) => {
                this.logger.error(`Request error: ${error.message}`);
                reject(new common_1.InternalServerErrorException(`Failed to connect to ANAF: ${error.message}`));
            });
            if (body) {
                req.write(body);
            }
            req.end();
        });
    }
    async syncPendingInvoices(companyId) {
        const pendingInvoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                efacturaStatus: {
                    in: [client_1.EfacturaStatus.PENDING, client_1.EfacturaStatus.PROCESSING],
                },
                efacturaUploadId: { not: null },
            },
        });
        let synced = 0;
        let failed = 0;
        const errors = [];
        for (const invoice of pendingInvoices) {
            try {
                await this.checkStatus(companyId, invoice.efacturaUploadId);
                synced++;
            }
            catch (error) {
                failed++;
                errors.push(`${invoice.invoiceNumber}: ${error.message}`);
            }
        }
        return { synced, failed, errors };
    }
};
exports.AnafSpvService = AnafSpvService;
exports.AnafSpvService = AnafSpvService = AnafSpvService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], AnafSpvService);
//# sourceMappingURL=anaf-spv.service.js.map
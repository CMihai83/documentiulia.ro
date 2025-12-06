"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxCodesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const VAT_REFORM_DATE = new Date('2025-08-01');
const DIVIDEND_REFORM_DATE = new Date('2026-01-01');
let TaxCodesService = class TaxCodesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        const existing = await this.prisma.taxCode.findUnique({
            where: {
                companyId_code: { companyId, code: dto.code },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Codul de taxă ${dto.code} există deja`);
        }
        if (dto.isDefault) {
            await this.prisma.taxCode.updateMany({
                where: { companyId, type: dto.type, isDefault: true },
                data: { isDefault: false },
            });
        }
        return this.prisma.taxCode.create({
            data: {
                companyId,
                code: dto.code,
                name: dto.name,
                rate: dto.rate,
                type: dto.type,
                saftCode: dto.saftCode,
                isDefault: dto.isDefault || false,
            },
        });
    }
    async findAll(companyId, filters) {
        const where = { companyId };
        if (filters.type) {
            where.type = filters.type;
        }
        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        return this.prisma.taxCode.findMany({
            where,
            orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
        });
    }
    async findOne(companyId, id) {
        const taxCode = await this.prisma.taxCode.findFirst({
            where: { id, companyId },
        });
        if (!taxCode) {
            throw new common_1.NotFoundException('Codul de taxă nu a fost găsit');
        }
        return taxCode;
    }
    async findByCode(companyId, code) {
        const taxCode = await this.prisma.taxCode.findUnique({
            where: {
                companyId_code: { companyId, code },
            },
        });
        if (!taxCode) {
            throw new common_1.NotFoundException(`Codul de taxă ${code} nu a fost găsit`);
        }
        return taxCode;
    }
    async getDefault(companyId, type) {
        return this.prisma.taxCode.findFirst({
            where: { companyId, type, isDefault: true, isActive: true },
        });
    }
    async update(companyId, id, dto) {
        const taxCode = await this.findOne(companyId, id);
        if (dto.isDefault) {
            await this.prisma.taxCode.updateMany({
                where: {
                    companyId,
                    type: dto.type || taxCode.type,
                    isDefault: true,
                    id: { not: id },
                },
                data: { isDefault: false },
            });
        }
        return this.prisma.taxCode.update({
            where: { id },
            data: dto,
        });
    }
    async delete(companyId, id) {
        await this.findOne(companyId, id);
        await this.prisma.taxCode.delete({ where: { id } });
        return { message: 'Codul de taxă a fost șters' };
    }
    async setDefault(companyId, id) {
        const taxCode = await this.findOne(companyId, id);
        await this.prisma.taxCode.updateMany({
            where: { companyId, type: taxCode.type, isDefault: true },
            data: { isDefault: false },
        });
        return this.prisma.taxCode.update({
            where: { id },
            data: { isDefault: true },
        });
    }
    async initializeDefaults(companyId) {
        const now = new Date();
        const useNewRates = now >= VAT_REFORM_DATE;
        const useDividend2026 = now >= DIVIDEND_REFORM_DATE;
        const defaultCodes = [
            { code: 'TVA19', name: 'TVA 19%', rate: 19, type: client_1.TaxType.VAT_STANDARD, saftCode: 'S', isDefault: !useNewRates, validUntil: VAT_REFORM_DATE },
            { code: 'TVA9', name: 'TVA 9%', rate: 9, type: client_1.TaxType.VAT_REDUCED_9, saftCode: 'R9', validUntil: VAT_REFORM_DATE },
            { code: 'TVA21', name: 'TVA 21% (2026)', rate: 21, type: client_1.TaxType.VAT_STANDARD_21, saftCode: 'S21', isDefault: useNewRates, validFrom: VAT_REFORM_DATE },
            { code: 'TVA11', name: 'TVA 11% (2026)', rate: 11, type: client_1.TaxType.VAT_REDUCED_11, saftCode: 'R11', validFrom: VAT_REFORM_DATE },
            { code: 'TVA5', name: 'TVA 5%', rate: 5, type: client_1.TaxType.VAT_REDUCED_5, saftCode: 'R5' },
            { code: 'TVA0', name: 'TVA 0%', rate: 0, type: client_1.TaxType.VAT_ZERO, saftCode: 'Z' },
            { code: 'SCUTIT', name: 'Scutit de TVA', rate: 0, type: client_1.TaxType.VAT_EXEMPT, saftCode: 'E' },
            { code: 'DIV8', name: 'Impozit dividende 8%', rate: 8, type: client_1.TaxType.DIVIDEND_TAX, saftCode: 'DIV8', isDefault: !useDividend2026, validUntil: DIVIDEND_REFORM_DATE },
            { code: 'DIV10', name: 'Impozit dividende 10% (2026)', rate: 10, type: client_1.TaxType.DIVIDEND_TAX, saftCode: 'DIV10', isDefault: useDividend2026, validFrom: DIVIDEND_REFORM_DATE },
        ];
        const results = [];
        for (const code of defaultCodes) {
            const existing = await this.prisma.taxCode.findUnique({
                where: { companyId_code: { companyId, code: code.code } },
            });
            if (!existing) {
                const created = await this.prisma.taxCode.create({
                    data: {
                        companyId,
                        code: code.code,
                        name: code.name,
                        rate: code.rate,
                        type: code.type,
                        saftCode: code.saftCode,
                        isDefault: code.isDefault || false,
                    },
                });
                results.push(created);
            }
        }
        return { initialized: results.length, taxCodes: results };
    }
    getApplicableVatRate(transactionDate, rateType = 'standard') {
        const isAfterReform = transactionDate >= VAT_REFORM_DATE;
        switch (rateType) {
            case 'standard':
                return isAfterReform ? 21 : 19;
            case 'reduced':
                return isAfterReform ? 11 : 9;
            case 'super-reduced':
                return 5;
            default:
                return isAfterReform ? 21 : 19;
        }
    }
    getDividendTaxRate(distributionDate) {
        return distributionDate >= DIVIDEND_REFORM_DATE ? 10 : 8;
    }
    getFiscalComplianceStatus() {
        const now = new Date();
        let regime;
        if (now < VAT_REFORM_DATE) {
            regime = '2024';
        }
        else if (now < DIVIDEND_REFORM_DATE) {
            regime = '2025-transitional';
        }
        else {
            regime = '2026';
        }
        const applicableRates = {
            standard: this.getApplicableVatRate(now, 'standard'),
            reduced: this.getApplicableVatRate(now, 'reduced'),
            superReduced: 5,
            dividendTax: this.getDividendTaxRate(now),
            effectiveDate: now >= VAT_REFORM_DATE ? VAT_REFORM_DATE : new Date('2024-01-01'),
            isCurrentlyActive: true,
        };
        const upcomingChanges = [];
        if (now < VAT_REFORM_DATE) {
            upcomingChanges.push({
                date: VAT_REFORM_DATE,
                description: 'TVA standard crește la 21%, TVA redus la 11%',
                impact: 'Actualizare facturi, sisteme contabile, prețuri',
            });
        }
        if (now < DIVIDEND_REFORM_DATE) {
            upcomingChanges.push({
                date: DIVIDEND_REFORM_DATE,
                description: 'Impozit dividende crește la 10%',
                impact: 'Planificare distribuire dividende, actualizare declarații',
            });
        }
        upcomingChanges.push({
            date: new Date('2026-07-01'),
            description: 'e-Factura B2B devine obligatorie',
            impact: 'Integrare completă SPV ANAF, toate tranzacțiile B2B',
        });
        const complianceChecklist = [
            { item: 'Rate TVA 2026 configurate', status: regime === '2026' ? 'compliant' : 'pending' },
            { item: 'e-Factura B2C activ', status: 'compliant' },
            { item: 'e-Factura B2B activ', status: now >= new Date('2026-07-01') ? 'action-required' : 'pending' },
            { item: 'SAF-T D406 actualizat', status: 'compliant' },
            { item: 'Certificat digital ANAF valid', status: 'action-required' },
        ];
        return {
            currentVatRegime: regime,
            applicableRates,
            upcomingChanges,
            complianceChecklist,
        };
    }
    async getApplicableTaxCode(companyId, transactionDate, rateType = 'standard') {
        const isAfterReform = transactionDate >= VAT_REFORM_DATE;
        let targetType;
        switch (rateType) {
            case 'standard':
                targetType = isAfterReform ? client_1.TaxType.VAT_STANDARD_21 : client_1.TaxType.VAT_STANDARD;
                break;
            case 'reduced':
                targetType = isAfterReform ? client_1.TaxType.VAT_REDUCED_11 : client_1.TaxType.VAT_REDUCED_9;
                break;
            case 'super-reduced':
                targetType = client_1.TaxType.VAT_REDUCED_5;
                break;
            case 'zero':
                targetType = client_1.TaxType.VAT_ZERO;
                break;
            case 'exempt':
                targetType = client_1.TaxType.VAT_EXEMPT;
                break;
            default:
                targetType = isAfterReform ? client_1.TaxType.VAT_STANDARD_21 : client_1.TaxType.VAT_STANDARD;
        }
        const taxCode = await this.prisma.taxCode.findFirst({
            where: { companyId, type: targetType, isActive: true },
        });
        if (!taxCode) {
            return this.getDefault(companyId, client_1.TaxType.VAT_STANDARD);
        }
        return taxCode;
    }
    async getVatSummary(companyId) {
        const vatCodes = await this.prisma.taxCode.findMany({
            where: {
                companyId,
                isActive: true,
                type: { in: [client_1.TaxType.VAT_STANDARD, client_1.TaxType.VAT_REDUCED_9, client_1.TaxType.VAT_REDUCED_5, client_1.TaxType.VAT_ZERO, client_1.TaxType.VAT_EXEMPT] },
            },
            orderBy: { rate: 'desc' },
        });
        return vatCodes.map((code) => ({
            code: code.code,
            name: code.name,
            rate: code.rate.toNumber(),
            saftCode: code.saftCode,
            isDefault: code.isDefault,
        }));
    }
};
exports.TaxCodesService = TaxCodesService;
exports.TaxCodesService = TaxCodesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaxCodesService);
//# sourceMappingURL=tax-codes.service.js.map
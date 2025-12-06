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
var Vat2026Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vat2026Service = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let Vat2026Service = Vat2026Service_1 = class Vat2026Service {
    prisma;
    logger = new common_1.Logger(Vat2026Service_1.name);
    vatRates = [
        {
            code: 'S',
            rate: 19,
            name: 'Standard Rate',
            nameRo: 'Cotă standard',
            applicableFrom: new Date('2024-01-01'),
            categories: ['default', 'services', 'goods'],
        },
        {
            code: 'R1',
            rate: 9,
            name: 'Reduced Rate 1',
            nameRo: 'Cotă redusă 9%',
            applicableFrom: new Date('2024-01-01'),
            categories: [
                'food',
                'medicine',
                'hotels',
                'restaurants',
                'waterSupply',
                'prosthetics',
                'fertilizers',
                'seeds',
            ],
            ncCodes: ['0201', '0202', '0203', '0204', '0207', '0301', '0302', '0303'],
        },
        {
            code: 'R2',
            rate: 5,
            name: 'Reduced Rate 2',
            nameRo: 'Cotă redusă 5%',
            applicableFrom: new Date('2024-01-01'),
            categories: [
                'books',
                'newspapers',
                'magazines',
                'firstHome',
                'schoolBooks',
                'socialHousing',
                'culturalEvents',
                'sportsEvents',
            ],
            ncCodes: ['4901', '4902', '4903', '4904'],
        },
        {
            code: 'Z',
            rate: 0,
            name: 'Zero Rate',
            nameRo: 'Scutit cu drept de deducere',
            applicableFrom: new Date('2024-01-01'),
            categories: [
                'exports',
                'intraEuSupplies',
                'internationalTransport',
                'diplomaticMissions',
                'natoForces',
            ],
        },
        {
            code: 'E',
            rate: 0,
            name: 'Exempt',
            nameRo: 'Scutit fără drept de deducere',
            applicableFrom: new Date('2024-01-01'),
            categories: [
                'banking',
                'insurance',
                'healthcare',
                'education',
                'socialServices',
                'realEstateRental',
                'postalServices',
                'gambling',
            ],
        },
    ];
    constructor(prisma) {
        this.prisma = prisma;
    }
    calculateVat(netAmount, category, options = {}) {
        const { date = new Date(), customerCountry = 'RO', customerVatId, isB2B = false, ncCode, } = options;
        let vatRate = this.getVatRate(category, date, ncCode);
        let reverseCharge = false;
        let vatExemptionReason;
        if (customerCountry !== 'RO' &&
            this.isEuCountry(customerCountry) &&
            isB2B &&
            customerVatId) {
            reverseCharge = true;
            vatExemptionReason = `Reverse charge - Art. 150 Cod Fiscal (Livrare intracomunitară B2B)`;
            vatRate = { ...vatRate, rate: 0, code: 'RC' };
        }
        if (!this.isEuCountry(customerCountry)) {
            vatExemptionReason = `Export - Art. 143(1)(a) Cod Fiscal`;
            vatRate = { ...vatRate, rate: 0, code: 'Z' };
        }
        const vatAmount = this.roundVat(netAmount * (vatRate.rate / 100));
        const grossAmount = this.roundVat(netAmount + vatAmount);
        return {
            netAmount,
            vatAmount,
            grossAmount,
            vatRate: vatRate.rate,
            vatCode: vatRate.code,
            reverseCharge,
            vatExemptionReason,
        };
    }
    calculateVatFromGross(grossAmount, category, date = new Date()) {
        const vatRate = this.getVatRate(category, date);
        const netAmount = this.roundVat(grossAmount / (1 + vatRate.rate / 100));
        const vatAmount = this.roundVat(grossAmount - netAmount);
        return {
            netAmount,
            vatAmount,
            grossAmount,
            vatRate: vatRate.rate,
            vatCode: vatRate.code,
            reverseCharge: false,
        };
    }
    getVatRate(category, date = new Date(), ncCode) {
        if (ncCode) {
            const ncPrefix = ncCode.substring(0, 4);
            for (const rate of this.vatRates) {
                if (rate.ncCodes?.includes(ncPrefix) &&
                    date >= rate.applicableFrom &&
                    (!rate.applicableTo || date <= rate.applicableTo)) {
                    return rate;
                }
            }
        }
        for (const rate of this.vatRates) {
            if (rate.categories.includes(category) &&
                date >= rate.applicableFrom &&
                (!rate.applicableTo || date <= rate.applicableTo)) {
                return rate;
            }
        }
        return this.vatRates.find((r) => r.code === 'S');
    }
    getAllVatRates() {
        return this.vatRates;
    }
    validateVatNumber(vatNumber) {
        let cleaned = vatNumber.toUpperCase().replace(/\s/g, '');
        if (cleaned.startsWith('RO')) {
            cleaned = cleaned.substring(2);
        }
        if (!/^\d{2,10}$/.test(cleaned)) {
            return {
                valid: false,
                formatted: vatNumber,
                error: 'CUI-ul trebuie să conțină între 2 și 10 cifre',
            };
        }
        const digits = cleaned.split('').map(Number).reverse();
        const weights = [2, 3, 5, 7, 1, 2, 3, 5, 7];
        const checkDigit = digits[0];
        let sum = 0;
        for (let i = 1; i < digits.length; i++) {
            sum += digits[i] * weights[i - 1];
        }
        const remainder = (sum * 10) % 11;
        const expectedCheck = remainder === 10 ? 0 : remainder;
        if (checkDigit !== expectedCheck) {
            return {
                valid: false,
                formatted: `RO${cleaned}`,
                error: 'Cifra de control invalidă',
            };
        }
        return {
            valid: true,
            formatted: `RO${cleaned}`,
        };
    }
    async validateEuVatNumber(vatNumber) {
        const countryCode = vatNumber.substring(0, 2).toUpperCase();
        const number = vatNumber.substring(2);
        this.logger.log(`Validating EU VAT: ${countryCode}${number}`);
        const patterns = {
            AT: /^U\d{8}$/,
            BE: /^\d{10}$/,
            BG: /^\d{9,10}$/,
            CY: /^\d{8}[A-Z]$/,
            CZ: /^\d{8,10}$/,
            DE: /^\d{9}$/,
            DK: /^\d{8}$/,
            EE: /^\d{9}$/,
            EL: /^\d{9}$/,
            ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
            FI: /^\d{8}$/,
            FR: /^[A-Z0-9]{2}\d{9}$/,
            HR: /^\d{11}$/,
            HU: /^\d{8}$/,
            IE: /^(\d{7}[A-Z]{1,2}|\d[A-Z+*]\d{5}[A-Z])$/,
            IT: /^\d{11}$/,
            LT: /^(\d{9}|\d{12})$/,
            LU: /^\d{8}$/,
            LV: /^\d{11}$/,
            MT: /^\d{8}$/,
            NL: /^\d{9}B\d{2}$/,
            PL: /^\d{10}$/,
            PT: /^\d{9}$/,
            RO: /^\d{2,10}$/,
            SE: /^\d{12}$/,
            SI: /^\d{8}$/,
            SK: /^\d{10}$/,
        };
        const pattern = patterns[countryCode];
        if (!pattern) {
            return {
                valid: false,
                error: `Cod țară necunoscut: ${countryCode}`,
            };
        }
        if (!pattern.test(number)) {
            return {
                valid: false,
                error: `Format invalid pentru ${countryCode}`,
            };
        }
        return {
            valid: true,
            name: 'Mock Company Name',
            address: 'Mock Address',
        };
    }
    async calculateVatReturn(companyId, year, month, quarter) {
        let startDate;
        let endDate;
        let period;
        if (month) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
            period = `${year}-${month.toString().padStart(2, '0')}`;
        }
        else if (quarter) {
            startDate = new Date(year, (quarter - 1) * 3, 1);
            endDate = new Date(year, quarter * 3, 0);
            period = `${year}-Q${quarter}`;
        }
        else {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
            period = `${year}`;
        }
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                issueDate: { gte: startDate, lte: endDate },
                status: { not: 'DRAFT' },
            },
            include: {
                client: true,
            },
        });
        const expenses = await this.prisma.expense.findMany({
            where: {
                companyId,
                expenseDate: { gte: startDate, lte: endDate },
                isDeductible: true,
            },
        });
        let salesVat = 0;
        let purchasesVat = 0;
        let reverseChargeVat = 0;
        let intraEuAcquisitions = 0;
        let intraEuSupplies = 0;
        let exports = 0;
        let imports = 0;
        for (const invoice of invoices) {
            const clientCountry = invoice.client?.country || 'RO';
            const isEu = this.isEuCountry(clientCountry);
            if (clientCountry === 'RO') {
                salesVat += Number(invoice.vatAmountRon);
            }
            else if (isEu && invoice.client?.cui) {
                intraEuSupplies += Number(invoice.totalRon);
            }
            else if (!isEu) {
                exports += Number(invoice.totalRon);
            }
        }
        for (const expense of expenses) {
            if (expense.isDeductible) {
                purchasesVat += Number(expense.vatAmount) * (Number(expense.deductiblePercent) / 100);
            }
        }
        const vatDue = salesVat + reverseChargeVat;
        const vatRefund = purchasesVat;
        const netPosition = vatDue - vatRefund;
        return {
            period,
            year,
            month,
            quarter,
            salesVat,
            purchasesVat,
            reverseChargeVat,
            intraEuAcquisitions,
            intraEuSupplies,
            exports,
            imports,
            vatDue,
            vatRefund,
            netPosition,
        };
    }
    async checkOssThreshold(companyId, year) {
        const threshold = 10000;
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                issueDate: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31),
                },
                client: {
                    country: { not: 'RO' },
                    cui: null,
                },
            },
            include: { client: true },
        });
        const euSales = invoices
            .filter((i) => this.isEuCountry(i.client?.country || 'RO'))
            .reduce((sum, i) => sum + Number(i.totalRon) / 4.9, 0);
        const exceeds = euSales > threshold;
        return {
            totalSales: Math.round(euSales * 100) / 100,
            threshold,
            exceeds,
            recommendation: exceeds
                ? 'Recomandăm înregistrarea în sistemul OSS pentru a simplifica raportarea TVA în statele membre UE'
                : 'Sub pragul OSS - puteți continua cu TVA-ul din România',
        };
    }
    getVatCalendar(year, isMonthly) {
        const calendar = [];
        if (isMonthly) {
            for (let month = 1; month <= 12; month++) {
                const deadline = new Date(year, month, 25);
                calendar.push({
                    deadline,
                    declaration: `D300-${year}${month.toString().padStart(2, '0')}`,
                    description: `Decontul de TVA pentru ${this.getMonthName(month - 1)} ${year}`,
                });
            }
        }
        else {
            for (let quarter = 1; quarter <= 4; quarter++) {
                const deadline = new Date(year, quarter * 3, 25);
                calendar.push({
                    deadline,
                    declaration: `D300-${year}T${quarter}`,
                    description: `Decontul de TVA pentru trimestrul ${quarter} ${year}`,
                });
            }
        }
        for (let month = 1; month <= 12; month++) {
            const deadline = new Date(year, month, 25);
            calendar.push({
                deadline,
                declaration: `D390-${year}${month.toString().padStart(2, '0')}`,
                description: `Declarația recapitulativă pentru ${this.getMonthName(month - 1)} ${year}`,
            });
        }
        return calendar.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }
    isEuCountry(countryCode) {
        const euCountries = [
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
            'DE', 'EL', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
            'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
        ];
        return euCountries.includes(countryCode.toUpperCase());
    }
    roundVat(amount) {
        return Math.round(amount * 100) / 100;
    }
    getMonthName(month) {
        const months = [
            'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
            'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
        ];
        return months[month];
    }
};
exports.Vat2026Service = Vat2026Service;
exports.Vat2026Service = Vat2026Service = Vat2026Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], Vat2026Service);
//# sourceMappingURL=vat-2026.service.js.map
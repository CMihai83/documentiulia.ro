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
var EtransportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtransportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const config_1 = require("@nestjs/config");
let EtransportService = EtransportService_1 = class EtransportService {
    prisma;
    configService;
    logger = new common_1.Logger(EtransportService_1.name);
    baseUrl;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const isProduction = this.configService.get('ANAF_ENV') === 'production';
        this.baseUrl = isProduction
            ? 'https://api.anaf.ro/prod/ETRANSPORT/ws/v1'
            : 'https://api.anaf.ro/test/ETRANSPORT/ws/v1';
    }
    async createDeclaration(companyId, declaration) {
        this.logger.log(`Creating e-Transport declaration for ${companyId}`);
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company?.cui) {
            throw new common_1.BadRequestException('Company CUI is required for e-Transport');
        }
        this.validateDeclaration(declaration);
        const transport = await this.prisma.$executeRaw `
      INSERT INTO etransport_declarations (
        company_id,
        operation_type,
        declarant_cui,
        partner_cui,
        departure_point,
        arrival_point,
        departure_county,
        arrival_county,
        departure_locality,
        arrival_locality,
        vehicle_number,
        transport_date,
        goods,
        documents,
        status,
        created_at
      ) VALUES (
        ${companyId},
        ${declaration.codTipOperatiune},
        ${declaration.codDeclarant},
        ${declaration.codPartener || null},
        ${declaration.codPunctPlecare},
        ${declaration.codPunctSosire},
        ${declaration.codJudetPlecare},
        ${declaration.codJudetSosire},
        ${declaration.localitateaPlecare},
        ${declaration.localitateSosire},
        ${declaration.numarVehicul},
        ${declaration.dataTransport},
        ${JSON.stringify(declaration.bunuriTransportate)},
        ${JSON.stringify(declaration.documente || [])},
        'DRAFT',
        NOW()
      )
    `;
        const uit = this.generateUit();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 5);
        return {
            uit,
            message: 'Declarație e-Transport creată cu succes',
            validUntil,
        };
    }
    async confirmStart(companyId, uit) {
        this.logger.log(`Confirming transport start for UIT: ${uit}`);
        return {
            status: 'IN_TRANSIT',
            message: 'Transport confirmat ca pornit',
        };
    }
    async confirmDelivery(companyId, uit, deliveryData) {
        this.logger.log(`Confirming delivery for UIT: ${uit}`);
        return {
            status: 'DELIVERED',
            message: 'Transport finalizat cu succes',
        };
    }
    async cancelDeclaration(companyId, uit, reason) {
        this.logger.log(`Cancelling transport UIT: ${uit}`);
        return {
            status: 'CANCELLED',
            message: 'Declarație anulată',
        };
    }
    async getDeclaration(companyId, uit) {
        const declaration = await this.prisma.$queryRaw `
      SELECT * FROM etransport_declarations
      WHERE company_id = ${companyId} AND uit = ${uit}
      LIMIT 1
    `;
        if (!declaration) {
            throw new common_1.NotFoundException(`Declaration with UIT ${uit} not found`);
        }
        return declaration;
    }
    async listDeclarations(companyId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;
        return {
            declarations: [],
            total: 0,
            page,
            totalPages: 0,
        };
    }
    generateDeclarationXml(declaration) {
        const goods = declaration.bunuriTransportate
            .map((good, index) => `
      <bun index="${index + 1}">
        <codBun>${good.codBun}</codBun>
        <denumireBun>${this.escapeXml(good.denumireBun)}</denumireBun>
        <cantitate>${good.cantitate}</cantitate>
        <codUnitateMasura>${good.codUnitateMasura}</codUnitateMasura>
        ${good.greutateNeta ? `<greutateNeta>${good.greutateNeta}</greutateNeta>` : ''}
        ${good.greutateBruta ? `<greutateBruta>${good.greutateBruta}</greutateBruta>` : ''}
        ${good.valoare ? `<valoare>${good.valoare}</valoare>` : ''}
        ${good.codMoneda ? `<codMoneda>${good.codMoneda}</codMoneda>` : ''}
      </bun>`)
            .join('');
        const documents = (declaration.documente || [])
            .map((doc) => `
      <document>
        <tipDocument>${doc.tipDocument}</tipDocument>
        <numarDocument>${doc.numarDocument}</numarDocument>
        <dataDocument>${doc.dataDocument}</dataDocument>
      </document>`)
            .join('');
        return `<?xml version="1.0" encoding="UTF-8"?>
<declaratieTransport xmlns="mfp:anaf:dgti:eTransport:declaratie:v1">
  <header>
    <codTipOperatiune>${declaration.codTipOperatiune}</codTipOperatiune>
    <codDeclarant>${declaration.codDeclarant}</codDeclarant>
    ${declaration.codPartener ? `<codPartener>${declaration.codPartener}</codPartener>` : ''}
  </header>
  <traseu>
    <plecare>
      <codPunct>${declaration.codPunctPlecare}</codPunct>
      <codJudet>${declaration.codJudetPlecare}</codJudet>
      <localitate>${this.escapeXml(declaration.localitateaPlecare)}</localitate>
    </plecare>
    <sosire>
      <codPunct>${declaration.codPunctSosire}</codPunct>
      <codJudet>${declaration.codJudetSosire}</codJudet>
      <localitate>${this.escapeXml(declaration.localitateSosire)}</localitate>
    </sosire>
  </traseu>
  <vehicul>
    <numar>${declaration.numarVehicul}</numar>
    ${declaration.tara ? `<tara>${declaration.tara}</tara>` : '<tara>RO</tara>'}
  </vehicul>
  <dataTransport>${declaration.dataTransport}</dataTransport>
  <bunuriTransportate>${goods}</bunuriTransportate>
  ${documents ? `<documente>${documents}</documente>` : ''}
</declaratieTransport>`;
    }
    getOperationTypeDescription(code) {
        const types = {
            AIC: 'Achiziție intracomunitară',
            AIE: 'Aprovizionare internă pentru export',
            LHI: 'Livrare high-risk în interiorul țării',
            TDT: 'Transport domestic taxabil',
            ACI: 'Achiziție comercială internațională',
        };
        return types[code] || 'Necunoscut';
    }
    getCountyCodes() {
        return {
            AB: 'Alba',
            AR: 'Arad',
            AG: 'Argeș',
            BC: 'Bacău',
            BH: 'Bihor',
            BN: 'Bistrița-Năsăud',
            BT: 'Botoșani',
            BV: 'Brașov',
            BR: 'Brăila',
            BZ: 'Buzău',
            CS: 'Caraș-Severin',
            CL: 'Călărași',
            CJ: 'Cluj',
            CT: 'Constanța',
            CV: 'Covasna',
            DB: 'Dâmbovița',
            DJ: 'Dolj',
            GL: 'Galați',
            GR: 'Giurgiu',
            GJ: 'Gorj',
            HR: 'Harghita',
            HD: 'Hunedoara',
            IL: 'Ialomița',
            IS: 'Iași',
            IF: 'Ilfov',
            MM: 'Maramureș',
            MH: 'Mehedinți',
            MS: 'Mureș',
            NT: 'Neamț',
            OT: 'Olt',
            PH: 'Prahova',
            SM: 'Satu Mare',
            SJ: 'Sălaj',
            SB: 'Sibiu',
            SV: 'Suceava',
            TR: 'Teleorman',
            TM: 'Timiș',
            TL: 'Tulcea',
            VS: 'Vaslui',
            VL: 'Vâlcea',
            VN: 'Vrancea',
            B: 'București',
        };
    }
    validateDeclaration(declaration) {
        const errors = [];
        if (!declaration.codTipOperatiune) {
            errors.push('Codul tipului de operațiune este obligatoriu');
        }
        if (!declaration.codDeclarant) {
            errors.push('Codul declarantului (CUI) este obligatoriu');
        }
        if (!declaration.numarVehicul) {
            errors.push('Numărul vehiculului este obligatoriu');
        }
        if (!declaration.dataTransport) {
            errors.push('Data transportului este obligatorie');
        }
        if (!declaration.bunuriTransportate || declaration.bunuriTransportate.length === 0) {
            errors.push('Cel puțin un bun transportat este obligatoriu');
        }
        declaration.bunuriTransportate?.forEach((good, index) => {
            if (!good.codBun) {
                errors.push(`Bunul ${index + 1}: Codul NC este obligatoriu`);
            }
            if (!good.denumireBun) {
                errors.push(`Bunul ${index + 1}: Denumirea este obligatorie`);
            }
            if (!good.cantitate || good.cantitate <= 0) {
                errors.push(`Bunul ${index + 1}: Cantitatea trebuie să fie pozitivă`);
            }
        });
        if (errors.length > 0) {
            throw new common_1.BadRequestException(errors.join('; '));
        }
    }
    generateUit() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `UIT-${timestamp}-${random}`;
    }
    escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
};
exports.EtransportService = EtransportService;
exports.EtransportService = EtransportService = EtransportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], EtransportService);
//# sourceMappingURL=etransport.service.js.map
/**
 * RO e-Transport Service
 * ANAF system for real-time monitoring of goods movement
 *
 * Required for:
 * - International road transport of goods
 * - Domestic transport of high-risk goods
 * - Transport of goods subject to excise duties
 *
 * Documentation: https://www.anaf.ro/e-transport
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';

// UIT (Unique Identifier for Transport) response
interface UitResponse {
  uit: string;
  dateCreated: string;
  status: 'ACTIVE' | 'FINALIZED' | 'CANCELLED';
}

// Transport declaration structure
interface TransportDeclaration {
  // Transport type
  codTipOperatiune: 'AIC' | 'AIE' | 'LHI' | 'TDT' | 'ACI';
  // Parties
  codDeclarant: string; // CUI of declarant
  codPartener?: string; // CUI of partner (if applicable)
  // Route
  codPunctPlecare: string;
  codPunctSosire: string;
  codJudetPlecare: string;
  codJudetSosire: string;
  localitateaPlecare: string;
  localitateSosire: string;
  // Vehicle
  numarVehicul: string;
  tara?: string;
  // Dates
  dataTransport: string;
  // Goods
  bunuriTransportate: TransportedGood[];
  // Documents
  documente?: TransportDocument[];
}

interface TransportedGood {
  codBun: string; // NC code (Combined Nomenclature)
  denumireBun: string;
  cantitate: number;
  codUnitateMasura: string;
  greutateNeta?: number;
  greutateBruta?: number;
  valoare?: number;
  codMoneda?: string;
}

interface TransportDocument {
  tipDocument: string;
  numarDocument: string;
  dataDocument: string;
}

// Transport statuses
type TransportStatus =
  | 'DRAFT'
  | 'DECLARED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED';

@Injectable()
export class EtransportService {
  private readonly logger = new Logger(EtransportService.name);
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const isProduction = this.configService.get('ANAF_ENV') === 'production';
    this.baseUrl = isProduction
      ? 'https://api.anaf.ro/prod/ETRANSPORT/ws/v1'
      : 'https://api.anaf.ro/test/ETRANSPORT/ws/v1';
  }

  /**
   * Create transport declaration and get UIT
   */
  async createDeclaration(
    companyId: string,
    declaration: TransportDeclaration,
  ): Promise<{
    uit: string;
    message: string;
    validUntil: Date;
  }> {
    this.logger.log(`Creating e-Transport declaration for ${companyId}`);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company?.cui) {
      throw new BadRequestException('Company CUI is required for e-Transport');
    }

    // Validate declaration
    this.validateDeclaration(declaration);

    // Store declaration in database
    const transport = await this.prisma.$executeRaw`
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

    // Generate UIT (in production, this would call ANAF API)
    const uit = this.generateUit();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 5); // UIT valid for 5 days

    return {
      uit,
      message: 'Declarație e-Transport creată cu succes',
      validUntil,
    };
  }

  /**
   * Confirm transport start
   */
  async confirmStart(
    companyId: string,
    uit: string,
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`Confirming transport start for UIT: ${uit}`);

    // Update status to IN_TRANSIT
    // In production, this would call ANAF API

    return {
      status: 'IN_TRANSIT',
      message: 'Transport confirmat ca pornit',
    };
  }

  /**
   * Confirm transport delivery
   */
  async confirmDelivery(
    companyId: string,
    uit: string,
    deliveryData: {
      dataLivrare: string;
      observatii?: string;
    },
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`Confirming delivery for UIT: ${uit}`);

    // Update status to DELIVERED
    // In production, this would call ANAF API

    return {
      status: 'DELIVERED',
      message: 'Transport finalizat cu succes',
    };
  }

  /**
   * Cancel transport declaration
   */
  async cancelDeclaration(
    companyId: string,
    uit: string,
    reason: string,
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`Cancelling transport UIT: ${uit}`);

    // In production, this would call ANAF API

    return {
      status: 'CANCELLED',
      message: 'Declarație anulată',
    };
  }

  /**
   * Get transport declaration by UIT
   */
  async getDeclaration(
    companyId: string,
    uit: string,
  ): Promise<any> {
    // Query database for declaration
    const declaration = await this.prisma.$queryRaw`
      SELECT * FROM etransport_declarations
      WHERE company_id = ${companyId} AND uit = ${uit}
      LIMIT 1
    `;

    if (!declaration) {
      throw new NotFoundException(`Declaration with UIT ${uit} not found`);
    }

    return declaration;
  }

  /**
   * List all transport declarations for company
   */
  async listDeclarations(
    companyId: string,
    options: {
      status?: TransportStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    declarations: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // For now, return mock data
    // In production, query from database
    return {
      declarations: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }

  /**
   * Generate XML for e-Transport declaration
   */
  generateDeclarationXml(declaration: TransportDeclaration): string {
    const goods = declaration.bunuriTransportate
      .map(
        (good, index) => `
      <bun index="${index + 1}">
        <codBun>${good.codBun}</codBun>
        <denumireBun>${this.escapeXml(good.denumireBun)}</denumireBun>
        <cantitate>${good.cantitate}</cantitate>
        <codUnitateMasura>${good.codUnitateMasura}</codUnitateMasura>
        ${good.greutateNeta ? `<greutateNeta>${good.greutateNeta}</greutateNeta>` : ''}
        ${good.greutateBruta ? `<greutateBruta>${good.greutateBruta}</greutateBruta>` : ''}
        ${good.valoare ? `<valoare>${good.valoare}</valoare>` : ''}
        ${good.codMoneda ? `<codMoneda>${good.codMoneda}</codMoneda>` : ''}
      </bun>`,
      )
      .join('');

    const documents = (declaration.documente || [])
      .map(
        (doc) => `
      <document>
        <tipDocument>${doc.tipDocument}</tipDocument>
        <numarDocument>${doc.numarDocument}</numarDocument>
        <dataDocument>${doc.dataDocument}</dataDocument>
      </document>`,
      )
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

  /**
   * Get operation type description
   */
  getOperationTypeDescription(code: string): string {
    const types: Record<string, string> = {
      AIC: 'Achiziție intracomunitară',
      AIE: 'Aprovizionare internă pentru export',
      LHI: 'Livrare high-risk în interiorul țării',
      TDT: 'Transport domestic taxabil',
      ACI: 'Achiziție comercială internațională',
    };
    return types[code] || 'Necunoscut';
  }

  /**
   * Get Romanian county codes
   */
  getCountyCodes(): Record<string, string> {
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

  /**
   * Validate transport declaration
   */
  private validateDeclaration(declaration: TransportDeclaration): void {
    const errors: string[] = [];

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
      throw new BadRequestException(errors.join('; '));
    }
  }

  /**
   * Generate UIT (mock for development)
   */
  private generateUit(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `UIT-${timestamp}-${random}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

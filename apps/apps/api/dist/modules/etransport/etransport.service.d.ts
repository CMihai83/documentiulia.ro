import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
interface TransportDeclaration {
    codTipOperatiune: 'AIC' | 'AIE' | 'LHI' | 'TDT' | 'ACI';
    codDeclarant: string;
    codPartener?: string;
    codPunctPlecare: string;
    codPunctSosire: string;
    codJudetPlecare: string;
    codJudetSosire: string;
    localitateaPlecare: string;
    localitateSosire: string;
    numarVehicul: string;
    tara?: string;
    dataTransport: string;
    bunuriTransportate: TransportedGood[];
    documente?: TransportDocument[];
}
interface TransportedGood {
    codBun: string;
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
type TransportStatus = 'DRAFT' | 'DECLARED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED';
export declare class EtransportService {
    private prisma;
    private configService;
    private readonly logger;
    private readonly baseUrl;
    constructor(prisma: PrismaService, configService: ConfigService);
    createDeclaration(companyId: string, declaration: TransportDeclaration): Promise<{
        uit: string;
        message: string;
        validUntil: Date;
    }>;
    confirmStart(companyId: string, uit: string): Promise<{
        status: string;
        message: string;
    }>;
    confirmDelivery(companyId: string, uit: string, deliveryData: {
        dataLivrare: string;
        observatii?: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
    cancelDeclaration(companyId: string, uit: string, reason: string): Promise<{
        status: string;
        message: string;
    }>;
    getDeclaration(companyId: string, uit: string): Promise<any>;
    listDeclarations(companyId: string, options?: {
        status?: TransportStatus;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        declarations: any[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    generateDeclarationXml(declaration: TransportDeclaration): string;
    getOperationTypeDescription(code: string): string;
    getCountyCodes(): Record<string, string>;
    private validateDeclaration;
    private generateUit;
    private escapeXml;
}
export {};
//# sourceMappingURL=etransport.service.d.ts.map
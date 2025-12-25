import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SpvService } from './spv.service';
import { XMLBuilder } from 'fast-xml-parser';
import * as crypto from 'crypto';

/**
 * ANAF e-Transport Service
 * Per OUG 41/2022 and Order 3256/2023
 *
 * Mandatory declaration for:
 * - High fiscal risk goods transport within Romania
 * - International goods transport
 * - Goods >= 500 kg or >= 10,000 RON
 *
 * UIT (Unique Identification Transport) required before transport starts
 */

export enum TransportType {
  NATIONAL = 'NATIONAL',
  INTERNATIONAL_IMPORT = 'INTERNATIONAL_IMPORT',
  INTERNATIONAL_EXPORT = 'INTERNATIONAL_EXPORT',
  INTRA_EU = 'INTRA_EU',
}

export enum TransportStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  SUBMITTED = 'SUBMITTED',
  UIT_RECEIVED = 'UIT_RECEIVED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum GoodsCategory {
  FRUITS_VEGETABLES = 'FRUITS_VEGETABLES',
  MEAT_PRODUCTS = 'MEAT_PRODUCTS',
  CLOTHING_FOOTWEAR = 'CLOTHING_FOOTWEAR',
  BUILDING_MATERIALS = 'BUILDING_MATERIALS',
  ELECTRONICS = 'ELECTRONICS',
  FUEL = 'FUEL',
  ALCOHOL_TOBACCO = 'ALCOHOL_TOBACCO',
  OTHER = 'OTHER',
}

export interface TransportDeclaration {
  id: string;
  userId: string;
  declarationType: TransportType;
  status: TransportStatus;

  // Sender info
  sender: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
  };

  // Receiver info
  receiver: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
  };

  // Transport info
  transport: {
    vehicleRegistration: string;
    trailerRegistration?: string;
    driverName: string;
    driverCNP?: string;
    driverLicense?: string;
    carrierCui?: string;
    carrierName?: string;
  };

  // Route info
  route: {
    startAddress: string;
    startCity: string;
    startCounty: string;
    startCountry: string;
    endAddress: string;
    endCity: string;
    endCounty: string;
    endCountry: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    actualStartDate?: Date;
    actualEndDate?: Date;
    distance?: number;
  };

  // Goods info
  goods: TransportGoods[];

  // ANAF response
  uit?: string; // Unique Identification Transport
  uploadIndex?: string;
  anafStatus?: string;
  anafMessage?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  uitReceivedAt?: Date;
}

export interface TransportGoods {
  description: string;
  category: GoodsCategory;
  ncCode: string; // Nomenclature combinée (CN code)
  quantity: number;
  unit: string;
  weight: number; // kg
  value: number; // RON
  invoiceNumber?: string;
  invoiceDate?: Date;
}

export interface ETransportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// High fiscal risk goods NC codes per ANAF regulations
const HIGH_RISK_NC_CODES = [
  '0201', '0202', '0203', '0204', '0207', // Meat
  '0701', '0702', '0703', '0704', '0705', '0706', '0707', '0708', '0709', // Vegetables
  '0801', '0802', '0803', '0804', '0805', '0806', '0807', '0808', '0809', '0810', // Fruits
  '2203', '2204', '2205', '2206', '2207', '2208', // Alcohol
  '2402', '2403', // Tobacco
  '2710', '2711', // Fuel
  '6101', '6102', '6103', '6104', '6105', '6106', '6201', '6202', '6203', '6204', // Clothing
  '6401', '6402', '6403', '6404', '6405', // Footwear
  '2523', '6801', '6802', '6810', '6811', // Building materials
];

@Injectable()
export class ETransportService {
  private readonly logger = new Logger(ETransportService.name);
  private declarations: Map<string, TransportDeclaration> = new Map();
  private xmlBuilder: XMLBuilder;

  private readonly ANAF_ETRANSPORT_URL = 'https://api.anaf.ro/prod/ETRANSPORT/rest';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private spvService: SpvService,
  ) {
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  ',
    });
  }

  // =================== DECLARATION MANAGEMENT ===================

  async createDeclaration(
    userId: string,
    data: Omit<TransportDeclaration, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<TransportDeclaration> {
    const id = `etr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const declaration: TransportDeclaration = {
      id,
      ...data,
      userId, // Ensure passed userId takes precedence
      status: TransportStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.declarations.set(id, declaration);
    this.logger.log(`Created e-Transport declaration ${id}`);

    return declaration;
  }

  async validateDeclaration(declarationId: string): Promise<ETransportValidationResult> {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate sender CUI
    if (!declaration.sender.cui || !/^\d{2,10}$/.test(declaration.sender.cui)) {
      errors.push('CUI expeditor invalid');
    }

    // Validate receiver CUI
    if (!declaration.receiver.cui || !/^\d{2,10}$/.test(declaration.receiver.cui)) {
      errors.push('CUI destinatar invalid');
    }

    // Validate vehicle registration (Romanian format)
    if (!this.isValidRomanianPlate(declaration.transport.vehicleRegistration)) {
      errors.push('Număr de înmatriculare vehicul invalid');
    }

    // Validate goods
    if (!declaration.goods || declaration.goods.length === 0) {
      errors.push('Trebuie specificată cel puțin o marfă');
    }

    let totalWeight = 0;
    let totalValue = 0;

    for (const goods of declaration.goods) {
      // Validate NC code
      if (!goods.ncCode || !/^\d{4,8}$/.test(goods.ncCode)) {
        errors.push(`Cod NC invalid pentru ${goods.description}`);
      }

      // Check if high risk goods
      const ncPrefix = goods.ncCode.substring(0, 4);
      if (HIGH_RISK_NC_CODES.includes(ncPrefix)) {
        warnings.push(`${goods.description} (${goods.ncCode}) este categorie cu risc fiscal ridicat`);
      }

      totalWeight += goods.weight;
      totalValue += goods.value;
    }

    // Check thresholds for e-Transport obligation
    if (totalWeight < 500 && totalValue < 10000) {
      warnings.push('Transportul nu depășește pragurile obligatorii (500 kg sau 10.000 RON), dar poate fi declarat voluntar');
    }

    // Validate dates
    if (declaration.route.plannedStartDate < new Date()) {
      warnings.push('Data planificată de începere este în trecut');
    }

    if (declaration.route.plannedEndDate <= declaration.route.plannedStartDate) {
      errors.push('Data de sfârșit trebuie să fie după data de începere');
    }

    // Validate driver for domestic transport
    if (declaration.declarationType === TransportType.NATIONAL) {
      if (!declaration.transport.driverCNP) {
        warnings.push('CNP șofer recomandat pentru transport intern');
      } else if (!this.isValidCNP(declaration.transport.driverCNP)) {
        errors.push('CNP șofer invalid');
      }
    }

    // Update declaration status
    declaration.status = errors.length === 0 ? TransportStatus.VALIDATED : TransportStatus.DRAFT;
    declaration.updatedAt = new Date();
    this.declarations.set(declarationId, declaration);

    return { valid: errors.length === 0, errors, warnings };
  }

  async submitToANAF(declarationId: string): Promise<TransportDeclaration> {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }

    if (declaration.status !== TransportStatus.VALIDATED) {
      throw new BadRequestException('Declaration must be validated before submission');
    }

    // Generate XML
    const xml = this.generateETransportXML(declaration);

    try {
      // Get valid SPV token
      const accessToken = await this.spvService.getValidToken(declaration.userId);

      // Submit to ANAF e-Transport API
      const response = await this.submitXMLToANAF(xml, declaration.sender.cui, accessToken);

      declaration.uploadIndex = response.uploadIndex;
      declaration.status = TransportStatus.SUBMITTED;
      declaration.submittedAt = new Date();

      // If UIT received immediately
      if (response.uit) {
        declaration.uit = response.uit;
        declaration.status = TransportStatus.UIT_RECEIVED;
        declaration.uitReceivedAt = new Date();
      }

      declaration.updatedAt = new Date();
      this.declarations.set(declarationId, declaration);

      this.logger.log(`e-Transport declaration ${declarationId} submitted, uploadIndex: ${response.uploadIndex}`);
      return declaration;

    } catch (error) {
      this.logger.error(`e-Transport submission failed: ${error.message}`);

      // For development/testing, simulate success
      if (!this.configService.get('ANAF_ETRANSPORT_ENABLED')) {
        const mockUIT = `UIT${Date.now()}RO`;
        declaration.uit = mockUIT;
        declaration.uploadIndex = `${Date.now()}`;
        declaration.status = TransportStatus.UIT_RECEIVED;
        declaration.submittedAt = new Date();
        declaration.uitReceivedAt = new Date();
        declaration.updatedAt = new Date();
        this.declarations.set(declarationId, declaration);

        this.logger.warn('e-Transport API not enabled, using mock UIT');
        return declaration;
      }

      throw error;
    }
  }

  async checkStatus(declarationId: string): Promise<TransportDeclaration> {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }

    if (!declaration.uploadIndex) {
      return declaration;
    }

    try {
      const accessToken = await this.spvService.getValidToken(declaration.userId);
      const status = await this.checkANAFStatus(declaration.uploadIndex, accessToken);

      declaration.anafStatus = status.stare;
      declaration.anafMessage = status.message;

      if (status.uit && !declaration.uit) {
        declaration.uit = status.uit;
        declaration.status = TransportStatus.UIT_RECEIVED;
        declaration.uitReceivedAt = new Date();
      }

      if (status.stare === 'ok' && declaration.status === TransportStatus.SUBMITTED) {
        declaration.status = TransportStatus.UIT_RECEIVED;
      } else if (status.stare === 'nok') {
        declaration.status = TransportStatus.REJECTED;
      }

      declaration.updatedAt = new Date();
      this.declarations.set(declarationId, declaration);

    } catch (error) {
      this.logger.warn(`Status check failed for ${declarationId}: ${error.message}`);
    }

    return declaration;
  }

  async startTransport(declarationId: string): Promise<TransportDeclaration> {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }

    if (declaration.status !== TransportStatus.UIT_RECEIVED) {
      throw new BadRequestException('Transport can only start after UIT is received');
    }

    declaration.status = TransportStatus.IN_TRANSIT;
    declaration.route.actualStartDate = new Date();
    declaration.updatedAt = new Date();
    this.declarations.set(declarationId, declaration);

    this.logger.log(`Transport ${declarationId} started with UIT: ${declaration.uit}`);
    return declaration;
  }

  async completeTransport(declarationId: string): Promise<TransportDeclaration> {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }

    if (declaration.status !== TransportStatus.IN_TRANSIT) {
      throw new BadRequestException('Only in-transit transports can be completed');
    }

    declaration.status = TransportStatus.COMPLETED;
    declaration.route.actualEndDate = new Date();
    declaration.updatedAt = new Date();
    this.declarations.set(declarationId, declaration);

    // Notify ANAF of completion
    try {
      await this.notifyANAFCompletion(declaration);
    } catch (error) {
      this.logger.warn(`Failed to notify ANAF of completion: ${error.message}`);
    }

    this.logger.log(`Transport ${declarationId} completed`);
    return declaration;
  }

  async cancelDeclaration(declarationId: string, reason: string): Promise<TransportDeclaration> {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }

    if (declaration.status === TransportStatus.COMPLETED) {
      throw new BadRequestException('Completed transports cannot be cancelled');
    }

    declaration.status = TransportStatus.CANCELLED;
    declaration.anafMessage = reason;
    declaration.updatedAt = new Date();
    this.declarations.set(declarationId, declaration);

    // If submitted, notify ANAF of cancellation
    if (declaration.uploadIndex) {
      try {
        await this.notifyANAFCancellation(declaration, reason);
      } catch (error) {
        this.logger.warn(`Failed to notify ANAF of cancellation: ${error.message}`);
      }
    }

    this.logger.log(`Declaration ${declarationId} cancelled: ${reason}`);
    return declaration;
  }

  // =================== XML GENERATION ===================

  private generateETransportXML(declaration: TransportDeclaration): string {
    const totalWeight = declaration.goods.reduce((sum, g) => sum + g.weight, 0);
    const totalValue = declaration.goods.reduce((sum, g) => sum + g.value, 0);

    const data = {
      'eTransport': {
        '@_xmlns': 'mfp:anaf:dgti:eTransport:declaratie:v1',
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'header': {
          'tipDeclaratie': this.getDeclarationType(declaration.declarationType),
          'dataDocument': new Date().toISOString().split('T')[0],
          'softwareProducator': 'DocumentIulia.ro',
          'versiuneSoftware': '1.0',
        },
        'expeditor': {
          'cui': declaration.sender.cui,
          'denumire': declaration.sender.name,
          'adresa': {
            'strada': declaration.sender.address,
            'localitate': declaration.sender.city,
            'judet': declaration.sender.county,
            'tara': declaration.sender.country,
          },
        },
        'destinatar': {
          'cui': declaration.receiver.cui,
          'denumire': declaration.receiver.name,
          'adresa': {
            'strada': declaration.receiver.address,
            'localitate': declaration.receiver.city,
            'judet': declaration.receiver.county,
            'tara': declaration.receiver.country,
          },
        },
        'transport': {
          'nrInmatriculare': declaration.transport.vehicleRegistration,
          'nrInmatriculareRemorca': declaration.transport.trailerRegistration || '',
          'sofer': {
            'nume': declaration.transport.driverName,
            'cnp': declaration.transport.driverCNP || '',
            'permisConducere': declaration.transport.driverLicense || '',
          },
          'transportator': declaration.transport.carrierCui ? {
            'cui': declaration.transport.carrierCui,
            'denumire': declaration.transport.carrierName,
          } : undefined,
        },
        'ruta': {
          'locIncarcare': {
            'adresa': declaration.route.startAddress,
            'localitate': declaration.route.startCity,
            'judet': declaration.route.startCounty,
            'tara': declaration.route.startCountry,
          },
          'locDescarcare': {
            'adresa': declaration.route.endAddress,
            'localitate': declaration.route.endCity,
            'judet': declaration.route.endCounty,
            'tara': declaration.route.endCountry,
          },
          'dataPlecare': declaration.route.plannedStartDate.toISOString(),
          'dataSosire': declaration.route.plannedEndDate.toISOString(),
          'distantaKm': declaration.route.distance || 0,
        },
        'marfuri': {
          'totalGreutate': totalWeight.toFixed(2),
          'totalValoare': totalValue.toFixed(2),
          'moneda': 'RON',
          'marfa': declaration.goods.map((g, i) => ({
            'nrCrt': i + 1,
            'descriere': g.description,
            'codNC': g.ncCode,
            'cantitate': g.quantity,
            'unitateMasura': g.unit,
            'greutateKg': g.weight.toFixed(2),
            'valoareRON': g.value.toFixed(2),
            'nrFactura': g.invoiceNumber || '',
            'dataFactura': g.invoiceDate?.toISOString().split('T')[0] || '',
          })),
        },
      },
    };

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + this.xmlBuilder.build(data);
  }

  private getDeclarationType(type: TransportType): string {
    switch (type) {
      case TransportType.NATIONAL: return 'NATIONAL';
      case TransportType.INTERNATIONAL_IMPORT: return 'IMPORT';
      case TransportType.INTERNATIONAL_EXPORT: return 'EXPORT';
      case TransportType.INTRA_EU: return 'INTRA_UE';
      default: return 'NATIONAL';
    }
  }

  // =================== ANAF API CALLS ===================

  private async submitXMLToANAF(xml: string, cui: string, accessToken: string): Promise<{ uploadIndex: string; uit?: string }> {
    // In production, this would make actual API call to ANAF
    // POST /upload?standard=eTransport&cif={cui}

    // Mock response for development
    return {
      uploadIndex: `${Date.now()}`,
      uit: `UIT${Date.now()}RO`,
    };
  }

  private async checkANAFStatus(uploadIndex: string, accessToken: string): Promise<{ stare: string; message?: string; uit?: string }> {
    // In production: GET /status/{uploadIndex}

    // Mock response
    return {
      stare: 'ok',
      message: 'Declarație validată',
      uit: `UIT${uploadIndex}RO`,
    };
  }

  private async notifyANAFCompletion(declaration: TransportDeclaration): Promise<void> {
    // In production: POST /confirmare
    this.logger.log(`Would notify ANAF of transport completion for UIT: ${declaration.uit}`);
  }

  private async notifyANAFCancellation(declaration: TransportDeclaration, reason: string): Promise<void> {
    // In production: POST /anulare
    this.logger.log(`Would notify ANAF of transport cancellation for UIT: ${declaration.uit}, reason: ${reason}`);
  }

  // =================== UTILITIES ===================

  private isValidRomanianPlate(plate: string): boolean {
    // Romanian plate formats: B 123 ABC, CJ 01 ABC, etc.
    const cleanPlate = plate.replace(/[\s-]/g, '').toUpperCase();
    return /^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/.test(cleanPlate);
  }

  private isValidCNP(cnp: string): boolean {
    if (!cnp || cnp.length !== 13) return false;
    if (!/^\d{13}$/.test(cnp)) return false;

    const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnp[i]) * weights[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 1 : remainder;

    return parseInt(cnp[12]) === checkDigit;
  }

  // =================== INTEGRATION WITH FLEET ===================

  async createFromDeliveryRoute(userId: string, routeId: string): Promise<TransportDeclaration> {
    // Get delivery route from fleet module
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        driver: true,
        vehicle: true,
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException(`Delivery route ${routeId} not found`);
    }

    // Get first and last stops for start/end addresses
    const sortedStops = route.stops || [];
    const firstStop = sortedStops[0];
    const lastStop = sortedStops[sortedStops.length - 1];

    // Build start and end addresses from stops
    const startAddress = firstStop
      ? `${firstStop.streetAddress}, ${firstStop.postalCode} ${firstStop.city}`
      : route.deliveryZone || '';
    const endAddress = lastStop
      ? `${lastStop.streetAddress}, ${lastStop.postalCode} ${lastStop.city}`
      : route.deliveryZone || '';
    const startCity = firstStop?.city || '';
    const endCity = lastStop?.city || '';

    // Create e-Transport declaration from route data
    const declaration = await this.createDeclaration(userId, {
      userId,
      declarationType: TransportType.NATIONAL,
      sender: {
        cui: this.configService.get('COMPANY_CUI') || '',
        name: this.configService.get('COMPANY_NAME') || '',
        address: startAddress,
        city: startCity,
        county: '',
        country: 'RO',
      },
      receiver: {
        cui: '', // Would be populated from stop/customer data
        name: lastStop?.recipientName || '',
        address: endAddress,
        city: endCity,
        county: '',
        country: 'RO',
      },
      transport: {
        vehicleRegistration: route.vehicle?.licensePlate || '',
        driverName: route.driver ? `${route.driver.firstName} ${route.driver.lastName}` : '',
        driverCNP: route.driver?.cnp || '',
      },
      route: {
        startAddress: startAddress,
        startCity: startCity,
        startCounty: '',
        startCountry: 'RO',
        endAddress: endAddress,
        endCity: endCity,
        endCounty: '',
        endCountry: 'RO',
        plannedStartDate: route.plannedStartTime || new Date(),
        plannedEndDate: route.plannedEndTime || new Date(),
        distance: Number(route.plannedDistanceKm || 0),
      },
      goods: [], // Would be populated from cargo/order data
    });

    this.logger.log(`Created e-Transport declaration ${declaration.id} from route ${routeId}`);
    return declaration;
  }

  // =================== RETRIEVAL ===================

  getDeclaration(declarationId: string): TransportDeclaration {
    const declaration = this.declarations.get(declarationId);
    if (!declaration) {
      throw new NotFoundException(`Declaration ${declarationId} not found`);
    }
    return declaration;
  }

  getUserDeclarations(userId: string, status?: TransportStatus): TransportDeclaration[] {
    let declarations = Array.from(this.declarations.values())
      .filter((d) => d.userId === userId);

    if (status) {
      declarations = declarations.filter((d) => d.status === status);
    }

    return declarations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getActiveTransports(userId: string): TransportDeclaration[] {
    return this.getUserDeclarations(userId).filter(
      (d) => d.status === TransportStatus.UIT_RECEIVED || d.status === TransportStatus.IN_TRANSIT,
    );
  }

  // =================== STATISTICS ===================

  getStatistics(userId: string): {
    total: number;
    byStatus: Record<TransportStatus, number>;
    byType: Record<TransportType, number>;
    thisMonth: number;
    avgProcessingTime: number;
  } {
    const declarations = this.getUserDeclarations(userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalProcessingTime = 0;
    let processedCount = 0;

    for (const d of declarations) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      byType[d.declarationType] = (byType[d.declarationType] || 0) + 1;

      if (d.submittedAt && d.uitReceivedAt) {
        totalProcessingTime += d.uitReceivedAt.getTime() - d.submittedAt.getTime();
        processedCount++;
      }
    }

    const thisMonth = declarations.filter((d) => d.createdAt >= monthStart).length;
    const avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount / 1000 : 0; // seconds

    return {
      total: declarations.length,
      byStatus: byStatus as Record<TransportStatus, number>,
      byType: byType as Record<TransportType, number>,
      thisMonth,
      avgProcessingTime: Math.round(avgProcessingTime),
    };
  }
}

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStopStatus } from '@prisma/client';

/**
 * Proof of Delivery Service
 * Handles signature capture, photo proof, and POD document generation
 * for the Munich delivery fleet.
 *
 * Features:
 * - Signature capture (Base64 encoded)
 * - Photo proof storage (URL)
 * - Recipient notes
 * - POD validation
 * - POD document generation
 */

export interface SignatureData {
  base64: string;
  signedBy?: string;
  signedAt?: Date;
}

export interface PhotoProof {
  url: string;
  type: 'DELIVERY' | 'DAMAGE' | 'LOCATION' | 'RECIPIENT';
  capturedAt?: Date;
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface ProofOfDelivery {
  stopId: string;
  status: string;
  recipientName: string;
  address: string;
  hasSignature: boolean;
  hasPhoto: boolean;
  signature?: string;
  photoUrl?: string;
  recipientNote?: string;
  deliveredAt?: Date;
  signedBy?: string;
  validation: PODValidation;
}

export interface PODValidation {
  isComplete: boolean;
  hasSignature: boolean;
  hasPhoto: boolean;
  hasRecipientNote: boolean;
  missingFields: string[];
  requirementsMetAt?: Date;
}

export interface PODDocument {
  stopId: string;
  generatedAt: Date;
  documentType: 'PDF' | 'HTML';
  content: string; // Base64 for PDF, HTML string for HTML
  metadata: {
    recipientName: string;
    address: string;
    deliveredAt: Date;
    driverName: string;
    vehiclePlate: string;
    trackingNumbers: string[];
    parcelCount: number;
  };
}

export interface PODSummary {
  totalDeliveries: number;
  withSignature: number;
  withPhoto: number;
  withBoth: number;
  missingPOD: number;
  completionRate: number;
}

@Injectable()
export class ProofOfDeliveryService {
  private readonly logger = new Logger(ProofOfDeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== SIGNATURE CAPTURE ===================

  /**
   * Capture signature for a delivery stop
   */
  async captureSignature(
    stopId: string,
    signatureBase64: string,
    signedBy?: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Capturing signature for stop ${stopId}`);

    // Validate Base64 signature
    if (!signatureBase64 || signatureBase64.length < 100) {
      throw new BadRequestException('Invalid signature data');
    }

    // Validate Base64 format
    const base64Regex = /^data:image\/(png|jpeg|jpg|webp);base64,/;
    const isValidBase64 = base64Regex.test(signatureBase64) ||
      /^[A-Za-z0-9+/]+=*$/.test(signatureBase64.replace(/\s/g, ''));

    if (!isValidBase64) {
      throw new BadRequestException('Signature must be a valid Base64 encoded image');
    }

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: {
        signature: signatureBase64,
        recipientNote: signedBy
          ? `Signed by: ${signedBy}${stop.recipientNote ? ` | ${stop.recipientNote}` : ''}`
          : stop.recipientNote,
      },
    });

    this.logger.log(`Signature captured for stop ${stopId}`);
    return {
      success: true,
      message: 'Signature captured successfully',
    };
  }

  /**
   * Clear signature for a stop (for corrections)
   */
  async clearSignature(stopId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Clearing signature for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: { signature: null },
    });

    return {
      success: true,
      message: 'Signature cleared',
    };
  }

  // =================== PHOTO PROOF ===================

  /**
   * Capture photo proof for a delivery stop
   */
  async capturePhoto(
    stopId: string,
    photoUrl: string,
    geoLocation?: { latitude: number; longitude: number },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Capturing photo for stop ${stopId}`);

    if (!photoUrl || photoUrl.length < 10) {
      throw new BadRequestException('Invalid photo URL');
    }

    // Validate URL format
    const urlRegex = /^(https?:\/\/|data:image\/)/;
    if (!urlRegex.test(photoUrl)) {
      throw new BadRequestException('Photo URL must be a valid HTTP(S) URL or data URL');
    }

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: {
        photoUrl,
        // Update geo location if provided
        ...(geoLocation && {
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
        }),
      },
    });

    this.logger.log(`Photo captured for stop ${stopId}`);
    return {
      success: true,
      message: 'Photo captured successfully',
    };
  }

  /**
   * Clear photo for a stop
   */
  async clearPhoto(stopId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Clearing photo for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: { photoUrl: null },
    });

    return {
      success: true,
      message: 'Photo cleared',
    };
  }

  // =================== RECIPIENT NOTE ===================

  /**
   * Add recipient note for a delivery stop
   */
  async addRecipientNote(
    stopId: string,
    note: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Adding note for stop ${stopId}`);

    if (!note || note.trim().length === 0) {
      throw new BadRequestException('Note cannot be empty');
    }

    if (note.length > 500) {
      throw new BadRequestException('Note cannot exceed 500 characters');
    }

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: { recipientNote: note.trim() },
    });

    return {
      success: true,
      message: 'Note added successfully',
    };
  }

  // =================== POD RETRIEVAL ===================

  /**
   * Get full proof of delivery for a stop
   */
  async getProofOfDelivery(stopId: string): Promise<ProofOfDelivery> {
    this.logger.log(`Retrieving POD for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    const validation = this.validatePOD(stop);
    const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;

    return {
      stopId: stop.id,
      status: stop.status,
      recipientName: stop.recipientName,
      address,
      hasSignature: !!stop.signature,
      hasPhoto: !!stop.photoUrl,
      signature: stop.signature || undefined,
      photoUrl: stop.photoUrl || undefined,
      recipientNote: stop.recipientNote || undefined,
      deliveredAt: stop.completedAt || undefined,
      validation,
    };
  }

  /**
   * Validate POD completeness
   */
  validatePOD(stop: {
    signature: string | null;
    photoUrl: string | null;
    recipientNote: string | null;
    completedAt: Date | null;
  }): PODValidation {
    const hasSignature = !!stop.signature;
    const hasPhoto = !!stop.photoUrl;
    const hasRecipientNote = !!stop.recipientNote;

    const missingFields: string[] = [];
    if (!hasSignature) missingFields.push('signature');
    if (!hasPhoto) missingFields.push('photo');

    // Require at least signature OR photo for complete POD
    const isComplete = hasSignature || hasPhoto;

    return {
      isComplete,
      hasSignature,
      hasPhoto,
      hasRecipientNote,
      missingFields: isComplete ? [] : missingFields,
      requirementsMetAt: isComplete ? stop.completedAt || undefined : undefined,
    };
  }

  // =================== POD DOCUMENT GENERATION ===================

  /**
   * Generate POD document (HTML format for now)
   */
  async generatePODDocument(stopId: string): Promise<PODDocument> {
    this.logger.log(`Generating POD document for stop ${stopId}`);

    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: {
        route: {
          include: {
            vehicle: { select: { licensePlate: true, make: true, model: true } },
            driver: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!stop) {
      throw new NotFoundException(`Delivery stop ${stopId} not found`);
    }

    const driverName = stop.route.driver
      ? `${stop.route.driver.firstName} ${stop.route.driver.lastName}`
      : 'N/A';

    const address = `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`;

    const metadata = {
      recipientName: stop.recipientName,
      address,
      deliveredAt: stop.completedAt || new Date(),
      driverName,
      vehiclePlate: stop.route.vehicle.licensePlate,
      trackingNumbers: stop.trackingNumbers,
      parcelCount: stop.parcelCount,
    };

    // Generate HTML document
    const htmlContent = this.generateHTMLDocument(stop, metadata);

    return {
      stopId: stop.id,
      generatedAt: new Date(),
      documentType: 'HTML',
      content: htmlContent,
      metadata,
    };
  }

  private generateHTMLDocument(
    stop: any,
    metadata: PODDocument['metadata'],
  ): string {
    const deliveryDate = metadata.deliveredAt.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const deliveryTime = metadata.deliveredAt.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zustellnachweis - ${metadata.trackingNumbers[0] || stop.id}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .document {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #333;
      margin: 0;
      font-size: 24px;
    }
    .header p {
      color: #666;
      margin: 5px 0 0;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      margin-bottom: 10px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
    .signature-box {
      border: 1px dashed #ccc;
      padding: 20px;
      min-height: 100px;
      text-align: center;
      background: #fafafa;
      border-radius: 4px;
    }
    .signature-box img {
      max-width: 100%;
      max-height: 150px;
    }
    .photo-box {
      border: 1px solid #eee;
      padding: 10px;
      border-radius: 4px;
    }
    .photo-box img {
      max-width: 100%;
      max-height: 200px;
      display: block;
      margin: 0 auto;
    }
    .note-box {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      border-left: 3px solid #007bff;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 11px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-delivered {
      background: #d4edda;
      color: #155724;
    }
    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }
    .verification {
      background: #e7f3ff;
      border: 1px solid #b6d4fe;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
    }
    .verification-title {
      font-weight: bold;
      color: #0c5460;
      margin-bottom: 10px;
    }
    .check-item {
      display: flex;
      align-items: center;
      margin: 5px 0;
    }
    .check-icon {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <h1>ZUSTELLNACHWEIS</h1>
      <p>Proof of Delivery / Lieferbestätigung</p>
    </div>

    <div class="section">
      <div class="section-title">Lieferdetails</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Tracking-Nummer</div>
          <div class="info-value">${metadata.trackingNumbers.join(', ') || stop.id.slice(-8).toUpperCase()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="status-badge ${stop.status === 'DELIVERED' ? 'status-delivered' : 'status-failed'}">
              ${stop.status === 'DELIVERED' ? 'Zugestellt' : stop.status}
            </span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Datum</div>
          <div class="info-value">${deliveryDate}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Uhrzeit</div>
          <div class="info-value">${deliveryTime}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Empfänger</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Name</div>
          <div class="info-value">${metadata.recipientName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Anzahl Pakete</div>
          <div class="info-value">${metadata.parcelCount}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Adresse</div>
          <div class="info-value">${metadata.address}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Fahrer & Fahrzeug</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Fahrer</div>
          <div class="info-value">${metadata.driverName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Kennzeichen</div>
          <div class="info-value">${metadata.vehiclePlate}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Unterschrift des Empfängers</div>
      <div class="signature-box">
        ${stop.signature
          ? `<img src="${stop.signature}" alt="Signature" />`
          : '<p style="color: #999;">Keine Unterschrift erfasst</p>'}
      </div>
    </div>

    ${stop.photoUrl ? `
    <div class="section">
      <div class="section-title">Fotobeweis</div>
      <div class="photo-box">
        <img src="${stop.photoUrl}" alt="Delivery Photo" />
      </div>
    </div>
    ` : ''}

    ${stop.recipientNote ? `
    <div class="section">
      <div class="section-title">Anmerkungen</div>
      <div class="note-box">${stop.recipientNote}</div>
    </div>
    ` : ''}

    <div class="verification">
      <div class="verification-title">Zustellnachweis-Validierung</div>
      <div class="check-item">
        <span class="check-icon">${stop.signature ? '✅' : '❌'}</span>
        <span>Unterschrift erfasst</span>
      </div>
      <div class="check-item">
        <span class="check-icon">${stop.photoUrl ? '✅' : '❌'}</span>
        <span>Fotobeweis erfasst</span>
      </div>
      <div class="check-item">
        <span class="check-icon">${stop.recipientNote ? '✅' : '⚪'}</span>
        <span>Anmerkungen vorhanden</span>
      </div>
    </div>

    <div class="footer">
      <p>Dokument generiert am ${new Date().toLocaleString('de-DE')}</p>
      <p>DocumentIulia.ro Logistics Platform</p>
      <p>Dieses Dokument ist maschinell erstellt und rechtsgültig ohne Unterschrift.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  // =================== POD SUMMARY & REPORTS ===================

  /**
   * Get POD summary for a route
   */
  async getRoutePODSummary(routeId: string): Promise<PODSummary> {
    this.logger.log(`Getting POD summary for route ${routeId}`);

    const stops = await this.prisma.deliveryStop.findMany({
      where: { routeId },
      select: {
        signature: true,
        photoUrl: true,
        status: true,
      },
    });

    const deliveredStops = stops.filter(s => s.status === 'DELIVERED');
    const total = deliveredStops.length;

    if (total === 0) {
      return {
        totalDeliveries: 0,
        withSignature: 0,
        withPhoto: 0,
        withBoth: 0,
        missingPOD: 0,
        completionRate: 0,
      };
    }

    const withSignature = deliveredStops.filter(s => s.signature).length;
    const withPhoto = deliveredStops.filter(s => s.photoUrl).length;
    const withBoth = deliveredStops.filter(s => s.signature && s.photoUrl).length;
    const missingPOD = deliveredStops.filter(s => !s.signature && !s.photoUrl).length;
    const completionRate = ((total - missingPOD) / total) * 100;

    return {
      totalDeliveries: total,
      withSignature,
      withPhoto,
      withBoth,
      missingPOD,
      completionRate: Math.round(completionRate * 10) / 10,
    };
  }

  /**
   * Get POD summary for a date range
   */
  async getPODStats(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<PODSummary & { routeCount: number }> {
    this.logger.log(`Getting POD stats for user ${userId} from ${from} to ${to}`);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: {
          gte: from,
          lte: to,
        },
      },
      select: { id: true },
    });

    const routeIds = routes.map(r => r.id);

    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        routeId: { in: routeIds },
        status: 'DELIVERED',
      },
      select: {
        signature: true,
        photoUrl: true,
      },
    });

    const total = stops.length;

    if (total === 0) {
      return {
        routeCount: routes.length,
        totalDeliveries: 0,
        withSignature: 0,
        withPhoto: 0,
        withBoth: 0,
        missingPOD: 0,
        completionRate: 0,
      };
    }

    const withSignature = stops.filter(s => s.signature).length;
    const withPhoto = stops.filter(s => s.photoUrl).length;
    const withBoth = stops.filter(s => s.signature && s.photoUrl).length;
    const missingPOD = stops.filter(s => !s.signature && !s.photoUrl).length;
    const completionRate = ((total - missingPOD) / total) * 100;

    return {
      routeCount: routes.length,
      totalDeliveries: total,
      withSignature,
      withPhoto,
      withBoth,
      missingPOD,
      completionRate: Math.round(completionRate * 10) / 10,
    };
  }

  /**
   * Get stops missing POD for a route
   */
  async getStopsMissingPOD(routeId: string): Promise<any[]> {
    this.logger.log(`Getting stops missing POD for route ${routeId}`);

    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        routeId,
        status: 'DELIVERED',
        signature: null,
        photoUrl: null,
      },
      select: {
        id: true,
        recipientName: true,
        streetAddress: true,
        postalCode: true,
        city: true,
        trackingNumbers: true,
        completedAt: true,
      },
    });

    return stops.map(stop => ({
      stopId: stop.id,
      recipientName: stop.recipientName,
      address: `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`,
      trackingNumber: stop.trackingNumbers[0] || stop.id.slice(-8).toUpperCase(),
      deliveredAt: stop.completedAt,
    }));
  }
}

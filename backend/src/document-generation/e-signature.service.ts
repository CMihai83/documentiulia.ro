import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type SignatureProvider = 'internal' | 'docusign' | 'adobe_sign' | 'hellosign' | 'pandadoc';
export type SignatureType = 'electronic' | 'digital' | 'handwritten' | 'initials';
export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'cancelled';
export type SignerRole = 'signer' | 'approver' | 'viewer' | 'carbon_copy';

export interface SignatureField {
  id: string;
  type: SignatureType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  signerId: string;
  label?: string;
  placeholder?: string;
}

export interface AdditionalField {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'dropdown' | 'initials' | 'attachment';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  signerId: string;
  label?: string;
  defaultValue?: any;
  options?: string[];
  validation?: Record<string, any>;
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: SignerRole;
  order: number;
  accessCode?: string;
  authMethod?: 'email' | 'sms' | 'phone' | 'id_verification';
  language?: string;
  fields: SignatureField[];
  additionalFields: AdditionalField[];
  status: SignatureStatus;
  signedAt?: Date;
  viewedAt?: Date;
  declinedReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignatureRequest {
  id: string;
  tenantId: string;
  documentId: string;
  documentName: string;
  provider: SignatureProvider;
  status: SignatureStatus;
  signers: Signer[];
  message?: string;
  subject?: string;
  expiresAt?: Date;
  reminders?: {
    enabled: boolean;
    intervalDays: number;
    maxReminders: number;
    sentCount: number;
    lastSentAt?: Date;
  };
  settings: SignatureSettings;
  auditTrail: AuditEvent[];
  completedDocumentUrl?: string;
  certificateUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SignatureSettings {
  sequentialSigning: boolean;
  allowDecline: boolean;
  allowReassign: boolean;
  enforceSignerOrder: boolean;
  requireAccessCode: boolean;
  attachCertificate: boolean;
  embedSignatures: boolean;
  brandingEnabled: boolean;
  brandingLogo?: string;
  brandingColor?: string;
  redirectUrl?: string;
  callbackUrl?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  actorEmail?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface SignatureTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  documentId?: string;
  roles: Array<{
    name: string;
    role: SignerRole;
    order: number;
  }>;
  fields: Array<Omit<SignatureField, 'signerId'> & { roleName: string }>;
  additionalFields: Array<Omit<AdditionalField, 'signerId'> & { roleName: string }>;
  settings: SignatureSettings;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignatureCertificate {
  id: string;
  requestId: string;
  documentHash: string;
  algorithm: string;
  issuedAt: Date;
  validUntil: Date;
  signers: Array<{
    name: string;
    email: string;
    signedAt: Date;
    signatureHash: string;
  }>;
  verificationUrl: string;
  certificateData: string;
}

// =================== SERVICE ===================

@Injectable()
export class ESignatureService {
  private requests: Map<string, SignatureRequest> = new Map();
  private templates: Map<string, SignatureTemplate> = new Map();
  private certificates: Map<string, SignatureCertificate> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== SIGNATURE REQUESTS ===================

  async createSignatureRequest(data: {
    tenantId: string;
    documentId: string;
    documentName: string;
    provider?: SignatureProvider;
    signers: Array<{
      name: string;
      email: string;
      phone?: string;
      role?: SignerRole;
      order?: number;
      authMethod?: Signer['authMethod'];
    }>;
    message?: string;
    subject?: string;
    expiresInDays?: number;
    settings?: Partial<SignatureSettings>;
    createdBy: string;
  }): Promise<SignatureRequest> {
    const id = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defaultSettings: SignatureSettings = {
      sequentialSigning: false,
      allowDecline: true,
      allowReassign: false,
      enforceSignerOrder: false,
      requireAccessCode: false,
      attachCertificate: true,
      embedSignatures: true,
      brandingEnabled: true,
    };

    const signers: Signer[] = data.signers.map((s, index) => ({
      id: `signer-${Date.now()}-${index}`,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role || 'signer',
      order: s.order ?? index + 1,
      authMethod: s.authMethod || 'email',
      fields: [],
      additionalFields: [],
      status: 'pending',
    }));

    const request: SignatureRequest = {
      id,
      tenantId: data.tenantId,
      documentId: data.documentId,
      documentName: data.documentName,
      provider: data.provider || 'internal',
      status: 'pending',
      signers,
      message: data.message,
      subject: data.subject || `Please sign: ${data.documentName}`,
      expiresAt: data.expiresInDays
        ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      reminders: {
        enabled: true,
        intervalDays: 3,
        maxReminders: 3,
        sentCount: 0,
      },
      settings: { ...defaultSettings, ...data.settings },
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          action: 'created',
          actor: data.createdBy,
          details: { signerCount: signers.length },
        },
      ],
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.requests.set(id, request);

    this.eventEmitter.emit('esignature.request.created', { request });

    return request;
  }

  async getSignatureRequest(id: string): Promise<SignatureRequest | null> {
    return this.requests.get(id) || null;
  }

  async getSignatureRequests(
    tenantId: string,
    filters?: {
      status?: SignatureStatus;
      documentId?: string;
      createdBy?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      limit?: number;
    },
  ): Promise<SignatureRequest[]> {
    let requests = Array.from(this.requests.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }

    if (filters?.documentId) {
      requests = requests.filter((r) => r.documentId === filters.documentId);
    }

    if (filters?.createdBy) {
      requests = requests.filter((r) => r.createdBy === filters.createdBy);
    }

    if (filters?.startDate) {
      requests = requests.filter((r) => r.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      requests = requests.filter((r) => r.createdAt <= filters.endDate!);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      requests = requests.filter(
        (r) =>
          r.documentName.toLowerCase().includes(search) ||
          r.signers.some((s) => s.name.toLowerCase().includes(search) || s.email.toLowerCase().includes(search)),
      );
    }

    requests = requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      requests = requests.slice(0, filters.limit);
    }

    return requests;
  }

  // =================== SIGNATURE FIELDS ===================

  async addSignatureField(
    requestId: string,
    signerId: string,
    field: Omit<SignatureField, 'id' | 'signerId'>,
  ): Promise<SignatureField> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find((s) => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    const signatureField: SignatureField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...field,
      signerId,
    };

    signer.fields.push(signatureField);
    request.updatedAt = new Date();

    this.addAuditEvent(request, 'field_added', request.createdBy, {
      fieldType: field.type,
      signerEmail: signer.email,
    });

    return signatureField;
  }

  async addAdditionalField(
    requestId: string,
    signerId: string,
    field: Omit<AdditionalField, 'id' | 'signerId'>,
  ): Promise<AdditionalField> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find((s) => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    const additionalField: AdditionalField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...field,
      signerId,
    };

    signer.additionalFields.push(additionalField);
    request.updatedAt = new Date();

    return additionalField;
  }

  // =================== SENDING & SIGNING ===================

  async sendForSignature(requestId: string, userId: string): Promise<SignatureRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already sent');
    }

    // Validate all signers have at least one signature field
    for (const signer of request.signers) {
      if (signer.role === 'signer' && signer.fields.length === 0) {
        throw new Error(`Signer ${signer.name} has no signature fields`);
      }
    }

    request.status = 'sent';
    request.updatedAt = new Date();

    // Update signer statuses
    const firstSigners = request.settings.sequentialSigning
      ? request.signers.filter((s) => s.order === 1)
      : request.signers;

    for (const signer of firstSigners) {
      signer.status = 'sent';
    }

    this.addAuditEvent(request, 'sent', userId, {
      signerCount: request.signers.length,
    });

    this.eventEmitter.emit('esignature.request.sent', { request });

    // Simulate sending emails to signers
    for (const signer of firstSigners) {
      this.eventEmitter.emit('esignature.notification.send', {
        requestId: request.id,
        signer,
        type: 'signing_request',
      });
    }

    return request;
  }

  async recordSignerView(requestId: string, signerId: string, metadata: { ipAddress?: string; userAgent?: string }): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find((s) => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    if (!signer.viewedAt) {
      signer.viewedAt = new Date();
      signer.status = 'viewed';

      this.addAuditEvent(request, 'viewed', signer.name, {
        signerEmail: signer.email,
        ...metadata,
      });

      this.eventEmitter.emit('esignature.document.viewed', {
        requestId: request.id,
        signer,
      });
    }
  }

  async signDocument(
    requestId: string,
    signerId: string,
    signatures: Array<{
      fieldId: string;
      value: string;
      timestamp: Date;
    }>,
    fieldValues?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<SignatureRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find((s) => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    if (signer.status === 'signed') {
      throw new Error('Already signed');
    }

    // Validate all required fields are signed
    const requiredFields = signer.fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!signatures.find((s) => s.fieldId === field.id)) {
        throw new Error(`Required field ${field.id} not signed`);
      }
    }

    // Record signature
    signer.signedAt = new Date();
    signer.status = 'signed';
    signer.ipAddress = metadata?.ipAddress;
    signer.userAgent = metadata?.userAgent;

    this.addAuditEvent(request, 'signed', signer.name, {
      signerEmail: signer.email,
      fieldsCount: signatures.length,
      ...metadata,
    });

    // Check if all signers have signed
    const allSigned = request.signers
      .filter((s) => s.role === 'signer')
      .every((s) => s.status === 'signed');

    if (allSigned) {
      await this.completeRequest(request);
    } else if (request.settings.sequentialSigning) {
      // Send to next signer in sequence
      const nextOrder = signer.order + 1;
      const nextSigners = request.signers.filter((s) => s.order === nextOrder);

      for (const nextSigner of nextSigners) {
        nextSigner.status = 'sent';
        this.eventEmitter.emit('esignature.notification.send', {
          requestId: request.id,
          signer: nextSigner,
          type: 'signing_request',
        });
      }
    }

    request.updatedAt = new Date();

    this.eventEmitter.emit('esignature.document.signed', {
      request,
      signer,
    });

    return request;
  }

  async declineToSign(
    requestId: string,
    signerId: string,
    reason?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<SignatureRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    if (!request.settings.allowDecline) {
      throw new Error('Declining is not allowed for this request');
    }

    const signer = request.signers.find((s) => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    signer.status = 'declined';
    signer.declinedReason = reason;
    request.status = 'declined';
    request.updatedAt = new Date();

    this.addAuditEvent(request, 'declined', signer.name, {
      signerEmail: signer.email,
      reason,
      ...metadata,
    });

    this.eventEmitter.emit('esignature.request.declined', {
      request,
      signer,
      reason,
    });

    return request;
  }

  private async completeRequest(request: SignatureRequest): Promise<void> {
    request.status = 'signed';
    request.completedAt = new Date();

    // Generate certificate
    const certificate = await this.generateCertificate(request);
    request.certificateUrl = `/api/esignature/certificates/${certificate.id}`;

    this.addAuditEvent(request, 'completed', 'system', {
      certificateId: certificate.id,
    });

    this.eventEmitter.emit('esignature.request.completed', { request, certificate });
  }

  // =================== CANCELLATION ===================

  async cancelRequest(requestId: string, userId: string, reason?: string): Promise<SignatureRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    if (request.status === 'signed' || request.status === 'cancelled') {
      throw new Error('Cannot cancel this request');
    }

    request.status = 'cancelled';
    request.updatedAt = new Date();

    for (const signer of request.signers) {
      if (signer.status !== 'signed') {
        signer.status = 'cancelled';
      }
    }

    this.addAuditEvent(request, 'cancelled', userId, { reason });

    this.eventEmitter.emit('esignature.request.cancelled', { request, reason });

    return request;
  }

  // =================== REMINDERS ===================

  async sendReminder(requestId: string, signerId?: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const pendingSigners = signerId
      ? request.signers.filter((s) => s.id === signerId && s.status !== 'signed')
      : request.signers.filter((s) => s.status === 'sent' || s.status === 'viewed');

    for (const signer of pendingSigners) {
      this.eventEmitter.emit('esignature.notification.send', {
        requestId: request.id,
        signer,
        type: 'reminder',
      });
    }

    if (request.reminders) {
      request.reminders.sentCount++;
      request.reminders.lastSentAt = new Date();
    }

    this.addAuditEvent(request, 'reminder_sent', request.createdBy, {
      signerCount: pendingSigners.length,
    });
  }

  // =================== CERTIFICATES ===================

  private async generateCertificate(request: SignatureRequest): Promise<SignatureCertificate> {
    const id = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const certificate: SignatureCertificate = {
      id,
      requestId: request.id,
      documentHash: this.generateHash(`${request.documentId}-${Date.now()}`),
      algorithm: 'SHA-256',
      issuedAt: new Date(),
      validUntil: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
      signers: request.signers
        .filter((s) => s.status === 'signed')
        .map((s) => ({
          name: s.name,
          email: s.email,
          signedAt: s.signedAt!,
          signatureHash: this.generateHash(`${s.id}-${s.signedAt?.toISOString()}`),
        })),
      verificationUrl: `/api/esignature/verify/${id}`,
      certificateData: this.buildCertificateData(request),
    };

    this.certificates.set(id, certificate);

    return certificate;
  }

  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  private buildCertificateData(request: SignatureRequest): string {
    return JSON.stringify({
      documentId: request.documentId,
      documentName: request.documentName,
      signedAt: request.completedAt,
      signers: request.signers
        .filter((s) => s.status === 'signed')
        .map((s) => ({
          name: s.name,
          email: s.email,
          signedAt: s.signedAt,
        })),
    });
  }

  async getCertificate(id: string): Promise<SignatureCertificate | null> {
    return this.certificates.get(id) || null;
  }

  async verifyCertificate(id: string): Promise<{
    valid: boolean;
    certificate?: SignatureCertificate;
    request?: SignatureRequest;
    message: string;
  }> {
    const certificate = this.certificates.get(id);
    if (!certificate) {
      return { valid: false, message: 'Certificate not found' };
    }

    if (new Date() > certificate.validUntil) {
      return {
        valid: false,
        certificate,
        message: 'Certificate has expired',
      };
    }

    const request = this.requests.get(certificate.requestId);

    return {
      valid: true,
      certificate,
      request: request || undefined,
      message: 'Certificate is valid',
    };
  }

  // =================== TEMPLATES ===================

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    documentId?: string;
    roles: SignatureTemplate['roles'];
    fields?: SignatureTemplate['fields'];
    additionalFields?: SignatureTemplate['additionalFields'];
    settings?: Partial<SignatureSettings>;
    createdBy: string;
  }): Promise<SignatureTemplate> {
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defaultSettings: SignatureSettings = {
      sequentialSigning: false,
      allowDecline: true,
      allowReassign: false,
      enforceSignerOrder: false,
      requireAccessCode: false,
      attachCertificate: true,
      embedSignatures: true,
      brandingEnabled: true,
    };

    const template: SignatureTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      documentId: data.documentId,
      roles: data.roles,
      fields: data.fields || [],
      additionalFields: data.additionalFields || [],
      settings: { ...defaultSettings, ...data.settings },
      isActive: true,
      usageCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  async getTemplates(
    tenantId: string,
    filters?: {
      search?: string;
      isActive?: boolean;
    },
  ): Promise<SignatureTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    if (filters?.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          (t.description && t.description.toLowerCase().includes(search)),
      );
    }

    return templates;
  }

  async getTemplate(id: string): Promise<SignatureTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createRequestFromTemplate(
    templateId: string,
    data: {
      tenantId: string;
      documentId: string;
      documentName: string;
      signers: Array<{
        roleName: string;
        name: string;
        email: string;
        phone?: string;
      }>;
      message?: string;
      subject?: string;
      createdBy: string;
    },
  ): Promise<SignatureRequest> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Map signers to roles
    const mappedSigners = data.signers.map((s) => {
      const role = template.roles.find((r) => r.name === s.roleName);
      if (!role) {
        throw new Error(`Role ${s.roleName} not found in template`);
      }
      return {
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: role.role,
        order: role.order,
      };
    });

    const request = await this.createSignatureRequest({
      tenantId: data.tenantId,
      documentId: data.documentId,
      documentName: data.documentName,
      signers: mappedSigners,
      message: data.message,
      subject: data.subject,
      settings: template.settings,
      createdBy: data.createdBy,
    });

    // Add fields from template
    for (const signer of request.signers) {
      const role = template.roles.find((r) => r.order === signer.order);
      if (!role) continue;

      const signerFields = template.fields.filter((f) => f.roleName === role.name);
      for (const field of signerFields) {
        await this.addSignatureField(request.id, signer.id, {
          type: field.type,
          page: field.page,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          required: field.required,
          label: field.label,
          placeholder: field.placeholder,
        });
      }

      const additionalFields = template.additionalFields.filter((f) => f.roleName === role.name);
      for (const field of additionalFields) {
        await this.addAdditionalField(request.id, signer.id, {
          type: field.type,
          page: field.page,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          required: field.required,
          label: field.label,
          defaultValue: field.defaultValue,
          options: field.options,
        });
      }
    }

    // Update template usage count
    template.usageCount++;
    this.templates.set(templateId, template);

    return request;
  }

  // =================== AUDIT TRAIL ===================

  private addAuditEvent(
    request: SignatureRequest,
    action: string,
    actor: string,
    details?: Record<string, any>,
  ): void {
    request.auditTrail.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      actor,
      details,
      ipAddress: details?.ipAddress,
      userAgent: details?.userAgent,
    });
  }

  async getAuditTrail(requestId: string): Promise<AuditEvent[]> {
    const request = this.requests.get(requestId);
    if (!request) {
      return [];
    }
    return request.auditTrail;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalRequests: number;
    byStatus: Record<string, number>;
    completionRate: number;
    averageCompletionTime: number;
    recentActivity: SignatureRequest[];
  }> {
    const requests = await this.getSignatureRequests(tenantId);

    const byStatus: Record<string, number> = {};
    let completedCount = 0;
    let totalCompletionTime = 0;

    for (const request of requests) {
      byStatus[request.status] = (byStatus[request.status] || 0) + 1;

      if (request.status === 'signed' && request.completedAt) {
        completedCount++;
        totalCompletionTime += request.completedAt.getTime() - request.createdAt.getTime();
      }
    }

    return {
      totalRequests: requests.length,
      byStatus,
      completionRate: requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0,
      averageCompletionTime: completedCount > 0 ? Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60)) : 0, // hours
      recentActivity: requests.slice(0, 10),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export interface EAuditExportConfig {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  format: 'xml' | 'json' | 'csv' | 'oecd-saf-t';
  includeAttachments?: boolean;
  includeSignatures?: boolean;
  language?: string;
  auditStandard?: 'iso27001' | 'soc2' | 'gdpr' | 'anaf' | 'all';
}

export interface EAuditRecord {
  id: string;
  timestamp: Date;
  eventType: string;
  entity: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changes?: Array<{ field: string; from: any; to: any }>;
  metadata?: Record<string, any>;
  hash: string;
  previousHash?: string;
  signature?: string;
}

export interface EAuditExport {
  id: string;
  tenantId: string;
  exportedAt: Date;
  config: EAuditExportConfig;
  recordCount: number;
  fileSize: number;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  checksum: string;
  signedBy?: string;
  certificate?: string;
}

export interface AuditChainIntegrity {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  firstRecord?: Date;
  lastRecord?: Date;
  gaps: Array<{ from: Date; to: Date; missingRecords: number }>;
  errors: string[];
}

@Injectable()
export class EAuditExporterService {
  private readonly logger = new Logger(EAuditExporterService.name);

  // In-memory storage for demo
  private exports: Map<string, EAuditExport> = new Map();
  private auditRecords: Map<string, EAuditRecord[]> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const tenantId = 'tenant_demo';
    const records: EAuditRecord[] = [];

    // Generate sample audit records
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT'];
    const entities = ['invoice', 'client', 'payment', 'user', 'document', 'report'];

    let previousHash = '';

    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(Date.now() - i * 3600000);
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entity = entities[Math.floor(Math.random() * entities.length)];

      const record: EAuditRecord = {
        id: `audit_${crypto.randomBytes(12).toString('hex')}`,
        timestamp,
        eventType: `${entity}.${action.toLowerCase()}`,
        entity,
        entityId: `${entity}_${Math.floor(Math.random() * 1000)}`,
        action,
        userId: `user_${Math.floor(Math.random() * 10)}`,
        userName: `User ${Math.floor(Math.random() * 10)}`,
        userRole: ['admin', 'accountant', 'user'][Math.floor(Math.random() * 3)],
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        sessionId: `sess_${crypto.randomBytes(8).toString('hex')}`,
        metadata: { source: 'web', version: '1.0' },
        hash: '',
        previousHash,
      };

      // Calculate hash
      record.hash = this.calculateRecordHash(record);
      previousHash = record.hash;

      records.push(record);
    }

    this.auditRecords.set(tenantId, records.reverse());
  }

  private calculateRecordHash(record: Omit<EAuditRecord, 'hash'>): string {
    const data = JSON.stringify({
      id: record.id,
      timestamp: record.timestamp,
      eventType: record.eventType,
      entity: record.entity,
      entityId: record.entityId,
      action: record.action,
      userId: record.userId,
      previousHash: record.previousHash,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async exportAuditTrail(config: EAuditExportConfig): Promise<EAuditExport> {
    const exportId = `export_${crypto.randomBytes(12).toString('hex')}`;

    const exportRecord: EAuditExport = {
      id: exportId,
      tenantId: config.tenantId,
      exportedAt: new Date(),
      config,
      recordCount: 0,
      fileSize: 0,
      format: config.format,
      status: 'processing',
      checksum: '',
    };

    this.exports.set(exportId, exportRecord);

    try {
      // Get audit records for the period
      const records = await this.getAuditRecords(config);

      // Generate export based on format
      let content: string;
      switch (config.format) {
        case 'xml':
          content = this.generateXMLExport(records, config);
          break;
        case 'oecd-saf-t':
          content = this.generateSAFTAuditFile(records, config);
          break;
        case 'csv':
          content = this.generateCSVExport(records);
          break;
        case 'json':
        default:
          content = this.generateJSONExport(records, config);
      }

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      exportRecord.recordCount = records.length;
      exportRecord.fileSize = Buffer.byteLength(content, 'utf8');
      exportRecord.status = 'completed';
      exportRecord.checksum = checksum;
      exportRecord.downloadUrl = `/api/v1/compliance/exports/${exportId}/download`;
      exportRecord.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      this.exports.set(exportId, exportRecord);

      this.eventEmitter.emit('audit.exported', {
        exportId,
        tenantId: config.tenantId,
        recordCount: records.length,
        format: config.format,
      });

      this.logger.log(`E-Audit export ${exportId} completed: ${records.length} records`);

      return exportRecord;
    } catch (error: any) {
      exportRecord.status = 'failed';
      this.exports.set(exportId, exportRecord);
      throw error;
    }
  }

  private async getAuditRecords(config: EAuditExportConfig): Promise<EAuditRecord[]> {
    const records = this.auditRecords.get(config.tenantId) || [];

    return records.filter(r =>
      r.timestamp >= config.startDate &&
      r.timestamp <= config.endDate
    );
  }

  private generateXMLExport(records: EAuditRecord[], config: EAuditExportConfig): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:documentiulia:e-audit:1.0">
  <Header>
    <AuditFileVersion>1.0</AuditFileVersion>
    <TenantID>${config.tenantId}</TenantID>
    <SelectionCriteria>
      <SelectionStartDate>${config.startDate.toISOString()}</SelectionStartDate>
      <SelectionEndDate>${config.endDate.toISOString()}</SelectionEndDate>
    </SelectionCriteria>
    <TotalRecords>${records.length}</TotalRecords>
    <DateCreated>${new Date().toISOString()}</DateCreated>
    <AuditStandard>${config.auditStandard || 'all'}</AuditStandard>
  </Header>
  <AuditRecords>
`;

    for (const record of records) {
      xml += `    <AuditRecord>
      <RecordID>${record.id}</RecordID>
      <Timestamp>${record.timestamp.toISOString()}</Timestamp>
      <EventType>${record.eventType}</EventType>
      <Entity>${record.entity}</Entity>
      <EntityID>${record.entityId}</EntityID>
      <Action>${record.action}</Action>
      <User>
        <UserID>${record.userId}</UserID>
        <UserName>${record.userName}</UserName>
        <Role>${record.userRole}</Role>
      </User>
      <Source>
        <IPAddress>${record.ipAddress}</IPAddress>
        <SessionID>${record.sessionId || ''}</SessionID>
      </Source>
      <Integrity>
        <Hash>${record.hash}</Hash>
        <PreviousHash>${record.previousHash || ''}</PreviousHash>
      </Integrity>
    </AuditRecord>
`;
    }

    xml += `  </AuditRecords>
</AuditFile>`;

    return xml;
  }

  private generateSAFTAuditFile(records: EAuditRecord[], config: EAuditExportConfig): string {
    // OECD SAF-T Standard Audit File format
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Audit:1.00" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <AuditFileVersion>1.00_01</AuditFileVersion>
    <AuditFileSender>
      <TaxID>${config.tenantId}</TaxID>
      <SenderName>DocumentIulia Platform</SenderName>
    </AuditFileSender>
    <SelectionCriteria>
      <SelectionStartDate>${config.startDate.toISOString().split('T')[0]}</SelectionStartDate>
      <SelectionEndDate>${config.endDate.toISOString().split('T')[0]}</SelectionEndDate>
    </SelectionCriteria>
    <TaxAccountingBasis>Invoice</TaxAccountingBasis>
    <NumberOfEntries>${records.length}</NumberOfEntries>
  </Header>
  <SourceDocuments>
    <AuditTrail>
${records.map(r => `      <AuditEntry>
        <RecordID>${r.id}</RecordID>
        <Period>${r.timestamp.toISOString().split('T')[0]}</Period>
        <TransactionDate>${r.timestamp.toISOString()}</TransactionDate>
        <TransactionType>${r.action}</TransactionType>
        <Description>${r.eventType}</Description>
        <UserID>${r.userId}</UserID>
        <SourceID>${r.ipAddress}</SourceID>
        <Hash>${r.hash}</Hash>
      </AuditEntry>`).join('\n')}
    </AuditTrail>
  </SourceDocuments>
</AuditFile>`;
  }

  private generateCSVExport(records: EAuditRecord[]): string {
    const headers = [
      'Record ID', 'Timestamp', 'Event Type', 'Entity', 'Entity ID',
      'Action', 'User ID', 'User Name', 'Role', 'IP Address',
      'Session ID', 'Hash', 'Previous Hash'
    ];

    const rows = records.map(r => [
      r.id,
      r.timestamp.toISOString(),
      r.eventType,
      r.entity,
      r.entityId,
      r.action,
      r.userId,
      r.userName,
      r.userRole,
      r.ipAddress,
      r.sessionId || '',
      r.hash,
      r.previousHash || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');
  }

  private generateJSONExport(records: EAuditRecord[], config: EAuditExportConfig): string {
    return JSON.stringify({
      auditFile: {
        version: '1.0',
        tenantId: config.tenantId,
        exportedAt: new Date().toISOString(),
        selectionCriteria: {
          startDate: config.startDate.toISOString(),
          endDate: config.endDate.toISOString(),
          auditStandard: config.auditStandard,
        },
        totalRecords: records.length,
        records,
      }
    }, null, 2);
  }

  async verifyChainIntegrity(tenantId: string): Promise<AuditChainIntegrity> {
    const records = this.auditRecords.get(tenantId) || [];
    const errors: string[] = [];
    let validCount = 0;
    let invalidCount = 0;
    const gaps: Array<{ from: Date; to: Date; missingRecords: number }> = [];

    let previousHash = '';
    let previousTimestamp: Date | null = null;

    for (const record of records) {
      // Verify hash
      const { hash: _h, ...recordWithoutHash } = record;
      const calculatedHash = this.calculateRecordHash(recordWithoutHash);

      if (calculatedHash !== record.hash) {
        errors.push(`Record ${record.id}: Hash mismatch`);
        invalidCount++;
        continue;
      }

      // Verify chain linkage
      if (previousHash && record.previousHash !== previousHash) {
        errors.push(`Record ${record.id}: Chain break detected`);
        invalidCount++;
        continue;
      }

      // Check for time gaps (more than 24 hours between records)
      if (previousTimestamp) {
        const gap = record.timestamp.getTime() - previousTimestamp.getTime();
        if (gap > 24 * 60 * 60 * 1000) {
          gaps.push({
            from: previousTimestamp,
            to: record.timestamp,
            missingRecords: Math.floor(gap / (60 * 60 * 1000)), // Estimate
          });
        }
      }

      validCount++;
      previousHash = record.hash;
      previousTimestamp = record.timestamp;
    }

    return {
      isValid: invalidCount === 0 && gaps.length === 0,
      totalRecords: records.length,
      validRecords: validCount,
      invalidRecords: invalidCount,
      firstRecord: records[0]?.timestamp,
      lastRecord: records[records.length - 1]?.timestamp,
      gaps,
      errors,
    };
  }

  async getExport(exportId: string): Promise<EAuditExport | null> {
    return this.exports.get(exportId) || null;
  }

  async getExportHistory(tenantId: string): Promise<EAuditExport[]> {
    return Array.from(this.exports.values())
      .filter(e => e.tenantId === tenantId)
      .sort((a, b) => b.exportedAt.getTime() - a.exportedAt.getTime());
  }

  async signExport(exportId: string, signedBy: string, certificate: string): Promise<EAuditExport | null> {
    const exportRecord = this.exports.get(exportId);
    if (!exportRecord) return null;

    exportRecord.signedBy = signedBy;
    exportRecord.certificate = certificate;

    this.exports.set(exportId, exportRecord);

    return exportRecord;
  }

  async getAuditStats(tenantId: string): Promise<{
    totalRecords: number;
    todayRecords: number;
    weekRecords: number;
    monthRecords: number;
    byEntity: Record<string, number>;
    byAction: Record<string, number>;
    byUser: Record<string, number>;
    chainIntegrity: AuditChainIntegrity;
  }> {
    const records = this.auditRecords.get(tenantId) || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byEntity: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    for (const record of records) {
      byEntity[record.entity] = (byEntity[record.entity] || 0) + 1;
      byAction[record.action] = (byAction[record.action] || 0) + 1;
      byUser[record.userId] = (byUser[record.userId] || 0) + 1;

      if (record.timestamp >= today) todayCount++;
      if (record.timestamp >= weekAgo) weekCount++;
      if (record.timestamp >= monthAgo) monthCount++;
    }

    const chainIntegrity = await this.verifyChainIntegrity(tenantId);

    return {
      totalRecords: records.length,
      todayRecords: todayCount,
      weekRecords: weekCount,
      monthRecords: monthCount,
      byEntity,
      byAction,
      byUser,
      chainIntegrity,
    };
  }
}

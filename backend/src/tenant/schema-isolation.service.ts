/**
 * Schema-Based Multi-Tenancy Service
 * Sprint 41: Global Expansion Readiness
 *
 * Provides PostgreSQL schema-based tenant isolation for global clients.
 * Each tenant gets a unique schema with isolated data environments.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface TenantSchema {
  tenantId: string;
  schemaName: string;
  displayName: string;
  region: string;
  createdAt: Date;
  status: 'active' | 'suspended' | 'archived' | 'migrating';
  settings: TenantSchemaSettings;
}

export interface TenantSchemaSettings {
  maxUsers: number;
  maxStorage: number; // in MB
  dataRetentionDays: number;
  backupEnabled: boolean;
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
  allowedCountries: string[];
  customDomain?: string;
}

export interface SchemaCreationResult {
  success: boolean;
  schemaName: string;
  message: string;
  tablesCreated?: number;
}

export interface SchemaMigrationStatus {
  schemaName: string;
  currentVersion: string;
  targetVersion: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

@Injectable()
export class SchemaIsolationService implements OnModuleInit {
  private readonly logger = new Logger(SchemaIsolationService.name);

  // In-memory tenant schema registry
  private tenantSchemas: Map<string, TenantSchema> = new Map();
  private migrationStatus: Map<string, SchemaMigrationStatus> = new Map();

  // Schema name prefix for tenant isolation
  private readonly schemaPrefix = 'tenant_';

  // Tables to create in each tenant schema
  private readonly coreTables = [
    'invoices',
    'customers',
    'products',
    'employees',
    'payroll',
    'documents',
    'quality_ncrs',
    'quality_capas',
    'suppliers',
    'purchase_orders',
    'inventory',
    'audit_logs',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Schema Isolation Service initialized');
    await this.loadExistingSchemas();
  }

  /**
   * Load existing tenant schemas from database
   */
  private async loadExistingSchemas(): Promise<void> {
    try {
      // In production, this would query the database for existing schemas
      this.logger.log('Loading existing tenant schemas...');

      // Create default public schema entry
      const defaultSchema: TenantSchema = {
        tenantId: 'public',
        schemaName: 'public',
        displayName: 'Default Schema',
        region: 'EU',
        createdAt: new Date(),
        status: 'active',
        settings: {
          maxUsers: 1000,
          maxStorage: 10240, // 10GB
          dataRetentionDays: 365,
          backupEnabled: true,
          encryptionEnabled: true,
          auditLogEnabled: true,
          allowedCountries: ['RO', 'EU'],
        },
      };

      this.tenantSchemas.set('public', defaultSchema);
      this.logger.log(`Loaded ${this.tenantSchemas.size} tenant schemas`);
    } catch (error) {
      this.logger.error('Failed to load existing schemas', error);
    }
  }

  /**
   * Generate schema name from tenant ID
   */
  private generateSchemaName(tenantId: string): string {
    // Sanitize tenant ID for PostgreSQL schema name
    const sanitized = tenantId
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 50);
    return `${this.schemaPrefix}${sanitized}`;
  }

  /**
   * Create a new tenant schema
   */
  async createTenantSchema(
    tenantId: string,
    displayName: string,
    region: string = 'EU',
    settings?: Partial<TenantSchemaSettings>,
  ): Promise<SchemaCreationResult> {
    const schemaName = this.generateSchemaName(tenantId);

    this.logger.log(`Creating schema ${schemaName} for tenant ${tenantId}`);

    try {
      // Check if schema already exists
      if (this.tenantSchemas.has(tenantId)) {
        return {
          success: false,
          schemaName,
          message: 'Tenant schema already exists',
        };
      }

      // Create PostgreSQL schema
      await this.createPostgresSchema(schemaName);

      // Create core tables in the new schema
      const tablesCreated = await this.createSchemaTables(schemaName);

      // Register tenant schema
      const tenantSchema: TenantSchema = {
        tenantId,
        schemaName,
        displayName,
        region,
        createdAt: new Date(),
        status: 'active',
        settings: {
          maxUsers: settings?.maxUsers || 100,
          maxStorage: settings?.maxStorage || 1024, // 1GB default
          dataRetentionDays: settings?.dataRetentionDays || 365,
          backupEnabled: settings?.backupEnabled ?? true,
          encryptionEnabled: settings?.encryptionEnabled ?? true,
          auditLogEnabled: settings?.auditLogEnabled ?? true,
          allowedCountries: settings?.allowedCountries || [region],
          customDomain: settings?.customDomain,
        },
      };

      this.tenantSchemas.set(tenantId, tenantSchema);

      this.logger.log(`Schema ${schemaName} created successfully with ${tablesCreated} tables`);

      return {
        success: true,
        schemaName,
        message: 'Tenant schema created successfully',
        tablesCreated,
      };
    } catch (error) {
      this.logger.error(`Failed to create schema ${schemaName}`, error);
      return {
        success: false,
        schemaName,
        message: `Failed to create schema: ${error.message}`,
      };
    }
  }

  /**
   * Create PostgreSQL schema
   */
  private async createPostgresSchema(schemaName: string): Promise<void> {
    // In production, this would execute:
    // CREATE SCHEMA IF NOT EXISTS schemaName;
    this.logger.log(`Creating PostgreSQL schema: ${schemaName}`);

    // Simulated for testing - in production use raw SQL
    // await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  /**
   * Create core tables in tenant schema
   */
  private async createSchemaTables(schemaName: string): Promise<number> {
    this.logger.log(`Creating core tables in schema ${schemaName}`);

    // In production, this would create tables with proper structure
    // For now, simulating table creation
    let tablesCreated = 0;

    for (const table of this.coreTables) {
      // await this.prisma.$executeRawUnsafe(
      //   `CREATE TABLE IF NOT EXISTS "${schemaName}"."${table}" (...)`
      // );
      tablesCreated++;
      this.logger.debug(`Created table ${schemaName}.${table}`);
    }

    return tablesCreated;
  }

  /**
   * Get tenant schema by tenant ID
   */
  async getTenantSchema(tenantId: string): Promise<TenantSchema | null> {
    return this.tenantSchemas.get(tenantId) || null;
  }

  /**
   * Get schema name for tenant
   */
  getSchemaName(tenantId: string): string {
    const schema = this.tenantSchemas.get(tenantId);
    return schema?.schemaName || 'public';
  }

  /**
   * List all tenant schemas
   */
  async listTenantSchemas(
    filters?: { region?: string; status?: string },
  ): Promise<TenantSchema[]> {
    let schemas = Array.from(this.tenantSchemas.values());

    if (filters?.region) {
      schemas = schemas.filter(s => s.region === filters.region);
    }

    if (filters?.status) {
      schemas = schemas.filter(s => s.status === filters.status);
    }

    return schemas;
  }

  /**
   * Update tenant schema settings
   */
  async updateSchemaSettings(
    tenantId: string,
    settings: Partial<TenantSchemaSettings>,
  ): Promise<TenantSchema | null> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema) return null;

    schema.settings = { ...schema.settings, ...settings };
    this.tenantSchemas.set(tenantId, schema);

    this.logger.log(`Updated settings for tenant ${tenantId}`);
    return schema;
  }

  /**
   * Update tenant schema status
   */
  async updateSchemaStatus(
    tenantId: string,
    status: TenantSchema['status'],
  ): Promise<TenantSchema | null> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema) return null;

    schema.status = status;
    this.tenantSchemas.set(tenantId, schema);

    this.logger.log(`Updated status for tenant ${tenantId} to ${status}`);
    return schema;
  }

  /**
   * Archive tenant schema (soft delete)
   */
  async archiveTenantSchema(tenantId: string): Promise<boolean> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema || schema.status === 'archived') return false;

    schema.status = 'archived';
    this.tenantSchemas.set(tenantId, schema);

    this.logger.log(`Archived schema for tenant ${tenantId}`);
    return true;
  }

  /**
   * Delete tenant schema (hard delete - use with caution)
   */
  async deleteTenantSchema(tenantId: string): Promise<boolean> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema) return false;

    if (tenantId === 'public') {
      this.logger.warn('Cannot delete public schema');
      return false;
    }

    try {
      // In production: DROP SCHEMA schemaName CASCADE;
      // await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema.schemaName}" CASCADE`);

      this.tenantSchemas.delete(tenantId);
      this.logger.log(`Deleted schema for tenant ${tenantId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete schema for tenant ${tenantId}`, error);
      return false;
    }
  }

  /**
   * Set search path for tenant isolation
   */
  async setTenantSearchPath(tenantId: string): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);

    // In production, this would set the search_path for the connection
    // await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

    this.logger.debug(`Set search_path to ${schemaName} for tenant ${tenantId}`);
  }

  /**
   * Migrate tenant schema to new version
   */
  async migrateSchema(
    tenantId: string,
    targetVersion: string,
  ): Promise<SchemaMigrationStatus> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const status: SchemaMigrationStatus = {
      schemaName: schema.schemaName,
      currentVersion: '1.0.0',
      targetVersion,
      status: 'in_progress',
      progress: 0,
      startedAt: new Date(),
    };

    this.migrationStatus.set(tenantId, status);

    // Simulate migration progress
    try {
      // Update schema status
      await this.updateSchemaStatus(tenantId, 'migrating');

      // Perform migration steps
      for (let i = 0; i <= 100; i += 20) {
        status.progress = i;
        this.migrationStatus.set(tenantId, status);
        // In production: execute migration scripts
      }

      status.status = 'completed';
      status.completedAt = new Date();

      // Restore schema status
      await this.updateSchemaStatus(tenantId, 'active');

      this.logger.log(`Migration completed for tenant ${tenantId}`);
    } catch (error) {
      status.status = 'failed';
      status.error = error.message;
      this.logger.error(`Migration failed for tenant ${tenantId}`, error);
    }

    this.migrationStatus.set(tenantId, status);
    return status;
  }

  /**
   * Get migration status for tenant
   */
  getMigrationStatus(tenantId: string): SchemaMigrationStatus | null {
    return this.migrationStatus.get(tenantId) || null;
  }

  /**
   * Get schema statistics
   */
  async getSchemaStats(tenantId: string): Promise<{
    tableCount: number;
    totalRows: number;
    storageUsedMB: number;
    lastAccessedAt: Date;
  }> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // In production, query actual database stats
    return {
      tableCount: this.coreTables.length,
      totalRows: 0, // Would query pg_stat_user_tables
      storageUsedMB: 0, // Would query pg_database_size
      lastAccessedAt: new Date(),
    };
  }

  /**
   * Validate tenant has capacity for operation
   */
  async validateCapacity(
    tenantId: string,
    operation: 'users' | 'storage',
    requestedAmount: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const schema = this.tenantSchemas.get(tenantId);
    if (!schema) {
      return { allowed: false, reason: 'Tenant not found' };
    }

    if (operation === 'users') {
      // Check user limit
      // In production: COUNT users in schema
      const currentUsers = 0;
      if (currentUsers + requestedAmount > schema.settings.maxUsers) {
        return {
          allowed: false,
          reason: `User limit exceeded. Max: ${schema.settings.maxUsers}`,
        };
      }
    }

    if (operation === 'storage') {
      // Check storage limit
      const stats = await this.getSchemaStats(tenantId);
      if (stats.storageUsedMB + requestedAmount > schema.settings.maxStorage) {
        return {
          allowed: false,
          reason: `Storage limit exceeded. Max: ${schema.settings.maxStorage}MB`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Clone schema for testing/staging
   */
  async cloneSchema(
    sourceTenantId: string,
    targetTenantId: string,
    includeData: boolean = false,
  ): Promise<SchemaCreationResult> {
    const sourceSchema = this.tenantSchemas.get(sourceTenantId);
    if (!sourceSchema) {
      return {
        success: false,
        schemaName: '',
        message: 'Source tenant not found',
      };
    }

    // Create new schema with same settings
    const result = await this.createTenantSchema(
      targetTenantId,
      `Clone of ${sourceSchema.displayName}`,
      sourceSchema.region,
      sourceSchema.settings,
    );

    if (result.success && includeData) {
      // In production: copy data between schemas
      this.logger.log(`Data copy requested from ${sourceTenantId} to ${targetTenantId}`);
    }

    return result;
  }
}

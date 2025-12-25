import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Base class for tenant-scoped services.
 * Provides helper methods for querying with organization context.
 */
@Injectable()
export abstract class TenantScopedService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Add organizationId filter to a where clause
   */
  protected withTenant<T extends Record<string, any>>(
    where: T,
    organizationId: string | null | undefined,
  ): T {
    if (!organizationId) {
      return where;
    }
    return {
      ...where,
      organizationId,
    };
  }

  /**
   * Create a tenant-scoped where clause
   */
  protected tenantWhere(organizationId: string | null | undefined): { organizationId?: string } {
    if (!organizationId) {
      return {};
    }
    return { organizationId };
  }

  /**
   * Add organizationId to create data
   */
  protected withTenantCreate<T extends Record<string, any>>(
    data: T,
    organizationId: string | null | undefined,
  ): T {
    if (!organizationId) {
      return data;
    }
    return {
      ...data,
      organizationId,
    };
  }

  /**
   * Validate that a record belongs to the organization
   * @throws ForbiddenException if record doesn't belong to organization
   */
  protected validateTenantAccess(
    record: { organizationId?: string | null } | null,
    organizationId: string | null | undefined,
  ): boolean {
    if (!record) {
      return false;
    }
    // If no organization context required, allow access
    if (!organizationId) {
      return true;
    }
    // If record has no organization, allow (legacy data)
    if (!record.organizationId) {
      return true;
    }
    // Check organization matches
    return record.organizationId === organizationId;
  }
}

/**
 * Example usage in a service:
 *
 * @Injectable()
 * export class InvoiceService extends TenantScopedService {
 *   constructor(prisma: PrismaService) {
 *     super(prisma);
 *   }
 *
 *   async findAll(organizationId?: string) {
 *     return this.prisma.invoice.findMany({
 *       where: this.tenantWhere(organizationId),
 *     });
 *   }
 *
 *   async create(data: CreateInvoiceDto, organizationId?: string) {
 *     return this.prisma.invoice.create({
 *       data: this.withTenantCreate(data, organizationId),
 *     });
 *   }
 *
 *   async findOne(id: string, organizationId?: string) {
 *     const invoice = await this.prisma.invoice.findUnique({ where: { id } });
 *     if (!this.validateTenantAccess(invoice, organizationId)) {
 *       throw new ForbiddenException('Access denied');
 *     }
 *     return invoice;
 *   }
 * }
 */

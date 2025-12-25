import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Permission action types
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'export' | 'import' | 'approve';

// Resource types in the system
export type ResourceType =
  // Core
  | 'invoices'
  | 'customers'
  | 'orders'
  | 'payments'
  | 'documents'
  | 'reports'
  | 'dashboards'
  | 'settings'
  | 'users'
  | 'roles'
  | 'audit_logs'
  | 'webhooks'
  | 'api_keys'
  // HR Module
  | 'employees'
  | 'contracts'
  | 'timesheets'
  | 'payroll'
  | 'leave_requests'
  | 'departments'
  | 'positions'
  | 'competencies'
  // Logistics Module
  | 'fleet'
  | 'vehicles'
  | 'deliveries'
  | 'routes'
  | 'inventory'
  | 'warehouses'
  | 'shipments'
  | 'customs'
  // ANAF/Finance
  | 'anaf_declarations'
  | 'efactura'
  | 'saft_d406'
  | 'vat_reports'
  | 'bank_accounts'
  | 'transactions'
  // HSE Module
  | 'incidents'
  | 'safety_trainings'
  | 'risk_assessments'
  | 'compliance_checks'
  // LMS Module
  | 'courses'
  | 'enrollments'
  | 'certificates'
  | 'training_materials'
  // Freelancer Module
  | 'freelancers'
  | 'freelancer_contracts'
  | 'freelancer_payments'
  // Integration
  | 'integrations'
  | 'integration_rules'
  | 'integration_events';

// Built-in roles
export type SystemRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'HR_MANAGER'
  | 'FLEET_MANAGER'
  | 'LOGISTICS_MANAGER'
  | 'HSE_MANAGER'
  | 'LMS_ADMIN'
  | 'FREELANCER_MANAGER'
  | 'FINANCE_MANAGER'
  | 'USER'
  | 'VIEWER';

// Permission definition
export interface Permission {
  id: string;
  resource: ResourceType;
  action: PermissionAction;
  scope: 'all' | 'own' | 'team' | 'tenant';
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'lt';
  value: any;
}

// Role definition
export interface Role {
  id: string;
  name: string;
  description: string;
  tenantId?: string; // null for system roles
  isSystem: boolean;
  permissions: string[]; // Permission IDs
  inheritsFrom?: string; // Parent role ID
  createdAt: Date;
  updatedAt: Date;
}

// User-role assignment
export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  tenantId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

// Access control context
export interface AccessContext {
  userId: string;
  tenantId: string;
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: string;
  resourceOwnerId?: string;
  metadata?: Record<string, any>;
}

// Access check result
export interface AccessResult {
  allowed: boolean;
  reason?: string;
  scope?: 'all' | 'own' | 'team' | 'tenant';
  conditions?: PermissionCondition[];
}

// Permission cache entry
interface CacheEntry {
  permissions: Permission[];
  roles: Role[];
  expiresAt: number;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  // Storage maps
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, UserRoleAssignment[]> = new Map();
  private permissionCache: Map<string, CacheEntry> = new Map();

  // Counters for ID generation
  private roleIdCounter = 0;

  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {
    this.initializeSystemPermissions();
    this.initializeSystemRoles();
  }

  private generateId(prefix: string): string {
    return `${prefix}-${++this.roleIdCounter}-${Date.now()}`;
  }

  // =================== INITIALIZATION ===================

  private initializeSystemPermissions(): void {
    const resources: ResourceType[] = [
      // Core
      'invoices', 'customers', 'orders', 'payments', 'documents',
      'reports', 'dashboards', 'settings', 'users', 'roles',
      'audit_logs', 'webhooks', 'api_keys',
      // HR Module
      'employees', 'contracts', 'timesheets', 'payroll', 'leave_requests',
      'departments', 'positions', 'competencies',
      // Logistics Module
      'fleet', 'vehicles', 'deliveries', 'routes', 'inventory',
      'warehouses', 'shipments', 'customs',
      // ANAF/Finance
      'anaf_declarations', 'efactura', 'saft_d406', 'vat_reports',
      'bank_accounts', 'transactions',
      // HSE Module
      'incidents', 'safety_trainings', 'risk_assessments', 'compliance_checks',
      // LMS Module
      'courses', 'enrollments', 'certificates', 'training_materials',
      // Freelancer Module
      'freelancers', 'freelancer_contracts', 'freelancer_payments',
      // Integration
      'integrations', 'integration_rules', 'integration_events',
    ];

    const actions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'manage', 'export', 'import', 'approve'];
    const scopes: Array<'all' | 'own' | 'team' | 'tenant'> = ['all', 'own', 'team', 'tenant'];

    for (const resource of resources) {
      for (const action of actions) {
        for (const scope of scopes) {
          const id = `${resource}:${action}:${scope}`;
          this.permissions.set(id, { id, resource, action, scope });
        }
      }
    }

    this.logger.log(`Initialized ${this.permissions.size} system permissions`);
  }

  private initializeSystemRoles(): void {
    // SUPER_ADMIN - Full system access
    const superAdmin: Role = {
      id: 'role-super-admin',
      name: 'SUPER_ADMIN',
      description: 'Full system access across all tenants',
      isSystem: true,
      permissions: Array.from(this.permissions.keys()).filter(p => p.endsWith(':all')),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ADMIN - Full tenant access
    const admin: Role = {
      id: 'role-admin',
      name: 'ADMIN',
      description: 'Full access within tenant',
      isSystem: true,
      permissions: Array.from(this.permissions.keys()).filter(p => p.endsWith(':tenant')),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // MANAGER - Team management
    const manager: Role = {
      id: 'role-manager',
      name: 'MANAGER',
      description: 'Team management and reporting',
      isSystem: true,
      inheritsFrom: 'role-user',
      permissions: [
        'employees:read:team', 'employees:update:team',
        'timesheets:read:team', 'timesheets:approve:team',
        'reports:read:team', 'reports:export:team',
        'dashboards:read:team', 'dashboards:create:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ACCOUNTANT - Financial operations
    const accountant: Role = {
      id: 'role-accountant',
      name: 'ACCOUNTANT',
      description: 'Financial and accounting operations',
      isSystem: true,
      permissions: [
        'invoices:create:tenant', 'invoices:read:tenant', 'invoices:update:tenant', 'invoices:export:tenant',
        'payments:create:tenant', 'payments:read:tenant', 'payments:update:tenant',
        'customers:read:tenant', 'customers:create:tenant', 'customers:update:tenant',
        'reports:read:tenant', 'reports:create:tenant', 'reports:export:tenant',
        'anaf_declarations:create:tenant', 'anaf_declarations:read:tenant', 'anaf_declarations:update:tenant',
        'documents:read:tenant', 'documents:create:tenant',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // HR_MANAGER - Human resources
    const hrManager: Role = {
      id: 'role-hr-manager',
      name: 'HR_MANAGER',
      description: 'Human resources management',
      isSystem: true,
      permissions: [
        'employees:create:tenant', 'employees:read:tenant', 'employees:update:tenant', 'employees:delete:tenant',
        'timesheets:read:tenant', 'timesheets:approve:tenant', 'timesheets:export:tenant',
        'payroll:read:tenant', 'payroll:create:tenant', 'payroll:update:tenant', 'payroll:export:tenant',
        'documents:read:tenant', 'documents:create:tenant',
        'reports:read:tenant', 'reports:export:tenant',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // FLEET_MANAGER - Fleet operations
    const fleetManager: Role = {
      id: 'role-fleet-manager',
      name: 'FLEET_MANAGER',
      description: 'Fleet and delivery management',
      isSystem: true,
      permissions: [
        'fleet:manage:tenant', 'fleet:read:tenant', 'fleet:create:tenant', 'fleet:update:tenant',
        'vehicles:manage:tenant', 'vehicles:read:tenant', 'vehicles:create:tenant', 'vehicles:update:tenant',
        'deliveries:manage:tenant', 'deliveries:read:tenant', 'deliveries:create:tenant', 'deliveries:update:tenant',
        'routes:manage:tenant', 'routes:read:tenant', 'routes:create:tenant', 'routes:update:tenant',
        'employees:read:tenant',
        'reports:read:tenant', 'reports:export:tenant',
        'dashboards:read:tenant', 'dashboards:create:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // LOGISTICS_MANAGER - Full logistics operations
    const logisticsManager: Role = {
      id: 'role-logistics-manager',
      name: 'LOGISTICS_MANAGER',
      description: 'Full logistics and supply chain management',
      isSystem: true,
      permissions: [
        'inventory:manage:tenant', 'inventory:read:tenant', 'inventory:create:tenant', 'inventory:update:tenant', 'inventory:delete:tenant',
        'warehouses:manage:tenant', 'warehouses:read:tenant', 'warehouses:create:tenant', 'warehouses:update:tenant',
        'shipments:manage:tenant', 'shipments:read:tenant', 'shipments:create:tenant', 'shipments:update:tenant',
        'customs:manage:tenant', 'customs:read:tenant', 'customs:create:tenant', 'customs:update:tenant',
        'fleet:read:tenant', 'vehicles:read:tenant',
        'deliveries:read:tenant', 'routes:read:tenant',
        'reports:read:tenant', 'reports:export:tenant',
        'dashboards:read:tenant', 'dashboards:create:own',
        'integrations:read:tenant',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // HSE_MANAGER - Health, Safety & Environment
    const hseManager: Role = {
      id: 'role-hse-manager',
      name: 'HSE_MANAGER',
      description: 'Health, Safety and Environment management',
      isSystem: true,
      permissions: [
        'incidents:manage:tenant', 'incidents:read:tenant', 'incidents:create:tenant', 'incidents:update:tenant',
        'safety_trainings:manage:tenant', 'safety_trainings:read:tenant', 'safety_trainings:create:tenant', 'safety_trainings:update:tenant',
        'risk_assessments:manage:tenant', 'risk_assessments:read:tenant', 'risk_assessments:create:tenant', 'risk_assessments:update:tenant',
        'compliance_checks:manage:tenant', 'compliance_checks:read:tenant', 'compliance_checks:create:tenant', 'compliance_checks:update:tenant',
        'employees:read:tenant',
        'documents:read:tenant', 'documents:create:tenant',
        'reports:read:tenant', 'reports:export:tenant',
        'dashboards:read:tenant', 'dashboards:create:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // LMS_ADMIN - Learning Management System admin
    const lmsAdmin: Role = {
      id: 'role-lms-admin',
      name: 'LMS_ADMIN',
      description: 'Learning Management System administration',
      isSystem: true,
      permissions: [
        'courses:manage:tenant', 'courses:read:tenant', 'courses:create:tenant', 'courses:update:tenant', 'courses:delete:tenant',
        'enrollments:manage:tenant', 'enrollments:read:tenant', 'enrollments:create:tenant', 'enrollments:update:tenant',
        'certificates:manage:tenant', 'certificates:read:tenant', 'certificates:create:tenant', 'certificates:update:tenant',
        'training_materials:manage:tenant', 'training_materials:read:tenant', 'training_materials:create:tenant', 'training_materials:update:tenant',
        'competencies:read:tenant', 'competencies:update:tenant',
        'employees:read:tenant',
        'reports:read:tenant', 'reports:export:tenant',
        'dashboards:read:tenant', 'dashboards:create:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // FREELANCER_MANAGER - Freelancer operations
    const freelancerManager: Role = {
      id: 'role-freelancer-manager',
      name: 'FREELANCER_MANAGER',
      description: 'Freelancer management and contracts',
      isSystem: true,
      permissions: [
        'freelancers:manage:tenant', 'freelancers:read:tenant', 'freelancers:create:tenant', 'freelancers:update:tenant',
        'freelancer_contracts:manage:tenant', 'freelancer_contracts:read:tenant', 'freelancer_contracts:create:tenant', 'freelancer_contracts:update:tenant',
        'freelancer_payments:read:tenant', 'freelancer_payments:approve:tenant',
        'deliveries:read:tenant',
        'reports:read:tenant', 'reports:export:tenant',
        'dashboards:read:tenant', 'dashboards:create:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // FINANCE_MANAGER - Finance and ANAF operations
    const financeManager: Role = {
      id: 'role-finance-manager',
      name: 'FINANCE_MANAGER',
      description: 'Finance, accounting and ANAF compliance',
      isSystem: true,
      permissions: [
        'invoices:manage:tenant', 'invoices:read:tenant', 'invoices:create:tenant', 'invoices:update:tenant', 'invoices:export:tenant',
        'payments:manage:tenant', 'payments:read:tenant', 'payments:create:tenant', 'payments:update:tenant', 'payments:approve:tenant',
        'transactions:manage:tenant', 'transactions:read:tenant', 'transactions:create:tenant', 'transactions:update:tenant',
        'bank_accounts:manage:tenant', 'bank_accounts:read:tenant', 'bank_accounts:create:tenant', 'bank_accounts:update:tenant',
        'anaf_declarations:manage:tenant', 'anaf_declarations:read:tenant', 'anaf_declarations:create:tenant', 'anaf_declarations:update:tenant',
        'efactura:manage:tenant', 'efactura:read:tenant', 'efactura:create:tenant', 'efactura:update:tenant',
        'saft_d406:manage:tenant', 'saft_d406:read:tenant', 'saft_d406:create:tenant', 'saft_d406:update:tenant',
        'vat_reports:manage:tenant', 'vat_reports:read:tenant', 'vat_reports:create:tenant', 'vat_reports:export:tenant',
        'customers:read:tenant', 'customers:create:tenant', 'customers:update:tenant',
        'reports:manage:tenant', 'reports:read:tenant', 'reports:create:tenant', 'reports:export:tenant',
        'dashboards:read:tenant', 'dashboards:create:own',
        'integrations:read:tenant',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // USER - Standard user
    const user: Role = {
      id: 'role-user',
      name: 'USER',
      description: 'Standard user with own-resource access',
      isSystem: true,
      permissions: [
        'invoices:read:own', 'invoices:create:own',
        'customers:read:own',
        'documents:read:own', 'documents:create:own', 'documents:update:own',
        'timesheets:read:own', 'timesheets:create:own', 'timesheets:update:own',
        'dashboards:read:own', 'dashboards:create:own', 'dashboards:update:own',
        'reports:read:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // VIEWER - Read-only access
    const viewer: Role = {
      id: 'role-viewer',
      name: 'VIEWER',
      description: 'Read-only access to own resources',
      isSystem: true,
      permissions: [
        'invoices:read:own',
        'customers:read:own',
        'documents:read:own',
        'reports:read:own',
        'dashboards:read:own',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(superAdmin.id, superAdmin);
    this.roles.set(admin.id, admin);
    this.roles.set(manager.id, manager);
    this.roles.set(accountant.id, accountant);
    this.roles.set(hrManager.id, hrManager);
    this.roles.set(fleetManager.id, fleetManager);
    this.roles.set(logisticsManager.id, logisticsManager);
    this.roles.set(hseManager.id, hseManager);
    this.roles.set(lmsAdmin.id, lmsAdmin);
    this.roles.set(freelancerManager.id, freelancerManager);
    this.roles.set(financeManager.id, financeManager);
    this.roles.set(user.id, user);
    this.roles.set(viewer.id, viewer);

    this.logger.log(`Initialized ${this.roles.size} system roles`);
  }

  // =================== ROLES ===================

  async createRole(
    name: string,
    description: string,
    permissions: string[],
    tenantId?: string,
    inheritsFrom?: string,
  ): Promise<Role> {
    const role: Role = {
      id: this.generateId('role'),
      name,
      description,
      tenantId,
      isSystem: false,
      permissions,
      inheritsFrom,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(role.id, role);
    this.invalidateCache();
    this.logger.log(`Created role: ${name} (${role.id})`);
    return role;
  }

  async getRole(roleId: string): Promise<Role | null> {
    return this.roles.get(roleId) || null;
  }

  async getRoleByName(name: string, tenantId?: string): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.name === name && (role.tenantId === tenantId || role.isSystem)) {
        return role;
      }
    }
    return null;
  }

  async getRoles(tenantId?: string, includeSystem = true): Promise<Role[]> {
    return Array.from(this.roles.values())
      .filter(r => {
        if (r.isSystem && includeSystem) return true;
        if (tenantId && r.tenantId === tenantId) return true;
        return false;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateRole(
    roleId: string,
    updates: Partial<Omit<Role, 'id' | 'isSystem' | 'createdAt'>>,
  ): Promise<Role | null> {
    const role = this.roles.get(roleId);
    if (!role || role.isSystem) return null;

    const updated: Role = {
      ...role,
      ...updates,
      updatedAt: new Date(),
    };

    this.roles.set(roleId, updated);
    this.invalidateCache();
    return updated;
  }

  async deleteRole(roleId: string): Promise<boolean> {
    const role = this.roles.get(roleId);
    if (!role || role.isSystem) return false;

    // Remove all user assignments for this role
    for (const [userId, assignments] of this.userRoles.entries()) {
      this.userRoles.set(
        userId,
        assignments.filter(a => a.roleId !== roleId),
      );
    }

    this.roles.delete(roleId);
    this.invalidateCache();
    return true;
  }

  // =================== USER ROLE ASSIGNMENTS ===================

  async assignRole(
    userId: string,
    roleId: string,
    tenantId: string,
    assignedBy: string,
    expiresAt?: Date,
  ): Promise<UserRoleAssignment> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const assignment: UserRoleAssignment = {
      userId,
      roleId,
      tenantId,
      assignedBy,
      assignedAt: new Date(),
      expiresAt,
    };

    const existing = this.userRoles.get(userId) || [];

    // Remove existing assignment for same role in same tenant
    const filtered = existing.filter(
      a => !(a.roleId === roleId && a.tenantId === tenantId),
    );
    filtered.push(assignment);

    this.userRoles.set(userId, filtered);
    this.invalidateCacheForUser(userId);

    this.logger.log(`Assigned role ${role.name} to user ${userId}`);
    return assignment;
  }

  async revokeRole(userId: string, roleId: string, tenantId: string): Promise<boolean> {
    const existing = this.userRoles.get(userId);
    if (!existing) return false;

    const filtered = existing.filter(
      a => !(a.roleId === roleId && a.tenantId === tenantId),
    );

    if (filtered.length === existing.length) return false;

    this.userRoles.set(userId, filtered);
    this.invalidateCacheForUser(userId);
    return true;
  }

  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    const assignments = this.userRoles.get(userId) || [];
    const now = new Date();

    const validAssignments = assignments.filter(a => {
      if (tenantId && a.tenantId !== tenantId) return false;
      if (a.expiresAt && a.expiresAt < now) return false;
      return true;
    });

    const roles: Role[] = [];
    for (const assignment of validAssignments) {
      const role = this.roles.get(assignment.roleId);
      if (role) roles.push(role);
    }

    return roles;
  }

  async getUserRoleAssignments(userId: string, tenantId?: string): Promise<UserRoleAssignment[]> {
    const assignments = this.userRoles.get(userId) || [];
    return tenantId
      ? assignments.filter(a => a.tenantId === tenantId)
      : assignments;
  }

  // =================== PERMISSIONS ===================

  async getPermission(permissionId: string): Promise<Permission | null> {
    return this.permissions.get(permissionId) || null;
  }

  async getPermissions(resource?: ResourceType, action?: PermissionAction): Promise<Permission[]> {
    let perms = Array.from(this.permissions.values());

    if (resource) {
      perms = perms.filter(p => p.resource === resource);
    }
    if (action) {
      perms = perms.filter(p => p.action === action);
    }

    return perms;
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<Permission[]> {
    // Check cache
    const cacheKey = `${userId}:${tenantId}`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const roles = await this.getUserRoles(userId, tenantId);
    const permissionSet = new Set<string>();

    // Collect all permissions including inherited
    for (const role of roles) {
      await this.collectRolePermissions(role, permissionSet);
    }

    const permissions: Permission[] = [];
    for (const permId of permissionSet) {
      const perm = this.permissions.get(permId);
      if (perm) permissions.push(perm);
    }

    // Cache result
    this.permissionCache.set(cacheKey, {
      permissions,
      roles,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return permissions;
  }

  private async collectRolePermissions(role: Role, permissionSet: Set<string>): Promise<void> {
    for (const permId of role.permissions) {
      permissionSet.add(permId);
    }

    // Handle inheritance
    if (role.inheritsFrom) {
      const parentRole = this.roles.get(role.inheritsFrom);
      if (parentRole) {
        await this.collectRolePermissions(parentRole, permissionSet);
      }
    }
  }

  // =================== ACCESS CONTROL ===================

  async checkAccess(context: AccessContext): Promise<AccessResult> {
    const { userId, tenantId, resource, action, resourceId, resourceOwnerId } = context;

    // Get user permissions
    const permissions = await this.getUserPermissions(userId, tenantId);

    // Find matching permissions for this resource and action
    const matching = permissions.filter(
      p => p.resource === resource && p.action === action,
    );

    if (matching.length === 0) {
      return { allowed: false, reason: `No permission for ${action} on ${resource}` };
    }

    // Check scope-based access
    for (const perm of matching) {
      const scopeResult = this.checkScope(perm, context);
      if (scopeResult.allowed) {
        return scopeResult;
      }
    }

    return { allowed: false, reason: 'Access denied by scope restrictions' };
  }

  private checkScope(permission: Permission, context: AccessContext): AccessResult {
    switch (permission.scope) {
      case 'all':
        return { allowed: true, scope: 'all' };

      case 'tenant':
        return { allowed: true, scope: 'tenant' };

      case 'team':
        // Team scope would require team membership check
        // For now, allow if metadata indicates team membership
        if (context.metadata?.isTeamMember) {
          return { allowed: true, scope: 'team' };
        }
        return { allowed: false, reason: 'Not a team member' };

      case 'own':
        if (context.resourceOwnerId === context.userId) {
          return { allowed: true, scope: 'own' };
        }
        return { allowed: false, reason: 'Not the resource owner' };

      default:
        return { allowed: false, reason: 'Unknown scope' };
    }
  }

  async requireAccess(context: AccessContext): Promise<void> {
    const result = await this.checkAccess(context);
    if (!result.allowed) {
      throw new ForbiddenException(result.reason || 'Access denied');
    }
  }

  async hasPermission(
    userId: string,
    tenantId: string,
    resource: ResourceType,
    action: PermissionAction,
  ): Promise<boolean> {
    const result = await this.checkAccess({
      userId,
      tenantId,
      resource,
      action,
    });
    return result.allowed;
  }

  async hasRole(userId: string, tenantId: string, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId, tenantId);
    return roles.some(r => r.name === roleName);
  }

  async hasAnyRole(userId: string, tenantId: string, roleNames: string[]): Promise<boolean> {
    const roles = await this.getUserRoles(userId, tenantId);
    return roles.some(r => roleNames.includes(r.name));
  }

  // =================== PERMISSION GROUPS ===================

  async getPermissionsByCategory(
    category: 'finance' | 'hr' | 'operations' | 'logistics' | 'hse' | 'lms' | 'freelancer' | 'admin' | 'integration',
  ): Promise<Permission[]> {
    const categoryResources: Record<string, ResourceType[]> = {
      finance: [
        'invoices', 'customers', 'payments', 'reports', 'anaf_declarations',
        'efactura', 'saft_d406', 'vat_reports', 'bank_accounts', 'transactions',
      ],
      hr: [
        'employees', 'contracts', 'timesheets', 'payroll', 'leave_requests',
        'departments', 'positions', 'competencies', 'documents',
      ],
      operations: ['fleet', 'vehicles', 'deliveries', 'routes', 'orders'],
      logistics: ['inventory', 'warehouses', 'shipments', 'customs'],
      hse: ['incidents', 'safety_trainings', 'risk_assessments', 'compliance_checks'],
      lms: ['courses', 'enrollments', 'certificates', 'training_materials'],
      freelancer: ['freelancers', 'freelancer_contracts', 'freelancer_payments'],
      admin: ['users', 'roles', 'settings', 'audit_logs', 'webhooks', 'api_keys'],
      integration: ['integrations', 'integration_rules', 'integration_events'],
    };

    const resources = categoryResources[category] || [];
    return Array.from(this.permissions.values())
      .filter(p => resources.includes(p.resource));
  }

  // =================== AUDIT ===================

  async getAccessibleResources(
    userId: string,
    tenantId: string,
    resource: ResourceType,
  ): Promise<{ scope: string; actions: PermissionAction[] }> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    const resourcePerms = permissions.filter(p => p.resource === resource);

    if (resourcePerms.length === 0) {
      return { scope: 'none', actions: [] };
    }

    // Determine highest scope
    const scopes = ['all', 'tenant', 'team', 'own'];
    let highestScope = 'none';
    for (const scope of scopes) {
      if (resourcePerms.some(p => p.scope === scope)) {
        highestScope = scope;
        break;
      }
    }

    const actions = [...new Set(resourcePerms.map(p => p.action))];

    return { scope: highestScope, actions };
  }

  // =================== CACHE MANAGEMENT ===================

  private invalidateCache(): void {
    this.permissionCache.clear();
  }

  private invalidateCacheForUser(userId: string): void {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  async clearCache(): Promise<void> {
    this.permissionCache.clear();
    this.logger.log('Permission cache cleared');
  }

  // =================== METADATA ===================

  getResourceTypes(): ResourceType[] {
    return [
      // Core
      'invoices', 'customers', 'orders', 'payments', 'documents',
      'reports', 'dashboards', 'settings', 'users', 'roles',
      'audit_logs', 'webhooks', 'api_keys',
      // HR Module
      'employees', 'contracts', 'timesheets', 'payroll', 'leave_requests',
      'departments', 'positions', 'competencies',
      // Logistics Module
      'fleet', 'vehicles', 'deliveries', 'routes', 'inventory',
      'warehouses', 'shipments', 'customs',
      // ANAF/Finance
      'anaf_declarations', 'efactura', 'saft_d406', 'vat_reports',
      'bank_accounts', 'transactions',
      // HSE Module
      'incidents', 'safety_trainings', 'risk_assessments', 'compliance_checks',
      // LMS Module
      'courses', 'enrollments', 'certificates', 'training_materials',
      // Freelancer Module
      'freelancers', 'freelancer_contracts', 'freelancer_payments',
      // Integration
      'integrations', 'integration_rules', 'integration_events',
    ];
  }

  getActionTypes(): PermissionAction[] {
    return ['create', 'read', 'update', 'delete', 'manage', 'export', 'import', 'approve'];
  }

  getScopeTypes(): string[] {
    return ['all', 'tenant', 'team', 'own'];
  }

  getSystemRoles(): SystemRole[] {
    return [
      'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR_MANAGER',
      'FLEET_MANAGER', 'LOGISTICS_MANAGER', 'HSE_MANAGER', 'LMS_ADMIN',
      'FREELANCER_MANAGER', 'FINANCE_MANAGER', 'USER', 'VIEWER',
    ];
  }
}

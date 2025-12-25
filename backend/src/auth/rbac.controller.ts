import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  RbacService,
  ResourceType,
  PermissionAction,
} from './rbac.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('RBAC')
@Controller('rbac')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // =================== ROLES ===================

  @Post('roles')
  @ApiOperation({ summary: 'Create role' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        tenantId: { type: 'string' },
        inheritsFrom: { type: 'string' },
      },
      required: ['name', 'description', 'permissions'],
    },
  })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('permissions') permissions: string[],
    @Body('tenantId') tenantId?: string,
    @Body('inheritsFrom') inheritsFrom?: string,
  ) {
    return this.rbacService.createRole(name, description, permissions, tenantId, inheritsFrom);
  }

  @Get('roles/:roleId')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  async getRole(@Param('roleId') roleId: string) {
    const role = await this.rbacService.getRole(roleId);
    if (!role) return { error: 'Role not found' };
    return role;
  }

  @Get('roles/by-name/:name')
  @ApiOperation({ summary: 'Get role by name' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, description: 'Role details' })
  async getRoleByName(
    @Param('name') name: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const role = await this.rbacService.getRoleByName(name, tenantId);
    if (!role) return { error: 'Role not found' };
    return role;
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'includeSystem', required: false })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async getRoles(
    @Query('tenantId') tenantId?: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return {
      roles: await this.rbacService.getRoles(
        tenantId,
        includeSystem !== 'false',
      ),
    };
  }

  @Put('roles/:roleId')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() updates: Record<string, any>,
  ) {
    const role = await this.rbacService.updateRole(roleId, updates);
    if (!role) return { error: 'Role not found or is a system role' };
    return role;
  }

  @Delete('roles/:roleId')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@Param('roleId') roleId: string) {
    const success = await this.rbacService.deleteRole(roleId);
    return { success };
  }

  // =================== USER ROLE ASSIGNMENTS ===================

  @Post('users/:userId/roles')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleId: { type: 'string' },
        tenantId: { type: 'string' },
        assignedBy: { type: 'string' },
        expiresAt: { type: 'string' },
      },
      required: ['roleId', 'tenantId', 'assignedBy'],
    },
  })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  async assignRole(
    @Param('userId') userId: string,
    @Body('roleId') roleId: string,
    @Body('tenantId') tenantId: string,
    @Body('assignedBy') assignedBy: string,
    @Body('expiresAt') expiresAt?: string,
  ) {
    try {
      const assignment = await this.rbacService.assignRole(
        userId,
        roleId,
        tenantId,
        assignedBy,
        expiresAt ? new Date(expiresAt) : undefined,
      );
      return assignment;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Delete('users/:userId/roles/:roleId')
  @ApiOperation({ summary: 'Revoke role from user' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Role revoked' })
  async revokeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const success = await this.rbacService.revokeRole(userId, roleId, tenantId);
    return { success };
  }

  @Get('users/:userId/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, description: 'List of user roles' })
  async getUserRoles(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return { roles: await this.rbacService.getUserRoles(userId, tenantId) };
  }

  @Get('users/:userId/role-assignments')
  @ApiOperation({ summary: 'Get user role assignments' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, description: 'List of role assignments' })
  async getUserRoleAssignments(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return {
      assignments: await this.rbacService.getUserRoleAssignments(userId, tenantId),
    };
  }

  // =================== PERMISSIONS ===================

  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async getPermissions(
    @Query('resource') resource?: ResourceType,
    @Query('action') action?: PermissionAction,
  ) {
    return { permissions: await this.rbacService.getPermissions(resource, action) };
  }

  @Get('permissions/:permissionId')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiResponse({ status: 200, description: 'Permission details' })
  async getPermission(@Param('permissionId') permissionId: string) {
    const permission = await this.rbacService.getPermission(permissionId);
    if (!permission) return { error: 'Permission not found' };
    return permission;
  }

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'List of user permissions' })
  async getUserPermissions(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return { permissions: await this.rbacService.getUserPermissions(userId, tenantId) };
  }

  @Get('permissions/category/:category')
  @ApiOperation({ summary: 'Get permissions by category' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async getPermissionsByCategory(
    @Param('category') category: 'finance' | 'hr' | 'operations' | 'admin',
  ) {
    return { permissions: await this.rbacService.getPermissionsByCategory(category) };
  }

  // =================== ACCESS CONTROL ===================

  @Post('check-access')
  @ApiOperation({ summary: 'Check access' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        tenantId: { type: 'string' },
        resource: { type: 'string' },
        action: { type: 'string' },
        resourceId: { type: 'string' },
        resourceOwnerId: { type: 'string' },
      },
      required: ['userId', 'tenantId', 'resource', 'action'],
    },
  })
  @ApiResponse({ status: 200, description: 'Access result' })
  async checkAccess(
    @Body('userId') userId: string,
    @Body('tenantId') tenantId: string,
    @Body('resource') resource: ResourceType,
    @Body('action') action: PermissionAction,
    @Body('resourceId') resourceId?: string,
    @Body('resourceOwnerId') resourceOwnerId?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.rbacService.checkAccess({
      userId,
      tenantId,
      resource,
      action,
      resourceId,
      resourceOwnerId,
      metadata,
    });
  }

  @Post('has-permission')
  @ApiOperation({ summary: 'Check if user has permission' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        tenantId: { type: 'string' },
        resource: { type: 'string' },
        action: { type: 'string' },
      },
      required: ['userId', 'tenantId', 'resource', 'action'],
    },
  })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async hasPermission(
    @Body('userId') userId: string,
    @Body('tenantId') tenantId: string,
    @Body('resource') resource: ResourceType,
    @Body('action') action: PermissionAction,
  ) {
    const has = await this.rbacService.hasPermission(userId, tenantId, resource, action);
    return { hasPermission: has };
  }

  @Post('has-role')
  @ApiOperation({ summary: 'Check if user has role' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        tenantId: { type: 'string' },
        roleName: { type: 'string' },
      },
      required: ['userId', 'tenantId', 'roleName'],
    },
  })
  @ApiResponse({ status: 200, description: 'Role check result' })
  async hasRole(
    @Body('userId') userId: string,
    @Body('tenantId') tenantId: string,
    @Body('roleName') roleName: string,
  ) {
    const has = await this.rbacService.hasRole(userId, tenantId, roleName);
    return { hasRole: has };
  }

  @Get('users/:userId/accessible-resources/:resource')
  @ApiOperation({ summary: 'Get accessible resource scope for user' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Accessible resource info' })
  async getAccessibleResources(
    @Param('userId') userId: string,
    @Param('resource') resource: ResourceType,
    @Query('tenantId') tenantId: string,
  ) {
    return this.rbacService.getAccessibleResources(userId, tenantId, resource);
  }

  // =================== CACHE MANAGEMENT ===================

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear permission cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    await this.rbacService.clearCache();
    return { success: true };
  }

  // =================== METADATA ===================

  @Get('metadata/resources')
  @ApiOperation({ summary: 'Get resource types' })
  async getResourceTypes() {
    return { resources: this.rbacService.getResourceTypes() };
  }

  @Get('metadata/actions')
  @ApiOperation({ summary: 'Get action types' })
  async getActionTypes() {
    return { actions: this.rbacService.getActionTypes() };
  }

  @Get('metadata/scopes')
  @ApiOperation({ summary: 'Get scope types' })
  async getScopeTypes() {
    return { scopes: this.rbacService.getScopeTypes() };
  }

  @Get('metadata/system-roles')
  @ApiOperation({ summary: 'Get system roles' })
  async getSystemRoles() {
    return { roles: this.rbacService.getSystemRoles() };
  }
}

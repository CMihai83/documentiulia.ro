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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CollaborationService,
  WorkspaceRole,
  SharePermission,
} from './collaboration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Collaboration')
@ApiBearerAuth()
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ============================================================================
  // WORKSPACES
  // ============================================================================

  @Post('workspaces')
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created' })
  async createWorkspace(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      description?: string;
      isDefault?: boolean;
      settings?: any;
    },
  ) {
    return this.collaborationService.createWorkspace({
      tenantId: req.user.tenantId || req.user.id,
      name: body.name,
      description: body.description,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
      createdByEmail: req.user.email,
      isDefault: body.isDefault,
      settings: body.settings,
    });
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List workspaces' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  async getWorkspaces(@Request() req: any) {
    return this.collaborationService.getWorkspaces(
      req.user.tenantId || req.user.id,
      req.user.id,
    );
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  async getWorkspace(@Param('id') id: string) {
    return this.collaborationService.getWorkspace(id);
  }

  @Put('workspaces/:id')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiResponse({ status: 200, description: 'Workspace updated' })
  async updateWorkspace(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      settings?: any;
    },
  ) {
    return this.collaborationService.updateWorkspace(id, body);
  }

  @Delete('workspaces/:id')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted' })
  async deleteWorkspace(@Param('id') id: string) {
    return { success: await this.collaborationService.deleteWorkspace(id) };
  }

  @Get('workspaces/:id/stats')
  @ApiOperation({ summary: 'Get workspace statistics' })
  @ApiResponse({ status: 200, description: 'Workspace statistics' })
  async getWorkspaceStats(@Param('id') id: string) {
    return this.collaborationService.getWorkspaceStats(id);
  }

  // ============================================================================
  // WORKSPACE MEMBERS
  // ============================================================================

  @Post('workspaces/:id/members')
  @ApiOperation({ summary: 'Add member to workspace' })
  @ApiResponse({ status: 201, description: 'Member added' })
  async addMember(
    @Request() req: any,
    @Param('id') workspaceId: string,
    @Body()
    body: {
      userId: string;
      email: string;
      name: string;
      role: WorkspaceRole;
    },
  ) {
    return this.collaborationService.addMember({
      workspaceId,
      userId: body.userId,
      email: body.email,
      name: body.name,
      role: body.role,
      addedBy: req.user.id,
      addedByName: req.user.name || req.user.email,
    });
  }

  @Delete('workspaces/:id/members/:userId')
  @ApiOperation({ summary: 'Remove member from workspace' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Request() req: any,
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return {
      success: await this.collaborationService.removeMember(
        workspaceId,
        userId,
        req.user.id,
        req.user.name || req.user.email,
      ),
    };
  }

  @Put('workspaces/:id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateMemberRole(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
    @Body() body: { role: WorkspaceRole },
  ) {
    return this.collaborationService.updateMemberRole(workspaceId, userId, body.role);
  }

  // ============================================================================
  // WORKSPACE INVITATIONS
  // ============================================================================

  @Post('workspaces/:id/invites')
  @ApiOperation({ summary: 'Create workspace invitation' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  async createInvite(
    @Request() req: any,
    @Param('id') workspaceId: string,
    @Body() body: { email: string; role: WorkspaceRole; expiresInDays?: number },
  ) {
    return this.collaborationService.createInvite({
      workspaceId,
      email: body.email,
      role: body.role,
      invitedBy: req.user.id,
      expiresInDays: body.expiresInDays,
    });
  }

  @Get('workspaces/:id/invites')
  @ApiOperation({ summary: 'Get pending invitations' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  async getPendingInvites(@Param('id') workspaceId: string) {
    return this.collaborationService.getPendingInvites(workspaceId);
  }

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Accept workspace invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptInvite(@Request() req: any, @Param('token') token: string) {
    return this.collaborationService.acceptInvite(
      token,
      req.user.id,
      req.user.name || req.user.email,
      req.user.email,
    );
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Revoke invitation' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  async revokeInvite(@Param('id') id: string) {
    return { success: await this.collaborationService.revokeInvite(id) };
  }

  // ============================================================================
  // DOCUMENT SHARING
  // ============================================================================

  @Post('workspaces/:id/share')
  @ApiOperation({ summary: 'Share a document' })
  @ApiResponse({ status: 201, description: 'Document shared' })
  async shareDocument(
    @Request() req: any,
    @Param('id') workspaceId: string,
    @Body()
    body: {
      documentId: string;
      documentType: 'invoice' | 'document' | 'report' | 'contract';
      documentName: string;
      recipients: Array<{
        type: 'user' | 'email' | 'workspace' | 'public';
        value: string;
        permission: SharePermission;
      }>;
      permission: SharePermission;
      expiresAt?: Date;
      password?: string;
    },
  ) {
    const workspace = await this.collaborationService.getWorkspace(workspaceId);
    return this.collaborationService.shareDocument({
      workspaceId,
      tenantId: workspace?.tenantId || req.user.tenantId || req.user.id,
      documentId: body.documentId,
      documentType: body.documentType,
      documentName: body.documentName,
      sharedBy: req.user.id,
      sharedByName: req.user.name || req.user.email,
      recipients: body.recipients.map((r) => ({ ...r, notified: false })),
      permission: body.permission,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      password: body.password,
    });
  }

  @Get('workspaces/:id/shared')
  @ApiOperation({ summary: 'List shared documents' })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiResponse({ status: 200, description: 'List of shared documents' })
  async getSharedDocuments(
    @Param('id') workspaceId: string,
    @Query('documentType') documentType?: string,
  ) {
    return this.collaborationService.getSharedDocuments(workspaceId, {
      documentType,
    });
  }

  @Get('shared/:shareId')
  @ApiOperation({ summary: 'Access shared document' })
  @ApiResponse({ status: 200, description: 'Shared document details' })
  async getSharedDocument(@Request() req: any, @Param('shareId') shareId: string) {
    await this.collaborationService.recordAccess(shareId, req.user?.id);
    return this.collaborationService.getSharedDocument(shareId);
  }

  @Delete('shared/:shareId')
  @ApiOperation({ summary: 'Revoke document share' })
  @ApiResponse({ status: 200, description: 'Share revoked' })
  async revokeShare(@Param('shareId') shareId: string) {
    return { success: await this.collaborationService.revokeShare(shareId) };
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  @Post('documents/:documentId/comments')
  @ApiOperation({ summary: 'Add comment to document' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body()
    body: {
      workspaceId: string;
      parentId?: string;
      content: string;
      mentions?: string[];
    },
  ) {
    const workspace = await this.collaborationService.getWorkspace(body.workspaceId);
    return this.collaborationService.addComment({
      workspaceId: body.workspaceId,
      tenantId: workspace?.tenantId || req.user.tenantId || req.user.id,
      documentId,
      parentId: body.parentId,
      authorId: req.user.id,
      authorName: req.user.name || req.user.email,
      authorAvatar: req.user.avatar,
      content: body.content,
      mentions: body.mentions,
    });
  }

  @Get('documents/:documentId/comments')
  @ApiOperation({ summary: 'Get comments for document' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of comments' })
  async getComments(
    @Param('documentId') documentId: string,
    @Query('status') status?: string,
  ) {
    return this.collaborationService.getComments(documentId, {
      status: status as any,
    });
  }

  @Put('comments/:commentId')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
  ) {
    return this.collaborationService.updateComment(commentId, body.content);
  }

  @Post('comments/:commentId/resolve')
  @ApiOperation({ summary: 'Resolve comment' })
  @ApiResponse({ status: 200, description: 'Comment resolved' })
  async resolveComment(@Request() req: any, @Param('commentId') commentId: string) {
    return this.collaborationService.resolveComment(
      commentId,
      req.user.id,
      req.user.name || req.user.email,
    );
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(@Param('commentId') commentId: string) {
    return { success: await this.collaborationService.deleteComment(commentId) };
  }

  @Post('comments/:commentId/reactions')
  @ApiOperation({ summary: 'Add/remove reaction' })
  @ApiResponse({ status: 200, description: 'Reaction toggled' })
  async toggleReaction(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body() body: { emoji: string },
  ) {
    return this.collaborationService.addReaction(commentId, req.user.id, body.emoji);
  }

  // ============================================================================
  // ACTIVITY FEED
  // ============================================================================

  @Get('workspaces/:id/activity')
  @ApiOperation({ summary: 'Get workspace activity feed' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Activity feed' })
  async getActivityFeed(
    @Param('id') workspaceId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.collaborationService.getActivityFeed(workspaceId, {
      type: type as any,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      offset: offset ? parseInt(String(offset), 10) : undefined,
    });
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get user activity feed across all workspaces' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'User activity feed' })
  async getUserActivityFeed(@Request() req: any, @Query('limit') limit?: number) {
    return this.collaborationService.getUserActivityFeed(
      req.user.tenantId || req.user.id,
      req.user.id,
      limit ? parseInt(String(limit), 10) : 50,
    );
  }

  @Post('activity/:activityId/read')
  @ApiOperation({ summary: 'Mark activity as read' })
  @ApiResponse({ status: 200, description: 'Activity marked as read' })
  async markActivityAsRead(@Request() req: any, @Param('activityId') activityId: string) {
    await this.collaborationService.markActivityAsRead(activityId, req.user.id);
    return { success: true };
  }

  @Get('workspaces/:id/unread-count')
  @ApiOperation({ summary: 'Get unread activity count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Request() req: any, @Param('id') workspaceId: string) {
    return {
      count: await this.collaborationService.getUnreadCount(workspaceId, req.user.id),
    };
  }
}

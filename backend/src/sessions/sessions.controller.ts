import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  SessionDto,
  LoginActivityDto,
  CreateSessionDto,
  RevokeSessionDto,
  SessionPreferencesDto,
  UpdateSessionPreferencesDto,
  TrustDeviceDto,
  SessionSummaryDto,
} from './sessions.dto';

@ApiTags('sessions')
@Controller('sessions')
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved', type: [SessionDto] })
  async getActiveSessions(@Request() req: any): Promise<SessionDto[]> {
    const userId = req.user?.id || 'mock-user-id';
    const currentSessionId = req.headers['x-session-id'];
    return this.sessionsService.getActiveSessions(userId, currentSessionId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get session summary for current user' })
  @ApiResponse({ status: 200, description: 'Session summary retrieved', type: SessionSummaryDto })
  async getSessionSummary(@Request() req: any): Promise<SessionSummaryDto> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.getSessionSummary(userId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get login activity history' })
  @ApiResponse({ status: 200, description: 'Login activity retrieved', type: [LoginActivityDto] })
  async getLoginActivity(
    @Request() req: any,
    @Query('limit') limit?: number
  ): Promise<LoginActivityDto[]> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.getLoginActivity(userId, limit);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get session preferences' })
  @ApiResponse({ status: 200, description: 'Session preferences retrieved', type: SessionPreferencesDto })
  async getSessionPreferences(@Request() req: any): Promise<SessionPreferencesDto> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.getSessionPreferences(userId);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update session preferences' })
  @ApiResponse({ status: 200, description: 'Session preferences updated', type: SessionPreferencesDto })
  async updateSessionPreferences(
    @Request() req: any,
    @Body() updateDto: UpdateSessionPreferencesDto
  ): Promise<SessionPreferencesDto> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.updateSessionPreferences(userId, updateDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created', type: SessionDto })
  async createSession(
    @Request() req: any,
    @Body() createSessionDto: CreateSessionDto
  ): Promise<SessionDto> {
    const currentSessionId = req.headers['x-session-id'];
    return this.sessionsService.createSession(createSessionDto, currentSessionId);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  async revokeSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string
  ): Promise<void> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.revokeSession(userId, sessionId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({ status: 200, description: 'All other sessions revoked' })
  async revokeAllOtherSessions(@Request() req: any): Promise<{ revokedCount: number }> {
    const userId = req.user?.id || 'mock-user-id';
    const currentSessionId = req.headers['x-session-id'] || 'sess_current_123';
    const revokedCount = await this.sessionsService.revokeAllOtherSessions(userId, currentSessionId);
    return { revokedCount };
  }

  @Post('trust-device')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Trust a device' })
  @ApiResponse({ status: 204, description: 'Device trusted successfully' })
  async trustDevice(
    @Request() req: any,
    @Body() trustDeviceDto: TrustDeviceDto
  ): Promise<void> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.trustDevice(userId, trustDeviceDto.deviceFingerprint);
  }

  @Delete('trust-device/:fingerprint')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Untrust a device' })
  @ApiResponse({ status: 204, description: 'Device untrusted successfully' })
  async untrustDevice(
    @Request() req: any,
    @Param('fingerprint') fingerprint: string
  ): Promise<void> {
    const userId = req.user?.id || 'mock-user-id';
    return this.sessionsService.untrustDevice(userId, fingerprint);
  }
}

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityAuditService, ComplianceStandard, SecuritySeverity } from './security-audit.service';

@ApiTags('security')
@Controller('security')
export class SecurityAuditController {
  constructor(private readonly securityAuditService: SecurityAuditService) {}

  // =================== AUDIT REPORTS ===================

  @Post('audit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run security audit' })
  @ApiResponse({ status: 201, description: 'Security audit report generated' })
  async runSecurityAudit() {
    return this.securityAuditService.runSecurityAudit();
  }

  @Get('audit/latest')
  @ApiOperation({ summary: 'Get latest audit report' })
  @ApiResponse({ status: 200, description: 'Returns latest security audit report' })
  async getLatestReport() {
    return this.securityAuditService.getLatestReport();
  }

  @Get('audit/reports')
  @ApiOperation({ summary: 'Get audit report history' })
  @ApiResponse({ status: 200, description: 'Returns audit report history' })
  async getReports(@Query('limit') limit?: string) {
    return this.securityAuditService.getReports(limit ? parseInt(limit) : undefined);
  }

  @Get('audit/reports/:id')
  @ApiOperation({ summary: 'Get specific audit report' })
  @ApiResponse({ status: 200, description: 'Returns specific audit report' })
  async getReport(@Param('id') reportId: string) {
    return this.securityAuditService.getReport(reportId);
  }

  // =================== COMPLIANCE ===================

  @Get('compliance/:standard')
  @ApiOperation({ summary: 'Get compliance status for a standard' })
  @ApiResponse({ status: 200, description: 'Returns compliance status' })
  async getComplianceStatus(@Param('standard') standard: ComplianceStandard) {
    return this.securityAuditService.getComplianceStatus(standard);
  }

  // =================== SECURITY EVENTS ===================

  @Get('events')
  @ApiOperation({ summary: 'Get security events' })
  @ApiResponse({ status: 200, description: 'Returns security events' })
  async getSecurityEvents(
    @Query('type') type?: string,
    @Query('severity') severity?: SecuritySeverity,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityAuditService.getSecurityEvents({
      type: type as any,
      severity,
      since: since ? new Date(since) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('events/summary')
  @ApiOperation({ summary: 'Get security events summary' })
  @ApiResponse({ status: 200, description: 'Returns events summary' })
  async getEventsSummary(@Query('since') since?: string) {
    return this.securityAuditService.getEventsSummary(since ? new Date(since) : undefined);
  }

  @Post('events')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log a security event' })
  @ApiResponse({ status: 201, description: 'Security event logged' })
  async logSecurityEvent(
    @Body() body: {
      type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_access' | 'config_change';
      severity: SecuritySeverity;
      message: string;
      source: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userId?: string;
    },
  ) {
    return this.securityAuditService.logSecurityEvent(
      body.type,
      body.severity,
      body.message,
      body.source,
      body.metadata,
      body.ipAddress,
      body.userId,
    );
  }

  // =================== THREAT DETECTION ===================

  @Post('detect-threats')
  @ApiOperation({ summary: 'Detect threats in input' })
  @ApiResponse({ status: 200, description: 'Threat detection result' })
  async detectThreats(@Body('input') input: string) {
    return this.securityAuditService.detectThreats(input);
  }

  @Get('threat-intelligence')
  @ApiOperation({ summary: 'Get threat intelligence data' })
  @ApiResponse({ status: 200, description: 'Returns threat intelligence' })
  async getThreatIntelligence() {
    return this.securityAuditService.getThreatIntelligence();
  }

  // =================== IP MANAGEMENT ===================

  @Get('blocked-ips')
  @ApiOperation({ summary: 'Get blocked IPs' })
  @ApiResponse({ status: 200, description: 'Returns blocked IPs' })
  async getBlockedIps() {
    const intel = this.securityAuditService.getThreatIntelligence();
    return { blockedIps: intel.blockedIps };
  }

  @Post('block-ip')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block an IP address' })
  @ApiResponse({ status: 201, description: 'IP blocked' })
  async blockIp(@Body() body: { ip: string; reason?: string }) {
    this.securityAuditService.blockIp(body.ip, body.reason);
    return { success: true, message: `IP ${body.ip} blocked` };
  }

  @Post('unblock-ip')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock an IP address' })
  @ApiResponse({ status: 200, description: 'IP unblocked' })
  async unblockIp(@Body('ip') ip: string) {
    const result = this.securityAuditService.unblockIp(ip);
    return { success: result };
  }

  @Get('check-ip/:ip')
  @ApiOperation({ summary: 'Check if IP is blocked' })
  @ApiResponse({ status: 200, description: 'IP status' })
  async checkIp(@Param('ip') ip: string) {
    const isBlocked = this.securityAuditService.isIpBlocked(ip);
    return { ip, blocked: isBlocked };
  }

  // =================== UTILITIES ===================

  @Get('generate-token')
  @ApiOperation({ summary: 'Generate secure token' })
  @ApiResponse({ status: 200, description: 'Returns secure token' })
  async generateToken(@Query('length') length?: string) {
    const token = this.securityAuditService.generateSecurityToken(
      length ? parseInt(length) : undefined,
    );
    return { token };
  }
}

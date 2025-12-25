/**
 * CRM-Finance Integration Controller
 * API endpoints for CRM-Finance data integration
 * Sprint 26 - Grok Backlog
 */

import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrmFinanceIntegrationService } from './crm-finance-integration.service';

@ApiTags('CRM-Finance Integration')
@Controller('crm/finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmFinanceIntegrationController {
  constructor(private readonly integrationService: CrmFinanceIntegrationService) {}

  @Get('customer/:partnerId/summary')
  @ApiOperation({ summary: 'Get customer financial summary' })
  @ApiParam({ name: 'partnerId', description: 'Partner/Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer financial summary' })
  async getCustomerSummary(
    @Param('partnerId') partnerId: string,
    @Request() req: { user: { activeOrganizationId?: string } },
  ) {
    const organizationId = req.user.activeOrganizationId;
    return this.integrationService.getCustomerFinancialSummary(partnerId, organizationId);
  }

  @Get('customer/:partnerId/insights')
  @ApiOperation({ summary: 'Get full customer insights with payment history' })
  @ApiParam({ name: 'partnerId', description: 'Partner/Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer insights including payment history and recommendations' })
  async getCustomerInsights(
    @Param('partnerId') partnerId: string,
    @Request() req: { user: { activeOrganizationId?: string } },
  ) {
    const organizationId = req.user.activeOrganizationId;
    return this.integrationService.getPartnerInsights(partnerId, organizationId);
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Get top customers by revenue' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of customers to return (default 10)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for period filter (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for period filter (ISO format)' })
  @ApiResponse({ status: 200, description: 'List of top customers' })
  async getTopCustomers(
    @Request() req: { user: { activeOrganizationId?: string } },
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.activeOrganizationId;
    if (!organizationId) {
      return { error: 'No organization selected' };
    }

    const period =
      startDate && endDate
        ? { start: new Date(startDate), end: new Date(endDate) }
        : undefined;

    return this.integrationService.getTopCustomers(
      organizationId,
      limit ? parseInt(limit) : 10,
      period,
    );
  }

  @Get('customers-at-risk')
  @ApiOperation({ summary: 'Get customers at risk (high overdue or declining payments)' })
  @ApiResponse({ status: 200, description: 'List of at-risk customers' })
  async getCustomersAtRisk(@Request() req: { user: { activeOrganizationId?: string } }) {
    const organizationId = req.user.activeOrganizationId;
    if (!organizationId) {
      return { error: 'No organization selected' };
    }

    return this.integrationService.getCustomersAtRisk(organizationId);
  }
}

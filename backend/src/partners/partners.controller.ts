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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, PartnerType } from '@prisma/client';
import { PartnersService, CreatePartnerDto, UpdatePartnerDto } from './partners.service';

@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async create(@Request() req: any, @Body() dto: CreatePartnerDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!dto.name) {
      throw new BadRequestException('Partner name is required');
    }

    return this.partnersService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all partners with optional filters' })
  @ApiQuery({ name: 'type', required: false, enum: PartnerType })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async findAll(
    @Request() req: any,
    @Query('type') type?: PartnerType,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.findAll(userId, {
      type,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get partner statistics' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getStats(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.getStats(userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get partner dashboard summary with top partners and recent activity' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getDashboardSummary(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.getDashboardSummary(userId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import partners from existing invoices' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async importFromInvoices(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.importFromInvoices(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async findById(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.findById(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update partner' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete partner' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.delete(userId, id);
  }

  @Post(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle partner active status' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async toggleActive(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.toggleActive(userId, id);
  }

  // =================== CREDIT SCORING ENDPOINTS ===================

  @Get('credit/summary')
  @ApiOperation({ summary: 'Get credit scores summary for all partners (Scor de credit sumar)' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getCreditScoresSummary(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.getCreditScoresSummary(userId);
  }

  @Get('credit/by-risk')
  @ApiOperation({ summary: 'Get partners sorted by risk level (Parteneri după nivel de risc)' })
  @ApiQuery({ name: 'riskLevel', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getPartnersByRisk(
    @Request() req: any,
    @Query('riskLevel') riskLevel?: 'low' | 'medium' | 'high' | 'critical',
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.getPartnersByRisk(
      userId,
      riskLevel,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id/credit-score')
  @ApiOperation({ summary: 'Calculate credit score for a partner (Calcul scor de credit)' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getCreditScore(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.partnersService.calculateCreditScore(userId, id);
  }
}

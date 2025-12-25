import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  ETransportService,
  TransportType,
  TransportStatus,
  TransportGoods,
  GoodsCategory,
} from './e-transport.service';

interface CreateTransportDto {
  declarationType: TransportType;
  sender: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
  };
  receiver: {
    cui: string;
    name: string;
    address: string;
    city: string;
    county: string;
    country: string;
  };
  transport: {
    vehicleRegistration: string;
    trailerRegistration?: string;
    driverName: string;
    driverCNP?: string;
    driverLicense?: string;
    carrierCui?: string;
    carrierName?: string;
  };
  route: {
    startAddress: string;
    startCity: string;
    startCounty: string;
    startCountry: string;
    endAddress: string;
    endCity: string;
    endCounty: string;
    endCountry: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    distance?: number;
  };
  goods: TransportGoods[];
}

@ApiTags('e-transport')
@ApiBearerAuth()
@Controller('e-transport')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class ETransportController {
  constructor(private readonly eTransportService: ETransportService) {}

  @Post()
  @ApiOperation({ summary: 'Create new e-Transport declaration per OUG 41/2022' })
  async createDeclaration(
    @Body() body: CreateTransportDto & { userId: string },
  ) {
    return this.eTransportService.createDeclaration(body.userId, body);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate e-Transport declaration' })
  async validateDeclaration(@Param('id') id: string) {
    return this.eTransportService.validateDeclaration(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit e-Transport declaration to ANAF for UIT' })
  async submitToANAF(@Param('id') id: string) {
    return this.eTransportService.submitToANAF(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check e-Transport declaration status with ANAF' })
  async checkStatus(@Param('id') id: string) {
    return this.eTransportService.checkStatus(id);
  }

  @Put(':id/start')
  @ApiOperation({ summary: 'Mark transport as started (requires UIT)' })
  async startTransport(@Param('id') id: string) {
    return this.eTransportService.startTransport(id);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Mark transport as completed' })
  async completeTransport(@Param('id') id: string) {
    return this.eTransportService.completeTransport(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel e-Transport declaration' })
  async cancelDeclaration(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.eTransportService.cancelDeclaration(id, body.reason);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get e-Transport declaration by ID' })
  async getDeclaration(@Param('id') id: string) {
    return this.eTransportService.getDeclaration(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all e-Transport declarations for user' })
  @ApiQuery({ name: 'status', required: false, enum: TransportStatus })
  async getUserDeclarations(
    @Query('userId') userId: string,
    @Query('status') status?: TransportStatus,
  ) {
    return this.eTransportService.getUserDeclarations(userId, status);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active transports (with UIT or in transit)' })
  async getActiveTransports(@Query('userId') userId: string) {
    return this.eTransportService.getActiveTransports(userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get e-Transport statistics for user' })
  async getStatistics(@Query('userId') userId: string) {
    return this.eTransportService.getStatistics(userId);
  }

  @Post('from-route/:routeId')
  @ApiOperation({ summary: 'Create e-Transport declaration from delivery route' })
  async createFromRoute(
    @Query('userId') userId: string,
    @Param('routeId') routeId: string,
  ) {
    return this.eTransportService.createFromDeliveryRoute(userId, routeId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available goods categories' })
  getGoodsCategories() {
    return Object.values(GoodsCategory).map((cat) => ({
      code: cat,
      name: this.getCategoryName(cat),
    }));
  }

  @Get('transport-types')
  @ApiOperation({ summary: 'Get available transport types' })
  getTransportTypes() {
    return Object.values(TransportType).map((type) => ({
      code: type,
      name: this.getTypeName(type),
    }));
  }

  private getCategoryName(category: GoodsCategory): string {
    const names: Record<GoodsCategory, string> = {
      [GoodsCategory.FRUITS_VEGETABLES]: 'Fructe și legume',
      [GoodsCategory.MEAT_PRODUCTS]: 'Carne și produse din carne',
      [GoodsCategory.CLOTHING_FOOTWEAR]: 'Îmbrăcăminte și încălțăminte',
      [GoodsCategory.BUILDING_MATERIALS]: 'Materiale de construcții',
      [GoodsCategory.ELECTRONICS]: 'Electronice și electrocasnice',
      [GoodsCategory.FUEL]: 'Combustibili',
      [GoodsCategory.ALCOHOL_TOBACCO]: 'Alcool și tutun',
      [GoodsCategory.OTHER]: 'Alte mărfuri',
    };
    return names[category] || category;
  }

  private getTypeName(type: TransportType): string {
    const names: Record<TransportType, string> = {
      [TransportType.NATIONAL]: 'Transport intern',
      [TransportType.INTERNATIONAL_IMPORT]: 'Import internațional',
      [TransportType.INTERNATIONAL_EXPORT]: 'Export internațional',
      [TransportType.INTRA_EU]: 'Transport intra-UE',
    };
    return names[type] || type;
  }
}

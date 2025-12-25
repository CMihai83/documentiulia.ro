import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  TachographService,
  TachographFile,
  InfringementType,
  InfringementSeverity,
} from './tachograph.service';

@ApiTags('tachograph')
@ApiBearerAuth()
@Controller('fleet/tachograph')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN)
export class TachographController {
  constructor(private readonly tachographService: TachographService) {}

  // =================== FILE UPLOAD ===================

  @Post('upload')
  @ApiOperation({ summary: 'Upload tachograph file (.ddd)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        fileType: { type: 'string', enum: ['DRIVER_CARD', 'VEHICLE_UNIT', 'COMPANY_CARD'] },
        driverId: { type: 'string' },
        vehicleId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: {
      userId: string;
      fileType: 'DRIVER_CARD' | 'VEHICLE_UNIT' | 'COMPANY_CARD';
      driverId?: string;
      vehicleId?: string;
    },
  ) {
    return this.tachographService.uploadTachographFile(body.userId, {
      buffer: file.buffer,
      originalName: file.originalname,
      fileType: body.fileType,
      driverId: body.driverId,
      vehicleId: body.vehicleId,
    });
  }

  @Get('files')
  @ApiOperation({ summary: 'Get uploaded tachograph files' })
  @ApiQuery({ name: 'fileType', required: false, enum: ['DRIVER_CARD', 'VEHICLE_UNIT', 'COMPANY_CARD'] })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PARSED', 'ERROR'] })
  getFiles(
    @Query('userId') userId: string,
    @Query('fileType') fileType?: TachographFile['fileType'],
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: TachographFile['status'],
  ) {
    return this.tachographService.getTachographFiles(userId, {
      fileType,
      driverId,
      vehicleId,
      status,
    });
  }

  // =================== ANALYSIS ===================

  @Get('analysis/daily/:driverId')
  @ApiOperation({ summary: 'Get daily activity analysis for driver' })
  @ApiQuery({ name: 'date', required: false, description: 'Date (ISO format, defaults to today)' })
  async getDailyAnalysis(
    @Query('userId') userId: string,
    @Param('driverId') driverId: string,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.tachographService.analyzeDailyActivities(userId, driverId, date);
  }

  @Get('analysis/weekly/:driverId')
  @ApiOperation({ summary: 'Get weekly activity analysis for driver' })
  @ApiQuery({ name: 'weekStart', required: false, description: 'Week start date (ISO format, defaults to current week)' })
  async getWeeklyAnalysis(
    @Query('userId') userId: string,
    @Param('driverId') driverId: string,
    @Query('weekStart') weekStartStr?: string,
  ) {
    let weekStart: Date;
    if (weekStartStr) {
      weekStart = new Date(weekStartStr);
    } else {
      weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
    }
    return this.tachographService.analyzeWeeklyActivities(userId, driverId, weekStart);
  }

  @Get('analysis/full/:driverId')
  @ApiOperation({ summary: 'Get full compliance analysis for driver' })
  @ApiQuery({ name: 'periodStart', required: false, description: 'Period start date (ISO format)' })
  @ApiQuery({ name: 'periodEnd', required: false, description: 'Period end date (ISO format)' })
  async getFullAnalysis(
    @Query('userId') userId: string,
    @Param('driverId') driverId: string,
    @Query('periodStart') periodStartStr?: string,
    @Query('periodEnd') periodEndStr?: string,
  ) {
    const periodStart = periodStartStr ? new Date(periodStartStr) : undefined;
    const periodEnd = periodEndStr ? new Date(periodEndStr) : undefined;
    return this.tachographService.analyzeDriver(userId, driverId, periodStart, periodEnd);
  }

  // =================== DASHBOARD ===================

  @Get('dashboard/:driverId')
  @ApiOperation({ summary: 'Get driver tachograph dashboard' })
  async getDriverDashboard(
    @Query('userId') userId: string,
    @Param('driverId') driverId: string,
  ) {
    return this.tachographService.getDriverDashboard(userId, driverId);
  }

  // =================== ACTIVITIES ===================

  @Get('activities/:driverId')
  @ApiOperation({ summary: 'Get activity records for driver' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getActivities(
    @Query('userId') userId: string,
    @Param('driverId') driverId: string,
    @Query('dateFrom') dateFromStr?: string,
    @Query('dateTo') dateToStr?: string,
  ) {
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;
    return this.tachographService.getActivityRecords(userId, driverId, dateFrom, dateTo);
  }

  // =================== INFRINGEMENTS ===================

  @Get('infringements')
  @ApiOperation({ summary: 'Get infringements for all drivers or specific driver' })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: InfringementType })
  @ApiQuery({ name: 'severity', required: false, enum: InfringementSeverity })
  @ApiQuery({ name: 'acknowledged', required: false, type: 'boolean' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getInfringements(
    @Query('userId') userId: string,
    @Query('driverId') driverId?: string,
    @Query('type') type?: InfringementType,
    @Query('severity') severity?: InfringementSeverity,
    @Query('acknowledged') acknowledged?: string,
    @Query('dateFrom') dateFromStr?: string,
    @Query('dateTo') dateToStr?: string,
  ) {
    return this.tachographService.getInfringements(userId, driverId, {
      type,
      severity,
      acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
      dateFrom: dateFromStr ? new Date(dateFromStr) : undefined,
      dateTo: dateToStr ? new Date(dateToStr) : undefined,
    });
  }

  @Put('infringements/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an infringement' })
  acknowledgeInfringement(
    @Query('userId') userId: string,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    const result = this.tachographService.acknowledgeInfringement(userId, id, body.notes);
    if (!result) {
      return { error: 'Infringement not found' };
    }
    return result;
  }

  // =================== EU REGULATIONS INFO ===================

  @Get('regulations')
  @ApiOperation({ summary: 'Get EU driving/rest time regulations' })
  getRegulations() {
    return {
      dailyDriving: {
        standard: '9 ore',
        extended: '10 ore (max 2x/săptămână)',
        description: 'Timp maxim de conducere zilnic',
      },
      continuousDriving: {
        maximum: '4.5 ore',
        breakRequired: '45 minute',
        breakSplit: '15 min + 30 min (în această ordine)',
        description: 'Conducere continuă înainte de pauză obligatorie',
      },
      weeklyDriving: {
        maximum: '56 ore',
        biWeekly: '90 ore (2 săptămâni consecutive)',
        description: 'Timp maxim de conducere săptămânal',
      },
      dailyRest: {
        standard: '11 ore',
        reduced: '9 ore (max 3x/săptămână)',
        split: '3 ore + 9 ore = 12 ore total',
        description: 'Repaus zilnic minim',
      },
      weeklyRest: {
        standard: '45 ore',
        reduced: '24 ore (trebuie compensat în 3 săptămâni)',
        description: 'Repaus săptămânal minim',
      },
      regulation: 'EU Regulation 561/2006, 165/2014',
      country: 'România / Uniunea Europeană',
    };
  }
}

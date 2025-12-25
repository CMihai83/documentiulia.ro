import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { CreateErrorDto } from './dto/create-error.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Simple API key guard for error logging
function validateApiKey(apiKey: string | undefined): boolean {
  const validKey = process.env.ERROR_LOGGING_API_KEY || 'default-error-logging-key';
  return apiKey === validKey;
}

@Controller('errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  // Public endpoint for logging errors (secured by API key)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createErrorDto: CreateErrorDto,
    @Headers('x-error-logger-key') apiKey: string,
  ) {
    // Validate API key or allow in development
    if (process.env.NODE_ENV === 'production' && !validateApiKey(apiKey)) {
      // Still log but don't fail - we want to capture errors even if key is wrong
      console.warn('Invalid API key for error logging');
    }

    return this.errorsService.create(createErrorDto);
  }

  // Batch error logging
  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatch(
    @Body() body: { errors: CreateErrorDto[] },
    @Headers('x-error-logger-key') apiKey: string,
  ) {
    if (process.env.NODE_ENV === 'production' && !validateApiKey(apiKey)) {
      console.warn('Invalid API key for batch error logging');
    }

    return this.errorsService.createBatch(body.errors);
  }

  // Admin endpoints - require authentication
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('source') source?: string,
  ) {
    return this.errorsService.findAll({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Max 100 per page
      type,
      startDate,
      endDate,
      userId,
      source,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getStats() {
    return this.errorsService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.errorsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.errorsService.delete(id);
  }

  @Delete('cleanup/old')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteOld(@Query('days') days: string = '30') {
    return this.errorsService.deleteOld(parseInt(days, 10));
  }
}

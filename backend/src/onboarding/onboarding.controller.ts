import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingService, OnboardingData } from './onboarding.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

class CompleteOnboardingDto {
  company: {
    name: string;
    cui: string;
    regCom?: string;
    address?: string;
    city?: string;
    county?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
  };

  tax: {
    vatPayer: boolean;
    vatRate: '21' | '11' | '5' | '0';
    taxRegime: 'normal' | 'micro' | 'nonprofit';
    anafCertificate: boolean;
    sagaIntegration: boolean;
  };

  bank: {
    bankName?: string;
    bankAccount?: string;
    swift?: string;
    currency: 'RON' | 'EUR' | 'USD';
  };

  team: Array<{
    name: string;
    email: string;
    role: 'admin' | 'accountant' | 'viewer';
  }>;
}

class SaveProgressDto {
  step: string;
  data: Partial<OnboardingData>;
}

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete user onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeOnboarding(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CompleteOnboardingDto,
  ) {
    this.logger.log(`Completing onboarding for user ${req.user.id}`);

    const result = await this.onboardingService.completeOnboarding(
      req.user.id,
      dto as OnboardingData,
    );

    return {
      success: true,
      message: 'Onboarding completed successfully',
      organizationId: result.organizationId,
    };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get onboarding status' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@Request() req: AuthenticatedRequest) {
    const status = await this.onboardingService.getOnboardingStatus(req.user.id);
    return status;
  }

  @Put('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save onboarding progress' })
  @ApiResponse({ status: 200, description: 'Progress saved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveProgress(@Request() req: AuthenticatedRequest, @Body() dto: SaveProgressDto) {
    const result = await this.onboardingService.saveProgress(
      req.user.id,
      dto.step,
      dto.data,
    );
    return result;
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved onboarding progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProgress(@Request() req: AuthenticatedRequest) {
    const progress = await this.onboardingService.getProgress(req.user.id);
    return progress || { step: '1', data: {} };
  }

  @Post('skip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding skipped' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async skipOnboarding(@Request() req: AuthenticatedRequest) {
    await this.onboardingService.skipOnboarding(req.user.id);
    return {
      success: true,
      message: 'Onboarding skipped. You can complete it later from settings.',
    };
  }
}

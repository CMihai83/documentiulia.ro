import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  EnableMfaDto,
  VerifyMfaSetupDto,
  VerifyMfaLoginDto,
  DisableMfaDto,
  RegenerateBackupCodesDto,
  MfaSetupResponseDto,
  MfaStatusResponseDto,
  BackupCodesResponseDto,
} from './mfa.dto';

@ApiTags('mfa')
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Generate MFA setup QR code and secret' })
  @ApiResponse({
    status: 200,
    description: 'MFA setup data generated',
    type: MfaSetupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'MFA already enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async setupMfa(@Request() req: any, @Body() dto: EnableMfaDto): Promise<MfaSetupResponseDto> {
    return this.mfaService.generateMfaSetup(req.user.id, dto.password);
  }

  @Post('verify-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Verify MFA setup and enable MFA' })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    type: BackupCodesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async verifySetup(@Request() req: any, @Body() dto: VerifyMfaSetupDto) {
    return this.mfaService.verifyAndEnableMfa(req.user.id, dto.token, dto.secret);
  }

  @Post('verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute (brute force protection)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code during login (public endpoint)' })
  @ApiResponse({ status: 200, description: 'MFA verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async verifyMfa(@Body() dto: VerifyMfaLoginDto & { userId: string }) {
    return this.mfaService.verifyMfaToken(dto.userId, dto.token, dto.backupCode);
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for account' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password or MFA code' })
  async disableMfa(@Request() req: any, @Body() dto: DisableMfaDto) {
    return this.mfaService.disableMfa(req.user.id, dto.password, dto.token);
  }

  @Post('regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated',
    type: BackupCodesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password or MFA code' })
  async regenerateBackupCodes(@Request() req: any, @Body() dto: RegenerateBackupCodesDto) {
    return this.mfaService.regenerateBackupCodes(req.user.id, dto.password, dto.token);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA status for current user' })
  @ApiResponse({
    status: 200,
    description: 'MFA status',
    type: MfaStatusResponseDto,
  })
  async getMfaStatus(@Request() req: any): Promise<MfaStatusResponseDto> {
    return this.mfaService.getMfaStatus(req.user.id);
  }
}

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  BiometricAuthService,
  RegistrationCredential,
  AuthenticationCredential,
} from './biometric-auth.service';

@ApiTags('Biometric Authentication')
@Controller('auth/biometric')
export class BiometricAuthController {
  constructor(private readonly biometricService: BiometricAuthService) {}

  // =================== REGISTRATION ===================

  @Post('register/options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WebAuthn registration options' })
  @ApiResponse({ status: 200, description: 'Registration options' })
  async getRegistrationOptions(
    @Request() req: any,
    @Body() body: { platform?: 'platform' | 'cross-platform' },
  ) {
    const options = await this.biometricService.generateRegistrationOptions(
      req.user.id,
      req.user.tenantId || req.user.id,
      req.user.email,
      req.user.name || req.user.email,
      body.platform,
    );
    return { options };
  }

  @Post('register/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify registration and add device' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  async verifyRegistration(
    @Request() req: any,
    @Headers('user-agent') userAgent: string,
    @Body() credential: RegistrationCredential,
  ) {
    const device = await this.biometricService.verifyRegistration(
      req.user.id,
      req.user.tenantId || req.user.id,
      credential,
      userAgent,
    );
    return {
      success: true,
      device: {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        registeredAt: device.registeredAt,
      },
    };
  }

  // =================== AUTHENTICATION ===================

  @Post('authenticate/options')
  @ApiOperation({ summary: 'Get WebAuthn authentication options' })
  @ApiResponse({ status: 200, description: 'Authentication options' })
  async getAuthenticationOptions(
    @Body() body: { userId?: string },
  ) {
    const options = await this.biometricService.generateAuthenticationOptions(
      body.userId,
    );
    return { options };
  }

  @Post('authenticate/verify')
  @ApiOperation({ summary: 'Verify biometric authentication' })
  @ApiResponse({ status: 200, description: 'Authentication result' })
  async verifyAuthentication(
    @Body() body: {
      credential: AuthenticationCredential;
      challengeId: string;
    },
  ) {
    const result = await this.biometricService.verifyAuthentication(
      body.credential,
      body.challengeId,
    );
    return {
      success: true,
      userId: result.userId,
      device: {
        id: result.device.id,
        deviceName: result.device.deviceName,
      },
    };
  }

  // =================== DEVICE MANAGEMENT ===================

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user biometric devices' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async getDevices(@Request() req: any) {
    const devices = await this.biometricService.getUserDevices(req.user.id);
    return {
      devices: devices.map(d => ({
        id: d.id,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        biometricType: d.biometricType,
        status: d.status,
        lastUsedAt: d.lastUsedAt,
        registeredAt: d.registeredAt,
        platform: d.platform,
      })),
      total: devices.length,
    };
  }

  @Get('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device details' })
  @ApiResponse({ status: 200, description: 'Device details' })
  async getDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    const device = await this.biometricService.getDevice(req.user.id, deviceId);
    return {
      id: device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      biometricType: device.biometricType,
      status: device.status,
      lastUsedAt: device.lastUsedAt,
      registeredAt: device.registeredAt,
      platform: device.platform,
    };
  }

  @Put('devices/:deviceId/name')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update device name' })
  @ApiResponse({ status: 200, description: 'Device name updated' })
  async updateDeviceName(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
    @Body() body: { deviceName: string },
  ) {
    const device = await this.biometricService.updateDeviceName(
      req.user.id,
      deviceId,
      body.deviceName,
    );
    return {
      success: true,
      device: {
        id: device.id,
        deviceName: device.deviceName,
      },
    };
  }

  @Post('devices/:deviceId/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable a device' })
  @ApiResponse({ status: 200, description: 'Device disabled' })
  async disableDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    await this.biometricService.disableDevice(req.user.id, deviceId);
    return { success: true, message: 'Device disabled' };
  }

  @Post('devices/:deviceId/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable a device' })
  @ApiResponse({ status: 200, description: 'Device enabled' })
  async enableDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    await this.biometricService.enableDevice(req.user.id, deviceId);
    return { success: true, message: 'Device enabled' };
  }

  @Post('devices/:deviceId/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a device permanently' })
  @ApiResponse({ status: 200, description: 'Device revoked' })
  async revokeDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    await this.biometricService.revokeDevice(req.user.id, deviceId);
    return { success: true, message: 'Device revoked' };
  }

  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a device' })
  @ApiResponse({ status: 200, description: 'Device deleted' })
  async deleteDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    await this.biometricService.deleteDevice(req.user.id, deviceId);
    return { success: true, message: 'Device deleted' };
  }

  @Post('devices/revoke-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all devices' })
  @ApiResponse({ status: 200, description: 'All devices revoked' })
  async revokeAllDevices(@Request() req: any) {
    const count = await this.biometricService.revokeAllDevices(req.user.id);
    return { success: true, message: `${count} devices revoked` };
  }

  // =================== STATS ===================

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get biometric stats (admin)' })
  @ApiResponse({ status: 200, description: 'Biometric statistics' })
  async getStats() {
    return this.biometricService.getStats();
  }
}

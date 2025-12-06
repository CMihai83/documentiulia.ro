import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ClerkAuthGuard } from './guards/clerk.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Req() req: any) {
    const user = await this.authService.validateClerkUser(req.user.clerkId);
    const companies = await this.authService.getUserCompanies(user.id);
    const defaultCompany = await this.authService.getDefaultCompany(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
      },
      companies: companies.map((cu) => ({
        id: cu.company.id,
        name: cu.company.name,
        cui: cu.company.cui,
        role: cu.role,
      })),
      defaultCompanyId: defaultCompany?.id,
    };
  }

  @Post('webhook/clerk')
  @ApiOperation({ summary: 'Clerk webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleClerkWebhook(@Body() body: any, @Req() req: any) {
    // Verify webhook signature in production
    const { type, data } = body;

    switch (type) {
      case 'user.created':
      case 'user.updated':
        await this.authService.syncClerkUser(data);
        break;
      case 'user.deleted':
        // Handle user deletion
        break;
    }

    return { received: true };
  }
}

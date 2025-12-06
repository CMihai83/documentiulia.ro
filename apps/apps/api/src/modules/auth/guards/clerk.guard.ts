import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private clerk: ReturnType<typeof createClerkClient> | null = null;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    if (secretKey && secretKey !== 'test_secret') {
      this.clerk = createClerkClient({ secretKey });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Development mode: allow test token
    if (
      process.env.NODE_ENV !== 'production' &&
      authHeader === 'Bearer dev_test_token'
    ) {
      request.user = {
        clerkId: 'user_test_admin',
        email: 'admin@documentiulia.ro',
        firstName: 'Admin',
        lastName: 'Test',
      };
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      // Production mode: verify with Clerk SDK
      if (this.clerk && process.env.NODE_ENV === 'production') {
        return await this.verifyWithClerk(request, token);
      }

      // Development/staging: decode and validate structure
      const payload = this.decodeAndValidateToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Authentication failed: ${message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async verifyWithClerk(request: any, token: string): Promise<boolean> {
    try {
      // Verify the session token with Clerk
      const { isSignedIn, toAuth } = await this.clerk!.authenticateRequest(
        request,
        {
          jwtKey: this.config.get<string>('CLERK_JWT_KEY'),
          authorizedParties: this.config
            .get<string>('CLERK_AUTHORIZED_PARTIES')
            ?.split(','),
        },
      );

      if (!isSignedIn) {
        throw new UnauthorizedException('Not signed in');
      }

      const auth = toAuth();
      const userId = auth.userId;

      // Get full user details from Clerk
      const user = await this.clerk!.users.getUser(userId);

      request.user = {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phoneNumbers[0]?.phoneNumber,
        imageUrl: user.imageUrl,
        metadata: user.publicMetadata,
      };

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Clerk verification failed: ${message}`);
      throw new UnauthorizedException('Clerk authentication failed');
    }
  }

  private decodeAndValidateToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      );

      // Validate token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
      }

      // Validate token issuer (Clerk uses specific format)
      const issuer = payload.iss;
      if (issuer && !issuer.includes('clerk')) {
        this.logger.warn(`Unexpected issuer: ${issuer}`);
      }

      return {
        clerkId: payload.sub || payload.user_id,
        email: payload.email || payload.primary_email,
        firstName: payload.first_name || payload.firstName,
        lastName: payload.last_name || payload.lastName,
        sessionId: payload.sid,
        organizationId: payload.org_id,
        metadata: payload.public_metadata || payload.metadata,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException(`Failed to decode token: ${message}`);
    }
  }
}

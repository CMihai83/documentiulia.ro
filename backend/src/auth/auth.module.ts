import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { BiometricAuthService } from './biometric-auth.service';
import { BiometricAuthController } from './biometric-auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MfaModule } from '../mfa/mfa.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    forwardRef(() => MfaModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // REQ-048: no fallback — a missing secret must fail the boot, not
        // silently sign tokens with a value published in this repo.
        secret: (() => {
          const v = configService.get<string>('JWT_SECRET');
          if (!v || v.length < 16 || v === 'documentiulia_jwt_secret') {
            throw new Error('JWT_SECRET is missing, too short, or still the default placeholder.');
          }
          return v;
        })(),
        signOptions: {
          expiresIn: '7d' as const,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, RbacController, BiometricAuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, RbacService, BiometricAuthService],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, RolesGuard, RbacService, BiometricAuthService],
})
export class AuthModule {}

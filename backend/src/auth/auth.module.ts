import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
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

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    EventEmitterModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'documentiulia_jwt_secret',
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

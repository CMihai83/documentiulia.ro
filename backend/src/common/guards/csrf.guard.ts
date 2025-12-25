import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly CSRF_HEADER = 'x-csrf-token';
  private readonly CSRF_COOKIE = 'csrf-token';
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF check for safe methods
    if (this.SAFE_METHODS.includes(request.method)) {
      return true;
    }

    // Skip CSRF for API calls with valid JWT (token-based auth is CSRF-immune)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return true;
    }

    // For cookie-based sessions, validate CSRF token
    const cookieToken = request.cookies?.[this.CSRF_COOKIE];
    const headerToken = request.headers[this.CSRF_HEADER] as string;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (!this.validateToken(cookieToken, headerToken)) {
      throw new ForbiddenException('CSRF token invalid');
    }

    return true;
  }

  private validateToken(cookieToken: string, headerToken: string): boolean {
    // Constant-time comparison to prevent timing attacks
    if (cookieToken.length !== headerToken.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken),
    );
  }

  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

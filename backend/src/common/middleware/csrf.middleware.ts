import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly CSRF_COOKIE = 'csrf-token';
  private readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  use(req: Request, res: Response, next: NextFunction) {
    // Generate CSRF token if not present
    if (!req.cookies?.[this.CSRF_COOKIE]) {
      const token = crypto.randomBytes(32).toString('hex');

      res.cookie(this.CSRF_COOKIE, token, {
        httpOnly: false, // Must be readable by JS to include in headers
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: this.TOKEN_EXPIRY,
        path: '/',
      });
    }

    next();
  }
}

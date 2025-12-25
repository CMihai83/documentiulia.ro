import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Sanitize query params
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    next();
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        // Sanitize key names (prevent prototype pollution)
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(obj[key]);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (!str) return str;

    return str
      // Remove null bytes
      .replace(/\0/g, '')
      // Escape HTML entities to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      // Remove potential SQL injection characters in certain contexts
      // Note: This is a basic protection; parameterized queries are the primary defense
      .replace(/;--/g, '')
      .replace(/--/g, '')
      // Trim whitespace
      .trim();
  }
}

// XSS filter for HTML content that needs to preserve some formatting
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  // Allow only safe tags
  const allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li'];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

  return html
    .replace(tagPattern, (match, tag) => {
      return allowedTags.includes(tag.toLowerCase()) ? match : '';
    })
    // Remove all event handlers
    .replace(/\son\w+\s*=/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs
    .replace(/data:/gi, '');
}

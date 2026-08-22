import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * REQ-049 B3 — the authenticated user's id, from the JWT only.
 * Replaces `@Param('userId')` in controllers that used to trust a path
 * segment (same IDOR class closed in REQ-048).
 */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const user = ctx.switchToHttp().getRequest().user;
  const id = user?.id ?? user?.sub ?? user?.userId;
  if (!id) throw new UnauthorizedException('Sesiune invalidă');
  return id;
});

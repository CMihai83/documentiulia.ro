import { Body, Controller, Get, Header, Headers, Ip, Param, Post, Query } from '@nestjs/common';
import { GdprExtService } from './gdpr-ext.service';
import { GdprDsarService } from './gdpr-dsar.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';

/**
 * GDPR-EXT PUBLIC endpoints — deliberately WITHOUT JwtAuthGuard/TierGuard
 * (same pattern as ExpertisePublicController):
 * - policy/:orgSlug/:kind — published policies must be readable by the
 *   tenant's site visitors. Serves ONLY published versions.
 * - cmp/:slug.js — the embeddable consent banner for the tenant's site.
 * - cmp/:slug/consent — the banner's consent intake. ORG ISOLATION: the target
 *   org is derived exclusively from the slug; the body cannot redirect it.
 * Nothing here exposes tenant data beyond what the tenant chose to publish.
 */
@Controller('gdpr-public')
export class GdprExtPublicController {
  constructor(private readonly svc: GdprExtService, private readonly dsar: GdprDsarService) {}

  @Get('policy/:orgSlug/:kind')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async policy(@Param('orgSlug') orgSlug: string, @Param('kind') kind: string, @Query('locale') locale?: string) {
    const doc = await this.svc.publicPolicy(orgSlug, kind, locale);
    return doc.html;
  }

  @Get('cmp/:slug.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  script(@Param('slug') slug: string) {
    return this.svc.bannerScript(slug.replace(/\.js$/, ''));
  }

  @Post('cmp/:slug/consent')
  consent(
    @Param('slug') slug: string,
    @Body() body: any,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
  ) {
    return this.svc.recordConsent(slug, body ?? {}, ip, ua);
  }

  // ---- PUBLIC DSAR intake (org from slug ONLY) ----
  @Post('dsar/:orgSlug')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  dsarIntake(@Param('orgSlug') orgSlug: string, @Body() body: any) {
    return this.dsar.publicIntake(orgSlug, body ?? {});
  }

  @Get('dsar/status/:token')
  dsarStatus(@Param('token') token: string) {
    return this.dsar.publicStatus(token);
  }
}

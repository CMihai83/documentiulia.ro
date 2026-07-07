import { Controller, Get, Param } from '@nestjs/common';
import { AnafLookupService, AnafLookupResult } from './anaf-lookup.service';

/**
 * Public CUI/CIF validator (DOC-44-4 / DOC-W0-1).
 * Free, rate-limited, 24h-cached lookup against the ANAF public registry —
 * doubles as the top-of-funnel "verificare CUI" tool.
 * Base path: /api/v1/anaf/cui
 */
@Controller('anaf/cui')
export class AnafLookupController {
  constructor(private readonly lookup: AnafLookupService) {}

  @Get(':cui')
  async validate(@Param('cui') cui: string): Promise<AnafLookupResult> {
    return this.lookup.lookup(cui);
  }

  @Get(':cui/usable')
  async usable(@Param('cui') cui: string) {
    const { ok, reason } = await this.lookup.assertUsable(cui);
    return { cui, ok, reason };
  }
}

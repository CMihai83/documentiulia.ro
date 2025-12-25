import { Module } from '@nestjs/common';
import { HelpService } from './help.service';
import { HelpSearchService } from './help-search.service';
import { HelpController } from './help.controller';

@Module({
  controllers: [HelpController],
  providers: [HelpService, HelpSearchService],
  exports: [HelpService, HelpSearchService],
})
export class HelpModule {}

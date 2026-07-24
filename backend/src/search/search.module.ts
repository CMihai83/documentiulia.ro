import { Module } from '@nestjs/common';
import { AdvancedSearchService } from './advanced-search.service';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [],
  controllers: [SearchController],
  providers: [AdvancedSearchService, SearchService],
  exports: [AdvancedSearchService, SearchService],
})
export class SearchModule {}

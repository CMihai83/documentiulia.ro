import { Global, Module } from '@nestjs/common';
import { MatchingService } from './matching.service';

/**
 * Shared matching engine (F-3). Global so ATS, Freelancer, and future
 * Expertise-marketplace modules inject the same scorer.
 */
@Global()
@Module({
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}

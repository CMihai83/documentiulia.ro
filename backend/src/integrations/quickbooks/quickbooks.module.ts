import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuickBooksService } from './quickbooks.service';
import { QuickBooksController } from './quickbooks.controller';

@Module({
  imports: [ConfigModule],
  controllers: [QuickBooksController],
  providers: [QuickBooksService],
  exports: [QuickBooksService],
})
export class QuickBooksModule {}

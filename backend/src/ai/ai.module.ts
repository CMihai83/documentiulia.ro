import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiChatAssistantService } from './ai-chat-assistant.service';
import { AiChatAssistantController } from './ai-chat-assistant.controller';
import { SmartCategorizationService } from './smart-categorization.service';
import { SmartCategorizationController } from './smart-categorization.controller';
import { ContractAnalysisService } from './contract-analysis.service';
import { ContractAnalysisController } from './contract-analysis.controller';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsController } from './ai-insights.controller';
import { VoiceCommandsService } from './voice-commands.service';
import { VoiceCommandsController } from './voice-commands.controller';
import { GrokConversationService } from './grok-conversation.service';
import { GrokConversationController } from './grok-conversation.controller';

@Module({
  imports: [EventEmitterModule.forRoot(), ConfigModule],
  controllers: [
    AiController,
    AiChatAssistantController,
    SmartCategorizationController,
    ContractAnalysisController,
    AiInsightsController,
    VoiceCommandsController,
    GrokConversationController,
  ],
  providers: [
    AiService,
    AiChatAssistantService,
    SmartCategorizationService,
    ContractAnalysisService,
    AiInsightsService,
    VoiceCommandsService,
    GrokConversationService,
  ],
  exports: [
    AiService,
    AiChatAssistantService,
    SmartCategorizationService,
    ContractAnalysisService,
    AiInsightsService,
    VoiceCommandsService,
    GrokConversationService,
  ],
})
export class AiModule {}

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  VoiceCommandsService,
  VoiceRecognitionResult,
  SupportedLanguage,
  VoiceCommandCategory,
} from './voice-commands.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Voice Commands')
@ApiBearerAuth()
@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceCommandsController {
  constructor(private readonly voiceService: VoiceCommandsService) {}

  // =================== SESSION MANAGEMENT ===================

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new voice session' })
  @ApiResponse({ status: 201, description: 'Voice session created' })
  async createSession(
    @Request() req: any,
    @Body() body: { language?: SupportedLanguage },
  ) {
    return this.voiceService.createSession(
      req.user.id,
      req.user.tenantId || req.user.id,
      body.language || 'ro',
    );
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get voice session details' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.voiceService.getSession(sessionId);
  }

  @Post('sessions/:sessionId/context')
  @ApiOperation({ summary: 'Update session context' })
  @ApiResponse({ status: 200, description: 'Context updated' })
  async updateContext(
    @Param('sessionId') sessionId: string,
    @Body() body: { currentScreen?: string; selectedEntity?: { type: string; id: string; name: string } },
  ) {
    const success = this.voiceService.updateSessionContext(sessionId, body);
    return { success };
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'End voice session' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async endSession(@Param('sessionId') sessionId: string) {
    return { success: this.voiceService.endSession(sessionId) };
  }

  // =================== COMMAND PROCESSING ===================

  @Post('sessions/:sessionId/process')
  @ApiOperation({ summary: 'Process voice input' })
  @ApiResponse({ status: 200, description: 'Voice command processed' })
  async processVoiceInput(
    @Param('sessionId') sessionId: string,
    @Body() input: VoiceRecognitionResult,
  ) {
    return this.voiceService.processVoiceInput(sessionId, input);
  }

  @Post('process')
  @ApiOperation({ summary: 'Process voice input without session (creates temporary session)' })
  @ApiResponse({ status: 200, description: 'Voice command processed' })
  async processVoiceInputSimple(
    @Request() req: any,
    @Body() body: { transcript: string; language?: SupportedLanguage },
  ) {
    const session = this.voiceService.createSession(
      req.user.id,
      req.user.tenantId || req.user.id,
      body.language || 'ro',
    );

    const input: VoiceRecognitionResult = {
      transcript: body.transcript,
      confidence: 100,
      language: body.language || 'ro',
      isFinal: true,
      timestamp: new Date(),
    };

    const result = await this.voiceService.processVoiceInput(session.id, input);

    // End temporary session
    this.voiceService.endSession(session.id);

    return result;
  }

  // =================== COMMANDS ===================

  @Get('commands')
  @ApiOperation({ summary: 'Get available voice commands' })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of available commands' })
  async getCommands(
    @Query('language') language?: SupportedLanguage,
    @Query('category') category?: VoiceCommandCategory,
  ) {
    let commands = this.voiceService.getAvailableCommands(language);

    if (category) {
      commands = commands.filter(c => c.category === category);
    }

    return {
      commands,
      total: commands.length,
      categories: [...new Set(commands.map(c => c.category))],
    };
  }

  @Get('commands/categories')
  @ApiOperation({ summary: 'Get command categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories() {
    const commands = this.voiceService.getAvailableCommands();
    const categories = [...new Set(commands.map(c => c.category))];

    return {
      categories: categories.map(cat => ({
        name: cat,
        commandCount: commands.filter(c => c.category === cat).length,
      })),
    };
  }

  @Get('commands/category/:category')
  @ApiOperation({ summary: 'Get commands by category' })
  @ApiResponse({ status: 200, description: 'Commands in category' })
  async getCommandsByCategory(@Param('category') category: VoiceCommandCategory) {
    return {
      commands: this.voiceService.getCommandsByCategory(category),
    };
  }

  @Post('commands/:commandId/disable')
  @ApiOperation({ summary: 'Disable a voice command' })
  @ApiResponse({ status: 200, description: 'Command disabled' })
  async disableCommand(@Param('commandId') commandId: string) {
    return { success: this.voiceService.disableCommand(commandId) };
  }

  @Post('commands/:commandId/enable')
  @ApiOperation({ summary: 'Enable a voice command' })
  @ApiResponse({ status: 200, description: 'Command enabled' })
  async enableCommand(@Param('commandId') commandId: string) {
    return { success: this.voiceService.enableCommand(commandId) };
  }

  // =================== SHORTCUTS ===================

  @Post('shortcuts')
  @ApiOperation({ summary: 'Create a voice shortcut' })
  @ApiResponse({ status: 201, description: 'Shortcut created' })
  async createShortcut(
    @Request() req: any,
    @Body() body: {
      phrase: string;
      language: SupportedLanguage;
      commandId: string;
      parameters?: Record<string, any>;
    },
  ) {
    return this.voiceService.createShortcut(
      req.user.id,
      req.user.tenantId || req.user.id,
      body.phrase,
      body.language,
      body.commandId,
      body.parameters,
    );
  }

  @Get('shortcuts')
  @ApiOperation({ summary: 'Get user shortcuts' })
  @ApiResponse({ status: 200, description: 'List of shortcuts' })
  async getShortcuts(@Request() req: any) {
    return {
      shortcuts: this.voiceService.getUserShortcuts(
        req.user.id,
        req.user.tenantId || req.user.id,
      ),
    };
  }

  @Delete('shortcuts/:shortcutId')
  @ApiOperation({ summary: 'Delete a shortcut' })
  @ApiResponse({ status: 200, description: 'Shortcut deleted' })
  async deleteShortcut(
    @Request() req: any,
    @Param('shortcutId') shortcutId: string,
  ) {
    return {
      success: this.voiceService.deleteShortcut(
        req.user.id,
        req.user.tenantId || req.user.id,
        shortcutId,
      ),
    };
  }

  // =================== HELP ===================

  @Get('help')
  @ApiOperation({ summary: 'Get voice command help text' })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({ status: 200, description: 'Help text' })
  async getHelp(@Query('language') language: SupportedLanguage = 'ro') {
    return {
      helpText: this.voiceService.getHelpText(language),
      language,
    };
  }

  // =================== STATISTICS ===================

  @Get('sessions/:sessionId/stats')
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiResponse({ status: 200, description: 'Session statistics' })
  async getSessionStats(@Param('sessionId') sessionId: string) {
    return this.voiceService.getSessionStats(sessionId);
  }
}

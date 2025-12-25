import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  TemplateEngineService,
  TemplateVariable,
  RenderContext,
} from './template-engine.service';

@ApiTags('Document Generation - Template Engine')
@Controller('documents/template-engine')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplateEngineController {
  constructor(private readonly templateEngine: TemplateEngineService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse template and extract variables' })
  @ApiResponse({ status: 200, description: 'Parse result' })
  async parseTemplate(@Body() body: { template: string }) {
    return this.templateEngine.parseTemplate(body.template);
  }

  @Post('render')
  @ApiOperation({ summary: 'Render template with data' })
  @ApiResponse({ status: 200, description: 'Rendered content' })
  async renderTemplate(
    @Body() body: {
      template: string;
      data: Record<string, any>;
      locale?: string;
      timezone?: string;
      currency?: string;
      dateFormat?: string;
    },
  ) {
    const context: RenderContext = {
      data: body.data,
      locale: body.locale,
      timezone: body.timezone,
      currency: body.currency,
      dateFormat: body.dateFormat,
    };

    return this.templateEngine.render(body.template, context);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate data against template variables' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateData(
    @Body() body: {
      variables: TemplateVariable[];
      data: Record<string, any>;
    },
  ) {
    const errors = this.templateEngine.validateData(body.variables, body.data);
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  @Get('functions')
  @ApiOperation({ summary: 'Get available template functions' })
  @ApiResponse({ status: 200, description: 'Functions list' })
  async getFunctions() {
    const functions = this.templateEngine.getAvailableFunctions();
    return { functions, total: functions.length };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview template with sample data' })
  @ApiResponse({ status: 200, description: 'Preview result' })
  async previewTemplate(
    @Body() body: {
      template: string;
      sampleData?: Record<string, any>;
    },
  ) {
    // Parse template to get variables
    const parseResult = await this.templateEngine.parseTemplate(body.template);

    // Generate sample data if not provided
    const sampleData = body.sampleData || this.generateSampleData(parseResult.variables);

    // Render with sample data
    const renderResult = await this.templateEngine.render(body.template, {
      data: sampleData,
    });

    return {
      parseResult,
      renderResult,
      sampleData,
    };
  }

  private generateSampleData(variables: TemplateVariable[]): Record<string, any> {
    const data: Record<string, any> = {};

    for (const variable of variables) {
      switch (variable.type) {
        case 'string':
          data[variable.name] = `Sample ${variable.label}`;
          break;
        case 'number':
          data[variable.name] = 123;
          break;
        case 'currency':
          data[variable.name] = 99.99;
          break;
        case 'boolean':
          data[variable.name] = true;
          break;
        case 'date':
          data[variable.name] = new Date().toISOString();
          break;
        case 'array':
          data[variable.name] = [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
          ];
          break;
        case 'object':
          data[variable.name] = { key: 'value' };
          break;
        case 'image':
          data[variable.name] = 'https://via.placeholder.com/150';
          break;
        default:
          data[variable.name] = variable.defaultValue || '';
      }
    }

    return data;
  }
}

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'currency' | 'image';

export interface TemplateVariable {
  name: string;
  type: VariableType;
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  format?: string;
  validation?: VariableValidation;
}

export interface VariableValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: Array<{ value: any; label: string }>;
  custom?: string;
}

export interface TemplateFunction {
  name: string;
  description: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
  example: string;
}

export interface ConditionalBlock {
  condition: string;
  content: string;
  elseContent?: string;
}

export interface LoopBlock {
  variable: string;
  itemName: string;
  content: string;
  separator?: string;
  emptyContent?: string;
}

export interface TemplateParseResult {
  success: boolean;
  variables: TemplateVariable[];
  functions: string[];
  conditionals: number;
  loops: number;
  errors: Array<{ line: number; message: string }>;
  warnings: Array<{ line: number; message: string }>;
}

export interface RenderContext {
  data: Record<string, any>;
  functions?: Record<string, (...args: any[]) => any>;
  locale?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
}

export interface RenderResult {
  content: string;
  usedVariables: string[];
  missingVariables: string[];
  warnings: string[];
  renderTime: number;
}

// =================== SERVICE ===================

@Injectable()
export class TemplateEngineService {
  private builtInFunctions: Map<string, TemplateFunction> = new Map();
  private customFunctions: Map<string, (...args: any[]) => any> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.registerBuiltInFunctions();
  }

  private registerBuiltInFunctions(): void {
    const functions: TemplateFunction[] = [
      // String functions
      {
        name: 'upper',
        description: 'Convert text to uppercase',
        parameters: [{ name: 'text', type: 'string', required: true }],
        returnType: 'string',
        example: '{{upper(name)}} → "JOHN DOE"',
      },
      {
        name: 'lower',
        description: 'Convert text to lowercase',
        parameters: [{ name: 'text', type: 'string', required: true }],
        returnType: 'string',
        example: '{{lower(name)}} → "john doe"',
      },
      {
        name: 'capitalize',
        description: 'Capitalize first letter',
        parameters: [{ name: 'text', type: 'string', required: true }],
        returnType: 'string',
        example: '{{capitalize(name)}} → "John doe"',
      },
      {
        name: 'titleCase',
        description: 'Convert to title case',
        parameters: [{ name: 'text', type: 'string', required: true }],
        returnType: 'string',
        example: '{{titleCase(name)}} → "John Doe"',
      },
      {
        name: 'trim',
        description: 'Remove leading/trailing whitespace',
        parameters: [{ name: 'text', type: 'string', required: true }],
        returnType: 'string',
        example: '{{trim(text)}}',
      },
      {
        name: 'truncate',
        description: 'Truncate text to specified length',
        parameters: [
          { name: 'text', type: 'string', required: true },
          { name: 'length', type: 'number', required: true },
          { name: 'suffix', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{truncate(description, 100, "...")}}',
      },
      {
        name: 'replace',
        description: 'Replace text',
        parameters: [
          { name: 'text', type: 'string', required: true },
          { name: 'search', type: 'string', required: true },
          { name: 'replacement', type: 'string', required: true },
        ],
        returnType: 'string',
        example: '{{replace(text, "old", "new")}}',
      },
      {
        name: 'padLeft',
        description: 'Pad string on the left',
        parameters: [
          { name: 'text', type: 'string', required: true },
          { name: 'length', type: 'number', required: true },
          { name: 'char', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{padLeft(num, 5, "0")}} → "00123"',
      },
      {
        name: 'padRight',
        description: 'Pad string on the right',
        parameters: [
          { name: 'text', type: 'string', required: true },
          { name: 'length', type: 'number', required: true },
          { name: 'char', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{padRight(text, 10, " ")}}',
      },

      // Number functions
      {
        name: 'round',
        description: 'Round number to decimals',
        parameters: [
          { name: 'number', type: 'number', required: true },
          { name: 'decimals', type: 'number', required: false },
        ],
        returnType: 'number',
        example: '{{round(price, 2)}} → 19.99',
      },
      {
        name: 'floor',
        description: 'Round down to nearest integer',
        parameters: [{ name: 'number', type: 'number', required: true }],
        returnType: 'number',
        example: '{{floor(19.9)}} → 19',
      },
      {
        name: 'ceil',
        description: 'Round up to nearest integer',
        parameters: [{ name: 'number', type: 'number', required: true }],
        returnType: 'number',
        example: '{{ceil(19.1)}} → 20',
      },
      {
        name: 'abs',
        description: 'Absolute value',
        parameters: [{ name: 'number', type: 'number', required: true }],
        returnType: 'number',
        example: '{{abs(-5)}} → 5',
      },
      {
        name: 'formatNumber',
        description: 'Format number with locale',
        parameters: [
          { name: 'number', type: 'number', required: true },
          { name: 'decimals', type: 'number', required: false },
          { name: 'locale', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{formatNumber(1234.5, 2, "ro-RO")}} → "1.234,50"',
      },
      {
        name: 'formatCurrency',
        description: 'Format as currency',
        parameters: [
          { name: 'amount', type: 'number', required: true },
          { name: 'currency', type: 'string', required: false },
          { name: 'locale', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{formatCurrency(100, "RON", "ro-RO")}} → "100,00 RON"',
      },
      {
        name: 'percent',
        description: 'Format as percentage',
        parameters: [
          { name: 'number', type: 'number', required: true },
          { name: 'decimals', type: 'number', required: false },
        ],
        returnType: 'string',
        example: '{{percent(0.15, 1)}} → "15.0%"',
      },

      // Date functions
      {
        name: 'formatDate',
        description: 'Format date',
        parameters: [
          { name: 'date', type: 'date', required: true },
          { name: 'format', type: 'string', required: false },
          { name: 'locale', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{formatDate(date, "DD/MM/YYYY")}}',
      },
      {
        name: 'now',
        description: 'Current date/time',
        parameters: [{ name: 'format', type: 'string', required: false }],
        returnType: 'string',
        example: '{{now("YYYY-MM-DD")}}',
      },
      {
        name: 'addDays',
        description: 'Add days to date',
        parameters: [
          { name: 'date', type: 'date', required: true },
          { name: 'days', type: 'number', required: true },
        ],
        returnType: 'date',
        example: '{{addDays(date, 30)}}',
      },
      {
        name: 'dateDiff',
        description: 'Difference between dates',
        parameters: [
          { name: 'date1', type: 'date', required: true },
          { name: 'date2', type: 'date', required: true },
          { name: 'unit', type: 'string', required: false },
        ],
        returnType: 'number',
        example: '{{dateDiff(startDate, endDate, "days")}}',
      },
      {
        name: 'year',
        description: 'Get year from date',
        parameters: [{ name: 'date', type: 'date', required: true }],
        returnType: 'number',
        example: '{{year(date)}} → 2025',
      },
      {
        name: 'month',
        description: 'Get month from date',
        parameters: [{ name: 'date', type: 'date', required: true }],
        returnType: 'number',
        example: '{{month(date)}} → 12',
      },
      {
        name: 'day',
        description: 'Get day from date',
        parameters: [{ name: 'date', type: 'date', required: true }],
        returnType: 'number',
        example: '{{day(date)}} → 15',
      },

      // Array functions
      {
        name: 'count',
        description: 'Count array items',
        parameters: [{ name: 'array', type: 'array', required: true }],
        returnType: 'number',
        example: '{{count(items)}} → 5',
      },
      {
        name: 'sum',
        description: 'Sum array values',
        parameters: [
          { name: 'array', type: 'array', required: true },
          { name: 'property', type: 'string', required: false },
        ],
        returnType: 'number',
        example: '{{sum(items, "price")}}',
      },
      {
        name: 'avg',
        description: 'Average of array values',
        parameters: [
          { name: 'array', type: 'array', required: true },
          { name: 'property', type: 'string', required: false },
        ],
        returnType: 'number',
        example: '{{avg(scores)}}',
      },
      {
        name: 'min',
        description: 'Minimum value',
        parameters: [
          { name: 'array', type: 'array', required: true },
          { name: 'property', type: 'string', required: false },
        ],
        returnType: 'number',
        example: '{{min(prices)}}',
      },
      {
        name: 'max',
        description: 'Maximum value',
        parameters: [
          { name: 'array', type: 'array', required: true },
          { name: 'property', type: 'string', required: false },
        ],
        returnType: 'number',
        example: '{{max(prices)}}',
      },
      {
        name: 'first',
        description: 'First array item',
        parameters: [{ name: 'array', type: 'array', required: true }],
        returnType: 'any',
        example: '{{first(items)}}',
      },
      {
        name: 'last',
        description: 'Last array item',
        parameters: [{ name: 'array', type: 'array', required: true }],
        returnType: 'any',
        example: '{{last(items)}}',
      },
      {
        name: 'join',
        description: 'Join array with separator',
        parameters: [
          { name: 'array', type: 'array', required: true },
          { name: 'separator', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{join(names, ", ")}}',
      },
      {
        name: 'sort',
        description: 'Sort array',
        parameters: [
          { name: 'array', type: 'array', required: true },
          { name: 'property', type: 'string', required: false },
          { name: 'direction', type: 'string', required: false },
        ],
        returnType: 'array',
        example: '{{sort(items, "name", "asc")}}',
      },

      // Logic functions
      {
        name: 'if',
        description: 'Conditional value',
        parameters: [
          { name: 'condition', type: 'boolean', required: true },
          { name: 'trueValue', type: 'any', required: true },
          { name: 'falseValue', type: 'any', required: false },
        ],
        returnType: 'any',
        example: '{{if(active, "Yes", "No")}}',
      },
      {
        name: 'default',
        description: 'Default value if empty',
        parameters: [
          { name: 'value', type: 'any', required: true },
          { name: 'defaultValue', type: 'any', required: true },
        ],
        returnType: 'any',
        example: '{{default(name, "N/A")}}',
      },
      {
        name: 'isEmpty',
        description: 'Check if value is empty',
        parameters: [{ name: 'value', type: 'any', required: true }],
        returnType: 'boolean',
        example: '{{isEmpty(list)}}',
      },
      {
        name: 'isNotEmpty',
        description: 'Check if value is not empty',
        parameters: [{ name: 'value', type: 'any', required: true }],
        returnType: 'boolean',
        example: '{{isNotEmpty(items)}}',
      },

      // Special functions
      {
        name: 'numberToWords',
        description: 'Convert number to words',
        parameters: [
          { name: 'number', type: 'number', required: true },
          { name: 'locale', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{numberToWords(123, "ro")}} → "o sută douăzeci și trei"',
      },
      {
        name: 'barcode',
        description: 'Generate barcode',
        parameters: [
          { name: 'value', type: 'string', required: true },
          { name: 'type', type: 'string', required: false },
        ],
        returnType: 'string',
        example: '{{barcode("123456789", "code128")}}',
      },
      {
        name: 'qrcode',
        description: 'Generate QR code',
        parameters: [
          { name: 'value', type: 'string', required: true },
          { name: 'size', type: 'number', required: false },
        ],
        returnType: 'string',
        example: '{{qrcode("https://example.com", 200)}}',
      },
    ];

    functions.forEach((fn) => this.builtInFunctions.set(fn.name, fn));
  }

  // =================== PARSING ===================

  async parseTemplate(template: string): Promise<TemplateParseResult> {
    const variables: TemplateVariable[] = [];
    const functions: string[] = [];
    const errors: Array<{ line: number; message: string }> = [];
    const warnings: Array<{ line: number; message: string }> = [];
    let conditionals = 0;
    let loops = 0;

    const lines = template.split('\n');

    // Variable pattern: {{variable}} or {{variable.property}}
    const varPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;
    // Function pattern: {{function(args)}}
    const funcPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    // Conditional pattern: {{#if condition}}...{{/if}}
    const ifPattern = /\{\{#if\s+([^}]+)\}\}/g;
    // Loop pattern: {{#each array as item}}...{{/each}}
    const eachPattern = /\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

    const foundVariables = new Set<string>();
    const foundFunctions = new Set<string>();

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Find variables
      let match;
      while ((match = varPattern.exec(line)) !== null) {
        const varName = match[1].split('.')[0];
        if (!foundVariables.has(varName)) {
          foundVariables.add(varName);
          variables.push({
            name: varName,
            type: 'string',
            label: this.labelFromName(varName),
            required: true,
          });
        }
      }

      // Find functions
      while ((match = funcPattern.exec(line)) !== null) {
        const funcName = match[1];
        if (!foundFunctions.has(funcName)) {
          foundFunctions.add(funcName);
          functions.push(funcName);

          if (!this.builtInFunctions.has(funcName) && !this.customFunctions.has(funcName)) {
            warnings.push({
              line: lineNum,
              message: `Unknown function: ${funcName}`,
            });
          }
        }
      }

      // Find conditionals
      while ((match = ifPattern.exec(line)) !== null) {
        conditionals++;
      }

      // Find loops
      while ((match = eachPattern.exec(line)) !== null) {
        loops++;
        const arrayName = match[1];
        if (!foundVariables.has(arrayName)) {
          foundVariables.add(arrayName);
          variables.push({
            name: arrayName,
            type: 'array',
            label: this.labelFromName(arrayName),
            required: true,
          });
        }
      }

      // Check for unclosed tags
      const openTags = (line.match(/\{\{#/g) || []).length;
      const closeTags = (line.match(/\{\{\//g) || []).length;
      if (openTags !== closeTags) {
        warnings.push({
          line: lineNum,
          message: 'Possible unclosed block tag',
        });
      }

      // Check for syntax errors
      const unclosedBraces = (line.match(/\{\{/g) || []).length - (line.match(/\}\}/g) || []).length;
      if (unclosedBraces !== 0) {
        errors.push({
          line: lineNum,
          message: 'Unclosed template expression',
        });
      }
    });

    return {
      success: errors.length === 0,
      variables,
      functions,
      conditionals,
      loops,
      errors,
      warnings,
    };
  }

  private labelFromName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // =================== RENDERING ===================

  async render(template: string, context: RenderContext): Promise<RenderResult> {
    const startTime = Date.now();
    const usedVariables: string[] = [];
    const missingVariables: string[] = [];
    const warnings: string[] = [];

    let content = template;

    // Process loops first
    content = this.processLoops(content, context, usedVariables, missingVariables);

    // Process conditionals
    content = this.processConditionals(content, context);

    // Process functions
    content = this.processFunctions(content, context, warnings);

    // Process variables
    content = this.processVariables(content, context, usedVariables, missingVariables);

    const renderTime = Date.now() - startTime;

    return {
      content,
      usedVariables: [...new Set(usedVariables)],
      missingVariables: [...new Set(missingVariables)],
      warnings,
      renderTime,
    };
  }

  private processLoops(
    template: string,
    context: RenderContext,
    usedVariables: string[],
    missingVariables: string[],
  ): string {
    const loopPattern = /\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopPattern, (match, arrayName, itemName, content) => {
      const array = this.getNestedValue(context.data, arrayName);

      if (!Array.isArray(array)) {
        missingVariables.push(arrayName);
        return '';
      }

      usedVariables.push(arrayName);

      return array
        .map((item, index) => {
          const itemContext: RenderContext = {
            ...context,
            data: {
              ...context.data,
              [itemName]: item,
              [`${itemName}Index`]: index,
              [`${itemName}First`]: index === 0,
              [`${itemName}Last`]: index === array.length - 1,
            },
          };

          // Recursively process the content
          let result = this.processLoops(content, itemContext, usedVariables, missingVariables);
          result = this.processConditionals(result, itemContext);
          result = this.processFunctions(result, itemContext, []);
          result = this.processVariables(result, itemContext, usedVariables, missingVariables);

          return result;
        })
        .join('');
    });
  }

  private processConditionals(template: string, context: RenderContext): string {
    // Process {{#if}}...{{else}}...{{/if}}
    const ifElsePattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;

    let content = template.replace(ifElsePattern, (match, condition, trueContent, falseContent) => {
      const result = this.evaluateCondition(condition, context);
      return result ? trueContent : falseContent;
    });

    // Process {{#if}}...{{/if}} (without else)
    const ifPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    content = content.replace(ifPattern, (match, condition, ifContent) => {
      const result = this.evaluateCondition(condition, context);
      return result ? ifContent : '';
    });

    // Process {{#unless}}...{{/unless}}
    const unlessPattern = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;

    content = content.replace(unlessPattern, (match, condition, unlessContent) => {
      const result = this.evaluateCondition(condition, context);
      return !result ? unlessContent : '';
    });

    return content;
  }

  private evaluateCondition(condition: string, context: RenderContext): boolean {
    const trimmed = condition.trim();

    // Check for comparison operators
    const comparisonMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s*(===?|!==?|>=?|<=?)\s*(.+)$/);

    if (comparisonMatch) {
      const [, left, operator, right] = comparisonMatch;
      const leftValue = this.getNestedValue(context.data, left);
      let rightValue: any = right.trim();

      // Parse right value
      if (rightValue === 'true') rightValue = true;
      else if (rightValue === 'false') rightValue = false;
      else if (rightValue === 'null') rightValue = null;
      else if (/^['"].*['"]$/.test(rightValue)) rightValue = rightValue.slice(1, -1);
      else if (!isNaN(Number(rightValue))) rightValue = Number(rightValue);
      else rightValue = this.getNestedValue(context.data, rightValue);

      switch (operator) {
        case '==':
        case '===':
          return leftValue === rightValue;
        case '!=':
        case '!==':
          return leftValue !== rightValue;
        case '>':
          return leftValue > rightValue;
        case '>=':
          return leftValue >= rightValue;
        case '<':
          return leftValue < rightValue;
        case '<=':
          return leftValue <= rightValue;
        default:
          return false;
      }
    }

    // Check for negation
    if (trimmed.startsWith('!')) {
      const value = this.getNestedValue(context.data, trimmed.slice(1));
      return !value;
    }

    // Simple truthy check
    const value = this.getNestedValue(context.data, trimmed);
    return Boolean(value);
  }

  private processFunctions(
    template: string,
    context: RenderContext,
    warnings: string[],
  ): string {
    // Match function calls: {{functionName(arg1, arg2, ...)}}
    const funcPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\}\}/g;

    return template.replace(funcPattern, (match, funcName, argsStr) => {
      try {
        const args = this.parseArguments(argsStr, context);
        const result = this.executeFunction(funcName, args, context);
        return String(result ?? '');
      } catch (error: any) {
        warnings.push(`Error in function ${funcName}: ${error.message}`);
        return match;
      }
    });
  }

  private parseArguments(argsStr: string, context: RenderContext): any[] {
    if (!argsStr.trim()) return [];

    const args: any[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (const char of argsStr) {
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        current += char;
      } else if (char === '(' && !inString) {
        depth++;
        current += char;
      } else if (char === ')' && !inString) {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0 && !inString) {
        args.push(this.parseArgValue(current.trim(), context));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseArgValue(current.trim(), context));
    }

    return args;
  }

  private parseArgValue(value: string, context: RenderContext): any {
    // String literal
    if (/^['"].*['"]$/.test(value)) {
      return value.slice(1, -1);
    }

    // Number
    if (!isNaN(Number(value))) {
      return Number(value);
    }

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Null
    if (value === 'null') return null;

    // Variable reference
    return this.getNestedValue(context.data, value);
  }

  private executeFunction(name: string, args: any[], context: RenderContext): any {
    // Check custom functions first
    if (this.customFunctions.has(name)) {
      return this.customFunctions.get(name)!(...args);
    }

    const locale = context.locale || 'en-US';
    const currency = context.currency || 'USD';

    // Built-in functions
    switch (name) {
      // String functions
      case 'upper':
        return String(args[0] || '').toUpperCase();
      case 'lower':
        return String(args[0] || '').toLowerCase();
      case 'capitalize':
        return String(args[0] || '').charAt(0).toUpperCase() + String(args[0] || '').slice(1);
      case 'titleCase':
        return String(args[0] || '')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      case 'trim':
        return String(args[0] || '').trim();
      case 'truncate':
        const text = String(args[0] || '');
        const len = args[1] || 100;
        const suffix = args[2] || '...';
        return text.length > len ? text.slice(0, len) + suffix : text;
      case 'replace':
        return String(args[0] || '').replace(new RegExp(args[1], 'g'), args[2] || '');
      case 'padLeft':
        return String(args[0] || '').padStart(args[1] || 0, args[2] || ' ');
      case 'padRight':
        return String(args[0] || '').padEnd(args[1] || 0, args[2] || ' ');

      // Number functions
      case 'round':
        return Number(args[0]).toFixed(args[1] || 0);
      case 'floor':
        return Math.floor(Number(args[0]));
      case 'ceil':
        return Math.ceil(Number(args[0]));
      case 'abs':
        return Math.abs(Number(args[0]));
      case 'formatNumber':
        return new Intl.NumberFormat(args[2] || locale, {
          minimumFractionDigits: args[1] || 0,
          maximumFractionDigits: args[1] || 0,
        }).format(Number(args[0]));
      case 'formatCurrency':
        return new Intl.NumberFormat(args[2] || locale, {
          style: 'currency',
          currency: args[1] || currency,
        }).format(Number(args[0]));
      case 'percent':
        return `${(Number(args[0]) * 100).toFixed(args[1] || 0)}%`;

      // Date functions
      case 'formatDate':
        return this.formatDate(new Date(args[0]), args[1] || 'YYYY-MM-DD');
      case 'now':
        return this.formatDate(new Date(), args[0] || 'YYYY-MM-DD');
      case 'addDays':
        const date = new Date(args[0]);
        date.setDate(date.getDate() + Number(args[1]));
        return date;
      case 'dateDiff':
        const d1 = new Date(args[0]);
        const d2 = new Date(args[1]);
        const diff = Math.abs(d2.getTime() - d1.getTime());
        const unit = args[2] || 'days';
        switch (unit) {
          case 'days':
            return Math.floor(diff / (1000 * 60 * 60 * 24));
          case 'hours':
            return Math.floor(diff / (1000 * 60 * 60));
          case 'minutes':
            return Math.floor(diff / (1000 * 60));
          default:
            return diff;
        }
      case 'year':
        return new Date(args[0]).getFullYear();
      case 'month':
        return new Date(args[0]).getMonth() + 1;
      case 'day':
        return new Date(args[0]).getDate();

      // Array functions
      case 'count':
        return Array.isArray(args[0]) ? args[0].length : 0;
      case 'sum':
        if (!Array.isArray(args[0])) return 0;
        return args[0].reduce((sum, item) => {
          const val = args[1] ? item[args[1]] : item;
          return sum + (Number(val) || 0);
        }, 0);
      case 'avg':
        if (!Array.isArray(args[0]) || args[0].length === 0) return 0;
        const sumVal = args[0].reduce((sum, item) => {
          const val = args[1] ? item[args[1]] : item;
          return sum + (Number(val) || 0);
        }, 0);
        return sumVal / args[0].length;
      case 'min':
        if (!Array.isArray(args[0])) return 0;
        return Math.min(...args[0].map((item) => (args[1] ? item[args[1]] : item)));
      case 'max':
        if (!Array.isArray(args[0])) return 0;
        return Math.max(...args[0].map((item) => (args[1] ? item[args[1]] : item)));
      case 'first':
        return Array.isArray(args[0]) ? args[0][0] : null;
      case 'last':
        return Array.isArray(args[0]) ? args[0][args[0].length - 1] : null;
      case 'join':
        return Array.isArray(args[0]) ? args[0].join(args[1] || ', ') : '';
      case 'sort':
        if (!Array.isArray(args[0])) return [];
        const sorted = [...args[0]];
        const prop = args[1];
        const dir = args[2] || 'asc';
        return sorted.sort((a, b) => {
          const valA = prop ? a[prop] : a;
          const valB = prop ? b[prop] : b;
          return dir === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
        });

      // Logic functions
      case 'if':
        return args[0] ? args[1] : args[2];
      case 'default':
        return args[0] ?? args[1];
      case 'isEmpty':
        return args[0] === null || args[0] === undefined || args[0] === '' || (Array.isArray(args[0]) && args[0].length === 0);
      case 'isNotEmpty':
        return !(args[0] === null || args[0] === undefined || args[0] === '' || (Array.isArray(args[0]) && args[0].length === 0));

      // Special functions
      case 'numberToWords':
        return this.numberToWords(Number(args[0]), args[1] || 'en');
      case 'barcode':
        return `[BARCODE:${args[0]}:${args[1] || 'code128'}]`;
      case 'qrcode':
        return `[QRCODE:${args[0]}:${args[1] || 150}]`;

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private formatDate(date: Date, format: string): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  private numberToWords(num: number, locale: string): string {
    // Simplified implementation
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    if (num === 0) return 'zero';
    if (num < 0) return 'minus ' + this.numberToWords(-num, locale);

    let words = '';

    if (num >= 1000000) {
      words += this.numberToWords(Math.floor(num / 1000000), locale) + ' million ';
      num %= 1000000;
    }

    if (num >= 1000) {
      words += this.numberToWords(Math.floor(num / 1000), locale) + ' thousand ';
      num %= 1000;
    }

    if (num >= 100) {
      words += ones[Math.floor(num / 100)] + ' hundred ';
      num %= 100;
    }

    if (num >= 20) {
      words += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }

    if (num >= 10) {
      words += teens[num - 10] + ' ';
      num = 0;
    }

    if (num > 0) {
      words += ones[num] + ' ';
    }

    return words.trim();
  }

  private processVariables(
    template: string,
    context: RenderContext,
    usedVariables: string[],
    missingVariables: string[],
  ): string {
    const varPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;

    return template.replace(varPattern, (match, varPath) => {
      const value = this.getNestedValue(context.data, varPath);

      if (value === undefined) {
        missingVariables.push(varPath.split('.')[0]);
        return match;
      }

      usedVariables.push(varPath.split('.')[0]);
      return String(value ?? '');
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // =================== CUSTOM FUNCTIONS ===================

  registerFunction(
    name: string,
    fn: (...args: any[]) => any,
    metadata?: Omit<TemplateFunction, 'name'>,
  ): void {
    this.customFunctions.set(name, fn);
    if (metadata) {
      this.builtInFunctions.set(name, { name, ...metadata });
    }
  }

  unregisterFunction(name: string): void {
    this.customFunctions.delete(name);
    // Don't remove built-in function metadata
  }

  // =================== UTILITIES ===================

  getAvailableFunctions(): TemplateFunction[] {
    return Array.from(this.builtInFunctions.values());
  }

  validateData(
    variables: TemplateVariable[],
    data: Record<string, any>,
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    for (const variable of variables) {
      const value = data[variable.name];

      // Required check
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: variable.name,
          message: `${variable.label} is required`,
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type validation
      switch (variable.type) {
        case 'number':
        case 'currency':
          if (isNaN(Number(value))) {
            errors.push({
              field: variable.name,
              message: `${variable.label} must be a number`,
            });
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push({
              field: variable.name,
              message: `${variable.label} must be a valid date`,
            });
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push({
              field: variable.name,
              message: `${variable.label} must be an array`,
            });
          }
          break;
      }

      // Validation rules
      if (variable.validation) {
        const v = variable.validation;

        if (v.min !== undefined && Number(value) < v.min) {
          errors.push({
            field: variable.name,
            message: `${variable.label} must be at least ${v.min}`,
          });
        }

        if (v.max !== undefined && Number(value) > v.max) {
          errors.push({
            field: variable.name,
            message: `${variable.label} must be at most ${v.max}`,
          });
        }

        if (v.minLength !== undefined && String(value).length < v.minLength) {
          errors.push({
            field: variable.name,
            message: `${variable.label} must be at least ${v.minLength} characters`,
          });
        }

        if (v.maxLength !== undefined && String(value).length > v.maxLength) {
          errors.push({
            field: variable.name,
            message: `${variable.label} must be at most ${v.maxLength} characters`,
          });
        }

        if (v.pattern && !new RegExp(v.pattern).test(String(value))) {
          errors.push({
            field: variable.name,
            message: `${variable.label} format is invalid`,
          });
        }

        if (v.options && !v.options.find((o) => o.value === value)) {
          errors.push({
            field: variable.name,
            message: `${variable.label} must be one of the allowed values`,
          });
        }
      }
    }

    return errors;
  }
}

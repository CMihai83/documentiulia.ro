import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Voice Commands Service for DocumentIulia.ro
 * Provides voice-to-action capabilities for hands-free operation
 *
 * Features:
 * - Voice command recognition and parsing
 * - Multi-language support (RO, EN, DE, FR, ES)
 * - Command intent classification
 * - Action execution from voice
 * - Voice response generation
 * - Custom voice command registration
 * - Voice shortcuts and aliases
 * - Context-aware command interpretation
 */

// =================== INTERFACES ===================

export type SupportedLanguage = 'ro' | 'en' | 'de' | 'fr' | 'es';

export interface VoiceCommand {
  id: string;
  patterns: { [lang in SupportedLanguage]?: string[] };
  intent: string;
  category: VoiceCommandCategory;
  action: VoiceAction;
  parameters: VoiceParameter[];
  examples: { [lang in SupportedLanguage]?: string[] };
  requiresConfirmation: boolean;
  enabled: boolean;
}

export type VoiceCommandCategory =
  | 'navigation'
  | 'invoice'
  | 'payment'
  | 'report'
  | 'search'
  | 'settings'
  | 'help'
  | 'vat'
  | 'document'
  | 'dashboard'
  | 'hr'
  | 'compliance';

export interface VoiceAction {
  type: 'navigate' | 'create' | 'search' | 'calculate' | 'export' | 'send' | 'settings' | 'help';
  route?: string;
  method?: string;
  service?: string;
  parameters?: Record<string, any>;
}

export interface VoiceParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'entity';
  required: boolean;
  extractPattern?: string;
  defaultValue?: any;
  entityType?: 'partner' | 'invoice' | 'document' | 'employee';
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  language: SupportedLanguage;
  alternatives?: { transcript: string; confidence: number }[];
  isFinal: boolean;
  timestamp: Date;
}

export interface VoiceCommandResult {
  success: boolean;
  command?: VoiceCommand;
  intent?: string;
  confidence: number;
  extractedParameters: Record<string, any>;
  action?: VoiceAction;
  response: VoiceResponse;
  requiresConfirmation: boolean;
  executionId?: string;
}

export interface VoiceResponse {
  text: string;
  ssml?: string;
  language: SupportedLanguage;
  suggestions?: string[];
  followUpPrompt?: string;
}

export interface VoiceSession {
  id: string;
  userId: string;
  tenantId: string;
  language: SupportedLanguage;
  context: VoiceContext;
  history: VoiceInteraction[];
  createdAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

export interface VoiceContext {
  currentScreen?: string;
  selectedEntity?: { type: string; id: string; name: string };
  pendingAction?: VoiceAction;
  recentEntities: { type: string; id: string; name: string }[];
  preferences: Record<string, any>;
}

export interface VoiceInteraction {
  id: string;
  input: VoiceRecognitionResult;
  result: VoiceCommandResult;
  timestamp: Date;
  executionTimeMs: number;
}

export interface VoiceShortcut {
  id: string;
  userId: string;
  tenantId: string;
  phrase: string;
  language: SupportedLanguage;
  commandId: string;
  parameters?: Record<string, any>;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class VoiceCommandsService {
  private readonly logger = new Logger(VoiceCommandsService.name);

  // In-memory storage
  private commands: Map<string, VoiceCommand> = new Map();
  private sessions: Map<string, VoiceSession> = new Map();
  private shortcuts: Map<string, VoiceShortcut[]> = new Map();

  // Language-specific responses
  private readonly responses: { [lang in SupportedLanguage]: Record<string, string> } = {
    ro: {
      notUnderstood: 'Nu am inteles comanda. Puteti incerca din nou?',
      confirm: 'Confirmati actiunea: {action}?',
      success: 'Comanda executata cu succes.',
      error: 'A aparut o eroare: {error}',
      help: 'Spuneti "ajutor" pentru lista de comenzi disponibile.',
      navigating: 'Navighez catre {destination}.',
      creating: 'Creez {entity}.',
      searching: 'Caut {query}.',
      calculating: 'Calculez {what}.',
    },
    en: {
      notUnderstood: "I didn't understand that command. Could you try again?",
      confirm: 'Please confirm: {action}?',
      success: 'Command executed successfully.',
      error: 'An error occurred: {error}',
      help: 'Say "help" for available commands.',
      navigating: 'Navigating to {destination}.',
      creating: 'Creating {entity}.',
      searching: 'Searching for {query}.',
      calculating: 'Calculating {what}.',
    },
    de: {
      notUnderstood: 'Ich habe den Befehl nicht verstanden. Konnen Sie es erneut versuchen?',
      confirm: 'Bitte bestatigen: {action}?',
      success: 'Befehl erfolgreich ausgefuhrt.',
      error: 'Ein Fehler ist aufgetreten: {error}',
      help: 'Sagen Sie "Hilfe" fur verfugbare Befehle.',
      navigating: 'Navigiere zu {destination}.',
      creating: 'Erstelle {entity}.',
      searching: 'Suche nach {query}.',
      calculating: 'Berechne {what}.',
    },
    fr: {
      notUnderstood: "Je n'ai pas compris cette commande. Pouvez-vous reessayer?",
      confirm: 'Veuillez confirmer: {action}?',
      success: 'Commande executee avec succes.',
      error: "Une erreur s'est produite: {error}",
      help: 'Dites "aide" pour les commandes disponibles.',
      navigating: 'Navigation vers {destination}.',
      creating: 'Creation de {entity}.',
      searching: 'Recherche de {query}.',
      calculating: 'Calcul de {what}.',
    },
    es: {
      notUnderstood: 'No entendi ese comando. Puede intentarlo de nuevo?',
      confirm: 'Por favor confirme: {action}?',
      success: 'Comando ejecutado con exito.',
      error: 'Ocurrio un error: {error}',
      help: 'Diga "ayuda" para comandos disponibles.',
      navigating: 'Navegando a {destination}.',
      creating: 'Creando {entity}.',
      searching: 'Buscando {query}.',
      calculating: 'Calculando {what}.',
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultCommands();
  }

  // =================== INITIALIZATION ===================

  private initializeDefaultCommands(): void {
    const defaultCommands: VoiceCommand[] = [
      // Navigation commands
      {
        id: 'nav-dashboard',
        patterns: {
          ro: ['mergi la dashboard', 'deschide dashboard', 'arata dashboard', 'pagina principala'],
          en: ['go to dashboard', 'open dashboard', 'show dashboard', 'home page'],
          de: ['gehe zum dashboard', 'offne dashboard', 'zeige dashboard'],
          fr: ['aller au tableau de bord', 'ouvrir tableau de bord'],
          es: ['ir al panel', 'abrir panel', 'mostrar panel'],
        },
        intent: 'navigate.dashboard',
        category: 'navigation',
        action: { type: 'navigate', route: '/dashboard' },
        parameters: [],
        examples: {
          ro: ['Mergi la dashboard', 'Deschide pagina principala'],
          en: ['Go to dashboard', 'Open home page'],
        },
        requiresConfirmation: false,
        enabled: true,
      },
      {
        id: 'nav-invoices',
        patterns: {
          ro: ['mergi la facturi', 'deschide facturi', 'arata facturile', 'lista facturi'],
          en: ['go to invoices', 'open invoices', 'show invoices', 'invoice list'],
          de: ['gehe zu rechnungen', 'offne rechnungen', 'zeige rechnungen'],
          fr: ['aller aux factures', 'ouvrir factures', 'afficher factures'],
          es: ['ir a facturas', 'abrir facturas', 'mostrar facturas'],
        },
        intent: 'navigate.invoices',
        category: 'navigation',
        action: { type: 'navigate', route: '/invoices' },
        parameters: [],
        examples: {
          ro: ['Mergi la facturi', 'Arata lista de facturi'],
          en: ['Go to invoices', 'Show invoice list'],
        },
        requiresConfirmation: false,
        enabled: true,
      },
      {
        id: 'nav-reports',
        patterns: {
          ro: ['mergi la rapoarte', 'deschide rapoarte', 'arata rapoartele'],
          en: ['go to reports', 'open reports', 'show reports'],
          de: ['gehe zu berichte', 'offne berichte'],
          fr: ['aller aux rapports', 'ouvrir rapports'],
          es: ['ir a informes', 'abrir informes'],
        },
        intent: 'navigate.reports',
        category: 'navigation',
        action: { type: 'navigate', route: '/reports' },
        parameters: [],
        examples: { ro: ['Mergi la rapoarte'], en: ['Go to reports'] },
        requiresConfirmation: false,
        enabled: true,
      },
      {
        id: 'nav-hr',
        patterns: {
          ro: ['mergi la hr', 'deschide resurse umane', 'arata angajati', 'personal'],
          en: ['go to hr', 'open human resources', 'show employees', 'staff'],
          de: ['gehe zu personal', 'offne mitarbeiter'],
          fr: ['aller aux rh', 'ouvrir ressources humaines'],
          es: ['ir a recursos humanos', 'abrir empleados'],
        },
        intent: 'navigate.hr',
        category: 'hr',
        action: { type: 'navigate', route: '/hr' },
        parameters: [],
        examples: { ro: ['Mergi la HR'], en: ['Go to HR'] },
        requiresConfirmation: false,
        enabled: true,
      },

      // Invoice commands
      {
        id: 'create-invoice',
        patterns: {
          ro: ['creaza factura', 'factura noua', 'emite factura', 'creeaza o factura'],
          en: ['create invoice', 'new invoice', 'issue invoice', 'make invoice'],
          de: ['erstelle rechnung', 'neue rechnung'],
          fr: ['creer facture', 'nouvelle facture'],
          es: ['crear factura', 'nueva factura'],
        },
        intent: 'invoice.create',
        category: 'invoice',
        action: { type: 'navigate', route: '/invoices/new' },
        parameters: [],
        examples: {
          ro: ['Creaza o factura noua', 'Emite factura'],
          en: ['Create a new invoice', 'Issue invoice'],
        },
        requiresConfirmation: false,
        enabled: true,
      },
      {
        id: 'search-invoice',
        patterns: {
          ro: ['cauta factura (.+)', 'gaseste factura (.+)', 'arata factura (.+)'],
          en: ['search invoice (.+)', 'find invoice (.+)', 'show invoice (.+)'],
          de: ['suche rechnung (.+)', 'finde rechnung (.+)'],
          fr: ['chercher facture (.+)', 'trouver facture (.+)'],
          es: ['buscar factura (.+)', 'encontrar factura (.+)'],
        },
        intent: 'invoice.search',
        category: 'invoice',
        action: { type: 'search', service: 'invoices' },
        parameters: [
          { name: 'query', type: 'string', required: true, extractPattern: '(.+)$' },
        ],
        examples: {
          ro: ['Cauta factura 123', 'Gaseste factura pentru Client SRL'],
          en: ['Search invoice 123', 'Find invoice for Client LLC'],
        },
        requiresConfirmation: false,
        enabled: true,
      },

      // VAT commands
      {
        id: 'calculate-vat',
        patterns: {
          ro: ['calculeaza tva', 'cat e tva', 'tva pentru (.+)'],
          en: ['calculate vat', 'what is vat', 'vat for (.+)'],
          de: ['berechne mwst', 'mwst fur (.+)'],
          fr: ['calculer tva', 'tva pour (.+)'],
          es: ['calcular iva', 'iva para (.+)'],
        },
        intent: 'vat.calculate',
        category: 'vat',
        action: { type: 'calculate', service: 'vat' },
        parameters: [
          { name: 'amount', type: 'number', required: false, extractPattern: '(\\d+[.,]?\\d*)' },
        ],
        examples: {
          ro: ['Calculeaza TVA pentru 1000 lei', 'Cat e TVA?'],
          en: ['Calculate VAT for 1000', 'What is the VAT?'],
        },
        requiresConfirmation: false,
        enabled: true,
      },
      {
        id: 'vat-report',
        patterns: {
          ro: ['raport tva', 'declaratie tva', 'arata tva'],
          en: ['vat report', 'vat declaration', 'show vat'],
          de: ['mwst bericht', 'zeige mwst'],
          fr: ['rapport tva', 'declaration tva'],
          es: ['informe iva', 'declaracion iva'],
        },
        intent: 'vat.report',
        category: 'vat',
        action: { type: 'navigate', route: '/reports/vat' },
        parameters: [],
        examples: {
          ro: ['Arata raportul TVA', 'Declaratie TVA'],
          en: ['Show VAT report', 'VAT declaration'],
        },
        requiresConfirmation: false,
        enabled: true,
      },

      // Search commands
      {
        id: 'search-general',
        patterns: {
          ro: ['cauta (.+)', 'gaseste (.+)'],
          en: ['search (.+)', 'find (.+)', 'look for (.+)'],
          de: ['suche (.+)', 'finde (.+)'],
          fr: ['chercher (.+)', 'trouver (.+)'],
          es: ['buscar (.+)', 'encontrar (.+)'],
        },
        intent: 'search.general',
        category: 'search',
        action: { type: 'search' },
        parameters: [
          { name: 'query', type: 'string', required: true, extractPattern: '(.+)$' },
        ],
        examples: {
          ro: ['Cauta Client SRL', 'Gaseste document fiscal'],
          en: ['Search Client LLC', 'Find tax document'],
        },
        requiresConfirmation: false,
        enabled: true,
      },

      // Report commands
      {
        id: 'generate-report',
        patterns: {
          ro: ['genereaza raport (.+)', 'creaza raport (.+)', 'raport (.+)'],
          en: ['generate report (.+)', 'create report (.+)', 'report (.+)'],
          de: ['erstelle bericht (.+)', 'bericht (.+)'],
          fr: ['generer rapport (.+)', 'rapport (.+)'],
          es: ['generar informe (.+)', 'informe (.+)'],
        },
        intent: 'report.generate',
        category: 'report',
        action: { type: 'create', service: 'reports' },
        parameters: [
          { name: 'reportType', type: 'string', required: true, extractPattern: '(.+)$' },
        ],
        examples: {
          ro: ['Genereaza raport financiar', 'Creaza raport lunar'],
          en: ['Generate financial report', 'Create monthly report'],
        },
        requiresConfirmation: true,
        enabled: true,
      },

      // Help commands
      {
        id: 'help',
        patterns: {
          ro: ['ajutor', 'help', 'ce comenzi sunt disponibile', 'cum folosesc'],
          en: ['help', 'what commands', 'available commands', 'how to use'],
          de: ['hilfe', 'welche befehle', 'wie benutze ich'],
          fr: ['aide', 'quelles commandes', 'comment utiliser'],
          es: ['ayuda', 'que comandos', 'como usar'],
        },
        intent: 'help.general',
        category: 'help',
        action: { type: 'help' },
        parameters: [],
        examples: {
          ro: ['Ajutor', 'Ce comenzi sunt disponibile?'],
          en: ['Help', 'What commands are available?'],
        },
        requiresConfirmation: false,
        enabled: true,
      },

      // Document commands
      {
        id: 'upload-document',
        patterns: {
          ro: ['incarca document', 'upload document', 'adauga document'],
          en: ['upload document', 'add document', 'import document'],
          de: ['dokument hochladen', 'dokument hinzufugen'],
          fr: ['telecharger document', 'ajouter document'],
          es: ['subir documento', 'agregar documento'],
        },
        intent: 'document.upload',
        category: 'document',
        action: { type: 'navigate', route: '/documents/upload' },
        parameters: [],
        examples: {
          ro: ['Incarca un document', 'Adauga document'],
          en: ['Upload a document', 'Add document'],
        },
        requiresConfirmation: false,
        enabled: true,
      },

      // Payment commands
      {
        id: 'record-payment',
        patterns: {
          ro: ['inregistreaza plata', 'adauga plata', 'plateste factura'],
          en: ['record payment', 'add payment', 'pay invoice'],
          de: ['zahlung erfassen', 'zahlung hinzufugen'],
          fr: ['enregistrer paiement', 'ajouter paiement'],
          es: ['registrar pago', 'agregar pago'],
        },
        intent: 'payment.record',
        category: 'payment',
        action: { type: 'navigate', route: '/payments/new' },
        parameters: [],
        examples: {
          ro: ['Inregistreaza o plata', 'Adauga plata'],
          en: ['Record a payment', 'Add payment'],
        },
        requiresConfirmation: false,
        enabled: true,
      },

      // Compliance commands
      {
        id: 'anaf-status',
        patterns: {
          ro: ['status anaf', 'verifica anaf', 'declaratii anaf'],
          en: ['anaf status', 'check anaf', 'anaf declarations'],
          de: ['anaf status', 'anaf prufen'],
          fr: ['statut anaf', 'verifier anaf'],
          es: ['estado anaf', 'verificar anaf'],
        },
        intent: 'compliance.anaf',
        category: 'compliance',
        action: { type: 'navigate', route: '/compliance/anaf' },
        parameters: [],
        examples: {
          ro: ['Verifica status ANAF', 'Arata declaratii ANAF'],
          en: ['Check ANAF status', 'Show ANAF declarations'],
        },
        requiresConfirmation: false,
        enabled: true,
      },
    ];

    defaultCommands.forEach(cmd => this.commands.set(cmd.id, cmd));
    this.logger.log(`Initialized ${defaultCommands.length} default voice commands`);
  }

  // =================== SESSION MANAGEMENT ===================

  createSession(userId: string, tenantId: string, language: SupportedLanguage = 'ro'): VoiceSession {
    const session: VoiceSession = {
      id: `voice-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      language,
      context: {
        recentEntities: [],
        preferences: {},
      },
      history: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
      isActive: true,
    };

    this.sessions.set(session.id, session);
    this.logger.log(`Created voice session: ${session.id} for user ${userId}`);

    return session;
  }

  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSessionContext(sessionId: string, updates: Partial<VoiceContext>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.context = { ...session.context, ...updates };
    session.lastActivityAt = new Date();
    return true;
  }

  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    return true;
  }

  // =================== COMMAND PROCESSING ===================

  async processVoiceInput(
    sessionId: string,
    input: VoiceRecognitionResult,
  ): Promise<VoiceCommandResult> {
    const startTime = Date.now();
    const session = this.sessions.get(sessionId);

    if (!session) {
      return this.createErrorResult(input.language, 'Session not found');
    }

    session.lastActivityAt = new Date();

    const normalizedText = this.normalizeText(input.transcript, input.language);

    // Try to match a command
    const matchResult = this.matchCommand(normalizedText, input.language, session.context);

    if (!matchResult.command) {
      // Check for shortcuts
      const shortcut = this.findShortcut(session.userId, session.tenantId, input.transcript, input.language);
      if (shortcut) {
        const shortcutCommand = this.commands.get(shortcut.commandId);
        if (shortcutCommand) {
          matchResult.command = shortcutCommand;
          matchResult.confidence = 100;
          matchResult.parameters = shortcut.parameters || {};
        }
      }
    }

    const result: VoiceCommandResult = {
      success: !!matchResult.command,
      command: matchResult.command,
      intent: matchResult.command?.intent,
      confidence: matchResult.confidence,
      extractedParameters: matchResult.parameters,
      action: matchResult.command?.action,
      response: this.generateResponse(matchResult, input.language),
      requiresConfirmation: matchResult.command?.requiresConfirmation || false,
    };

    // Store in history
    const interaction: VoiceInteraction = {
      id: `interaction-${Date.now()}`,
      input,
      result,
      timestamp: new Date(),
      executionTimeMs: Date.now() - startTime,
    };
    session.history.push(interaction);

    // Emit event
    this.eventEmitter.emit('voice.command.processed', {
      sessionId,
      userId: session.userId,
      tenantId: session.tenantId,
      command: matchResult.command?.id,
      success: result.success,
    });

    return result;
  }

  private normalizeText(text: string, language: SupportedLanguage): string {
    let normalized = text.toLowerCase().trim();

    // Remove common filler words by language
    const fillerWords: Record<SupportedLanguage, string[]> = {
      ro: ['te rog', 'va rog', 'poti sa', 'vreau sa', 'as vrea sa'],
      en: ['please', 'could you', 'can you', 'i want to', 'i would like to'],
      de: ['bitte', 'konnten sie', 'ich mochte'],
      fr: ['s\'il vous plait', 'pourriez-vous', 'je voudrais'],
      es: ['por favor', 'podria', 'quiero', 'quisiera'],
    };

    const words = fillerWords[language] || [];
    words.forEach(word => {
      normalized = normalized.replace(new RegExp(word, 'gi'), '').trim();
    });

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized;
  }

  private matchCommand(
    text: string,
    language: SupportedLanguage,
    context: VoiceContext,
  ): { command?: VoiceCommand; confidence: number; parameters: Record<string, any> } {
    let bestMatch: { command?: VoiceCommand; confidence: number; parameters: Record<string, any> } = {
      confidence: 0,
      parameters: {},
    };

    for (const command of this.commands.values()) {
      if (!command.enabled) continue;

      const patterns = command.patterns[language] || command.patterns['en'] || [];

      for (const pattern of patterns) {
        const { match, confidence, parameters } = this.matchPattern(text, pattern, command.parameters);

        if (match && confidence > bestMatch.confidence) {
          bestMatch = {
            command,
            confidence,
            parameters,
          };
        }
      }
    }

    // Apply context boost
    if (bestMatch.command && context.currentScreen) {
      const categoryScreenMap: Record<string, string[]> = {
        invoice: ['/invoices', '/finance'],
        payment: ['/payments', '/finance'],
        report: ['/reports'],
        hr: ['/hr', '/employees'],
        vat: ['/vat', '/tax', '/compliance'],
      };

      const relevantScreens = categoryScreenMap[bestMatch.command.category] || [];
      if (relevantScreens.some(screen => context.currentScreen?.includes(screen))) {
        bestMatch.confidence = Math.min(100, bestMatch.confidence + 10);
      }
    }

    return bestMatch;
  }

  private matchPattern(
    text: string,
    pattern: string,
    paramDefs: VoiceParameter[],
  ): { match: boolean; confidence: number; parameters: Record<string, any> } {
    const parameters: Record<string, any> = {};

    // Convert pattern to regex
    let regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
      .replace(/\\\(\\.\\+\\\)/g, '(.+)')  // Restore capture groups
      .replace(/\\\(\\d\\+\\\[\\.\\,\\\]\\?\\d\\*\\\)/g, '(\\d+[.,]?\\d*)');  // Restore number pattern

    // For patterns without capture groups, do fuzzy matching
    if (!pattern.includes('(.+)')) {
      const similarity = this.calculateSimilarity(text, pattern.toLowerCase());
      return {
        match: similarity >= 0.7,
        confidence: Math.round(similarity * 100),
        parameters: {},
      };
    }

    try {
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      const match = text.match(regex);

      if (match) {
        // Extract parameters
        paramDefs.forEach((param, index) => {
          if (match[index + 1]) {
            parameters[param.name] = this.parseParameter(match[index + 1], param.type);
          }
        });

        return {
          match: true,
          confidence: 90,
          parameters,
        };
      }

      // Try partial match
      const partialRegex = new RegExp(regexPattern, 'i');
      const partialMatch = text.match(partialRegex);
      if (partialMatch) {
        paramDefs.forEach((param, index) => {
          if (partialMatch[index + 1]) {
            parameters[param.name] = this.parseParameter(partialMatch[index + 1], param.type);
          }
        });

        return {
          match: true,
          confidence: 75,
          parameters,
        };
      }
    } catch (e) {
      // Invalid regex, fallback to fuzzy
    }

    return { match: false, confidence: 0, parameters: {} };
  }

  private parseParameter(value: string, type: VoiceParameter['type']): any {
    switch (type) {
      case 'number':
        return parseFloat(value.replace(',', '.'));
      case 'currency':
        const num = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
        return isNaN(num) ? 0 : num;
      case 'date':
        return new Date(value);
      default:
        return value.trim();
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }

    return track[str2.length][str1.length];
  }

  private generateResponse(
    matchResult: { command?: VoiceCommand; confidence: number; parameters: Record<string, any> },
    language: SupportedLanguage,
  ): VoiceResponse {
    const responses = this.responses[language] || this.responses['en'];

    if (!matchResult.command) {
      return {
        text: responses.notUnderstood,
        language,
        suggestions: this.getSuggestions(language),
        followUpPrompt: responses.help,
      };
    }

    const cmd = matchResult.command;
    let responseText = responses.success;

    // Generate action-specific response
    switch (cmd.action.type) {
      case 'navigate':
        responseText = responses.navigating.replace(
          '{destination}',
          this.getLocalizedDestination(cmd.action.route || '', language),
        );
        break;
      case 'create':
        responseText = responses.creating.replace('{entity}', cmd.category);
        break;
      case 'search':
        responseText = responses.searching.replace(
          '{query}',
          matchResult.parameters.query || '',
        );
        break;
      case 'calculate':
        responseText = responses.calculating.replace('{what}', cmd.category);
        break;
    }

    return {
      text: responseText,
      language,
      suggestions: this.getRelatedCommands(cmd, language),
    };
  }

  private getLocalizedDestination(route: string, language: SupportedLanguage): string {
    const destinations: Record<string, Record<SupportedLanguage, string>> = {
      '/dashboard': { ro: 'dashboard', en: 'dashboard', de: 'Dashboard', fr: 'tableau de bord', es: 'panel' },
      '/invoices': { ro: 'facturi', en: 'invoices', de: 'Rechnungen', fr: 'factures', es: 'facturas' },
      '/reports': { ro: 'rapoarte', en: 'reports', de: 'Berichte', fr: 'rapports', es: 'informes' },
      '/hr': { ro: 'resurse umane', en: 'human resources', de: 'Personal', fr: 'RH', es: 'RRHH' },
    };

    return destinations[route]?.[language] || route;
  }

  private getSuggestions(language: SupportedLanguage): string[] {
    const suggestions: Record<SupportedLanguage, string[]> = {
      ro: ['Mergi la facturi', 'Creaza factura', 'Calculeaza TVA', 'Ajutor'],
      en: ['Go to invoices', 'Create invoice', 'Calculate VAT', 'Help'],
      de: ['Gehe zu Rechnungen', 'Erstelle Rechnung', 'Berechne MwSt', 'Hilfe'],
      fr: ['Aller aux factures', 'Creer facture', 'Calculer TVA', 'Aide'],
      es: ['Ir a facturas', 'Crear factura', 'Calcular IVA', 'Ayuda'],
    };

    return suggestions[language] || suggestions['en'];
  }

  private getRelatedCommands(command: VoiceCommand, language: SupportedLanguage): string[] {
    const related: string[] = [];
    const categoryCommands = Array.from(this.commands.values())
      .filter(c => c.category === command.category && c.id !== command.id)
      .slice(0, 2);

    categoryCommands.forEach(c => {
      const examples = c.examples[language] || c.examples['en'] || [];
      if (examples.length > 0) {
        related.push(examples[0]);
      }
    });

    return related;
  }

  private createErrorResult(language: SupportedLanguage, error: string): VoiceCommandResult {
    const responses = this.responses[language] || this.responses['en'];
    return {
      success: false,
      confidence: 0,
      extractedParameters: {},
      response: {
        text: responses.error.replace('{error}', error),
        language,
      },
      requiresConfirmation: false,
    };
  }

  // =================== SHORTCUTS ===================

  createShortcut(
    userId: string,
    tenantId: string,
    phrase: string,
    language: SupportedLanguage,
    commandId: string,
    parameters?: Record<string, any>,
  ): VoiceShortcut {
    const shortcut: VoiceShortcut = {
      id: `shortcut-${Date.now()}`,
      userId,
      tenantId,
      phrase: phrase.toLowerCase(),
      language,
      commandId,
      parameters,
      createdAt: new Date(),
    };

    const key = `${userId}:${tenantId}`;
    const existing = this.shortcuts.get(key) || [];
    existing.push(shortcut);
    this.shortcuts.set(key, existing);

    return shortcut;
  }

  private findShortcut(
    userId: string,
    tenantId: string,
    phrase: string,
    language: SupportedLanguage,
  ): VoiceShortcut | undefined {
    const key = `${userId}:${tenantId}`;
    const shortcuts = this.shortcuts.get(key) || [];

    return shortcuts.find(
      s => s.phrase === phrase.toLowerCase() && s.language === language,
    );
  }

  getUserShortcuts(userId: string, tenantId: string): VoiceShortcut[] {
    const key = `${userId}:${tenantId}`;
    return this.shortcuts.get(key) || [];
  }

  deleteShortcut(userId: string, tenantId: string, shortcutId: string): boolean {
    const key = `${userId}:${tenantId}`;
    const shortcuts = this.shortcuts.get(key) || [];
    const index = shortcuts.findIndex(s => s.id === shortcutId);

    if (index >= 0) {
      shortcuts.splice(index, 1);
      this.shortcuts.set(key, shortcuts);
      return true;
    }

    return false;
  }

  // =================== COMMAND MANAGEMENT ===================

  getAvailableCommands(language?: SupportedLanguage): VoiceCommand[] {
    const commands = Array.from(this.commands.values()).filter(c => c.enabled);

    if (language) {
      return commands.filter(c => c.patterns[language] && c.patterns[language]!.length > 0);
    }

    return commands;
  }

  getCommandsByCategory(category: VoiceCommandCategory): VoiceCommand[] {
    return Array.from(this.commands.values())
      .filter(c => c.category === category && c.enabled);
  }

  registerCustomCommand(command: VoiceCommand): void {
    this.commands.set(command.id, command);
    this.logger.log(`Registered custom voice command: ${command.id}`);
  }

  disableCommand(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (command) {
      command.enabled = false;
      return true;
    }
    return false;
  }

  enableCommand(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (command) {
      command.enabled = true;
      return true;
    }
    return false;
  }

  // =================== HELP & TUTORIALS ===================

  getHelpText(language: SupportedLanguage): string {
    const commands = this.getAvailableCommands(language);
    const categorized: Record<VoiceCommandCategory, string[]> = {} as any;

    commands.forEach(cmd => {
      if (!categorized[cmd.category]) {
        categorized[cmd.category] = [];
      }
      const examples = cmd.examples[language] || cmd.examples['en'] || [];
      if (examples.length > 0) {
        categorized[cmd.category].push(examples[0]);
      }
    });

    const categoryLabels: Record<VoiceCommandCategory, Record<SupportedLanguage, string>> = {
      navigation: { ro: 'Navigare', en: 'Navigation', de: 'Navigation', fr: 'Navigation', es: 'Navegacion' },
      invoice: { ro: 'Facturi', en: 'Invoices', de: 'Rechnungen', fr: 'Factures', es: 'Facturas' },
      payment: { ro: 'Plati', en: 'Payments', de: 'Zahlungen', fr: 'Paiements', es: 'Pagos' },
      report: { ro: 'Rapoarte', en: 'Reports', de: 'Berichte', fr: 'Rapports', es: 'Informes' },
      search: { ro: 'Cautare', en: 'Search', de: 'Suche', fr: 'Recherche', es: 'Busqueda' },
      settings: { ro: 'Setari', en: 'Settings', de: 'Einstellungen', fr: 'Parametres', es: 'Configuracion' },
      help: { ro: 'Ajutor', en: 'Help', de: 'Hilfe', fr: 'Aide', es: 'Ayuda' },
      vat: { ro: 'TVA', en: 'VAT', de: 'MwSt', fr: 'TVA', es: 'IVA' },
      document: { ro: 'Documente', en: 'Documents', de: 'Dokumente', fr: 'Documents', es: 'Documentos' },
      dashboard: { ro: 'Dashboard', en: 'Dashboard', de: 'Dashboard', fr: 'Tableau de bord', es: 'Panel' },
      hr: { ro: 'HR', en: 'HR', de: 'Personal', fr: 'RH', es: 'RRHH' },
      compliance: { ro: 'Conformitate', en: 'Compliance', de: 'Compliance', fr: 'Conformite', es: 'Cumplimiento' },
    };

    let helpText = '';
    Object.entries(categorized).forEach(([cat, examples]) => {
      const label = categoryLabels[cat as VoiceCommandCategory]?.[language] || cat;
      helpText += `\n${label}:\n`;
      examples.forEach(ex => {
        helpText += `  - "${ex}"\n`;
      });
    });

    return helpText;
  }

  // =================== STATISTICS ===================

  getSessionStats(sessionId: string): {
    totalCommands: number;
    successfulCommands: number;
    avgConfidence: number;
    mostUsedCategories: { category: string; count: number }[];
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const successful = session.history.filter(h => h.result.success);
    const categoryCount: Record<string, number> = {};

    session.history.forEach(h => {
      if (h.result.command) {
        categoryCount[h.result.command.category] = (categoryCount[h.result.command.category] || 0) + 1;
      }
    });

    const mostUsedCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return {
      totalCommands: session.history.length,
      successfulCommands: successful.length,
      avgConfidence: session.history.length > 0
        ? session.history.reduce((sum, h) => sum + h.result.confidence, 0) / session.history.length
        : 0,
      mostUsedCategories,
    };
  }
}

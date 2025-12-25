import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type SearchableEntity = 'INVOICE' | 'CLIENT' | 'PRODUCT' | 'DOCUMENT' | 'TRANSACTION' | 'EMPLOYEE' | 'REPORT';
export type SearchOperator = 'AND' | 'OR' | 'NOT';
export type SortOrder = 'ASC' | 'DESC';
export type FilterOperator = 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN' | 'IN' | 'NOT_IN';

export interface SearchField {
  name: string;
  label: string;
  labelRo: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ENUM';
  searchable: boolean;
  filterable: boolean;
  sortable: boolean;
  facetable: boolean;
  boost?: number;
  enumValues?: string[];
}

export interface IndexedDocument {
  id: string;
  entity: SearchableEntity;
  tenantId: string;
  content: Record<string, any>;
  textContent: string;
  metadata: Record<string, any>;
  language: 'RO' | 'EN';
  createdAt: Date;
  updatedAt: Date;
  indexedAt: Date;
}

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  valueEnd?: any;
}

export interface SearchQuery {
  query: string;
  entities?: SearchableEntity[];
  filters?: SearchFilter[];
  operator?: SearchOperator;
  fields?: string[];
  sort?: { field: string; order: SortOrder }[];
  page?: number;
  pageSize?: number;
  facets?: string[];
  highlight?: boolean;
  fuzzy?: boolean;
  minScore?: number;
  language?: 'RO' | 'EN' | 'AUTO';
  tenantId?: string;
}

export interface SearchResult {
  id: string;
  entity: SearchableEntity;
  content: Record<string, any>;
  score: number;
  highlights?: Record<string, string[]>;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: SearchResult[];
  facets?: Record<string, FacetResult>;
  suggestions?: string[];
  took: number;
  language: 'RO' | 'EN';
}

export interface FacetResult {
  field: string;
  values: { value: string; count: number; label?: string; labelRo?: string }[];
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  nameRo: string;
  query: SearchQuery;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  query: string;
  entities: SearchableEntity[];
  resultCount: number;
  searchedAt: Date;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  type: 'QUERY' | 'ENTITY' | 'FIELD_VALUE';
  entity?: SearchableEntity;
  field?: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  averageResultCount: number;
  topQueries: { query: string; count: number }[];
  searchesByEntity: Record<SearchableEntity, number>;
  noResultQueries: string[];
  averageSearchTime: number;
}

export interface IndexConfig {
  entity: SearchableEntity;
  fields: SearchField[];
  defaultBoost: number;
  analyzer: 'STANDARD' | 'ROMANIAN' | 'ENGLISH';
}

@Injectable()
export class AdvancedSearchService {
  private documents = new Map<string, IndexedDocument>();
  private savedSearches = new Map<string, SavedSearch>();
  private searchHistory: SearchHistoryEntry[] = [];
  private indexConfigs = new Map<SearchableEntity, IndexConfig>();
  private searchTimes: number[] = [];
  private queryFrequency = new Map<string, number>();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeIndexConfigs();
    this.seedSampleData();
  }

  private initializeIndexConfigs(): void {
    const configs: IndexConfig[] = [
      {
        entity: 'INVOICE',
        defaultBoost: 1.0,
        analyzer: 'ROMANIAN',
        fields: [
          { name: 'number', label: 'Invoice Number', labelRo: 'Număr Factură', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'clientName', label: 'Client Name', labelRo: 'Nume Client', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true, boost: 1.5 },
          { name: 'amount', label: 'Amount', labelRo: 'Sumă', type: 'NUMBER', searchable: false, filterable: true, sortable: true, facetable: false },
          { name: 'currency', label: 'Currency', labelRo: 'Monedă', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['RON', 'EUR', 'USD'] },
          { name: 'status', label: 'Status', labelRo: 'Stare', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] },
          { name: 'issueDate', label: 'Issue Date', labelRo: 'Data Emiterii', type: 'DATE', searchable: false, filterable: true, sortable: true, facetable: false },
          { name: 'dueDate', label: 'Due Date', labelRo: 'Data Scadenței', type: 'DATE', searchable: false, filterable: true, sortable: true, facetable: false },
          { name: 'description', label: 'Description', labelRo: 'Descriere', type: 'TEXT', searchable: true, filterable: false, sortable: false, facetable: false },
        ],
      },
      {
        entity: 'CLIENT',
        defaultBoost: 1.0,
        analyzer: 'ROMANIAN',
        fields: [
          { name: 'name', label: 'Name', labelRo: 'Nume', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'cui', label: 'CUI', labelRo: 'CUI', type: 'TEXT', searchable: true, filterable: true, sortable: false, facetable: false, boost: 1.8 },
          { name: 'email', label: 'Email', labelRo: 'Email', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false },
          { name: 'phone', label: 'Phone', labelRo: 'Telefon', type: 'TEXT', searchable: true, filterable: true, sortable: false, facetable: false },
          { name: 'city', label: 'City', labelRo: 'Oraș', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'county', label: 'County', labelRo: 'Județ', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'type', label: 'Type', labelRo: 'Tip', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['COMPANY', 'INDIVIDUAL', 'GOVERNMENT'] },
          { name: 'isActive', label: 'Active', labelRo: 'Activ', type: 'BOOLEAN', searchable: false, filterable: true, sortable: false, facetable: true },
        ],
      },
      {
        entity: 'PRODUCT',
        defaultBoost: 1.0,
        analyzer: 'ROMANIAN',
        fields: [
          { name: 'name', label: 'Name', labelRo: 'Nume', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'sku', label: 'SKU', labelRo: 'Cod Produs', type: 'TEXT', searchable: true, filterable: true, sortable: false, facetable: false, boost: 1.5 },
          { name: 'description', label: 'Description', labelRo: 'Descriere', type: 'TEXT', searchable: true, filterable: false, sortable: false, facetable: false },
          { name: 'category', label: 'Category', labelRo: 'Categorie', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'price', label: 'Price', labelRo: 'Preț', type: 'NUMBER', searchable: false, filterable: true, sortable: true, facetable: false },
          { name: 'vatRate', label: 'VAT Rate', labelRo: 'Cotă TVA', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['19', '9', '5', '0'] },
          { name: 'inStock', label: 'In Stock', labelRo: 'În Stoc', type: 'BOOLEAN', searchable: false, filterable: true, sortable: false, facetable: true },
        ],
      },
      {
        entity: 'DOCUMENT',
        defaultBoost: 1.0,
        analyzer: 'ROMANIAN',
        fields: [
          { name: 'title', label: 'Title', labelRo: 'Titlu', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'content', label: 'Content', labelRo: 'Conținut', type: 'TEXT', searchable: true, filterable: false, sortable: false, facetable: false },
          { name: 'type', label: 'Type', labelRo: 'Tip', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['CONTRACT', 'REPORT', 'DECLARATION', 'OTHER'] },
          { name: 'author', label: 'Author', labelRo: 'Autor', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'createdDate', label: 'Created Date', labelRo: 'Data Creării', type: 'DATE', searchable: false, filterable: true, sortable: true, facetable: false },
        ],
      },
      {
        entity: 'TRANSACTION',
        defaultBoost: 1.0,
        analyzer: 'STANDARD',
        fields: [
          { name: 'reference', label: 'Reference', labelRo: 'Referință', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'description', label: 'Description', labelRo: 'Descriere', type: 'TEXT', searchable: true, filterable: false, sortable: false, facetable: false },
          { name: 'amount', label: 'Amount', labelRo: 'Sumă', type: 'NUMBER', searchable: false, filterable: true, sortable: true, facetable: false },
          { name: 'type', label: 'Type', labelRo: 'Tip', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['INCOME', 'EXPENSE', 'TRANSFER'] },
          { name: 'category', label: 'Category', labelRo: 'Categorie', type: 'TEXT', searchable: true, filterable: true, sortable: false, facetable: true },
          { name: 'date', label: 'Date', labelRo: 'Dată', type: 'DATE', searchable: false, filterable: true, sortable: true, facetable: false },
        ],
      },
      {
        entity: 'EMPLOYEE',
        defaultBoost: 1.0,
        analyzer: 'ROMANIAN',
        fields: [
          { name: 'name', label: 'Name', labelRo: 'Nume', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'cnp', label: 'CNP', labelRo: 'CNP', type: 'TEXT', searchable: true, filterable: true, sortable: false, facetable: false },
          { name: 'position', label: 'Position', labelRo: 'Funcție', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'department', label: 'Department', labelRo: 'Departament', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'email', label: 'Email', labelRo: 'Email', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false },
          { name: 'status', label: 'Status', labelRo: 'Stare', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['ACTIVE', 'ON_LEAVE', 'TERMINATED'] },
          { name: 'hireDate', label: 'Hire Date', labelRo: 'Data Angajării', type: 'DATE', searchable: false, filterable: true, sortable: true, facetable: false },
        ],
      },
      {
        entity: 'REPORT',
        defaultBoost: 1.0,
        analyzer: 'ROMANIAN',
        fields: [
          { name: 'title', label: 'Title', labelRo: 'Titlu', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: false, boost: 2.0 },
          { name: 'type', label: 'Type', labelRo: 'Tip', type: 'ENUM', searchable: false, filterable: true, sortable: false, facetable: true, enumValues: ['FINANCIAL', 'TAX', 'OPERATIONAL', 'HR'] },
          { name: 'period', label: 'Period', labelRo: 'Perioadă', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'author', label: 'Author', labelRo: 'Autor', type: 'TEXT', searchable: true, filterable: true, sortable: true, facetable: true },
          { name: 'generatedDate', label: 'Generated Date', labelRo: 'Data Generării', type: 'DATE', searchable: false, filterable: true, sortable: true, facetable: false },
        ],
      },
    ];

    configs.forEach((config) => this.indexConfigs.set(config.entity, config));
  }

  private seedSampleData(): void {
    const sampleDocs = [
      { entity: 'INVOICE' as SearchableEntity, content: { number: 'INV-2025-001', clientName: 'SC Exemplu SRL', amount: 5000, currency: 'RON', status: 'PAID', description: 'Servicii consultanță' }, textContent: 'INV-2025-001 SC Exemplu SRL Servicii consultanță' },
      { entity: 'INVOICE' as SearchableEntity, content: { number: 'INV-2025-002', clientName: 'ABC Industries', amount: 12500, currency: 'EUR', status: 'SENT', description: 'Livrare echipamente' }, textContent: 'INV-2025-002 ABC Industries Livrare echipamente' },
      { entity: 'CLIENT' as SearchableEntity, content: { name: 'SC Exemplu SRL', cui: 'RO12345678', email: 'contact@exemplu.ro', city: 'București', county: 'București', type: 'COMPANY', isActive: true }, textContent: 'SC Exemplu SRL RO12345678 contact@exemplu.ro București' },
      { entity: 'CLIENT' as SearchableEntity, content: { name: 'Ion Popescu', cui: '', email: 'ion@email.ro', city: 'Cluj-Napoca', county: 'Cluj', type: 'INDIVIDUAL', isActive: true }, textContent: 'Ion Popescu ion@email.ro Cluj-Napoca Cluj' },
      { entity: 'PRODUCT' as SearchableEntity, content: { name: 'Laptop Business Pro', sku: 'LBP-001', description: 'Laptop performant pentru afaceri', category: 'Electronice', price: 4500, vatRate: '19', inStock: true }, textContent: 'Laptop Business Pro LBP-001 Laptop performant pentru afaceri Electronice' },
      { entity: 'EMPLOYEE' as SearchableEntity, content: { name: 'Maria Ionescu', position: 'Contabil Șef', department: 'Financiar', email: 'maria.ionescu@company.ro', status: 'ACTIVE' }, textContent: 'Maria Ionescu Contabil Șef Financiar maria.ionescu@company.ro' },
    ];

    sampleDocs.forEach((doc) => {
      const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.documents.set(id, {
        id,
        entity: doc.entity,
        tenantId: 'default',
        content: doc.content,
        textContent: doc.textContent,
        metadata: {},
        language: 'RO',
        createdAt: new Date(),
        updatedAt: new Date(),
        indexedAt: new Date(),
      });
    });
  }

  // Indexing
  indexDocument(entity: SearchableEntity, content: Record<string, any>, tenantId: string, language: 'RO' | 'EN' = 'RO'): IndexedDocument {
    const config = this.indexConfigs.get(entity);
    if (!config) {
      throw new BadRequestException(`Unknown entity type: ${entity}`);
    }

    const searchableFields = config.fields.filter((f) => f.searchable);
    const textContent = searchableFields.map((f) => content[f.name]).filter(Boolean).join(' ');

    const doc: IndexedDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entity,
      tenantId,
      content,
      textContent: textContent.toLowerCase(),
      metadata: {},
      language,
      createdAt: new Date(),
      updatedAt: new Date(),
      indexedAt: new Date(),
    };

    this.documents.set(doc.id, doc);
    this.eventEmitter.emit('search.document.indexed', { documentId: doc.id, entity });
    return doc;
  }

  updateDocument(documentId: string, content: Record<string, any>): IndexedDocument {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const config = this.indexConfigs.get(doc.entity);
    const searchableFields = config!.fields.filter((f) => f.searchable);
    const textContent = searchableFields.map((f) => content[f.name]).filter(Boolean).join(' ');

    const updated: IndexedDocument = {
      ...doc,
      content,
      textContent: textContent.toLowerCase(),
      updatedAt: new Date(),
      indexedAt: new Date(),
    };

    this.documents.set(documentId, updated);
    return updated;
  }

  deleteDocument(documentId: string): void {
    if (!this.documents.has(documentId)) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    this.documents.delete(documentId);
    this.eventEmitter.emit('search.document.deleted', { documentId });
  }

  getDocument(documentId: string): IndexedDocument {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return doc;
  }

  // Search
  async search(searchQuery: SearchQuery, userId?: string): Promise<SearchResponse> {
    const startTime = Date.now();

    const {
      query,
      entities = ['INVOICE', 'CLIENT', 'PRODUCT', 'DOCUMENT', 'TRANSACTION', 'EMPLOYEE', 'REPORT'],
      filters = [],
      operator = 'AND',
      fields,
      sort = [],
      page = 1,
      pageSize = 20,
      facets = [],
      highlight = false,
      fuzzy = false,
      minScore = 0,
      language = 'AUTO',
      tenantId,
    } = searchQuery;

    let results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    // Detect language if AUTO
    const detectedLanguage = language === 'AUTO' ? this.detectLanguage(query) : language;

    // Search through documents
    for (const doc of this.documents.values()) {
      if (!entities.includes(doc.entity)) continue;
      if (tenantId && doc.tenantId !== tenantId) continue;

      let matches = false;
      let score = 0;

      // Text search
      if (normalizedQuery) {
        const terms = normalizedQuery.split(/\s+/);
        const matchedTerms = terms.filter((term) => {
          if (fuzzy) {
            return this.fuzzyMatch(doc.textContent, term);
          }
          return doc.textContent.includes(term);
        });

        if (operator === 'AND') {
          matches = matchedTerms.length === terms.length;
        } else if (operator === 'OR') {
          matches = matchedTerms.length > 0;
        }

        // Calculate score based on term frequency and field boosts
        const config = this.indexConfigs.get(doc.entity);
        if (matches && config) {
          score = this.calculateScore(doc, terms, config, fields);
        }
      } else {
        matches = true;
        score = 1;
      }

      // Apply filters
      if (matches && filters.length > 0) {
        matches = this.applyFilters(doc, filters);
      }

      if (matches && score >= minScore) {
        const result: SearchResult = {
          id: doc.id,
          entity: doc.entity,
          content: doc.content,
          score,
          metadata: doc.metadata,
        };

        if (highlight && normalizedQuery) {
          result.highlights = this.generateHighlights(doc, normalizedQuery.split(/\s+/));
        }

        results.push(result);
      }
    }

    // Sort results
    results.sort((a, b) => {
      if (sort.length > 0) {
        for (const s of sort) {
          const aVal = a.content[s.field];
          const bVal = b.content[s.field];
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (cmp !== 0) return s.order === 'ASC' ? cmp : -cmp;
        }
      }
      return b.score - a.score;
    });

    // Calculate facets
    const facetResults: Record<string, FacetResult> = {};
    if (facets.length > 0) {
      for (const facetField of facets) {
        facetResults[facetField] = this.calculateFacet(results, facetField, entities);
      }
    }

    // Paginate
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    results = results.slice(startIndex, startIndex + pageSize);

    // Generate suggestions if few results
    let suggestions: string[] | undefined;
    if (totalResults < 3 && normalizedQuery) {
      suggestions = this.generateSuggestions(normalizedQuery);
    }

    const took = Date.now() - startTime;
    this.searchTimes.push(took);

    // Record query frequency
    if (normalizedQuery) {
      this.queryFrequency.set(normalizedQuery, (this.queryFrequency.get(normalizedQuery) || 0) + 1);
    }

    // Save to history
    if (userId) {
      this.addToHistory(userId, query, entities, totalResults);
    }

    this.eventEmitter.emit('search.executed', { query, totalResults, took, userId });

    return {
      query,
      totalResults,
      page,
      pageSize,
      totalPages,
      results,
      facets: Object.keys(facetResults).length > 0 ? facetResults : undefined,
      suggestions,
      took,
      language: detectedLanguage,
    };
  }

  private detectLanguage(text: string): 'RO' | 'EN' {
    const romanianWords = ['și', 'sau', 'pentru', 'factură', 'plată', 'taxă', 'declarație', 'raport', 'în', 'de', 'este', 'sunt'];
    const lowerText = text.toLowerCase();
    const hasRomanian = romanianWords.some((word) => lowerText.includes(word));
    return hasRomanian ? 'RO' : 'EN';
  }

  private fuzzyMatch(text: string, term: string): boolean {
    if (text.includes(term)) return true;

    // Simple Levenshtein distance check for short terms
    if (term.length < 4) return false;

    const words = text.split(/\s+/);
    return words.some((word) => {
      if (Math.abs(word.length - term.length) > 2) return false;
      return this.levenshteinDistance(word, term) <= 2;
    });
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private calculateScore(doc: IndexedDocument, terms: string[], config: IndexConfig, specificFields?: string[]): number {
    let score = 0;

    const fieldsToCheck = specificFields
      ? config.fields.filter((f) => specificFields.includes(f.name))
      : config.fields.filter((f) => f.searchable);

    for (const field of fieldsToCheck) {
      const value = String(doc.content[field.name] || '').toLowerCase();
      const boost = field.boost || 1;

      for (const term of terms) {
        if (value.includes(term)) {
          // Exact match bonus
          if (value === term) {
            score += 10 * boost;
          } else if (value.startsWith(term)) {
            score += 5 * boost;
          } else {
            score += 1 * boost;
          }
        }
      }
    }

    return score * config.defaultBoost;
  }

  private applyFilters(doc: IndexedDocument, filters: SearchFilter[]): boolean {
    for (const filter of filters) {
      const value = doc.content[filter.field];

      switch (filter.operator) {
        case 'EQUALS':
          if (value !== filter.value) return false;
          break;
        case 'CONTAINS':
          if (!String(value).toLowerCase().includes(String(filter.value).toLowerCase())) return false;
          break;
        case 'STARTS_WITH':
          if (!String(value).toLowerCase().startsWith(String(filter.value).toLowerCase())) return false;
          break;
        case 'ENDS_WITH':
          if (!String(value).toLowerCase().endsWith(String(filter.value).toLowerCase())) return false;
          break;
        case 'GREATER_THAN':
          if (!(value > filter.value)) return false;
          break;
        case 'LESS_THAN':
          if (!(value < filter.value)) return false;
          break;
        case 'BETWEEN':
          if (!(value >= filter.value && value <= filter.valueEnd)) return false;
          break;
        case 'IN':
          if (!Array.isArray(filter.value) || !filter.value.includes(value)) return false;
          break;
        case 'NOT_IN':
          if (Array.isArray(filter.value) && filter.value.includes(value)) return false;
          break;
      }
    }
    return true;
  }

  private generateHighlights(doc: IndexedDocument, terms: string[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(doc.content)) {
      if (typeof value !== 'string') continue;

      const lowerValue = value.toLowerCase();
      for (const term of terms) {
        if (lowerValue.includes(term)) {
          if (!highlights[key]) highlights[key] = [];
          const highlighted = value.replace(new RegExp(`(${term})`, 'gi'), '<em>$1</em>');
          highlights[key].push(highlighted);
        }
      }
    }

    return highlights;
  }

  private calculateFacet(results: SearchResult[], field: string, entities: SearchableEntity[]): FacetResult {
    const valueCounts = new Map<string, number>();

    for (const result of results) {
      const value = result.content[field];
      if (value !== undefined && value !== null) {
        const strValue = String(value);
        valueCounts.set(strValue, (valueCounts.get(strValue) || 0) + 1);
      }
    }

    // Get field labels from config
    let fieldConfig: SearchField | undefined;
    for (const entity of entities) {
      const config = this.indexConfigs.get(entity);
      if (config) {
        fieldConfig = config.fields.find((f) => f.name === field);
        if (fieldConfig) break;
      }
    }

    const values = Array.from(valueCounts.entries())
      .map(([value, count]) => ({ value, count, label: value, labelRo: value }))
      .sort((a, b) => b.count - a.count);

    return { field, values };
  }

  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    // Get similar queries from history
    for (const [q, count] of this.queryFrequency.entries()) {
      if (q !== query && (q.includes(query) || query.includes(q) || this.levenshteinDistance(q, query) <= 3)) {
        suggestions.push(q);
      }
    }

    return suggestions.slice(0, 5);
  }

  // Autocomplete
  getSuggestions(prefix: string, entity?: SearchableEntity, limit: number = 10): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const lowerPrefix = prefix.toLowerCase();

    // Query suggestions from history
    for (const [query, count] of this.queryFrequency.entries()) {
      if (query.startsWith(lowerPrefix)) {
        suggestions.push({ text: query, score: count, type: 'QUERY' });
      }
    }

    // Field value suggestions from documents
    const entitiesToSearch = entity ? [entity] : Array.from(this.indexConfigs.keys());

    for (const doc of this.documents.values()) {
      if (!entitiesToSearch.includes(doc.entity)) continue;

      const config = this.indexConfigs.get(doc.entity);
      if (!config) continue;

      for (const field of config.fields) {
        if (!field.searchable) continue;

        const value = String(doc.content[field.name] || '');
        if (value.toLowerCase().startsWith(lowerPrefix)) {
          const existing = suggestions.find((s) => s.text === value && s.type === 'FIELD_VALUE');
          if (!existing) {
            suggestions.push({ text: value, score: 1, type: 'FIELD_VALUE', entity: doc.entity, field: field.name });
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  // Search History
  private addToHistory(userId: string, query: string, entities: SearchableEntity[], resultCount: number): void {
    this.searchHistory.push({
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      query,
      entities,
      resultCount,
      searchedAt: new Date(),
    });

    // Limit history size per user
    const userHistory = this.searchHistory.filter((h) => h.userId === userId);
    if (userHistory.length > 100) {
      const oldestId = userHistory[0].id;
      const index = this.searchHistory.findIndex((h) => h.id === oldestId);
      if (index !== -1) this.searchHistory.splice(index, 1);
    }
  }

  getSearchHistory(userId: string, limit: number = 20): SearchHistoryEntry[] {
    return this.searchHistory.filter((h) => h.userId === userId).sort((a, b) => b.searchedAt.getTime() - a.searchedAt.getTime()).slice(0, limit);
  }

  clearSearchHistory(userId: string): void {
    this.searchHistory = this.searchHistory.filter((h) => h.userId !== userId);
    this.eventEmitter.emit('search.history.cleared', { userId });
  }

  // Saved Searches
  saveSearch(userId: string, name: string, nameRo: string, query: SearchQuery): SavedSearch {
    const saved: SavedSearch = {
      id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      nameRo,
      query,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.savedSearches.set(saved.id, saved);
    this.eventEmitter.emit('search.saved', { savedSearchId: saved.id, userId });
    return saved;
  }

  getSavedSearches(userId: string): SavedSearch[] {
    return Array.from(this.savedSearches.values()).filter((s) => s.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getSavedSearch(savedSearchId: string): SavedSearch {
    const saved = this.savedSearches.get(savedSearchId);
    if (!saved) {
      throw new NotFoundException(`Saved search ${savedSearchId} not found`);
    }
    return saved;
  }

  updateSavedSearch(savedSearchId: string, updates: { name?: string; nameRo?: string; query?: SearchQuery; isDefault?: boolean }): SavedSearch {
    const saved = this.getSavedSearch(savedSearchId);

    if (updates.isDefault) {
      // Clear other defaults for this user
      for (const s of this.savedSearches.values()) {
        if (s.userId === saved.userId && s.id !== savedSearchId) {
          s.isDefault = false;
        }
      }
    }

    const updated: SavedSearch = {
      ...saved,
      ...updates,
      id: saved.id,
      userId: saved.userId,
      createdAt: saved.createdAt,
      updatedAt: new Date(),
    };

    this.savedSearches.set(savedSearchId, updated);
    return updated;
  }

  deleteSavedSearch(savedSearchId: string): void {
    if (!this.savedSearches.has(savedSearchId)) {
      throw new NotFoundException(`Saved search ${savedSearchId} not found`);
    }
    this.savedSearches.delete(savedSearchId);
    this.eventEmitter.emit('search.saved.deleted', { savedSearchId });
  }

  async executeSavedSearch(savedSearchId: string, userId: string, overrides?: Partial<SearchQuery>): Promise<SearchResponse> {
    const saved = this.getSavedSearch(savedSearchId);
    const query: SearchQuery = { ...saved.query, ...overrides };
    return this.search(query, userId);
  }

  // Analytics
  getAnalytics(): SearchAnalytics {
    const totalSearches = this.searchHistory.length;
    const uniqueUsers = new Set(this.searchHistory.map((h) => h.userId)).size;
    const resultCounts = this.searchHistory.map((h) => h.resultCount);
    const averageResultCount = resultCounts.length > 0 ? resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length : 0;

    const queryGroups = new Map<string, number>();
    this.searchHistory.forEach((h) => {
      const lower = h.query.toLowerCase();
      queryGroups.set(lower, (queryGroups.get(lower) || 0) + 1);
    });
    const topQueries = Array.from(queryGroups.entries()).map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    const searchesByEntity: Record<SearchableEntity, number> = {
      INVOICE: 0, CLIENT: 0, PRODUCT: 0, DOCUMENT: 0, TRANSACTION: 0, EMPLOYEE: 0, REPORT: 0,
    };
    this.searchHistory.forEach((h) => {
      h.entities.forEach((e) => searchesByEntity[e]++);
    });

    const noResultQueries = this.searchHistory.filter((h) => h.resultCount === 0).map((h) => h.query).filter((q, i, arr) => arr.indexOf(q) === i).slice(0, 20);

    const averageSearchTime = this.searchTimes.length > 0 ? this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length : 0;

    return {
      totalSearches,
      uniqueUsers,
      averageResultCount,
      topQueries,
      searchesByEntity,
      noResultQueries,
      averageSearchTime,
    };
  }

  // Index Config
  getIndexConfig(entity: SearchableEntity): IndexConfig {
    const config = this.indexConfigs.get(entity);
    if (!config) {
      throw new NotFoundException(`Index config for ${entity} not found`);
    }
    return config;
  }

  getIndexConfigs(): IndexConfig[] {
    return Array.from(this.indexConfigs.values());
  }

  getSearchableFields(entity: SearchableEntity): SearchField[] {
    const config = this.getIndexConfig(entity);
    return config.fields.filter((f) => f.searchable);
  }

  getFilterableFields(entity: SearchableEntity): SearchField[] {
    const config = this.getIndexConfig(entity);
    return config.fields.filter((f) => f.filterable);
  }

  getFacetableFields(entity: SearchableEntity): SearchField[] {
    const config = this.getIndexConfig(entity);
    return config.fields.filter((f) => f.facetable);
  }

  // Reindex
  async reindexEntity(entity: SearchableEntity): Promise<number> {
    const docs = Array.from(this.documents.values()).filter((d) => d.entity === entity);

    for (const doc of docs) {
      doc.indexedAt = new Date();
      this.documents.set(doc.id, doc);
    }

    this.eventEmitter.emit('search.reindex.completed', { entity, count: docs.length });
    return docs.length;
  }

  async reindexAll(): Promise<Record<SearchableEntity, number>> {
    const counts: Partial<Record<SearchableEntity, number>> = {};

    for (const entity of this.indexConfigs.keys()) {
      counts[entity] = await this.reindexEntity(entity);
    }

    return counts as Record<SearchableEntity, number>;
  }

  // Stats
  getIndexStats(): { totalDocuments: number; byEntity: Record<SearchableEntity, number> } {
    const byEntity: Partial<Record<SearchableEntity, number>> = {};

    for (const entity of this.indexConfigs.keys()) {
      byEntity[entity] = 0;
    }

    for (const doc of this.documents.values()) {
      byEntity[doc.entity] = (byEntity[doc.entity] || 0) + 1;
    }

    return {
      totalDocuments: this.documents.size,
      byEntity: byEntity as Record<SearchableEntity, number>,
    };
  }
}

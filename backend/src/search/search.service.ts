import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type SearchIndex =
  | 'invoices'
  | 'customers'
  | 'products'
  | 'employees'
  | 'documents'
  | 'transactions'
  | 'reports';

export type SearchOperator = 'AND' | 'OR' | 'NOT';

export type SortOrder = 'asc' | 'desc';

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'range' | 'exists' | 'prefix';

export interface SearchQuery {
  query: string;
  index: SearchIndex;
  filters?: SearchFilter[];
  facets?: string[];
  sort?: SearchSort[];
  page?: number;
  pageSize?: number;
  highlight?: boolean;
  fuzzy?: boolean;
  fuzziness?: number;
  operator?: SearchOperator;
  fields?: string[];
}

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface SearchSort {
  field: string;
  order: SortOrder;
}

export interface SearchResult<T = any> {
  items: SearchHit<T>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: SearchFacet[];
  suggestions?: string[];
  queryTime: number;
}

export interface SearchHit<T = any> {
  id: string;
  score: number;
  source: T;
  highlights?: Record<string, string[]>;
  index: SearchIndex;
}

export interface SearchFacet {
  field: string;
  fieldRo: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  valueRo?: string;
  count: number;
}

export interface IndexConfig {
  name: SearchIndex;
  nameRo: string;
  description: string;
  descriptionRo: string;
  fields: IndexField[];
  settings: IndexSettings;
}

export interface IndexField {
  name: string;
  nameRo: string;
  type: 'text' | 'keyword' | 'number' | 'date' | 'boolean' | 'nested';
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  facetable: boolean;
  analyzer?: string;
  boost?: number;
}

export interface IndexSettings {
  analyzer: string;
  tokenizer: string;
  stopWords: string[];
  synonyms: Record<string, string[]>;
  minGram?: number;
  maxGram?: number;
}

export interface AutocompleteOptions {
  index: SearchIndex;
  field: string;
  prefix: string;
  limit?: number;
  fuzzy?: boolean;
}

export interface SuggestionResult {
  text: string;
  score: number;
  highlighted?: string;
}

export interface SearchStats {
  totalSearches: number;
  totalDocuments: number;
  averageQueryTime: number;
  popularQueries: Array<{ query: string; count: number }>;
  indexStats: Record<SearchIndex, IndexStats>;
}

export interface IndexStats {
  documentCount: number;
  lastIndexed?: Date;
  lastSearched?: Date;
  searchCount: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private indices: Map<SearchIndex, Map<string, any>> = new Map();
  private indexConfigs: Map<SearchIndex, IndexConfig> = new Map();
  private queryHistory: Array<{ query: string; timestamp: Date }> = [];
  private stats: SearchStats = {
    totalSearches: 0,
    totalDocuments: 0,
    averageQueryTime: 0,
    popularQueries: [],
    indexStats: {} as Record<SearchIndex, IndexStats>,
  };

  private queryTimes: number[] = [];

  // Romanian stop words
  private readonly romanianStopWords = [
    'și', 'în', 'la', 'de', 'pe', 'cu', 'din', 'pentru', 'că', 'nu', 'un', 'o',
    'sau', 'mai', 'are', 'este', 'ca', 'sa', 'se', 'au', 'dar', 'le', 'ce',
    'al', 'ale', 'ai', 'lor', 'ei', 'ea', 'el', 'noi', 'voi', 'ei',
  ];

  // Romanian synonyms for business terms
  private readonly businessSynonyms: Record<string, string[]> = {
    'factură': ['factura', 'invoice', 'fact'],
    'client': ['cumparator', 'beneficiar', 'customer'],
    'produs': ['articol', 'marfa', 'product'],
    'plată': ['plata', 'payment', 'achitare'],
    'taxă': ['taxa', 'impozit', 'tax'],
    'TVA': ['tva', 'vat', 'taxă pe valoare adăugată'],
    'angajat': ['salariat', 'employee', 'lucrător'],
    'salariu': ['leafă', 'salary', 'wage'],
    'CUI': ['cui', 'cif', 'cod fiscal', 'tax id'],
    'ANAF': ['anaf', 'fisc', 'administrația fiscală'],
  };

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    await this.initializeIndices();
    await this.seedSampleData();
  }

  private async initializeIndices(): Promise<void> {
    const indexConfigs: IndexConfig[] = [
      {
        name: 'invoices',
        nameRo: 'Facturi',
        description: 'Search invoices by number, customer, amount',
        descriptionRo: 'Căutare facturi după număr, client, sumă',
        fields: [
          { name: 'invoiceNumber', nameRo: 'Număr Factură', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: false },
          { name: 'customerName', nameRo: 'Nume Client', type: 'text', searchable: true, sortable: true, filterable: true, facetable: true, boost: 2 },
          { name: 'customerCui', nameRo: 'CUI Client', type: 'keyword', searchable: true, sortable: false, filterable: true, facetable: false },
          { name: 'amount', nameRo: 'Sumă', type: 'number', searchable: false, sortable: true, filterable: true, facetable: false },
          { name: 'status', nameRo: 'Stare', type: 'keyword', searchable: false, sortable: true, filterable: true, facetable: true },
          { name: 'date', nameRo: 'Data', type: 'date', searchable: false, sortable: true, filterable: true, facetable: false },
          { name: 'description', nameRo: 'Descriere', type: 'text', searchable: true, sortable: false, filterable: false, facetable: false },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
      {
        name: 'customers',
        nameRo: 'Clienți',
        description: 'Search customers by name, CUI, location',
        descriptionRo: 'Căutare clienți după nume, CUI, locație',
        fields: [
          { name: 'name', nameRo: 'Denumire', type: 'text', searchable: true, sortable: true, filterable: true, facetable: false, boost: 3 },
          { name: 'cui', nameRo: 'CUI', type: 'keyword', searchable: true, sortable: false, filterable: true, facetable: false },
          { name: 'email', nameRo: 'Email', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: false },
          { name: 'city', nameRo: 'Oraș', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: true },
          { name: 'county', nameRo: 'Județ', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: true },
          { name: 'type', nameRo: 'Tip', type: 'keyword', searchable: false, sortable: true, filterable: true, facetable: true },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
      {
        name: 'products',
        nameRo: 'Produse',
        description: 'Search products by name, SKU, category',
        descriptionRo: 'Căutare produse după nume, cod, categorie',
        fields: [
          { name: 'name', nameRo: 'Denumire', type: 'text', searchable: true, sortable: true, filterable: true, facetable: false, boost: 3 },
          { name: 'sku', nameRo: 'Cod Produs', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: false },
          { name: 'category', nameRo: 'Categorie', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: true },
          { name: 'price', nameRo: 'Preț', type: 'number', searchable: false, sortable: true, filterable: true, facetable: false },
          { name: 'stock', nameRo: 'Stoc', type: 'number', searchable: false, sortable: true, filterable: true, facetable: false },
          { name: 'description', nameRo: 'Descriere', type: 'text', searchable: true, sortable: false, filterable: false, facetable: false },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
      {
        name: 'employees',
        nameRo: 'Angajați',
        description: 'Search employees by name, position, department',
        descriptionRo: 'Căutare angajați după nume, funcție, departament',
        fields: [
          { name: 'name', nameRo: 'Nume', type: 'text', searchable: true, sortable: true, filterable: true, facetable: false, boost: 3 },
          { name: 'position', nameRo: 'Funcție', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: true },
          { name: 'department', nameRo: 'Departament', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: true },
          { name: 'email', nameRo: 'Email', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: false },
          { name: 'hireDate', nameRo: 'Data Angajării', type: 'date', searchable: false, sortable: true, filterable: true, facetable: false },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
      {
        name: 'documents',
        nameRo: 'Documente',
        description: 'Search uploaded documents and files',
        descriptionRo: 'Căutare documente și fișiere încărcate',
        fields: [
          { name: 'title', nameRo: 'Titlu', type: 'text', searchable: true, sortable: true, filterable: true, facetable: false, boost: 2 },
          { name: 'content', nameRo: 'Conținut', type: 'text', searchable: true, sortable: false, filterable: false, facetable: false },
          { name: 'type', nameRo: 'Tip', type: 'keyword', searchable: false, sortable: true, filterable: true, facetable: true },
          { name: 'tags', nameRo: 'Etichete', type: 'keyword', searchable: true, sortable: false, filterable: true, facetable: true },
          { name: 'createdAt', nameRo: 'Data Creării', type: 'date', searchable: false, sortable: true, filterable: true, facetable: false },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
      {
        name: 'transactions',
        nameRo: 'Tranzacții',
        description: 'Search financial transactions',
        descriptionRo: 'Căutare tranzacții financiare',
        fields: [
          { name: 'reference', nameRo: 'Referință', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: false },
          { name: 'type', nameRo: 'Tip', type: 'keyword', searchable: false, sortable: true, filterable: true, facetable: true },
          { name: 'amount', nameRo: 'Sumă', type: 'number', searchable: false, sortable: true, filterable: true, facetable: false },
          { name: 'description', nameRo: 'Descriere', type: 'text', searchable: true, sortable: false, filterable: false, facetable: false },
          { name: 'date', nameRo: 'Data', type: 'date', searchable: false, sortable: true, filterable: true, facetable: false },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
      {
        name: 'reports',
        nameRo: 'Rapoarte',
        description: 'Search generated reports',
        descriptionRo: 'Căutare rapoarte generate',
        fields: [
          { name: 'title', nameRo: 'Titlu', type: 'text', searchable: true, sortable: true, filterable: true, facetable: false, boost: 2 },
          { name: 'type', nameRo: 'Tip', type: 'keyword', searchable: false, sortable: true, filterable: true, facetable: true },
          { name: 'period', nameRo: 'Perioadă', type: 'keyword', searchable: true, sortable: true, filterable: true, facetable: true },
          { name: 'generatedAt', nameRo: 'Data Generării', type: 'date', searchable: false, sortable: true, filterable: true, facetable: false },
        ],
        settings: {
          analyzer: 'romanian',
          tokenizer: 'standard',
          stopWords: this.romanianStopWords,
          synonyms: this.businessSynonyms,
        },
      },
    ];

    for (const config of indexConfigs) {
      this.indexConfigs.set(config.name, config);
      this.indices.set(config.name, new Map());
      this.stats.indexStats[config.name] = {
        documentCount: 0,
        searchCount: 0,
      };
    }
  }

  private async seedSampleData(): Promise<void> {
    // Seed invoices
    await this.indexDocument('invoices', 'inv-1', {
      invoiceNumber: 'INV-2025-001',
      customerName: 'SC Exemplu SRL',
      customerCui: 'RO12345678',
      amount: 1190,
      status: 'PAID',
      date: new Date('2025-01-15'),
      description: 'Servicii consultanță IT pentru luna ianuarie',
    });

    await this.indexDocument('invoices', 'inv-2', {
      invoiceNumber: 'INV-2025-002',
      customerName: 'SC Test SA',
      customerCui: 'RO87654321',
      amount: 2975,
      status: 'PENDING',
      date: new Date('2025-01-20'),
      description: 'Furnizare echipamente birou',
    });

    await this.indexDocument('invoices', 'inv-3', {
      invoiceNumber: 'INV-2025-003',
      customerName: 'SC Demo SRL',
      customerCui: 'RO11223344',
      amount: 5000,
      status: 'PAID',
      date: new Date('2025-01-25'),
      description: 'Contract de întreținere software anual',
    });

    // Seed customers
    await this.indexDocument('customers', 'cust-1', {
      name: 'SC Exemplu SRL',
      cui: 'RO12345678',
      email: 'contact@exemplu.ro',
      city: 'București',
      county: 'București',
      type: 'SRL',
    });

    await this.indexDocument('customers', 'cust-2', {
      name: 'SC Test SA',
      cui: 'RO87654321',
      email: 'office@test.ro',
      city: 'Cluj-Napoca',
      county: 'Cluj',
      type: 'SA',
    });

    // Seed products
    await this.indexDocument('products', 'prod-1', {
      name: 'Laptop Dell Inspiron 15',
      sku: 'LAPTOP-001',
      category: 'Electronice',
      price: 3500,
      stock: 25,
      description: 'Laptop performant pentru birou',
    });

    await this.indexDocument('products', 'prod-2', {
      name: 'Monitor Samsung 27"',
      sku: 'MON-001',
      category: 'Electronice',
      price: 1200,
      stock: 50,
      description: 'Monitor LED pentru productivitate',
    });
  }

  // Index Operations
  async indexDocument(index: SearchIndex, id: string, document: any): Promise<boolean> {
    const indexData = this.indices.get(index);
    if (!indexData) return false;

    indexData.set(id, { ...document, _id: id, _indexedAt: new Date() });
    this.stats.indexStats[index].documentCount = indexData.size;
    this.stats.indexStats[index].lastIndexed = new Date();
    this.stats.totalDocuments++;

    this.eventEmitter.emit('search.indexed', { index, id });
    return true;
  }

  async bulkIndex(index: SearchIndex, documents: Array<{ id: string; document: any }>): Promise<number> {
    let count = 0;
    for (const { id, document } of documents) {
      if (await this.indexDocument(index, id, document)) {
        count++;
      }
    }
    return count;
  }

  async deleteDocument(index: SearchIndex, id: string): Promise<boolean> {
    const indexData = this.indices.get(index);
    if (!indexData) return false;

    const deleted = indexData.delete(id);
    if (deleted) {
      this.stats.indexStats[index].documentCount = indexData.size;
      this.stats.totalDocuments--;
      this.eventEmitter.emit('search.deleted', { index, id });
    }
    return deleted;
  }

  async updateDocument(index: SearchIndex, id: string, updates: any): Promise<boolean> {
    const indexData = this.indices.get(index);
    if (!indexData) return false;

    const existing = indexData.get(id);
    if (!existing) return false;

    indexData.set(id, { ...existing, ...updates, _updatedAt: new Date() });
    this.eventEmitter.emit('search.updated', { index, id });
    return true;
  }

  // Search Operations
  async search<T = any>(query: SearchQuery): Promise<SearchResult<T>> {
    const startTime = Date.now();
    const indexData = this.indices.get(query.index);

    if (!indexData) {
      return this.emptyResult(query);
    }

    let results: SearchHit<T>[] = [];
    const config = this.indexConfigs.get(query.index);
    const searchableFields = config?.fields.filter((f) => f.searchable).map((f) => f.name) || [];

    // Normalize query
    const normalizedQuery = this.normalizeQuery(query.query);
    const queryTerms = this.tokenize(normalizedQuery);

    // Search through documents
    const isEmptyQuery = queryTerms.length === 0;

    for (const [id, doc] of indexData) {
      // For empty queries (browse mode), include all documents with score 1
      const score = isEmptyQuery ? 1 : this.calculateScore(doc, queryTerms, searchableFields, config?.fields || [], query);

      if (score > 0) {
        const hit: SearchHit<T> = {
          id,
          score,
          source: this.sanitizeDocument(doc) as T,
          index: query.index,
        };

        if (query.highlight && !isEmptyQuery) {
          hit.highlights = this.generateHighlights(doc, queryTerms, searchableFields);
        }

        results.push(hit);
      }
    }

    // Apply filters
    if (query.filters && query.filters.length > 0) {
      results = this.applyFilters(results, query.filters);
    }

    // Sort results
    if (query.sort && query.sort.length > 0) {
      results = this.sortResults(results, query.sort);
    } else {
      // Default sort by score
      results.sort((a, b) => b.score - a.score);
    }

    // Calculate facets
    const facets = query.facets ? this.calculateFacets(results, query.facets, config) : undefined;

    // Pagination
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = results.slice(startIndex, startIndex + pageSize);

    // Update stats
    const queryTime = Date.now() - startTime;
    this.updateStats(query, queryTime);

    // Generate suggestions for low result count
    const suggestions = results.length < 3 ? await this.generateSuggestions(query.query, query.index) : undefined;

    this.eventEmitter.emit('search.executed', {
      query: query.query,
      index: query.index,
      resultCount: total,
      queryTime,
    });

    return {
      items: paginatedResults,
      total,
      page,
      pageSize,
      totalPages,
      facets,
      suggestions,
      queryTime,
    };
  }

  // Autocomplete
  async autocomplete(options: AutocompleteOptions): Promise<SuggestionResult[]> {
    const indexData = this.indices.get(options.index);
    if (!indexData) return [];

    const suggestions: Map<string, number> = new Map();
    const normalizedPrefix = options.prefix.toLowerCase();

    for (const doc of indexData.values()) {
      const fieldValue = doc[options.field];
      if (!fieldValue) continue;

      const value = String(fieldValue).toLowerCase();

      // Exact prefix match
      if (value.startsWith(normalizedPrefix)) {
        const score = suggestions.get(fieldValue) || 0;
        suggestions.set(fieldValue, score + 2);
      }
      // Fuzzy match
      else if (options.fuzzy && this.fuzzyMatch(value, normalizedPrefix)) {
        const score = suggestions.get(fieldValue) || 0;
        suggestions.set(fieldValue, score + 1);
      }
      // Word prefix match
      else {
        const words = value.split(/\s+/);
        for (const word of words) {
          if (word.startsWith(normalizedPrefix)) {
            const score = suggestions.get(fieldValue) || 0;
            suggestions.set(fieldValue, score + 1.5);
            break;
          }
        }
      }
    }

    // Sort by score and limit
    const limit = options.limit || 10;
    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text, score]) => ({
        text,
        score,
        highlighted: this.highlightMatch(text, options.prefix),
      }));
  }

  // Full-text search helpers
  private normalizeQuery(query: string): string {
    // Expand synonyms
    let normalized = query.toLowerCase();
    for (const [key, synonyms] of Object.entries(this.businessSynonyms)) {
      for (const syn of synonyms) {
        if (normalized.includes(syn.toLowerCase())) {
          normalized = normalized.replace(new RegExp(syn, 'gi'), key);
        }
      }
    }
    return normalized;
  }

  private tokenize(text: string): string[] {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\săîâșț]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .filter((t) => !this.romanianStopWords.includes(t));
    return [...new Set(tokens)];
  }

  private calculateScore(
    doc: any,
    queryTerms: string[],
    searchableFields: string[],
    fieldConfigs: IndexField[],
    query: SearchQuery,
  ): number {
    let totalScore = 0;
    const operator = query.operator || 'OR';
    const fieldsToSearch = query.fields || searchableFields;

    const matchedTerms = new Set<string>();

    for (const field of fieldsToSearch) {
      const fieldValue = doc[field];
      if (!fieldValue) continue;

      const fieldConfig = fieldConfigs.find((f) => f.name === field);
      const boost = fieldConfig?.boost || 1;
      const normalizedValue = String(fieldValue).toLowerCase();
      const valueTokens = this.tokenize(normalizedValue);

      for (const term of queryTerms) {
        // Exact match
        if (normalizedValue.includes(term)) {
          totalScore += 2 * boost;
          matchedTerms.add(term);
        }
        // Token match
        else if (valueTokens.some((t) => t.includes(term))) {
          totalScore += 1.5 * boost;
          matchedTerms.add(term);
        }
        // Fuzzy match
        else if (query.fuzzy) {
          const fuzziness = query.fuzziness || 2;
          for (const token of valueTokens) {
            if (this.levenshteinDistance(term, token) <= fuzziness) {
              totalScore += 0.5 * boost;
              matchedTerms.add(term);
              break;
            }
          }
        }
      }
    }

    // Apply operator logic
    if (operator === 'AND' && matchedTerms.size < queryTerms.length) {
      return 0;
    }

    return totalScore;
  }

  private applyFilters<T>(results: SearchHit<T>[], filters: SearchFilter[]): SearchHit<T>[] {
    return results.filter((hit) => {
      return filters.every((filter) => {
        const value = hit.source[filter.field as keyof T];

        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'ne':
            return value !== filter.value;
          case 'gt':
            return value > filter.value;
          case 'gte':
            return value >= filter.value;
          case 'lt':
            return value < filter.value;
          case 'lte':
            return value <= filter.value;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'range':
            return (
              Array.isArray(filter.value) &&
              filter.value.length === 2 &&
              value >= filter.value[0] &&
              value <= filter.value[1]
            );
          case 'exists':
            return filter.value ? value !== undefined && value !== null : value === undefined || value === null;
          case 'prefix':
            return typeof value === 'string' && value.toLowerCase().startsWith(String(filter.value).toLowerCase());
          default:
            return true;
        }
      });
    });
  }

  private sortResults<T>(results: SearchHit<T>[], sorts: SearchSort[]): SearchHit<T>[] {
    return results.sort((a, b) => {
      for (const sort of sorts) {
        const aValue = a.source[sort.field as keyof T];
        const bValue = b.source[sort.field as keyof T];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        if (comparison !== 0) {
          return sort.order === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private calculateFacets<T>(
    results: SearchHit<T>[],
    facetFields: string[],
    config?: IndexConfig,
  ): SearchFacet[] {
    const facets: SearchFacet[] = [];

    for (const field of facetFields) {
      const fieldConfig = config?.fields.find((f) => f.name === field);
      if (!fieldConfig?.facetable) continue;

      const valueCounts: Map<string, number> = new Map();

      for (const hit of results) {
        const value = hit.source[field as keyof T];
        if (value !== undefined && value !== null) {
          const strValue = String(value);
          valueCounts.set(strValue, (valueCounts.get(strValue) || 0) + 1);
        }
      }

      const values: FacetValue[] = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      facets.push({
        field,
        fieldRo: fieldConfig.nameRo,
        values,
      });
    }

    return facets;
  }

  private generateHighlights(doc: any, queryTerms: string[], fields: string[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    for (const field of fields) {
      const value = doc[field];
      if (!value) continue;

      const strValue = String(value);
      const matchedHighlights: string[] = [];

      for (const term of queryTerms) {
        if (strValue.toLowerCase().includes(term)) {
          const highlighted = strValue.replace(
            new RegExp(`(${this.escapeRegex(term)})`, 'gi'),
            '<mark>$1</mark>',
          );
          matchedHighlights.push(highlighted);
        }
      }

      if (matchedHighlights.length > 0) {
        highlights[field] = matchedHighlights;
      }
    }

    return highlights;
  }

  private async generateSuggestions(query: string, index: SearchIndex): Promise<string[]> {
    const suggestions: string[] = [];
    const config = this.indexConfigs.get(index);
    if (!config) return suggestions;

    // Suggest based on synonym expansion
    const normalizedQuery = query.toLowerCase();
    for (const [key, synonyms] of Object.entries(this.businessSynonyms)) {
      if (normalizedQuery.includes(key.toLowerCase())) {
        suggestions.push(...synonyms.slice(0, 2));
      }
      for (const syn of synonyms) {
        if (normalizedQuery.includes(syn.toLowerCase()) && !suggestions.includes(key)) {
          suggestions.push(key);
        }
      }
    }

    // Add from popular queries
    const popularForIndex = this.queryHistory
      .filter((q) => q.query.toLowerCase().includes(normalizedQuery.substring(0, 3)))
      .map((q) => q.query);
    suggestions.push(...popularForIndex.slice(0, 3));

    return [...new Set(suggestions)].slice(0, 5);
  }

  // Fuzzy matching
  private fuzzyMatch(str1: string, str2: string): boolean {
    return this.levenshteinDistance(str1, str2) <= Math.max(2, Math.floor(str2.length / 3));
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }

  private highlightMatch(text: string, prefix: string): string {
    const regex = new RegExp(`(${this.escapeRegex(prefix)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Index Management
  async getIndexConfig(index: SearchIndex): Promise<IndexConfig | undefined> {
    return this.indexConfigs.get(index);
  }

  async listIndices(): Promise<IndexConfig[]> {
    return Array.from(this.indexConfigs.values());
  }

  async getDocument(index: SearchIndex, id: string): Promise<any | undefined> {
    const indexData = this.indices.get(index);
    if (!indexData) return undefined;

    const doc = indexData.get(id);
    return doc ? this.sanitizeDocument(doc) : undefined;
  }

  async clearIndex(index: SearchIndex): Promise<number> {
    const indexData = this.indices.get(index);
    if (!indexData) return 0;

    const count = indexData.size;
    indexData.clear();
    this.stats.indexStats[index].documentCount = 0;
    this.stats.totalDocuments -= count;

    this.eventEmitter.emit('search.index.cleared', { index, documentsCleared: count });
    return count;
  }

  async reindex(index: SearchIndex): Promise<boolean> {
    const indexData = this.indices.get(index);
    if (!indexData) return false;

    // Re-index all documents (in real implementation would rebuild analyzers, etc.)
    const documents = Array.from(indexData.entries());
    indexData.clear();

    for (const [id, doc] of documents) {
      indexData.set(id, { ...doc, _reindexedAt: new Date() });
    }

    this.stats.indexStats[index].lastIndexed = new Date();
    this.eventEmitter.emit('search.index.reindexed', { index, documentCount: documents.length });
    return true;
  }

  // Statistics
  getStats(): SearchStats {
    // Update average query time
    if (this.queryTimes.length > 0) {
      this.stats.averageQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
    }

    // Calculate popular queries
    const queryCounts: Map<string, number> = new Map();
    for (const entry of this.queryHistory) {
      const normalized = entry.query.toLowerCase();
      queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1);
    }

    this.stats.popularQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { ...this.stats };
  }

  private updateStats(query: SearchQuery, queryTime: number): void {
    this.stats.totalSearches++;
    this.stats.indexStats[query.index].searchCount++;
    this.stats.indexStats[query.index].lastSearched = new Date();

    this.queryTimes.push(queryTime);
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift();
    }

    this.queryHistory.push({ query: query.query, timestamp: new Date() });
    if (this.queryHistory.length > 1000) {
      this.queryHistory.shift();
    }
  }

  // Utilities
  private sanitizeDocument(doc: any): any {
    const { _id, _indexedAt, _updatedAt, _reindexedAt, ...rest } = doc;
    return rest;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private emptyResult<T>(query: SearchQuery): SearchResult<T> {
    return {
      items: [],
      total: 0,
      page: query.page || 1,
      pageSize: query.pageSize || 10,
      totalPages: 0,
      queryTime: 0,
    };
  }
}

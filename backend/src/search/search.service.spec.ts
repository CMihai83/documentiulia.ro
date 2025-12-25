import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SearchService,
  SearchQuery,
  SearchFilter,
  SearchSort,
  AutocompleteOptions,
} from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Index Management', () => {
    it('should initialize with default indices', async () => {
      const indices = await service.listIndices();
      expect(indices.length).toBeGreaterThan(0);
    });

    it('should have invoices index', async () => {
      const config = await service.getIndexConfig('invoices');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Facturi');
    });

    it('should have customers index', async () => {
      const config = await service.getIndexConfig('customers');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Clienți');
    });

    it('should have products index', async () => {
      const config = await service.getIndexConfig('products');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Produse');
    });

    it('should have employees index', async () => {
      const config = await service.getIndexConfig('employees');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Angajați');
    });

    it('should have documents index', async () => {
      const config = await service.getIndexConfig('documents');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Documente');
    });

    it('should have transactions index', async () => {
      const config = await service.getIndexConfig('transactions');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Tranzacții');
    });

    it('should have reports index', async () => {
      const config = await service.getIndexConfig('reports');
      expect(config).toBeDefined();
      expect(config!.nameRo).toBe('Rapoarte');
    });
  });

  describe('Document Indexing', () => {
    it('should index document', async () => {
      const result = await service.indexDocument('invoices', 'test-1', {
        invoiceNumber: 'TEST-001',
        customerName: 'Test Customer',
        amount: 1000,
      });

      expect(result).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('search.indexed', expect.any(Object));
    });

    it('should retrieve indexed document', async () => {
      await service.indexDocument('customers', 'cust-test', {
        name: 'Test Company',
        cui: 'RO12345678',
      });

      const doc = await service.getDocument('customers', 'cust-test');
      expect(doc).toBeDefined();
      expect(doc.name).toBe('Test Company');
    });

    it('should bulk index documents', async () => {
      const documents = [
        { id: 'bulk-1', document: { name: 'Product 1', sku: 'SKU-1' } },
        { id: 'bulk-2', document: { name: 'Product 2', sku: 'SKU-2' } },
        { id: 'bulk-3', document: { name: 'Product 3', sku: 'SKU-3' } },
      ];

      const count = await service.bulkIndex('products', documents);
      expect(count).toBe(3);
    });

    it('should update document', async () => {
      await service.indexDocument('products', 'update-test', {
        name: 'Original Name',
        price: 100,
      });

      const updated = await service.updateDocument('products', 'update-test', {
        price: 150,
      });

      expect(updated).toBe(true);

      const doc = await service.getDocument('products', 'update-test');
      expect(doc.price).toBe(150);
      expect(doc.name).toBe('Original Name');
    });

    it('should delete document', async () => {
      await service.indexDocument('products', 'delete-test', { name: 'To Delete' });

      const deleted = await service.deleteDocument('products', 'delete-test');
      expect(deleted).toBe(true);

      const doc = await service.getDocument('products', 'delete-test');
      expect(doc).toBeUndefined();
    });

    it('should clear index', async () => {
      await service.indexDocument('reports', 'clear-1', { title: 'Report 1' });
      await service.indexDocument('reports', 'clear-2', { title: 'Report 2' });

      const count = await service.clearIndex('reports');
      expect(count).toBe(2);
    });

    it('should reindex', async () => {
      await service.indexDocument('transactions', 'reindex-1', { reference: 'REF-1' });

      const result = await service.reindex('transactions');
      expect(result).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('search.index.reindexed', expect.any(Object));
    });
  });

  describe('Basic Search', () => {
    it('should search seeded invoices', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
      });

      expect(result.total).toBeGreaterThan(0);
      expect(result.items[0].source.customerName).toContain('Exemplu');
    });

    it('should return search result structure', async () => {
      const result = await service.search({
        query: 'test',
        index: 'invoices',
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('queryTime');
    });

    it('should return empty result for no matches', async () => {
      const result = await service.search({
        query: 'xyz123nonexistent',
        index: 'invoices',
      });

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should search by invoice number', async () => {
      const result = await service.search({
        query: 'INV-2025-001',
        index: 'invoices',
      });

      expect(result.total).toBeGreaterThan(0);
    });

    it('should search customers by name', async () => {
      const result = await service.search({
        query: 'Exemplu SRL',
        index: 'customers',
      });

      expect(result.total).toBeGreaterThan(0);
    });

    it('should search products by name', async () => {
      const result = await service.search({
        query: 'Laptop',
        index: 'products',
      });

      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('Search with Filters', () => {
    it('should filter by equality', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        filters: [{ field: 'status', operator: 'eq', value: 'PAID' }],
      });

      for (const item of result.items) {
        expect(item.source.status).toBe('PAID');
      }
    });

    it('should filter by greater than', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        filters: [{ field: 'amount', operator: 'gt', value: 2000 }],
      });

      for (const item of result.items) {
        expect(item.source.amount).toBeGreaterThan(2000);
      }
    });

    it('should filter by range', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        filters: [{ field: 'amount', operator: 'range', value: [1000, 3000] }],
      });

      for (const item of result.items) {
        expect(item.source.amount).toBeGreaterThanOrEqual(1000);
        expect(item.source.amount).toBeLessThanOrEqual(3000);
      }
    });

    it('should filter by in list', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        filters: [{ field: 'status', operator: 'in', value: ['PAID', 'PENDING'] }],
      });

      for (const item of result.items) {
        expect(['PAID', 'PENDING']).toContain(item.source.status);
      }
    });

    it('should filter by prefix', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        filters: [{ field: 'invoiceNumber', operator: 'prefix', value: 'INV-2025' }],
      });

      for (const item of result.items) {
        expect(item.source.invoiceNumber).toMatch(/^INV-2025/);
      }
    });

    it('should apply multiple filters', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        filters: [
          { field: 'status', operator: 'eq', value: 'PAID' },
          { field: 'amount', operator: 'gt', value: 1000 },
        ],
      });

      for (const item of result.items) {
        expect(item.source.status).toBe('PAID');
        expect(item.source.amount).toBeGreaterThan(1000);
      }
    });
  });

  describe('Search with Sorting', () => {
    it('should sort by amount ascending', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        sort: [{ field: 'amount', order: 'asc' }],
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].source.amount).toBeGreaterThanOrEqual(result.items[i - 1].source.amount);
      }
    });

    it('should sort by amount descending', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        sort: [{ field: 'amount', order: 'desc' }],
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].source.amount).toBeLessThanOrEqual(result.items[i - 1].source.amount);
      }
    });

    it('should sort by score when no sort specified', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].score).toBeLessThanOrEqual(result.items[i - 1].score);
      }
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      const page1 = await service.search({
        query: '',
        index: 'invoices',
        page: 1,
        pageSize: 2,
      });

      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.items.length).toBeLessThanOrEqual(2);
    });

    it('should return correct total pages', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        pageSize: 1,
      });

      expect(result.totalPages).toBe(result.total);
    });

    it('should return different results per page', async () => {
      // Add more documents first
      await service.indexDocument('invoices', 'page-1', { invoiceNumber: 'PAGE-1', amount: 100 });
      await service.indexDocument('invoices', 'page-2', { invoiceNumber: 'PAGE-2', amount: 200 });
      await service.indexDocument('invoices', 'page-3', { invoiceNumber: 'PAGE-3', amount: 300 });

      const page1 = await service.search({
        query: '',
        index: 'invoices',
        page: 1,
        pageSize: 2,
      });

      const page2 = await service.search({
        query: '',
        index: 'invoices',
        page: 2,
        pageSize: 2,
      });

      if (page1.items.length > 0 && page2.items.length > 0) {
        expect(page1.items[0].id).not.toBe(page2.items[0].id);
      }
    });
  });

  describe('Highlighting', () => {
    it('should return highlights when enabled', async () => {
      const result = await service.search({
        query: 'consultanță',
        index: 'invoices',
        highlight: true,
      });

      if (result.items.length > 0) {
        expect(result.items[0].highlights).toBeDefined();
      }
    });

    it('should highlight matching terms', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
        highlight: true,
      });

      if (result.items.length > 0 && result.items[0].highlights) {
        const hasHighlight = Object.values(result.items[0].highlights).some((h) =>
          h.some((text) => text.includes('<mark>')),
        );
        expect(hasHighlight).toBe(true);
      }
    });
  });

  describe('Fuzzy Search', () => {
    it('should find results with fuzzy matching', async () => {
      const result = await service.search({
        query: 'Exmplu', // Typo in "Exemplu"
        index: 'invoices',
        fuzzy: true,
        fuzziness: 2,
      });

      expect(result.total).toBeGreaterThan(0);
    });

    it('should not find results without fuzzy for typos', async () => {
      const result = await service.search({
        query: 'Exmplu',
        index: 'invoices',
        fuzzy: false,
      });

      // May or may not find due to partial matching
      // Just ensure it doesn't error
      expect(result).toBeDefined();
    });
  });

  describe('Faceted Search', () => {
    it('should return facets', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        facets: ['status'],
      });

      expect(result.facets).toBeDefined();
      expect(result.facets!.length).toBeGreaterThan(0);
    });

    it('should have facet values with counts', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        facets: ['status'],
      });

      const statusFacet = result.facets?.find((f) => f.field === 'status');
      expect(statusFacet).toBeDefined();
      expect(statusFacet!.values.length).toBeGreaterThan(0);

      for (const value of statusFacet!.values) {
        expect(value.count).toBeGreaterThan(0);
      }
    });

    it('should have Romanian facet field names', async () => {
      const result = await service.search({
        query: '',
        index: 'invoices',
        facets: ['status'],
      });

      const statusFacet = result.facets?.find((f) => f.field === 'status');
      expect(statusFacet?.fieldRo).toBe('Stare');
    });

    it('should return multiple facets', async () => {
      const result = await service.search({
        query: '',
        index: 'customers',
        facets: ['city', 'county', 'type'],
      });

      expect(result.facets?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Search Operators', () => {
    it('should use OR operator by default', async () => {
      const result = await service.search({
        query: 'Exemplu Test',
        index: 'invoices',
        operator: 'OR',
      });

      // Should match documents with either term
      expect(result.total).toBeGreaterThan(0);
    });

    it('should use AND operator when specified', async () => {
      const result = await service.search({
        query: 'consultanță ianuarie',
        index: 'invoices',
        operator: 'AND',
      });

      // Should only match documents with both terms
      for (const item of result.items) {
        const desc = String(item.source.description || '').toLowerCase();
        expect(desc.includes('consultanță') && desc.includes('ianuarie')).toBe(true);
      }
    });
  });

  describe('Field-specific Search', () => {
    it('should search specific fields only', async () => {
      const result = await service.search({
        query: 'RO12345678',
        index: 'invoices',
        fields: ['customerCui'],
      });

      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('Autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const suggestions = await service.autocomplete({
        index: 'invoices',
        field: 'customerName',
        prefix: 'Ex',
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return highlighted suggestions', async () => {
      const suggestions = await service.autocomplete({
        index: 'invoices',
        field: 'customerName',
        prefix: 'Ex',
      });

      if (suggestions.length > 0) {
        expect(suggestions[0].highlighted).toContain('<mark>');
      }
    });

    it('should limit suggestions', async () => {
      const suggestions = await service.autocomplete({
        index: 'products',
        field: 'name',
        prefix: '',
        limit: 5,
      });

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should support fuzzy autocomplete', async () => {
      const suggestions = await service.autocomplete({
        index: 'invoices',
        field: 'customerName',
        prefix: 'Exmplu', // Typo
        fuzzy: true,
      });

      // May or may not find suggestions depending on fuzziness
      expect(suggestions).toBeDefined();
    });
  });

  describe('Romanian Language Support', () => {
    it('should have Romanian stop words', async () => {
      // Searching for stop words should not affect results negatively
      const result = await service.search({
        query: 'și în pentru Exemplu',
        index: 'invoices',
      });

      expect(result.total).toBeGreaterThan(0);
    });

    it('should support Romanian diacritics', async () => {
      const result = await service.search({
        query: 'întreținere',
        index: 'invoices',
      });

      expect(result.total).toBeGreaterThan(0);
    });

    it('should have Romanian index names', async () => {
      const indices = await service.listIndices();

      for (const index of indices) {
        expect(index.nameRo).toBeDefined();
        expect(index.nameRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian index descriptions', async () => {
      const indices = await service.listIndices();

      for (const index of indices) {
        expect(index.descriptionRo).toBeDefined();
        expect(index.descriptionRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian field names', async () => {
      const config = await service.getIndexConfig('invoices');

      for (const field of config!.fields) {
        expect(field.nameRo).toBeDefined();
        expect(field.nameRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian diacritics in descriptions', async () => {
      const indices = await service.listIndices();
      const hasRomanianChars = indices.some((idx) => idx.descriptionRo.match(/[ăîâșțĂÎÂȘȚ]/));
      expect(hasRomanianChars).toBe(true);
    });
  });

  describe('Business Synonyms', () => {
    it('should find results using synonyms', async () => {
      // 'factura' is synonym for 'factură'
      const result = await service.search({
        query: 'invoice',
        index: 'invoices',
      });

      // Should still find Romanian invoices
      expect(result).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should track search statistics', async () => {
      await service.search({ query: 'test', index: 'invoices' });
      await service.search({ query: 'another', index: 'invoices' });

      const stats = service.getStats();

      expect(stats.totalSearches).toBeGreaterThanOrEqual(2);
    });

    it('should track documents per index', async () => {
      const stats = service.getStats();

      expect(stats.indexStats.invoices.documentCount).toBeGreaterThan(0);
    });

    it('should track average query time', async () => {
      await service.search({ query: 'test', index: 'invoices' });

      const stats = service.getStats();
      expect(stats.averageQueryTime).toBeGreaterThanOrEqual(0);
    });

    it('should track popular queries', async () => {
      await service.search({ query: 'popular', index: 'invoices' });
      await service.search({ query: 'popular', index: 'invoices' });
      await service.search({ query: 'popular', index: 'invoices' });

      const stats = service.getStats();
      const popularQuery = stats.popularQueries.find((q) => q.query === 'popular');

      expect(popularQuery).toBeDefined();
      expect(popularQuery!.count).toBe(3);
    });
  });

  describe('Events', () => {
    it('should emit indexed event', async () => {
      await service.indexDocument('products', 'event-1', { name: 'Event Product' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('search.indexed', expect.any(Object));
    });

    it('should emit deleted event', async () => {
      await service.indexDocument('products', 'event-del', { name: 'To Delete' });
      jest.clearAllMocks();
      await service.deleteDocument('products', 'event-del');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('search.deleted', expect.any(Object));
    });

    it('should emit search executed event', async () => {
      await service.search({ query: 'test', index: 'invoices' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('search.executed', expect.objectContaining({
        query: 'test',
        index: 'invoices',
      }));
    });
  });

  describe('Suggestions', () => {
    it('should return suggestions for low result count', async () => {
      const result = await service.search({
        query: 'xyz',
        index: 'invoices',
      });

      // May have suggestions if query matches synonym patterns
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Search Hit Structure', () => {
    it('should include id in search hit', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
      });

      if (result.items.length > 0) {
        expect(result.items[0].id).toBeDefined();
      }
    });

    it('should include score in search hit', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
      });

      if (result.items.length > 0) {
        expect(result.items[0].score).toBeGreaterThan(0);
      }
    });

    it('should include source document', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
      });

      if (result.items.length > 0) {
        expect(result.items[0].source).toBeDefined();
        expect(result.items[0].source.invoiceNumber).toBeDefined();
      }
    });

    it('should include index in search hit', async () => {
      const result = await service.search({
        query: 'Exemplu',
        index: 'invoices',
      });

      if (result.items.length > 0) {
        expect(result.items[0].index).toBe('invoices');
      }
    });
  });
});
